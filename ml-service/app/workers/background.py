# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# app/workers/background.py
# Async background workers that run for the lifetime of the application.
#
# Workers:
#   - health_poll_worker  : logs system health every 60s
#   - metric_agg_worker   : future metric aggregation hook
#
# Design:
#   - Each worker is an infinite loop with asyncio.sleep()
#   - BackgroundWorkerManager holds task references
#   - A stop event gracefully terminates all workers on shutdown
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from __future__ import annotations

import asyncio
from typing import List

from app.logging.structured import get_logger

logger = get_logger("app.workers.background")


class BackgroundWorkerManager:
    """
    Manages async background tasks.
    All tasks are gracefully cancelled on shutdown via the stop event.
    """

    def __init__(self) -> None:
        self._stop_event = asyncio.Event()
        self._tasks: List[asyncio.Task] = []

    async def start(self) -> None:
        """Start all background workers."""
        self._tasks = [
            asyncio.create_task(self._health_poll_worker(), name="health-poll"),
        ]
        logger.info("Background workers started", count=len(self._tasks))

    async def stop(self) -> None:
        """Signal workers to stop and await their completion."""
        self._stop_event.set()
        for task in self._tasks:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        logger.info("Background workers stopped")

    # ── Worker implementations ─────────────────────────────────────────────────

    async def _health_poll_worker(self) -> None:
        """
        Periodically logs a health summary.
        Useful for confirming the service is alive in log aggregators
        even during low-traffic periods.
        """
        interval = 60  # seconds
        while not self._stop_event.is_set():
            try:
                await asyncio.wait_for(
                    self._stop_event.wait(),
                    timeout=interval,
                )
                break  # stop event fired
            except asyncio.TimeoutError:
                pass  # normal — log and continue

            try:
                from app.health.checker import SystemHealthChecker
                checker = SystemHealthChecker()
                health = checker.build_health_response()
                logger.info(
                    "health_poll",
                    status=health["status"],
                    uptime_seconds=health["uptime_seconds"],
                    models={
                        name: meta.get("status")
                        for name, meta in health["models"].items()
                    },
                )
            except Exception as exc:
                logger.warning("health_poll_failed", error=str(exc))
