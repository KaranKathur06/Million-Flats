# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/config/settings.py
# Centralized configuration with startup validation.
# Fails fast if required values are missing or invalid.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import os
from functools import lru_cache
from typing import List, Literal, Optional

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    All configuration is sourced from environment variables.
    Application will refuse to start if required values are absent.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Identity ──────────────────────────────────────────────────────────────
    service_name: str = "millionflats-ml-sidecar"
    service_version: str = "2.0.0"
    environment: Literal["development", "staging", "production"] = "production"

    # ── Server ────────────────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8001
    workers: int = 2
    request_timeout_seconds: int = 60
    max_request_size_bytes: int = 10 * 1024 * 1024  # 10 MB

    # ── Auth (REQUIRED) ───────────────────────────────────────────────────────
    ml_vps_secret: str = ""  # REQUIRED — validated below

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    rate_limit_requests_per_minute: int = 60
    rate_limit_burst: int = 20

    # ── CORS ──────────────────────────────────────────────────────────────────
    platform_origin: str = "https://millionflats.com"

    @property
    def platform_origins(self) -> List[str]:
        """Parses comma-separated origins from the environment variable."""
        return [o.strip() for o in self.platform_origin.split(",") if o.strip()]

    # ── Model Paths ───────────────────────────────────────────────────────────
    valuation_model_path: str = "models/avm_xgboost_v1.pkl"

    # ── Image Pipeline ────────────────────────────────────────────────────────
    max_image_size_bytes: int = 20 * 1024 * 1024  # 20 MB
    image_download_timeout_seconds: int = 15
    allowed_image_schemes: str = "https"  # comma-separated

    @property
    def allowed_image_schemes_list(self) -> List[str]:
        return [s.strip() for s in self.allowed_image_schemes.split(",")]

    # ── External Dependencies (optional) ─────────────────────────────────────
    database_url: Optional[str] = None
    redis_url: Optional[str] = None

    # ── Observability ─────────────────────────────────────────────────────────
    log_level: str = "INFO"
    log_format: Literal["json", "text"] = "json"
    prometheus_enabled: bool = True
    prometheus_metrics_path: str = "/metrics"

    # ── Model Loading ─────────────────────────────────────────────────────────
    # Models labelled "critical" will cause startup to fail if they cannot load.
    # Optional models log a warning and mark themselves DEGRADED.
    critical_models: str = "valuation,sentence_transformer"
    optional_models: str = "clip"

    @property
    def critical_model_names(self) -> List[str]:
        return [m.strip() for m in self.critical_models.split(",") if m.strip()]

    @property
    def optional_model_names(self) -> List[str]:
        return [m.strip() for m in self.optional_models.split(",") if m.strip()]

    # ── Validators ────────────────────────────────────────────────────────────

    @field_validator("ml_vps_secret")
    @classmethod
    def secret_must_be_set(cls, v: str) -> str:
        """
        Reject startup unless the shared secret is configured and strong enough.
        This prevents silent operation with an empty or default secret.
        """
        if not v:
            raise ValueError(
                "ML_VPS_SECRET is required. "
                "Set it to a cryptographically random string of at least 32 characters."
            )
        if len(v) < 32:
            raise ValueError(
                f"ML_VPS_SECRET is too short ({len(v)} chars). "
                "Use at least 32 characters for adequate security."
            )
        return v

    @field_validator("workers")
    @classmethod
    def validate_workers(cls, v: int) -> int:
        if v < 1 or v > 32:
            raise ValueError("WORKERS must be between 1 and 32.")
        return v

    @model_validator(mode="after")
    def validate_environment_consistency(self) -> "Settings":
        """Warn if running development config in production."""
        if self.environment == "production" and self.log_format != "json":
            import warnings
            warnings.warn(
                "log_format=text in production — structured JSON is strongly recommended.",
                stacklevel=2,
            )
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Returns a cached Settings singleton.
    The cache is populated once at startup and reused for the application lifetime.
    Import and call this function anywhere to access configuration.
    """
    return Settings()
