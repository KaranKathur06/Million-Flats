# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/metrics/prometheus.py
# Prometheus metric definitions.
# All metrics are defined here as module-level singletons.
# Pipelines and routers import from this module.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

from fastapi import FastAPI

try:
    from prometheus_client import (
        Counter,
        Gauge,
        Histogram,
        make_asgi_app,
        REGISTRY,
    )
    _PROMETHEUS_AVAILABLE = True
except ImportError:
    _PROMETHEUS_AVAILABLE = False

# ── Inference latency histograms ──────────────────────────────────────────────

_LATENCY_BUCKETS = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)

if _PROMETHEUS_AVAILABLE:
    IMAGE_INFERENCE_LATENCY = Histogram(
        "ml_image_inference_duration_seconds",
        "Duration of image analysis inference",
        ["model"],
        buckets=_LATENCY_BUCKETS,
    )
    IMAGE_REQUESTS_TOTAL = Counter(
        "ml_image_requests_total",
        "Total image analysis requests",
        ["model", "status"],
    )
    VALUATION_INFERENCE_LATENCY = Histogram(
        "ml_valuation_inference_duration_seconds",
        "Duration of AVM valuation inference",
        buckets=_LATENCY_BUCKETS,
    )
    VALUATION_REQUESTS_TOTAL = Counter(
        "ml_valuation_requests_total",
        "Total valuation requests",
        ["status"],
    )
    EMBEDDING_INFERENCE_LATENCY = Histogram(
        "ml_embedding_inference_duration_seconds",
        "Duration of property embedding inference",
        buckets=_LATENCY_BUCKETS,
    )
    EMBEDDING_REQUESTS_TOTAL = Counter(
        "ml_embedding_requests_total",
        "Total embedding requests",
        ["status"],
    )
    MODEL_LOAD_DURATION = Histogram(
        "ml_model_load_duration_seconds",
        "Duration of model loading at startup",
        ["model"],
        buckets=(0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0),
    )
    ACTIVE_REQUESTS = Gauge(
        "ml_active_requests",
        "Number of requests currently being processed",
    )
else:
    # No-op shims so import doesn't fail when prometheus_client is not installed
    class _NoOpMetric:
        def labels(self, **kwargs): return self
        def observe(self, v): pass
        def inc(self, v=1): pass
        def dec(self, v=1): pass
        def set(self, v): pass

    IMAGE_INFERENCE_LATENCY = _NoOpMetric()
    IMAGE_REQUESTS_TOTAL = _NoOpMetric()
    VALUATION_INFERENCE_LATENCY = _NoOpMetric()
    VALUATION_REQUESTS_TOTAL = _NoOpMetric()
    EMBEDDING_INFERENCE_LATENCY = _NoOpMetric()
    EMBEDDING_REQUESTS_TOTAL = _NoOpMetric()
    MODEL_LOAD_DURATION = _NoOpMetric()
    ACTIVE_REQUESTS = _NoOpMetric()


def setup_metrics(app: FastAPI, path: str = "/metrics") -> None:
    """
    Mounts the Prometheus metrics endpoint on the FastAPI app.
    This endpoint should only be reachable internally (firewall / nginx rule).
    """
    if not _PROMETHEUS_AVAILABLE:
        return

    metrics_app = make_asgi_app()
    app.mount(path, metrics_app)
