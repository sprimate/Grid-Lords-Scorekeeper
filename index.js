const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let rooms = {};

// Time to live for a room in milliseconds
const ROOM_TTL = 24 * 60 * 60 * 1000; // 24 hours

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('create-room', () => {
        let roomKey = generateRoomKey();
        rooms[roomKey] = {
            players: {}
        };
        socket.join(roomKey);
        //rooms[roomKey].players[socket.id] = {Glory: 0, Tokens: 0};
        socket.emit('room-joined', { roomKey, playerId: socket.id, data: rooms[roomKey] });

        // Disband room after the set time
        setTimeout(() => {
            if (rooms[roomKey]) {
                delete rooms[roomKey];
                io.to(roomKey).emit('room-disbanded');
            }
        }, ROOM_TTL);
    });

    socket.on('create-player', ({roomKey, name}) => {
        console.log("Player creation requested for ", name);
        rooms[roomKey].players[name] = {Glory: 0, Tokens: 0};
        io.to(roomKey).emit('players-modified', rooms[roomKey].players);
    });

    socket.on('remove-player', ({roomKey, playerName}) => {
        console.log("Request to remove " + playerName + " from " + roomKey);
        delete rooms[roomKey].players[playerName];
        io.to(roomKey).emit('players-modified', rooms[roomKey].players);
    });

    socket.on('join-room', (roomKey) => {
        if (rooms[roomKey]) {
            socket.join(roomKey);
            //rooms[roomKey].players[socket.id] = {Glory: 0, Tokens: 0};
            socket.emit('room-joined', { roomKey, playerId: socket.id, data: rooms[roomKey] });
        } else {
            socket.emit('room-not-found');
        }
    });

    socket.on('update-data', ({ roomKey, value, playerId, elementName }) => {
        if (rooms[roomKey]) {
            rooms[roomKey].players[playerId][elementName] += value;
            io.to(roomKey).emit('data-updated', {playerId: playerId, elementName: elementName, value: rooms[roomKey].players[playerId][elementName]});
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        // Handle user disconnecting and clean-up
    });
});

function generateRoomKey() {
    return Math.random().toString(36).substr(2, 5).toUpperCase();
}

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});