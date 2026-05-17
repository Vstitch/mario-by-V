import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        players: [],
        spectators: [],
        gameStarted: false,
        fen: null
      });
    }

    const room = rooms.get(roomId);
    
    // Assign role
    let role = "spectator";
    if (room.players.length === 0) {
      role = "w"; // White is Mario
      room.players.push({ id: socket.id, username, role });
    } else if (room.players.length === 1) {
      role = "b"; // Black is Bowser
      room.players.push({ id: socket.id, username, role });
      room.gameStarted = true;
    } else {
      room.spectators.push({ id: socket.id, username });
    }

    console.log(`User ${socket.id} (${username}) joined room ${roomId} as ${role}`);

    // Let the user know their role and the room state
    socket.emit("room-joined", {
      role,
      players: room.players,
      spectators: room.spectators,
      gameStarted: room.gameStarted,
      fen: room.fen
    });

    // Notify others
    socket.to(roomId).emit("user-joined", {
      id: socket.id,
      username,
      role,
      players: room.players,
      spectators: room.spectators
    });
  });

  socket.on("make-move", ({ roomId, move, fen }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.fen = fen;
      // Broadcast the move to the other player/spectators
      socket.to(roomId).emit("move-made", { move, fen });
    }
  });

  socket.on("reset-game", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.fen = null;
      socket.to(roomId).emit("game-reset");
    }
  });

  socket.on("chat-message", ({ roomId, message, username }) => {
    socket.to(roomId).emit("chat-msg-received", { message, username });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    
    // Search room they were in and remove them
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const removedPlayer = room.players.splice(playerIndex, 1)[0];
        room.gameStarted = false;
        
        console.log(`Player ${removedPlayer.username} left room ${roomId}`);
        
        // Notify room
        io.to(roomId).emit("player-left", {
          id: socket.id,
          username: removedPlayer.username,
          players: room.players
        });

        // Clean up empty room
        if (room.players.length === 0 && room.spectators.length === 0) {
          rooms.delete(roomId);
        }
        break;
      }

      const spectatorIndex = room.spectators.findIndex(s => s.id === socket.id);
      if (spectatorIndex !== -1) {
        room.spectators.splice(spectatorIndex, 1);
        io.to(roomId).emit("spectator-left", { id: socket.id, spectators: room.spectators });
        
        if (room.players.length === 0 && room.spectators.length === 0) {
          rooms.delete(roomId);
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO Server running on port ${PORT}`);
});
