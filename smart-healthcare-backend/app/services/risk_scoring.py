"""
Calcul du score de risque à partir des entités déjà extraites par
nlp_service.extract_entities().

Le score dépend réellement de ce que le NLP a trouvé et des constantes
vitales fournies.

--------------------------------------------------------------------------
Alignement clinique (v2 — suite au feedback XelerondAI)
--------------------------------------------------------------------------

Les seuils des constantes vitales sont dérivés du NEWS2
(National Early Warning Score 2), publié par le Royal College of Physicians.

IMPORTANT :
- Ce système n'implémente PAS un NEWS2 complet.
- Le NEWS2 complet utilise également la fréquence respiratoire,
  le niveau de conscience/confusion et le besoin en oxygène supplémentaire.
- Ici, seules les constantes actuellement disponibles dans le formulaire
  sont utilisées.
- Les scores NEWS2 (0-3) sont convertis en poids internes (score × 10)
  afin de les intégrer à notre propre échelle de risque 0-100.
- Les symptômes et antécédents utilisent les poids du vocabulaire clinique
  interne (clinical_vocabulary.py).

--------------------------------------------------------------------------
Assessment confidence
--------------------------------------------------------------------------

La confiance est dynamique.

Elle ne représente PAS la probabilité que le diagnostic soit correct.

Elle représente la qualité/completude des informations utilisées par
le moteur de risque :

    - complétude des constantes vitales
    - validité des constantes fournies
    - quantité d'informations cliniques extraites par le NLP
    - diversité des concepts cliniques détectés
    - gestion des informations négatives

La valeur est plafonnée à 95 % afin de ne jamais présenter l'évaluation
comme une certitude clinique.
"""

from app.models.risk_assessment import RiskLevel


# ============================================================================
# RISK LEVEL
# ============================================================================

def score_to_level(score: int) -> RiskLevel:
    """
    Convertit le score numérique en niveau de risque.
    """

    if score >= 70:
        return RiskLevel.critical

    if score >= 40:
        return RiskLevel.high

    if score >= 15:
        return RiskLevel.medium

    return RiskLevel.low


# ============================================================================
# NEWS2 - TEMPERATURE
# ============================================================================

def _news2_temperature(temp: float) -> tuple[int, str]:
    """
    NEWS2 temperature scoring.

    Retourne :
        (NEWS2 sub-score, explanation)
    """

    if temp <= 35.0:
        return (
            3,
            f"Temperature {temp}°C (NEWS2 band ≤35.0, +30)"
        )

    if temp <= 36.0:
        return (
            1,
            f"Temperature {temp}°C (NEWS2 band 35.1-36.0, +10)"
        )

    if temp <= 38.0:
        return 0, ""

    if temp <= 39.0:
        return (
            1,
            f"Temperature {temp}°C (NEWS2 band 38.1-39.0, +10)"
        )

    return (
        2,
        f"Temperature {temp}°C (NEWS2 band ≥39.1, +20)"
    )


# ============================================================================
# NEWS2 - HEART RATE
# ============================================================================

def _news2_heart_rate(hr: int) -> tuple[int, str]:
    """
    NEWS2 heart-rate scoring.
    """

    if hr <= 40:
        return (
            3,
            f"Heart rate {hr} bpm (NEWS2 band ≤40, +30)"
        )

    if hr <= 50:
        return (
            1,
            f"Heart rate {hr} bpm (NEWS2 band 41-50, +10)"
        )

    if hr <= 90:
        return 0, ""

    if hr <= 110:
        return (
            1,
            f"Heart rate {hr} bpm (NEWS2 band 91-110, +10)"
        )

    if hr <= 130:
        return (
            2,
            f"Heart rate {hr} bpm (NEWS2 band 111-130, +20)"
        )

    return (
        3,
        f"Heart rate {hr} bpm (NEWS2 band ≥131, +30)"
    )


# ============================================================================
# NEWS2 - OXYGEN SATURATION
# ============================================================================

def _news2_oxygen_saturation(spo2: float) -> tuple[int, str]:
    """
    NEWS2 SpO2 Scale 1.

    Cette implémentation utilise l'échelle 1 pour les patients sans
    distinction BPCO / hypercapnic respiratory failure.

    IMPORTANT :
    L'échelle 2 de NEWS2 n'est pas implémentée ici car le formulaire
    actuel ne permet pas d'identifier les patients pour lesquels elle
    serait indiquée.
    """

    if spo2 <= 91:
        return (
            3,
            f"Low oxygen saturation {spo2}% (NEWS2 band ≤91, +30)"
        )

    if spo2 <= 93:
        return (
            2,
            f"Low oxygen saturation {spo2}% (NEWS2 band 92-93, +20)"
        )

    if spo2 <= 95:
        return (
            1,
            f"Low oxygen saturation {spo2}% (NEWS2 band 94-95, +10)"
        )

    return 0, ""


# ============================================================================
# NEWS2 - SYSTOLIC BLOOD PRESSURE
# ============================================================================

def _news2_systolic_bp(systolic: int) -> tuple[int, str]:
    """
    NEWS2 systolic blood pressure scoring.
    """

    if systolic <= 90:
        return (
            3,
            f"Low systolic BP {systolic} (NEWS2 band ≤90, +30)"
        )

    if systolic <= 100:
        return (
            2,
            f"Low systolic BP {systolic} (NEWS2 band 91-100, +20)"
        )

    if systolic <= 110:
        return (
            1,
            f"Low systolic BP {systolic} (NEWS2 band 101-110, +10)"
        )

    if systolic <= 219:
        return 0, ""

    return (
        3,
        f"High systolic BP {systolic} (NEWS2 band ≥220, +30)"
    )


# ============================================================================
# VITAL SIGNS
# ============================================================================

VITAL_FIELDS = (
    "temperature",
    "heart_rate",
    "oxygen_saturation",
    "blood_pressure",
)


# ============================================================================
# DYNAMIC ASSESSMENT CONFIDENCE
# ============================================================================

def _compute_confidence(
    entities: list[dict],
    temperature: float | None,
    heart_rate: int | None,
    oxygen_saturation: float | None,
    blood_pressure: str | None,
) -> float:
    """
    Calcule dynamiquement la confiance de l'évaluation.

    ATTENTION :
    Cette valeur ne représente PAS une probabilité de diagnostic.

    Elle représente la qualité et la complétude des données disponibles
    pour le moteur de risque.

    Facteurs utilisés :

        45% -> complétude des constantes vitales
        20% -> validité des constantes fournies
        20% -> informations cliniques extraites par NLP
        10% -> diversité des concepts cliniques
         5% -> qualité de la gestion des négations

    Résultat :
        float entre 0.0 et 0.95
    """

    # ------------------------------------------------------------------------
    # 1. Complétude des constantes vitales
    # ------------------------------------------------------------------------

    vital_values = {
        "temperature": temperature,
        "heart_rate": heart_rate,
        "oxygen_saturation": oxygen_saturation,
        "blood_pressure": blood_pressure,
    }

    provided_vitals = 0

    for value in vital_values.values():

        if value is not None and value != "":
            provided_vitals += 1

    total_vitals = len(vital_values)

    vital_completeness = provided_vitals / total_vitals

    # ------------------------------------------------------------------------
    # 2. Validité des constantes fournies
    # ------------------------------------------------------------------------

    valid_vitals = 0
    total_provided = 0

    # Temperature
    if temperature is not None:

        total_provided += 1

        if 25 <= temperature <= 45:
            valid_vitals += 1

    # Heart rate
    if heart_rate is not None:

        total_provided += 1

        if 20 <= heart_rate <= 250:
            valid_vitals += 1

    # Oxygen saturation
    if oxygen_saturation is not None:

        total_provided += 1

        if 50 <= oxygen_saturation <= 100:
            valid_vitals += 1

    # Blood pressure
    if blood_pressure:

        total_provided += 1

        try:

            systolic_str, diastolic_str = blood_pressure.split("/")

            systolic = int(systolic_str)
            diastolic = int(diastolic_str)

            if (
                40 <= systolic <= 300
                and
                20 <= diastolic <= 200
            ):
                valid_vitals += 1

        except (ValueError, AttributeError):
            pass

    if total_provided > 0:

        vital_quality = valid_vitals / total_provided

    else:

        vital_quality = 0.0

    # ------------------------------------------------------------------------
    # 3. Qualité des entités NLP
    # ------------------------------------------------------------------------

    valid_entities = [
        entity
        for entity in entities
        if (
            entity.get("concept_id")
            and entity.get("value")
            and not entity.get("negated")
        )
    ]

    negated_entities = [
        entity
        for entity in entities
        if entity.get("negated")
    ]

    # Plus il y a d'informations cliniques pertinentes,
    # plus la confiance augmente.

    if len(valid_entities) == 0:

        nlp_score = 0.0

    elif len(valid_entities) == 1:

        nlp_score = 0.5

    else:

        nlp_score = 1.0

    # ------------------------------------------------------------------------
    # 4. Diversité des concepts NLP
    # ------------------------------------------------------------------------

    unique_concepts = {
        entity.get("concept_id")
        for entity in valid_entities
        if entity.get("concept_id")
    }

    if len(unique_concepts) >= 3:

        diversity_score = 1.0

    elif len(unique_concepts) == 2:

        diversity_score = 0.75

    elif len(unique_concepts) == 1:

        diversity_score = 0.5

    else:

        diversity_score = 0.0

    # ------------------------------------------------------------------------
    # 5. Gestion des négations
    # ------------------------------------------------------------------------

    if len(negated_entities) == 0:

        negation_quality = 1.0

    elif len(negated_entities) <= 2:

        negation_quality = 0.9

    else:

        negation_quality = 0.8

    # ------------------------------------------------------------------------
    # 6. Calcul final
    # ------------------------------------------------------------------------

    confidence = (
        vital_completeness * 0.45
        +
        vital_quality * 0.20
        +
        nlp_score * 0.20
        +
        diversity_score * 0.10
        +
        negation_quality * 0.05
    )

    # ------------------------------------------------------------------------
    # 7. Limite maximale
    # ------------------------------------------------------------------------

    # On ne présente jamais l'évaluation comme une certitude clinique.

    confidence = min(confidence, 0.95)

    return round(confidence, 2)


# ============================================================================
# MAIN RISK ENGINE
# ============================================================================

def compute_risk(
    entities: list[dict],
    temperature: float | None = None,
    heart_rate: int | None = None,
    oxygen_saturation: float | None = None,
    blood_pressure: str | None = None,
) -> dict:
    """
    Calcule le risque à partir :

        - des entités NLP
        - de la température
        - de la fréquence cardiaque
        - de la saturation O2
        - de la pression artérielle

    Retourne :

        {
            "score": int,
            "level": RiskLevel,
            "explanation": str,
            "confidence": float
        }
    """

    factors: list[str] = []

    score = 0

    counted_concepts: set[str] = set()

    # ========================================================================
    # 1. NLP ENTITIES
    # ========================================================================

    for ent in entities:

        weight = ent.get("weight") or 0

        # Ignorer :
        # - les concepts niés
        # - les concepts sans poids positif

        if ent.get("negated") or weight <= 0:
            continue

        concept_id = ent.get("concept_id")

        # Éviter de compter deux fois le même concept.

        if concept_id:

            if concept_id in counted_concepts:
                continue

            counted_concepts.add(concept_id)

        factors.append(
            f"{ent['value']} (+{weight})"
        )

        score += weight

    # ========================================================================
    # 2. TEMPERATURE - NEWS2
    # ========================================================================

    if temperature is not None:

        sub_score, label = _news2_temperature(temperature)

        if label:

            factors.append(label)

            score += sub_score * 10

    # ========================================================================
    # 3. HEART RATE - NEWS2
    # ========================================================================

    if heart_rate is not None:

        sub_score, label = _news2_heart_rate(heart_rate)

        if label:

            factors.append(label)

            score += sub_score * 10

    # ========================================================================
    # 4. OXYGEN SATURATION - NEWS2
    # ========================================================================

    if oxygen_saturation is not None:

        sub_score, label = _news2_oxygen_saturation(
            oxygen_saturation
        )

        if label:

            factors.append(label)

            score += sub_score * 10

    # ========================================================================
    # 5. BLOOD PRESSURE - NEWS2
    # ========================================================================

    if blood_pressure:

        try:

            systolic_str, _diastolic_str = blood_pressure.split("/")

            systolic = int(systolic_str)

            sub_score, label = _news2_systolic_bp(
                systolic
            )

            if label:

                factors.append(label)

                score += sub_score * 10

        except (ValueError, AttributeError):

            # Pression artérielle invalide :
            # elle n'est pas ajoutée au score.

            pass

    # ========================================================================
    # 6. CAP SCORE
    # ========================================================================

    # Le score final reste sur une échelle de 0 à 100.

    score = min(score, 100)

    # ========================================================================
    # 7. EXPLANATION
    # ========================================================================

    if factors:

        explanation = "; ".join(factors)

    else:

        explanation = (
            "No significant risk factors identified."
        )

    # ========================================================================
    # 8. DYNAMIC CONFIDENCE
    # ========================================================================

    confidence = _compute_confidence(
        entities=entities,
        temperature=temperature,
        heart_rate=heart_rate,
        oxygen_saturation=oxygen_saturation,
        blood_pressure=blood_pressure,
    )

    # ========================================================================
    # 9. FINAL RESULT
    # ========================================================================

    return {
        "score": score,
        "level": score_to_level(score),
        "explanation": explanation,
        "confidence": confidence,
    }