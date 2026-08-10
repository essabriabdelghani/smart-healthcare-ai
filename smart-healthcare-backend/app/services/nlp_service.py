"""
Pipeline NLP clinique.

Anglais : medspaCy — Target Rules (règles définies, pas de modèle statistique
à télécharger) + ConText (Chapman et al., 2013) pour la négation. Package
100% PyPI, pas de dépendance à un fichier modèle hébergé sur S3.

Français / Arabe / repli si medspaCy absent : le même vocabulaire clinique
(clinical_vocabulary.py) recherché par mots-clés, avec la même détection de
négation par fenêtre de mots — aucun modèle clinique pré-entraîné équivalent
n'existe en FR/AR, c'est documenté, pas un raccourci.

Tous les imports lourds (spacy, medspacy, langdetect) sont défensifs : leur
absence ne doit JAMAIS empêcher le serveur de démarrer.
"""

from app.services.clinical_vocabulary import (
    ALL_TERMS_INDEX,
    ENGLISH_TERMS,
    NEGATION_CUES,
    is_negated,
    split_sentences,
)

# ---------------------------------------------------------------------------
# Imports défensifs
# ---------------------------------------------------------------------------

try:
    import spacy
except ImportError:
    spacy = None

try:
    import medspacy
    from medspacy.ner import TargetRule

    _MEDSPACY_AVAILABLE = True
except ImportError:
    _MEDSPACY_AVAILABLE = False

try:
    from langdetect import detect as _langdetect_detect
    from langdetect import LangDetectException
except ImportError:
    _langdetect_detect = None
    LangDetectException = Exception


def detect_language(text: str) -> str:
    """"en" par défaut si la détection échoue ou que langdetect n'est pas
    installé — on préfère tenter le pipeline clinique anglais plutôt que de
    se priver de NLP."""
    if _langdetect_detect is None or not text.strip():
        return "en"
    try:
        return _langdetect_detect(text)
    except LangDetectException:
        return "en"


# ---------------------------------------------------------------------------
# Pipeline clinique anglais : medspaCy (Target Matcher + ConText)
# ---------------------------------------------------------------------------

_clinical_nlp = None
_clinical_nlp_load_attempted = False

_MEDSPACY_PIPES = ["medspacy_pyrush", "medspacy_target_matcher", "medspacy_context"]


def _build_target_rules() -> list:
    return [TargetRule(literal=term, category=concept["category"].upper()) for term, concept in ENGLISH_TERMS]


def _get_clinical_nlp():
    """Charge paresseusement medspaCy. Essaie d'abord avec en_core_web_sm
    (meilleure tokenisation/POS pour ConText) puis se rabat sur le pipeline
    "blank" intégré de medspaCy si ce modèle n'est pas installé — les deux
    fonctionnent, seule la précision de ConText varie légèrement."""
    global _clinical_nlp, _clinical_nlp_load_attempted
    if not _MEDSPACY_AVAILABLE:
        return None
    if _clinical_nlp_load_attempted:
        return _clinical_nlp
    _clinical_nlp_load_attempted = True

    for model in ("en_core_web_sm", None):
        try:
            nlp = medspacy.load(model, enable=_MEDSPACY_PIPES) if model else medspacy.load(enable=_MEDSPACY_PIPES)
            target_matcher = nlp.get_pipe("medspacy_target_matcher")
            target_matcher.add(_build_target_rules())
            _clinical_nlp = nlp
            return _clinical_nlp
        except Exception:
            continue

    _clinical_nlp = None
    return None


# ---------------------------------------------------------------------------
# spaCy générique (entités non cliniques type PERSON/DATE — informationnel)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Mots-clés multilingues (repli EN + seule couverture FR/AR)
# ---------------------------------------------------------------------------

def _extract_keywords_with_negation(text: str) -> list[dict]:
    text_lower = text.lower()
    found: list[dict] = []
    seen: set[str] = set()

    for sentence in split_sentences(text_lower):
        for term, concept in ALL_TERMS_INDEX.items():
            idx = sentence.find(term)
            if idx == -1 or term in seen:
                continue
            seen.add(term)
            negated = is_negated(sentence, idx, NEGATION_CUES)
            found.append(
                {
                    "type": concept["category"],
                    "value": term,
                    "negated": negated,
                    "source": "keyword",
                    "confidence": 0.85,
                    "concept_id": concept["id"],
                    "weight": concept["weight"],
                }
            )

    return found


# ---------------------------------------------------------------------------
# API publique
# ---------------------------------------------------------------------------

def extract_entities(text: str) -> dict:
    """
    Retourne :
        {
          "language": "en" | "fr" | "ar" | ...,
          "used_clinical_model": bool,   # True si medspaCy a tourné
          "entities": [
            {"type", "value", "negated", "source", "confidence",
             "concept_id", "weight"},
            ...
          ],
        }
    "weight" et "concept_id" sont utilisés directement par risk_scoring.py
    pour calculer le score — c'est le lien qui manquait avant : le score
    consomme maintenant ce que le NLP a réellement extrait, plus une
    recherche de mots-clés séparée.
    """
    language = detect_language(text)
    entities: list[dict] = []
    matched_terms: set[str] = set()

    clinical_nlp = _get_clinical_nlp() if language == "en" else None

    if clinical_nlp is not None:
        doc = clinical_nlp(text)
        for ent in doc.ents:
            concept = ALL_TERMS_INDEX.get(ent.text.lower())
            negated = bool(getattr(ent._, "is_negated", False))
            entities.append(
                {
                    "type": ent.label_.lower(),
                    "value": ent.text,
                    "negated": negated,
                    "source": "medspacy",
                    "confidence": 0.9,
                    "concept_id": concept["id"] if concept else None,
                    "weight": concept["weight"] if concept else 0,
                }
            )
            matched_terms.add(ent.text.lower())

    # Mots-clés multilingues : couvrent FR/AR toujours, et EN quand medspaCy
    # est indisponible OU pour du vocabulaire patient informel que les
    # Target Rules ne couvrent pas mot pour mot.
    for kw in _extract_keywords_with_negation(text):
        if kw["value"] in matched_terms:
            continue  # déjà trouvé par medspaCy, on évite le doublon
        entities.append(kw)
        matched_terms.add(kw["value"])

    # Entités génériques (dates, noms...) — informationnel, jamais utilisées
    # dans le score de risque.
    generic_nlp = _get_nlp()
    if generic_nlp is not None:
        for ent in generic_nlp(text).ents:
            entities.append(
                {
                    "type": f"generic:{ent.label_.lower()}",
                    "value": ent.text,
                    "negated": False,
                    "source": "spacy",
                    "confidence": 0.6,
                    "concept_id": None,
                    "weight": 0,
                }
            )

    return {
        "language": language,
        "used_clinical_model": clinical_nlp is not None,
        "entities": entities,
    }


def summarize_patient(text: str) -> dict:
    """Résumé simple pour le MVP."""
    result = extract_entities(text)
    active = [e for e in result["entities"] if not e["negated"] and not e["type"].startswith("generic:")]

    return {
        "summary": text[:250],
        "language": result["language"],
        "symptoms": [e["value"] for e in active if e["type"] == "symptom"],
        "diseases": [e["value"] for e in active if e["type"] == "disease"],
        "medications": [e["value"] for e in active if e["type"] == "medication"],
        "allergies": [e["value"] for e in active if e["type"] == "allergy"],
    }


def persist_entities(db, intake_id: str, nlp_result: dict) -> list:
    """
    Persiste les entités cliniques (pas les génériques) d'un résultat déjà
    calculé par extract_entities() dans ExtractedEntity. Retourne la liste
    des objets créés (non commités — l'appelant fait db.commit()).
    """
    # Import local pour éviter tout risque de cycle d'import au chargement du module.
    from app.models.extracted_entity import ExtractedEntity

    created: list[ExtractedEntity] = []
    seen: set[tuple[str, str]] = set()

    for ent in nlp_result["entities"]:
        if ent["type"].startswith("generic:"):
            continue
        dedup_key = (ent["type"], ent["value"].lower())
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        row = ExtractedEntity(
            intake_id=intake_id,
            entity_type=ent["type"],
            entity_value=ent["value"],
            confidence=ent["confidence"],
            negated=ent["negated"],
        )
        db.add(row)
        created.append(row)

    return created


def extract_and_persist_entities(db, intake_id: str, text: str) -> list:
    """Wrapper pratique = extract_entities() + persist_entities() en un
    appel, pour un usage ponctuel hors du pipeline principal d'admission."""
    result = extract_entities(text)
    return persist_entities(db, intake_id, result)