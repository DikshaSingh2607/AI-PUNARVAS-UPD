from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


class Settings(BaseSettings):
    # Project Info
    PROJECT_NAME: str = "AI-PUNARVAS"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = (
        "AI-Powered Disaster Community Relocation Planning System "
        "providing multi-hazard risk assessment, explainable ML susceptibility modeling, "
        "site vetting, and gated resettlement planning."
    )
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/aipunarvas"
    AUTO_SEED_ON_STARTUP: bool = True
    AUTO_CREATE_TABLES: bool = True

    # Security & JWT
    SECRET_KEY: str = "punarvas_disaster_relocation_super_secret_key_change_in_production_2026_ndma"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:80",
        "http://localhost:8088",
        "http://127.0.0.1:8088",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://localhost:80"]

    # Model settings
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
