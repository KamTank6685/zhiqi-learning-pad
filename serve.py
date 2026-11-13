#!/usr/bin/env python3
"""知启 · local/PWA development server.

Usage:
    python serve.py                 # http://127.0.0.1:8080
    python serve.py --port 8080     # custom port
    python serve.py --bind 0.0.0.0  # expose to the local network (HTTP only)

For iPad installation, serve this folder from any HTTPS static host, or use
a temporary HTTPS tunnel while testing. Service workers require HTTPS (or
localhost), so plain HTTP LAN addresses cannot install the offline PWA.
"""

from __future__ import annotations

import argparse
import os
import socket
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class AppHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".webmanifest": "application/manifest+json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".woff2": "font/woff2",
    }

    def end_headers(self) -> None:
        path = self.path.split("?", 1)[0]
        if path.endswith((".html", ".webmanifest", "/")) or path.endswith("/sw.js"):
            self.send_header("Cache-Control", "no-cache")
        elif path.endswith((".css", ".js")):
            self.send_header("Cache-Control", "no-cache")
        else:
            self.send_header("Cache-Control", "public, max-age=604800")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Service-Worker-Allowed", "/")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        # Keep the terminal readable while sharing.
        print(f"[知启] {self.address_string()} - {fmt % args}")


def local_ip() -> str:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        value = sock.getsockname()[0]
        sock.close()
        return value
    except OSError:
        return "127.0.0.1"


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve 知启 · AI 学习桌面")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--bind", default="127.0.0.1", help="127.0.0.1 or 0.0.0.0")
    args = parser.parse_args()

    handler = partial(AppHandler, directory=BASE_DIR)
    server = ThreadingHTTPServer((args.bind, args.port), handler)
    print()
    print("  知启 · AI 学习桌面")
    print(f"  本机访问: http://127.0.0.1:{args.port}")
    if args.bind == "0.0.0.0":
        print(f"  同一 Wi-Fi: http://{local_ip()}:{args.port}")
        print("  注意: iPad 的离线安装需要 HTTPS，局域网 HTTP 只能浏览。")
    print("  按 Ctrl+C 停止")
    print()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
