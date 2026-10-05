"""
Tests unitaires de la détection de négation multilingue
(app/services/clinical_vocabulary.py) — couvre les edge cases signalés
comme point faible dans le feedback XelerondAI (point 3 : dépendance à un
mécanisme de fenêtre de mots, pas un vrai NER pour FR/AR).

Ces tests documentent précisément les LIMITES connues du mécanisme actuel
(à citer dans le rapport comme limitation assumée), en plus de valider son
comportement correct sur les cas simples.

Lancer : pytest tests/test_negation.py -v
"""
import pytest

from app.services.clinical_vocabulary import is_negated, split_sentences, NEGATION_CUES


class TestNegationEnglish:
    def test_simple_negation_detected(self):
        sentence = "the patient denies chest pain"
        idx = sentence.find("chest pain")
        assert is_negated(sentence, idx, NEGATION_CUES) is True

    def test_no_negation_when_absent(self):
        sentence = "the patient reports chest pain"
        idx = sentence.find("chest pain")
        assert is_negated(sentence, idx, NEGATION_CUES) is False

    def test_negation_stops_at_clause_break_but(self):
        """'but' doit fermer la portée de la négation précédente — un
        symptôme après 'but' ne doit PAS être considéré comme nié."""
        sentence = "no fever but severe chest pain"
        idx = sentence.find("chest pain")
        assert is_negated(sentence, idx, NEGATION_CUES) is False

    def test_negation_stops_at_comma(self):
        sentence = "denies nausea, reports fatigue"
        idx = sentence.find("fatigue")
        assert is_negated(sentence, idx, NEGATION_CUES) is False


class TestNegationFrench:
    def test_pas_de_detected(self):
        sentence = "le patient ne présente pas de douleur thoracique"
        idx = sentence.find("douleur thoracique")
        assert is_negated(sentence, idx, NEGATION_CUES) is True

    def test_sans_detected(self):
        sentence = "présentation sans fièvre"
        idx = sentence.find("fièvre")
        assert is_negated(sentence, idx, NEGATION_CUES) is True

    def test_negation_stops_at_mais(self):
        sentence = "pas de fièvre mais toux persistante"
        idx = sentence.find("toux")
        assert is_negated(sentence, idx, NEGATION_CUES) is False


class TestNegationKnownLimitations:
    """
    Ces tests DOCUMENTENT des limites connues du mécanisme actuel — ils ne
    valident pas un comportement idéal, mais servent de trace explicite
    pour le rapport (point 3 du feedback) : le mécanisme par fenêtre de
    mots n'est pas un vrai NER multilingue et peut échouer sur des
    formulations plus complexes qu'un NER entraîné gérerait correctement.
    """

    def test_LIMITATION_negation_beyond_window_is_missed(self):
        """Si la négation est trop loin du mot-clé (au-delà de la fenêtre
        de _NEGATION_WINDOW_CHARS), elle n'est plus détectée. C'est une
        limite structurelle du mécanisme par fenêtre fixe, documentée ici
        plutôt que cachée."""
        far_negation = "no" + " filler word" * 10 + " chest pain"
        idx = far_negation.find("chest pain")
        # Ce test échoue intentionnellement si la fenêtre est un jour
        # agrandie suffisamment pour couvrir ce cas — à surveiller.
        result = is_negated(far_negation, idx, NEGATION_CUES)
        assert result is False  # comportement ACTUEL, pas souhaitable cliniquement

    def test_LIMITATION_double_negation_not_handled(self):
        """'not without chest pain' (double négation, rare mais possible en
        anglais familier) est traité comme nié par le mécanisme actuel,
        ce qui est cliniquement incorrect. Un vrai NER contextuel (type
        ConText, déjà utilisé côté anglais via medspaCy) gérerait mieux ce
        cas — raison pour laquelle le pipeline anglais est plus fiable que
        FR/AR actuellement."""
        sentence = "not without chest pain"
        idx = sentence.find("chest pain")
        result = is_negated(sentence, idx, NEGATION_CUES)
        assert result is True  # comportement ACTUEL (faux positif clinique)


class TestSentenceSplitting:
    def test_splits_on_period(self):
        text = "No fever. Severe chest pain reported."
        sentences = split_sentences(text)
        assert len(sentences) == 2

    def test_splits_on_multiple_delimiters(self):
        text = "Chest pain; shortness of breath! Dizziness?"
        sentences = split_sentences(text)
        assert len(sentences) == 3


class TestFieldConcatenationBoundary:
    """
    Régression pour un bug réel trouvé en test manuel : sans frontière de
    phrase explicite entre symptoms_text et medical_history, un
    symptoms_text ne se terminant pas par un point fusionnait avec le champ
    suivant, étendant à tort la portée d'une négation ("no cough") jusqu'à
    des termes du champ medical_history ("hypertension", "heart attack").
    """

    @staticmethod
    def _build_nlp_text(symptoms_text: str, medical_history):
        parts = [symptoms_text.strip().rstrip(".")]
        if medical_history and medical_history.strip():
            parts.append(medical_history.strip().rstrip("."))
        return ". ".join(parts) + "."

    def test_missing_period_no_longer_leaks_negation(self):
        text = self._build_nlp_text(
            "No fever and no cough",
            "History of hypertension",
        )
        sentences = split_sentences(text.lower())
        assert len(sentences) == 2  # bien deux phrases distinctes désormais

        idx = sentences[1].find("hypertension")
        assert is_negated(sentences[1], idx, NEGATION_CUES) is False

    def test_empty_medical_history_handled(self):
        text = self._build_nlp_text("Chest pain", "")
        assert text == "Chest pain."

    def test_none_medical_history_handled(self):
        text = self._build_nlp_text("Chest pain", None)
        assert text == "Chest pain."