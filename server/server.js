const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
var FifoArray = require('fifo-array');

const {generateMessage, generateLocationMessage} = require('./utils/message');
const {isRealString} = require('./utils/validation');
const {Users} = require('./utils/users');

const publicPath = path.join(__dirname, '../public');
const port = process.env.PORT || 3000;
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();
var fifoArray = new FifoArray(100);

app.use(express.static(publicPath));

io.on('connection', (socket) => {
  console.log('New user connected');
  socket.emit('connect');
  console.log('connect');

  socket.on('add user', (params) => {
    if (!isRealString(params.name)) {
      return;
    }
    console.log("Socket id: "+socket.id);
    console.log("Name: "+params.name);
    socket.join('tattle');
    users.removeUser(socket.id);
    users.addUser(socket.id, params.name, 'tattle');

    console.log(JSON.stringify(users));
    io.to('tattle').emit('updateUserList', users.getUserList('tattle'));
    socket.emit('join', {'messageList' : fifoArray});//generateMessage('Admin', 'Welcome to the chat app'));
    socket.broadcast.to('tattle').emit('newMessage', generateMessage('Admin', `${params.name} has joined.`, 1));
    //fifoArray.push(generateMessage('Admin', `${params.name} has joined.`));
  });

  socket.on('createMessage', (message) => {
    var user = users.getUser(socket.id);
    console.log("message: "+message.text);
    console.log("avatar: "+message.avatar);
    console.log("type: "+message.anonymous);

    console.log(JSON.stringify(user));

    if (user && isRealString(message.text)) {
      if(message.anonymous === 1) {
          console.log("Annonymous");
          socket.broadcast.to('tattle').emit('newMessage', generateMessage('anonymous', message.text, message.avatar));
          fifoArray.push(generateMessage('anonymous', message.text, message.avatar));
      }
      else{
          console.log("Not Annonymous");
          socket.broadcast.to('tattle').emit('newMessage', generateMessage(user.name, message.text, message.avatar));
          fifoArray.push(generateMessage(user.name, message.text, message.avatar));
      }
        console.log("message broadcasted.");
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
    console.log("Disconnected: "+socket.id);
    if (user) {
      io.to('tattle').emit('updateUserList', users.getUserList('tattle'));
      io.to('tattle').emit('newMessage', generateMessage('Admin', `${user.name} has left.`));
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on ${port}`);
});
