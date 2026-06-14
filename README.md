# live-guessing-game
Real-time multiplayer guessing game with Socket.IO
# 🎮 Live Guessing Game - Real-Time Multiplayer

A real-time multiplayer guessing game where players compete to answer questions correctly. The game master creates questions, and players have 3 attempts to guess the right answer within 60 seconds.

## ✨ Features

### Core Game Features
- 💬 **Chat-like Interface** - Familiar chat-style gameplay
- 👑 **Game Master System** - Creator controls the game session
- 🔗 **Session IDs** - Easy sharing with friends
- 👥 **Live Player Count** - See who's connected
- ⏱️ **60-Second Timer** - Race against the clock
- 🎯 **3 Attempts Per Player** - Limited guesses per round
- 🏆 **10 Points Per Win** - Competitive scoring system
- 🔄 **Automatic Next Master** - Rotates after each round

### Advanced Features
- 💾 **MongoDB Integration** - Persistent score storage
- 📊 **All-Time Leaderboard** - Track top players
- 🎨 **Winner Animations** - Celebration effects
- 🚪 **Session Auto-Delete** - Cleanup when empty

## 🛠️ Technologies Used

| Technology | Purpose |
|------------|---------|
| **Node.js** | Backend runtime |
| **Express.js** | Web server framework |
| **Socket.IO** | Real-time bidirectional communication |
| **MongoDB** | Score persistence & leaderboard |
| **HTML5/CSS3** | Frontend interface |
| **JavaScript** | Client-side game logic |

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (free) or local MongoDB
- Modern web browser (Chrome, Firefox, Edge)

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/olowoyodaniel00-gif/live-guessing-game.git
cd live-guessing-game