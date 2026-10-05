"""
Pipeline d'ingestion des documents médicaux de référence dans la base
vectorielle :

    Documents (.pdf/.txt/.md) -> Cleaning -> Chunking -> Embeddings -> ChromaDB

À exécuter via `scripts/ingest_documents.py` chaque fois que de nouveaux
documents sont ajoutés au dossier de référence, ou qu'un document existant
est mis à jour (les documents médicaux évoluent — c'est tout l'intérêt du
RAG face à un fine-tuning : mettre à jour la connaissance ne demande qu'une
ré-ingestion, pas un ré-entraînement).
"""
import re
import uuid
from pathlib import Path

from app.services.ai_assistant.rag.vector_store import get_collection

CHUNK_SIZE = 800     # caractères par chunk
CHUNK_OVERLAP = 150  # chevauchement pour ne pas couper une idée en deux
SUPPORTED_EXTENSIONS = (".pdf", ".txt", ".md")


def clean_text(text: str) -> str:
    """Normalise les espaces/retours à la ligne superflus issus de l'extraction PDF."""
    return re.sub(r"\s+", " ", text).strip()


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return [c for c in chunks if c.strip()]


def load_document(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    return path.read_text(encoding="utf-8", errors="ignore")


def ingest_folder(folder: str) -> int:
    """Indexe tous les documents supportés d'un dossier. Retourne le nombre
    total de chunks indexés."""
    collection = get_collection()
    total_chunks = 0

    for path in sorted(Path(folder).glob("**/*")):
        if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue

        raw_text = load_document(path)
        chunks = chunk_text(clean_text(raw_text))
        if not chunks:
            continue

        ids = [str(uuid.uuid4()) for _ in chunks]
        metadatas = [{"source": path.name, "chunk_index": i} for i in range(len(chunks))]

        collection.add(documents=chunks, ids=ids, metadatas=metadatas)
        total_chunks += len(chunks)
        print(f"[ingest] {path.name}: {len(chunks)} chunks indexed")

    return total_chunks
