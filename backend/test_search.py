from duckduckgo_search import DDGS
import json

def test_search(backend='api'):
    print(f"Testing backend: {backend}")
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text("python", max_results=3, backend=backend))
            if results:
                print(f"Success with {backend}!")
                print(json.dumps(results[0], indent=2, ensure_ascii=False))
                return True
            else:
                print(f"No results with {backend}.")
                return False
    except Exception as e:
        print(f"Failed with {backend}: {e}")
        return False

print("--- Starting Search Connectivity Test ---")
backends = ['api', 'html', 'lite']
for b in backends:
    if test_search(b):
        break
