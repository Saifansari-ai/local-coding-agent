# Project Overview

This project is a local AI coding agent designed to operate without requiring internet access or external API keys. It leverages a GGUF model for local inference and offers a command-line interface (CLI) for user interaction. Additionally, it includes a VS Code extension (`my_chat_extension`) that likely serves as a graphical interface for the agent.

## Building and Running

### Python Backend (CLI Agent)

The core AI agent logic and CLI interface are implemented in Python.

*   **Model Requirement**: The agent requires a `.gguf` model file to be placed in the `model/` directory. You will need to acquire a compatible DeepSeek Coder GGUF file separately.
*   **Running the CLI Agent**:
    ```bash
    python cli/main.py
    ```
*   **CLI Commands**:
    *   Once the agent is running, you can interact using the following commands:
        *   `/add <filename>`: Loads the content of the specified file into the agent's active context.
        *   `/clear`: Resets the agent's active context.
        *   `exit` or `quit`: Exits the CLI agent.

### VS Code Extension (`my_chat_extension`)

The `my_chat_extension` directory contains a VS Code extension, which likely provides a richer user interface for the AI coding agent.

*   **Install Dependencies**:
    ```bash
    npm install --prefix my_chat_extension
    ```
*   **Compile Extension**:
    ```bash
    npm run compile --prefix my_chat_extension
    ```
    *Alternatively, you can run:*
    ```bash
    npm run compile
    ```

## Development Conventions

*   **Backend Logic**: Primarily implemented in Python, focusing on agent reasoning, retrieval, and CLI interactions.
*   **Frontend (VS Code Extension)**: Developed using TypeScript/JavaScript.
*   **AI Models**: Utilizes `.gguf` format for local AI model inference.
