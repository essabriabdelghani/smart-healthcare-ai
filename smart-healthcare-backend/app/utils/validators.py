import re


def is_valid_email(email: str) -> bool:
    """
    Validate email format.
    """
    pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return bool(re.match(pattern, email))


def is_strong_password(password: str) -> bool:
    """
    Password must contain:
    - at least 8 characters
    - one uppercase
    - one lowercase
    - one digit
    """

    if len(password) < 8:
        return False

    if not re.search(r"[A-Z]", password):
        return False

    if not re.search(r"[a-z]", password):
        return False

    if not re.search(r"\d", password):
        return False

    return True


def clean_text(text: str | None) -> str:
    """
    Remove extra spaces.
    """

    if text is None:
        return ""

    return " ".join(text.split())