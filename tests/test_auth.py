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

    from tests.conftest import get_captured_code
    code = get_captured_code("worker@example.com")
    res_verify = await client.post("/api/v1/auth/verify-email", json={"email": "worker@example.com", "code": code})
    assert res_verify.status_code == 200
    token_data = res_verify.json()
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

@pytest.mark.asyncio
async def test_login_unverified_user_triggers_code_dispatch(client):
    reg_payload = {
        "email": "unverified_login@example.com",
        "username": "unverified_user",
        "password": "password123",
        "city": "Dushanbe"
    }
    reg_res = await client.post("/api/v1/auth/register/worker", json=reg_payload)
    assert reg_res.status_code == 201

    # Attempt login with unverified account
    login_payload = {
        "email": "unverified_login@example.com",
        "password": "password123"
    }
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 403
    err_detail = login_res.json()["detail"]
    assert err_detail["email"] == "unverified_login@example.com"

    # Check that code was generated and dispatched
    from tests.conftest import get_captured_code
    code = get_captured_code("unverified_login@example.com")
    assert len(code) == 6

    # Confirm email verification using dispatched code
    verify_res = await client.post("/api/v1/auth/verify-email", json={"email": "unverified_login@example.com", "code": code})
    assert verify_res.status_code == 200
    assert "access_token" in verify_res.json()

@pytest.mark.asyncio
async def test_superadmin_hard_delete_user(client, db_session):
    from tests.conftest import get_captured_code
    from app.models.domain import User
    from app.models.enums import UserRole
    from sqlalchemy import select

    # 1. Register candidate user to be deleted
    w_reg = {"email": "to_be_deleted@example.com", "username": "delete_me", "password": "password123"}
    await client.post("/api/v1/auth/register/worker", json=w_reg)
    w_code = get_captured_code("to_be_deleted@example.com")
    w_verify = await client.post("/api/v1/auth/verify-email", json={"email": "to_be_deleted@example.com", "code": w_code})
    victim_token = w_verify.json()["access_token"]
    victim_headers = {"Authorization": f"Bearer {victim_token}"}

    # Fetch victim user profile ID
    me_res = await client.get("/api/v1/users/me", headers=victim_headers)
    victim_id = me_res.json()["id"]

    # 2. Register admin user
    a_reg = {"email": "superadmin_del@example.com", "username": "superadmin_del", "password": "password123"}
    await client.post("/api/v1/auth/register/worker", json=a_reg)
    a_code = get_captured_code("superadmin_del@example.com")
    a_verify = await client.post("/api/v1/auth/verify-email", json={"email": "superadmin_del@example.com", "code": a_code})
    admin_token = a_verify.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Promote to admin role in test DB
    admin_obj = (await db_session.execute(select(User).where(User.email == "superadmin_del@example.com"))).scalar_one()
    admin_obj.role = UserRole.ADMIN
    await db_session.commit()
    admin_id = str(admin_obj.id)

    # 3. Worker attempts hard delete -> should fail (403)
    fail_del = await client.delete(f"/api/v1/admin/users/{victim_id}", headers=victim_headers)
    assert fail_del.status_code == 403

    # 4. Admin attempts self-deletion -> should fail (400)
    self_del = await client.delete(f"/api/v1/admin/users/{admin_id}", headers=admin_headers)
    assert self_del.status_code == 400

    # 5. Admin hard-deletes victim user -> should succeed (200)
    succ_del = await client.delete(f"/api/v1/admin/users/{victim_id}", headers=admin_headers)
    assert succ_del.status_code == 200

    # 6. Verify victim is gone from DB
    after_me = await client.get("/api/v1/users/me", headers=victim_headers)
    assert after_me.status_code == 401 or after_me.status_code == 404



