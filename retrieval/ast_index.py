import os
import ast

class CodebaseIndex:
    def __init__(self, base_dir: str):
        self.base_dir = base_dir

    def read_file(self, relative_path: str) -> str:
        """
        Reads a file from the codebase to provide as context.
        """
        # Construct full path safely
        target_path = os.path.join(self.base_dir, relative_path)
        
        if not os.path.exists(target_path):
            print(f"Warning: File not found at {target_path}")
            return ""
            
        try:
            with open(target_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            print(f"Error reading file: {e}")
            return ""
