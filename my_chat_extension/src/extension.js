"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
var vscode = require("vscode");
var path = require("path");
var fs = require("fs");
function activate(context) {
    var command = vscode.commands.registerCommand("localChat.open", function () {
        var panel = vscode.window.createWebviewPanel("localChat", "Local Chat", vscode.ViewColumn.One, {
            enableScripts: true
        });
        var htmlPath = path.join(context.extensionPath, "media", "chat.html");
        var scriptUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, "media", "chat.js")));
        panel.webview.html = fs.readFileSync(htmlPath, "utf8")
            .replace("chat.js", scriptUri.toString());
        panel.webview.onDidReceiveMessage(function (message) {
            if (message.type === "userMessage") {
                panel.webview.postMessage({
                    type: "botMessage",
                    text: "You said: ".concat(message.text)
                });
            }
        });
    });
    context.subscriptions.push(command);
}
function deactivate() { }
