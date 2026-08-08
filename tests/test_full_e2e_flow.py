import pytest
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_full_e2e_flow(client: AsyncClient):
    ac = client
    unique_suffix = uuid.uuid4().hex[:8]
    candidate_email = f"candidate_{unique_suffix}@hamkor.tj"
    candidate_pass = "StrongPass123!"
    
    reg_cand_res = await ac.post("/api/v1/auth/register/worker", json={
        "email": candidate_email,
        "username": f"cand_{unique_suffix}",
        "password": candidate_pass,
        "full_name": "Тестовый Кандидат"
    })
    assert reg_cand_res.status_code in (200, 201)
    
    login_cand_res = await ac.post("/api/v1/auth/login", json={
        "email": candidate_email,
        "password": candidate_pass
    })
    assert login_cand_res.status_code == 200
    cand_token = login_cand_res.json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_token}"}
    
    # Verify Candidate profile
    me_cand_res = await ac.get("/api/v1/users/me", headers=cand_headers)
    assert me_cand_res.status_code == 200

    # ── 2. REGISTER & LOGIN EMPLOYER ──
    emp_suffix = uuid.uuid4().hex[:8]
    emp_email = f"employer_{emp_suffix}@hamkor.tj"
    emp_pass = "StrongEmployer123!"
    
    await ac.post("/api/v1/auth/register/employer", json={
        "email": emp_email,
        "username": f"emp_{emp_suffix}",
        "password": emp_pass,
        "company_name": "Тестовая Компания ООО"
    })
    
    login_emp_res = await ac.post("/api/v1/auth/login", json={
        "email": emp_email,
        "password": emp_pass
    })
    assert login_emp_res.status_code == 200
    emp_token = login_emp_res.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # ── 3. CANDIDATE CANNOT PUBLISH A JOB (RBAC TEST) ──
    cand_post_job = await ac.post("/api/v1/jobs", json={
        "title": "Unwanted Candidate Job",
        "description": "Should be blocked",
        "location": "г. Душанбе",
        "category": "ИТ",
        "employment_type": "full_time"
    }, headers=cand_headers)
    assert cand_post_job.status_code == 403

    # ── 4. EMPLOYER PUBLISHES A JOB ──
    create_job_res = await ac.post("/api/v1/jobs", json={
        "title": "Старший Разработчик (E2E Test)",
        "description": "Ищем высококвалифицированного специалиста в Душанбе",
        "salary_min": 8000,
        "salary_max": 15000,
        "currency": "TJS",
        "location": "г. Душанбе",
        "category": "Информационные технологии",
        "employment_type": "full_time"
    }, headers=emp_headers)
    assert create_job_res.status_code == 201
    created_job = create_job_res.json()
    job_id = created_job["id"]
    assert created_job["title"] == "Старший Разработчик (E2E Test)"

    # ── 5. CANDIDATE APPLIES TO THE EMPLOYER JOB ──
    apply_res = await ac.post("/api/v1/applications", json={
        "job_id": job_id,
        "cover_note": "Здравствуйте! Хочу работать у вас на этой должности."
    }, headers=cand_headers)
    assert apply_res.status_code == 201
    application_id = apply_res.json()["id"]

    # ── 6. CANDIDATE VIEWS MY APPLICATIONS ──
    my_apps_res = await ac.get("/api/v1/applications/my", headers=cand_headers)
    assert my_apps_res.status_code == 200
    apps_data = my_apps_res.json()
    assert apps_data["total"] >= 1
    assert any(a["id"] == application_id for a in apps_data["items"])

    # ── 7. EMPLOYER REVIEWS & ACCEPTS CANDIDATE APPLICATION ──
    emp_job_apps_res = await ac.get(f"/api/v1/jobs/{job_id}/applications", headers=emp_headers)
    assert emp_job_apps_res.status_code == 200
    emp_apps = emp_job_apps_res.json()
    assert emp_apps["total"] == 1

    update_status_res = await ac.patch(f"/api/v1/applications/{application_id}/status", json={
        "status": "accepted"
    }, headers=emp_headers)
    assert update_status_res.status_code == 200
    assert update_status_res.json()["status"] == "accepted"
