const socket = io();
let currentSessionId = null;
let currentPlayerName = null;
let isGameMaster = false;
let gameActive = false;

const messagesDiv = document.getElementById('messages');
const playersListDiv = document.getElementById('playersList');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const setupModal = document.getElementById('setupModal');
const playerNameInput = document.getElementById('playerNameInput');
const sessionIdInput = document.getElementById('sessionIdInput');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const gameStatusDiv = document.getElementById('gameStatus');
const timerDisplay = document.getElementById('timerDisplay');

function addMessage(text, type = 'system') {
  const msgDiv = document.createElement('div');
  msgDiv.className = `${type}-msg`;
  msgDiv.textContent = text;
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updatePlayersList(players) {
  playersListDiv.innerHTML = '';
  players.forEach(p => {
    const div = document.createElement('div');
    div.className = `player-item ${p.isMaster ? 'player-master' : ''}`;
    div.innerHTML = `<span>${p.name} ${p.isMaster ? '👑' : ''}</span><span>⭐ ${p.score}</span>`;
    playersListDiv.appendChild(div);
  });
}

createBtn.onclick = () => {
  const name = playerNameInput.value.trim();
  if (!name) return alert('Enter your name');
  currentPlayerName = name;
  socket.emit('create_session', { playerName: name });
  setupModal.style.display = 'none';
};

joinBtn.onclick = () => {
  const name = playerNameInput.value.trim();
  const sessionId = sessionIdInput.value.trim();
  if (!name || !sessionId) return alert('Enter name and session ID');
  currentPlayerName = name;
  socket.emit('join_session', { sessionId, playerName: name });
  setupModal.style.display = 'none';
};

sendBtn.onclick = () => {
  const text = messageInput.value.trim();
  if (!text) return;
  
  if (isGameMaster && !gameActive) {
    // Master creating question
    const parts = text.split('|');
    if (parts.length === 2) {
      const question = parts[0].trim();
      const answer = parts[1].trim();
      socket.emit('start_game', { sessionId: currentSessionId, question, answer });
      addMessage(`📢 Game started! Question: ${question}`, 'game');
      messageInput.value = '';
    } else {
      addMessage('⚠️ Format for master: "Question | Answer" (e.g., What is 2+2? | 4)', 'system');
    }
  } else if (gameActive) {
    // Player guess
    socket.emit('submit_guess', { sessionId: currentSessionId, guess: text });
    addMessage(`You guessed: ${text}`, 'guess');
    messageInput.value = '';
  } else {
    addMessage('Game not active or you are not master', 'system');
  }
};

// Socket events
socket.on('session_created', ({ sessionId, players, isMaster }) => {
  currentSessionId = sessionId;
  isGameMaster = isMaster;
  addMessage(`✅ Session created! ID: ${sessionId}. Share this ID with friends to join.`, 'system');
  updatePlayersList(players);
  if (isMaster) addMessage('You are the Game Master! Type "Question | Answer" to start when enough players join.', 'game');
});

socket.on('joined_session', ({ sessionId, players, isMaster }) => {
  currentSessionId = sessionId;
  isGameMaster = isMaster;
  addMessage(`✅ Joined session ${sessionId}`, 'system');
  updatePlayersList(players);
});

socket.on('players_update', (players) => {
  updatePlayersList(players);
});

socket.on('game_started', ({ question, timeLeft }) => {
  gameActive = true;
  addMessage(`🎮 GAME STARTED! Question: ${question}`, 'game');
  addMessage(`⏱️ You have ${timeLeft} seconds and 3 attempts to guess!`, 'system');
  timerDisplay.innerHTML = `<span class="timer">⏰ ${timeLeft}s</span>`;
});

socket.on('timer_update', (timeLeft) => {
  timerDisplay.innerHTML = `<span class="timer">⏰ ${timeLeft}s</span>`;
});

socket.on('game_ended', ({ winner, answer, scores }) => {
  gameActive = false;
  timerDisplay.innerHTML = '';
  if (winner) {
    addMessage(`🏆 WINNER: ${winner}! Correct answer was "${answer}". +10 points! 🎉`, 'game');
  } else {
    addMessage(`⏰ Time's up! The correct answer was "${answer}". No winner this round.`, 'game');
  }
  updatePlayersList(scores);
});

socket.on('guess_result', ({ success, isWinner, reason }) => {
  if (success && isWinner) {
    addMessage('🎉 CORRECT! You won the round! +10 points! 🎉', 'game');
  } else if (!success && !isWinner && reason !== 'Game already ended') {
    addMessage(`❌ Wrong guess! Try again.`, 'system');
  } else if (reason) {
    addMessage(`❌ ${reason}`, 'system');
  }
});

socket.on('new_master', ({ masterId, masterName }) => {
  isGameMaster = (socket.id === masterId);
  if (isGameMaster) {
    addMessage(`👑 You are now the Game Master! Type "Question | Answer" to start a new round.`, 'game');
  } else {
    addMessage(`👑 ${masterName} is now the Game Master.`, 'system');
  }
});

socket.on('error', (msg) => {
  addMessage(`⚠️ Error: ${msg}`, 'system');
});


// Add this variable at the top
let currentAttempts = 3;

// Add this function
function updateAttemptsDisplay(attemptsLeft) {
  currentAttempts = attemptsLeft;
  const attemptDisplay = document.getElementById('attemptsDisplay');
  if (attemptDisplay) {
    attemptDisplay.textContent = `🎯 Attempts: ${attemptsLeft}/3`;
    if (attemptsLeft === 0) {
      attemptDisplay.style.color = '#e53e3e';
    } else {
      attemptDisplay.style.color = '#48bb78';
    }
  }
}

// Add this to your HTML (in index.html, inside the chat-area div)
// Put this near the timer display:
/*
<div class="game-controls">
  <div id="gameStatus"></div>
  <div id="timerDisplay"></div>
  <div id="attemptsDisplay" style="font-weight: bold;"></div>
</div>
*/

// Update the guess_result event handler
socket.on('guess_result', ({ success, isWinner, reason, attemptsLeft }) => {
  if (success && isWinner) {
    addMessage('🎉 CORRECT! You won the round! +10 points! 🎉', 'game');
    updateAttemptsDisplay(3);
    gameActive = false;
  } else if (!success && !isWinner && reason) {
    addMessage(`❌ ${reason}`, 'system');
    if (attemptsLeft !== undefined) {
      updateAttemptsDisplay(attemptsLeft);
    }
  } else if (reason) {
    addMessage(`❌ ${reason}`, 'system');
  }
});

// Reset attempts when game starts
socket.on('game_started', ({ question, timeLeft }) => {
  gameActive = true;
  currentAttempts = 3;
  updateAttemptsDisplay(3);
  addMessage(`🎮 GAME STARTED! Question: ${question}`, 'game');
  addMessage(`⏱️ You have ${timeLeft} seconds and 3 attempts to guess!`, 'system');
  timerDisplay.innerHTML = `<span class="timer">⏰ ${timeLeft}s</span>`;
});

// Reset attempts display when game ends
socket.on('game_ended', ({ winner, answer, scores }) => {
  gameActive = false;
  timerDisplay.innerHTML = '';
  updateAttemptsDisplay(3);
  // ... rest of existing code ...
});

// Add this event listener for attempts updates
socket.on('attempts_update', ({ attemptsLeft, totalAttempts }) => {
  updateAttemptsDisplay(attemptsLeft);
});

// Add leaderboard function
function updateLeaderboard(leaderboard) {
  const leaderboardDiv = document.getElementById('leaderboardList');
  if (!leaderboardDiv) return;
  
  if (!leaderboard || leaderboard.length === 0) {
    leaderboardDiv.innerHTML = '<div style="padding: 8px; text-align: center; color: #a0aec0;">No scores yet</div>';
    return;
  }
  
  leaderboardDiv.innerHTML = '';
  leaderboard.forEach((player, index) => {
    const div = document.createElement('div');
    div.className = 'player-item';
    div.style.fontSize = '12px';
    div.style.padding = '5px';
    div.innerHTML = `
      <span>${index + 1}. ${player.playerName}</span>
      <span>🏆 ${player.highestScore || 0}</span>
    `;
    leaderboardDiv.appendChild(div);
  });
}

// Socket event for leaderboard updates
socket.on('leaderboard_update', (leaderboard) => {
  updateLeaderboard(leaderboard);
});

// Request leaderboard on connect
socket.on('session_created', (data) => {
  // ... existing code ...
  socket.emit('get_leaderboard'); // Request leaderboard
});

socket.on('joined_session', (data) => {
  // ... existing code ...
  socket.emit('get_leaderboard'); // Request leaderboard
});

// Refresh button
document.getElementById('refreshLeaderboardBtn')?.addEventListener('click', () => {
  socket.emit('get_leaderboard');
  addMessage('🔄 Refreshing leaderboard...', 'system');
});