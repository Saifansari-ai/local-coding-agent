"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http")); // Import the http module
function activate(context) {
    // Register the Sidebar View Provider
    const provider = new LocalChatViewProvider(context.extensionUri, context.extensionPath);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(LocalChatViewProvider.viewType, provider));
    // Update the command to focus the sidebar instead of opening a new panel
    const command = vscode.commands.registerCommand("localChat.open", () => {
        vscode.commands.executeCommand("localChat.view.focus");
    });
    context.subscriptions.push(command);
}
class LocalChatViewProvider {
    constructor(_extensionUri, _extensionPath) {
        this._extensionUri = _extensionUri;
        this._extensionPath = _extensionPath;
    }
    resolveWebviewView(webviewView, context, _token) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        const htmlPath = path.join(this._extensionPath, "media", "chat.html");
        const scriptUri = webviewView.webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionPath, "media", "chat.js")));
        webviewView.webview.html = fs.readFileSync(htmlPath, "utf8")
            .replace("chat.js", scriptUri.toString());
        // Track active file context - Keep for now, but will need to integrate with API
        const updateContext = () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const fileName = path.basename(editor.document.fileName);
                webviewView.webview.postMessage({ type: "contextUpdate", text: fileName });
            }
        };
        // Initial run & Listen for changes
        updateContext();
        const changeDisposable = vscode.window.onDidChangeActiveTextEditor(updateContext);
        webviewView.onDidDispose(() => changeDisposable.dispose());
        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.type === "chatLoaded") {
                webviewView.webview.postMessage({
                    type: "botMessage",
                    text: "**Hello!** I'm your local coding assistant.\n\nI can help you explain, refactor, or generate code without leaving VS Code.\n\nHow can I help you today?"
                });
            }
            else if (message.type === "userMessage") {
                const userMessage = message.text;
                const contextCode = ""; // Placeholder for now, will integrate later
                try {
                    const postData = JSON.stringify({
                        message: userMessage,
                        context_code: contextCode
                    });
                    const options = {
                        hostname: 'localhost',
                        port: 5000,
                        path: '/chat',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(postData)
                        }
                    };
                    // Indicate that a bot message is starting to be streamed
                    webviewView.webview.postMessage({ type: "botMessageStart" });
                    const req = http.request(options, (res) => {
                        res.on('data', (chunk) => {
                            // Send partial updates to the webview
                            webviewView.webview.postMessage({
                                type: "botMessageChunk", // A new message type for streaming
                                text: chunk.toString()
                            });
                        });
                        res.on('end', () => {
                            // Optionally send a "stream ended" message
                            webviewView.webview.postMessage({ type: "botMessageEnd" });
                        });
                        res.on('error', (e) => {
                            console.error(`Problem with response: ${e.message}`);
                            webviewView.webview.postMessage({
                                type: "botMessage",
                                text: `Error receiving response from local agent: ${e.message}`
                            });
                            webviewView.webview.postMessage({ type: "botMessageEnd" }); // Ensure stream ends
                        });
                    });
                    req.on('error', (e) => {
                        console.error(`Problem with request: ${e.message}`);
                        webviewView.webview.postMessage({
                            type: "botMessage",
                            text: `Error communicating with local agent: ${e.message}. Ensure the Python backend is running.`
                        });
                        webviewView.webview.postMessage({ type: "botMessageEnd" }); // Ensure stream ends
                    });
                    req.write(postData);
                    req.end();
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Failed to send message to local agent: ${error.message}`);
                    webviewView.webview.postMessage({
                        type: "botMessage",
                        text: `Error: ${error.message}`
                    });
                    webviewView.webview.postMessage({ type: "botMessageEnd" }); // Ensure stream ends
                }
            }
        });
    }
}
LocalChatViewProvider.viewType = "localChat.view";
function deactivate() { }
//# sourceMappingURL=extension.js.map