import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from app.models.domain import Chat, ChatParticipant, Message, User
from app.repositories.base import BaseRepository

class ChatRepository(BaseRepository[Chat]):
    def __init__(self, session: AsyncSession):
        super().__init__(Chat, session)

    async def find_existing_chat(self, user1_id: uuid.UUID, user2_id: uuid.UUID) -> Optional[Chat]:
        sub1 = select(ChatParticipant.chat_id).where(ChatParticipant.user_id == user1_id)
        sub2 = select(ChatParticipant.chat_id).where(ChatParticipant.user_id == user2_id)
        query = select(Chat).where(Chat.id.in_(sub1), Chat.id.in_(sub2))
        result = await self.session.execute(query)
        return result.scalars().first()

    async def get_user_chats(self, user_id: uuid.UUID, skip: int = 0, limit: int = 20) -> Tuple[List[Chat], int]:
        chat_ids_query = select(ChatParticipant.chat_id).where(ChatParticipant.user_id == user_id)
        query = select(Chat).options(
            selectinload(Chat.participants).selectinload(ChatParticipant.user),
            selectinload(Chat.messages)
        ).where(Chat.id.in_(chat_ids_query))

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar_one()

        result = await self.session.execute(query.order_by(Chat.created_at.desc()).offset(skip).limit(limit))
        return list(result.scalars().all()), total

    async def get_chat_with_participants(self, chat_id: uuid.UUID) -> Optional[Chat]:
        result = await self.session.execute(
            select(Chat).options(selectinload(Chat.participants).selectinload(ChatParticipant.user)).where(Chat.id == chat_id)
        )
        return result.scalars().first()

    async def is_participant(self, chat_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            select(ChatParticipant).where(ChatParticipant.chat_id == chat_id, ChatParticipant.user_id == user_id)
        )
        return result.scalars().first() is not None

class MessageRepository(BaseRepository[Message]):
    def __init__(self, session: AsyncSession):
        super().__init__(Message, session)

    async def get_chat_messages(
        self,
        chat_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Message], int]:
        query = select(Message).where(Message.chat_id == chat_id)
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar_one()

        result = await self.session.execute(
            query.order_by(Message.created_at.desc()).offset(skip).limit(limit)
        )
        messages = list(result.scalars().all())
        messages.reverse()
        return messages, total

    async def mark_messages_as_read(self, chat_id: uuid.UUID, user_id: uuid.UUID) -> None:
        result = await self.session.execute(
            select(Message).where(Message.chat_id == chat_id, Message.sender_id != user_id, Message.is_read == False)
        )
        messages = result.scalars().all()
        for msg in messages:
            msg.is_read = True
        await self.session.flush()
