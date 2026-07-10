# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/utils/image_utils.py
# Image download and validation helpers.
# Enforces size limits, content type checks, and SSRF prevention.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import io
from typing import Any, Tuple
from urllib.parse import urlparse

from app.config.settings import get_settings
from app.core.exceptions import ImageDownloadError, ImageValidationError
from app.logging.structured import get_logger

logger = get_logger("app.utils.image_utils")

# SSRF blocklist: domains that must never be fetched
_SSRF_BLOCKED_HOSTS = {
    "169.254.169.254",    # AWS/GCP metadata
    "metadata.google.internal",
    "169.254.170.2",      # ECS metadata
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
}

# Allowed image MIME types
_ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/gif", "image/avif", "image/heic",
}

MIN_IMAGE_DIMENSION = 50   # pixels
MAX_IMAGE_DIMENSION = 8192  # pixels


def _validate_url(url: str) -> None:
    """
    Validates the URL before any network request is made.
    Blocks SSRF attempts against cloud metadata endpoints.
    """
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()

    if host in _SSRF_BLOCKED_HOSTS:
        raise ImageDownloadError(
            f"Image URL resolves to a blocked host. "
            "Internal and metadata URLs are not permitted."
        )

    # Block IP-based URLs that could be private ranges
    import ipaddress
    try:
        ip = ipaddress.ip_address(host)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            raise ImageDownloadError(
                "Image URL must not point to a private or loopback IP address."
            )
    except ValueError:
        pass  # Not an IP — hostname is fine


def download_and_validate_image(url: str) -> Any:
    """
    Downloads and validates an image from a URL.

    Stages:
        1. URL validation (SSRF prevention)
        2. HTTP GET with timeout and size limit
        3. Content-Type validation
        4. PIL open and verify
        5. Dimension checks

    Returns a PIL.Image.Image object ready for inference.
    Raises ImageDownloadError or ImageValidationError on any failure.
    """
    import requests
    from PIL import Image, UnidentifiedImageError

    settings = get_settings()

    # Stage 1: URL validation
    _validate_url(url)

    # Stage 2: Download with streaming to enforce size limit
    try:
        response = requests.get(
            url,
            timeout=settings.image_download_timeout_seconds,
            stream=True,
            headers={"User-Agent": "MillionFlats-ML-Sidecar/2.0"},
        )
        response.raise_for_status()
    except requests.exceptions.Timeout:
        raise ImageDownloadError(
            f"Image download timed out after {settings.image_download_timeout_seconds}s."
        )
    except requests.exceptions.RequestException as exc:
        raise ImageDownloadError(f"Image download failed: {exc}")

    # Stage 3: Content-Type check (before reading body)
    content_type = response.headers.get("Content-Type", "").split(";")[0].strip().lower()
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise ImageValidationError(
            f"URL does not point to a supported image. "
            f"Content-Type '{content_type}' is not allowed."
        )

    # Stage 4: Read with size guard
    chunks = []
    total = 0
    for chunk in response.iter_content(chunk_size=65536):
        total += len(chunk)
        if total > settings.max_image_size_bytes:
            raise ImageValidationError(
                f"Image exceeds maximum allowed size of "
                f"{settings.max_image_size_bytes // (1024*1024)}MB."
            )
        chunks.append(chunk)

    raw = b"".join(chunks)

    # Stage 5: PIL validation
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except UnidentifiedImageError:
        raise ImageValidationError("Downloaded content could not be decoded as an image.")
    except Exception as exc:
        raise ImageValidationError(f"Image decoding failed: {exc}")

    # Stage 6: Dimension check
    w, h = img.size
    if w < MIN_IMAGE_DIMENSION or h < MIN_IMAGE_DIMENSION:
        raise ImageValidationError(
            f"Image is too small ({w}x{h}px). Minimum is {MIN_IMAGE_DIMENSION}px on each side."
        )

    # Stage 7: Resize for inference (preserve aspect ratio)
    if w > 1024 or h > 1024:
        img.thumbnail((1024, 1024), Image.LANCZOS)

    return img


def get_image_size_bytes(url: str) -> int:
    """Returns the Content-Length header value without downloading the image."""
    import requests
    try:
        r = requests.head(url, timeout=5, headers={"User-Agent": "MillionFlats-ML-Sidecar/2.0"})
        return int(r.headers.get("Content-Length", 0))
    except Exception:
        return 0
