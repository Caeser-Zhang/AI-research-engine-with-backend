from langchain_community.chat_models import ChatOllama
from app.core.config import settings

class LLMService:
    def __init__(self):
        self.llm = ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model="qwen3:14b"
        )

    def get_llm(self):
        return self.llm

llm_service = LLMService()
