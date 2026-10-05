"""
Wrapper autour de ChromaDB (base vectorielle locale, persistée sur disque).
Aucune dépendance à un service cloud d'embeddings ou de vector search :
cohérent avec l'exigence de confidentialité des données de santé — tout
reste sur l'infrastructure de la clinique.

Le modèle d'embeddings est multilingue (EN/FR/AR) pour rester cohérent avec
le pipeline NLP existant (medspaCy EN + fallback FR/AR), afin qu'une
question posée dans n'importe laquelle de ces langues retrouve les bons
passages, quelle que soit la langue des documents source.
"""
import chromadb
from chromadb.utils import embedding_functions

from app.config import settings

_client = None
_collection = None

COLLECTION_NAME = "medical_knowledge"


def get_collection():
    global _client, _collection
    if _collection is not None:
        return _collection

    _client = chromadb.PersistentClient(path=settings.chroma_persist_dir)

    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=settings.embedding_model_name
    )

    _collection = _client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=embedding_fn,
        metadata={"hnsw:space": "cosine"},
    )
    return _collection


def reset_collection() -> None:
    """Utilitaire de développement : vide l'index pour ré-ingérer proprement."""
    global _client, _collection
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    _client.delete_collection(COLLECTION_NAME)
    _collection = None
