import pytest

@pytest.mark.asyncio
async def test_chat_creation_and_messaging(client):
    u1_reg = {"email": "user1_chat@example.com", "username": "user1_chat", "password": "password123"}
    u2_reg = {"email": "user2_chat@example.com", "username": "user2_chat", "password": "password123"}
    await client.post("/api/v1/auth/register/worker", json=u1_reg)
    await client.post("/api/v1/auth/register/worker", json=u2_reg)

    l1 = await client.post("/api/v1/auth/login", json={"email": "user1_chat@example.com", "password": "password123"})
    l2 = await client.post("/api/v1/auth/login", json={"email": "user2_chat@example.com", "password": "password123"})

    u1_token = l1.json()["access_token"]
    u2_token = l2.json()["access_token"]
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
