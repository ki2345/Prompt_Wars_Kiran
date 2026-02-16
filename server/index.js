const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

/**
 * Room Object Structure:
 * {
 *   id: string,
 *   hostId: string,
 *   players: [{ id: string, name: string, score: number, isReady: boolean }],
 *   settings: { rounds: number, timer: number, categories: string[] },
 *   gameState: 'LOBBY' | 'STARTING' | 'PLAYING' | 'ROUND_RESULTS' | 'GAME_OVER',
 *   currentRound: number,
 *   currentLetter: string,
 *   submissions: { [round: number]: { [playerId: string]: { [category: string]: string } } },
 *   roundResults: []
 * }
 */

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create_room', ({ playerName, settings }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = {
      id: roomId,
      hostId: socket.id,
      players: [{ id: socket.id, name: playerName, score: 0, isReady: true }],
      settings: settings || { rounds: 5, timer: 60, categories: [] },
      gameState: 'LOBBY',
      currentRound: 0,
      currentLetter: '',
      submissions: {},
      roundResults: []
    };
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit('room_created', room);
    console.log(`Room created: ${roomId} by ${playerName}`);
  });

  socket.on('join_room', ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    if (room) {
      if (room.players.length >= 8) {
        socket.emit('error', 'Room is full');
        return;
      }
      const player = { id: socket.id, name: playerName, score: 0, isReady: false };
      room.players.push(player);
      socket.join(roomId);
      io.to(roomId).emit('player_joined', room);
      console.log(`${playerName} joined room: ${roomId}`);
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('update_settings', ({ roomId, settings }) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      room.settings = { ...room.settings, ...settings };
      io.to(roomId).emit('settings_updated', room.settings);
    }
  });

  socket.on('start_game', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      if (room.settings.categories.length !== 4) {
        socket.emit('error', 'Select exactly 4 categories');
        return;
      }
      room.gameState = 'STARTING';
      startNextRound(roomId);
    }
  });

  socket.on('submit_answers', ({ roomId, answers }) => {
    const room = rooms.get(roomId);
    if (room && room.gameState === 'PLAYING') {
      if (!room.submissions[room.currentRound]) {
        room.submissions[room.currentRound] = {};
      }
      room.submissions[room.currentRound][socket.id] = answers;

      const playersInRoom = room.players.length;
      const submissionsCount = Object.keys(room.submissions[room.currentRound]).length;

      io.to(roomId).emit('player_submitted', { playerId: socket.id });

      if (submissionsCount === playersInRoom) {
        processRoundResults(roomId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Find room where player was and remove them
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          if (room.hostId === socket.id) {
            room.hostId = room.players[0].id;
          }
          io.to(roomId).emit('player_left', room);
        }
        break;
      }
    }
  });
});

function startNextRound(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.currentRound++;
  if (room.currentRound > room.settings.rounds) {
    room.gameState = 'GAME_OVER';
    io.to(roomId).emit('game_over', room);
    return;
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  room.currentLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
  room.gameState = 'PLAYING';

  io.to(roomId).emit('round_started', {
    round: room.currentRound,
    letter: room.currentLetter,
    gameState: room.gameState
  });

  // Server-side timer to force round end
  setTimeout(() => {
    const currentRoom = rooms.get(roomId);
    if (currentRoom && currentRoom.currentRound === room.currentRound && currentRoom.gameState === 'PLAYING') {
      processRoundResults(roomId);
    }
  }, (room.settings.timer + 2) * 1000); // 2-second buffer
}

function processRoundResults(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.gameState !== 'PLAYING') return;

  room.gameState = 'ROUND_RESULTS';
  const roundSubmissions = room.submissions[room.currentRound] || {};
  const categories = room.settings.categories;
  const roundSummary = []; // { category, results: [{ playerId, answer, points, clashedWith: [] }] }

  categories.forEach(cat => {
    const categoryResults = { category: cat, answers: {} };
    const playerResults = [];

    // Group answers to find clashes
    room.players.forEach(player => {
      const answer = (roundSubmissions[player.id]?.[cat] || '').trim().toLowerCase();
      const isValid = answer.length > 0 && answer[0].toUpperCase() === room.currentLetter;

      if (!isValid) {
        playerResults.push({ playerId: player.id, playerName: player.name, answer: answer || '(Empty)', points: 0, status: 'invalid' });
      } else {
        if (!categoryResults.answers[answer]) {
          categoryResults.answers[answer] = [];
        }
        categoryResults.answers[answer].push(player.id);
      }
    });

    // Check for clashes
    Object.entries(categoryResults.answers).forEach(([answer, playerIds]) => {
      const points = playerIds.length === 1 ? 10 : 0;
      const status = playerIds.length === 1 ? 'unique' : 'clash';
      playerIds.forEach(pId => {
        const player = room.players.find(p => p.id === pId);
        playerResults.push({
          playerId: pId,
          playerName: player.name,
          answer: answer,
          points: points,
          status: status,
          clashedWith: playerIds.length > 1 ? playerIds.filter(id => id !== pId).map(id => room.players.find(p => p.id === id).name) : []
        });
        player.score += points;
      });
    });

    roundSummary.push({ category: cat, results: playerResults });
  });

  room.roundResults.push({ round: room.currentRound, summary: roundSummary });
  io.to(roomId).emit('round_ended', {
    room: room,
    roundSummary: roundSummary
  });

  // Wait 10 seconds before next round or game over
  setTimeout(() => {
    startNextRound(roomId);
  }, 10000);
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
