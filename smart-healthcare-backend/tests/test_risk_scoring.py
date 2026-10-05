"""
Tests unitaires du moteur de risque — couvre spécifiquement les points
soulevés dans le feedback XelerondAI : plafonnement du score, alignement
NEWS2, et confiance du modèle (formule à 5 facteurs, plus une constante).

Lancer : pytest tests/test_risk_scoring.py -v
"""
import pytest

from app.services.risk_scoring import compute_risk, score_to_level
from app.models.risk_assessment import RiskLevel


class TestScoreCapping:
    def test_score_never_exceeds_100(self):
        entities = [
            {"value": "chest pain", "negated": False, "concept_id": "chest_pain", "weight": 35},
            {"value": "fainting", "negated": False, "concept_id": "fainting", "weight": 30},
            {"value": "bleeding", "negated": False, "concept_id": "bleeding", "weight": 25},
            {"value": "confusion", "negated": False, "concept_id": "confusion", "weight": 25},
        ]
        result = compute_risk(
            entities, temperature=40.0, heart_rate=150,
            oxygen_saturation=85.0, blood_pressure="250/130",
        )
        assert result["score"] <= 100

    def test_score_never_negative(self):
        result = compute_risk([])
        assert result["score"] >= 0

    @pytest.mark.parametrize("score,expected_level", [
        (0, RiskLevel.low), (14, RiskLevel.low),
        (15, RiskLevel.medium), (39, RiskLevel.medium),
        (40, RiskLevel.high), (69, RiskLevel.high),
        (70, RiskLevel.critical), (100, RiskLevel.critical),
    ])
    def test_score_to_level_boundaries(self, score, expected_level):
        assert score_to_level(score) == expected_level


class TestDeduplication:
    def test_same_concept_counted_once(self):
        """Un même concept trouvé par medspaCy ET par mots-clés ne doit
        être compté qu'une seule fois dans le score."""
        entities = [
            {"value": "chest pain", "negated": False, "concept_id": "chest_pain", "weight": 35, "source": "medspacy"},
            {"value": "chest pain", "negated": False, "concept_id": "chest_pain", "weight": 35, "source": "keyword"},
        ]
        result = compute_risk(entities)
        assert result["score"] == 35  # pas 70


class TestNegationExclusion:
    def test_negated_entity_excluded_from_score(self):
        entities = [
            {"value": "chest pain", "negated": True, "concept_id": "chest_pain", "weight": 35},
        ]
        result = compute_risk(entities)
        assert result["score"] == 0
        assert "chest pain" not in result["explanation"]

    def test_mixed_negated_and_present(self):
        entities = [
            {"value": "chest pain", "negated": True, "concept_id": "chest_pain", "weight": 35},
            {"value": "fever", "negated": False, "concept_id": "fever", "weight": 10},
        ]
        result = compute_risk(entities)
        assert result["score"] == 10

    def test_zero_weight_entity_excluded(self):
        """Médicaments/allergies (poids 0) ne doivent jamais contribuer au score."""
        entities = [
            {"value": "paracetamol", "negated": False, "concept_id": "paracetamol", "weight": 0},
        ]
        result = compute_risk(entities)
        assert result["score"] == 0


class TestNEWS2Vitals:
    def test_normal_vitals_contribute_zero(self):
        result = compute_risk([], temperature=37.0, heart_rate=75, oxygen_saturation=98.0, blood_pressure="120/80")
        assert result["score"] == 0

    def test_critical_oxygen_saturation(self):
        result = compute_risk([], oxygen_saturation=88.0)
        assert result["score"] == 30
        assert "NEWS2" in result["explanation"]

    def test_low_systolic_bp_flagged(self):
        result = compute_risk([], blood_pressure="85/50")
        assert result["score"] == 30

    def test_malformed_blood_pressure_ignored_gracefully(self):
        """Une tension mal formée ne doit jamais faire planter le calcul."""
        result = compute_risk([], blood_pressure="not-a-bp")
        assert result["score"] == 0


class TestModelConfidence:
    """
    Formule v2 (5 facteurs pondérés) :
        45% vital_completeness  -- proportion des 4 vitaux renseignés
        20% vital_quality       -- proportion des vitaux renseignés dans une plage physiologique plausible
        20% nlp_score           -- 0 / 0.5 / 1.0 selon 0 / 1 / 2+ entités cliniques valides
        10% diversity_score     -- 0 / 0.5 / 0.75 / 1.0 selon le nombre de concepts distincts
         5% negation_quality    -- 1.0 / 0.9 / 0.8 selon le nombre d'entités niées
    Plafonnée à 0.95. Valeurs vérifiées par appel réel à compute_risk().
    """

    def test_confidence_baseline_with_no_data(self):
        """Aucune donnée -> seule la négation "parfaite" (0 négation) compte : 0.05."""
        result = compute_risk([])
        assert result["confidence"] == 0.05

    def test_confidence_increases_with_data_completeness(self):
        no_data = compute_risk([])
        partial_data = compute_risk([], temperature=37.0, heart_rate=75)
        full_data = compute_risk(
            [{"value": "fever", "negated": False, "concept_id": "fever", "weight": 10}],
            temperature=37.0, heart_rate=75, oxygen_saturation=98.0, blood_pressure="120/80",
        )
        assert no_data["confidence"] < partial_data["confidence"] < full_data["confidence"]
        assert no_data["confidence"] == 0.05
        assert partial_data["confidence"] == 0.48
        assert full_data["confidence"] == 0.85

    def test_confidence_never_exceeds_095(self):
        """Cas critique complet (5 entités dont 2 niées + 4 vitaux valides) :
        la somme pondérée dépasse 0.95, doit être plafonnée."""
        entities = [
            {"value": "chest pain", "negated": False, "concept_id": "chest_pain", "weight": 35},
            {"value": "shortness of breath", "negated": False, "concept_id": "shortness_of_breath", "weight": 30},
            {"value": "dizziness", "negated": False, "concept_id": "dizziness", "weight": 10},
            {"value": "hypertension", "negated": False, "concept_id": "hypertension", "weight": 5},
            {"value": "heart attack", "negated": False, "concept_id": "heart_attack_history", "weight": 15},
            {"value": "fever", "negated": True, "concept_id": "fever", "weight": 10},
            {"value": "cough", "negated": True, "concept_id": "cough", "weight": 5},
        ]
        result = compute_risk(
            entities, temperature=37.1, heart_rate=118,
            oxygen_saturation=90.5, blood_pressure="168/102",
        )
        assert result["confidence"] == 0.95
        assert result["confidence"] <= 0.95

    def test_invalid_vital_does_not_count_as_quality(self):
        """Une constante vitale hors plage physiologique plausible (ex:
        température de 200°C, erreur de saisie) est comptée dans la
        complétude, mais PAS dans la qualité — la confiance doit rester
        modeste malgré la présence apparente d'une donnée."""
        result = compute_risk([], temperature=200.0)
        assert result["confidence"] == 0.16

    def test_single_vs_multiple_entities_changes_nlp_score(self):
        """1 entité valide -> nlp_score=0.5 ; 2+ entités -> nlp_score=1.0 :
        la confiance doit strictement augmenter."""
        one_entity = compute_risk(
            [{"value": "fever", "negated": False, "concept_id": "fever", "weight": 10}]
        )
        two_entities = compute_risk([
            {"value": "fever", "negated": False, "concept_id": "fever", "weight": 10},
            {"value": "cough", "negated": False, "concept_id": "cough", "weight": 5},
        ])
        assert two_entities["confidence"] > one_entity["confidence"]