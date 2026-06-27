from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # EPIC / SMART on FHIR
    EPIC_CLIENT_ID: str = "test_client"
    EPIC_CLIENT_SECRET: str | None = None
    EPIC_FHIR_BASE_URL: str = "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"
    EPIC_AUTH_BASE_URL: str = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2"
    REDIRECT_URI: str = "http://localhost:8000/auth/callback"
    FRONTEND_URL: str = "http://localhost:3000"
    SMART_SCOPES: str = (
        "launch openid fhirUser "
        "patient/Patient.read "
        "patient/Observation.read patient/Observation.write "
        "patient/Condition.read "
        "patient/MedicationRequest.read "
        "patient/Appointment.read "
        "patient/QuestionnaireResponse.read patient/QuestionnaireResponse.write "
        "patient/CarePlan.read"
    )

    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-5-20250929"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/peripartum_db"

    # Security
    SESSION_SECRET_KEY: str = "dev_secret_change_in_production"
    COOKIE_SECURE: bool = False
    SESSION_COOKIE_NAME: str = "session_id"
    SESSION_EXPIRE_HOURS: int = 8

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]


settings = Settings()
