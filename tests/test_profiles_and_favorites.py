import pytest

@pytest.mark.asyncio
async def test_worker_and_company_profile_flow(client):
    w_reg = {"email": "worker_prof@example.com", "username": "worker_prof", "password": "password123"}
    await client.post("/api/v1/auth/register/worker", json=w_reg)
    w_login = await client.post("/api/v1/auth/login", json={"email": "worker_prof@example.com", "password": "password123"})
    w_token = w_login.json()["access_token"]
    w_headers = {"Authorization": f"Bearer {w_token}"}

    update_prof_res = await client.put(
        "/api/v1/users/me/worker-profile",
        json={
            "desired_position": "Backend Lead",
            "desired_salary": 20000.0,
            "bio": "Experienced Python Architect",
            "education": "BS Computer Science",
            "skills": ["Python", "FastAPI", "PostgreSQL"]
        },
        headers=w_headers
    )
    assert update_prof_res.status_code == 200
    prof = update_prof_res.json()
    assert prof["desired_position"] == "Backend Lead"
    assert len(prof["skills"]) == 3

    exp_res = await client.post(
        "/api/v1/users/me/experience",
        json={
            "company_name": "Ergon Tech",
            "role_title": "Senior Developer",
            "start_date": "2022-01-01",
            "end_date": "2024-01-01",
            "description": "Architected async micro-services and monolith backend."
        },
        headers=w_headers
    )
    assert exp_res.status_code == 201

    e_reg = {
        "email": "emp_prof@example.com",
        "username": "emp_prof",
        "password": "password123",
        "company_name": "Alpha LLC",
        "industry": "Fintech"
    }
    await client.post("/api/v1/auth/register/employer", json=e_reg)
    e_login = await client.post("/api/v1/auth/login", json={"email": "emp_prof@example.com", "password": "password123"})
    e_token = e_login.json()["access_token"]
    e_headers = {"Authorization": f"Bearer {e_token}"}

    comp_res = await client.put(
        "/api/v1/users/me/company-profile",
        json={
            "company_name": "Alpha Corp",
            "description": "Leading Fintech innovator",
            "website": "https://alpha.example.com",
            "industry": "Fintech"
        },
        headers=e_headers
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["company_name"] == "Alpha Corp"

@pytest.mark.asyncio
async def test_favorites_and_notifications(client):
    w_reg = {"email": "fav_user@example.com", "username": "fav_user", "password": "password123"}
    await client.post("/api/v1/auth/register/worker", json=w_reg)
    w_login = await client.post("/api/v1/auth/login", json={"email": "fav_user@example.com", "password": "password123"})
    w_token = w_login.json()["access_token"]
    w_headers = {"Authorization": f"Bearer {w_token}"}

    e_reg = {
        "email": "fav_emp@example.com",
        "username": "fav_emp",
        "password": "password123",
        "company_name": "Beta LLC",
        "industry": "IT"
    }
    await client.post("/api/v1/auth/register/employer", json=e_reg)
    e_login = await client.post("/api/v1/auth/login", json={"email": "fav_emp@example.com", "password": "password123"})
    e_token = e_login.json()["access_token"]
    e_headers = {"Authorization": f"Bearer {e_token}"}

    job_res = await client.post(
        "/api/v1/jobs",
        json={
            "title": "Fullstack Engineer",
            "description": "Developing modern web apps",
            "salary_min": 10000,
            "salary_max": 18000,
            "currency": "TJS",
            "location": "Khujand",
            "category": "Software",
            "employment_type": "full_time"
        },
        headers=e_headers
    )
    job_id = job_res.json()["id"]

    add_fav_res = await client.post(
        "/api/v1/favorites",
        json={"target_type": "job", "target_id": job_id},
        headers=w_headers
    )
    assert add_fav_res.status_code == 201

    list_fav_res = await client.get("/api/v1/favorites?target_type=job", headers=w_headers)
    assert list_fav_res.status_code == 200
    assert list_fav_res.json()["total"] == 1

    del_fav_res = await client.delete(f"/api/v1/favorites/job/{job_id}", headers=w_headers)
    assert del_fav_res.status_code == 200

    notif_res = await client.get("/api/v1/notifications", headers=w_headers)
    assert notif_res.status_code == 200

    read_all_res = await client.post("/api/v1/notifications/read-all", headers=w_headers)
    assert read_all_res.status_code == 200
