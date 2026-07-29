import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import Chat, ChatParticipant, Message, Notification
from app.models.enums import MessageType, NotificationType
from app.schemas.chat import MessageCreate
from app.repositories.chat import ChatRepository, MessageRepository
from app.repositories.user import UserRepository
from app.repositories.notification import NotificationRepository
from app.core.exceptions import NotFoundException, ForbiddenException, ConflictException

class ChatService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.chat_repo = ChatRepository(session)
        self.msg_repo = MessageRepository(session)
        self.user_repo = UserRepository(session)
        self.notif_repo = NotificationRepository(session)

    async def get_or_create_chat(self, user1_id: uuid.UUID, user2_id: uuid.UUID) -> Chat:
        if user1_id == user2_id:
            raise ConflictException("Cannot start a chat with yourself")

        recipient = await self.user_repo.get_by_id(user2_id)
        if not recipient:
            raise NotFoundException("Recipient user not found")

        chat = await self.chat_repo.find_existing_chat(user1_id, user2_id)
        if not chat:
            chat = Chat()
            chat = await self.chat_repo.create(chat)

            p1 = ChatParticipant(chat_id=chat.id, user_id=user1_id)
            p2 = ChatParticipant(chat_id=chat.id, user_id=user2_id)
            self.session.add_all([p1, p2])
            await self.session.flush()
            await self.session.commit()

        return await self.chat_repo.get_chat_with_participants(chat.id)

    async def send_message(self, sender_id: uuid.UUID, data: MessageCreate) -> Message:
        is_part = await self.chat_repo.is_participant(data.chat_id, sender_id)
        if not is_part:
            raise ForbiddenException("Not a participant in this chat")

        message = Message(
            chat_id=data.chat_id,
            sender_id=sender_id,
            type=data.type,
            content=data.content,
            is_read=False
        )
        message = await self.msg_repo.create(message)

        chat = await self.chat_repo.get_chat_with_participants(data.chat_id)
        if chat:
            for p in chat.participants:
                if p.user_id != sender_id:
                    notif = Notification(
                        user_id=p.user_id,
                        type=NotificationType.NEW_MESSAGE,
                        payload={
                            "chat_id": str(data.chat_id),
                            "message_id": str(message.id),
                            "sender_id": str(sender_id),
                            "content": data.content[:100]
                        }
                    )
                    await self.notif_repo.create(notif)

        await self.session.commit()
        return message

    async def get_user_chats(self, user_id: uuid.UUID, skip: int = 0, limit: int = 20) -> Tuple[List[Chat], int]:
        return await self.chat_repo.get_user_chats(user_id, skip=skip, limit=limit)

    async def get_chat_messages(
        self,
        user_id: uuid.UUID,
        chat_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Message], int]:
        is_part = await self.chat_repo.is_participant(chat_id, user_id)
        if not is_part:
            raise ForbiddenException("Not a participant in this chat")

        await self.msg_repo.mark_messages_as_read(chat_id, user_id)
        await self.session.commit()
        return await self.msg_repo.get_chat_messages(chat_id, skip=skip, limit=limit)
