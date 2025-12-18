import requests
import json
import config

class LLMClient:
    def __init__(self, url=config.OLLAMA_URL, model=config.OLLAMA_MODEL):
        self.url = url
        self.model = model

    def generate(self, prompt, system_prompt="You are a helpful voice assistant. Keep answers short and concise."):
        """
        Yields text chunks from Ollama.
        """
        payload = {
            "model": self.model,
            "prompt": f"{system_prompt}\nUser: {prompt}\nAssistant:",
            "stream": True,
            "options": {
                "num_predict": 100 # limit response length for speed
            }
        }
        
        try:
            with requests.post(self.url, json=payload, stream=True) as r:
                r.raise_for_status()
                for line in r.iter_lines():
                    if line:
                        body = json.loads(line)
                        if "response" in body:
                            yield body["response"]
        except requests.exceptions.ConnectionError:
            yield "I cannot connect to the brain."

