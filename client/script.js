class ChatApp {
    constructor() {
        this.socket = null;
        this.username = null;
        this.isConnected = false;
        this.typingTimeout = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.connectToServer();
    }
    
    initializeElements() {
        this.loginScreen = document.getElementById('loginScreen');
        this.chatContainer = document.getElementById('chatContainer');
        this.usernameInput = document.getElementById('usernameInput');
        this.loginBtn = document.getElementById('loginBtn');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.messagesContainer = document.getElementById('messages');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.usersCount = document.getElementById('usersCount');
        this.onlineUsers = document.getElementById('onlineUsers');
        this.typingIndicator = document.getElementById('typingIndicator');
    }
    
    setupEventListeners() {
        this.loginBtn.addEventListener('click', () => this.login());
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.messageInput.addEventListener('input', () => this.handleTyping());
    }
    
    connectToServer() {
        const serverUrl = window.location.origin.replace(/^http/, 'ws')
            .replace('8080', '3000');
        
        this.socket = io(serverUrl, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
        
        this.socket.on('connect', () => {
            console.log('Подключено к серверу');
            this.isConnected = true;
            this.updateConnectionStatus(true);
        });
        
        this.socket.on('disconnect', () => {
            console.log('Отключено от сервера');
            this.isConnected = false;
            this.updateConnectionStatus(false);
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Ошибка подключения:', error);
            this.isConnected = false;
            this.updateConnectionStatus(false);
        });
        
        this.socket.on('messageHistory', (messages) => {
            messages.forEach(message => this.addMessageToChat(message, false));
            this.scrollToBottom();
        });
        
        this.socket.on('newMessage', (message) => {
            this.addMessageToChat(message, false);
            this.scrollToBottom();
        });
        
        this.socket.on('userJoined', (data) => {
            this.addSystemMessage(`${data.username} присоединился к чату`);
            this.updateUsersCount(data.usersCount);
        });
        
        this.socket.on('userLeft', (data) => {
            this.addSystemMessage(`${data.username} покинул чат`);
            this.updateUsersCount(data.usersCount);
        });
        
        this.socket.on('userTyping', (data) => {
            this.showTypingIndicator(data);
        });
    }
    
    updateConnectionStatus(connected) {
        const statusElement = this.connectionStatus;
        if (connected) {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Онлайн';
            statusElement.className = 'status-online';
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Отключен';
            statusElement.className = 'status-offline';
        }
    }
    
    login() {
        this.username = this.usernameInput.value.trim();
        
        if (!this.username) {
            alert('Пожалуйста, введите ваше имя');
            return;
        }
        
        if (this.username.length > 20) {
            alert('Имя не должно превышать 20 символов');
            return;
        }
        
        if (this.isConnected) {
            this.socket.emit('userLogin', this.username);
            this.loginScreen.style.display = 'none';
            this.chatContainer.style.display = 'flex';
            this.messageInput.disabled = false;
            this.sendBtn.disabled = false;
            this.messageInput.focus();
            
            // Добавляем приветственное сообщение
            this.addSystemMessage('Добро пожаловать в чат!');
        } else {
            alert('Не удалось подключиться к серверу. Попробуйте позже.');
        }
    }
    
    sendMessage() {
        const text = this.messageInput.value.trim();
        
        if (!text || !this.isConnected) return;
        
        this.socket.emit('sendMessage', { text });
        this.addMessageToChat({
            id: Date.now(),
            username: this.username,
            text: text,
            time: new Date().toLocaleTimeString(),
            userId: 'self'
        }, true);
        
        this.messageInput.value = '';
        this.handleTypingEnd();
        this.scrollToBottom();
    }
    
    addMessageToChat(message, isOwn = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : ''}`;
        messageDiv.dataset.id = message.id;
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-username">${message.username}</span>
                <span class="message-time">${message.time}</span>
            </div>
            <div class="message-content">${this.escapeHtml(message.text)}</div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
    }
    
    addSystemMessage(text) {
        const systemDiv = document.createElement('div');
        systemDiv.className = 'system-message';
        systemDiv.textContent = text;
        this.messagesContainer.appendChild(systemDiv);
    }
    
    updateUsersCount(count) {
        this.usersCount.textContent = `${count} пользователей онлайн`;
    }
    
    handleTyping() {
        if (!this.typingTimeout) {
            this.socket.emit('typing', true);
        }
        
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.handleTypingEnd();
        }, 1000);
    }
    
    handleTypingEnd() {
        this.socket.emit('typing', false);
        clearTimeout(this.typingTimeout);
        this.typingTimeout = null;
    }
    
    showTypingIndicator(data) {
        if (data.isTyping && data.username !== this.username) {
            this.typingIndicator.textContent = `${data.username} печатает...`;
        } else {
            this.typingIndicator.textContent = '';
        }
    }
    
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});