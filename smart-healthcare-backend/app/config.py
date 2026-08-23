from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/smart_healthcare"
    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # Envoi d'e-mails (mot de passe oublié). Avec Gmail : utilise un "mot de
    # passe d'application" (https://myaccount.google.com/apppasswords),
    # jamais le vrai mot de passe du compte.
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""          # ton adresse Gmail complète
    smtp_password: str = ""      # le mot de passe d'application (16 caractères, sans espaces)
    email_from: str = ""         # généralement identique à smtp_user
    email_from_name: str = "Clinique Numérique"

    # URL du frontend, pour construire le lien de réinitialisation
    frontend_url: str = "http://localhost:5173"

    # Durée de validité du lien de réinitialisation
    reset_token_expire_minutes: int = 30

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()