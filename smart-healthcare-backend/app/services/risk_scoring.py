from app.models.risk_assessment import RiskLevel

SYMPTOM_KEYWORDS: dict[str, tuple[str, int]] = {
    "chest pain": ("Chest pain reported", 35),
    "douleur thoracique": ("Chest pain reported", 35),
    "shortness of breath": ("Shortness of breath", 30),
    "essoufflement": ("Shortness of breath", 30),
    "difficulté à respirer": ("Difficulty breathing", 30),
    "difficulty breathing": ("Difficulty breathing", 30),
    "confusion": ("Confusion", 25),
    "bleeding": ("Bleeding", 25),
    "saignement": ("Bleeding", 25),
    "fainting": ("Fainting / loss of consciousness", 30),
    "évanouissement": ("Fainting / loss of consciousness", 30),
    "fatigue": ("Fatigue", 5),
    "faiblesse": ("Weakness", 8),
    "headache": ("Headache", 5),
    "mal de tête": ("Headache", 5),
}


def score_to_level(score: int) -> RiskLevel:
    if score >= 70:
        return RiskLevel.critical
    if score >= 40:
        return RiskLevel.high
    if score >= 15:
        return RiskLevel.medium
    return RiskLevel.low


def compute_risk(
    symptoms_text: str,
    medical_history: str = "",
    temperature: float | None = None,
    heart_rate: int | None = None,
    oxygen_saturation: float | None = None,
    blood_pressure: str | None = None,
) -> dict:
    text = f"{symptoms_text} {medical_history}".lower()
    factors: list[str] = []
    score = 0

    for keyword, (label, weight) in SYMPTOM_KEYWORDS.items():
        if keyword in text:
            factors.append(f"{label} (+{weight})")
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