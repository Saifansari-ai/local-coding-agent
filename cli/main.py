import os
import sys
import glob
from flask import Flask, request, stream_with_context, Response, jsonify

# Add project root to path to allow imports from agents/
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.reasoner import LLMEngine, ReasonerAgent
from agents.planner import PlannerAgent
from agents.generation import GenerationAgent
from agents.reviewer import ReviewerAgent
from retrieval.ast_index import CodebaseIndex

app = Flask(__name__)

# Global instances
llm_engine_instance = None
reasoner_agent = None
planner_agent = None
generator_agent = None
reviewer_agent = None
indexer_instance = None
base_project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_model_path(base_dir):
    """Finds the first .gguf file in the model directory."""
    models_dir = os.path.join(base_dir, "model")
    if not os.path.exists(models_dir):
        print(f"Creating model directory at {models_dir}...")
        os.makedirs(models_dir)
        return None
    
    # Find any .gguf file
    gguf_files = glob.glob(os.path.join(models_dir, "*.gguf"))
    if not gguf_files:
        return None
    
    # Return the first model found
    return gguf_files[0]

# Moved initialization outside of a decorator for direct `app.run()` compatibility
def initialize_agent_and_indexer():
    global llm_engine_instance, reasoner_agent, planner_agent, generator_agent, reviewer_agent, indexer_instance, base_project_dir
    
    if llm_engine_instance is not None:
        return # Already initialized
        
    print("--- Local Coding Agent Setup (Flask) ---")
    model_path = get_model_path(base_project_dir)
    
    if not model_path:
        print("Error: No .gguf model found in 'model/' directory. Please ensure you have downloaded the DeepSeek Coder GGUF file.")
        return

    print(f"Found model: {os.path.basename(model_path)}")
    print("Initializing Inference Engine (this may take a few seconds)...")
    
    try:
        llm_engine_instance = LLMEngine(model_path=model_path)
        
        # Initialize Agents
        reasoner_agent = ReasonerAgent(llm_engine_instance)
        planner_agent = PlannerAgent(llm_engine_instance)
        generator_agent = GenerationAgent(llm_engine_instance)
        reviewer_agent = ReviewerAgent(llm_engine_instance)
        
        indexer_instance = CodebaseIndex(base_project_dir)
        print("Agents and Indexer initialized.")
    except Exception as e:
        print(f"CRITICAL: Failed to load model or initialize components. {e}")

@app.route('/chat', methods=['POST'])
def chat():
    if llm_engine_instance is None:
        return jsonify({"error": "Agents not initialized. Check server logs."}), 500

    data = request.get_json()
    user_message = data.get('message', '')
    context_code = data.get('context_code', '') # Client sends context with each request

    if not user_message:
        return jsonify({"error": "No message provided."}), 400

    def generate():
        # 1. Reasoner Agent
        yield "#### Reasoner Agent:\n"
        analysis = ""
        analysis = reasoner_agent.reason(user_message, context_code)
        yield analysis + "\n\n"
        
        # 2. Planner Agent
        yield "#### Planner Agent:\n"
        plan = planner_agent.create_plan(analysis)
        yield plan + "\n\n"
        
        # 3. Generator Agent
        yield "#### Generation Agent:\n"
        code = generator_agent.generate_code(plan)
        yield code + "\n\n"
        
        # 4. Reviewer Agent
        yield "#### Reviewer Agent:\n"
        review = reviewer_agent.review_code(code, analysis)
        yield review + "\n"

    return Response(stream_with_context(generate()), mimetype='text/plain')

@app.route('/add_file_to_context', methods=['POST'])
def add_file_to_context():
    if indexer_instance is None:
        return jsonify({"error": "Indexer not initialized. Check server logs."}), 500
    
    data = request.get_json()
    filename = data.get('filename')

    if not filename:
        return jsonify({"error": "No filename provided."}), 400
    
    file_content = indexer_instance.read_file(filename)
    if file_content:
        return jsonify({"filename": filename, "content": file_content})
    else:
        return jsonify({"error": f"Could not read file: {filename}"}), 404

@app.route('/health', methods=['GET'])
def health_check():
    status = "ready" if llm_engine_instance is not None else "initializing"
    return jsonify({"status": status})

if __name__ == "__main__":
    if llm_engine_instance is None:
        initialize_agent_and_indexer()
    app.run(debug=True, port=5000)
