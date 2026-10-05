# Câblage dans le projet existant

Ce module s'ajoute au backend FastAPI déjà en place. Voici les modifications
exactes à apporter aux fichiers existants (rien d'autre ne change).

## 1. `app/config.py` — ajouter ces champs à la classe `Settings`

```python
class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/smart_healthcare"
    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # --- Assistant IA ---
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b-instruct"
    chroma_persist_dir: str = "./chroma_db"
    embedding_model_name: str = "intfloat/multilingual-e5-base"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
```

## 2. `.env` — ajouter (optionnel, valeurs par défaut déjà correctes en local)

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
CHROMA_PERSIST_DIR=./chroma_db
EMBEDDING_MODEL_NAME=intfloat/multilingual-e5-base
```

## 3. `app/models/__init__.py` — ajouter l'import

```python
from .ai_conversation import AIConversation, AssistantMode
```

## 4. `app/routers/__init__.py` — ajouter l'import

```python
from . import ai_assistant
```

## 5. `app/main.py` — enregistrer le router

```python
from app.routers import (
    auth, patients, patient_intake, risk, dashboard,
    clinical_notes, appointments, users,
    ai_assistant,   # <- ajouté
)
...
app.include_router(ai_assistant.router, prefix="/api")
```

## 6. Dépendances Python — `requirements-ai.txt`

```
chromadb>=0.5
sentence-transformers>=3.0
pypdf>=4.0
requests>=2.31
```

```bash
pip install -r requirements-ai.txt --break-system-packages
```

## 7. Installer et lancer Qwen en local via Ollama

```bash
# Installation d'Ollama : https://ollama.com/download
ollama pull qwen2.5:7b-instruct
ollama serve   # généralement déjà lancé comme service au démarrage
```

## 8. Créer la table `ai_conversations`

Comme le reste du projet utilise `Base.metadata.create_all()` (pas de
migration Alembic pour l'instant), la table sera créée automatiquement au
prochain démarrage d'uvicorn, dès que l'import est ajouté dans
`app/models/__init__.py` (étape 3).

## 9. Ingérer les documents médicaux de référence

```bash
mkdir medical_docs
# y déposer des PDF/txt/md (protocoles, fiches maladies, guides cliniques...)
python scripts/ingest_documents.py ./medical_docs
```

La première exécution télécharge le modèle d'embeddings
(`intfloat/multilingual-e5-base`, ~1.1 Go) — nécessite une connexion
internet une seule fois, puis tout fonctionne hors-ligne.

## Test rapide (curl)

```bash
# Mode général (RAG)
curl -X POST http://127.0.0.1:8000/api/ai-assistant/ask \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"question": "What is type 2 diabetes?"}'

# Mode patient (contexte clinique)
curl -X POST http://127.0.0.1:8000/api/ai-assistant/ask \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"question": "Why is this patient at critical risk?", "patient_id": "<PATIENT_UUID>"}'
```
