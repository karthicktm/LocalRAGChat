from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import shutil
import asyncio
import httpx
from pathlib import Path
import uuid
import logging
import json
from datetime import datetime
import sys

# Add src directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import our services
import sys
import os

# Add src directory to Python path
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
services_dir = os.path.join(current_dir, 'services')
if services_dir not in sys.path:
    sys.path.insert(0, services_dir)

from ollama_service import OllamaService
from vector_service import VectorService
from document_service import DocumentService
from folder_monitor_service import FolderMonitorService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="LocalChat API",
    description="Local RAG Assistant API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Updated frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
ollama_service = OllamaService()
vector_service = VectorService()
document_service = DocumentService()
folder_monitor = FolderMonitorService(vector_service, document_service, ollama_service)

# Global storage (in production, use proper database)
documents_store = {}
processed_files = {}

# File persistence
METADATA_FILE = Path("file_metadata.json")

def load_file_metadata():
    """Load file metadata from disk"""
    global processed_files
    if METADATA_FILE.exists():
        try:
            with open(METADATA_FILE, 'r') as f:
                processed_files = json.load(f)
            logger.info(f"Loaded {len(processed_files)} file metadata entries from disk")
        except Exception as e:
            logger.error(f"Error loading file metadata: {e}")
            processed_files = {}
    else:
        logger.info("No existing file metadata found, starting fresh")

def save_file_metadata():
    """Save file metadata to disk"""
    try:
        with open(METADATA_FILE, 'w') as f:
            json.dump(processed_files, f, indent=2)
        logger.info(f"Saved {len(processed_files)} file metadata entries to disk")
    except Exception as e:
        logger.error(f"Error saving file metadata: {e}")

# Load existing metadata on startup
load_file_metadata()

# Auto-start default folder monitoring if configured
async def start_default_folder_on_startup():
    """Automatically start monitoring the default folder if it exists"""
    try:
        default_folder = load_default_folder()
        if default_folder:
            logger.info(f"Auto-starting monitoring for default folder: {default_folder}")
            success = await folder_monitor.start_monitoring(default_folder)
            if success:
                logger.info(f"Successfully started monitoring default folder: {default_folder}")
            else:
                logger.warning(f"Failed to start monitoring default folder: {default_folder}")
    except Exception as e:
        logger.error(f"Error auto-starting default folder monitoring: {e}")

# Pydantic models
class ChatRequest(BaseModel):
    message: str
    model_id: Optional[str] = "llama3.2:3b"
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    sources: List[Dict[str, Any]]
    model_used: str
    timestamp: str

class ModelInfo(BaseModel):
    id: str
    name: str
    size: str
    parameters: str
    provider: str
    installed: bool

class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    status: str
    message: str

class FolderScanRequest(BaseModel):
    folder_path: str

class FolderMonitorRequest(BaseModel):
    folder_path: str

class FolderMonitorResponse(BaseModel):
    success: bool
    message: str
    monitored_path: Optional[str] = None
    is_active: bool = False

class FileStatusResponse(BaseModel):
    file_path: str
    status: str
    last_processed: Optional[str] = None
    chunks_processed: int = 0
    error: Optional[str] = None

class EnhancedChatResponse(BaseModel):
    response: str
    sources: List[Dict[str, Any]]
    model_used: str
    timestamp: str
    monitoring_status: Optional[Dict[str, Any]] = None

class DefaultFolderRequest(BaseModel):
    folder_path: str

class DefaultFolderResponse(BaseModel):
    success: bool
    message: str
    default_folder: Optional[str] = None

# Initialize data directories
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.get("/")
async def root():
    return {"message": "LocalChat API is running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

# Model Management Endpoints
@app.get("/models", response_model=List[ModelInfo])
async def get_models():
    """Get available models from Ollama"""
    try:
        models = await ollama_service.list_models()
        return models
    except Exception as e:
        logger.error(f"Error getting models: {str(e)}")
        return []

@app.post("/models/{model_id}/install")
async def install_model(model_id: str):
    """Install a model"""
    try:
        success = await ollama_service.pull_model(model_id)
        if success:
            return {"message": f"Model {model_id} installation started"}
        else:
            raise HTTPException(status_code=500, detail="Failed to install model")
    except Exception as e:
        logger.error(f"Error installing model {model_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Model installation failed")

# Chat Endpoints
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process chat message with RAG"""
    try:
        # Search for relevant documents (reduced from 3 to 2 for faster response)
        search_results = await vector_service.search_documents(request.message, n_results=2)

        # Build context from search results
        context = []
        sources = []
        seen_files = set()  # Track seen files to avoid duplicates

        for result in search_results:
            context.append(result["content"])

            metadata = result.get("metadata", {})
            file_path = metadata.get("file_path", "Unknown")
            filename = metadata.get("filename", "Unknown")
            source_type = metadata.get("source", "upload")

            # Create unique key for this file
            file_key = f"{file_path}:{filename}"

            # Only add source if we haven't seen this file before
            if file_key not in seen_files:
                source_info = {
                    "id": result["id"],
                    "filename": filename,
                    "content": result["content"][:300] + "..." if len(result["content"]) > 300 else result["content"],
                    "score": result["score"],
                    "file_path": file_path,
                    "source_type": source_type,
                    "chunk_index": metadata.get("chunk_index", 0),
                    "file_size": metadata.get("file_size"),
                    "file_modified": metadata.get("file_modified"),
                    "folder_path": metadata.get("folder_path") if source_type == "auto_folder_monitor" else None
                }
                sources.append(source_info)
                seen_files.add(file_key)

        # Generate response using Ollama
        ollama_response = await ollama_service.generate_response(
            model_id=request.model_id,
            prompt=request.message,
            context=context if context else None
        )

        # Add monitoring status if active
        monitoring_status = None
        if folder_monitor.is_active():
            monitoring_status = {
                "is_active": True,
                "monitored_path": folder_monitor.get_monitored_path(),
                "total_monitored_files": len(folder_monitor.get_all_file_statuses())
            }

        return ChatResponse(
            response=ollama_response.get("response", "I apologize, but I encountered an error processing your request."),
            sources=sources,
            model_used=request.model_id,
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint with simplified logic"""
    async def generate_stream():
        try:
            # Send initial status
            yield f"data: {json.dumps({'status': 'searching', 'message': 'Searching documents...'})}\n\n"

            # Search for relevant documents
            search_results = await vector_service.search_documents(request.message, n_results=3)

            # Build context and sources
            context = []
            sources = []
            seen_files = set()

            for result in search_results:
                context.append(result["content"])

                metadata = result.get("metadata", {})
                file_path = metadata.get("file_path", "Unknown")
                filename = metadata.get("filename", "Unknown")
                source_type = metadata.get("source", "upload")

                # Create unique key for this file
                file_key = f"{file_path}:{filename}"

                # Only add source if we haven't seen this file before
                if file_key not in seen_files:
                    source_info = {
                        "id": result["id"],
                        "filename": filename,
                        "content": result["content"][:300] + "..." if len(result["content"]) > 300 else result["content"],
                        "score": result["score"],
                        "file_path": file_path,
                        "source_type": source_type,
                        "chunk_index": metadata.get("chunk_index", 0),
                        "file_size": metadata.get("file_size"),
                        "file_modified": metadata.get("file_modified"),
                        "folder_path": metadata.get("folder_path") if source_type == "auto_folder_monitor" else None
                    }
                    sources.append(source_info)
                    seen_files.add(file_key)

            # Determine if we found useful documents
            has_documents = len(sources) > 0
            response_type = 'document_based' if has_documents else 'general_knowledge'

            if has_documents:
                yield f"data: {json.dumps({'status': 'found_documents', 'sources_count': len(sources), 'message': f'Found {len(sources)} relevant documents. Generating response...'})}\n\n"

                # Build context from documents
                context_str = "\n\n".join(context)

                # Enhanced prompt for document-based response
                enhanced_prompt = f"""Based on the following documents, please answer the question: {request.message}

DOCUMENTS:
{context_str}

Answer the question using only the information from these documents. If the documents don't contain the answer, say so clearly."""

                payload = {
                    "model": request.model_id,
                    "prompt": enhanced_prompt,
                    "stream": True,
                    "options": {
                        "temperature": 0.1,
                        "top_p": 0.8,
                        "max_tokens": 500
                    }
                }

                # Stream the response
                async with httpx.AsyncClient(timeout=30.0) as client:
                    async with client.stream("POST", f"{ollama_service.base_url}/api/generate", json=payload) as response:
                        async for line in response.aiter_lines():
                            if line.strip():
                                yield f"data: {line}\n\n"

                # Send final response with sources
                yield f"data: {json.dumps({'status': 'complete', 'sources': sources, 'model_used': request.model_id, 'timestamp': datetime.now().isoformat(), 'response_type': response_type})}\n\n"

            else:
                yield f"data: {json.dumps({'status': 'no_documents', 'message': 'No relevant documents found. Using general knowledge...'})}\n\n"

                # General knowledge prompt
                general_prompt = f"""Please answer this question: {request.message}

Note: This response is based on general knowledge as no relevant documents were found."""

                payload = {
                    "model": request.model_id,
                    "prompt": general_prompt,
                    "stream": True,
                    "options": {
                        "temperature": 0.3,
                        "top_p": 0.9,
                        "max_tokens": 400
                    }
                }

                # Stream the response
                async with httpx.AsyncClient(timeout=30.0) as client:
                    async with client.stream("POST", f"{ollama_service.base_url}/api/generate", json=payload) as response:
                        async for line in response.aiter_lines():
                            if line.strip():
                                yield f"data: {line}\n\n"

                # Send final response
                yield f"data: {json.dumps({'status': 'complete', 'sources': [], 'model_used': request.model_id, 'timestamp': datetime.now().isoformat(), 'response_type': response_type})}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Streaming chat error: {str(e)}")
            yield f"data: {json.dumps({'status': 'error', 'message': 'Sorry, I encountered an error processing your request.'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )

# File Management Endpoints
@app.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    """Upload a file for processing"""
    try:
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix.lower()

        # Validate file type
        if file_extension not in document_service.supported_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_extension} not supported. Supported types: {document_service.supported_extensions}"
            )

        # Save file
        file_path = UPLOAD_DIR / f"{file_id}{file_extension}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process file in background
        background_tasks.add_task(
            process_uploaded_file,
            file_path,
            file_id,
            file.filename
        )

        logger.info(f"File uploaded: {file.filename} -> {file_id}")

        return FileUploadResponse(
            file_id=file_id,
            filename=file.filename,
            status="uploaded",
            message="File uploaded successfully. Processing will begin shortly."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="File upload failed")

async def process_uploaded_file(file_path: Path, file_id: str, filename: str):
    """Background task to process uploaded file"""
    try:
        # Mark file as processing
        processed_files[file_id] = {
            "status": "processing",
            "filename": filename,
            "file_path": str(file_path),
            "chunks_processed": 0
        }

        # Process file
        chunks = await document_service.process_file(file_path, file_id)

        # Add chunks to vector store
        for chunk_metadata in chunks:
            await vector_service.add_document(
                content=chunk_metadata["content"],
                metadata={
                    "file_id": file_id,
                    "filename": filename,
                    "chunk_id": chunk_metadata["chunk_id"],
                    "file_type": chunk_metadata["file_type"],
                    "chunk_index": chunk_metadata["chunk_index"]
                }
            )

        # Mark file as completed
        processed_files[file_id] = {
            "status": "completed",
            "filename": filename,
            "file_path": str(file_path),
            "chunks_processed": len(chunks)
        }

        # Save metadata to disk
        save_file_metadata()

        logger.info(f"File processing completed: {filename} - {len(chunks)} chunks processed")

    except Exception as e:
        logger.error(f"Error processing uploaded file {filename}: {str(e)}")
        processed_files[file_id] = {
            "status": "error",
            "filename": filename,
            "file_path": str(file_path),
            "chunks_processed": 0,
            "error": str(e)
        }

        # Save metadata to disk
        save_file_metadata()

@app.get("/files")
async def list_files():
    """List uploaded files with processing status"""
    files_list = []
    for file_id, file_data in processed_files.items():
        # Create a copy to avoid modifying the original dictionary
        file_copy = file_data.copy()
        file_copy["file_id"] = file_id  # Add file_id to the response
        files_list.append(file_copy)
    return {"files": files_list}

@app.post("/folder-scan")
async def scan_folder(request: FolderScanRequest, background_tasks: BackgroundTasks = BackgroundTasks()):
    """Scan a local folder for documents"""
    try:
        # Validate folder path
        if not os.path.exists(request.folder_path):
            raise HTTPException(status_code=404, detail="Folder not found")

        if not os.path.isdir(request.folder_path):
            raise HTTPException(status_code=400, detail="Path is not a directory")

        # Process folder in background
        background_tasks.add_task(
            process_folder_scan,
            request.folder_path
        )

        logger.info(f"Folder scan started: {request.folder_path}")

        return {
            "message": "Folder scan started",
            "folder_path": request.folder_path,
            "status": "scanning"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Folder scan error: {str(e)}")
        raise HTTPException(status_code=500, detail="Folder scan failed")

async def process_folder_scan(folder_path: str):
    """Background task to process folder"""
    try:
        from pathlib import Path

        folder_path_obj = Path(folder_path)
        all_chunks = await document_service.process_directory(folder_path_obj)

        # Add all chunks to vector store
        for chunk_metadata in all_chunks:
            await vector_service.add_document(
                content=chunk_metadata["content"],
                metadata={
                    "file_id": chunk_metadata["file_id"],
                    "filename": chunk_metadata["filename"],
                    "chunk_id": chunk_metadata["chunk_id"],
                    "file_type": chunk_metadata["file_type"],
                    "chunk_index": chunk_metadata["chunk_index"],
                    "file_path": chunk_metadata["file_path"]
                }
            )

        logger.info(f"Folder scan completed: {folder_path} - {len(all_chunks)} total chunks processed")

    except Exception as e:
        logger.error(f"Error processing folder {folder_path}: {str(e)}")

@app.delete("/files/{file_id}")
async def delete_file(file_id: str):
    """Delete a file"""
    try:
        # Remove from vector store
        await vector_service.delete_document(file_id)

        # Remove from processed files
        if file_id in processed_files:
            file_path = processed_files[file_id].get("file_path")
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
            del processed_files[file_id]

            # Save metadata to disk
            save_file_metadata()

        return {"message": f"File {file_id} deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting file {file_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="File deletion failed")

# Folder Monitoring Endpoints
@app.post("/folder-monitor/start", response_model=FolderMonitorResponse)
async def start_folder_monitoring(request: FolderMonitorRequest):
    """Start monitoring a folder for automatic file processing"""
    try:
        success = await folder_monitor.start_monitoring(request.folder_path)

        if success:
            return FolderMonitorResponse(
                success=True,
                message=f"Started monitoring folder: {request.folder_path}",
                monitored_path=folder_monitor.get_monitored_path(),
                is_active=folder_monitor.is_active()
            )
        else:
            return FolderMonitorResponse(
                success=False,
                message=f"Failed to start monitoring folder: {request.folder_path}",
                is_active=False
            )

    except Exception as e:
        logger.error(f"Error starting folder monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start folder monitoring")

@app.post("/folder-monitor/stop")
async def stop_folder_monitoring():
    """Stop folder monitoring"""
    try:
        await folder_monitor.stop_monitoring()
        return {
            "message": "Folder monitoring stopped",
            "is_active": folder_monitor.is_active(),
            "monitored_path": folder_monitor.get_monitored_path()
        }

    except Exception as e:
        logger.error(f"Error stopping folder monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to stop folder monitoring")

@app.get("/folder-monitor/status")
async def get_folder_monitor_status():
    """Get folder monitoring status"""
    try:
        return {
            "is_active": folder_monitor.is_active(),
            "monitored_path": folder_monitor.get_monitored_path(),
            "file_statuses": folder_monitor.get_all_file_statuses()
        }

    except Exception as e:
        logger.error(f"Error getting folder monitor status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get folder monitor status")

@app.get("/folder-monitor/files")
async def get_monitored_files():
    """Get all monitored files and their statuses"""
    try:
        file_statuses = folder_monitor.get_all_file_statuses()
        files_list = []

        for file_path, status in file_statuses.items():
            file_status = FileStatusResponse(
                file_path=file_path,
                status=status.get("status", "unknown"),
                last_processed=status.get("last_processed"),
                chunks_processed=status.get("chunks_processed", 0),
                error=status.get("error")
            )
            files_list.append(file_status.dict())

        return {"files": files_list}

    except Exception as e:
        logger.error(f"Error getting monitored files: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get monitored files")

@app.get("/folder-monitor/files/{file_path:path}/status")
async def get_file_status(file_path: str):
    """Get status of a specific monitored file"""
    try:
        status = folder_monitor.get_file_status(file_path)
        if not status:
            raise HTTPException(status_code=404, detail="File not found in monitoring database")

        return status

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get file status")

# Default Folder Management
DEFAULT_FOLDER_FILE = Path("default_folder.json")

def load_default_folder() -> Optional[str]:
    """Load default folder from disk"""
    try:
        if DEFAULT_FOLDER_FILE.exists():
            with open(DEFAULT_FOLDER_FILE, 'r') as f:
                data = json.load(f)
                return data.get("default_folder")
    except Exception as e:
        logger.error(f"Error loading default folder: {e}")
    return None

def save_default_folder(folder_path: str) -> bool:
    """Save default folder to disk"""
    try:
        with open(DEFAULT_FOLDER_FILE, 'w') as f:
            json.dump({"default_folder": folder_path}, f, indent=2)
        logger.info(f"Saved default folder: {folder_path}")
        return True
    except Exception as e:
        logger.error(f"Error saving default folder: {e}")
        return False

@app.post("/default-folder", response_model=DefaultFolderResponse)
async def set_default_folder(request: DefaultFolderRequest):
    """Set default folder path"""
    try:
        folder_path = Path(request.folder_path).resolve()

        if not folder_path.exists():
            return DefaultFolderResponse(
                success=False,
                message="Folder does not exist",
                default_folder=None
            )

        if not folder_path.is_dir():
            return DefaultFolderResponse(
                success=False,
                message="Path is not a directory",
                default_folder=None
            )

        # Save the default folder
        if save_default_folder(str(folder_path)):
            return DefaultFolderResponse(
                success=True,
                message=f"Default folder set to: {folder_path}",
                default_folder=str(folder_path)
            )
        else:
            return DefaultFolderResponse(
                success=False,
                message="Failed to save default folder",
                default_folder=None
            )

    except Exception as e:
        logger.error(f"Error setting default folder: {str(e)}")
        return DefaultFolderResponse(
            success=False,
            message="Internal server error",
            default_folder=None
        )

@app.get("/default-folder", response_model=DefaultFolderResponse)
async def get_default_folder():
    """Get current default folder"""
    try:
        default_folder = load_default_folder()
        return DefaultFolderResponse(
            success=True,
            message="Default folder retrieved successfully",
            default_folder=default_folder
        )
    except Exception as e:
        logger.error(f"Error getting default folder: {str(e)}")
        return DefaultFolderResponse(
            success=False,
            message="Failed to get default folder",
            default_folder=None
        )

@app.delete("/default-folder", response_model=DefaultFolderResponse)
async def clear_default_folder():
    """Clear default folder"""
    try:
        if DEFAULT_FOLDER_FILE.exists():
            DEFAULT_FOLDER_FILE.unlink()

        return DefaultFolderResponse(
            success=True,
            message="Default folder cleared",
            default_folder=None
        )
    except Exception as e:
        logger.error(f"Error clearing default folder: {str(e)}")
        return DefaultFolderResponse(
            success=False,
            message="Failed to clear default folder",
            default_folder=None
        )

@app.post("/default-folder/start", response_model=FolderMonitorResponse)
async def start_default_folder_monitoring():
    """Start monitoring the default folder"""
    try:
        default_folder = load_default_folder()
        if not default_folder:
            return FolderMonitorResponse(
                success=False,
                message="No default folder set",
                monitored_path=None,
                is_active=False
            )

        success = await folder_monitor.start_monitoring(default_folder)
        if success:
            return FolderMonitorResponse(
                success=True,
                message=f"Started monitoring default folder: {default_folder}",
                monitored_path=default_folder,
                is_active=True
            )
        else:
            return FolderMonitorResponse(
                success=False,
                message="Failed to start monitoring default folder",
                monitored_path=default_folder,
                is_active=False
            )

    except Exception as e:
        logger.error(f"Error starting default folder monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start default folder monitoring")

# System Status Endpoints
@app.get("/status")
async def get_system_status():
    """Get system status"""
    try:
        # Get vector DB status
        vector_status = vector_service.get_status()

        return {
            "model_status": "ready",
            "active_model": "Llama 3.2 3B",
            "vector_db_status": vector_status["status"],
            "document_count": vector_status["document_count"],
            "memory_usage": 45,  # TODO: Get actual memory usage
            "cpu_usage": 12  # TODO: Get actual CPU usage
        }

    except Exception as e:
        logger.error(f"Error getting system status: {str(e)}")
        return {
            "model_status": "error",
            "active_model": "Unknown",
            "vector_db_status": "error",
            "document_count": 0,
            "memory_usage": 0,
            "cpu_usage": 0
        }

# Clear/Delete Endpoints
@app.post("/clear/embeddings")
async def clear_all_embeddings():
    """Clear all embeddings from vector database"""
    try:
        # Get document count before clearing
        status = vector_service.get_status()
        before_count = status.get("document_count", 0)

        # Clear all embeddings
        vector_service.clear_collection()

        logger.info(f"Cleared all embeddings from vector store. Removed {before_count} documents.")

        return {
            "success": True,
            "message": f"Successfully cleared all embeddings from vector store",
            "documents_removed": before_count
        }

    except Exception as e:
        logger.error(f"Error clearing embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to clear embeddings")

@app.post("/clear/files")
async def clear_all_files():
    """Clear all file processing records"""
    try:
        # Stop monitoring first
        await folder_monitor.stop_monitoring()

        # Get file count before clearing
        before_count = len(folder_monitor.get_all_file_statuses())

        # Clear file hash database
        folder_monitor.hash_service.file_hashes.clear()
        folder_monitor.hash_service.save_hash_database()

        logger.info(f"Cleared all file processing records. Removed {before_count} files.")

        return {
            "success": True,
            "message": f"Successfully cleared all file processing records",
            "files_removed": before_count
        }

    except Exception as e:
        logger.error(f"Error clearing files: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to clear file records")

@app.post("/clear/all")
async def clear_all_data():
    """Clear all data (embeddings + files) to start fresh"""
    try:
        # Stop monitoring
        await folder_monitor.stop_monitoring()

        # Get counts before clearing
        vector_status = vector_service.get_status()
        before_documents = vector_status.get("document_count", 0)
        before_files = len(folder_monitor.get_all_file_statuses())

        # Clear all embeddings
        vector_service.clear_collection()

        # Clear all file records
        folder_monitor.hash_service.file_hashes.clear()
        folder_monitor.hash_service.save_hash_database()

        logger.info(f"Cleared all data. Removed {before_documents} documents and {before_files} file records.")

        return {
            "success": True,
            "message": "Successfully cleared all data and reset to fresh state",
            "documents_removed": before_documents,
            "files_removed": before_files
        }

    except Exception as e:
        logger.error(f"Error clearing all data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to clear all data")

@app.delete("/embeddings/{document_id}")
async def delete_specific_embedding(document_id: str):
    """Delete a specific embedding by document ID"""
    try:
        # Delete the document from vector store
        await vector_service.delete_document(document_id)

        logger.info(f"Deleted embedding with document ID: {document_id}")

        return {
            "success": True,
            "message": f"Successfully deleted embedding",
            "document_id": document_id
        }

    except Exception as e:
        logger.error(f"Error deleting embedding {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete embedding")

@app.delete("/files/{file_path:path}")
async def delete_specific_file(file_path: str):
    """Delete a specific file and its embeddings"""
    try:
        from pathlib import Path
        file_path_obj = Path(file_path)

        # Get file status before deletion
        file_status = folder_monitor.get_file_status(file_path)
        if not file_status:
            raise HTTPException(status_code=404, detail="File not found in processing records")

        # Remove embeddings if they exist
        if "document_id" in file_status:
            await vector_service.delete_document(file_status["document_id"])

        # Remove from file hash database
        del folder_monitor.hash_service.file_hashes[str(file_path_obj)]
        folder_monitor.hash_service.save_hash_database()

        logger.info(f"Deleted file record and embeddings for: {file_path}")

        return {
            "success": True,
            "message": f"Successfully deleted file and its embeddings",
            "file_path": file_path,
            "document_id": file_status.get("document_id")
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file {file_path}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete file")

@app.on_event("startup")
async def startup_event():
    """Handle application startup events"""
    await start_default_folder_on_startup()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)