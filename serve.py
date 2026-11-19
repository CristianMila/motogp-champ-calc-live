#!/usr/bin/env python3
"""
Local web server and MotoGP Live Timing SSE / API proxy for the
MotoGP 2026 Championship Calculator.

Runs a single on-demand background poller against the public Pulselive MotoGP
endpoint and pushes real-time updates to connected browsers via Server-Sent Events (SSE).
"""

import http.server
import json
import queue
import socketserver
import ssl
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional, Set, Tuple

PORT = 8080

MOTOGP_API_BASE = "https://api.motogp.pulselive.com/motogp/v1"
LIVE_TIMING_URL = f"{MOTOGP_API_BASE}/timing-gateway/livetiming-lite"
SEASONS_URL = f"{MOTOGP_API_BASE}/results/seasons"

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)

# Simple in-memory cache for standings (60s TTL) to avoid excessive API calls
_standings_cache: Dict[str, Any] = {"timestamp": 0.0, "data": None}
STANDINGS_TTL_SECONDS = 60.0


def fetch_json(url: str, timeout: float = 6.0) -> Tuple[Optional[Any], Optional[str]]:
    """Fetch JSON from an upstream URL with browser-like headers."""
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://www.motogp.com/",
            "Origin": "https://www.motogp.com",
        },
    )
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            if not raw.strip():
                return None, "Empty response from MotoGP API"
            return json.loads(raw), None
    except urllib.error.HTTPError as e:
        return None, f"Upstream HTTP {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        return None, f"Network error: {e.reason}"
    except json.JSONDecodeError as e:
        return None, f"Invalid JSON from upstream: {e}"
    except Exception as e:
        return None, f"Unexpected error: {e}"


def fetch_live_timing_envelope() -> Dict[str, Any]:
    """Fetch live timing from MotoGP API and wrap in a consistent JSON envelope."""
    data, err = fetch_json(LIVE_TIMING_URL, timeout=5.0)
    fetched_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if err:
        return {
            "ok": False,
            "error": err,
            "source": LIVE_TIMING_URL,
            "fetched_at": fetched_at,
        }
    return {
        "ok": True,
        "source": LIVE_TIMING_URL,
        "fetched_at": fetched_at,
        "data": data,
    }


def fetch_latest_standings(target_year: int = 2026) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Fetch official MotoGP championship standings from the public Pulselive Results API.
    Caches successful responses for STANDINGS_TTL_SECONDS.
    """
    now = time.time()
    if _standings_cache["data"] is not None and (now - _standings_cache["timestamp"]) < STANDINGS_TTL_SECONDS:
        return _standings_cache["data"], None

    seasons, err = fetch_json(SEASONS_URL, timeout=6.0)
    if err or not isinstance(seasons, list):
        return None, err or "Could not load seasons list"

    season_obj = None
    for s in seasons:
        if s.get("year") == target_year or str(s.get("year")) == str(target_year):
            season_obj = s
            break
    if season_obj is None:
        for s in seasons:
            if s.get("current"):
                season_obj = s
                break
    if season_obj is None and seasons:
        season_obj = seasons[0]

    season_id = season_obj.get("id") if season_obj else None
    if not season_id:
        return None, "Could not determine season ID"

    categories_url = f"{MOTOGP_API_BASE}/results/categories?seasonUuid={season_id}"
    categories, err = fetch_json(categories_url, timeout=6.0)
    if err or not isinstance(categories, list):
        return None, err or "Could not load categories"

    motogp_cat = None
    for c in categories:
        name = str(c.get("name", "")).lower()
        if "motogp" in name:
            motogp_cat = c
            break
    if motogp_cat is None and categories:
        motogp_cat = categories[0]

    cat_id = motogp_cat.get("id") if motogp_cat else None
    if not cat_id:
        return None, "Could not determine MotoGP category ID"

    standings_url = (
        f"{MOTOGP_API_BASE}/results/standings"
        f"?seasonUuid={season_id}&categoryUuid={cat_id}"
    )
    standings_raw, err = fetch_json(standings_url, timeout=6.0)
    if err or not isinstance(standings_raw, dict):
        return None, err or "Could not load championship standings"

    classification = standings_raw.get("classification", [])
    riders = []
    for entry in classification:
        rider_info = entry.get("rider", {}) or {}
        team_info = entry.get("team", {}) or {}
        riders.append({
            "position": entry.get("position"),
            "number": rider_info.get("number"),
            "full_name": rider_info.get("full_name", ""),
            "team": team_info.get("name", ""),
            "points": entry.get("points", 0),
        })

    result = {
        "season": season_obj.get("year"),
        "category": motogp_cat.get("name"),
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "riders": riders,
    }
    _standings_cache["timestamp"] = now
    _standings_cache["data"] = result
    return result, None


class LiveTimingBroadcaster:
    """
    Single background poller that fans out MotoGP live timing updates
    to all connected SSE browser clients. Automatically pauses polling
    when zero clients are connected.
    """

    def __init__(self, default_interval: float = 5.0):
        self._lock = threading.Lock()
        self._cond = threading.Condition(self._lock)
        self._subscribers: Dict[queue.Queue, float] = {}
        self._default_interval = default_interval
        self._latest_envelope: Optional[Dict[str, Any]] = None
        self._latest_ts: float = 0.0
        self._stop_event = threading.Event()
        self._thread = threading.Thread(target=self._poll_loop, name="motogp-sse-poller", daemon=True)
        self._thread.start()

    def _effective_interval_locked(self) -> float:
        if not self._subscribers:
            return self._default_interval
        return min(self._subscribers.values())

    def subscribe(self, interval_seconds: float = 5.0) -> Tuple[queue.Queue, Optional[Dict[str, Any]]]:
        """Register a new SSE subscriber queue and return (queue, cached_latest_if_fresh)."""
        clamped = max(2.0, min(60.0, float(interval_seconds)))
        q: queue.Queue = queue.Queue(maxsize=10)
        with self._cond:
            self._subscribers[q] = clamped
            now = time.time()
            fresh_cached = (
                self._latest_envelope
                if (self._latest_envelope is not None and (now - self._latest_ts) < clamped)
                else None
            )
            # Wake poller immediately if we don't have a fresh cached payload
            self._cond.notify_all()
        return q, fresh_cached

    def unsubscribe(self, q: queue.Queue):
        with self._cond:
            self._subscribers.pop(q, None)
            self._cond.notify_all()

    def subscriber_count(self) -> int:
        with self._lock:
            return len(self._subscribers)

    def broadcast(self, envelope: Dict[str, Any]):
        """Store latest envelope and push to all active SSE subscribers."""
        with self._lock:
            self._latest_envelope = envelope
            self._latest_ts = time.time()
            subs = list(self._subscribers.keys())

        for q in subs:
            try:
                q.put_nowait(envelope)
            except queue.Full:
                # Drop oldest stale item for slow client, then enqueue latest
                try:
                    q.get_nowait()
                except queue.Empty:
                    pass
                try:
                    q.put_nowait(envelope)
                except queue.Full:
                    pass

    def poll_once_and_broadcast(self) -> Dict[str, Any]:
        envelope = fetch_live_timing_envelope()
        self.broadcast(envelope)
        return envelope

    def _poll_loop(self):
        while not self._stop_event.is_set():
            with self._cond:
                while not self._subscribers and not self._stop_event.is_set():
                    self._cond.wait(timeout=1.0)
                if self._stop_event.is_set():
                    break
                interval = self._effective_interval_locked()
                elapsed = time.time() - self._latest_ts
                wait_time = max(0.0, interval - elapsed)
                if wait_time > 0:
                    self._cond.wait(timeout=wait_time)
                    # Re-check after waking (new subscriber or shorter interval)
                    if not self._subscribers or self._stop_event.is_set():
                        continue
                    interval = self._effective_interval_locked()
                    if (time.time() - self._latest_ts) < (interval - 0.1):
                        continue

            # Perform upstream fetch outside lock
            self.poll_once_and_broadcast()

    def stop(self):
        self._stop_event.set()
        with self._cond:
            self._cond.notify_all()


def create_handler(web_dir: Path, broadcaster: LiveTimingBroadcaster):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(web_dir), **kwargs)

        def _send_json(self, payload: Any, status: int = 200):
            body = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.end_headers()
            self.wfile.write(body)

        def _handle_sse_stream(self, query_string: str):
            params = urllib.parse.parse_qs(query_string)
            interval_sec = 5.0
            if "interval" in params:
                try:
                    raw_val = float(params["interval"][0])
                    # Support either seconds (e.g. 5) or milliseconds (e.g. 5000)
                    interval_sec = raw_val / 1000.0 if raw_val > 100 else raw_val
                except (ValueError, IndexError):
                    interval_sec = 5.0

            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()

            sub_queue, cached = broadcaster.subscribe(interval_sec)
            try:
                # Inform browser of auto-reconnect delay
                self.wfile.write(b"retry: 3000\n: connected\n\n")
                self.wfile.flush()

                if cached is not None:
                    msg = f"event: timing\ndata: {json.dumps(cached)}\n\n".encode("utf-8")
                    self.wfile.write(msg)
                    self.wfile.flush()

                while True:
                    try:
                        envelope = sub_queue.get(timeout=15.0)
                        msg = f"event: timing\ndata: {json.dumps(envelope)}\n\n".encode("utf-8")
                        self.wfile.write(msg)
                        self.wfile.flush()
                    except queue.Empty:
                        # Periodic SSE comment heartbeat to keep connection alive
                        self.wfile.write(b": heartbeat\n\n")
                        self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
                pass
            finally:
                broadcaster.unsubscribe(sub_queue)

        def do_OPTIONS(self):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Content-Length", "0")
            self.end_headers()

        def do_GET(self):
            parsed = urllib.parse.urlsplit(self.path)
            path = parsed.path

            if path == "/api/health":
                self._send_json({
                    "ok": True,
                    "service": "motogp-calc-proxy",
                    "sse_clients": broadcaster.subscriber_count(),
                })
                return

            if path == "/api/live-stream":
                self._handle_sse_stream(parsed.query)
                return

            if path == "/api/live-timing":
                envelope = broadcaster.poll_once_and_broadcast()
                status = 200 if envelope.get("ok") else 502
                self._send_json(envelope, status=status)
                return

            if path == "/api/standings":
                data, err = fetch_latest_standings(2026)
                if err:
                    self._send_json({"ok": False, "error": err}, status=502)
                    return
                self._send_json({"ok": True, "data": data})
                return

            super().do_GET()

        def log_message(self, format, *args):
            # Keep console output clean during live updates
            if args and isinstance(args[0], str) and (
                "/api/live-timing" in args[0] or "/api/live-stream" in args[0]
            ):
                return
            super().log_message(format, *args)

    return Handler


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def start_server(port: int = PORT):
    web_dir = Path(__file__).resolve().parent
    broadcaster = LiveTimingBroadcaster(default_interval=5.0)
    handler_cls = create_handler(web_dir, broadcaster)
    with ThreadingHTTPServer(("", port), handler_cls) as httpd:
        url = f"http://localhost:{port}"
        print("\n=======================================================")
        print("  🏁 MotoGP 2026 Live Championship Calculator Running!")
        print(f"  👉 Open URL in your browser: {url}")
        print(f"  📡 Live SSE Stream:          {url}/api/live-stream")
        print(f"  🔄 Live Timing Snapshot:     {url}/api/live-timing")
        print(f"  📊 Standings Proxy:          {url}/api/standings")
        print("  Press Ctrl+C to stop the server")
        print("=======================================================\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
        finally:
            broadcaster.stop()


if __name__ == "__main__":
    start_server()
