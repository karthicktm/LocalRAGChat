import logging
from typing import List, Dict, Any, Optional
import os
from pathlib import Path
import PyPDF2
try:
    from docx import Document
except ImportError:
    Document = None
import uuid
import re

logger = logging.getLogger(__name__)

class DocumentService:
    def __init__(self):
        self.supported_extensions = {'.pdf', '.docx', '.txt', '.md', '.markdown', '.doc', '.rtf', '.json', '.yaml', '.yml', '.xls', '.xlsx', '.ppt', '.pptx'}

    async def process_file(self, file_path: Path, file_id: str) -> List[Dict[str, Any]]:
        """Process a single file and return text chunks"""
        try:
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")

            file_extension = file_path.suffix.lower()
            if file_extension not in self.supported_extensions:
                raise ValueError(f"Unsupported file type: {file_extension}")

            # Extract text based on file type
            text = await self._extract_text(file_path, file_extension)

            # Chunk the text
            chunks = self._chunk_text(text)

            # Create chunk metadata
            chunk_metadata = []
            for i, chunk in enumerate(chunks):
                chunk_metadata.append({
                    "chunk_id": f"{file_id}_chunk_{i}",
                    "file_id": file_id,
                    "filename": file_path.name,
                    "file_path": str(file_path),
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "content": chunk,
                    "file_type": file_extension,
                    "chunk_size": len(chunk),
                    "word_count": len(chunk.split())
                })

            logger.info(f"Processed {file_path.name}: {len(chunks)} chunks")
            return chunk_metadata

        except Exception as e:
            logger.error(f"Error processing file {file_path}: {str(e)}")
            raise

    async def _extract_text(self, file_path: Path, file_extension: str) -> str:
        """Extract text from different file types"""
        try:
            if file_extension == '.pdf':
                return self._extract_from_pdf(file_path)
            elif file_extension == '.docx':
                return self._extract_from_docx(file_path)
            elif file_extension in ['.txt', '.md', '.markdown']:
                return self._extract_from_text_file(file_path)
            elif file_extension in ['.json']:
                return self._extract_from_json(file_path)
            elif file_extension in ['.yaml', '.yml']:
                return self._extract_from_yaml(file_path)
            elif file_extension in ['.doc']:
                return self._extract_from_doc(file_path)
            elif file_extension in ['.rtf']:
                return self._extract_from_rtf(file_path)
            elif file_extension in ['.xls', '.xlsx']:
                return self._extract_from_excel(file_path)
            elif file_extension in ['.ppt', '.pptx']:
                return self._extract_from_powerpoint(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")

        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {str(e)}")
            raise

    def _extract_from_pdf(self, file_path: Path) -> str:
        """Extract text from PDF file"""
        text = ""
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text() + "\n"
        return text

    def _extract_from_docx(self, file_path: Path) -> str:
        """Extract text from DOCX file"""
        if Document is None:
            raise ImportError("python-docx library is not installed. Run: pip install python-docx")
        doc = Document(file_path)
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])

    def _extract_from_text_file(self, file_path: Path) -> str:
        """Extract text from text files"""
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()

    def _extract_from_json(self, file_path: Path) -> str:
        """Extract text from JSON files"""
        try:
            import json
            with open(file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
                # Convert JSON to formatted text
                return json.dumps(data, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error extracting from JSON {file_path}: {e}")
            # Fallback to reading as plain text
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()

    def _extract_from_yaml(self, file_path: Path) -> str:
        """Extract text from YAML files"""
        try:
            import yaml
            with open(file_path, 'r', encoding='utf-8') as file:
                data = yaml.safe_load(file)
                # Convert YAML back to formatted text
                return yaml.dump(data, default_flow_style=False, allow_unicode=True)
        except ImportError:
            logger.warning("PyYAML not installed, reading YAML as plain text")
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except Exception as e:
            logger.error(f"Error extracting from YAML {file_path}: {e}")
            # Fallback to reading as plain text
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()

    def _extract_from_doc(self, file_path: Path) -> str:
        """Extract text from old Word .doc files"""
        try:
            # For .doc files, we can try using python-docx2txt or textract
            # For now, return a placeholder indicating the file type
            return f"[Word Document: {file_path.name}] - Content extraction from .doc files requires additional libraries."
        except Exception as e:
            logger.error(f"Error extracting from DOC {file_path}: {e}")
            return f"[Error processing Word document: {file_path.name}]"

    def _extract_from_rtf(self, file_path: Path) -> str:
        """Extract text from RTF files"""
        try:
            # Basic RTF text extraction - remove RTF formatting
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                content = file.read()
                # Remove basic RTF tags
                import re
                text = re.sub(r'\\[a-zA-Z]+\d*', '', content)  # Remove RTF commands
                text = re.sub(r'[{}]', '', text)  # Remove braces
                text = re.sub(r'\n+', '\n', text)  # Normalize newlines
                return text.strip()
        except Exception as e:
            logger.error(f"Error extracting from RTF {file_path}: {e}")
            return f"[Error processing RTF document: {file_path.name}]"

    def _extract_from_excel(self, file_path: Path) -> str:
        """Extract text from Excel files"""
        try:
            import pandas as pd
            # Read all sheets
            excel_file = pd.ExcelFile(file_path)
            text_content = []

            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                text_content.append(f"=== Sheet: {sheet_name} ===")
                # Convert dataframe to text
                text_content.append(df.to_string(index=False))
                text_content.append("\n")

            return "\n".join(text_content)
        except ImportError:
            logger.warning("pandas not installed, reading Excel as binary")
            return f"[Excel File: {file_path.name}] - Content extraction from Excel files requires pandas library."
        except Exception as e:
            logger.error(f"Error extracting from Excel {file_path}: {e}")
            return f"[Error processing Excel file: {file_path.name}]"

    def _extract_from_powerpoint(self, file_path: Path) -> str:
        """Extract text from PowerPoint files"""
        try:
            # For PowerPoint files, we'd need python-pptx library
            # For now, return a placeholder
            return f"[PowerPoint File: {file_path.name}] - Content extraction from PowerPoint files requires additional libraries."
        except Exception as e:
            logger.error(f"Error extracting from PowerPoint {file_path}: {e}")
            return f"[Error processing PowerPoint file: {file_path.name}]"

    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into chunks with overlap"""
        if len(text) <= chunk_size:
            return [text]

        chunks = []
        start = 0

        while start < len(text):
            end = start + chunk_size

            # Find the last complete sentence to avoid cutting in middle
            if end < len(text):
                # Look for sentence endings
                last_period = text.rfind('.', start, end)
                last_newline = text.rfind('\n', start, end)
                last_sentence_end = max(last_period, last_newline)

                if last_sentence_end > start + chunk_size // 2:  # Don't make chunks too small
                    end = last_sentence_end + 1

            chunks.append(text[start:end].strip())

            # Move start with overlap for context
            start = max(start, end - overlap)

        return [chunk for chunk in chunks if chunk.strip()]

    async def process_directory(self, directory_path: Path) -> List[Dict[str, Any]]:
        """Process all supported files in a directory recursively"""
        all_chunks = []

        try:
            for file_path in self._get_files_recursive(directory_path):
                file_id = str(uuid.uuid4())
                try:
                    chunks = await self.process_file(file_path, file_id)
                    all_chunks.extend(chunks)
                except Exception as e:
                    logger.error(f"Failed to process {file_path.name}: {str(e)}")
                    continue

            logger.info(f"Processed directory {directory_path}: {len(all_chunks)} total chunks")
            return all_chunks

        except Exception as e:
            logger.error(f"Error processing directory {directory_path}: {str(e)}")
            raise

    def _get_files_recursive(self, directory: Path) -> List[Path]:
        """Get all supported files in directory recursively"""
        files = []

        for file_path in directory.rglob("*"):
            if file_path.is_file() and file_path.suffix.lower() in self.supported_extensions:
                files.append(file_path)

        return sorted(files)

    def get_file_metadata(self, file_path: Path) -> Dict[str, Any]:
        """Get basic metadata for a file"""
        try:
            stat = file_path.stat()
            return {
                "name": file_path.name,
                "path": str(file_path),
                "size": stat.st_size,
                "modified": stat.st_mtime,
                "extension": file_path.suffix.lower(),
                "type": "file"
            }
        except Exception as e:
            logger.error(f"Error getting metadata for {file_path}: {str(e)}")
            return {"name": file_path.name, "path": str(file_path), "type": "file"}

    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)

        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.,!?;:()\-"\'\n]', '', text)

        return text.strip()