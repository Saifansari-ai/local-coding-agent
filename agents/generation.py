from agents.reasoner import LLMEngine

class GenerationAgent:
    def __init__(self, llm_engine: LLMEngine):
        self.llm = llm_engine

    def generate_code(self, plan: str) -> str:
        """
        Generates the code based on the provided plan.
        """
        system_prompt = "You are a Generation Agent. Your task is to write the code exactly as described in the plan. Provide only the code, with necessary comments."
        prompt = f"{system_prompt}\n### Plan:\n{plan}\n### Code:\n"
        
        full_code = ""
        for chunk in self.llm.stream_completion(prompt, max_tokens=4096): # Allow more tokens for code
            full_code += chunk
            
        return full_code.strip()
