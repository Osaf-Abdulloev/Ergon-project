import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.yora_parser import YoraParserService
from app.models.enums import EmploymentType

@pytest.mark.asyncio
async def test_yora_parser_mappings():
    assert YoraParserService._map_employment_type("Удаленная работа") == EmploymentType.REMOTE
    assert YoraParserService._map_employment_type("Частичная занятость") == EmploymentType.PART_TIME
    assert YoraParserService._map_employment_type("Стажировка") == EmploymentType.INTERNSHIP
    assert YoraParserService._map_employment_type("Проектная работа") == EmploymentType.CONTRACT
    assert YoraParserService._map_employment_type("Полная занятость") == EmploymentType.FULL_TIME

@pytest.mark.asyncio
async def test_yora_parser_build_description():
    sample = {
        "position": "Backend Developer",
        "position_txt": "Разработка серверной части",
        "responsibilities": "Код на Python, PostgreSQL",
        "requirements": "Опыт 3 года",
        "conditions": "Удалёнка"
    }
    desc = YoraParserService._build_description(sample)
    assert "Backend Developer" in desc or "Разработка серверной части" in desc
    assert "Код на Python" in desc
    assert "Опыт 3 года" in desc

@pytest.mark.asyncio
async def test_yora_parser_sync_service(db_session):
    mock_data = {
        "total_pages": 1,
        "data": [
            {
                "id": 999001,
                "position": "Test Python Engineer (Yora)",
                "position_txt": "Test Description",
                "salary_from": "5000",
                "salary_to": "10000",
                "currency_name": "TJS",
                "organisation_name": "Yora Test Org",
                "organisation_avatar_url": "https://example.com/logo.png",
                "work_format_name": "Удаленная работа",
                "region_id_name": "Душанбе"
            }
        ]
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_data

    mock_client = MagicMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("httpx.AsyncClient", return_value=mock_client):
        parser = YoraParserService(db_session)
        stats = await parser.fetch_and_sync(max_pages=1)
        
        assert stats["created"] == 1
        assert stats["total_fetched"] == 1

        # Run second time to verify update/deduplication
        stats_dup = await parser.fetch_and_sync(max_pages=1)
        assert stats_dup["updated"] == 1
        assert stats_dup["created"] == 0

@pytest.mark.asyncio
async def test_yora_sync_api_endpoint(client):
    mock_data = {
        "total_pages": 1,
        "data": [
            {
                "id": 999002,
                "position": "API Sync Developer",
                "position_txt": "FastAPI job",
                "salary_from": "8000",
                "salary_to": "12000",
                "currency_name": "TJS",
                "organisation_name": "API Org",
                "organisation_avatar_url": "https://example.com/logo.png",
                "work_format_name": "Полная занятость",
                "region_id_name": "Душанбе"
            }
        ]
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_data

    mock_client = MagicMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("httpx.AsyncClient", return_value=mock_client):
        res = await client.post("/api/v1/jobs/sync/yora?max_pages=1")
        assert res.status_code == 200
        res_json = res.json()
        assert res_json["status"] == "success"
        assert res_json["stats"]["created"] == 1

        # Check job search endpoint returns external job
        jobs_res = await client.get("/api/v1/jobs")
        assert jobs_res.status_code == 200
        jobs_json = jobs_res.json()
        matching = [j for j in jobs_json["items"] if j.get("external_id") == "999002"]
        assert len(matching) == 1
        job = matching[0]
        assert job["is_external"] is True
        assert job["external_url"] == "https://yora.tj/ru/vacancies/999002"
        assert job["external_company_name"] == "API Org"
