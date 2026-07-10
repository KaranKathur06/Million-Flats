# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/health/checker.py
# Enterprise health checker.
# Returns a rich diagnostic payload covering system, models, and dependencies.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import platform
import sys
import time
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional

from app.config.settings import get_settings
from app.logging.structured import get_logger
from app.registry.model_registry import ModelStatus, get_registry

logger = get_logger("app.health.checker")

_SERVICE_START_TIME = time.monotonic()
_REQUEST_COUNT = 0


class ServiceStatus(str, Enum):
    READY = "READY"
    DEGRADED = "DEGRADED"
    NOT_READY = "NOT_READY"
    FAILED = "FAILED"


def increment_request_count() -> None:
    global _REQUEST_COUNT
    _REQUEST_COUNT += 1


class SystemHealthChecker:
    """
    Builds a comprehensive health diagnostic snapshot.

    Status determination:
        READY      — all critical models are READY
        DEGRADED   — critical models OK, ≥1 optional model FAILED or LOADING
        NOT_READY  — ≥1 critical model still LOADING
        FAILED     — ≥1 critical model FAILED
    """

    def __init__(self) -> None:
        self._settings = get_settings()
        self._registry = get_registry()

    def build_health_response(self) -> Dict[str, Any]:
        """Returns a full health diagnostic dict."""
        models_snapshot = self._registry.snapshot()
        overall_status = self._compute_overall_status(models_snapshot)

        return {
            "status": overall_status.value,
            "service": self._settings.service_name,
            "version": self._settings.service_version,
            "environment": self._settings.environment,
            "uptime_seconds": round(time.monotonic() - _SERVICE_START_TIME, 1),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "system": self._system_info(),
            "runtime": self._runtime_info(),
            "models": models_snapshot,
            "dependencies": self._dependency_status(),
            "telemetry": {
                "request_count": _REQUEST_COUNT,
            },
        }

    def _compute_overall_status(self, models: Dict[str, Any]) -> ServiceStatus:
        settings = self._settings
        critical = settings.critical_model_names
        optional = settings.optional_model_names

        for name in critical:
            m = models.get(name, {})
            status = m.get("status", ModelStatus.UNLOADED.value)
            if status == ModelStatus.FAILED.value:
                return ServiceStatus.FAILED
            if status in (ModelStatus.LOADING.value, ModelStatus.UNLOADED.value):
                return ServiceStatus.NOT_READY

        for name in optional:
            m = models.get(name, {})
            status = m.get("status", ModelStatus.UNLOADED.value)
            if status in (ModelStatus.FAILED.value, ModelStatus.LOADING.value):
                return ServiceStatus.DEGRADED

        return ServiceStatus.READY

    @staticmethod
    def _system_info() -> Dict[str, Any]:
        info: Dict[str, Any] = {
            "python_version": sys.version.split()[0],
            "platform": platform.system(),
        }
        try:
            import psutil
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage("/")
            info.update({
                "memory_total_mb": round(mem.total / (1024 ** 2), 1),
                "memory_used_mb": round(mem.used / (1024 ** 2), 1),
                "memory_percent": mem.percent,
                "cpu_percent": psutil.cpu_percent(interval=0.1),
                "disk_used_percent": disk.percent,
            })
        except ImportError:
            info["psutil"] = "not_installed"
        return info

    @staticmethod
    def _runtime_info() -> Dict[str, Any]:
        info: Dict[str, Any] = {"gpu_available": False}
        try:
            import torch
            info["torch_version"] = torch.__version__
            info["gpu_available"] = torch.cuda.is_available()
        except ImportError:
            info["torch_version"] = "not_installed"
        try:
            import transformers
            info["transformers_version"] = transformers.__version__
        except ImportError:
            info["transformers_version"] = "not_installed"
        try:
            import sentence_transformers
            info["sentence_transformers_version"] = sentence_transformers.__version__
        except ImportError:
            info["sentence_transformers_version"] = "not_installed"
        try:
            import xgboost
            info["xgboost_version"] = xgboost.__version__
        except ImportError:
            info["xgboost_version"] = "not_installed"
        return info

    @staticmethod
    def _dependency_status() -> Dict[str, str]:
        settings = get_settings()
        return {
            "database": "not_configured" if not settings.database_url else "configured",
            "redis": "not_configured" if not settings.redis_url else "configured",
            "vector_search": "not_configured",
        }
