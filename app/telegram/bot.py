import httpx
from app.core.config import settings

class TelegramBotService:
    def __init__(self, token: str = settings.TELEGRAM_BOT_TOKEN, chat_id: str = settings.TELEGRAM_CHAT_ID):
        self.token = token
        self.chat_id = chat_id
        self.base_url = f"https://api.telegram.org/bot{self.token}"

    async def send_message_async(self, text: str, target_chat_id: str = None) -> bool:
        cid = target_chat_id or self.chat_id
        if not self.token or not cid:
            return False

        url = f"{self.base_url}/sendMessage"
        payload = {
            "chat_id": cid,
            "text": text,
            "parse_mode": "HTML"
        }
        async with httpx.AsyncClient() as client:
            try:
                res = await client.post(url, json=payload, timeout=10.0)
                return res.status_code == 200
            except Exception:
                return False

    def send_message_sync(self, text: str, target_chat_id: str = None) -> bool:
        cid = target_chat_id or self.chat_id
        if not self.token or not cid:
            return False

        url = f"{self.base_url}/sendMessage"
        payload = {
            "chat_id": cid,
            "text": text,
            "parse_mode": "HTML"
        }
        try:
            with httpx.Client() as client:
                res = client.post(url, json=payload, timeout=10.0)
                return res.status_code == 200
        except Exception:
            return False

telegram_bot = TelegramBotService()
