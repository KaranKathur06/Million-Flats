# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/registry/model_registry.py
# Thread-safe Model Registry.
# Replaces the mutable global `_models = {}` dict with a typed, observable
# registry that tracks lifecycle state, inference metrics, and health per model.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import hashlib
import os
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional


class ModelStatus(str, Enum):
    LOADING = "LOADING"
    READY = "READY"
    DEGRADED = "DEGRADED"
    FAILED = "FAILED"
    UNLOADED = "UNLOADED"


@dataclass
class ModelRecord:
    """
    Complete metadata and runtime statistics for a single model.

    The `artifact` field holds the actual loaded Python object (e.g. an
    XGBoost Booster, a CLIP model dict, or a SentenceTransformer instance).
    All other fields are observable state used by the health checker and
    Prometheus metrics.
    """

    # Identity
    name: str
    version: str
    source: str  # "local_file" | "huggingface" | "s3"

    # Runtime state
    status: ModelStatus = ModelStatus.UNLOADED
    artifact: Any = field(default=None, repr=False)

    # Lifecycle timestamps
    loaded_at: Optional[datetime] = None
    last_inference_at: Optional[datetime] = None
    last_reload_at: Optional[datetime] = None

    # Performance
    load_duration_ms: Optional[float] = None
    memory_bytes: Optional[int] = None

    # Integrity
    checksum: Optional[str] = None

    # Inference metrics (cumulative)
    inference_count: int = 0
    error_count: int = 0
    total_latency_ms: float = 0.0

    # Optional description / metadata
    description: str = ""
    tags: List[str] = field(default_factory=list)

    # ── Computed properties ───────────────────────────────────────────────────

    @property
    def avg_latency_ms(self) -> Optional[float]:
        """Average inference latency in milliseconds. None if no inferences yet."""
        if self.inference_count == 0:
            return None
        return round(self.total_latency_ms / self.inference_count, 2)

    @property
    def memory_mb(self) -> Optional[float]:
        if self.memory_bytes is None:
            return None
        return round(self.memory_bytes / (1024 * 1024), 1)

    @property
    def is_ready(self) -> bool:
        return self.status == ModelStatus.READY

    @property
    def error_rate(self) -> float:
        """Error rate as a fraction [0.0 – 1.0]."""
        total = self.inference_count + self.error_count
        if total == 0:
            return 0.0
        return round(self.error_count / total, 4)

    # ── Mutation helpers ──────────────────────────────────────────────────────

    def record_inference(self, latency_ms: float) -> None:
        self.inference_count += 1
        self.total_latency_ms += latency_ms
        self.last_inference_at = datetime.now(timezone.utc)

    def record_error(self) -> None:
        self.error_count += 1

    def to_dict(self) -> Dict[str, Any]:
        """Serialisable snapshot for health/model endpoints."""
        return {
            "name": self.name,
            "version": self.version,
            "source": self.source,
            "status": self.status.value,
            "loaded_at": self.loaded_at.isoformat() if self.loaded_at else None,
            "load_duration_ms": self.load_duration_ms,
            "last_inference_at": (
                self.last_inference_at.isoformat() if self.last_inference_at else None
            ),
            "memory_mb": self.memory_mb,
            "checksum": self.checksum,
            "inference_count": self.inference_count,
            "error_count": self.error_count,
            "error_rate": self.error_rate,
            "avg_latency_ms": self.avg_latency_ms,
            "description": self.description,
            "tags": self.tags,
        }


class ModelRegistry:
    """
    Thread-safe singleton that holds all ModelRecord instances.

    Design:
    - ModelManager is the only writer (loads, updates status, records metrics).
    - Routes and health checker are read-only consumers.
    - A RLock protects all mutations, allowing the same thread to
      acquire it recursively (e.g. during model reload sequences).
    """

    def __init__(self) -> None:
        self._records: Dict[str, ModelRecord] = {}
        self._lock = threading.RLock()

    # ── Write API (ModelManager only) ─────────────────────────────────────────

    def register(self, record: ModelRecord) -> None:
        with self._lock:
            self._records[record.name] = record

    def update_status(self, name: str, status: ModelStatus) -> None:
        with self._lock:
            if name in self._records:
                self._records[name].status = status

    def set_artifact(
        self,
        name: str,
        artifact: Any,
        *,
        loaded_at: datetime,
        load_duration_ms: float,
        memory_bytes: Optional[int] = None,
        checksum: Optional[str] = None,
    ) -> None:
        with self._lock:
            rec = self._records[name]
            rec.artifact = artifact
            rec.status = ModelStatus.READY
            rec.loaded_at = loaded_at
            rec.last_reload_at = loaded_at
            rec.load_duration_ms = load_duration_ms
            rec.memory_bytes = memory_bytes
            rec.checksum = checksum

    def record_inference(self, name: str, latency_ms: float) -> None:
        with self._lock:
            if name in self._records:
                self._records[name].record_inference(latency_ms)

    def record_error(self, name: str) -> None:
        with self._lock:
            if name in self._records:
                self._records[name].record_error()

    def unload(self, name: str) -> None:
        with self._lock:
            if name in self._records:
                rec = self._records[name]
                rec.artifact = None
                rec.status = ModelStatus.UNLOADED

    # ── Read API ──────────────────────────────────────────────────────────────

    def get(self, name: str) -> Optional[ModelRecord]:
        with self._lock:
            return self._records.get(name)

    def get_artifact(self, name: str) -> Optional[Any]:
        with self._lock:
            rec = self._records.get(name)
            return rec.artifact if rec else None

    def is_ready(self, name: str) -> bool:
        with self._lock:
            rec = self._records.get(name)
            return rec is not None and rec.status == ModelStatus.READY

    def all_records(self) -> List[ModelRecord]:
        with self._lock:
            return list(self._records.values())

    def snapshot(self) -> Dict[str, Any]:
        """Returns a JSON-serialisable dict of all model states."""
        with self._lock:
            return {name: rec.to_dict() for name, rec in self._records.items()}


# ── Module-level singleton ────────────────────────────────────────────────────

_registry = ModelRegistry()


def get_registry() -> ModelRegistry:
    """
    Returns the application-level ModelRegistry singleton.
    Import this function anywhere models need to be read.
    """
    return _registry


def _compute_file_checksum(path: str) -> Optional[str]:
    """SHA-256 checksum of a local model file. Returns None if file not found."""
    try:
        sha = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha.update(chunk)
        return sha.hexdigest()[:16]  # First 16 hex chars for readability
    except (OSError, FileNotFoundError):
        return None
