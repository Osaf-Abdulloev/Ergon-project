import pytest
import io
import uuid
from httpx import AsyncClient
from app.main import app
from app.models.enums import UserRole, ResumeStatus
from app.models.domain import User, Resume, WorkerProfile
from app.core.security import create_access_token

@pytest.fixture
async def worker_user(db_session):
    user = User(
        email="worker_resume_test@hamkor.tj",
        username="worker_resume_test",
        password_hash="hashed_pw",
        role=UserRole.WORKER,
        full_name="Иван Тестовый",
        is_email_verified=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    profile = WorkerProfile(user_id=user.id, desired_position="Python Backend Developer")
    db_session.add(profile)
    await db_session.commit()
    return user

@pytest.fixture
async def employer_user(db_session):
    user = User(
        email="employer_resume_test@hamkor.tj",
        username="employer_resume_test",
        password_hash="hashed_pw",
        role=UserRole.EMPLOYER,
        full_name="Работодатель Тест",
        is_email_verified=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.mark.asyncio
async def test_employer_access_forbidden(client: AsyncClient, employer_user: User):
    token = create_access_token(str(employer_user.id), employer_user.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get("/api/v1/resumes", headers=headers)
    assert response.status_code == 403
    assert "Job Seekers" in response.json()["detail"]

@pytest.mark.asyncio
async def test_worker_create_and_list_resumes(client: AsyncClient, worker_user: User):
    token = create_access_token(str(worker_user.id), worker_user.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Draft
    create_payload = {
        "title": "Моё backend резюме",
        "target_position": "Python Developer"
    }
    res = await client.post("/api/v1/resumes", json=create_payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Моё backend резюме"
    assert data["status"] == "draft"
    assert data["is_published"] is False
    resume_id = data["id"]

    # 2. List Resumes
    res_list = await client.get("/api/v1/resumes", headers=headers)
    assert res_list.status_code == 200
    resumes = res_list.json()
    assert len(resumes) >= 1
    assert resumes[0]["id"] == resume_id

@pytest.mark.asyncio
async def test_parse_cv_file(client: AsyncClient, worker_user: User):
    token = create_access_token(str(worker_user.id), worker_user.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    cv_text = """
    Иван Иванов
    Инженер-программист Python / FastAPI
    Email: ivan@example.com, Тел: +992900112233, Душанбе
    
    Опыт работы:
    ООО ТаджикСофт (2022 - Настоящее время)
    Разработка высоконагруженных REST API на FastAPI и PostgreSQL.
    
    Навыки: Python, FastAPI, Docker, PostgreSQL, React
    """
    files = {
        "file": ("test_cv.txt", io.BytesIO(cv_text.encode("utf-8")), "text/plain")
    }

    res = await client.post("/api/v1/resumes/parse-cv", files=files, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "draft"
    assert data["is_published"] is False
    content = data["content"]
    assert content["personal_info"]["full_name"] is not None
    assert data["completeness_score"] > 0

@pytest.mark.asyncio
async def test_update_and_publish_resume(client: AsyncClient, worker_user: User):
    token = create_access_token(str(worker_user.id), worker_user.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create draft
    res_create = await client.post("/api/v1/resumes", json={"title": "Draft for publish"}, headers=headers)
    resume_id = res_create.json()["id"]

    # 2. Update content
    update_payload = {
        "content": {
            "personal_info": {
                "full_name": "Иван Тестовый Опубликованный",
                "desired_position": "Senior Backend Architect",
                "email": "worker_resume_test@hamkor.tj",
                "phone": "+992 900 11 22 33",
                "city": "Душанбе",
                "summary": "Квалифицированный архитектор с большим опытом разработки микросервисов."
            },
            "work_experience": [
                {
                    "company_name": "HamKor Tech",
                    "position": "Lead Engineer",
                    "start_date": "2021",
                    "is_current": True,
                    "responsibilities": ["Проектирование архитектуры"],
                    "achievements": ["Увеличение производительности"]
                }
            ],
            "education": [],
            "skills": {"technical": ["Python", "FastAPI", "PostgreSQL"], "soft": ["Лидерство"]},
            "languages": [{"name": "Русский", "proficiency": "Native"}],
            "certificates": [],
            "projects": [],
            "social_links": {},
            "custom_sections": []
        }
    }
    res_upd = await client.put(f"/api/v1/resumes/{resume_id}", json=update_payload, headers=headers)
    assert res_upd.status_code == 200
    assert res_upd.json()["completeness_score"] > 50

    # 3. Publish
    res_pub = await client.post(f"/api/v1/resumes/{resume_id}/publish", headers=headers)
    assert res_pub.status_code == 200
    pub_data = res_pub.json()
    assert pub_data["is_published"] is True
    assert pub_data["status"] == "published"
    assert pub_data["published_at"] is not None
