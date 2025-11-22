from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(255), primary_key=True, index=True)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(255), ForeignKey("conversations.id"))
    role = Column(String(50)) # user, assistant, system
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
    sources = relationship("Source", back_populates="message", cascade="all, delete-orphan")

class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"))

    url = Column(String(1024))
    title = Column(String(1024))
    snippet = Column(Text)
    
    message = relationship("Message", back_populates="sources")
