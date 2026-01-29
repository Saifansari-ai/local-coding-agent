from agents.reasoner import LLMEngine

class ReviewerAgent:
    def __init__(self, llm_engine: LLMEngine):
        self.llm = llm_engine

    def review_code(self, code: str, analysis: str) -> str:
        """
        Reviews the generated code for quality and correctness.
        """
        system_prompt = "You are a Reviewer Agent. Review the generated code against the user's intent. Check for logic errors, syntax issues, and improvements. If the code is good, say 'Code looks good'."
        prompt = f"{system_prompt}\n### Intent:\n{analysis}\n### Generated Code:\n{code}\n### Review:\n"
        
        full_review = ""
        for chunk in self.llm.stream_completion(prompt):
            full_review += chunk
            
        return full_review.strip()
