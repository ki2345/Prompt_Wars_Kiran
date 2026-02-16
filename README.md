# Category Clash: Real-Time Multiplayer Word Game

Category Clash is a vibrant, speed-based word elimination game where players join lobbies based on shared category preferences to compete in a "Name, Place, Animal, Thing" style challenge.

## 🚀 Features

- **Real-Time Multiplayer**: Powered by Socket.io for instant synchronization.
- **Lobby System**: Host games with unique Room Codes and custom settings.
- **The "Clash" Scoring**: Get 10 points for unique answers; get 0 points if someone else writes the same thing!
- **Neon Dark Mode**: Sleek, modern aesthetic with glassmorphism and animations.
- **Mobile Friendly**: Designed for a great experience on both desktop and mobile.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide React.
- **Backend**: Node.js, Express, Socket.io.

## 🏃 How to Run Locally

### 1. Prerequisites
- Node.js (v18.x or higher)
- npm

### 2. Setup Backend
```bash
cd server
npm install
npm start
```
The server will run on `http://localhost:5000`.

### 3. Setup Frontend
```bash
cd client
npm install
npm run dev
```
The application will be accessible at `http://localhost:5173`.

## 🎮 Game Rules
1. **Alphabet Spin**: A random letter is assigned each round.
2. **Input Phase**: Type one word starting with that letter for each of the 4 chosen categories.
3. **Scoring**:
   - **Unique Answer**: 10 Points.
   - **The Clash (Duplicate)**: 0 Points.
   - **Wrong/Empty**: 0 Points.
