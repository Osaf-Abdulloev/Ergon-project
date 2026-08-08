import io
import os
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

class CVParserService:
    @staticmethod
    def extract_text_from_file_bytes(file_bytes: bytes, filename: str, mime_type: str = "") -> str:
        """
        Extract clean text content from PDF, DOCX, DOC, or TXT file bytes.
        """
        ext = os.path.splitext(filename)[1].lower()

        if ext == ".pdf" or "pdf" in mime_type:
            return CVParserService._extract_from_pdf(file_bytes)
        elif ext == ".docx" or "vnd.openxmlformats-officedocument.wordprocessingml.document" in mime_type:
            return CVParserService._extract_from_docx(file_bytes)
        elif ext in [".txt", ".text", ".md", ".log"] or "text/plain" in mime_type:
            return CVParserService._extract_from_txt(file_bytes)
        elif ext == ".doc" or "msword" in mime_type:
            # Fallback for legacy .doc files: try plain text decoding or docx
            try:
                return CVParserService._extract_from_docx(file_bytes)
            except Exception:
                return CVParserService._extract_from_txt(file_bytes)
        else:
            # General fallback: attempt UTF-8 plain text extraction
            return CVParserService._extract_from_txt(file_bytes)

    @staticmethod
    def _extract_from_pdf(file_bytes: bytes) -> str:
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_parts = []
            for idx, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    text_parts.append(page_text.strip())
            extracted = "\n\n".join(text_parts)
            if extracted.strip():
                return extracted.strip()
            raise ValueError("Empty or unreadable PDF text")
        except Exception as e:
            logger.warning(f"pypdf extraction failed or empty: {e}")
            # Try raw fallback
            return CVParserService._extract_from_txt(file_bytes)

    @staticmethod
    def _extract_from_docx(file_bytes: bytes) -> str:
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            
            # Also extract text from tables if any
            for table in doc.tables:
                for row in table.rows:
                    row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_cells:
                        paragraphs.append(" | ".join(row_cells))

            extracted = "\n".join(paragraphs)
            if extracted.strip():
                return extracted.strip()
            raise ValueError("Empty DOCX document")
        except Exception as e:
            logger.warning(f"python-docx extraction failed: {e}")
            return CVParserService._extract_from_txt(file_bytes)

    @staticmethod
    def _extract_from_txt(file_bytes: bytes) -> str:
        for encoding in ["utf-8", "utf-8-sig", "windows-1251", "cp1251", "latin-1"]:
            try:
                text = file_bytes.decode(encoding)
                # Remove unprintable garbage characters
                clean = "".join(c for c in text if c.isprintable() or c in ["\n", "\r", "\t"])
                if clean.strip():
                    return clean.strip()
            except UnicodeDecodeError:
                continue
        return file_bytes.decode("utf-8", errors="ignore").strip()
