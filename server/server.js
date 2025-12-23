const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Хранилище сообщений (в реальном проекте используйте БД)
const messages = [];
const users = new Map();

io.on('connection', (socket) => {
  console.log('Новый пользователь подключился:', socket.id);

  // Отправляем историю сообщений новому пользователю
  socket.emit('messageHistory', messages);

  // Обработка входа пользователя
  socket.on('userLogin', (username) => {
    users.set(socket.id, username);
    socket.username = username;
    
    // Уведомляем всех о новом пользователе
    io.emit('userJoined', {
      username: username,
      time: new Date().toLocaleTimeString(),
      usersCount: users.size
    });
    
    console.log(`Пользователь ${username} вошел в чат`);
  });

  // Обработка сообщений
  socket.on('sendMessage', (data) => {
    const message = {
      id: Date.now(),
      username: socket.username || 'Аноним',
      text: data.text,
      time: new Date().toLocaleTimeString(),
      userId: socket.id
    };
    
    messages.push(message);
    
    // Ограничиваем историю сообщений
    if (messages.length > 100) {
      messages.shift();
    }
    
    // Отправляем сообщение всем
    io.emit('newMessage', message);
  });

  // Обработка отключения
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      users.delete(socket.id);
      
      io.emit('userLeft', {
        username: username,
        time: new Date().toLocaleTimeString(),
        usersCount: users.size
      });
      
      console.log(`Пользователь ${username} вышел из чата`);
    }
  });

  // Обработка набора текста
  socket.on('typing', (isTyping) => {
    socket.broadcast.emit('userTyping', {
      username: socket.username,
      isTyping: isTyping
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`В Codespaces используйте: https://<your-codespace>-${PORT}.app.github.dev`);
});