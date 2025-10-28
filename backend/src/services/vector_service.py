import chromadb
from chromadb.config import Settings
import logging
from typing import List, Dict, Any, Optional
import httpx
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

class VectorService:
    def __init__(self):
        self.client = chromadb.PersistentClient(
            path="./chroma_db",
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=False
            )
        )
        self.collection = None
        self.ollama_base_url = "http://localhost:11434"
        self.embedding_model = "nomic-embed-text:latest"
        self._initialize_collection()
        logger.info("Vector service initialized with Ollama embeddings")

    def _initialize_collection(self):
        """Initialize or get ChromaDB collection"""
        try:
            # Try to get existing collection
            self.collection = self.client.get_collection("documents")
            logger.info("Connected to existing ChromaDB collection")
        except:
            # Create new collection if it doesn't exist
            self.collection = self.client.create_collection(
                name="documents",
                metadata={"description": "Document embeddings for RAG"}
            )
            logger.info("Created new ChromaDB collection")

    async def _get_embedding(self, text: str) -> List[float]:
        """Get embedding from Ollama"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.ollama_base_url}/api/embeddings",
                    json={
                        "model": self.embedding_model,
                        "prompt": text
                    }
                )
                if response.status_code == 200:
                    result = response.json()
                    return result.get("embedding", [])
                else:
                    logger.error(f"Ollama embedding error: {response.status_code}")
                    return []
        except Exception as e:
            logger.error(f"Error getting embedding from Ollama: {str(e)}")
            return []

    async def add_document(self, content: str, metadata: Dict[str, Any]) -> str:
        """Add document to vector store"""
        try:
            doc_id = str(uuid.uuid4())

            # Generate embedding using Ollama
            embedding = await self._get_embedding(content)

            if not embedding:
                raise Exception("Failed to generate embedding")

            # Add to ChromaDB
            self.collection.add(
                ids=[doc_id],
                embeddings=[embedding],
                documents=[content],
                metadatas=[{
                    **metadata,
                    "doc_id": doc_id,
                    "added_at": str(uuid.uuid4())  # Simple timestamp
                }]
            )

            logger.info(f"Added document {doc_id} to vector store")
            return doc_id

        except Exception as e:
            logger.error(f"Error adding document to vector store: {str(e)}")
            raise

    async def search_documents(self, query: str, n_results: int = 5) -> List[Dict]:
        """Search for similar documents"""
        try:
            # Generate query embedding using Ollama
            query_embedding = await self._get_embedding(query)

            if not query_embedding:
                logger.error("Failed to generate query embedding")
                return []

            # Search ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results
            )

            # Format results with similarity filtering
            documents = []
            for i, doc_id in enumerate(results['ids'][0]):
                if i < len(results['documents'][0]) and i < len(results['metadatas'][0]):
                    raw_distance = results['distances'][0][i] if i < len(results['distances'][0]) else 0.0
                    score = 1.0 - raw_distance

                    # Include documents with reasonable similarity
                    # Based on observed patterns, scores around -200 to -300 are providing good results
                    if score > -300:
                        documents.append({
                            "id": doc_id,
                            "content": results['documents'][0][i],
                            "metadata": results['metadatas'][0][i] or {},
                            "score": score
                        })

            return documents

        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            return []

    async def delete_document(self, doc_id: str) -> bool:
        """Delete document from vector store"""
        try:
            self.collection.delete(ids=[doc_id])
            logger.info(f"Deleted document {doc_id} from vector store")
            return True
        except Exception as e:
            logger.error(f"Error deleting document {doc_id}: {str(e)}")
            return False

    async def delete_documents_by_file_path(self, file_path: str) -> int:
        """Delete all documents for a specific file path"""
        try:
            # Get all documents with this file path
            results = self.collection.get(
                where={"file_path": file_path}
            )

            if results['ids']:
                doc_count = len(results['ids'])
                self.collection.delete(ids=results['ids'])
                logger.info(f"Deleted {doc_count} documents for file: {file_path}")
                return doc_count
            else:
                logger.debug(f"No documents found for file: {file_path}")
                return 0

        except Exception as e:
            logger.error(f"Error deleting documents for file {file_path}: {e}")
            return 0

    def clear_collection(self) -> bool:
        """Clear all documents from collection"""
        try:
            # Get all document IDs first
            count_before = self.collection.count()
            if count_before > 0:
                # Delete all documents - use proper ChromaDB syntax
                self.collection.delete()
                logger.info(f"Cleared all {count_before} documents from vector store")
            else:
                logger.info("Collection is already empty")
            return True
        except Exception as e:
            logger.error(f"Error clearing collection: {str(e)}")
            return False

    def get_document_count(self) -> int:
        """Get total number of documents in collection"""
        try:
            return self.collection.count()
        except Exception as e:
            logger.error(f"Error getting document count: {str(e)}")
            return 0

    def get_status(self) -> Dict:
        """Get vector database status"""
        try:
            count = self.get_document_count()
            return {
                "status": "ready" if count > 0 else "empty",
                "document_count": count,
                "collection_name": "documents"
            }
        except Exception as e:
            logger.error(f"Error getting vector DB status: {str(e)}")
            return {
                "status": "error",
                "document_count": 0,
                "collection_name": "documents"
            }