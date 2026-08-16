import pytest
import io
import uuid
from httpx import AsyncClient
from app.models.enums import UserRole
from app.models.domain import User, WorkerProfile, CVDocument, ProfileAISuggestion
from app.core.security import create_access_token

@pytest.fixture
async def worker_user_cv(db_session):
    user = User(
        email="cv_test_worker@hamkor.tj",
        username="cv_test_worker",
        password_hash="hashed_pw",
        role=UserRole.WORKER,
        full_name="Старое Имя",
        phone="+992900000000",
        city="Худжанд",
        is_email_verified=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    profile = WorkerProfile(user_id=user.id, desired_position="Старая Должность")
    db_session.add(profile)
    await db_session.commit()
    return user

@pytest.mark.asyncio
async def test_cv_upload_and_status(client: AsyncClient, worker_user_cv: User):
    token = create_access_token(str(worker_user_cv.id), worker_user_cv.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    cv_content = """
    Алишер Собиров
    Старший Разработчик Python / FastAPI
    Email: alisher@example.com, Телефон: +992987654321
    Город: Душанбе
    
    Опыт работы:
    ООО Инновации (2021 - Настоящее время)
    • Проектирование архитектуры микросервисов на FastAPI и PostgreSQL.
    • Оптимизация запросов и интеграция Celery.
    
    Навыки: Python, FastAPI, PostgreSQL, Docker, Redis, Celery
    """

    files = {
        "file": ("alisher_cv.txt", io.BytesIO(cv_content.encode("utf-8")), "text/plain")
    }

    # 1. Upload CV
    res = await client.post("/api/v1/cv/upload", files=files, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["original_filename"] == "alisher_cv.txt"
    cv_id = data["id"]

    # 2. Check Status
    res_status = await client.get(f"/api/v1/cv/{cv_id}/status", headers=headers)
    assert res_status.status_code == 200
    st_data = res_status.json()
    assert st_data["id"] == cv_id
    assert st_data["processing_status"] in ["UPLOADED", "EXTRACTING", "ANALYZING", "PROFILE_REVIEW_REQUIRED", "COMPLETED"]

    # 3. Check Profile Suggestions
    res_sugg = await client.get(f"/api/v1/cv/{cv_id}/suggestions", headers=headers)
    assert res_sugg.status_code == 200
    sugg_data = res_sugg.json()
    if sugg_data:
        assert sugg_data["status"] == "PENDING"
        suggestion_id = sugg_data["id"]

        # 4. Confirm Profile Changes
        confirm_payload = {
            "accepted_fields": ["full_name", "desired_position", "phone", "city"],
            "custom_overrides": {"full_name": "Алишер Собиров"}
        }
        res_conf = await client.post(f"/api/v1/cv/suggestions/{suggestion_id}/confirm", json=confirm_payload, headers=headers)
        assert res_conf.status_code == 200
        conf_data = res_conf.json()
        assert conf_data["status"] in ["ACCEPTED", "PARTIALLY_ACCEPTED"]
