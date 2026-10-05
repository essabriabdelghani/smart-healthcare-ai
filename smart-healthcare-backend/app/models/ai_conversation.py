import enum
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.mysql import BIGINT  
from sqlalchemy.sql import func

from app.database import Base


class AssistantMode(str, enum.Enum):
    patient = "patient"
    general = "general"


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    user_id = Column(
        BIGINT(unsigned=True),   
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    patient_id = Column(
        String(36),
        ForeignKey("patients.id", ondelete="SET NULL"),
        nullable=True,
    )
    intake_id = Column(
        String(36),
        ForeignKey("patient_intakes.id", ondelete="SET NULL"),
        nullable=True,
    )
    

    mode = Column(Enum(AssistantMode), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)

    # JSON sérialisé des sources RAG (mode "general" uniquement).
    sources = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
