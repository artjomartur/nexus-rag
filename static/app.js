document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const statusMsg = document.getElementById('upload-status');
    const questionInput = document.getElementById('question-input');
    const sendBtn = document.getElementById('send-btn');
    const chatHistory = document.getElementById('chat-history');

    // Drag and drop handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0];
        if (file.type !== 'application/pdf') {
            showStatus('Please upload a PDF file.', 'error');
            return;
        }
        uploadFile(file);
    }

    async function uploadFile(file) {
        showStatus('Processing PDF<span class="loading-dots"></span>', 'loading');
        
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/ingest', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (response.ok) {
                showStatus(`Success! Document fully processed.`, 'success');
                questionInput.disabled = false;
                sendBtn.disabled = false;
                questionInput.focus();
            } else {
                showStatus(`Error: ${result.detail || 'Upload failed'}`, 'error');
            }
        } catch (error) {
            showStatus('Network error during upload.', 'error');
        }
    }

    function showStatus(text, type) {
        statusMsg.innerHTML = text;
        statusMsg.className = `status-message ${type}`;
    }

    // Chat handlers
    sendBtn.addEventListener('click', sendQuestion);
    questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendQuestion();
    });

    async function sendQuestion() {
        const question = questionInput.value.trim();
        if (!question) return;

        // Add user message to UI
        appendMessage('user', question, '👤');
        questionInput.value = '';
        questionInput.disabled = true;
        sendBtn.disabled = true;

        // Add loading state
        const loadingId = appendMessage('system', 'Thinking<span class="loading-dots"></span>', '⚡️');

        try {
            const response = await fetch('/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });
            const result = await response.json();

            // Remove loading
            document.getElementById(loadingId).remove();

            if (response.ok) {
                appendMessage('system', result.answer, '⚡️');
            } else {
                appendMessage('system', `Error: ${result.detail || 'Query failed'}`, '⚡️');
            }
        } catch (error) {
            document.getElementById(loadingId).remove();
            appendMessage('system', 'Service unavailable. Is the server running?', '⚡️');
        } finally {
            questionInput.disabled = false;
            sendBtn.disabled = false;
            questionInput.focus();
        }
    }

    function appendMessage(type, content, avatarIcon) {
        const id = 'msg-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}-msg`;
        msgDiv.id = id;
        
        msgDiv.innerHTML = `
            <div class="avatar">${avatarIcon}</div>
            <div class="msg-content">${content}</div>
        `;
        
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return id;
    }
});
