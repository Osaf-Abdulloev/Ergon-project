import sys
import subprocess
import signal
import time

def run():
    uvicorn_cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    celery_cmd = [sys.executable, "-m", "celery", "-A", "app.celery.app.celery_app", "worker", "--loglevel=info", "-P", "solo"]

    print("[MANAGER] Starting Uvicorn API Server...")
    p1 = subprocess.Popen(uvicorn_cmd)

    print("[MANAGER] Starting Celery Worker Process...")
    p2 = subprocess.Popen(celery_cmd)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[MANAGER] Shutting down subprocesses...")
        p1.terminate()
        p2.terminate()
        p1.wait()
        p2.wait()
        print("[MANAGER] Shutdown complete.")

if __name__ == "__main__":
    run()
