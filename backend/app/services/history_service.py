from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from app.core.database import SessionLocal
from app.models.chat import Message as DBMessage
from app.models.chat import Conversation

class MySQLChatMessageHistory(BaseChatMessageHistory):
    def __init__(self, session_id: str):
        self.session_id = session_id

    @property
    def messages(self) -> list[BaseMessage]:
        db = SessionLocal()
        try:
            # Ensure conversation exists
            conversation = db.query(Conversation).filter(Conversation.id == self.session_id).first()
            if not conversation:
                return []
            
            db_messages = db.query(DBMessage).filter(DBMessage.conversation_id == self.session_id).order_by(DBMessage.created_at.asc()).all()
            lc_messages = []
            for msg in db_messages:
                if msg.role == 'user':
                    lc_messages.append(HumanMessage(content=msg.content))
                elif msg.role == 'assistant':
                    lc_messages.append(AIMessage(content=msg.content))
            return lc_messages
        finally:
            db.close()

    def add_message(self, message: BaseMessage) -> None:
        db = SessionLocal()
        try:
            # Ensure conversation exists (create if not)
            conversation = db.query(Conversation).filter(Conversation.id == self.session_id).first()
            if not conversation:
                conversation = Conversation(id=self.session_id, title=message.content[:30])
                db.add(conversation)
                db.commit()

            role = "user" if isinstance(message, HumanMessage) else "assistant"
            db_msg = DBMessage(
                conversation_id=self.session_id,
                role=role,
                content=message.content
            )
            db.add(db_msg)
            db.commit()
        finally:
            db.close()

    def clear(self) -> None:
        pass
