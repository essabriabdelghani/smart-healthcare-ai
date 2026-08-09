# Smart Healthcare Platform — Backend (FastAPI)

## Setup
```bash
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # then edit SECRET_KEY
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

## Endpoints
- POST /api/auth/register  — {fullname, email, password, role}
- POST /api/auth/login     — {email, password} -> {access_token, token_type}
- GET  /api/auth/me        — requires `Authorization: Bearer <token>`
- POST /api/auth/forgot-password — {email} (bonus, stub for now)
