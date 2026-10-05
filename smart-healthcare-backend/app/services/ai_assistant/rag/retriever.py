"""
Recherche des passages les plus pertinents pour une question donnée.
Le score de pertinence (1 - distance cosinus) est restitué au frontend pour
transparence — le médecin voit d'où vient chaque affirmation, pas
uniquement le texte généré.
"""
from app.services.ai_assistant.rag.vector_store import get_collection


def retrieve(question: str, top_k: int = 4) -> list[dict]:
    collection = get_collection()
    results = collection.query(query_texts=[question], n_results=top_k)

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    return [
        {
            "text": doc,
            "source": meta.get("source", "unknown"),
            "relevance": round(1 - dist, 3),
        }
        for doc, meta, dist in zip(documents, metadatas, distances)
    ]
