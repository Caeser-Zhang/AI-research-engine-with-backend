from sqlalchemy.orm import Session
from app.models.chat import Conversation, Message, Source
from typing import List, Dict

class MemoryService:
    def create_conversation(self, db: Session, title: str = "New Chat", id: str = None) -> Conversation:
        if id:
            conversation = Conversation(id=id, title=title)
        else:
            # Fallback if no ID provided (shouldn't happen with current frontend logic)
            import uuid
            conversation = Conversation(id=str(uuid.uuid4()), title=title)
            
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation

    def get_conversation(self, db: Session, conversation_id: str) -> Conversation:
        return db.query(Conversation).filter(Conversation.id == conversation_id).first()

    def get_conversations(self, db: Session, skip: int = 0, limit: int = 10) -> List[Conversation]:
        return db.query(Conversation).offset(skip).limit(limit).all()

    def add_message(self, db: Session, conversation_id: str, role: str, content: str, sources: List[Dict] = None) -> Message:
        message = Message(conversation_id=conversation_id, role=role, content=content)

        db.add(message)
        db.commit()
        db.refresh(message)

        if sources:
            for src in sources:
                source_entry = Source(
                    message_id=message.id,
                    url=src.get('url'),
                    title=src.get('title'),
                    snippet=src.get('content')
                )
                db.add(source_entry)
            db.commit()
        
        return message

    def get_history(self, db: Session, conversation_id: str) -> List[Message]:
        return db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).all()

memory_service = MemoryService()
