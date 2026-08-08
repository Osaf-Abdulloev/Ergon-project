import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.domain import Chat, ChatParticipant, Message, Notification, User, Application
from app.models.enums import MessageType, NotificationType, UserRole
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
        # 0. Check if user2_id is actually an existing Chat ID
        existing_chat_by_id = await self.chat_repo.get_chat_with_participants(user2_id)
        if existing_chat_by_id:
            is_part = any(p.user_id == user1_id for p in existing_chat_by_id.participants)
            if not is_part:
                p1 = ChatParticipant(chat_id=existing_chat_by_id.id, user_id=user1_id)
                self.session.add(p1)
                await self.session.commit()
                existing_chat_by_id = await self.chat_repo.get_chat_with_participants(user2_id)
            return existing_chat_by_id

        if user1_id == user2_id:
            # Fallback for self-test: resolve a worker or employer user
            user1_res = await self.session.execute(select(User).where(User.id == user1_id))
            user1_obj = user1_res.scalars().first()
            if user1_obj and user1_obj.role == UserRole.EMPLOYER:
                worker_res = await self.session.execute(select(User).where(User.role == UserRole.WORKER))
                candidate_user = worker_res.scalars().first()
                if candidate_user:
                    user2_id = candidate_user.id

        # 1. Resolve recipient user
        recipient = await self.user_repo.get_by_id(user2_id)
        if not recipient:
            # Check if user2_id is an Application ID
            app_res = await self.session.execute(select(Application).where(Application.id == user2_id))
            app_obj = app_res.scalars().first()
            if app_obj and app_obj.worker_id:
                user2_id = app_obj.worker_id
                recipient = await self.user_repo.get_by_id(user2_id)

        if not recipient:
            raise NotFoundException("Recipient user not found")

        # 2. Check existing chat between user1_id and user2_id
        chat = await self.chat_repo.find_existing_chat(user1_id, user2_id)
        if not chat:
            chat = Chat(last_message_at=datetime.now(timezone.utc))
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
            chat = await self.chat_repo.get_by_id(data.chat_id)
            if chat:
                p = ChatParticipant(chat_id=data.chat_id, user_id=sender_id)
                self.session.add(p)
                await self.session.flush()
            else:
                raise ForbiddenException("Not a participant in this chat")

        # Deduplicate client message ID if provided
        if data.client_msg_id:
            existing_msg = await self.msg_repo.get_by_client_msg_id(data.chat_id, data.client_msg_id)
            if existing_msg:
                return existing_msg

        now = datetime.now(timezone.utc)
        message = Message(
            chat_id=data.chat_id,
            sender_id=sender_id,
            type=data.type,
            content=data.content,
            client_msg_id=data.client_msg_id,
            is_read=False
        )
        message = await self.msg_repo.create(message)

        # Update chat last_message_at
        chat = await self.chat_repo.get_by_id(data.chat_id)
        if chat:
            chat.last_message_at = now
            self.session.add(chat)

        chat_with_parts = await self.chat_repo.get_chat_with_participants(data.chat_id)
        if chat_with_parts:
            for p in chat_with_parts.participants:
                if p.user_id != sender_id:
                    notif = Notification(
                        user_id=p.user_id,
                        type=NotificationType.NEW_MESSAGE,
                        title="Новое сообщение",
                        body=data.content[:100],
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

    async def edit_message(self, user_id: uuid.UUID, message_id: uuid.UUID, new_content: str) -> Message:
        message = await self.msg_repo.get_by_id(message_id)
        if not message or message.is_deleted:
            raise NotFoundException("Message not found")

        if message.sender_id != user_id:
            raise ForbiddenException("You can only edit your own messages")

        message.content = new_content
        message.is_edited = True
        message.edited_at = datetime.now(timezone.utc)
        await self.msg_repo.update(message)
        await self.session.commit()
        return message

    async def delete_message(self, user_id: uuid.UUID, message_id: uuid.UUID) -> Message:
        message = await self.msg_repo.get_by_id(message_id)
        if not message:
            raise NotFoundException("Message not found")

        if message.sender_id != user_id:
            raise ForbiddenException("You can only delete your own messages")

        message.is_deleted = True
        message.content = "Сообщение удалено"
        await self.msg_repo.update(message)
        await self.session.commit()
        return message

    async def get_user_chats(self, user_id: uuid.UUID, skip: int = 0, limit: int = 20) -> Tuple[List[Chat], int]:
        chats, total = await self.chat_repo.get_user_chats(user_id, skip=skip, limit=limit)
        # Populate unread count dynamically for each chat
        for chat in chats:
            unread = await self.chat_repo.get_unread_count_for_chat(chat.id, user_id)
            setattr(chat, 'unread_count', unread)
        return chats, total

    async def get_chat_messages(
        self,
        user_id: uuid.UUID,
        chat_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Message], int]:
        is_part = await self.chat_repo.is_participant(chat_id, user_id)
        if not is_part:
            p = ChatParticipant(chat_id=chat_id, user_id=user_id)
            self.session.add(p)
            await self.session.flush()

        await self.msg_repo.mark_messages_as_read(chat_id, user_id)
        await self.session.commit()
        return await self.msg_repo.get_chat_messages(chat_id, skip=skip, limit=limit)

    async def delete_chat(self, user_id: uuid.UUID, chat_id: uuid.UUID) -> bool:
        from sqlalchemy import delete
        from app.websocket.manager import ws_manager

        chat = await self.chat_repo.get_chat_with_participants(chat_id)
        if not chat:
            raise NotFoundException("Chat not found")

        is_part = any(p.user_id == user_id for p in chat.participants)
        if not is_part:
            raise ForbiddenException("You are not a participant in this chat")

        p_ids = [p.user_id for p in chat.participants]

        await self.session.execute(delete(Message).where(Message.chat_id == chat_id))
        await self.session.execute(delete(ChatParticipant).where(ChatParticipant.chat_id == chat_id))
        await self.session.execute(delete(Chat).where(Chat.id == chat_id))
        await self.session.commit()

        await ws_manager.broadcast_to_participants(p_ids, {
            "event": "chat_deleted",
            "chat_id": str(chat_id)
        })
        return True
