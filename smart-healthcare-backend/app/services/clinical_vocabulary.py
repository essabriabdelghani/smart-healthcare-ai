"""
Source unique de vérité pour le vocabulaire clinique : chaque concept a un id
stable, une catégorie, un poids (contribution au score de risque) et ses
variantes EN/FR/AR. nlp_service.py (extraction) et risk_scoring.py (score)
lisent tous les deux CE fichier — plus de dictionnaires dupliqués et
désynchronisés entre l'extraction NLP et le calcul du score.
"""

import re

CONCEPTS: list[dict] = [
    # ---- Symptômes (principaux moteurs du score) ----
    {"id": "chest_pain", "category": "symptom", "weight": 35,
     "terms": {"en": ["chest pain"], "fr": ["douleur thoracique"], "ar": ["ألم في الصدر"]}},
    {"id": "shortness_of_breath", "category": "symptom", "weight": 30,
     "terms": {"en": ["shortness of breath"], "fr": ["essoufflement"], "ar": ["ضيق في التنفس"]}},
    {"id": "difficulty_breathing", "category": "symptom", "weight": 30,
     "terms": {"en": ["difficulty breathing"], "fr": ["difficulté à respirer"], "ar": ["صعوبة في التنفس"]}},
    {"id": "fainting", "category": "symptom", "weight": 30,
     "terms": {"en": ["fainting", "loss of consciousness"], "fr": ["évanouissement", "perte de connaissance"], "ar": ["إغماء"]}},
    {"id": "confusion", "category": "symptom", "weight": 25,
     "terms": {"en": ["confusion"], "fr": ["confusion"], "ar": ["ارتباك"]}},
    {"id": "bleeding", "category": "symptom", "weight": 25,
     "terms": {"en": ["bleeding"], "fr": ["saignement"], "ar": ["نزيف"]}},
    {"id": "high_fever", "category": "symptom", "weight": 20,
     "terms": {"en": ["high fever"], "fr": ["fièvre élevée"], "ar": ["حمى شديدة"]}},
    {"id": "severe_headache", "category": "symptom", "weight": 20,
     "terms": {"en": ["severe headache"], "fr": ["mal de tête sévère"], "ar": ["صداع شديد"]}},
    {"id": "abdominal_pain", "category": "symptom", "weight": 15,
     "terms": {"en": ["abdominal pain"], "fr": ["douleur abdominale"], "ar": ["ألم في البطن"]}},
    {"id": "fever", "category": "symptom", "weight": 10,
     "terms": {"en": ["fever"], "fr": ["fièvre"], "ar": ["حمى"]}},
    {"id": "dizziness", "category": "symptom", "weight": 10,
     "terms": {"en": ["dizziness"], "fr": ["vertiges"], "ar": ["دوخة"]}},
    {"id": "vomiting", "category": "symptom", "weight": 10,
     "terms": {"en": ["vomiting"], "fr": ["vomissements"], "ar": ["قيء"]}},
    {"id": "cough", "category": "symptom", "weight": 5,
     "terms": {"en": ["cough"], "fr": ["toux"], "ar": ["سعال"]}},
    {"id": "headache", "category": "symptom", "weight": 5,
     "terms": {"en": ["headache"], "fr": ["mal de tête"], "ar": ["صداع"]}},
    {"id": "fatigue", "category": "symptom", "weight": 5,
     "terms": {"en": ["fatigue"], "fr": ["fatigue"], "ar": ["إرهاق"]}},
    {"id": "nausea", "category": "symptom", "weight": 5,
     "terms": {"en": ["nausea"], "fr": ["nausée"], "ar": ["غثيان"]}},
    {"id": "diarrhea", "category": "symptom", "weight": 5,
     "terms": {"en": ["diarrhea"], "fr": ["diarrhée"], "ar": ["إسهال"]}},
    {"id": "back_pain", "category": "symptom", "weight": 5,
     "terms": {"en": ["back pain"], "fr": ["mal de dos"], "ar": ["ألم في الظهر"]}},
    {"id": "sore_throat", "category": "symptom", "weight": 3,
     "terms": {"en": ["sore throat"], "fr": ["mal de gorge"], "ar": ["التهاب الحلق"]}},

    # ---- Antécédents / maladies (comorbidités, poids réduit) ----
    {"id": "heart_attack_history", "category": "disease", "weight": 15,
     "terms": {"en": ["heart attack"], "fr": ["crise cardiaque"], "ar": ["نوبة قلبية"]}},
    {"id": "stroke_history", "category": "disease", "weight": 15,
     "terms": {"en": ["stroke"], "fr": ["avc"], "ar": ["سكتة دماغية"]}},
    {"id": "pneumonia", "category": "disease", "weight": 10,
     "terms": {"en": ["pneumonia"], "fr": ["pneumonie"], "ar": ["التهاب رئوي"]}},
    {"id": "cancer", "category": "disease", "weight": 10,
     "terms": {"en": ["cancer"], "fr": ["cancer"], "ar": ["سرطان"]}},
    {"id": "covid", "category": "disease", "weight": 10,
     "terms": {"en": ["covid", "covid-19"], "fr": ["covid", "covid-19"], "ar": ["كوفيد"]}},
    {"id": "diabetes", "category": "disease", "weight": 5,
     "terms": {"en": ["diabetes"], "fr": ["diabète"], "ar": ["السكري"]}},
    {"id": "hypertension", "category": "disease", "weight": 5,
     "terms": {"en": ["hypertension"], "fr": ["hypertension"], "ar": ["ارتفاع ضغط الدم"]}},
    {"id": "asthma", "category": "disease", "weight": 5,
     "terms": {"en": ["asthma"], "fr": ["asthme"], "ar": ["الربو"]}},

    # ---- Médicaments / allergies : informationnel, ne pèse pas sur le score ----
    {"id": "paracetamol", "category": "medication", "weight": 0,
     "terms": {"en": ["paracetamol"], "fr": ["paracétamol"], "ar": ["باراسيتامول"]}},
    {"id": "ibuprofen", "category": "medication", "weight": 0,
     "terms": {"en": ["ibuprofen"], "fr": ["ibuprofène"], "ar": []}},
    {"id": "aspirin", "category": "medication", "weight": 0,
     "terms": {"en": ["aspirin"], "fr": ["aspirine"], "ar": []}},
    {"id": "metformin", "category": "medication", "weight": 0,
     "terms": {"en": ["metformin"], "fr": ["metformine"], "ar": []}},
    {"id": "insulin", "category": "medication", "weight": 0,
     "terms": {"en": ["insulin"], "fr": ["insuline"], "ar": ["الأنسولين"]}},
    {"id": "amoxicillin", "category": "medication", "weight": 0,
     "terms": {"en": ["amoxicillin"], "fr": ["amoxicilline"], "ar": []}},

    {"id": "penicillin_allergy", "category": "allergy", "weight": 0,
     "terms": {"en": ["penicillin"], "fr": ["pénicilline"], "ar": ["البنسلين"]}},
    {"id": "peanut_allergy", "category": "allergy", "weight": 0,
     "terms": {"en": ["peanuts"], "fr": ["arachides"], "ar": ["الفول السوداني"]}},
    {"id": "latex_allergy", "category": "allergy", "weight": 0,
     "terms": {"en": ["latex"], "fr": ["latex"], "ar": []}},
    {"id": "dust_allergy", "category": "allergy", "weight": 0,
     "terms": {"en": ["dust"], "fr": ["poussière"], "ar": ["الغبار"]}},
    {"id": "milk_allergy", "category": "allergy", "weight": 0,
     "terms": {"en": ["milk"], "fr": ["lait"], "ar": ["الحليب"]}},
]

CONCEPT_BY_ID: dict[str, dict] = {c["id"]: c for c in CONCEPTS}

# Index de recherche : terme (minuscule) -> concept. Couvre les 3 langues.
ALL_TERMS_INDEX: dict[str, dict] = {}
for _concept in CONCEPTS:
    for _lang, _terms in _concept["terms"].items():
        for _term in _terms:
            ALL_TERMS_INDEX[_term.lower()] = _concept

# Termes anglais uniquement, pour construire les Target Rules medspaCy.
ENGLISH_TERMS: list[tuple[str, dict]] = [
    (term, concept) for concept in CONCEPTS for term in concept["terms"].get("en", [])
]

# ---------------------------------------------------------------------------
# Négation multilingue par fenêtre de mots (utilisée pour FR/AR, et comme
# repli EN si medspaCy n'est pas disponible).
# ---------------------------------------------------------------------------

NEGATION_CUES: list[str] = [
    "no", "not", "denies", "denied", "without", "negative for", "ruled out", "absence of",
    "pas de", "aucun", "aucune", "sans", "absence de", "ne présente pas", "n'a pas",
    "لا يوجد", "بدون", "ينفي", "لا يعاني من",
]

_CLAUSE_BREAKS = [",", " but ", " mais ", " however ", " cependant ", "، لكن", " لكن "]
_NEGATION_WINDOW_CHARS = 40


def split_sentences(text: str) -> list[str]:
    return re.split(r"[.!?;\n]+", text)


def is_negated(sentence: str, keyword_start: int, cues: list[str]) -> bool:
    """Vrai si une négation précède le mot-clé dans une fenêtre proche, au
    sein de la même proposition (s'arrête sur virgule/mais/but/لكن)."""
    window_start = max(0, keyword_start - _NEGATION_WINDOW_CHARS)
    window = sentence[window_start:keyword_start]

    last_break = -1
    for brk in _CLAUSE_BREAKS:
        pos = window.rfind(brk)
        if pos > last_break:
            last_break = pos + len(brk)
    if last_break != -1:
        window = window[last_break:]

    return any(cue in window for cue in cues)