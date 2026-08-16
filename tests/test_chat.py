import pytest

@pytest.mark.asyncio
async def test_chat_creation_and_messaging(client):
    u1_reg = {"email": "user1_chat@example.com", "username": "user1_chat", "password": "password123"}
    u2_reg = {"email": "user2_chat@example.com", "username": "user2_chat", "password": "password123"}
    await client.post("/api/v1/auth/register/worker", json=u1_reg)
    await client.post("/api/v1/auth/register/worker", json=u2_reg)

    from tests.conftest import get_captured_code
    code1 = get_captured_code("user1_chat@example.com")
    code2 = get_captured_code("user2_chat@example.com")
    v1 = await client.post("/api/v1/auth/verify-email", json={"email": "user1_chat@example.com", "code": code1})
    v2 = await client.post("/api/v1/auth/verify-email", json={"email": "user2_chat@example.com", "code": code2})

    u1_token = v1.json()["access_token"]
    u2_token = v2.json()["access_token"]
    u2_id = (await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {u2_token}"})).json()["id"]

    h1 = {"Authorization": f"Bearer {u1_token}"}
    h2 = {"Authorization": f"Bearer {u2_token}"}

    create_chat_res = await client.post("/api/v1/chats", json={"recipient_user_id": u2_id}, headers=h1)
    assert create_chat_res.status_code == 201
    chat = create_chat_res.json()
    chat_id = chat["id"]

    send_msg_res = await client.post(
        f"/api/v1/chats/{chat_id}/messages",
        json={"chat_id": chat_id, "type": "text", "content": "Hello world!"},
        headers=h1
    )
    assert send_msg_res.status_code == 201
    msg = send_msg_res.json()
    assert msg["content"] == "Hello world!"

    hist_res = await client.get(f"/api/v1/chats/{chat_id}/messages", headers=h2)
    assert hist_res.status_code == 200
    messages = hist_res.json()["items"]
    assert len(messages) == 1
    assert messages[0]["content"] == "Hello world!"

    # Test Uploading Chat Image
    files = {"file": ("test_image.png", b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01", "image/png")}
    upload_res = await client.post("/api/v1/files/upload", data={"folder": "chat"}, files=files, headers=h1)
    assert upload_res.status_code == 201
    img_url = upload_res.json()["url"]
    assert "/api/v1/files/chat/" in img_url

    # Test Sending Image Message
    send_img_msg = await client.post(
        f"/api/v1/chats/{chat_id}/messages",
        json={"chat_id": chat_id, "type": "image", "content": img_url},
        headers=h1
    )
    assert send_img_msg.status_code == 201
    img_msg_data = send_img_msg.json()
    assert img_msg_data["type"] == "image"
    assert img_msg_data["content"] == img_url
