# medical_docs/ — Corpus de démarrage pour le RAG

## ⚠️ Statut de ce contenu

Ces 27 fichiers sont un **corpus de démarrage** (contenu médical général,
rédigé pour permettre de tester immédiatement le pipeline RAG de bout en
bout), **pas une source officielle citable en production**. Avant mise en
production réelle, remplace-les par du contenu sourcé officiellement via
`scripts/fetch_medlineplus.py` (API officielle MedlinePlus/NIH), des
documents internes de la clinique, ou des fact sheets de l'OMS.

Chaque fichier contient une ligne `Source:` en pied de page qui l'indique
explicitement — à mettre à jour dès que le contenu est remplacé par une
source officielle.

## Correspondance avec `clinical_vocabulary.py`

Chaque document couvre exactement un `concept_id` du vocabulaire clinique
existant, pour que l'Assistant IA puisse expliquer précisément les facteurs
que le Risk Engine utilise déjà.

| concept_id | Fichier | Catégorie (vocabulaire) |
|---|---|---|
| chest_pain | chest_pain.md | symptom (poids 35) |
| shortness_of_breath | shortness_of_breath.md | symptom (poids 30) |
| difficulty_breathing | difficulty_breathing.md | symptom (poids 30) |
| fainting | fainting.md | symptom (poids 30) |
| confusion | confusion.md | symptom (poids 25) |
| bleeding | bleeding.md | symptom (poids 25) |
| high_fever | high_fever.md | symptom (poids 20) |
| severe_headache | severe_headache.md | symptom (poids 20) |
| abdominal_pain | abdominal_pain.md | symptom (poids 15) |
| fever | fever.md | symptom (poids 10) |
| dizziness | dizziness.md | symptom (poids 10) |
| vomiting | vomiting.md | symptom (poids 10) |
| cough | cough.md | symptom (poids 5) |
| headache | headache.md | symptom (poids 5) |
| fatigue | fatigue.md | symptom (poids 5) |
| nausea | nausea.md | symptom (poids 5) |
| diarrhea | diarrhea.md | symptom (poids 5) |
| back_pain | back_pain.md | symptom (poids 5) |
| sore_throat | sore_throat.md | symptom (poids 3) |
| heart_attack_history | heart_attack_history.md | disease (poids 15) |
| stroke_history | stroke_history.md | disease (poids 15) |
| pneumonia | pneumonia.md | disease (poids 10) |
| cancer | cancer.md | disease (poids 10) |
| covid | covid.md | disease (poids 10) |
| diabetes | diabetes.md | disease (poids 5) |
| hypertension | hypertension.md | disease (poids 5) |
| asthma | asthma.md | disease (poids 5) |

## Volumétrie mesurée (test hors-ligne, sans embeddings)

```
27 documents, 20 126 caractères, 52 chunks (CHUNK_SIZE=800, OVERLAP=150)
```

## Comment tester

```bash
# 1. Installer les dépendances (une seule fois, nécessite internet
#    pour télécharger le modèle d'embeddings ~1.1 Go)
pip install -r requirements-ai.txt --break-system-packages

# 2. Ingérer ce corpus de démarrage
python scripts/ingest_documents.py ./medical_docs

# 3. Tester une question générale
curl -X POST http://127.0.0.1:8000/api/ai-assistant/ask \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"question": "What are the warning signs of a heart attack?"}'
```

## Étape suivante — passer au contenu officiel

```bash
# Remplace le corpus de démarrage par du contenu MedlinePlus officiel
python scripts/fetch_medlineplus.py
python scripts/ingest_documents.py ./medical_docs
```
