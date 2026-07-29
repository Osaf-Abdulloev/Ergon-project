import pytest

@pytest.mark.asyncio
async def test_search_and_pagination_edge_cases(client):
    res_empty = await client.get("/api/v1/jobs?title=NonExistentJob12345")
    assert res_empty.status_code == 200
    data = res_empty.json()
    assert data["items"] == []
    assert data["total"] == 0

    res_invalid_page = await client.get("/api/v1/jobs?page=0")
    assert res_invalid_page.status_code == 422

    res_workers = await client.get("/api/v1/users/workers")
    assert res_workers.status_code == 200
    assert "items" in res_workers.json()
