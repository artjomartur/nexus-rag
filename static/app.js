document.addEventListener('DOMContentLoaded', () => {
    // Determine which page we are on
    const isLandingPage = document.body.classList.contains('landing-page');

    if (isLandingPage) {
        initLandingPage();
    } else {
        initRAGApp();
    }

    function initLandingPage() {
        const contactForm = document.getElementById('contact-form');
        const contactStatus = document.getElementById('contact-status');
        const themeToggle = document.getElementById('theme-toggle');

        initTheme(themeToggle);

        // Mouse spotlight effect
        document.addEventListener('mousemove', (e) => {
            document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
            document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
        });

        // Smooth Scroll
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Contact Form
        if (contactForm) {
            contactForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById('contact-submit');
                const formData = {
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    message: document.getElementById('message').value
                };

                submitBtn.disabled = true;
                contactStatus.innerText = 'Sending...';
                contactStatus.className = 'status-message visible loading';

                try {
                    const response = await fetch('/contact', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                    const result = await response.json();

                    if (response.ok) {
                        contactStatus.innerText = result.message;
                        contactStatus.className = 'status-message visible success';
                        contactForm.reset();
                    } else {
                        contactStatus.innerText = 'Error sending message.';
                        contactStatus.className = 'status-message visible error';
                    }
                } catch (error) {
                    contactStatus.innerText = 'Service unavailable.';
                    contactStatus.className = 'status-message visible error';
                } finally {
                    submitBtn.disabled = false;
                }
            });
        }
    }

    function initRAGApp() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const statusMsg = document.getElementById('upload-status');
        const questionInput = document.getElementById('question-input');
        const sendBtn = document.getElementById('send-btn');
        const chatHistory = document.getElementById('chat-history');
        const notebookList = document.getElementById('notebook-list');
        const addNotebookBtn = document.getElementById('add-notebook-btn');
        const notebookModal = document.getElementById('notebook-modal');
        const saveNotebookBtn = document.getElementById('save-notebook');
        const closeModalBtn = document.getElementById('close-modal');
        const newNotebookName = document.getElementById('new-notebook-name');
        const activeTitle = document.getElementById('active-notebook-title');
        const themeToggle = document.getElementById('theme-toggle');

        initTheme(themeToggle);

        let activeNotebook = 'Default';

        // Drag and drop handlers
        if (dropZone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
            });

            dropZone.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                handleFiles(files);
            }, false);
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
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
            showStatus('Processing PDF...', 'loading');
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/ingest', {
                    method: 'POST',
                    headers: { 'notebook': activeNotebook },
                    body: formData
                });
                const result = await response.json();

                if (response.ok) {
                    showStatus(`Success! '${file.name}' ingested.`, 'success');
                    fetchIngestedFiles();
                    enableChat();
                } else {
                    showStatus(`Error: ${result.detail || 'Upload failed'}`, 'error');
                }
            } catch (error) {
                showStatus('Network error during upload.', 'error');
            }
        }

        function showStatus(text, type) {
            if (statusMsg) {
                statusMsg.innerText = text;
                statusMsg.className = `status-message visible ${type}`;
            }
        }

        function enableChat() {
            questionInput.disabled = false;
            sendBtn.disabled = false;
        }

        // Chat handlers
        if (questionInput) {
            questionInput.addEventListener('input', () => {
                if (questionInput.value.trim().length > 0) {
                    sendBtn.classList.add('active');
                } else {
                    sendBtn.classList.remove('active');
                }
            });

            questionInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendQuestion();
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', sendQuestion);
        }

        async function sendQuestion() {
            const question = questionInput.value.trim();
            if (!question) return;

            appendMessage('user', question, '👤');
            questionInput.value = '';
            questionInput.disabled = true;
            sendBtn.disabled = true;
            sendBtn.classList.remove('active');

            const loadingId = appendMessage('system', 'Thinking...', '⚡️');

            try {
                const response = await fetch('/query', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'notebook': activeNotebook 
                    },
                    body: JSON.stringify({ question })
                });
                const result = await response.json();

                const loader = document.getElementById(loadingId);
                if (loader) loader.remove();

                if (response.ok) {
                    appendMessage('system', result.answer, '⚡️');
                } else {
                    appendMessage('system', `Error: ${result.detail || 'Query failed'}`, '⚡️');
                }
            } catch (error) {
                const loader = document.getElementById(loadingId);
                if (loader) loader.remove();
                appendMessage('system', 'Service unavailable.', '⚡️');
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

        // Notebook Management
        async function fetchNotebooks() {
            try {
                const response = await fetch('/notebooks');
                const data = await response.json();
                renderNotebookList(data.notebooks);
            } catch (error) {
                console.error("Failed to fetch notebooks");
            }
        }

        function renderNotebookList(notebooks) {
            notebookList.innerHTML = '';
            notebooks.forEach(name => {
                const div = document.createElement('div');
                div.className = `notebook-item ${name === activeNotebook ? 'active' : ''}`;
                div.innerText = name;
                div.onclick = () => switchNotebook(name);
                notebookList.appendChild(div);
            });
        }

        function switchNotebook(name) {
            activeNotebook = name;
            activeTitle.innerText = name;
            renderNotebookList([...document.querySelectorAll('.notebook-item')].map(i => i.innerText));
            chatHistory.innerHTML = '<div class="message system-msg"><div class="avatar">⚡️</div><div class="msg-content">Switched to ' + name + '. Context updated.</div></div>';
            fetchIngestedFiles();
        }

        async function fetchIngestedFiles() {
            try {
                const response = await fetch('/files', { headers: { 'notebook': activeNotebook } });
                const data = await response.json();
                const fileList = document.getElementById('file-list');
                if (data.files && data.files.length > 0) {
                    fileList.innerHTML = data.files.map(f => `<div class="file-chip">${f}</div>`).join('');
                    enableChat();
                } else {
                    fileList.innerHTML = '<p class="empty-state">No documents ingested for this notebook.</p>';
                    questionInput.disabled = true;
                    sendBtn.disabled = true;
                }
            } catch (error) {
                console.error("Failed to fetch files");
            }
        }

        // Modal Logic
        addNotebookBtn.onclick = () => notebookModal.classList.add('visible');
        closeModalBtn.onclick = () => notebookModal.classList.remove('visible');
        saveNotebookBtn.onclick = async () => {
            const name = newNotebookName.value.trim();
            if (name) {
                await fetch('/notebooks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                newNotebookName.value = '';
                notebookModal.classList.remove('visible');
                fetchNotebooks();
            }
        };

        // Initial Load
        fetchNotebooks();
        fetchIngestedFiles();
    }

    function initTheme(toggleBtn) {
        const currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        if (currentTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

        if (toggleBtn) {
            toggleBtn.onclick = () => {
                const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
                else document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', theme);
            };
        }
    }
});
