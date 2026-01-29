const vscode = acquireVsCodeApi();
const chat = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const toast = document.getElementById('toast');
const contextBar = document.getElementById('context-bar');

let currentBotMessageDiv = null;
let currentAgentSection = null;
let currentAgentContent = null;
let streamBuffer = '';

// Initialize Marked with Highlight.js
marked.setOptions({
    highlight: function (code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-'
});

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'botMessageStart':
            removeTypingIndicator();
            currentBotMessageDiv = createMessageDiv('bot');
            chat.appendChild(currentBotMessageDiv);
            streamBuffer = '';
            chat.scrollTop = chat.scrollHeight;
            showTypingIndicator();
            break;
        case 'botMessageChunk':
            if (currentBotMessageDiv) {
                streamBuffer += message.text;
                parseAndRenderAgentOutput(streamBuffer);
                chat.scrollTop = chat.scrollHeight;
            }
            break;
        case 'botMessageEnd':
            removeTypingIndicator();
            if (currentBotMessageDiv) {
                // Final parse and render
                parseAndRenderAgentOutput(streamBuffer, true);
                addCopyButtons(currentBotMessageDiv);
            }
            setSendingState(false);
            currentBotMessageDiv = null;
            currentAgentSection = null;
            currentAgentContent = null;
            streamBuffer = '';
            break;
        case 'botMessage':
            removeTypingIndicator();
            addMessage(message.text, 'bot');
            setSendingState(false);
            break;
        case 'error':
            showError(message.text);
            setSendingState(false);
            removeTypingIndicator();
            break;
        case 'contextUpdate':
            updateContextDisplay(message.text);
            break;
    }
});

function parseAndRenderAgentOutput(text, isFinal = false) {
    // Parse agent headers like "#### Reasoner Agent:", "#### Planner Agent:", etc.
    const agentRegex = /####\s+(Reasoner|Planner|Generation|Reviewer)\s+Agent:/gi;
    const parts = text.split(agentRegex);

    // Clear current content
    currentBotMessageDiv.innerHTML = '';

    let i = 0;
    while (i < parts.length) {
        const part = parts[i].trim();

        // Check if this is an agent name
        if (i > 0 && (parts[i - 1].match(/Reasoner|Planner|Generation|Reviewer/i))) {
            const agentName = parts[i - 1].trim();
            const agentContent = part;

            if (agentContent) {
                createAgentSection(agentName, agentContent, isFinal);
            }
            i++;
        } else if (part && !part.match(/Reasoner|Planner|Generation|Reviewer/i)) {
            // Regular content (not part of agent workflow)
            const contentDiv = document.createElement('div');
            if (isFinal) {
                contentDiv.innerHTML = marked.parse(part);
            } else {
                contentDiv.innerText = part;
            }
            currentBotMessageDiv.appendChild(contentDiv);
            i++;
        } else {
            i++;
        }
    }
}

function createAgentSection(agentName, content, isFinal) {
    const agentType = agentName.toLowerCase().replace(' agent', '');

    // Check if section already exists
    let section = currentBotMessageDiv.querySelector(`.agent-section.agent-${agentType}`);

    if (!section) {
        section = document.createElement('div');
        section.className = `agent-section agent-${agentType}`;

        const header = document.createElement('div');
        header.className = 'agent-header';

        const icon = getAgentIcon(agentType);
        header.innerHTML = `<i class="codicon codicon-chevron-down"></i><i class="codicon ${icon}"></i>${agentName} Agent`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'agent-content';

        section.appendChild(header);
        section.appendChild(contentDiv);
        currentBotMessageDiv.appendChild(section);

        // Add click handler for collapse/expand
        header.addEventListener('click', () => {
            header.classList.toggle('collapsed');
            contentDiv.classList.toggle('collapsed');
        });
    }

    const contentDiv = section.querySelector('.agent-content');

    if (isFinal) {
        contentDiv.innerHTML = marked.parse(content);
    } else {
        contentDiv.innerText = content;
    }
}

function getAgentIcon(agentType) {
    const icons = {
        'reasoner': 'codicon-lightbulb',
        'planner': 'codicon-list-ordered',
        'generation': 'codicon-code',
        'reviewer': 'codicon-checklist'
    };
    return icons[agentType] || 'codicon-info';
}

function createMessageDiv(sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    return div;
}

function addMessage(text, sender) {
    const div = createMessageDiv(sender);

    if (sender === 'bot') {
        div.innerHTML = marked.parse(text);
        addCopyButtons(div);
    } else {
        div.innerText = text;
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function addCopyButtons(element) {
    element.querySelectorAll('pre').forEach(pre => {
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.innerText = 'Copy';
        btn.onclick = () => {
            const code = pre.querySelector('code').innerText;
            navigator.clipboard.writeText(code);
            btn.innerText = 'Copied!';
            setTimeout(() => btn.innerText = 'Copy', 2000);
        };
        if (!pre.querySelector('.copy-btn')) {
            pre.appendChild(btn);
        }
    });
}

function showTypingIndicator() {
    let typing = document.getElementById('typing');
    if (!typing) {
        typing = document.createElement('div');
        typing.className = 'message bot typing-indicator';
        typing.id = 'typing';
        typing.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        chat.appendChild(typing);
        chat.scrollTop = chat.scrollHeight;
    }
}

function removeTypingIndicator() {
    const typing = document.getElementById('typing');
    if (typing) typing.remove();
}

function showError(msg) {
    toast.innerText = msg;
    toast.className = 'show';
    setTimeout(() => { toast.className = ''; }, 3000);
}

function updateContextDisplay(filename) {
    contextBar.innerHTML = '';
    if (filename) {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerHTML = `<i class="codicon codicon-file"></i> ${filename}`;
        contextBar.appendChild(chip);
    }
}

function setSendingState(isSending) {
    const icon = sendBtn.querySelector('.codicon');
    if (isSending) {
        icon.className = 'codicon codicon-debug-stop';
        input.disabled = true;
    } else {
        icon.className = 'codicon codicon-send';
        input.disabled = false;
        input.focus();
    }
}

function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    showTypingIndicator();
    setSendingState(true);

    vscode.postMessage({ type: 'userMessage', text: text });

    input.value = '';
    input.style.height = 'auto';
}

sendBtn.addEventListener('click', sendMessage);

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
    // Auto-expand
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
});

// Notify extension that the UI is ready
vscode.postMessage({ type: 'chatLoaded' });