import sys
import os
import socket
import subprocess
import time

def is_port_open(host="localhost", port=6379, timeout=1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False

def run():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(backend_dir, "frontend")

    python_exe = sys.executable

    uvicorn_cmd = [python_exe, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    celery_cmd = [python_exe, "-m", "celery", "-A", "app.celery.app.celery_app", "worker", "--loglevel=info", "-P", "solo"]

    processes = []

    print("==========================================================================")
    print("                ERGON PLATFORM -- MULTI-PROCESS SUPERVISOR                 ")
    print("==========================================================================")

    print("[MANAGER] 1/3 Starting FastAPI Backend API Server on http://localhost:8000 ...")
    p_backend = subprocess.Popen(uvicorn_cmd, cwd=backend_dir)
    processes.append(("FastAPI Backend", p_backend))

    if is_port_open("localhost", 6379):
        print("[MANAGER] 2/3 Redis detected at localhost:6379. Starting Celery Worker Process...")
        p_celery = subprocess.Popen(celery_cmd, cwd=backend_dir)
        processes.append(("Celery Worker", p_celery))
    else:
        print("[MANAGER] 2/3 INFO: Redis is not running on localhost:6379. Celery worker skipped.")

    if os.path.exists(os.path.join(frontend_dir, "package.json")):
        print("[MANAGER] 3/3 Starting Next.js Frontend Web Server on http://localhost:3000 ...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        p_frontend = subprocess.Popen([npm_cmd, "run", "dev"], cwd=frontend_dir)
        processes.append(("Next.js Frontend", p_frontend))

    print("--------------------------------------------------------------------------")
    print("  [SUCCESS] All services spawned!")
    print("  -> Web Marketplace Application: http://localhost:3000")
    print("  -> FastAPI REST API & Swagger:  http://localhost:8000/docs")
    print("  -> ReDoc API Documentation:     http://localhost:8000/redoc")
    print("  -> Press CTRL+C at any time to shut down all processes cleanly.")
    print("--------------------------------------------------------------------------")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[MANAGER] Shutting down all processes cleanly...")
        for name, proc in processes:
            print(f"[MANAGER] Terminating {name}...")
            try:
                proc.terminate()
            except Exception:
                pass
        for name, proc in processes:
            try:
                proc.wait(timeout=3)
            except Exception:
                proc.kill()
        print("[MANAGER] All processes shut down cleanly.")

if __name__ == "__main__":
    run()
