"""
Client HTTP minimal pour un modèle Qwen exécuté localement via Ollama
(https://ollama.com). Aucune donnée patient ne quitte le réseau local :
Ollama tourne sur la même machine/VPC que le backend FastAPI, pas d'appel
à une API externe.

Prérequis sur la machine qui exécute le backend :
    ollama pull qwen2.5:7b-instruct
    ollama serve   (généralement déjà lancé en service)
"""
import requests

from app.config import settings


class QwenClient:
    def __init__(self, base_url: str | None = None, model: str | None = None):
        self.base_url = base_url or settings.ollama_base_url
        self.model = model or settings.ollama_model

    def generate(self, prompt: str, temperature: float = 0.2, max_tokens: int = 700) -> str:
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": temperature, "num_predict": max_tokens},
                },
                timeout=120,
            )
            response.raise_for_status()
            return response.json().get("response", "").strip()
        except requests.RequestException as exc:
            raise RuntimeError(f"Qwen inference failed: {exc}") from exc


qwen_client = QwenClient()
