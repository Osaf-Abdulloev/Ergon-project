import pytest
from tests.conftest import get_captured_code

@pytest.mark.asyncio
async def test_application_status_persistence_and_history(client):
    ac = client
    # 1. Register Employer & Verify
    emp_resp = await ac.post("/api/v1/auth/register/employer", json={
        "email": "emp_app_test@hamkor.tj",
        "username": "emp_app_test",
        "password": "Password123!",
        "company_name": "Test Company App Status"
    })
    assert emp_resp.status_code == 201
    code_emp = get_captured_code("emp_app_test@hamkor.tj")
    v_emp = await ac.post("/api/v1/auth/verify-email", json={"email": "emp_app_test@hamkor.tj", "code": code_emp})
    assert v_emp.status_code == 200
    emp_token = v_emp.json()["access_token"]

    # 2. Register Worker & Verify
    work_resp = await ac.post("/api/v1/auth/register/worker", json={
        "email": "worker_app_test@hamkor.tj",
        "username": "worker_app_test",
        "password": "Password123!"
    })
    assert work_resp.status_code == 201
    code_work = get_captured_code("worker_app_test@hamkor.tj")
    v_work = await ac.post("/api/v1/auth/verify-email", json={"email": "worker_app_test@hamkor.tj", "code": code_work})
    assert v_work.status_code == 200
    work_token = v_work.json()["access_token"]

    # 3. Employer Creates Job
    job_resp = await ac.post(
        "/api/v1/jobs",
        headers={"Authorization": f"Bearer {emp_token}"},
        json={
            "title": "Python Backend Developer",
            "description": "Awesome role for testing status persistence",
            "location": "Dushanbe",
            "employment_type": "full_time",
            "currency": "TJS",
            "category": "Engineering"
        }
    )
    assert job_resp.status_code == 201
    job_id = job_resp.json()["id"]

    # 4. Worker Applies to Job
    app_resp = await ac.post(
        "/api/v1/applications",
        headers={"Authorization": f"Bearer {work_token}"},
        json={
            "job_id": job_id,
            "cover_note": "Хочу работать в вашей компании!"
        }
    )
    assert app_resp.status_code == 201
    app_data = app_resp.json()
    app_id = app_data["id"]
    assert app_data["status"] == "pending"

    # 5. Check Application Status endpoint
    check_resp = await ac.get(
        f"/api/v1/applications/check/{job_id}",
        headers={"Authorization": f"Bearer {work_token}"}
    )
    assert check_resp.status_code == 200
    assert check_resp.json()["has_applied"] is True
    assert check_resp.json()["status"] == "pending"

    # 6. Employer Accepts Application with Feedback
    status_resp = await ac.patch(
        f"/api/v1/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {emp_token}"},
        json={
            "status": "accepted",
            "employer_feedback": "Приглашаем на собеседование во вторник"
        }
    )
    assert status_resp.status_code == 200
    updated_data = status_resp.json()
    assert updated_data["status"] == "accepted"
    assert updated_data["accepted_at"] is not None
    assert updated_data["employer_feedback"] == "Приглашаем на собеседование во вторник"
    assert len(updated_data["status_history"]) > 0
    assert updated_data["status_history"][-1]["new_status"] == "accepted"

    # 7. Worker fetches applications list from DB
    my_apps = await ac.get(
        "/api/v1/applications/my",
        headers={"Authorization": f"Bearer {work_token}"}
    )
    assert my_apps.status_code == 200
    items = my_apps.json()["items"]
    matching_app = next((item for item in items if item["id"] == app_id), None)
    assert matching_app is not None
    assert matching_app["status"] == "accepted"
    assert matching_app["employer_feedback"] == "Приглашаем на собеседование во вторник"
