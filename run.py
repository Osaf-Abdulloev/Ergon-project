import sys
import os
import socket
import subprocess
import time

def is_redis_running(host="localhost", port=6379) -> bool:
    try:
        with socket.create_connection((host, port), timeout=1.0):
            return True
    except Exception:
        return False

def run():
    uvicorn_cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    celery_cmd = [sys.executable, "-m", "celery", "-A", "app.celery.app.celery_app", "worker", "--loglevel=info", "-P", "solo"]

    print("[MANAGER] Starting Uvicorn API Server at http://0.0.0.0:8000 ...")
    p1 = subprocess.Popen(uvicorn_cmd)

    p2 = None
    if is_redis_running():
        print("[MANAGER] Redis detected. Starting Celery Worker Process...")
        p2 = subprocess.Popen(celery_cmd)
    else:
        print("[MANAGER] WARNING: Redis is not running on localhost:6379.")
        print("[MANAGER] Uvicorn API server is running cleanly in standalone mode.")
        print("[MANAGER] (Start Redis server locally if background task processing is needed).")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[MANAGER] Shutting down processes...")
        p1.terminate()
        if p2:
            p2.terminate()
        p1.wait()
        if p2:
            p2.wait()
        print("[MANAGER] Shutdown complete.")

if __name__ == "__main__":
    run()
