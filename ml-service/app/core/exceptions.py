# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/core/exceptions.py
# Centralized exception handling.
# Every exception type is caught here and converted to a consistent
# ErrorResponse. Internal details (stack traces, file paths) are NEVER
# sent to API consumers.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.logging.structured import get_logger

logger = get_logger("app.core.exceptions")


# ── Internal sentinel exception types ─────────────────────────────────────────

class MLServiceError(Exception):
    """Base class for all application-level exceptions."""
    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, detail: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.detail = detail


class ModelNotReadyError(MLServiceError):
    """Raised when a required model is not in READY state."""
    status_code = 503
    error_code = "MODEL_NOT_READY"


class ModelInferenceError(MLServiceError):
    """Raised when a model inference call fails."""
    status_code = 500
    error_code = "INFERENCE_FAILED"


class PipelineError(MLServiceError):
    """Raised when a pipeline stage fails unrecoverably."""
    status_code = 500
    error_code = "PIPELINE_ERROR"


class ImageDownloadError(MLServiceError):
    """Raised when image download fails."""
    status_code = 422
    error_code = "IMAGE_DOWNLOAD_FAILED"


class ImageValidationError(MLServiceError):
    """Raised when downloaded content is not a valid image."""
    status_code = 422
    error_code = "IMAGE_INVALID"


class AuthenticationError(MLServiceError):
    """Raised for authentication failures."""
    status_code = 401
    error_code = "AUTH_FAILED"


class RateLimitError(MLServiceError):
    """Raised when rate limit is exceeded."""
    status_code = 429
    error_code = "RATE_LIMIT_EXCEEDED"


# ── Response builder ──────────────────────────────────────────────────────────

def _error_response(
    request: Request,
    status_code: int,
    error_code: str,
    message: str,
) -> JSONResponse:
    """Builds a consistent, safe error response body."""
    request_id = getattr(request.state, "request_id", "unknown")
    body = {
        "error": {
            "errorCode": error_code,
            "message": message,
            "requestId": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": str(request.url.path),
        }
    }
    return JSONResponse(status_code=status_code, content=body)


# ── Exception handlers ────────────────────────────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:
    """
    Registers all exception handlers on the FastAPI application.
    Call this once in the app factory.
    """

    @app.exception_handler(MLServiceError)
    async def handle_ml_service_error(request: Request, exc: MLServiceError) -> JSONResponse:
        logger.error(
            "MLServiceError",
            error_code=exc.error_code,
            message=exc.message,
            path=str(request.url.path),
            request_id=getattr(request.state, "request_id", "unknown"),
        )
        return _error_response(request, exc.status_code, exc.error_code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Extract the first validation error message for a clean consumer-facing message
        errors = exc.errors()
        first = errors[0] if errors else {}
        field_path = " → ".join(str(loc) for loc in first.get("loc", []))
        msg = f"Validation failed on '{field_path}': {first.get('msg', 'invalid value')}"
        logger.warning(
            "Request validation failed",
            path=str(request.url.path),
            error_count=len(errors),
            request_id=getattr(request.state, "request_id", "unknown"),
        )
        return _error_response(request, status.HTTP_422_UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", msg)

    @app.exception_handler(ValidationError)
    async def handle_pydantic_error(request: Request, exc: ValidationError) -> JSONResponse:
        logger.warning(
            "Pydantic validation error",
            path=str(request.url.path),
            request_id=getattr(request.state, "request_id", "unknown"),
        )
        return _error_response(
            request,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "VALIDATION_ERROR",
            "Request payload is invalid.",
        )

    @app.exception_handler(Exception)
    async def handle_generic_exception(request: Request, exc: Exception) -> JSONResponse:
        """
        Catch-all handler.
        Logs the full exception (with traceback) but returns only a safe message
        to the client. Stack traces must never be exposed in API responses.
        """
        logger.exception(
            "Unhandled exception",
            path=str(request.url.path),
            exc_type=type(exc).__name__,
            request_id=getattr(request.state, "request_id", "unknown"),
        )
        return _error_response(
            request,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "INTERNAL_ERROR",
            "An unexpected error occurred. Please try again or contact support.",
        )
