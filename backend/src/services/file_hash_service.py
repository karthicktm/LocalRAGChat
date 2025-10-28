import hashlib
import os
import json
import logging
from pathlib import Path
from typing import Dict, Optional, Set
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

class FileHashService:
    """Service for tracking file hashes to detect changes"""

    def __init__(self, hash_db_path: str = "file_hashes.json"):
        self.hash_db_path = Path(hash_db_path)
        self.file_hashes: Dict[str, Dict] = {}
        self.load_hash_database()

    def load_hash_database(self):
        """Load existing hash database from disk"""
        if self.hash_db_path.exists():
            try:
                with open(self.hash_db_path, 'r') as f:
                    self.file_hashes = json.load(f)
                logger.info(f"Loaded hash database with {len(self.file_hashes)} files")
            except Exception as e:
                logger.error(f"Error loading hash database: {e}")
                self.file_hashes = {}
        else:
            logger.info("No existing hash database found, starting fresh")

    def save_hash_database(self):
        """Save hash database to disk"""
        try:
            with open(self.hash_db_path, 'w') as f:
                json.dump(self.file_hashes, f, indent=2)
            logger.info(f"Saved hash database with {len(self.file_hashes)} files")
        except Exception as e:
            logger.error(f"Error saving hash database: {e}")

    def calculate_file_hash(self, file_path: Path) -> Optional[str]:
        """Calculate SHA-256 hash of a file"""
        try:
            hash_sha256 = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except Exception as e:
            logger.error(f"Error calculating hash for {file_path}: {e}")
            return None

    def get_file_stats(self, file_path: Path) -> Dict:
        """Get file statistics"""
        try:
            stat = file_path.stat()
            return {
                "size": stat.st_size,
                "modified": stat.st_mtime,
                "created": stat.st_ctime
            }
        except Exception as e:
            logger.error(f"Error getting stats for {file_path}: {e}")
            return {}

    def has_file_changed(self, file_path: Path) -> bool:
        """Check if file has changed since last processing"""
        file_key = str(file_path)

        # If file is not in database, it's new
        if file_key not in self.file_hashes:
            return True

        # Calculate current hash
        current_hash = self.calculate_file_hash(file_path)
        if not current_hash:
            return False

        # Check if hash matches
        stored_data = self.file_hashes[file_key]
        return stored_data.get("hash") != current_hash

    def update_file_hash(self, file_path: Path, status: str = "processed", error: str = None):
        """Update file hash in database"""
        file_key = str(file_path)
        current_hash = self.calculate_file_hash(file_path)
        file_stats = self.get_file_stats(file_path)

        if current_hash:
            self.file_hashes[file_key] = {
                "hash": current_hash,
                "status": status,
                "last_processed": datetime.now().isoformat(),
                "error": error,
                **file_stats
            }

    def get_file_status(self, file_path: Path) -> Dict:
        """Get file processing status"""
        file_key = str(file_path)
        return self.file_hashes.get(file_key, {})

    def mark_file_processed(self, file_path: Path, document_id: str, chunks_count: int):
        """Mark file as successfully processed"""
        file_key = str(file_path)
        current_hash = self.calculate_file_hash(file_path)
        file_stats = self.get_file_stats(file_path)

        if current_hash:
            self.file_hashes[file_key] = {
                "hash": current_hash,
                "status": "completed",
                "last_processed": datetime.now().isoformat(),
                "document_id": document_id,
                "chunks_processed": chunks_count,
                **file_stats
            }
        self.save_hash_database()

    def mark_file_error(self, file_path: Path, error: str):
        """Mark file processing as failed"""
        file_key = str(file_path)
        current_hash = self.calculate_file_hash(file_path)

        if current_hash:
            self.file_hashes[file_key] = {
                "hash": current_hash,
                "status": "error",
                "last_processed": datetime.now().isoformat(),
                "error": error
            }
        self.save_hash_database()

    def get_stale_files(self, folder_path: Path) -> Set[Path]:
        """Get files that have been removed or need cleanup"""
        folder_path = Path(folder_path)
        existing_files = set()

        if folder_path.exists():
            for file_path in folder_path.rglob("*"):
                if file_path.is_file():
                    existing_files.add(str(file_path))

        # Files in database but not in folder anymore
        stale_files = set()
        for file_key in self.file_hashes.keys():
            if file_key not in existing_files:
                stale_files.add(Path(file_key))

        return stale_files

    async def cleanup_removed_files(self, folder_path: Path, vector_service):
        """Clean up files that have been removed from the folder"""
        stale_files = self.get_stale_files(folder_path)

        for file_path in stale_files:
            file_key = str(file_path)
            file_data = self.file_hashes.get(file_key, {})

            if "document_id" in file_data:
                # Remove from vector store
                try:
                    await vector_service.delete_document(file_data["document_id"])
                    logger.info(f"Removed stale document from vector store: {file_path}")
                except Exception as e:
                    logger.error(f"Error removing stale document {file_path}: {e}")

            # Remove from hash database
            del self.file_hashes[file_key]

        if stale_files:
            self.save_hash_database()
            logger.info(f"Cleaned up {len(stale_files)} stale files")

    def get_supported_extensions(self) -> Set[str]:
        """Get supported file extensions"""
        return {'.txt', '.md', '.pdf', '.docx', '.doc', '.rtf', '.json', '.yaml', '.yml', '.xls', '.xlsx', '.ppt', '.pptx'}

    def is_supported_file(self, file_path: Path) -> bool:
        """Check if file type is supported"""
        return file_path.suffix.lower() in self.get_supported_extensions()