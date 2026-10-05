"""
Point d'entrée unique de l'Assistant IA. Route la question vers l'un des
deux pipelines selon qu'un patient_id est fourni ou non.

Le routage est déterminé par le CONTEXTE D'APPEL (le widget est monté avec
ou sans patient_id selon la page), pas par une classification LLM de
l'intention — plus rapide (pas d'appel modèle supplémentaire), plus
prévisible, et suffisant puisque le frontend sait toujours dans quel
contexte il se trouve.
"""
from sqlalchemy.orm import Session

from app.services.ai_assistant.patient_context import build_patient_context
from app.services.ai_assistant.prompts import (
    build_patient_prompt,
    build_general_prompt,
    DISCLAIMER,
)
from app.services.ai_assistant.qwen_client import qwen_client
from app.services.ai_assistant.rag.retriever import retrieve


def ask_assistant(
    db: Session,
    question: str,
    patient_id: str | None = None,
    intake_id: str | None = None,
) -> dict:
    if patient_id:
        context = build_patient_context(db, patient_id, intake_id)
        prompt = build_patient_prompt(question, context)
        answer = qwen_client.generate(prompt, temperature=0.15)
        return {"mode": "patient", "answer": answer, "sources": [], "disclaimer": DISCLAIMER}

    chunks = retrieve(question, top_k=4)
    if not chunks:
        return {
            "mode": "general",
            "answer": "I don't have reference material covering this question yet.",
            "sources": [],
            "disclaimer": DISCLAIMER,
        }

    prompt = build_general_prompt(question, chunks)
    answer = qwen_client.generate(prompt, temperature=0.2)
    return {
        "mode": "general",
        "answer": answer,
        "sources": [{"source": c["source"], "relevance": c["relevance"]} for c in chunks],
        "disclaimer": DISCLAIMER,
    }
