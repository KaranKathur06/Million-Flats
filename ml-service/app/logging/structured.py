# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/logging/structured.py
# Structured JSON logging for the ML Sidecar.
# Every log line is a machine-parseable JSON object.
# Compatible with Datadog, Loki, CloudWatch, and any central log aggregator.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import json
import logging
import sys
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class JsonFormatter(logging.Formatter):
    """
    Formats every log record as a single-line JSON object.

    Standard fields on every line:
        timestamp, level, logger, message, service, environment

    Extra fields can be attached by passing them as keyword arguments
    to any log call:
        logger.info("event", extra={"request_id": "...", "model": "..."})
    """

    def __init__(self, service_name: str = "millionflats-ml-sidecar", environment: str = "production"):
        super().__init__()
        self._service = service_name
        self._env = environment

    def format(self, record: logging.LogRecord) -> str:  # type: ignore[override]
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": self._service,
            "environment": self._env,
        }

        # Attach structured extras (anything that isn't a standard LogRecord attr)
        _standard_keys = {
            "name", "msg", "args", "created", "filename", "funcName",
            "levelname", "levelno", "lineno", "module", "msecs",
            "pathname", "process", "processName", "relativeCreated",
            "thread", "threadName", "exc_info", "exc_text", "stack_info",
            "message",
        }
        for key, value in record.__dict__.items():
            if key not in _standard_keys and not key.startswith("_"):
                log_entry[key] = value

        # Exception info
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info),
            }

        return json.dumps(log_entry, default=str)


class TextFormatter(logging.Formatter):
    """Human-readable formatter for local development."""

    _FMT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    _DATE_FMT = "%Y-%m-%d %H:%M:%S"

    def __init__(self) -> None:
        super().__init__(fmt=self._FMT, datefmt=self._DATE_FMT)


def configure_logging(
    level: str = "INFO",
    log_format: str = "json",
    service_name: str = "millionflats-ml-sidecar",
    environment: str = "production",
) -> None:
    """
    Call once at application startup to configure the root logging handler.
    Subsequent calls to get_logger() will inherit this configuration.
    """
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove any pre-existing handlers (e.g. from basicConfig)
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    if log_format == "json":
        handler.setFormatter(JsonFormatter(service_name=service_name, environment=environment))
    else:
        handler.setFormatter(TextFormatter())

    root.addHandler(handler)

    # Silence noisy third-party loggers
    for noisy in ("uvicorn.access", "httpx", "httpcore", "PIL"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str, **context: Any) -> "ContextLogger":
    """
    Returns a logger that automatically injects fixed context fields into
    every log record.

    Usage:
        logger = get_logger("app.pipelines.valuation", model="avm_xgboost_v1")
        logger.info("Inference complete", duration_ms=4.2)
    """
    return ContextLogger(name, context)


class ContextLogger:
    """
    Thin wrapper around stdlib logger that pre-populates extra fields.
    Additional fields can be passed per log call.
    """

    def __init__(self, name: str, context: Optional[Dict[str, Any]] = None) -> None:
        self._logger = logging.getLogger(name)
        self._context: Dict[str, Any] = context or {}

    def _build_extra(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        return {**self._context, **kwargs}

    def debug(self, msg: str, **kwargs: Any) -> None:
        self._logger.debug(msg, extra=self._build_extra(kwargs))

    def info(self, msg: str, **kwargs: Any) -> None:
        self._logger.info(msg, extra=self._build_extra(kwargs))

    def warning(self, msg: str, **kwargs: Any) -> None:
        self._logger.warning(msg, extra=self._build_extra(kwargs))

    def error(self, msg: str, **kwargs: Any) -> None:
        self._logger.error(msg, extra=self._build_extra(kwargs))

    def critical(self, msg: str, **kwargs: Any) -> None:
        self._logger.critical(msg, extra=self._build_extra(kwargs))

    def exception(self, msg: str, **kwargs: Any) -> None:
        self._logger.exception(msg, extra=self._build_extra(kwargs))

    def bind(self, **extra: Any) -> "ContextLogger":
        """Returns a new logger with additional fixed context fields."""
        return ContextLogger(self._logger.name, {**self._context, **extra})
