// Global variables
let currentConversationId = null;
let isLoading = false;
let currentModel = null;
let selectedModels = []; // for collaboration mode
let conversations = [];
let isAgentMode = false;
let agentModeFirstMessage = true;
let availableModels = [];
let hasApiKeys = false;
let sandboxFiles = [];
let currentSandboxSession = null;
let consoleOutput = [];
let currentWorkspaceId = null; // Store current workspace ID

// API base resolution priority: window -> meta -> localhost -> window.location.origin
let __API_BASE = (window.NEUROCHAT_API_BASE || (document.querySelector('meta[name="neurochat-api-base"]')?.content) || window.location.origin).trim();
async function apiFetch(path, options = {}) {
    const candidates = [
        __API_BASE,
        'http://localhost:12000' // Fallback for local development
    ];
    let lastErr = null;
    for (const base of candidates) {
        try {
            const url = base ? base + path : path;
            const res = await fetch(url, options);
            if (res.ok || res.status === 202) {
                if (!__API_BASE && base) __API_BASE = base; // cache working base
                return res;
            }
            lastErr = new Error(`HTTP ${res.status} for ${url}`);
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr || new Error('All API bases failed');
}

// DOM elements
const elements = {
    loadingScreen: document.getElementById('loadingScreen'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    menuButton: document.getElementById('menuButton'),
    closeSidebar: document.getElementById('closeSidebar'),
    newChatSidebar: document.getElementById('newChatSidebar'),
    conversationList: document.getElementById('conversationList'),
    welcomeState: document.getElementById('welcomeState'),
    chatWindow: document.getElementById('chatWindow'),
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    sendButton: document.getElementById('sendButton'),
    charCounter: document.getElementById('charCounter'),
    currentModel: document.getElementById('currentModel'),
    modelBtn: document.getElementById('modelBtn'),
    modelDropdown: document.getElementById('modelDropdown'),
    shareBtn: document.getElementById('shareBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettings: document.getElementById('closeSettings'),
    toastContainer: document.getElementById('toastContainer'),
    attachmentBtn: document.getElementById('attachmentBtn'),
    agentModeBtn: document.getElementById('agentModeBtn'),
    agentModePanels: document.getElementById('agentModePanels'),
    agentChatMessages: document.getElementById('agentChatMessages'),
    agentWelcomeMessage: document.getElementById('agentWelcomeMessage'),
    agentSampleQuestions: document.getElementById('agentSampleQuestions'),
    agentResponseArea: document.getElementById('agentResponseArea'),
    apiKeyBtn: document.getElementById('apiKeyBtn'),
    apiKeyModal: document.getElementById('apiKeyModal'),
    closeApiKeyModal: document.getElementById('closeApiKeyModal'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    apiKeySave: document.getElementById('apiKeySave'),
    apiKeyCancel: document.getElementById('apiKeyCancel'),
    // New elements for Console Mode and Sandbox
    chatModeBtn: document.getElementById('chatModeBtn'),
    consoleModeBtn: document.getElementById('consoleModeBtn'),
    consoleModal: document.getElementById('consoleModal'),
    closeConsole: document.getElementById('closeConsole'),
    consoleModalContent: document.getElementById('consoleModalContent'),
    agentSandboxArea: document.getElementById('agentSandboxArea'),
    fileTree: document.getElementById('fileTree'),
    terminalOutput: document.getElementById('terminalOutput'),
    previewFrame: document.getElementById('previewFrame'),
    previewPlaceholder: document.getElementById('previewPlaceholder'),
    newFileBtn: document.getElementById('newFileBtn'),
    uploadFileBtn: document.getElementById('uploadFileBtn')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Hide loading screen after a short delay
    setTimeout(() => {
        elements.loadingScreen.classList.add('hidden');
    }, 1500);

    // Set up event listeners
    setupEventListeners();
    
    // Load saved conversations
    loadConversations();
    
    // Set up auto-resize for textarea
    setupTextareaAutoResize();
    
    // Initialize character counter
    updateCharCounter();
    
    // Load saved settings
    loadSettings();
    
    // Load available models
    loadAvailableModels();
}

function setupEventListeners() {
    // Sidebar controls
    elements.menuButton.addEventListener('click', toggleSidebar);
    elements.closeSidebar.addEventListener('click', closeSidebar);
    elements.sidebarOverlay.addEventListener('click', closeSidebar);
    elements.newChatSidebar.addEventListener('click', startNewConversation);
    
    // Message input
    elements.messageInput.addEventListener('input', handleInputChange);
    elements.messageInput.addEventListener('keydown', handleKeyDown);
    elements.sendButton.addEventListener('click', () => {
        if (isAgentMode) {
            sendAgentMessage();
        } else {
            sendMessage();
        }
    });
    
    // Model selector
    elements.modelBtn.addEventListener('click', toggleModelDropdown);
    document.addEventListener('click', handleOutsideClick);
    
    // Settings
    elements.settingsBtn.addEventListener('click', openSettings);
    elements.closeSettings.addEventListener('click', closeSettings);
    elements.settingsModal.addEventListener('click', handleModalClick);
    
    // Share button
    elements.shareBtn.addEventListener('click', shareConversation);
    
    // Attachment button
    elements.attachmentBtn.addEventListener('click', handleAttachment);
    
    // Mode Buttons
    elements.chatModeBtn.addEventListener('click', () => switchMode('chat'));
    elements.agentModeBtn.addEventListener('click', () => switchMode('agent'));
    if (elements.consoleModeBtn) {
        elements.consoleModeBtn.addEventListener('click', openConsoleModal);
    }
    
    // Console Modal
    if (elements.closeConsole) {
        elements.closeConsole.addEventListener('click', closeConsoleModal);
    }
    
    // Sandbox controls
    if (elements.newFileBtn) {
        elements.newFileBtn.addEventListener('click', createNewFile);
    }
    if (elements.uploadFileBtn) {
        elements.uploadFileBtn.addEventListener('click', handleAttachment);
    }
    
    // Sandbox tabs
    setupSandboxTabs();
    
    // API Key Manager
    elements.apiKeyBtn.addEventListener('click', openApiKeyModal);
    elements.closeApiKeyModal.addEventListener('click', closeApiKeyModal);
    elements.apiKeyCancel.addEventListener('click', closeApiKeyModal);
    elements.apiKeySave.addEventListener('click', saveApiKey);
    elements.apiKeyModal.addEventListener('click', handleApiKeyModalClick);
    
    // Theme switcher
    setupThemeSwitcher();
    
    // Welcome suggestions
    setupWelcomeSuggestions();
    
    // Model dropdown options will be set up dynamically
    const applyBtn = document.getElementById('applyModelsBtn');
    if (applyBtn) applyBtn.addEventListener('click', applySelectedModels);
    
    // Filter buttons
    setupFilterButtons();
    
    // Settings options
    setupSettingsOptions();
    
    // Agent Mode question cards
    setupAgentQuestionCards();
}

function setupWelcomeSuggestions() {
    const suggestionCards = document.querySelectorAll('.suggestion-card');
    suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const suggestion = card.getAttribute('data-suggestion');
            elements.messageInput.value = suggestion;
            updateCharCounter();
            sendMessage();
        });
    });
}

// setupModelOptions function removed - models are now set up dynamically

function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const filter = button.getAttribute('data-filter');
            filterConversations(filter);
        });
    });
}

function setupSettingsOptions() {
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            themeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const theme = button.getAttribute('data-theme');
            setTheme(theme);
        });
    });
}

function setupThemeSwitcher() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeDropdown = document.getElementById('themeDropdown');
    const themeOptions = document.querySelectorAll('.theme-option');
    
    if (!themeToggleBtn || !themeDropdown) return;
    
    // Toggle dropdown
    themeToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdown.classList.toggle('show');
    });
    
    // Theme option selection
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.getAttribute('data-theme');
            setTheme(theme);
            themeDropdown.classList.remove('show');
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!themeToggleBtn.contains(e.target) && !themeDropdown.contains(e.target)) {
            themeDropdown.classList.remove('show');
        }
    });
}

function toggleSidebar() {
    elements.sidebar.classList.toggle('open');
    elements.sidebarOverlay.classList.toggle('active');
    elements.menuButton.classList.toggle('active');
}

function closeSidebar() {
    elements.sidebar.classList.remove('open');
    elements.sidebarOverlay.classList.remove('active');
    elements.menuButton.classList.remove('active');
}

function toggleModelDropdown() {
    elements.modelBtn.classList.toggle('open');
    elements.modelDropdown.classList.toggle('open');
    // show Apply button when open
    const actions = document.getElementById('modelActions');
    if (actions) actions.style.display = 'block';
}

function handleOutsideClick(event) {
    if (!elements.modelBtn.contains(event.target) && !elements.modelDropdown.contains(event.target)) {
        elements.modelBtn.classList.remove('open');
        elements.modelDropdown.classList.remove('open');
    }
    // handle clicks on model checkboxes
    if (event.target && event.target.matches('.model-checkbox')) {
        const modelId = event.target.getAttribute('data-model-id');
        if (event.target.checked) {
            if (!selectedModels.includes(modelId)) selectedModels.push(modelId);
        } else {
            selectedModels = selectedModels.filter(id => id !== modelId);
        }
    }
}

function selectModel(model) {
    // single-select fallback updates
    selectedModels = [model];

    currentModel = model;
    
    // Update active state
    document.querySelectorAll('.model-option').forEach(option => {
        option.classList.remove('active');
    });
    const el = document.querySelector(`[data-model="${model}"]`);
    if (el) el.classList.add('active');
    
    // Update button text - models will be dynamically loaded
    const modelOption = document.querySelector(`[data-model="${model}"]`);
    if (modelOption) {
        const modelName = modelOption.querySelector('.model-name').textContent;
        elements.modelBtn.querySelector('span').textContent = modelName;
        elements.currentModel.textContent = modelName.split(' ')[0];
    }

    // update selected checkbox if exists
    const checkbox = modelOption?.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.checked = true;
    
    // Close dropdown
    elements.modelBtn.classList.remove('open');
    elements.modelDropdown.classList.remove('open');
    updateApplyModelsButton();
    
    if (modelOption) {
        const modelName = modelOption.querySelector('.model-name').textContent;
        showToast(`Switched to ${modelName}`, 'success');
    }
}

function handleInputChange() {
    updateCharCounter();
    adjustTextareaHeight();
}

function updateCharCounter() {
    const length = elements.messageInput.value.length;
    elements.charCounter.textContent = `${length}/4000`;
    
    if (length > 3800) {
        elements.charCounter.style.color = 'var(--warning)';
    } else if (length > 4000) {
        elements.charCounter.style.color = 'var(--error)';
    } else {
        elements.charCounter.style.color = 'var(--text-muted)';
    }
}

function setupTextareaAutoResize() {
    elements.messageInput.addEventListener('input', adjustTextareaHeight);
}

function adjustTextareaHeight() {
    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 200) + 'px';
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (isAgentMode) {
            sendAgentMessage();
        } else {
            sendMessage();
        }
    }
}

async function sendMessage() {
    const usingCollab = Array.isArray(selectedModels) && selectedModels.length > 1;
    const message = elements.messageInput.value.trim();
    if (!message || isLoading) return;
    
    // Get uploaded file IDs to send with message
    const fileIds = Array.from(uploadedFiles.keys());
    
    // Check if models are available
    if (availableModels.length === 0) {
        showToast('Please add an API key to enable chat functionality', 'warning');
        openApiKeyModal();
        return;
    }
    
    if (!currentModel) {
        showToast('Please select a model first', 'warning');
        return;
    }
    
    // Hide welcome state and show chat window
    elements.welcomeState.classList.add('hidden');
    elements.chatWindow.classList.add('active');
    
    // Add user message to chat
    addMessage(message, 'user');
    
    // Clear input
    elements.messageInput.value = '';
    updateCharCounter();
    adjustTextareaHeight();
    
    // Don't clear uploaded files - keep them for context
    // uploadedFiles.clear(); // Keep files for context
    
    // Set loading state
    setLoadingState(true);
    
    // Add thinking message
    const thinkingMessageId = addThinkingMessage();
    
    try {
        // Create new conversation if needed
        if (!currentConversationId) {
            currentConversationId = generateConversationId();
            addConversationToSidebar(currentConversationId, message);
        }
        
        // Send message to Chat API (separated from Agent Mode)
        const response = await apiFetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': currentWorkspaceId || 'default'
            },
            body: JSON.stringify({
                message: message,
                conversation_id: currentConversationId,
                model: currentModel,
                models: usingCollab ? selectedModels : [currentModel],
                fileIds: fileIds,
                workspaceId: currentWorkspaceId || null
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Remove thinking message
        removeMessage(thinkingMessageId);
        
        if (data.task_id) {
            // Poll for results in Chat Mode
            pollForResults(data.task_id);
        } else {
            throw new Error('No task ID received');
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        removeMessage(thinkingMessageId);
        addMessage('Sorry, there was an error processing your request. Please try again.', 'error');
        setLoadingState(false);
        showToast('Failed to send message', 'error');
    }
}

async function pollForResults(taskId) {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;
    
    const poll = async () => {
        try {
            const response = await apiFetch(`/result/${taskId}`);
            const data = await response.json();
            
            if (data.status === 'completed') {
                setLoadingState(false);
                addMessage(data.result, 'ai');
                saveConversation();
                return;
            } else if (data.status === 'failed') {
                setLoadingState(false);
                addMessage('Sorry, there was an error processing your request.', 'error');
                showToast('Processing failed', 'error');
                return;
            } else if (data.status === 'pending' || data.status === 'processing') {
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000); // Poll every 5 seconds
                } else {
                    setLoadingState(false);
                    addMessage('Request timed out. Please try again.', 'error');
                    showToast('Request timed out', 'error');
                }
            }
        } catch (error) {
            console.error('Error polling for results:', error);
            setLoadingState(false);
            addMessage('Sorry, there was an error getting the response.', 'error');
            showToast('Failed to get response', 'error');
        }
    };
    
    poll();
}

function addMessage(content, type) {
    const messageId = generateMessageId();
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}-message`;
    messageElement.setAttribute('data-message-id', messageId);
    
    if (type === 'user') {
        messageElement.textContent = content;
    } else if (type === 'ai') {
        // Format AI response with basic markdown support
        messageElement.innerHTML = formatMessage(content);
    } else if (type === 'error') {
        messageElement.innerHTML = `<strong>Error:</strong> ${content}`;
    }
    
    elements.chatMessages.appendChild(messageElement);
    scrollToBottom();
    
    return messageId;
}

function addThinkingMessage() {
    const messageId = generateMessageId();
    const messageElement = document.createElement('div');
    messageElement.className = 'message thinking-message';
    messageElement.setAttribute('data-message-id', messageId);
    messageElement.innerHTML = `
        <span>AI is thinking</span>
        <div class="thinking-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;
    
    elements.chatMessages.appendChild(messageElement);
    scrollToBottom();
    
    return messageId;
}

function removeMessage(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        messageElement.remove();
    }
}

function formatMessage(content) {
    // Basic markdown formatting
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

// Render Agent Console rich panel when backend attaches agent/evaluation/metadata
function renderAgentConsole(data) {
    const consoleText = generateConsoleOutput(data);
    
    // Store in console output for Console Mode
    consoleOutput.push(consoleText);
    
    // If in chat mode and console modal is open, update it
    if (!isAgentMode && elements.consoleModal && elements.consoleModal.classList.contains('active')) {
        updateConsoleContent();
    }
    
    return `<pre>${consoleText}</pre>`;
}

function generateConsoleOutput(data) {
    try {
        const lines = [];
        lines.push('Agent Execution Report');
        lines.push('----------------------');
        if (data.mode) {
            lines.push(`Mode: ${data.mode}`);
        }
        if (data.metadata && data.metadata.processingTime) {
            lines.push(`Processing time: ${Math.round(data.metadata.processingTime)} ms`);
        }
        // Collaboration details (when Agent Merge is enabled)
        if (data.collaboration) {
            const c = data.collaboration;
            lines.push('Collaboration Merge:');
            if (typeof c.successRate === 'number') {
                lines.push(`  success rate: ${(c.successRate * 100).toFixed(0)}%`);
            }
            if (typeof c.totalTime === 'number') {
                lines.push(`  total time: ${Math.round(c.totalTime)} ms`);
            }
            if (c.weights && typeof c.weights === 'object') {
                lines.push('  model weights:');
                Object.entries(c.weights).forEach(([k, v]) => {
                    const vv = (typeof v === 'number') ? v : parseFloat(v);
                    lines.push(`    ${k}: ${isNaN(vv) ? v : vv.toFixed(2)}`);
                });
            }
            if (Array.isArray(c.models)) {
                lines.push('  individual responses:');
                c.models.forEach(m => {
                    const id = m.modelId || m.key || 'model';
                    const rt = (typeof m.responseTime === 'number') ? `${m.responseTime}ms` : '-';
                    lines.push(`    - ${id}: ${m.success ? 'ok' : 'fail'} (${rt}${m.fallback ? ', fallback' : ''}${m.error ? ', error: ' + m.error : ''})`);
                });
            }
        }
        if (data.agent && data.agent.factCheck) {
            const fc = data.agent.factCheck;
            lines.push('Fact Check:');
            lines.push(`  verified: ${fc.verified}, confidence: ${((fc.confidence||0)*100).toFixed(0)}%`);
            if (Array.isArray(fc.claims)) lines.push(`  claims analyzed: ${fc.claims.length}`);
        }
        if (data.agent && data.agent.bias) {
            const b = data.agent.bias;
            lines.push('Bias Analysis:');
            const biasScore = (b.score ?? b.overallBiasScore ?? 0);
            lines.push(`  overall bias score: ${biasScore.toFixed(2)}`);
        }
        if (data.agent && data.agent.coherence) {
            const c = data.agent.coherence;
            const coh = (c.score ?? c.overallScore ?? 0);
            lines.push('Coherence:');
            lines.push(`  score: ${coh.toFixed(2)}`);
        }
        if (data.evaluation) {
            lines.push('Evaluation:');
            const overall = (data.evaluation.overall ?? 0);
            lines.push(`  overall: ${overall.toFixed(2)}`);
            if (data.evaluation.metrics) {
                Object.entries(data.evaluation.metrics).forEach(([k,v]) => {
                    const vv = (typeof v === 'number') ? v : (v?.score ?? 0);
                    lines.push(`  ${k}: ${vv.toFixed(2)}`);
                });
            }
        }
        return lines.join('\n');
    } catch(e) {
        console.warn('generateConsoleOutput error:', e);
        return 'Response generated successfully!';
    }
}

function setLoadingState(loading) {
    isLoading = loading;
    elements.sendButton.disabled = loading;
    elements.sendButton.classList.toggle('loading', loading);
}

function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function startNewConversation() {
    currentConversationId = null;
    elements.chatMessages.innerHTML = '';
    elements.welcomeState.classList.remove('hidden');
    elements.chatWindow.classList.remove('active');
    closeSidebar();
    showToast('Started new conversation', 'success');
}

function generateConversationId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Mode Switching Functions
function switchMode(mode) {
    if (mode === 'chat') {
        activateChatMode();
    } else if (mode === 'agent') {
        activateAgentMode();
    }
}

function activateChatMode() {
    isAgentMode = false;
    
    // Update button states
    elements.chatModeBtn.classList.add('active');
    elements.agentModeBtn.classList.remove('active');
    
    // Show console button in chat mode
    if (elements.consoleModeBtn) {
        elements.consoleModeBtn.style.display = 'block';
    }
    
    // Hide agent panels
    document.body.classList.remove('agent-mode-active', 'input-positioned');
    elements.agentModePanels.classList.remove('active');
    
    // Show appropriate chat state
    if (currentConversationId && elements.chatMessages.children.length > 0) {
        elements.chatWindow.classList.add('active');
    } else {
        elements.welcomeState.classList.remove('hidden');
    }
}

function activateAgentMode() {
    isAgentMode = true;
    agentModeFirstMessage = true;
    
    // Update button states  
    elements.agentModeBtn.classList.add('active');
    elements.chatModeBtn.classList.remove('active');
    
    // Hide console button in agent mode
    if (elements.consoleModeBtn) {
        elements.consoleModeBtn.style.display = 'none';
    }
    
    // Activate agent mode UI
    document.body.classList.add('agent-mode-active');
    elements.agentModePanels.classList.add('active');
    
    setTimeout(() => {
        document.body.classList.add('input-positioned');
    }, 100);
    
    // Initialize sandbox if needed
    if (!currentSandboxSession) {
        initializeSandbox();
    }
    
    // Show initial agent UI
    elements.agentWelcomeMessage.classList.remove('hidden');
    elements.agentSampleQuestions.classList.remove('hidden');
    if (elements.agentSandboxArea) {
        elements.agentSandboxArea.classList.add('visible');
    }
}

// Console Modal Functions
function openConsoleModal() {
    if (elements.consoleModal) {
        elements.consoleModal.classList.add('active');
        updateConsoleContent();
    }
}

function closeConsoleModal() {
    if (elements.consoleModal) {
        elements.consoleModal.classList.remove('active');
    }
}

function updateConsoleContent() {
    if (elements.consoleModalContent && consoleOutput.length > 0) {
        const content = consoleOutput.join('\n');
        elements.consoleModalContent.innerHTML = `<pre>${content}</pre>`;
    }
}

// Sandbox Functions
function setupSandboxTabs() {
    const tabs = document.querySelectorAll('.sandbox-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            switchSandboxTab(targetTab);
        });
    });
}

function switchSandboxTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.sandbox-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Update panes
    document.querySelectorAll('.sandbox-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    if (tabName === 'files' && document.getElementById('filesPane')) {
        document.getElementById('filesPane').classList.add('active');
    } else if (tabName === 'terminal' && document.getElementById('terminalPane')) {
        document.getElementById('terminalPane').classList.add('active');
    } else if (tabName === 'preview' && document.getElementById('previewPane')) {
        document.getElementById('previewPane').classList.add('active');
    }
}

async function initializeSandbox() {
    try {
        const response = await apiFetch('/api/sandbox/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: generateSessionId()
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentSandboxSession = data.sessionId;
            showToast('Sandbox initialized', 'success');
        }
    } catch (error) {
        console.error('Error initializing sandbox:', error);
        showToast('Failed to initialize sandbox', 'error');
    }
}

function generateSessionId() {
    return 'sandbox_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function createNewFile() {
    const fileName = prompt('Enter file name:');
    if (fileName) {
        addFileToSandbox(fileName, '');
    }
}

function addFileToSandbox(fileName, content) {
    sandboxFiles.push({ name: fileName, content: content });
    updateFileTree();
}

function updateFileTree() {
    if (!elements.fileTree) return;
    
    if (sandboxFiles.length === 0) {
        elements.fileTree.innerHTML = '<p class="empty-state">No files yet. Start by creating or uploading files.</p>';
    } else {
        const fileListHTML = sandboxFiles.map(file => `
            <div class="file-item" data-file="${file.name}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                </svg>
                <span>${file.name}</span>
            </div>
        `).join('');
        elements.fileTree.innerHTML = fileListHTML;
    }
}

function updateSandboxFiles(files) {
    if (!files || !elements.fileTree) return;
    
    // Create file list with real functionality
    let fileListHTML = '';
    
    files.forEach(file => {
        const fileIcon = getFileIcon(file.type);
        const fileSize = formatFileSize(file.size);
        
        fileListHTML += `
            <div class="file-item" data-file-id="${file.id}">
                <div class="file-icon">${fileIcon}</div>
                <div class="file-info">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-meta">
                        <span class="file-size">${fileSize}</span>
                        <span class="file-type">${file.type.split('/')[1] || 'file'}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-action-btn" onclick="viewFile('${file.id}')" title="View">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button class="file-action-btn" onclick="downloadFile('${file.id}')" title="Download">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                    <button class="file-action-btn" onclick="deleteFile('${file.id}')" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    });
    
    if (fileListHTML) {
        elements.fileTree.innerHTML = fileListHTML;
    } else {
        elements.fileTree.innerHTML = '<p class="empty-state">No files uploaded yet. Click "Upload" to add files.</p>';
    }
}

// Helper function to get file icon based on type
function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) {
        return '🖼️';
    } else if (mimeType === 'application/pdf') {
        return '📄';
    } else if (mimeType.includes('zip') || mimeType.includes('compressed')) {
        return '📦';
    } else if (mimeType.startsWith('text/')) {
        return '📝';
    } else if (mimeType.includes('json')) {
        return '🔧';
    } else if (mimeType.includes('javascript')) {
        return '📜';
    } else {
        return '📎';
    }
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// View file content
async function viewFile(fileId) {
    try {
        const response = await apiFetch(`/api/upload/${fileId}`);
        if (!response.ok) throw new Error('Failed to fetch file');
        
        const data = await response.json();
        const file = data.file;
        
        // Create modal to display file content
        const modal = document.createElement('div');
        modal.className = 'file-view-modal';
        modal.innerHTML = `
            <div class="file-view-content">
                <div class="file-view-header">
                    <h3>${file.name}</h3>
                    <button class="close-btn" onclick="this.closest('.file-view-modal').remove()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="file-view-body">
                    ${formatFileContent(file)}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error viewing file:', error);
        showToast('Failed to view file', 'error');
    }
}

// Format file content for display
function formatFileContent(file) {
    if (file.type.startsWith('image/')) {
        // For images, we'll need to implement image preview
        return `<div class="image-preview">Image preview: ${file.name}</div>`;
    } else if (file.type === 'application/pdf') {
        return `<pre class="file-content">${escapeHtml(file.content || 'PDF content extracted')}</pre>`;
    } else if (file.metadata && file.metadata.files) {
        // ZIP file
        let html = '<div class="zip-contents"><h4>Archive Contents:</h4><ul>';
        file.metadata.files.forEach(f => {
            html += `<li>${f.name} (${formatFileSize(f.size)})</li>`;
        });
        html += '</ul></div>';
        return html;
    } else {
        return `<pre class="file-content">${escapeHtml(file.content || '')}</pre>`;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Download file
function downloadFile(fileId) {
    const file = uploadedFiles.get(fileId);
    if (file) {
        // Create download link
        const a = document.createElement('a');
        a.href = `/api/upload/download/${fileId}`;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(`Downloading ${file.name}`, 'info');
    }
}

// Delete file
async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
        const response = await apiFetch(`/api/upload/${fileId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete file');
        
        // Remove from local store
        uploadedFiles.delete(fileId);
        
        // Remove from UI
        const fileElement = document.querySelector(`[data-file-id="${fileId}"]`);
        if (fileElement) {
            fileElement.remove();
        }
        
        // Check if no files left
        if (uploadedFiles.size === 0 && elements.fileTree) {
            elements.fileTree.innerHTML = '<p class="empty-state">No files uploaded yet. Click "Upload" to add files.</p>';
        }
        
        showToast('File deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting file:', error);
        showToast('Failed to delete file', 'error');
    }
}

// Update file list in UI
function updateFileList() {
    if (!isAgentMode || uploadedFiles.size === 0) return;
    
    const files = Array.from(uploadedFiles.values());
    updateSandboxFiles(files);
}

function addToTerminal(text) {
    if (elements.terminalOutput) {
        const line = document.createElement('p');
        line.textContent = text;
        elements.terminalOutput.appendChild(line);
        elements.terminalOutput.scrollTop = elements.terminalOutput.scrollHeight;
    }
}

// Agent Mode Functions (keeping old function for compatibility)
function toggleAgentMode() {
    isAgentMode = !isAgentMode;
    
    if (isAgentMode) {
        // Activate Agent Mode
        agentModeFirstMessage = true;
        elements.agentModeBtn.classList.add('active');
        document.body.classList.add('agent-mode-active');
        
        // Update button text to "Chat Mode"
        elements.agentModeBtn.querySelector('span').textContent = 'Chat Mode';
        
        // Show panels with animation
        elements.agentModePanels.classList.add('active');
        
        // Position input field after a short delay for smooth animation
        setTimeout(() => {
            document.body.classList.add('input-positioned');
        }, 100);
        
        // Reset to initial state
        elements.agentWelcomeMessage.classList.remove('hidden');
        elements.agentSampleQuestions.classList.remove('hidden');
        // Keep the Agent Console visible and ready at the top
        elements.agentResponseArea.classList.add('visible');
        
    } else {
        // Deactivate Agent Mode
        elements.agentModeBtn.classList.remove('active');
        document.body.classList.remove('agent-mode-active', 'input-positioned');
        elements.agentModePanels.classList.remove('active');
        
        // Update button text back to "Agent Mode"
        elements.agentModeBtn.querySelector('span').textContent = 'Agent Mode';
        
        // Show appropriate state based on conversation
        if (currentConversationId && elements.chatMessages.children.length > 0) {
            elements.chatWindow.classList.add('active');
        } else {
            elements.welcomeState.classList.remove('hidden');
        }
    }
}

function setupAgentQuestionCards() {
    const questionCards = document.querySelectorAll('.agent-question-card');
    questionCards.forEach(card => {
        card.addEventListener('click', () => {
            const question = card.getAttribute('data-question');
            elements.messageInput.value = question;
            sendAgentMessage();
        });
    });
}

async function sendAgentMessage() {
    const message = elements.messageInput.value.trim();
    if (!message || isLoading) return;
    
    // Check if models are available
    if (availableModels.length === 0) {
        showToast('Please add an API key to enable chat functionality', 'warning');
        openApiKeyModal();
        return;
    }
    
    if (!currentModel) {
        showToast('Please select a model first', 'warning');
        return;
    }
    
    // If this is the first message in Agent Mode, hide welcome and questions
    if (agentModeFirstMessage) {
        agentModeFirstMessage = false;
        
        // Hide welcome message and sample questions with animation
        elements.agentWelcomeMessage.classList.add('hidden');
        elements.agentSampleQuestions.classList.add('hidden');
        
        // Expand Agent Sandbox to take full half of screen
        elements.agentSandboxArea.classList.add('expanded');
        
        // Show agent response area after a short delay
        setTimeout(() => {
            elements.agentResponseArea.classList.add('visible');
        }, 300);
    }

    // Add user message to the agent chat area
    const messageElement = document.createElement('div');
    messageElement.className = 'message user-message';
    messageElement.textContent = message;
    elements.agentChatMessages.appendChild(messageElement);
    
    // Clear input
    elements.messageInput.value = '';
    updateCharCounter();
    adjustTextareaHeight();
    
    // Don't clear uploaded files - keep them for context
    // uploadedFiles.clear(); // Keep files for context
    
    // Set loading state
    setLoadingState(true);
    
    // Add thinking message to the agent chat area
    const thinkingMessageId = generateMessageId();
    const thinkingElement = document.createElement('div');
    thinkingElement.className = 'message thinking-message';
    thinkingElement.setAttribute('data-message-id', thinkingMessageId);
    thinkingElement.innerHTML = `
        <span>AI is thinking</span>
        <div class="thinking-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;
    elements.agentChatMessages.appendChild(thinkingElement);
    
    // Update terminal with agent activity
    addToTerminal(`$ Processing: ${message}`);
    addToTerminal('$ Analyzing context...');
    addToTerminal('$ Generating response...');
    
    // Scroll to the bottom of the chat messages
    elements.agentChatMessages.scrollTop = elements.agentChatMessages.scrollHeight;
    
    try {
        // Create new conversation if needed
        if (!currentConversationId) {
            currentConversationId = generateConversationId();
            addConversationToSidebar(currentConversationId, message);
        }
        
        // Send message to Agent backend (supports collaboration)
        const response = await apiFetch('/agent/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                model: currentModel,
                options: {
                    collaboration: Array.isArray(selectedModels) && selectedModels.length > 1,
                    selectedModels: selectedModels
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Remove thinking message
        const thinkingMessage = document.querySelector(`[data-message-id="${thinkingMessageId}"]`);
        if (thinkingMessage) {
            thinkingMessage.remove();
        }
        
        if (data.task_id) {
            // Poll for results
            pollForAgentResults(data.task_id);
        } else {
            throw new Error('No task ID received');
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        const thinkingMessage = document.querySelector(`[data-message-id="${thinkingMessageId}"]`);
        if (thinkingMessage) {
            thinkingMessage.remove();
        }
        
        const errorElement = document.createElement('div');
        errorElement.className = 'message error-message';
        errorElement.innerHTML = `<strong>Error:</strong> Sorry, there was an error processing your request. Please try again.`;
        elements.agentChatMessages.appendChild(errorElement);
        
        // Scroll to the bottom of the chat messages
        elements.agentChatMessages.scrollTop = elements.agentChatMessages.scrollHeight;
        
        setLoadingState(false);
        showToast('Failed to send message', 'error');
    }
}

async function pollForAgentResults(taskId) {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;
    
    const poll = async () => {
        try {
            const response = await apiFetch(`/agent/result/${taskId}`);
            const data = await response.json();
            
            if (data.status === 'completed') {
                setLoadingState(false);
                
                // Add AI response to the agent chat area
                const messageElement = document.createElement('div');
                messageElement.className = 'message ai-message';
                messageElement.innerHTML = formatMessage(data.result);
                elements.agentChatMessages.appendChild(messageElement);
                
                // Scroll to the bottom of the chat messages
                elements.agentChatMessages.scrollTop = elements.agentChatMessages.scrollHeight;
                
                // Update terminal with result
                addToTerminal('$ Task completed successfully');
                
                // Handle any files created by the agent
                if (data.files && data.files.length > 0) {
                    data.files.forEach(file => {
                        addFileToSandbox(file.name, file.content);
                        addToTerminal(`$ Created file: ${file.name}`);
                    });
                }
                
                // Store console output
                renderAgentConsole(data);
                
                saveConversation();
                return;
            } else if (data.status === 'failed') {
                setLoadingState(false);
                
                const errorElement = document.createElement('div');
                errorElement.className = 'message error-message';
                errorElement.innerHTML = `<strong>Error:</strong> Sorry, there was an error processing your request.`;
                elements.agentChatMessages.appendChild(errorElement);
                
                // Scroll to the bottom of the chat messages
                elements.agentChatMessages.scrollTop = elements.agentChatMessages.scrollHeight;
                
                showToast('Processing failed', 'error');
                return;
            } else if (data.status === 'pending' || data.status === 'processing') {
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 2000); // Poll every 2 seconds for snappier console
                } else {
                    setLoadingState(false);
                    
                    const errorElement = document.createElement('div');
                    errorElement.className = 'message error-message';
                    errorElement.innerHTML = `<strong>Error:</strong> Request timed out. Please try again.`;
                    elements.agentChatMessages.appendChild(errorElement);
                    
                    // Scroll to the bottom of the chat messages
                    elements.agentChatMessages.scrollTop = elements.agentChatMessages.scrollHeight;
                    
                    showToast('Request timed out', 'error');
                }
            }
        } catch (error) {
            console.error('Error polling for results:', error);
            setLoadingState(false);
            
            const errorElement = document.createElement('div');
            errorElement.className = 'message error-message';
            errorElement.innerHTML = `<strong>Error:</strong> Sorry, there was an error getting the response.`;
            elements.agentChatMessages.appendChild(errorElement);
            
            // Scroll to the bottom of the chat messages
            elements.agentChatMessages.scrollTop = elements.agentChatMessages.scrollHeight;
            
            showToast('Failed to get response', 'error');
        }
    };
    
    poll();
}

function addConversationToSidebar(conversationId, firstMessage) {
    const conversation = {
        id: conversationId,
        title: firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage,
        preview: firstMessage,
        date: new Date().toISOString(),
        messages: []
    };
    
    conversations.unshift(conversation);
    renderConversations();
}

function renderConversations() {
    if (conversations.length === 0) {
        elements.conversationList.innerHTML = '<div class="empty-conversations">No previous conversations</div>';
        return;
    }
    
    elements.conversationList.innerHTML = conversations.map(conv => `
        <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}" 
             data-conversation-id="${conv.id}">
            <div class="conversation-title">${conv.title}</div>
            <div class="conversation-preview">${conv.preview}</div>
            <div class="conversation-date">${formatDate(conv.date)}</div>
        </div>
    `).join('');
    
    // Add click listeners
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', () => {
            const conversationId = item.getAttribute('data-conversation-id');
            loadConversation(conversationId);
        });
    });
}

function loadConversation(conversationId) {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (!conversation) return;
    
    currentConversationId = conversationId;
    elements.chatMessages.innerHTML = '';
    
    // Load messages
    conversation.messages.forEach(msg => {
        addMessage(msg.content, msg.type);
    });
    
    // Update UI
    elements.welcomeState.classList.add('hidden');
    elements.chatWindow.classList.add('active');
    renderConversations();
    closeSidebar();
}

function saveConversation() {
    if (!currentConversationId) return;
    
    const conversation = conversations.find(conv => conv.id === currentConversationId);
    if (!conversation) return;
    
    // Extract messages from DOM
    const messages = Array.from(elements.chatMessages.children).map(msg => {
        const type = msg.classList.contains('user-message') ? 'user' : 
                    msg.classList.contains('ai-message') ? 'ai' : 'error';
        return {
            content: msg.textContent,
            type: type,
            timestamp: new Date().toISOString()
        };
    });
    
    conversation.messages = messages;
    
    // Save to localStorage
    localStorage.setItem('neurochat_conversations', JSON.stringify(conversations));
}

function loadConversations() {
    const saved = localStorage.getItem('neurochat_conversations');
    if (saved) {
        conversations = JSON.parse(saved);
        renderConversations();
    }
}

function filterConversations(filter) {
    const now = new Date();
    let filteredConversations = conversations;
    
    if (filter === 'today') {
        filteredConversations = conversations.filter(conv => {
            const convDate = new Date(conv.date);
            return convDate.toDateString() === now.toDateString();
        });
    } else if (filter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredConversations = conversations.filter(conv => {
            const convDate = new Date(conv.date);
            return convDate >= weekAgo;
        });
    }
    
    // Render filtered conversations
    if (filteredConversations.length === 0) {
        elements.conversationList.innerHTML = '<div class="empty-conversations">No conversations found</div>';
    } else {
        elements.conversationList.innerHTML = filteredConversations.map(conv => `
            <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}" 
                 data-conversation-id="${conv.id}">
                <div class="conversation-title">${conv.title}</div>
                <div class="conversation-preview">${conv.preview}</div>
                <div class="conversation-date">${formatDate(conv.date)}</div>
            </div>
        `).join('');
        
        // Add click listeners
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const conversationId = item.getAttribute('data-conversation-id');
                loadConversation(conversationId);
            });
        });
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'Today';
    } else if (diffDays === 2) {
        return 'Yesterday';
    } else if (diffDays <= 7) {
        return `${diffDays - 1} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function shareConversation() {
    if (!currentConversationId || elements.chatMessages.children.length === 0) {
        showToast('No conversation to share', 'warning');
        return;
    }
    
    // Create shareable text
    const messages = Array.from(elements.chatMessages.children).map(msg => {
        const type = msg.classList.contains('user-message') ? 'You' : 'AI';
        return `${type}: ${msg.textContent}`;
    }).join('\n\n');
    
    const shareText = `NeuroChat Conversation\n\n${messages}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'NeuroChat Conversation',
            text: shareText
        });
    } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('Conversation copied to clipboard', 'success');
        }).catch(() => {
            showToast('Failed to copy conversation', 'error');
        });
    }
}

function handleAttachment() {
    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '*/*';  // Accept all file types
    
    fileInput.onchange = async (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            await handleFileUpload(files);
        }
    };
    
    // Trigger file selection dialog
    fileInput.click();
}

// Store uploaded files globally
const uploadedFiles = new Map();

async function handleFileUpload(files) {
    try {
        showToast(`Uploading ${files.length} file(s)...`, 'info');
        
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        
        const response = await apiFetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        showToast(`Successfully uploaded ${files.length} file(s)!`, 'success');
        
        // Store uploaded files
        data.files.forEach(file => {
            uploadedFiles.set(file.id, file);
        });
        
        // Store workspace ID if provided
        if (data.workspaceId) {
            currentWorkspaceId = data.workspaceId;
        }
        
        // Don't add file names to message input - AI will have access automatically
        // Just show a notification about uploaded files
        const fileNames = data.files.map(f => f.name).join(', ');
        showToast(`Files uploaded and ready for AI: ${fileNames}`, 'info');
        updateCharCounter();
        
        // If in agent mode, add files to sandbox
        if (isAgentMode) {
            updateSandboxFiles(data.files);
        }
        
        // Update file list display
        updateFileList();
        
    } catch (error) {
        console.error('Error uploading files:', error);
        showToast(`Failed to upload files: ${error.message}`, 'error');
    }
}

function openSettings() {
    elements.settingsModal.classList.add('active');
}

function closeSettings() {
    elements.settingsModal.classList.remove('active');
}

function handleModalClick(event) {
    if (event.target === elements.settingsModal) {
        closeSettings();
    }
}

function setTheme(theme) {
    const body = document.body;
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const sunIcon = themeToggleBtn.querySelector('.sun-icon');
    const moonIcon = themeToggleBtn.querySelector('.moon-icon');
    const autoIcon = themeToggleBtn.querySelector('.auto-icon');
    
    // Remove all theme icons active state
    sunIcon.classList.remove('active');
    moonIcon.classList.remove('active');
    autoIcon.classList.remove('active');
    
    // Remove existing theme classes
    body.classList.remove('light-theme', 'dark-theme');
    
    // Update theme options active state
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('active');
    });
    document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
    
    // Apply theme
    if (theme === 'light') {
        body.classList.add('light-theme');
        sunIcon.classList.add('active');
        themeToggleBtn.title = 'Switch to dark theme';
    } else if (theme === 'dark') {
        body.classList.add('dark-theme');
        moonIcon.classList.add('active');
        themeToggleBtn.title = 'Switch to auto theme';
    } else if (theme === 'auto') {
        autoIcon.classList.add('active');
        themeToggleBtn.title = 'Switch to light theme';
        applyAutoTheme();
    }
    
    localStorage.setItem('neurochat_theme', theme);
    showToast(`Theme changed to ${theme}`, 'success');
}

function applyAutoTheme() {
    const now = new Date();
    const hour = now.getHours();
    const body = document.body;
    
    // Dark mode from 9 PM (21:00) to 7 AM (07:00)
    if (hour >= 21 || hour < 7) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
    }
}

function checkAutoTheme() {
    const savedTheme = localStorage.getItem('neurochat_theme');
    if (savedTheme === 'auto') {
        applyAutoTheme();
    }
}

// Check auto theme every minute
setInterval(checkAutoTheme, 60000);

function loadSettings() {
    const savedTheme = localStorage.getItem('neurochat_theme') || 'light';
    setTheme(savedTheme);
    
    // Also update the sidebar theme buttons if they exist
    const themeBtn = document.querySelector(`[data-theme="${savedTheme}"]`);
    if (themeBtn) {
        document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
        themeBtn.classList.add('active');
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// API Key Management Functions
function openApiKeyModal() {
    elements.apiKeyModal.classList.add('show');
    elements.apiKeyInput.focus();
}

function closeApiKeyModal() {
    elements.apiKeyModal.classList.remove('show');
    elements.apiKeyInput.value = '';
}

function handleApiKeyModalClick(event) {
    // Close modal if clicking on the overlay (not the content)
    if (event.target === elements.apiKeyModal) {
        closeApiKeyModal();
    }
}

async function saveApiKey() {
    const apiKey = elements.apiKeyInput.value.trim();
    
    // Log the captured API key to console (safely)
    console.log('API Key captured:', apiKey ? `${apiKey.substring(0, 6)}...` : 'empty');
    
    if (!apiKey) {
        showToast('Please enter an API key', 'warning');
        return;
    }
    
    // Basic client-side validation
    if (apiKey.length < 20) {
        showToast('API key seems too short. Please check and try again.', 'warning');
        return;
    }
    
    // Call the enhanced validation function
    await sendApiKeyToBackend(apiKey);
}

// Enhanced function to send API key to backend with validation and model discovery
async function sendApiKeyToBackend(apiKey) {
    try {
        console.log('Validating API key with backend...');
        
        // Show loading state
        const saveButton = elements.apiKeySave;
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Validating...';
        saveButton.disabled = true;
        
        const response = await apiFetch('/api/save-key', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                apiKey: apiKey,
                provider: null // Let backend auto-detect the provider
            })
        });
        
        const data = await response.json();
        
        // Restore button state
        saveButton.textContent = originalText;
        saveButton.disabled = false;
        
        if (data.success) {
            console.log('API Key validated successfully!');
            console.log('Provider:', data.providerName);
            console.log('Models discovered:', data.modelsDiscovered);
            console.log('Model list:', data.models);
            
            // Update UI with discovered models
            updateDiscoveredModels(data.models, data.modelsDiscovered, data.providerName);
            
            showToast(`✓ ${data.providerName} API key validated! Found ${data.modelsDiscovered} models`, 'success');
            elements.apiKeyBtn.classList.add('active');
            elements.apiKeyBtn.querySelector('span').textContent = data.providerName || 'API Key Set';
            closeApiKeyModal();
        } else {
            console.error('API key validation failed:', data);
            
            // Show specific error message based on response
            if (response.status === 401) {
                showToast('❌ Invalid API key - authentication failed', 'error');
            } else if (response.status === 400) {
                showToast(data.error || 'Invalid API key format', 'error');
            } else {
                showToast(data.message || 'Failed to validate API key', 'error');
            }
        }
    } catch (error) {
        console.error('Error validating API key:', error);
        
        // Restore button state on error
        const saveButton = elements.apiKeySave;
        saveButton.textContent = 'Save';
        saveButton.disabled = false;
        
        showToast('Failed to connect to backend server', 'error');
    }
}

// Function to update the UI with discovered models
function updateDiscoveredModels(models, modelCount, providerName) {
    console.log('Updating UI with discovered models...');
    console.log('Provider:', providerName);
    
    // Update global variables
    availableModels = models || [];
    hasApiKeys = true;
    
    // Update the model dropdown
    updateModelDropdown();
    
    // Update the model button text to show provider and count
    const modelBtn = elements.modelBtn;
    if (modelBtn) {
        const span = modelBtn.querySelector('span');
        if (span) {
            if (providerName) {
                span.textContent = `${providerName} (${modelCount} models)`;
            } else {
                span.textContent = `${modelCount} Models`;
            }
        }
        modelBtn.classList.remove('disabled');
        modelBtn.classList.add('active');
    }
    
    // Set the first model as current if none selected
    if (!currentModel && availableModels.length > 0) {
        currentModel = availableModels[0].id;
        updateModelDisplay();
    }
    
    // Log the update for debugging
    console.log('UI updated with models:', {
        totalModels: modelCount,
        currentModel: currentModel,
        firstFewModels: models.slice(0, 3).map(m => ({ id: m.id, name: m.name }))
    });
}

// Load available models from backend
async function loadAvailableModels() {
    try {
        const response = await apiFetch('/api/v1/models/config');
        const data = await response.json();
        
        if (data.success) {
            availableModels = data.models || [];
            hasApiKeys = data.hasApiKeys || false;
            
            updateModelDropdown();
            
            // Set first model as current if none selected
            if (!currentModel && availableModels.length > 0) {
                selectModel(availableModels[0].id);
            }
            // initialize multi-select to current
            selectedModels = currentModel ? [currentModel] : [];
            updateApplyModelsButton();
        }
    } catch (error) {
        console.error('Error loading models:', error);
        showToast('Failed to load available models', 'error');
    }
}

function applySelectedModels() {
    if (selectedModels.length === 0 && availableModels.length) {
        selectedModels = [availableModels[0].id];
    }
    if (selectedModels.length > 0) {
        currentModel = selectedModels[0];
        updateModelDisplay();
        const count = selectedModels.length;
        showToast(`Collaboration: ${count} model${count>1?'s':''} selected`, 'success');
        elements.modelBtn.classList.remove('open');
        elements.modelDropdown.classList.remove('open');
        
        // Start immediately with the current text or a default starter so only selected models run
        const existing = elements.messageInput.value.trim();
        if (!existing) {
            elements.messageInput.value = count > 1 
                ? 'Collaborate and provide a concise, merged answer.' 
                : 'Please answer clearly and concisely.';
            updateCharCounter();
        }
        
        if (isAgentMode) {
            sendAgentMessage();
        } else {
            sendMessage();
        }
    }
}

function updateApplyModelsButton() {
    const btn = document.getElementById('applyModelsBtn');
    if (!btn) return;
    if (selectedModels.length > 1) {
        btn.textContent = `Apply (${selectedModels.length} models)`;
    } else if (selectedModels.length === 1) {
        btn.textContent = 'Apply (1 model)';
    } else {
        btn.textContent = 'Apply Selection';
    }
}

// Update the model dropdown with available models
function updateModelDropdown() {
    const dropdown = elements.modelDropdown;
    
    // Clear existing options and rebuild
    dropdown.innerHTML = '';

    if (availableModels.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'no-models-message';
        empty.innerHTML = `
            <div class="model-info">
                <span class="model-name">No Models Available</span>
                <span class="model-desc">Please add an API key to discover models</span>
            </div>
        `;
        dropdown.appendChild(empty);
    } else {
        // Model list container
        const list = document.createElement('div');
        list.className = 'model-list';

        availableModels.forEach((model) => {
            const modelOption = document.createElement('div');
            modelOption.className = 'model-option';
            modelOption.setAttribute('data-model', model.id);
            modelOption.innerHTML = `
                <div class="model-left">
                    <input type="checkbox" class="model-checkbox" data-model-id="${model.id}" ${selectedModels.includes(model.id) ? 'checked' : ''} />
                    <div class="model-info">
                        <span class="model-name">${model.name}${selectedModels.includes(model.id) ? ' (selected)' : ''}</span>
                        <span class="model-desc">${model.description || 'AI Model'}</span>
                    </div>
                </div>
                <div class="model-status">
                    <div class="status-dot active"></div>
                </div>
            `;
            modelOption.addEventListener('click', (e) => {
                const cb = modelOption.querySelector('input.model-checkbox');
                if (e.target !== cb) cb.checked = !cb.checked;
                const id = model.id;
                if (cb.checked) {
                    if (!selectedModels.includes(id)) selectedModels.push(id);
                } else {
                    selectedModels = selectedModels.filter(mid => mid !== id);
                }
                if (selectedModels.length > 0) currentModel = selectedModels[0];
                updateApplyModelsButton();
                e.stopPropagation();
            });
            list.appendChild(modelOption);
        });
        dropdown.appendChild(list);

        // Sticky actions footer with Apply button
        const actions = document.createElement('div');
        actions.id = 'modelActions';
        actions.className = 'model-actions';
        actions.innerHTML = `<button id="applyModelsBtn" class="apply-models-btn">Apply Selection</button>`;
        dropdown.appendChild(actions);

        const btn = actions.querySelector('#applyModelsBtn');
        if (btn && !btn._bound) {
            btn.addEventListener('click', applySelectedModels);
            btn._bound = true;
        }
        updateApplyModelsButton();
    }

    // Update model button text under header and footer label
    if (availableModels.length > 0) {
        const firstModel = availableModels[0];
        elements.modelBtn.querySelector('span').textContent = selectedModels.length > 1 ? `${selectedModels.length} models selected` : firstModel.name;
        elements.currentModel.textContent = (selectedModels.length > 1 ? `${selectedModels.length} models` : firstModel.name.split(' ')[0]);
    } else {
        elements.modelBtn.querySelector('span').textContent = 'No Models';
        elements.currentModel.textContent = 'None';
    }
}

// Update model display in the UI
function updateModelDisplay() {
    if (currentModel && availableModels.length > 0) {
        const selectedModel = availableModels.find(model => model.id === currentModel);
        if (selectedModel) {
            // Update model button text
            const modelBtn = elements.modelBtn;
            if (modelBtn) {
                const span = modelBtn.querySelector('span');
                if (span) {
                    span.textContent = selectedModels.length > 1 ? `${selectedModels.length} models selected` : selectedModel.name;
                }
            }
            
            // Update current model display at bottom
            if (elements.currentModel) {
                elements.currentModel.textContent = selectedModels.length > 1 ? `${selectedModels.length} models` : selectedModel.name.split(' ')[0];
            }
            
            console.log('Model display updated to:', selectedModel.name);
        }
    }
}

// Error handling
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showToast('An unexpected error occurred', 'error');
});

// Handle online/offline status
window.addEventListener('online', () => {
    showToast('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    showToast('Connection lost', 'warning');
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + K to focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        elements.messageInput.focus();
    }
    
    // Escape to close modals/dropdowns
    if (event.key === 'Escape') {
        closeSettings();
        elements.modelBtn.classList.remove('open');
        elements.modelDropdown.classList.remove('open');
        closeSidebar();
    }
});

