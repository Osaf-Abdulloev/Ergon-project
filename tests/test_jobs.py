import pytest

@pytest.mark.asyncio
async def test_job_lifecycle_and_application(client):
    emp_reg = {
        "email": "emp_jobs@example.com",
        "username": "emp_jobs",
        "password": "password123",
        "company_name": "JobCorp",
        "industry": "Software"
    }
    await client.post("/api/v1/auth/register/employer", json=emp_reg)
    from tests.conftest import get_captured_code
    emp_code = get_captured_code("emp_jobs@example.com")
    ver_emp = await client.post("/api/v1/auth/verify-email", json={"email": "emp_jobs@example.com", "code": emp_code})
    emp_token = ver_emp.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    job_data = {
        "title": "Senior Python Developer",
        "description": "Building high-performance async backends with FastAPI and PostgreSQL.",
        "salary_min": 15000,
        "salary_max": 25000,
        "currency": "TJS",
        "location": "Dushanbe",
        "category": "Engineering",
        "employment_type": "full_time"
    }
    create_job_res = await client.post("/api/v1/jobs", json=job_data, headers=emp_headers)
    assert create_job_res.status_code == 201
    job = create_job_res.json()
    job_id = job["id"]
    assert job["title"] == "Senior Python Developer"

    wrk_reg = {
        "email": "wrk_jobs@example.com",
        "username": "wrk_jobs",
        "password": "password123",
        "city": "Dushanbe"
    }
    await client.post("/api/v1/auth/register/worker", json=wrk_reg)
    wrk_code = get_captured_code("wrk_jobs@example.com")
    ver_wrk = await client.post("/api/v1/auth/verify-email", json={"email": "wrk_jobs@example.com", "code": wrk_code})
    wrk_token = ver_wrk.json()["access_token"]
    wrk_headers = {"Authorization": f"Bearer {wrk_token}"}

    app_res = await client.post("/api/v1/applications", json={"job_id": job_id, "cover_note": "I am a strong candidate."}, headers=wrk_headers)
    assert app_res.status_code == 201
    app_data = app_res.json()
    assert app_data["status"] == "pending"

    app_repeat = await client.post("/api/v1/applications", json={"job_id": job_id}, headers=wrk_headers)
    assert app_repeat.status_code == 409
    assert "уже откликались" in app_repeat.json()["detail"]

    # Verify backend reports has_applied == True for the worker
    check_app_res = await client.get(f"/api/v1/applications/check/{job_id}", headers=wrk_headers)
    assert check_app_res.status_code == 200
    assert check_app_res.json()["has_applied"] is True

    get_job_res = await client.get(f"/api/v1/jobs/{job_id}", headers=wrk_headers)
    assert get_job_res.status_code == 200
    assert get_job_res.json()["has_applied"] is True

    status_update_res = await client.patch(
        f"/api/v1/applications/{app_data['id']}/status",
        json={"status": "accepted"},
        headers=emp_headers
    )
    assert status_update_res.status_code == 200
    assert status_update_res.json()["status"] == "accepted"

    # Verify candidate get_my_applications returns exactly 1 deduplicated item
    my_apps_res = await client.get("/api/v1/applications/my", headers=wrk_headers)
    assert my_apps_res.status_code == 200
    my_apps = my_apps_res.json()
    assert my_apps["total"] == 1
    assert len(my_apps["items"]) == 1
    assert my_apps["items"][0]["id"] == app_data["id"]

