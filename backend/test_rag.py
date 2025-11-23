from app.services.rag_service import rag_service
import json

def test_query(query):
    print(f"\n--- Testing Query: {query} ---")
    results = rag_service.search(query, num_results=3)
    if not results:
        print("No results found.")
    for i, r in enumerate(results):
        print(f"Result {i+1}: {r['title']} - {r['url']}")
        print(f"Snippet: {r['content'][:100]}...")

if __name__ == "__main__":
    test_query("Python FastAPI tutorial")
    test_query("Latest news about SpaceX")
    test_query("How to cook pasta")
