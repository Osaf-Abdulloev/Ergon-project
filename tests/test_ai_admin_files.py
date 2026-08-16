import io
import pytest

@pytest.mark.asyncio
async def test_ai_admin_and_file_endpoints(client):
    w_reg = {"email": "ai_user@example.com", "username": "ai_user", "password": "password123"}
    await client.post("/api/v1/auth/register/worker", json=w_reg)
    from tests.conftest import get_captured_code
    w_code = get_captured_code("ai_user@example.com")
    w_verify = await client.post("/api/v1/auth/verify-email", json={"email": "ai_user@example.com", "code": w_code})
    w_token = w_verify.json()["access_token"]
    w_headers = {"Authorization": f"Bearer {w_token}"}

    ai_chat_res = await client.post(
        "/api/v1/ai/chat",
        json={"prompt": "search job Python developer"},
        headers=w_headers
    )
    assert ai_chat_res.status_code == 200
    assert "result" in ai_chat_res.json()

    ai_analyze_res = await client.post(
        "/api/v1/ai/analyze-resume",
        json={"resume_text": "Experienced Python Developer proficient in FastAPI, SQL, Docker, Git."},
        headers=w_headers
    )
    assert ai_analyze_res.status_code == 202

    dummy_file = ("test.txt", io.BytesIO(b"Hello world resume content"), "text/plain")
    file_upload_res = await client.post(
        "/api/v1/files/upload",
        files={"file": dummy_file},
        data={"folder": "resumes"},
        headers=w_headers
    )
    assert file_upload_res.status_code == 201
    file_info = file_upload_res.json()
    assert "file_url" in file_info
    assert "relative_path" in file_info

    get_file_res = await client.get(file_info["file_url"], headers=w_headers)
    assert get_file_res.status_code == 200
    assert get_file_res.content == b"Hello world resume content"

    analytics_res = await client.get("/api/v1/admin/stats", headers=w_headers)
    assert analytics_res.status_code == 403
