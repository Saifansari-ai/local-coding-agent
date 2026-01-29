from agents.reasoner import LLMEngine

class PlannerAgent:
    def __init__(self, llm_engine: LLMEngine):
        self.llm = llm_engine

    def create_plan(self, analysis: str) -> str:
        """
        Creates a detailed coding plan based on the analysis.
        """
        system_prompt = "You are a Planning Agent. Based on the user's intent analysis, create a detailed step-by-step plan to generate the code and identify all necessary components."
        prompt = f"{system_prompt}\n### Analysis:\n{analysis}\n### Plan:\n"
        
        full_plan = ""
        for chunk in self.llm.stream_completion(prompt):
            full_plan += chunk
            
        return full_plan.strip()
