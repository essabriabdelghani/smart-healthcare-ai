"""
Usage :
    python scripts/ingest_documents.py ./medical_docs
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.ai_assistant.rag.ingest import ingest_folder

if __name__ == "__main__":
    folder = sys.argv[1] if len(sys.argv) > 1 else "./medical_docs"
    count = ingest_folder(folder)
    print(f"Done. {count} chunks indexed from '{folder}'.")