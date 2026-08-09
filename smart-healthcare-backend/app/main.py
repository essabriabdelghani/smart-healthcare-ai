from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models

from app.routers import (
    auth,
    patients,
    patient_intake,
    risk,
    dashboard,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Healthcare Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
# IMPORTANT : patient_intake (prefix /patients/intake) DOIT être enregistré
# avant patients (qui a GET /patients/{patient_id}), sinon Starlette route
# "/patients/intake" vers get_patient(patient_id="intake") -> 404 à tort.
app.include_router(patient_intake.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(risk.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {
        "status": "ok"
    }