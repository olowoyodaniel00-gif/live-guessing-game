# Live Guessing Game - Real-Time Multiplayer Game

## 🎮 Overview
A real-time multiplayer guessing game where players compete to answer questions correctly. The game master creates questions, and players have 3 attempts to guess the right answer within 60 seconds.

## ✨ Features Implemented

### Core Requirements
- ✅ Chat-like game interface
- ✅ Game master can create game sessions
- ✅ Players can join sessions using Session ID
- ✅ Live player count display
- ✅ Game master creates questions and answers
- ✅ Game starts only with ≥2 players
- ✅ 3 attempts per player per round
- ✅ 60-second time limit
- ✅ Winner receives 10 points
- ✅ Timeout displays answer, no points
- ✅ Automatic next game master
- ✅ Session auto-deletes when empty

### Bonus Features
- ✅ Score persistence with MongoDB
- ✅ All-time leaderboard
- ✅ Attempt tracking display
- ✅ Winner celebration animations
- ✅ Real-time player updates

## 🛠️ Technologies Used

| Technology | Purpose |
|------------|---------|
| Node.js | Backend server |
| Express.js | Web framework |
| Socket.IO | Real-time communication |
| MongoDB | Database for scores |
| HTML5/CSS3 | Frontend interface |
| JavaScript | Client-side logic |

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account (free) OR local MongoDB

### Step 1: Clone/Download Project
```bash
unzip YourName_LiveGuessingGame.zip
cd YourName_LiveGuessingGame