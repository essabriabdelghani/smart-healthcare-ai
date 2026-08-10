"""
Calcul du score de risque à partir des entités déjà extraites par
nlp_service.extract_entities() — plus de recherche de mots-clés séparée ici :
le score dépend réellement de ce que le NLP a trouvé (voir clinical_vocabulary.py
pour la source des poids), pas d'une logique dupliquée et désynchronisée.
"""

from app.models.risk_assessment import RiskLevel


def score_to_level(score: int) -> RiskLevel:
    if score >= 70:
        return RiskLevel.critical
    if score >= 40:
        return RiskLevel.high
    if score >= 15:
        return RiskLevel.medium
    return RiskLevel.low


def compute_risk(
    entities: list[dict],
    temperature: float | None = None,
    heart_rate: int | None = None,
    oxygen_saturation: float | None = None,
    blood_pressure: str | None = None,
) -> dict:
    """
    entities : la liste "entities" renvoyée par nlp_service.extract_entities()
    — chaque élément a "value", "negated", "concept_id", "weight".
    """
    factors: list[str] = []
    score = 0
    counted_concepts: set[str] = set()

    for ent in entities:
        weight = ent.get("weight") or 0
        if ent.get("negated") or weight <= 0:
            continue  # nié par le patient, ou concept purement informationnel (médicament/allergie)

        concept_id = ent.get("concept_id")
        if concept_id:
            if concept_id in counted_concepts:
                continue  # déjà compté (ex: medspaCy ET mots-clés ont trouvé la même chose)
            counted_concepts.add(concept_id)

        factors.append(f"{ent['value']} (+{weight})")
        score += weight

    if temperature is not None and temperature >= 38.5:
        factors.append(f"High fever {temperature}°C (+20)")
        score += 20

    if heart_rate is not None and (heart_rate > 120 or heart_rate < 50):
        factors.append(f"Abnormal heart rate {heart_rate} bpm (+20)")
        score += 20

    if oxygen_saturation is not None and oxygen_saturation < 94:
        factors.append(f"Low oxygen saturation {oxygen_saturation}% (+30)")
        score += 30

    if blood_pressure:
        try:
            systolic_str, diastolic_str = blood_pressure.split("/")
            systolic, diastolic = int(systolic_str), int(diastolic_str)
            if systolic >= 160 or diastolic >= 100:
                factors.append(f"High blood pressure {blood_pressure} (+20)")
                score += 20
            elif systolic < 90 or diastolic < 60:
                factors.append(f"Low blood pressure {blood_pressure} (+15)")
                score += 15
        except (ValueError, AttributeError):
            pass

    score = min(score, 100)
    explanation = "; ".join(factors) if factors else "No significant risk factors identified."
    confidence = 0.6 if factors else 0.35

    return {"score": score, "level": score_to_level(score), "explanation": explanation, "confidence": confidence}