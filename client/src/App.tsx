import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import {
  Users,
  Settings,
  Play,
  Trophy,
  Timer,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { speak } from './utils/speech';

// Helper for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type GameState = 'LANDING' | 'LOBBY' | 'STARTING' | 'PLAYING' | 'ROUND_RESULTS' | 'GAME_OVER';

const CATEGORIES = [
  'Name', 'Place', 'Animal', 'Thing', 'Movie', 'Brand', 'Food', 'Color', 'Profession', 'Country'
];

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [gameState, setGameState] = useState<GameState>('LANDING');
  const [room, setRoom] = useState<any>(null);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [roundTimeLeft, setRoundTimeLeft] = useState(0);
  const [lastRoundSummary, setLastRoundSummary] = useState<any>(null);

  useEffect(() => {
    socket.connect();

    socket.on('room_created', (newRoom) => {
      setRoom(newRoom);
      setGameState('LOBBY');
    });

    socket.on('player_joined', (updatedRoom) => {
      setRoom(updatedRoom);
      setGameState('LOBBY');
    });

    socket.on('settings_updated', (newSettings) => {
      setRoom((prev: any) => ({ ...prev, settings: newSettings }));
    });

    socket.on('round_started', ({ round, letter, gameState }) => {
      setRoom((prev: any) => ({ ...prev, currentRound: round, currentLetter: letter }));
      setGameState('PLAYING');
      setRoundTimeLeft(room?.settings?.timer || 60);
      setAnswers({});
      speak(`The letter is ${letter}`);
    });

    socket.on('round_ended', ({ room: updatedRoom, roundSummary }) => {
      setRoom(updatedRoom);
      setLastRoundSummary(roundSummary);
      setGameState('ROUND_RESULTS');
      speak("Time is up! Ready to go to another round.");
    });

    socket.on('game_over', (finalRoom) => {
      setRoom(finalRoom);
      setGameState('GAME_OVER');
      const winner = [...finalRoom.players].sort((a, b) => b.score - a.score)[0];
      if (winner) {
        speak(`Game over! The winner is ${winner.name}`);
      }
    });

    socket.on('error', (msg) => setError(msg));

    return () => {
      socket.off('room_created');
      socket.off('player_joined');
      socket.off('settings_updated');
      socket.off('round_started');
      socket.off('round_ended');
      socket.off('game_over');
      socket.off('error');
    };
  }, [room?.settings?.timer]);

  // Timer logic
  useEffect(() => {
    if (gameState === 'PLAYING' && roundTimeLeft > 0) {
      const timer = setInterval(() => {
        setRoundTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (gameState === 'PLAYING' && roundTimeLeft === 0) {
      handleAutoSubmit();
    }
  }, [gameState, roundTimeLeft]);

  const handleCreateRoom = () => {
    const name = playerName || 'Host';
    socket.emit('create_room', { playerName: name });
  };

  const handleJoinRoom = () => {
    if (!playerName) return setError('Please enter your name');
    if (!roomCode) return setError('Please enter a room code');
    socket.emit('join_room', { roomId: roomCode.toUpperCase(), playerName });
  };

  const handleUpdateSettings = (newSettings: any) => {
    socket.emit('update_settings', { roomId: room.id, settings: newSettings });
  };

  const toggleCategory = (cat: string) => {
    const current = room.settings.categories;
    let next;
    if (current.includes(cat)) {
      next = current.filter((c: string) => c !== cat);
    } else {
      if (current.length >= 4) return;
      next = [...current, cat];
    }
    handleUpdateSettings({ categories: next });
  };

  const handleStartGame = () => {
    socket.emit('start_game', { roomId: room.id });
  };

  const handleAnswerChange = (cat: string, value: string) => {
    setAnswers(prev => ({ ...prev, [cat]: value }));
  };

  const handleManualSubmit = () => {
    socket.emit('submit_answers', { roomId: room.id, answers });
  };

  const handleAutoSubmit = () => {
    socket.emit('submit_answers', { roomId: room.id, answers });
  };

  const handleQuit = () => {
    if (window.confirm("Are you sure you want to quit the game?")) {
      socket.disconnect();
      setGameState('LANDING');
      setRoom(null);
      setAnswers({});
      setError('');
      // Reconnect for next time
      socket.connect();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 p-4 md:p-8 flex flex-col items-center">
      <header className="mb-12 text-center relative w-full max-w-4xl">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-black italic tracking-tighter neon-text-primary mb-2"
            >
              CATEGORY CLASH
            </motion.h1>
            <p className="text-primary/60 font-medium">The Ultimate Word Elimination Game</p>
          </div>
          {gameState !== 'LANDING' && (
            <button
              onClick={handleQuit}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-clash/10 hover:bg-clash/20 text-clash border border-clash/30 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
            >
              <LogOut size={16} /> QUIT
            </button>
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {gameState === 'LANDING' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-[0_0_15px_#00f6ff]"></div>

            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Users className="text-secondary" /> Get Started
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground/50 mb-1 ml-1">YOUR NAME</label>
                <input
                  type="text"
                  placeholder="Enter name..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                />
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={handleCreateRoom}
                  className="w-full bg-primary text-black font-bold p-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_#00f6ff] transition-all transform active:scale-95"
                >
                  <Play fill="black" size={20} /> CREATE ROOM
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-white/30">OR JOIN ONE</span></div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ROOM CODE"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-secondary/50 uppercase text-center font-mono font-bold tracking-widest"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                  />
                  <button
                    onClick={handleJoinRoom}
                    className="bg-secondary text-white font-bold px-6 rounded-xl hover:shadow-[0_0_20px_#ff00e5] transition-all transform active:scale-95"
                  >
                    JOIN
                  </button>
                </div>
              </div>

              {error && <p className="text-clash text-center text-sm font-bold animate-pulse">{error}</p>}
            </div>
          </motion.div>
        )}

        {gameState === 'LOBBY' && room && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6"
          >
            {/* Left: Settings & Categories */}
            <div className="md:col-span-8 space-y-6">
              <div className="glass p-6 rounded-3xl relative">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Settings className="text-primary" /> Game Settings
                  </h3>
                  <div className="flex items-center gap-2 bg-primary/10 px-4 py-1 rounded-full border border-primary/20">
                    <span className="text-xs font-bold text-primary/70">CODE:</span>
                    <span className="font-mono font-bold text-primary">{room.id}</span>
                  </div>
                </div>

                {room.hostId === socket.id ? (
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">Rounds</label>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                          <button
                            key={r}
                            onClick={() => handleUpdateSettings({ rounds: r })}
                            className={cn(
                              "p-2 rounded-lg font-bold border transition-all text-xs",
                              room.settings.rounds === r ? "bg-primary text-black border-primary" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                            )}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">Timer (Sec)</label>
                      <div className="flex gap-2">
                        {[30, 60, 90].map(t => (
                          <button
                            key={t}
                            onClick={() => handleUpdateSettings({ timer: t })}
                            className={cn(
                              "flex-1 p-2 rounded-lg font-bold border transition-all",
                              room.settings.timer === t ? "bg-primary text-black border-primary" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-8 mb-8 text-sm">
                    <div className="bg-white/5 p-3 rounded-xl flex-1 border border-white/10">
                      <span className="text-white/40 block">ROUNDS</span>
                      <span className="text-xl font-bold">{room.settings.rounds}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl flex-1 border border-white/10">
                      <span className="text-white/40 block">TIME LIMIT</span>
                      <span className="text-xl font-bold">{room.settings.timer}s</span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-xs font-bold text-white/40 uppercase">Select 4 Categories</label>
                    <span className={cn(
                      "text-sm font-bold",
                      room.settings.categories.length === 4 ? "text-primary" : "text-secondary"
                    )}>
                      {room.settings.categories.length}/4
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        disabled={room.hostId !== socket.id}
                        onClick={() => toggleCategory(cat)}
                        className={cn(
                          "p-2 rounded-xl text-xs font-bold border transition-all",
                          room.settings.categories.includes(cat)
                            ? "bg-secondary border-secondary shadow-[0_0_10px_#ff00e5]"
                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10",
                          room.hostId !== socket.id && "cursor-default opacity-80"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {room.hostId === socket.id ? (
                <button
                  onClick={handleStartGame}
                  disabled={room.settings.categories.length !== 4}
                  className="w-full bg-white text-black font-black text-xl p-6 rounded-3xl flex items-center justify-center gap-3 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all disabled:opacity-50 disabled:hover:shadow-none"
                >
                  START MATCH <ArrowRight />
                </button>
              ) : (
                <div className="w-full bg-white/5 border border-white/10 text-white/40 font-black text-xl p-6 rounded-3xl flex items-center justify-center gap-3 italic">
                  WAITING FOR HOST TO START...
                </div>
              )}
            </div>

            {/* Right: Players List */}
            <div className="md:col-span-4 flex flex-col gap-4">
              <div className="glass p-6 rounded-3xl flex-1">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Users className="text-secondary" size={18} /> Players ({room.players.length})
                </h3>
                <div className="space-y-3">
                  {room.players.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          p.id === room.hostId ? "bg-primary animate-pulse shadow-[0_0_8px_#00f6ff]" : "bg-secondary"
                        )}></div>
                        <span className="font-bold">{p.name} {p.id === socket.id && '(You)'}</span>
                      </div>
                      {p.id === room.hostId && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">HOST</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-12 flex flex-col gap-4 mt-2">
              <button
                onClick={handleCreateRoom}
                className="w-full bg-primary/10 border border-primary/20 text-primary font-bold p-3 rounded-2xl hover:bg-primary/20 transition-all text-xs"
              >
                CREATE A NEW ROOM INSTEAD
              </button>

              <div className="bg-primary/5 border border-primary/10 p-4 rounded-3xl text-xs text-primary/60 leading-relaxed italic">
                Tip: If two players write the same word, both get 0 points! Be creative!
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'PLAYING' && room && (
          <motion.div
            key="game"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl space-y-8"
          >
            {/* Game Header */}
            <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 h-1 bg-primary shadow-[0_0_15px_#00f6ff]" style={{ width: `${(roundTimeLeft / room.settings.timer) * 100}%` }}></div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_20px_#00f6ff]">
                  <span className="text-4xl font-black text-black">{room.currentLetter}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-white/40 block">ROUND {room.currentRound} OF {room.settings.rounds}</span>
                  <span className="text-xl font-bold uppercase tracking-tight">Starts with {room.currentLetter}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-2 text-primary">
                  <Timer size={24} className={cn(roundTimeLeft <= 10 && "text-clash animate-bounce")} />
                  <span className={cn("text-3xl font-mono font-black", roundTimeLeft <= 10 && "text-clash")}>{roundTimeLeft}</span>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="grid gap-4">
              {room.settings.categories.map((cat: string) => (
                <div key={cat} className="group relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3 z-10">
                    <span className="bg-white/10 text-white/60 p-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">{cat}</span>
                    <span className="text-primary/40 font-black text-xl">{room.currentLetter}</span>
                  </div>
                  <input
                    autoFocus={room.settings.categories[0] === cat}
                    type="text"
                    placeholder="Type here..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 pl-32 text-xl font-bold focus:outline-none focus:ring-4 focus:ring-primary/20 focus:bg-white/10 transition-all uppercase"
                    value={answers[cat] || ''}
                    onChange={(e) => handleAnswerChange(cat, e.target.value)}
                  />
                  {answers[cat] && answers[cat].length > 0 && answers[cat][0].toUpperCase() !== room.currentLetter && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-clash text-[10px] font-bold">MUST START WITH {room.currentLetter}</div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleManualSubmit}
              className="w-full bg-primary text-black font-black text-xl p-6 rounded-3xl hover:shadow-[0_0_30px_#00f6ff] transition-all transform active:scale-95"
            >
              SUBMIT ANSWERS
            </button>
          </motion.div>
        )}

        {gameState === 'ROUND_RESULTS' && lastRoundSummary && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl space-y-8"
          >
            <div className="text-center">
              <h2 className="text-4xl font-black neon-text-secondary mb-2">ROUND {room.currentRound} RESULTS</h2>
              <p className="text-white/40">Next round starting soon...</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {lastRoundSummary.map((summary: any) => (
                <div key={summary.category} className="glass p-6 rounded-3xl">
                  <h3 className="text-lg font-black text-primary mb-4 uppercase tracking-widest underline decoration-2 underline-offset-4">{summary.category}</h3>
                  <div className="space-y-4">
                    {summary.results.map((res: any, idx: number) => (
                      <div key={idx} className={cn(
                        "flex items-center justify-between p-3 rounded-xl border border-white/5",
                        res.status === 'clash' ? "bg-clash/10 border-clash/20" :
                          res.status === 'unique' ? "bg-primary/10 border-primary/20" : "bg-white/5"
                      )}>
                        <div>
                          <span className="text-[10px] font-bold text-white/40 block leading-tight">{res.playerName}</span>
                          <span className={cn(
                            "text-lg font-bold uppercase",
                            res.status === 'clash' ? "text-clash line-through" : res.status === 'unique' ? "text-primary" : "text-white/40"
                          )}>
                            {res.answer}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className={cn(
                            "text-xl font-black",
                            res.points > 0 ? "text-primary" : "text-white/20"
                          )}>
                            +{res.points}
                          </span>
                          {res.status === 'clash' && (
                            <div className="text-[8px] text-clash font-black uppercase mt-1">
                              Clashed with: {res.clashedWith.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="glass p-8 rounded-3xl border-t-4 border-primary shadow-[0_0_40px_rgba(0,246,255,0.1)]">
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <Trophy className="text-primary" /> LEADERBOARD
              </h3>
              <div className="space-y-3">
                {room.players.sort((a: any, b: any) => b.score - a.score).map((p: any, idx: number) => (
                  <div key={p.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-black text-white/10">#{idx + 1}</span>
                      <div>
                        <span className="font-bold text-lg">{p.name} {p.id === socket.id && '(You)'}</span>
                        {idx === 0 && <span className="ml-2 py-0.5 px-2 bg-yellow-400 text-black text-[10px] font-black rounded-full uppercase">CHAMP</span>}
                      </div>
                    </div>
                    <span className="text-2xl font-black text-primary">{p.score} <span className="text-xs font-bold text-primary/40 uppercase ml-1">PTS</span></span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'GAME_OVER' && room && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl text-center flex flex-col items-center"
          >
            <div className="relative mb-12">
              <Trophy size={120} className="text-yellow-400 animate-bounce" />
              <div className="absolute inset-0 bg-yellow-400/20 blur-3xl rounded-full -z-10"></div>
            </div>

            <h2 className="text-6xl font-black italic tracking-widest neon-text-primary mb-4 italic">GAME OVER</h2>
            <p className="text-2xl font-bold text-white/60 mb-12">Who dominated the clash?</p>

            <div className="w-full space-y-4 mb-20">
              {room.players.sort((a: any, b: any) => b.score - a.score).map((p: any, idx: number) => (
                <div key={idx} className={cn(
                  "flex items-center justify-between p-6 rounded-3xl border-2 transition-all",
                  idx === 0 ? "bg-primary text-black border-primary shadow-[0_0_30px_#00f6ff]" : "glass border-white/10"
                )}>
                  <div className="flex items-center gap-6">
                    <span className="text-4xl font-black opacity-30">{idx + 1}</span>
                    <span className="text-2xl font-bold">{p.name}</span>
                  </div>
                  <span className="text-4xl font-black">{p.score}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleCreateRoom}
                className="flex-1 bg-primary text-black font-black p-4 rounded-2xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_#00f6ff] transition-all active:scale-95"
              >
                <Play fill="black" size={20} /> START NEW ROOM
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 glass border-white/10 text-white font-bold p-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/5 transition-all active:scale-95"
              >
                <LogOut size={20} /> EXIT TO MENU
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
}
