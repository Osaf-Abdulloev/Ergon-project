import pytest

@pytest.mark.asyncio
async def test_worker_registration_and_login(client):
    reg_payload = {
        "email": "worker@example.com",
        "username": "worker1",
        "password": "password123",
        "city": "Dushanbe"
    }
    res = await client.post("/api/v1/auth/register/worker", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "worker@example.com"
    assert data["role"] == "worker"

    login_payload = {
        "email": "worker@example.com",
        "password": "password123"
    }
    res_login = await client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    token_data = res_login.json()
    assert "access_token" in token_data
    assert "refresh_token" in token_data
    assert token_data["role"] == "worker"

    refresh_payload = {
        "refresh_token": token_data["refresh_token"]
    }
    res_refresh = await client.post("/api/v1/auth/refresh", json=refresh_payload)
    assert res_refresh.status_code == 200
    new_token_data = res_refresh.json()
    assert "access_token" in new_token_data
    assert new_token_data["refresh_token"] != token_data["refresh_token"]

    res_reuse = await client.post("/api/v1/auth/refresh", json=refresh_payload)
    assert res_reuse.status_code == 401

@pytest.mark.asyncio
async def test_employer_registration(client):
    reg_payload = {
        "email": "employer@example.com",
        "username": "employer1",
        "password": "password123",
        "company_name": "Tech Corp",
        "industry": "IT"
    }
    res = await client.post("/api/v1/auth/register/employer", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "employer@example.com"
    assert data["role"] == "employer"
