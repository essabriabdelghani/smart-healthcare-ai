import uuid

from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func

from app.database import Base


class Clinic(Base):
    __tablename__ = "clinics"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())