import os
import sys
from typing import Optional, Generator, List

try:
    from llama_cpp import Llama
except ImportError:
    print("CRITICAL: llama-cpp-python is not installed.")
    print("Please run: pip install llama-cpp-python")
    sys.exit(1)

class LLMEngine:
    def __init__(self, model_path: str, n_threads: int = 4):
        """
        Inference Engine optimized for CPU (Ryzen 3).
        
        Args:
            model_path: Absolute path to the .gguf model file.
            n_threads: Number of threads. Set to 4 for Ryzen 3 (4 cores).
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at: {model_path}")
            
        print(f"Loading DeepSeek Coder from {model_path}...")
        # Initialize llama.cpp with optimizations
        self.llm = Llama(
            model_path=model_path,
            n_ctx=4096,      # DeepSeek context window
            n_threads=n_threads,
            n_gpu_layers=0,  # Force CPU usage
            verbose=False,   # Reduce log noise
            use_mmap=True,   # Faster model loading
            use_mlock=False  # Allow OS to manage memory
        )
        print("Model loaded successfully.")

    def stream_completion(
        self, 
        prompt: str, 
        stop_words: Optional[List[str]] = None,
        max_tokens: int = 2048
    ) -> Generator[str, None, None]:
        """
        Generic streaming completion method.
        """
        if stop_words is None:
            stop_words = ["<|EOT|>", "### Instruction", "### Response"]

        stream = self.llm(
            prompt,
            max_tokens=max_tokens,
            stop=stop_words,
            temperature=0.1,
            top_p=0.95,
            stream=True
        )

        for output in stream:
            chunk = output["choices"][0]["text"]
            if chunk:
                yield chunk

class ReasonerAgent:
    def __init__(self, llm_engine: LLMEngine):
        self.llm = llm_engine

    def reason(self, user_input: str, context_code: str = "") -> str:
        """
        Analyzes the user's request to understand the intent.
        """
        system_prompt = "You are a Reasoning Agent. Your job is to analyze the user's request and understand what they are trying to ask. Explain the user's intent clearly and concisely."
        prompt = f"{system_prompt}\n### User Input:\n{user_input}\n### Context:\n{context_code}\n### Analysis:\n"
        
        full_response = ""
        # We need to collect the full response for the next agent
        for chunk in self.llm.stream_completion(prompt):
            full_response += chunk
            # Optionally print/log reasoning progress here if needed
            
        return full_response.strip()
