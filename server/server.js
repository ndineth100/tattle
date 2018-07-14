const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');

const {generateMessage, generateLocationMessage} = require('./utils/message');
const {isRealString} = require('./utils/validation');
const {Users} = require('./utils/users');

const publicPath = path.join(__dirname, '../public');
const port = process.env.PORT || 3000;
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();

app.use(express.static(publicPath));

io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on('add user', (params) => {
    if (!isRealString(params.name)) {
      return;
    }

    socket.join('tattle');
    users.removeUser(socket.id);
    users.addUser(socket.id, params.name, 'tattle');

    io.to('tattle').emit('updateUserList', users.getUserList('tattle'));
    socket.emit('join', {'numUsers' : users.getUserList('tattle').length});//generateMessage('Admin', 'Welcome to the chat app'));
    socket.broadcast.to('tattle').emit('newMessage', generateMessage('Admin', `${params.name} has joined.`));
  });

  socket.on('createMessage', (message) => {
    var user = users.getUser(socket.id);

    if (user && isRealString(message.text)) {
      io.to('tattle').emit('newMessage', generateMessage(user.name, message.text));
    }

  });

  socket.on('createLocationMessage', (coords) => {
    var user = users.getUser(socket.id);

    if (user) {
      io.to('tattle').emit('newLocationMessage', generateLocationMessage(user.name, coords.latitude, coords.longitude));
    }
  });

  socket.on('disconnect', () => {
    var user = users.removeUser(socket.id);

    if (user) {
      io.to('tattle').emit('updateUserList', users.getUserList('tattle'));
      io.to('tattle').emit('newMessage', generateMessage('Admin', `${user.name} has left.`));
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on ${port}`);
});
