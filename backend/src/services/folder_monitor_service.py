import asyncio
import logging
import os
from pathlib import Path
from typing import Optional, Set, Dict
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import threading
import time

from file_hash_service import FileHashService
from vector_service import VectorService
from document_service import DocumentService
from ollama_service import OllamaService

logger = logging.getLogger(__name__)

class FolderChangeHandler(FileSystemEventHandler):
    """Handler for file system events"""

    def __init__(self, folder_monitor):
        self.folder_monitor = folder_monitor
        self.debounce_time = 2.0  # Debounce rapid changes
        self.pending_files = {}
        self.processing_lock = asyncio.Lock()

    def on_created(self, event):
        if not event.is_directory:
            file_path = Path(event.src_path)
            logger.info(f"File created event detected: {file_path}")
            self.schedule_file_processing(file_path, "created")

    def on_modified(self, event):
        if not event.is_directory:
            file_path = Path(event.src_path)
            self.schedule_file_processing(file_path, "modified")

    def on_deleted(self, event):
        if not event.is_directory:
            file_path = Path(event.src_path)
            self.schedule_file_cleanup(file_path)

    def on_moved(self, event):
        if not event.is_directory:
            old_path = Path(event.src_path)
            new_path = Path(event.dest_path)
            self.schedule_file_cleanup(old_path)
            self.schedule_file_processing(new_path, "moved")

    def schedule_file_processing(self, file_path: Path, event_type: str):
        """Schedule file for processing with debouncing"""
        file_key = str(file_path)

        # Cancel existing timer for this file if any
        if file_key in self.pending_files:
            self.pending_files[file_key].cancel()

        # Schedule new processing
        timer = threading.Timer(
            self.debounce_time,
            self._process_file_async,
            args=[file_path, event_type]
        )
        self.pending_files[file_key] = timer
        timer.start()

    def schedule_file_cleanup(self, file_path: Path):
        """Schedule file for cleanup"""
        file_key = str(file_path)

        if file_key in self.pending_files:
            self.pending_files[file_key].cancel()
            del self.pending_files[file_key]

        timer = threading.Timer(
            self.debounce_time,
            self._cleanup_file_async,
            args=[file_path]
        )
        self.pending_files[file_key] = timer
        timer.start()

    def _process_file_async(self, file_path: Path, event_type: str):
        """Process file asynchronously"""
        try:
            # Use a thread-safe approach by adding to a queue
            self.folder_monitor._add_file_to_queue(file_path, event_type)
        except Exception as e:
            logger.error(f"Error scheduling file processing: {e}")

    def _cleanup_file_async(self, file_path: Path):
        """Cleanup file asynchronously"""
        try:
            # Use a thread-safe approach by adding to a cleanup queue
            self.folder_monitor._add_file_to_cleanup_queue(file_path)
        except Exception as e:
            logger.error(f"Error scheduling file cleanup: {e}")

class FolderMonitorService:
    """Service for monitoring folders and auto-processing files"""

    def __init__(self, vector_service: VectorService, document_service: DocumentService, ollama_service: OllamaService):
        self.vector_service = vector_service
        self.document_service = document_service
        self.ollama_service = ollama_service
        self.hash_service = FileHashService()

        self.monitored_path: Optional[Path] = None
        self.observer: Optional[Observer] = None
        self.is_monitoring = False
        self.monitoring_task: Optional[asyncio.Task] = None
        self.scan_task: Optional[asyncio.Task] = None
        self.last_scan_time: float = 0

        # Thread-safe lists for file processing (simpler than queues)
        self.pending_files = []
        self.pending_cleanup = []
        self.processing_lock = asyncio.Lock()

    async def start_monitoring(self, folder_path: str) -> bool:
        """Start monitoring a folder"""
        try:
            folder_path = Path(folder_path).resolve()

            if not folder_path.exists():
                logger.error(f"Folder does not exist: {folder_path}")
                return False

            if not folder_path.is_dir():
                logger.error(f"Path is not a directory: {folder_path}")
                return False

            # Stop existing monitoring
            await self.stop_monitoring()

            self.monitored_path = folder_path
            self.is_monitoring = True

            # Process existing files
            await self.process_existing_files(folder_path)

            # Start file system watcher
            self.observer = Observer()
            event_handler = FolderChangeHandler(self)
            self.observer.schedule(event_handler, str(folder_path), recursive=True)
            self.observer.start()

            # Start periodic cleanup task
            self.monitoring_task = asyncio.create_task(self.periodic_cleanup())

            # Start periodic file scan as backup to watchdog
            self.scan_task = asyncio.create_task(self.periodic_file_scan())

            # Start pending files processor
            self.queue_processor_task = asyncio.create_task(self._process_pending_files())

            logger.info(f"Started monitoring folder: {folder_path}")
            return True

        except Exception as e:
            logger.error(f"Error starting folder monitoring: {e}")
            return False

    async def stop_monitoring(self):
        """Stop folder monitoring"""
        try:
            self.is_monitoring = False

            if self.observer:
                self.observer.stop()
                self.observer.join()
                self.observer = None

            if self.monitoring_task:
                self.monitoring_task.cancel()
                try:
                    await self.monitoring_task
                except asyncio.CancelledError:
                    pass
                self.monitoring_task = None

            if self.scan_task:
                self.scan_task.cancel()
                try:
                    await self.scan_task
                except asyncio.CancelledError:
                    pass
                self.scan_task = None

            if self.queue_processor_task:
                self.queue_processor_task.cancel()
                try:
                    await self.queue_processor_task
                except asyncio.CancelledError:
                    pass
                self.queue_processor_task = None

            logger.info("Stopped folder monitoring")

        except Exception as e:
            logger.error(f"Error stopping folder monitoring: {e}")

    async def process_existing_files(self, folder_path: Path):
        """Process all existing files in the folder"""
        logger.info(f"Processing existing files in: {folder_path}")

        processed_count = 0
        skipped_count = 0
        error_count = 0

        for file_path in folder_path.rglob("*"):
            if file_path.is_file() and self.hash_service.is_supported_file(file_path):
                try:
                    success = await self.process_file(file_path, "existing")
                    if success:
                        processed_count += 1
                    else:
                        skipped_count += 1
                except Exception as e:
                    logger.error(f"Error processing existing file {file_path}: {e}")
                    error_count += 1

        logger.info(f"Processed {processed_count} files, skipped {skipped_count}, errors {error_count}")

    async def process_file(self, file_path: Path, event_type: str) -> bool:
        """Process a single file"""
        try:
            # Check if file is supported
            if not self.hash_service.is_supported_file(file_path):
                logger.debug(f"Skipping unsupported file: {file_path}")
                return False

            # Check if file has changed
            if not self.hash_service.has_file_changed(file_path):
                logger.debug(f"File unchanged, skipping: {file_path}")
                return False

            logger.info(f"Processing file ({event_type}): {file_path}")

            # Mark as processing
            self.hash_service.update_file_hash(file_path, "processing")

            # Process file using document service
            chunks = await self.document_service.process_file(file_path, str(file_path))

            if not chunks:
                raise Exception("No chunks generated from file")

            # Remove old embeddings if file exists
            await self.cleanup_file(file_path)

            # Add chunks to vector store with enhanced metadata
            document_ids = []
            for chunk_metadata in chunks:
                doc_id = await self.vector_service.add_document(
                    content=chunk_metadata["content"],
                    metadata={
                        "source": "auto_folder_monitor",
                        "file_path": str(file_path),
                        "filename": file_path.name,
                        "folder_path": str(file_path.parent),
                        "file_size": file_path.stat().st_size,
                        "file_modified": file_path.stat().st_mtime,
                        "chunk_id": chunk_metadata["chunk_id"],
                        "chunk_index": chunk_metadata["chunk_index"],
                        "file_type": chunk_metadata["file_type"],
                        "event_type": event_type,
                        "processed_at": time.time()
                    }
                )
                document_ids.append(doc_id)

            # Mark as completed
            self.hash_service.mark_file_processed(file_path, document_ids[0], len(chunks))

            logger.info(f"Successfully processed {file_path}: {len(chunks)} chunks, {len(document_ids)} documents")
            return True

        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}")
            self.hash_service.mark_file_error(file_path, str(e))
            return False

    async def cleanup_file(self, file_path: Path):
        """Remove a file from vector store"""
        try:
            # Delete ALL documents for this file path to prevent duplicates
            deleted_count = await self.vector_service.delete_documents_by_file_path(str(file_path))
            if deleted_count > 0:
                logger.debug(f"Cleaned up {deleted_count} old embeddings for: {file_path}")
        except Exception as e:
            logger.error(f"Error cleaning up file {file_path}: {e}")

    async def periodic_cleanup(self):
        """Periodic cleanup of stale files"""
        while self.is_monitoring:
            try:
                if self.monitored_path:
                    await self.hash_service.cleanup_removed_files(self.monitored_path, self.vector_service)
                await asyncio.sleep(300)  # Check every 5 minutes
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic cleanup: {e}")
                await asyncio.sleep(60)  # Retry after 1 minute

    async def periodic_file_scan(self):
        """Periodic file scan to catch new files that watchdog might miss"""
        while self.is_monitoring:
            try:
                if self.monitored_path:
                    current_time = time.time()

                    # Only scan every 10 seconds to avoid excessive CPU usage
                    if current_time - self.last_scan_time >= 10:
                        await self.scan_for_new_files()
                        self.last_scan_time = current_time

                await asyncio.sleep(5)  # Check every 5 seconds
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic file scan: {e}")
                await asyncio.sleep(5)  # Retry after 5 seconds

    async def scan_for_new_files(self):
        """Scan for new files and process them"""
        try:
            if not self.monitored_path:
                return

            logger.debug(f"Scanning for new files in: {self.monitored_path}")

            # Get all known files from hash service
            known_files = set()
            for file_path_str in self.hash_service.file_hashes.keys():
                if file_path_str.startswith(str(self.monitored_path)):
                    known_files.add(Path(file_path_str))

            # Scan for new files
            new_files_found = []
            for file_path in self.monitored_path.rglob('*'):
                if file_path.is_file() and not file_path.is_dir():
                    # Skip hidden files and temporary files
                    if file_path.name.startswith('.') or file_path.name.endswith('~'):
                        continue

                    # Check if this is a new file
                    if file_path not in known_files:
                        # Check if file is old enough to avoid processing files being written
                        try:
                            file_mtime = file_path.stat().st_mtime
                            current_time = time.time()

                            # Only process files that are at least 2 seconds old
                            if current_time - file_mtime >= 2:
                                new_files_found.append(file_path)
                        except OSError:
                            continue

            # Process new files
            for file_path in new_files_found:
                logger.info(f"Found new file via scan: {file_path}")
                await self.process_file(file_path, "scan_discovered")

        except Exception as e:
            logger.error(f"Error scanning for new files: {e}")

    def get_monitored_path(self) -> Optional[str]:
        """Get currently monitored path"""
        return str(self.monitored_path) if self.monitored_path else None

    def is_active(self) -> bool:
        """Check if monitoring is active"""
        return self.is_monitoring

    def get_file_status(self, file_path: str) -> Dict:
        """Get processing status of a specific file"""
        return self.hash_service.get_file_status(Path(file_path))

    def get_all_file_statuses(self) -> Dict:
        """Get all file statuses for currently monitored directory only"""
        if not self.monitored_path:
            return {}

        monitored_path_str = str(self.monitored_path.resolve())
        filtered_statuses = {}

        for file_path_str, status in self.hash_service.file_hashes.items():
            # Only include files that are in the currently monitored directory or its subdirectories
            if file_path_str.startswith(monitored_path_str + os.sep) or file_path_str.startswith(monitored_path_str + '/'):
                filtered_statuses[file_path_str] = status.copy()

        return filtered_statuses

    # Thread-safe list methods for watchdog integration
    def _add_file_to_queue(self, file_path: Path, event_type: str):
        """Thread-safe method to add file to processing list"""
        try:
            self.pending_files.append((file_path, event_type))
        except Exception as e:
            logger.error(f"Error adding file to processing list: {e}")

    def _add_file_to_cleanup_queue(self, file_path: Path):
        """Thread-safe method to add file to cleanup list"""
        try:
            self.pending_cleanup.append(file_path)
        except Exception as e:
            logger.error(f"Error adding file to cleanup list: {e}")

    async def _process_pending_files(self):
        """Process pending files from the lists"""
        while self.is_monitoring:
            try:
                async with self.processing_lock:
                    # Process cleanup files first (higher priority)
                    if self.pending_cleanup:
                        cleanup_files = self.pending_cleanup.copy()
                        self.pending_cleanup.clear()

                        for file_path in cleanup_files:
                            await self.cleanup_file(file_path)

                    # Process pending files
                    if self.pending_files:
                        pending_files = self.pending_files.copy()
                        self.pending_files.clear()

                        for file_path, event_type in pending_files:
                            await self.process_file(file_path, event_type)

                # Small delay to prevent busy waiting
                await asyncio.sleep(1)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error processing pending files: {e}")
                await asyncio.sleep(5)