"""CrackSense AI - Start Cloud API Tunnel.

Launches the local FastAPI backend with PyTorch + YOLO, then creates a secure
Cloudflare HTTPS public tunnel so the mobile app can connect over the internet
(4G/5G or any Wi-Fi) without requiring local network/Wi-Fi pairing.
"""

import os
import re
import sys
import time
import subprocess
import threading

CLOUDFLARED_PATH = r"C:\Program Files (x86)\cloudflared\cloudflared.exe"
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def copy_to_clipboard(text: str):
    """Copy text to Windows clipboard using powershell."""
    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-Command", f"Set-Clipboard -Value '{text}'"],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        pass


def main():
    print("=" * 64, flush=True)
    print("       CrackSense AI - Cloud API Gateway", flush=True)
    print("=" * 64, flush=True)

    # 1. Start FastAPI backend on 127.0.0.1:8000
    print("\n[*] Starting FastAPI AI Engine (PyTorch + YOLO)...", flush=True)
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=PROJECT_ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # 2. Check Cloudflare Tunnel binary
    if not os.path.exists(CLOUDFLARED_PATH):
        print(f"[-] Cloudflared not found at {CLOUDFLARED_PATH}", flush=True)
        backend_proc.terminate()
        return 1

    print("[*] Requesting secure public HTTPS Cloud Tunnel...", flush=True)
    
    # Use temporary file for stderr to avoid pipe deadlock on Windows
    log_path = os.path.join(PROJECT_ROOT, "storage", "cloudflared.log")
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    log_file = open(log_path, "w+", encoding="utf-8", errors="replace")

    cf_proc = subprocess.Popen(
        [CLOUDFLARED_PATH, "tunnel", "--url", "http://127.0.0.1:8000"],
        stdout=subprocess.DEVNULL,
        stderr=log_file,
    )

    tunnel_url = None
    start_time = time.time()
    url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")

    # Poll log file for tunnel URL
    while time.time() - start_time < 25:
        time.sleep(1)
        log_file.seek(0)
        content = log_file.read()
        match = url_pattern.search(content)
        if match:
            tunnel_url = match.group(0)
            break

    if not tunnel_url:
        print("[-] Failed to retrieve Cloudflare Tunnel URL within 25 seconds.", flush=True)
        cf_proc.terminate()
        backend_proc.terminate()
        log_file.close()
        return 1

    copy_to_clipboard(tunnel_url)

    print("\n" + "=" * 64, flush=True)
    print("  SUCCESS: Cloud API is ONLINE!", flush=True)
    print("=" * 64, flush=True)
    print(f"\n  Public Cloud API URL:\n  >> {tunnel_url} <<\n", flush=True)
    print("  [+] URL copied to your clipboard automatically!", flush=True)
    print("\n  Instructions for your Mobile Phone:", flush=True)
    print("  1. Open CrackSense on your Android phone (4G/5G or any Wi-Fi).", flush=True)
    print("  2. Tap the connection pill at the top (or open Server Connection).", flush=True)
    print(f"  3. Paste: {tunnel_url}", flush=True)
    print("  4. Tap 'Save & Connect' -> Connected over Cloud API!", flush=True)
    print("\n" + "=" * 64, flush=True)
    print("  Press Ctrl+C at any time to shut down the Cloud API.", flush=True)
    print("=" * 64 + "\n", flush=True)

    try:
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None or cf_proc.poll() is not None:
                print("\n[!] Service stopped.", flush=True)
                break
    except KeyboardInterrupt:
        print("\n[*] Shutting down Cloud API...", flush=True)
    finally:
        cf_proc.terminate()
        backend_proc.terminate()
        log_file.close()
        print("[+] Cloud API stopped.", flush=True)

    return 0


if __name__ == "__main__":
    sys.exit(main())
