# Le package "spacy" lui-même peut ne pas être installé (il n'est pas dans
# requirements.txt par défaut — voir note en bas de fichier). On importe donc
# de façon défensive : si spacy est absent, on se replie sur l'extraction par
# mots-clés uniquement, sans jamais faire planter le démarrage du serveur.
try:
    import spacy
except ImportError:
    spacy = None

# Le modèle est chargé PARESSEUSEMENT (au premier appel, pas à l'import).
# Si "en_core_web_sm" n'est pas installé (`python -m spacy download en_core_web_sm`),
# on se replie silencieusement sur l'extraction par mots-clés uniquement, plutôt
# que de faire planter tout le serveur FastAPI au démarrage.
_nlp = None
_nlp_load_attempted = False


def _get_nlp():
    global _nlp, _nlp_load_attempted
    if spacy is None:
        return None
    if not _nlp_load_attempted:
        _nlp_load_attempted = True
        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            _nlp = None
    return _nlp


SYMPTOMS = {
    "fever",
    "cough",
    "headache",
    "chest pain",
    "shortness of breath",
    "difficulty breathing",
    "vomiting",
    "diarrhea",
    "fatigue",
    "dizziness",
    "abdominal pain",
    "sore throat",
    "back pain",
    "nausea",
}

DISEASES = {
    "diabetes",
    "hypertension",
    "covid",
    "covid-19",
    "asthma",
    "pneumonia",
    "cancer",
    "stroke",
    "heart attack",
}

MEDICATIONS = {
    "paracetamol",
    "ibuprofen",
    "aspirin",
    "metformin",
    "insulin",
    "amoxicillin",
    "vitamin c",
}

ALLERGIES = {
    "penicillin",
    "peanuts",
    "latex",
    "dust",
    "milk",
}


def _extract_keywords(text: str, vocabulary: set[str]):
    """
    Return matching keywords.
    """

    text = text.lower()

    found = []

    for item in vocabulary:

        if item in text:
            found.append(item)

    return list(set(found))


def extract_entities(text: str):
    """
    Extract medical information.
    """

    entities = []
    nlp = _get_nlp()

    if nlp is not None:
        doc = nlp(text)
        for ent in doc.ents:
            entities.append(
                {
                    "text": ent.text,
                    "label": ent.label_,
                }
            )

    symptoms = _extract_keywords(text, SYMPTOMS)

    diseases = _extract_keywords(text, DISEASES)

    medications = _extract_keywords(text, MEDICATIONS)

    allergies = _extract_keywords(text, ALLERGIES)

    return {

        "symptoms": symptoms,

        "diseases": diseases,

        "medications": medications,

        "allergies": allergies,

        "entities": entities,
    }


def summarize_patient(text: str):
    """
    Very simple summary for MVP.
    """

    result = extract_entities(text)

    summary = {
        "summary": text[:250],
        "symptoms": result["symptoms"],
        "diseases": result["diseases"],
        "medications": result["medications"],
        "allergies": result["allergies"],
    }

    return summary


# Confiance forfaitaire : correspondance par mots-clés = fiable (0.85),
# entité reconnue par le modèle spaCy générique (non médical) = moins fiable (0.6).
_KEYWORD_CONFIDENCE = 0.85
_SPACY_ENTITY_CONFIDENCE = 0.60


def extract_and_persist_entities(db, intake_id: str, text: str) -> list:
    """
    Exécute extract_entities() sur le texte de l'admission (symptômes +
    antécédents) et enregistre chaque entité trouvée comme une ligne
    ExtractedEntity liée à cet intake. Retourne la liste des objets créés
    (non commités — l'appelant doit faire db.commit()).
    """
    # Import local pour éviter tout risque de cycle d'import au chargement du module.
    from app.models.extracted_entity import ExtractedEntity

    result = extract_entities(text)
    created: list[ExtractedEntity] = []

    category_map = {
        "symptom": result["symptoms"],
        "disease": result["diseases"],
        "medication": result["medications"],
        "allergy": result["allergies"],
    }

    for entity_type, values in category_map.items():
        for value in values:
            row = ExtractedEntity(
                intake_id=intake_id,
                entity_type=entity_type,
                entity_value=value,
                confidence=_KEYWORD_CONFIDENCE,
            )
            db.add(row)
            created.append(row)

    for ent in result["entities"]:
        row = ExtractedEntity(
            intake_id=intake_id,
            entity_type=f"spacy:{ent['label'].lower()}",
            entity_value=ent["text"],
            confidence=_SPACY_ENTITY_CONFIDENCE,
        )
        db.add(row)
        created.append(row)

    return created