from app.core.database import get_db
from app.services.memory_service import memory_service
from app.models.chat import Conversation, Message

db = next(get_db())

print("--- Conversations ---")
conversations = db.query(Conversation).all()
for c in conversations:
    print(f"ID: {c.id}, Title: {c.title}")

print("\n--- Messages ---")
messages = db.query(Message).all()
for m in messages:
    print(f"ConvID: {m.conversation_id}, Role: {m.role}, Content: {m.content[:50]}...")
