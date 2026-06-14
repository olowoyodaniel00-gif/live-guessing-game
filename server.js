const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// ============ MONGODB SETUP ============
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'guessing_game';

let db;
let scoresCollection;

async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!');
    
    db = client.db(DB_NAME);
    scoresCollection = db.collection('scores');
    
    await scoresCollection.createIndex({ playerName: 1 });
    
    console.log('✅ Database ready!');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.log('⚠️ Running without database (scores won\'t be saved)');
  }
}

async function saveScoreToDB(playerName, score, sessionId) {
  if (!scoresCollection) return;
  
  try {
    await scoresCollection.updateOne(
      { playerName: playerName },
      { 
        $set: { 
          lastPlayed: new Date(),
          lastSessionId: sessionId
        },
        $max: { highestScore: score },
        $inc: { totalGamesWon: 1 }
      },
      { upsert: true }
    );
    console.log(`✅ Saved score for ${playerName}: ${score}`);
  } catch (error) {
    console.error('❌ Error saving score:', error);
  }
}

async function getLeaderboard(limit = 10) {
  if (!scoresCollection) return [];
  
  try {
    return await scoresCollection
      .find({})
      .sort({ highestScore: -1 })
      .limit(limit)
      .toArray();
  } catch (error) {
    console.error('❌ Error loading leaderboard:', error);
    return [];
  }
}

// ============ GAME SESSION CLASS ============
class GameSession {
  constructor(sessionId, masterId, masterName) {
    this.id = sessionId;
    this.masterId = masterId;
    this.masterName = masterName;
    this.players = new Map();
    this.status = 'waiting';
    this.currentQuestion = null;
    this.currentAnswer = null;
    this.timeLeft = 60;
    this.timer = null;
    this.winnerId = null;
    this.gameEnded = false;
    this.playerAttempts = new Map();
  }

  addPlayer(socketId, name) {
    if (this.status !== 'waiting') return false;
    if (this.players.has(socketId)) return false;
    this.players.set(socketId, { 
      name, 
      score: 0, 
      isMaster: socketId === this.masterId 
    });
    return true;
  }

  removePlayer(socketId) {
    const wasMaster = this.players.get(socketId)?.isMaster;
    this.players.delete(socketId);
    
    if (this.players.size === 0) {
      return { deleted: true };
    }
    
    if (wasMaster && this.status === 'waiting') {
      const newMasterId = Array.from(this.players.keys())[0];
      const newMaster = this.players.get(newMasterId);
      newMaster.isMaster = true;
      this.masterId = newMasterId;
      this.masterName = newMaster.name;
      return { newMasterId, newMasterName: newMaster.name };
    }
    return { deleted: false };
  }

  startGame(question, answer) {
    if (this.status !== 'waiting') return false;
    if (this.players.size < 2) return false;
    if (!question || !answer) return false;
    
    this.currentQuestion = question;
    this.currentAnswer = answer.toLowerCase().trim();
    this.status = 'active';
    this.timeLeft = 60;
    this.gameEnded = false;
    this.winnerId = null;
    
    this.playerAttempts.clear();
    for (let [socketId] of this.players) {
      this.playerAttempts.set(socketId, 3);
    }
    
    this.timer = setInterval(() => {
      if (this.status === 'active' && this.timeLeft > 0) {
        this.timeLeft--;
        io.to(this.id).emit('timer_update', this.timeLeft);
        
        if (this.timeLeft === 0) {
          this.endGame(null);
        }
      }
    }, 1000);
    
    return true;
  }
  
  endGame(winnerId) {
    if (this.gameEnded) return;
    this.gameEnded = true;
    clearInterval(this.timer);
    
    if (winnerId && this.players.has(winnerId)) {
      this.winnerId = winnerId;
      const winner = this.players.get(winnerId);
      winner.score += 10;
      
      saveScoreToDB(winner.name, winner.score, this.id);
      
      io.to(this.id).emit('game_ended', {
        winner: winner.name,
        winnerId,
        answer: this.currentAnswer,
        scores: this.getScores()
      });
    } else {
      io.to(this.id).emit('game_ended', {
        winner: null,
        answer: this.currentAnswer,
        scores: this.getScores()
      });
    }
    
    this.status = 'ended';
    
    const currentPlayers = Array.from(this.players.keys());
    if (currentPlayers.length > 0) {
      let newMasterId = currentPlayers[0];
      if (winnerId && newMasterId === winnerId && currentPlayers.length > 1) {
        newMasterId = currentPlayers[1];
      }
      const oldMaster = this.players.get(this.masterId);
      if (oldMaster) oldMaster.isMaster = false;
      
      const newMaster = this.players.get(newMasterId);
      newMaster.isMaster = true;
      this.masterId = newMasterId;
      this.masterName = newMaster.name;
      this.status = 'waiting';
      this.currentQuestion = null;
      this.currentAnswer = null;
      this.winnerId = null;
      
      io.to(this.id).emit('new_master', { masterId: newMasterId, masterName: newMaster.name });
    }
  }
  
  getScores() {
    const scores = [];
    for (let [id, data] of this.players) {
      scores.push({ id, name: data.name, score: data.score });
    }
    return scores.sort((a,b) => b.score - a.score);
  }
  
  attemptGuess(socketId, guess) {
    if (this.status !== 'active') return { success: false, reason: 'Game not active' };
    if (this.gameEnded) return { success: false, reason: 'Game already ended' };
    if (this.winnerId) return { success: false, reason: 'Game already won' };
    
    const player = this.players.get(socketId);
    if (!player) return { success: false, reason: 'Not in game' };
    
    const attemptsLeft = this.playerAttempts.get(socketId) || 3;
    if (attemptsLeft <= 0) {
      return { success: false, reason: 'No attempts left! You used all 3 guesses.' };
    }
    
    if (guess.toLowerCase().trim() === this.currentAnswer) {
      this.endGame(socketId);
      return { success: true, isWinner: true };
    }
    
    this.playerAttempts.set(socketId, attemptsLeft - 1);
    
    io.to(socketId).emit('attempts_update', { attemptsLeft: attemptsLeft - 1, totalAttempts: 3 });
    
    return { 
      success: false, 
      isWinner: false, 
      attemptsLeft: attemptsLeft - 1,
      reason: `Wrong guess! ${attemptsLeft - 1} attempts remaining.`
    };
  }
}

// ============ SOCKET.IO EVENT HANDLERS ============
const sessions = new Map();

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  socket.on('create_session', async ({ playerName }) => {
    const sessionId = `game_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const session = new GameSession(sessionId, socket.id, playerName);
    session.addPlayer(socket.id, playerName);
    sessions.set(sessionId, session);
    socket.join(sessionId);
    
    socket.emit('session_created', { 
      sessionId, 
      players: Array.from(session.players.values()).map(p => ({ name: p.name, isMaster: p.isMaster, score: p.score })),
      isMaster: true
    });
    io.to(sessionId).emit('players_update', session.getScores());
  });
  
  socket.on('join_session', async ({ sessionId, playerName }) => {
    const session = sessions.get(sessionId);
    if (!session) {
      socket.emit('error', 'Session not found');
      return;
    }
    if (session.status !== 'waiting') {
      socket.emit('error', 'Game already in progress');
      return;
    }
    if (session.addPlayer(socket.id, playerName)) {
      socket.join(sessionId);
      
      socket.emit('joined_session', { 
        sessionId, 
        players: Array.from(session.players.values()).map(p => ({ name: p.name, isMaster: p.isMaster, score: p.score })),
        isMaster: false
      });
      io.to(sessionId).emit('players_update', session.getScores());
    } else {
      socket.emit('error', 'Cannot join session');
    }
  });
  
  socket.on('start_game', ({ sessionId, question, answer }) => {
    const session = sessions.get(sessionId);
    if (!session) return;
    if (session.masterId !== socket.id) {
      socket.emit('error', 'Only game master can start');
      return;
    }
    if (session.players.size < 2) {
      socket.emit('error', 'Need at least 2 players to start');
      return;
    }
    if (session.startGame(question, answer)) {
      io.to(sessionId).emit('game_started', { 
        question: session.currentQuestion, 
        timeLeft: session.timeLeft 
      });
    } else {
      socket.emit('error', 'Failed to start game');
    }
  });
  
  socket.on('submit_guess', ({ sessionId, guess }) => {
    const session = sessions.get(sessionId);
    if (!session) return;
    const result = session.attemptGuess(socket.id, guess);
    socket.emit('guess_result', result);
  });
  
  socket.on('get_leaderboard', async () => {
    const leaderboard = await getLeaderboard();
    socket.emit('leaderboard_update', leaderboard);
  });
  
  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
    for (let [sessionId, session] of sessions.entries()) {
      if (session.players.has(socket.id)) {
        const result = session.removePlayer(socket.id);
        io.to(sessionId).emit('players_update', session.getScores());
        if (result.deleted) {
          console.log(`🗑️ Session ${sessionId} deleted (empty)`);
          sessions.delete(sessionId);
        } else if (result.newMasterId) {
          io.to(sessionId).emit('new_master', { masterId: result.newMasterId, masterName: result.newMasterName });
        }
        break;
      }
    }
  });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 3000;

connectToMongoDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 ${scoresCollection ? 'MongoDB connected - Scores will be saved!' : 'Running without database'}`);
  });
});