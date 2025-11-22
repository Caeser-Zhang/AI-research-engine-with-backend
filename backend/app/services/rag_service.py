# from langchain_community.tools import DuckDuckGoSearchRun
from typing import List, Dict

try:
    from sentence_transformers import CrossEncoder
except ImportError:
    CrossEncoder = None


class RAGService:
    def __init__(self):
        # self.search_tool = DuckDuckGoSearchRun()

        # Initialize reranker model (lightweight)
        # We use a try-except block to avoid crashing if model download fails or is slow
        self.reranker = None
        if CrossEncoder:
            try:
                self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
            except Exception as e:
                print(f"Warning: Could not load reranker model: {e}")


    def search(self, query: str, num_results: int = 5) -> List[Dict]:
        # DuckDuckGoSearchRun returns a string, we might need a better wrapper for structured results
        # For now, let's use the simple string output and wrap it
        # In a real production app, we'd use a proper search API (Google/Bing)
        # results_text = self.search_tool.run(query)

        
        # Mocking structured results from the text blob for now as DDG tool is simple
        # A better approach would be using `duckduckgo-search` python package directly
        from duckduckgo_search import DDGS
        
        results = []
        try:
            with DDGS() as ddgs:
                ddgs_gen = ddgs.text(query, max_results=num_results)
                if ddgs_gen:
                    for r in ddgs_gen:
                        results.append({
                            "title": r['title'],
                            "url": r['href'],
                            "content": r['body']
                        })
        except Exception as e:
            print(f"Search failed: {e}")
            # Return empty results so the chat can continue without sources
            return []
            
        return results

    def rerank(self, query: str, documents: List[Dict], top_k: int = 3) -> List[Dict]:
        if not self.reranker or not documents:
            return documents[:top_k]

        pairs = [[query, doc['content']] for doc in documents]
        scores = self.reranker.predict(pairs)
        
        # Attach scores
        for i, doc in enumerate(documents):
            doc['score'] = float(scores[i])
            
        # Sort by score descending
        sorted_docs = sorted(documents, key=lambda x: x.get('score', 0), reverse=True)
        return sorted_docs[:top_k]

rag_service = RAGService()
