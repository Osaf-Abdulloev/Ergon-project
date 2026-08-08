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
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"

    # Commands
    uvicorn_cmd = [
        python_exe, "-m", "uvicorn", "app.main:app",
        "--host", "0.0.0.0", "--port", "8000", "--reload"
    ]
    
    celery_worker_cmd = [
        python_exe, "-m", "celery", "-A", "app.celery.app.celery_app",
        "worker", "--loglevel=info", "-P", "solo",
        "-Q", "default,notifications,ai_tasks,scrapers"
    ]

    celery_beat_cmd = [
        python_exe, "-m", "celery", "-A", "app.celery.app.celery_app",
        "beat", "--loglevel=info"
    ]

    processes = []

    print("==========================================================================")
    print("                HAMKOR PLATFORM -- MULTI-PROCESS SUPERVISOR                 ")
    print("==========================================================================")

    # 1. FastAPI Backend
    print("\n[MANAGER] 1/4 Starting FastAPI Backend API Server on http://localhost:8000 ...")
    p_backend = subprocess.Popen(uvicorn_cmd, cwd=backend_dir)
    processes.append(("FastAPI Backend", p_backend))

    # 2. Redis & Celery Check
    redis_running = is_port_open("localhost", 6379)
    if redis_running:
        print("[MANAGER] 2/4 Redis detected at localhost:6379.")
        print("          -> Starting Celery Worker Process...")
        p_celery_worker = subprocess.Popen(celery_worker_cmd, cwd=backend_dir)
        processes.append(("Celery Worker", p_celery_worker))

        print("          -> Starting Celery Beat Scheduler...")
        p_celery_beat = subprocess.Popen(celery_beat_cmd, cwd=backend_dir)
        processes.append(("Celery Beat", p_celery_beat))
    else:
        print("\n[MANAGER] 2/4 WARNING: Redis is not running on localhost:6379.")
        print("          Celery Worker and Beat scheduler will be SKIPPED.")
        print("          To enable background tasks, start Redis (`redis-server`) and restart `run.py`.\n")

    # 3. Frontend Web Server
    if os.path.exists(os.path.join(frontend_dir, "package.json")):
        node_modules_dir = os.path.join(frontend_dir, "node_modules")
        if not os.path.exists(node_modules_dir):
            print("[MANAGER] 3/4 Installing frontend dependencies (`npm install`)...")
            subprocess.run([npm_cmd, "install"], cwd=frontend_dir, check=True)

        print("[MANAGER] 4/4 Starting Vite Frontend Web Application on http://localhost:3000 ...")
        p_frontend = subprocess.Popen([npm_cmd, "run", "dev"], cwd=frontend_dir)
        processes.append(("Vite Frontend", p_frontend))
    else:
        print("[MANAGER] 3/4 INFO: Frontend package.json not found. Skipping frontend.")

    print("\n--------------------------------------------------------------------------")
    print("  [SUCCESS] All active services spawned!")
    print("  -> Frontend Application: http://localhost:3000")
    print("  -> FastAPI REST API:      http://localhost:8000/docs")
    print("  -> ReDoc Documentation:   http://localhost:8000/redoc")
    if redis_running:
        print("  -> Celery Worker:         ACTIVE (queues: default, notifications, ai_tasks, scrapers)")
        print("  -> Celery Beat:           ACTIVE (periodic tasks enabled)")
    else:
        print("  -> Celery Background:    INACTIVE (Redis offline)")
    print("  -> Press CTRL+C at any time to shut down all processes cleanly.")
    print("--------------------------------------------------------------------------\n")

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
