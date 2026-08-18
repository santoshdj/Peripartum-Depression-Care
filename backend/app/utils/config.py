from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class ProviderConfig:
    """Configuration for a specific EHR provider."""
    def __init__(
        self,
        client_id: str,
        client_secret: str | None,
        base_url: str,
        auth_url: str,
        token_url: str,
        scopes: str,
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = base_url
        self.auth_url = auth_url
        self.token_url = token_url
        self.scopes = scopes


# EHR Provider Configurations
PROVIDER_CONFIGS = {
    "epic": ProviderConfig(
        client_id="b631c5a9-eb6b-4e12-babf-08bdbf4cd6c9",
        client_secret=None,
        base_url="https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
        auth_url="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize",
        token_url="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
        scopes="launch openid fhirUser patient/Patient.read patient/Observation.read patient/Observation.write patient/Condition.read patient/MedicationRequest.read patient/Appointment.read patient/QuestionnaireResponse.read patient/QuestionnaireResponse.write",
    ),
    "cerner": ProviderConfig(
        client_id="032c5aea-bfd5-46cc-a254-223a718e7f92",
        client_secret=None,
        base_url="https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
        auth_url="https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/personas/patient/authorize",
        token_url="https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/token",
        scopes="launch openid fhirUser patient/Patient.read patient/Observation.read patient/Observation.write patient/Condition.read patient/MedicationRequest.read patient/Appointment.read patient/QuestionnaireResponse.read patient/QuestionnaireResponse.write",
    ),
    "allscripts": ProviderConfig(
        client_id="your-allscripts-client-id",
        client_secret=None,
        base_url="https://your-allscripts-fhir-server/api/FHIR/R4",
        auth_url="https://your-allscripts-auth-server/authorize",
        token_url="https://your-allscripts-auth-server/token",
        scopes="launch openid fhirUser patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/Appointment.read",
    ),
    "athenahealth": ProviderConfig(
        client_id="your-athenahealth-client-id",
        client_secret=None,
        base_url="https://your-athenahealth-fhir-server/api/FHIR/R4",
        auth_url="https://your-athenahealth-auth-server/authorize",
        token_url="https://your-athenahealth-auth-server/token",
        scopes="launch openid fhirUser patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/Appointment.read",
    ),
}


def get_provider_config(provider: str) -> ProviderConfig:
    """Get configuration for a specific EHR provider."""
    provider_lower = provider.lower()
    if provider_lower not in PROVIDER_CONFIGS:
        raise ValueError(f"Unsupported provider: {provider}. Supported providers: {', '.join(PROVIDER_CONFIGS.keys())}")
    return PROVIDER_CONFIGS[provider_lower]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SMART on FHIR Configuration (works with any FHIR R4-compliant EHR)
    # Supports: Epic, Cerner, Allscripts, Meditech, athenahealth, etc.
    FHIR_CLIENT_ID: str = "test_client"
    FHIR_CLIENT_SECRET: str | None = None
    FHIR_BASE_URL: str = "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"
    FHIR_AUTH_URL: str = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize"
    FHIR_TOKEN_URL: str = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token"
    FHIR_ISS: str | None = None  # Optional: EHR's FHIR server issuer URL (for EHR launch)
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
        "patient/CarePlan.read patient/Task.write"
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
    ALLOWED_ORIGINS: str | list[str] = ["http://localhost:3000"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: str | list[str] | None) -> list[str]:
        """Parse ALLOWED_ORIGINS from comma-separated string or list."""
        if v is None:
            return ["http://localhost:3000"]
        if isinstance(v, str):
            # Split by comma, strip whitespace, filter empty strings
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def convert_postgres_url_to_asyncpg(cls, v: str | None) -> str:
        """
        Convert Railway's postgres:// or postgresql:// URL to postgresql+asyncpg:// for async SQLAlchemy.
        Railway injects DATABASE_URL as postgres:// (legacy) or postgresql://, but we need asyncpg driver.
        """
        if isinstance(v, str):
            # Handle both postgres:// and postgresql:// (Railway can inject either)
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v or "postgresql+asyncpg://postgres:postgres@postgres:5432/peripartum_db"

    @field_validator("FHIR_CLIENT_SECRET", "FHIR_ISS", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: str | None) -> str | None:
        """Convert empty strings or whitespace-only strings to None."""
        if isinstance(v, str) and not v.strip():
            return None
        return v


settings = Settings()
