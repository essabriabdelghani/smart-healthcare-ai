"""
Récupère le contenu de référence pour chaque concept clinique du vocabulaire
(app/services/clinical_vocabulary.py) via l'API officielle MedlinePlus
Web Service (https://medlineplus.gov/webservices.html) — PAS un scraping
HTML brut : MedlinePlus expose explicitement ce service pour la réutilisation
de son contenu (source gouvernementale NIH, sans droit d'auteur commercial).

Usage :
    python scripts/fetch_medlineplus.py

Nécessite une connexion internet (contrairement au reste du pipeline RAG qui
tourne 100% en local une fois les documents ingérés). Écrit un fichier
.md par concept dans ./medical_docs/, prêt pour `ingest_documents.py`.
"""
import re
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

API_URL = "https://wsearch.nlm.nih.gov/ws/query"
OUTPUT_DIR = Path("./medical_docs")
REQUEST_DELAY_SECONDS = 1.0  # politesse envers l'API publique du NIH

# Mapping concept_id (clinical_vocabulary.py) -> terme de recherche MedlinePlus
CONCEPTS_TO_FETCH = {
    "chest_pain": "chest pain",
    "shortness_of_breath": "shortness of breath",
    "difficulty_breathing": "difficulty breathing",
    "fainting": "fainting",
    "confusion": "confusion",
    "bleeding": "bleeding",
    "high_fever": "fever",
    "severe_headache": "headache",
    "abdominal_pain": "abdominal pain",
    "fever": "fever",
    "dizziness": "dizziness",
    "vomiting": "vomiting",
    "cough": "cough",
    "headache": "headache",
    "fatigue": "fatigue",
    "nausea": "nausea",
    "diarrhea": "diarrhea",
    "back_pain": "back pain",
    "sore_throat": "sore throat",
    "heart_attack_history": "heart attack",
    "stroke_history": "stroke",
    "pneumonia": "pneumonia",
    "cancer": "cancer",
    "covid": "COVID-19",
    "diabetes": "type 2 diabetes",
    "hypertension": "high blood pressure",
    "asthma": "asthma",
}


def _strip_html(raw: str) -> str:
    """Le service renvoie du texte avec des balises <span class='qt0'> pour
    le surlignage des termes recherchés — on les retire pour un texte propre."""
    text = re.sub(r"<[^>]+>", "", raw)
    return re.sub(r"\s+", " ", text).strip()


def fetch_topic(term: str) -> dict | None:
    response = requests.get(
        API_URL,
        params={"db": "healthTopics", "term": term, "retmax": 1},
        timeout=15,
    )
    response.raise_for_status()

    root = ET.fromstring(response.content)
    document = root.find(".//document")
    if document is None:
        return None

    title_el = document.find("./content[@name='title']")
    summary_el = document.find("./content[@name='FullSummary']")
    url = document.attrib.get("url", "")

    return {
        "title": _strip_html(title_el.text or "") if title_el is not None else term,
        "summary": _strip_html(summary_el.text or "") if summary_el is not None else "",
        "url": url,
    }


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    fetched, skipped = 0, 0

    for concept_id, term in CONCEPTS_TO_FETCH.items():
        try:
            topic = fetch_topic(term)
        except requests.RequestException as exc:
            print(f"[skip] {concept_id}: request failed ({exc})")
            skipped += 1
            continue

        if topic is None or not topic["summary"]:
            print(f"[skip] {concept_id}: no summary found for '{term}'")
            skipped += 1
            continue

        content = (
            f"# {topic['title']}\n\n"
            f"{topic['summary']}\n\n"
            f"Source: MedlinePlus (NIH) — {topic['url']}\n"
        )
        out_path = OUTPUT_DIR / f"{concept_id}.md"
        out_path.write_text(content, encoding="utf-8")
        print(f"[ok] {concept_id} -> {out_path.name} ({len(topic['summary'])} chars)")
        fetched += 1

        time.sleep(REQUEST_DELAY_SECONDS)

    print(f"\nDone. {fetched} fetched, {skipped} skipped.")


if __name__ == "__main__":
    main()
