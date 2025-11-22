from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_db
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service
from app.services.memory_service import memory_service
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class SearchRequest(BaseModel):
    query: str

class SourceModel(BaseModel):
    title: str
    url: str
    snippet: str

@router.post("/search", response_model=List[SourceModel])
async def search_endpoint(request: SearchRequest):
    try:
        # Search
        search_results = rag_service.search(request.query)
        # Rerank (optional here, but good for quality)
        reranked_results = rag_service.rerank(request.query, search_results)
        
        return [SourceModel(title=r['title'], url=r['url'], snippet=r['content']) for r in reranked_results]
    except Exception as e:
        print(f"Error in search endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: List[SourceModel]

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from app.services.history_service import MySQLChatMessageHistory

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        # 1. Manage Conversation ID
        conversation_id = request.conversation_id
        if not conversation_id:
            # Generate a new ID if not provided (though frontend should provide one)
            import uuid
            conversation_id = f"sess_{uuid.uuid4()}"

        print(f"DEBUG: Using Conversation ID: {conversation_id}")

        # 2. Retrieve Context (RAG)
        # Search
        search_results = rag_service.search(request.message)
        # Rerank
        reranked_results = rag_service.rerank(request.message, search_results)
        
        # Format context
        context_str = "\n\n".join([f"Source: {doc['title']}\nURL: {doc['url']}\nContent: {doc['content']}" for doc in reranked_results])
        
        # 3. Prepare Prompt & Chain
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful AI research assistant. Use the following context to answer the user's question.
            If the answer is not in the context, say so, but try to be helpful based on your general knowledge.
            Always cite your sources if you use them.
            
            Context:
            {context}"""),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])

        llm = llm_service.get_llm()
        chain = prompt | llm

        # 4. Wrap with History
        def get_session_history(session_id: str) -> MySQLChatMessageHistory:
            return MySQLChatMessageHistory(session_id=session_id)

        chain_with_history = RunnableWithMessageHistory(
            chain,
            get_session_history,
            input_messages_key="input",
            history_messages_key="history",
        )

        # 5. Invoke Chain
        # The history manager handles loading history and saving the new user & AI messages
        response = chain_with_history.invoke(
            {"input": request.message, "context": context_str},
            config={"configurable": {"session_id": conversation_id}},
        )
        
        response_content = response.content

        # 6. Save Sources (Manual step as LangChain history only saves messages)
        # We need to find the last AI message added and attach sources
        # Since MySQLChatMessageHistory saves immediately, we can add sources to the last message in DB
        # Or we can just use memory_service to add sources to the last message.
        # Let's use memory_service to find the last message and update it.
        from app.models.chat import Message, Source
        try:
            last_msg = db.query(Message).filter(
                Message.conversation_id == conversation_id,
                Message.role == 'assistant'
            ).order_by(Message.created_at.desc()).first()
            
            if last_msg and reranked_results:
                for src in reranked_results:
                    source_entry = Source(
                        message_id=last_msg.id,
                        url=src.get('url'),
                        title=src.get('title'),
                        snippet=src.get('content')
                    )
                    db.add(source_entry)
                db.commit()
        except Exception as e:
            print(f"Error saving sources: {e}")

        # 7. Return Response
        return ChatResponse(
            response=response_content,
            conversation_id=conversation_id,
            sources=[SourceModel(title=r['title'], url=r['url'], snippet=r['content']) for r in reranked_results]
        )

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{conversation_id}")
async def get_history(conversation_id: int, db: Session = Depends(get_db)):
    history = memory_service.get_history(db, conversation_id)
    if not history:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return history
