from uuid import uuid4
from datetime import datetime


def generate_uuid() -> str:
    """
    Generate UUID string.
    """
    return str(uuid4())


def current_timestamp() -> datetime:
    """
    Return current UTC datetime.
    """
    return datetime.utcnow()


def success_response(
    message: str,
    data=None,
):
    return {
        "success": True,
        "message": message,
        "data": data,
    }


def error_response(
    message: str,
):
    return {
        "success": False,
        "message": message,
    }