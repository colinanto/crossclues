/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GRID_ROWS, GRID_COLS, INITIAL_GAME_METADATA } from './constants';
import { PlayerClue, LobbyPlayer, LobbySettings } from './types';
import { cn } from './lib/utils';
import { MapPin, Send, HelpCircle, User, Info, LogIn, ChevronRight, Share2, Plus, Users, Clock, Play, ArrowLeft, Gamepad2, Sparkles, Trophy } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

const MOCK_NAMES = ["Alice", "Luca", "Sofia", "Marco", "Giulia", "Matteo", "Elena", "Davide"];

type AppView = 'home' | 'lobby' | 'game' | 'multi-setup';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [view, setView] = useState<AppView>('home');
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  
  // Lobby State
  const [settings, setSettings] = useState<LobbySettings>({ maxPlayers: 5, timeLimit: 10 });
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [roomCode, setRoomCode] = useState('');
  const [roomInput, setRoomInput] = useState('');

  // Game State
  const [clue, setClue] = useState('');
  const [assignedCoordinate, setAssignedCoordinate] = useState('');
  const [clues, setClues] = useState<PlayerClue[]>([]);
  const [mobileTab, setMobileTab] = useState<'grid' | 'action'>('action');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currUser) => {
      setUser(currUser);
    });
    return () => unsubscribe();
  }, []);

  // Handle URL params for joining
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode && view === 'home') {
      const code = joinCode.toUpperCase();
      setRoomInput(code);
      if (user) {
         // Auto join if logged in
         setRoomCode(code);
         setMode('multi');
         const players: LobbyPlayer[] = [
           { id: 'host-id', name: MOCK_NAMES[0] + ' (Host)', isHost: true, isReady: true },
           { id: user.uid, name: user.displayName || 'Tu', isHost: false, isReady: true }
         ];
         setLobbyPlayers(players);
         setView('lobby');
         // Clean URL
         window.history.replaceState({}, document.title, window.location.pathname);
      } else {
         setView('multi-setup');
      }
    }
  }, [user, view]);

  const getRandomCoordinate = () => {
    const r = GRID_ROWS[Math.floor(Math.random() * GRID_ROWS.length)];
    const c = GRID_COLS[Math.floor(Math.random() * GRID_COLS.length)];
    return `${r}${c}`;
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleMultiplayerClick = () => {
    if (!user) {
      handleLogin();
      return;
    }
    setView('multi-setup');
  };

  const getInviteLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('join', roomCode);
    return url.toString();
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(getInviteLink());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleCreateRoom = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setMode('multi');
    
    // Mock players entering
    const players: LobbyPlayer[] = [
      { id: user?.uid || 'host', name: user?.displayName || 'Tu (Host)', isHost: true, isReady: true }
    ];
    setLobbyPlayers(players);
    setView('lobby');
  };

  const handleJoinRoom = (e: FormEvent) => {
    e.preventDefault();
    if (roomInput.length < 4) return;
    
    setRoomCode(roomInput.toUpperCase());
    setMode('multi');
    
    // Mock players entering
    const players: LobbyPlayer[] = [
      { id: 'host-id', name: MOCK_NAMES[0] + ' (Host)', isHost: true, isReady: true },
      { id: user?.uid || 'me', name: user?.displayName || 'Tu', isHost: false, isReady: true }
    ];
    setLobbyPlayers(players);
    setView('lobby');
  };

  const startLobby = (isMulti: boolean) => {
    if (isMulti) {
      handleMultiplayerClick();
    } else {
      setMode('single');
      startGame('single');
    }
  };

  const startGame = (gameMode: 'single' | 'multi') => {
    setMode(gameMode);
    setAssignedCoordinate(getRandomCoordinate());
    setClues([]);
    setClue('');
    setView('game');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!clue.trim()) return;

    const newClue: PlayerClue = {
      coordinate: assignedCoordinate,
      clue: clue.trim(),
      authorId: user?.uid || 'anonymous'
    };

    setClues([newClue, ...clues]);
    setClue('');
    setAssignedCoordinate(getRandomCoordinate());
  };

  const assignedRow = assignedCoordinate[0];
  const assignedCol = assignedCoordinate[1];
  const rowWord = INITIAL_GAME_METADATA.rows[assignedRow];
  const colWord = INITIAL_GAME_METADATA.cols[assignedCol];

  // --- RENDERING ---

  if (view === 'home') {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col p-6 items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-4xl w-full space-y-12 text-center"
        >
          <div className="space-y-4">
            <div className="w-20 h-20 bg-orange-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl rotate-6 mb-6">
              <Sparkles size={40} className="fill-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-orange-600 tracking-tighter uppercase leading-none">
              Cross Clues<br/><span className="text-indigo-600 font-serif italic lowercase tracking-tight">Digital</span>
            </h1>
            <p className="text-sm md:text-lg font-bold text-slate-400 uppercase tracking-[0.3em]">Connetti le parole • Sincronizza la mente</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
            {/* Single Player Card */}
            <motion.button
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startLobby(false)}
              className="bg-white p-8 rounded-[40px] shadow-xl border-4 border-white hover:border-orange-200 transition-all text-left flex flex-col group h-full"
            >
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <User size={28} />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tight">Allenamento</h2>
              <p className="text-sm font-bold text-slate-400 leading-relaxed uppercase tracking-wide">Modalità singola per fare pratica con le associazioni.</p>
              <div className="mt-auto pt-8 flex items-center gap-2 text-orange-600 font-black text-sm uppercase tracking-widest">
                Gioca ora <ChevronRight size={16} />
              </div>
            </motion.button>

            {/* Multiplayer Card */}
            <motion.button
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startLobby(true)}
              className="bg-white p-8 rounded-[40px] shadow-xl border-4 border-white hover:border-indigo-200 transition-all text-left flex flex-col group h-full overflow-hidden relative"
            >
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <Users size={28} />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tight">Multiplayer</h2>
              <p className="text-sm font-bold text-slate-400 leading-relaxed uppercase tracking-wide">Crea una lobby e divertiti con gli amici (fino a 8).</p>
              <div className="mt-auto pt-8 flex items-center gap-2 text-indigo-600 font-black text-sm uppercase tracking-widest">
                Crea Stanza <ChevronRight size={16} />
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50" />
            </motion.button>
          </div>

          {user ? (
            <div className="flex items-center justify-center gap-3 pt-6">
              <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border-2 border-white shadow-md" alt="" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Bentornato, {user.displayName}</p>
            </div>
          ) : (
             <button onClick={handleLogin} className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-orange-500 transition-colors">
                Hai già un account? Accedi
             </button>
          )}
        </motion.div>
      </div>
    );
  }

  if (view === 'multi-setup') {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col p-6 items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full space-y-8"
        >
          <div className="text-center space-y-4">
             <button onClick={() => setView('home')} className="mx-auto w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 mb-4">
                <ArrowLeft size={20} />
             </button>
             <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Multiplayer</h1>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Scegli come vuoi iniziare la tua sfida di gruppo.</p>
          </div>

          <div className="space-y-4">
            {/* Create Room */}
            <button
              onClick={handleCreateRoom}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white p-8 rounded-[32px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 flex flex-col items-center gap-2 group transition-all"
            >
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-2">
                <Plus size={28} />
              </div>
              <span>Crea Nuova Stanza</span>
              <span className="text-[10px] opacity-70 font-bold lowercase tracking-normal">Diventa il capostanza (Host)</span>
            </button>

            <div className="relative py-4">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
               <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300 tracking-widest"><span className="bg-amber-50 px-4">Oppure</span></div>
            </div>

            {/* Join Room */}
            <form onSubmit={handleJoinRoom} className="bg-white p-8 rounded-[32px] shadow-xl border-4 border-white space-y-4">
               <div className="flex items-center gap-3 text-emerald-600 mb-2">
                 <Users size={20} />
                 <h2 className="text-sm font-black uppercase tracking-widest">Partecipa a stanza</h2>
               </div>
               <input
                 type="text"
                 value={roomInput}
                 onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                 placeholder="CODICE (ES. XJ42)"
                 maxLength={4}
                 className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-400 text-center text-xl font-black text-slate-700 outline-none transition-all placeholder:text-slate-200"
               />
               <button
                 type="submit"
                 disabled={roomInput.length < 4}
                 className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all"
               >
                 Entra
               </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'lobby') {
    return (
      <div className="min-h-screen bg-amber-50 p-6 flex flex-col gap-6">
        <header className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border-2 border-orange-200 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('multi-setup')} className="bg-slate-100 p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black text-orange-600 uppercase tracking-tight">Sala d'Attesa</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In attesa dei partecipanti</p>
            </div>
          </div>
          <div className="bg-slate-100 px-4 py-2 rounded-full font-mono font-bold text-slate-600 text-xs flex items-center gap-2">
            ROOM: <span className="text-indigo-600">{roomCode}</span>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
          {/* Settings Section */}
          <div className="space-y-8">
            <section className="bg-white p-8 rounded-[40px] shadow-xl border-4 border-white space-y-8">
              <div className="flex items-center gap-4 text-indigo-600">
                <Gamepad2 size={24} />
                <h2 className="text-2xl font-black uppercase tracking-tight">Impostazioni Gara</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                    <Users size={14} /> Numero Giocatori
                  </label>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5, 8].map(count => (
                      <button
                        key={count}
                        onClick={() => setSettings({ ...settings, maxPlayers: count })}
                        className={cn(
                          "flex-1 py-3 rounded-2xl font-black transition-all border-2",
                          settings.maxPlayers === count 
                            ? "bg-indigo-500 border-indigo-600 text-white shadow-lg" 
                            : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-white"
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                    <Clock size={14} /> Tempo Limite (min)
                  </label>
                  <div className="flex gap-2">
                    {[5, 10, 15, 20].map(time => (
                      <button
                        key={time}
                        onClick={() => setSettings({ ...settings, timeLimit: time })}
                        className={cn(
                          "flex-1 py-3 rounded-2xl font-black transition-all border-2",
                          settings.timeLimit === time 
                            ? "bg-orange-500 border-orange-600 text-white shadow-lg" 
                            : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-white"
                        )}
                      >
                        {time}'
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50">
                <button
                  onClick={() => startGame('multi')}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 flex items-center justify-center gap-4 group"
                >
                  <Play size={24} className="fill-white" />
                  Inizia Partita
                  <ChevronRight className="group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </section>

            <div className="bg-orange-500 text-white p-8 rounded-[40px] flex flex-col sm:flex-row items-center gap-6 shadow-xl border-4 border-orange-400 relative overflow-hidden">
               <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center shrink-0 shadow-inner">
                  <Share2 size={32} />
               </div>
               <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-black uppercase text-lg mb-1 tracking-tight">Invita Amici</h3>
                  <p className="text-xs font-bold opacity-80 uppercase tracking-widest leading-none">Invia questo link per farli entrare nella lobby</p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 bg-white/10 p-3 rounded-xl border border-white/20 font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                      {getInviteLink()}
                    </div>
                    <button 
                      onClick={copyInviteLink}
                      className={cn(
                        "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2",
                        copySuccess ? "bg-emerald-500 text-white" : "bg-white text-orange-600 hover:bg-orange-50"
                      )}
                    >
                      {copySuccess ? <><Trophy size={14} /> Copiato!</> : 'Copia Link'}
                    </button>
                  </div>
               </div>
               <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            </div>
          </div>

          {/* Players List */}
          <div className="bg-white rounded-[40px] shadow-xl p-8 border-4 border-white flex flex-col h-full min-h-[400px]">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Lobby ({lobbyPlayers.length}/{settings.maxPlayers})</h3>
             </div>

             <div className="space-y-4 flex-1">
               {lobbyPlayers.map((p, idx) => (
                 <motion.div
                   key={p.id}
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: idx * 0.1 }}
                   className={cn(
                     "p-4 rounded-2xl border-2 flex items-center gap-4",
                     p.isHost ? "bg-indigo-50 border-indigo-100" : "bg-slate-50 border-slate-100"
                   )}
                 >
                   <div className={cn(
                     "w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-sm",
                     idx % 3 === 0 ? "bg-orange-400" : idx % 3 === 1 ? "bg-rose-400" : "bg-emerald-400"
                   )}>
                     {p.name.charAt(0)}
                   </div>
                   <div className="flex-1">
                     <p className={cn("text-sm font-black uppercase tracking-tight", p.isHost ? "text-indigo-600" : "text-slate-700")}>
                        {p.name} {p.isHost && "👑"}
                     </p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.isReady ? 'Pronto' : 'In attesa...'}</p>
                   </div>
                   {p.isReady && <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
                 </motion.div>
               ))}
               {Array.from({ length: Math.max(0, settings.maxPlayers - lobbyPlayers.length) }).map((_, i) => (
                 <div key={i} className="p-4 rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center opacity-30">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Settore Libero</span>
                 </div>
               ))}
             </div>
          </div>
        </main>
      </div>
    );
  }

  // --- GAME VIEW ---
  return (
    <div className="min-h-screen bg-amber-50 text-slate-700 font-sans selection:bg-indigo-500 selection:text-white p-4 md:p-6 flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <header className="flex justify-between items-center bg-white p-3 md:p-4 rounded-2xl shadow-sm border-2 border-orange-200">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setView('home')} 
            className="bg-orange-500 text-white p-2 md:p-3 rounded-xl shadow-lg hover:rotate-6 transition-transform"
          >
            <div className="w-5 h-5 md:w-8 md:h-8 flex items-center justify-center font-black text-sm md:text-xl">CC</div>
          </button>
          <div>
            <h1 className="text-lg md:text-2xl font-black text-orange-600 tracking-tight uppercase leading-none">Cross Clues</h1>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {mode === 'single' ? 'Solo' : 'Multiplayer • 08:42'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-6">
          <div className="hidden sm:flex -space-x-3">
             {lobbyPlayers.length > 0 ? (
                lobbyPlayers.slice(0, 4).map((p, i) => (
                  <div key={p.id} className={cn(
                    "w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-xs shadow-sm",
                    i === 0 ? "bg-blue-400" : i === 1 ? "bg-rose-400" : i === 2 ? "bg-green-400" : "bg-purple-400"
                  )}>
                    {p.name.charAt(0)}
                  </div>
                ))
             ) : (
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-400 border-2 border-white flex items-center justify-center text-white font-bold text-xs">U</div>
             )}
          </div>
          <button onClick={() => setView('home')} className="bg-slate-100 p-2 md:p-3 rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={16} />
          </button>
        </div>
      </header>

      {/* Mobile Tab Toggle */}
      <div className="lg:hidden flex bg-white p-1 rounded-2xl border-2 border-slate-100 shadow-sm">
        <button 
          onClick={() => setMobileTab('action')}
          className={cn(
            "flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all",
            mobileTab === 'action' ? "bg-indigo-500 text-white shadow-md" : "text-slate-400"
          )}
        >
          Azione
        </button>
        <button 
          onClick={() => setMobileTab('grid')}
          className={cn(
            "flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all",
            mobileTab === 'grid' ? "bg-indigo-500 text-white shadow-md" : "text-slate-400"
          )}
        >
          Tabellone
        </button>
      </div>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden lg:overflow-visible">
        {/* Left Side: The Grid */}
        <div className={cn(
          "flex-1 bg-white rounded-3xl p-4 md:p-8 shadow-xl border-4 border-white flex flex-col overflow-x-auto custom-scrollbar",
          mobileTab !== 'grid' && "hidden lg:flex"
        )}>
          <div className="min-w-[700px] flex-1 flex flex-col">
            {/* Column Headers */}
            <div className="grid grid-cols-[120px_repeat(5,1fr)] gap-2 md:gap-3 mb-3">
              <div className="bg-slate-50 rounded-lg border-2 border-dashed border-slate-200" />
              {GRID_COLS.map((col) => (
                <div key={col} className="flex flex-col items-center justify-center bg-cyan-100 rounded-xl border-2 border-cyan-200 p-3 md:p-4">
                  <span className="text-[10px] md:text-xs font-black text-cyan-600">{col}</span>
                  <span className="text-xs md:text-sm font-black text-slate-700 uppercase">{INITIAL_GAME_METADATA.cols[col]}</span>
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="flex-1 grid grid-rows-5 gap-2 md:gap-3">
              {GRID_ROWS.map((row) => (
                <div key={row} className="grid grid-cols-[120px_repeat(5,1fr)] gap-2 md:gap-3">
                  <div className="flex items-center justify-center bg-indigo-100 rounded-xl border-2 border-indigo-200 p-3 md:p-4 text-center">
                    <div className="w-full">
                      <span className="block text-[10px] md:text-xs font-black text-indigo-600 leading-none">{row}</span>
                      <span className="block text-xs md:text-sm font-black text-slate-700 uppercase break-words leading-tight mt-1">{INITIAL_GAME_METADATA.rows[row]}</span>
                    </div>
                  </div>

                  {GRID_COLS.map((col) => {
                    const id = `${row}${col}`;
                    const isAssigned = id === assignedCoordinate;
                    const isFilled = clues.some(c => c.coordinate === id);
                    return (
                      <div key={id} className="relative group">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className={cn(
                            "w-full h-full rounded-xl flex flex-col items-center justify-center transition-all relative shadow-sm border-2",
                            isAssigned 
                              ? "bg-indigo-500 border-white shadow-lg ring-4 ring-indigo-100 text-white z-10" 
                              : isFilled 
                                ? "bg-emerald-100 border-emerald-200 text-emerald-600"
                                : "bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/10"
                          )}
                        >
                           <AnimatePresence mode="wait">
                             {isAssigned ? (
                               <motion.div 
                                 key="assigned"
                                 initial={{ scale: 0 }}
                                 animate={{ scale: 1 }}
                                 className="flex flex-col items-center gap-1"
                               >
                                 <span className="text-xl md:text-3xl font-black uppercase tracking-widest">{id}</span>
                                 <div className="bg-white/20 px-2 py-0.5 rounded-full text-[7px] md:text-[8px] font-bold uppercase tracking-widest">In Corso</div>
                               </motion.div>
                             ) : isFilled ? (
                               <motion.div key="filled" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                 <Trophy size={20} className="md:size-24 fill-emerald-500/20" />
                               </motion.div>
                             ) : (
                               <span className="font-black text-slate-200 text-lg md:text-xl uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                 {id}
                               </span>
                             )}
                           </AnimatePresence>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Sidebar Area */}
        <div className={cn(
          "w-full lg:w-96 flex flex-col gap-6 overflow-y-auto lg:overflow-visible pb-10 lg:pb-0",
          mobileTab !== 'action' && "hidden lg:flex"
        )}>
          {/* Mission Card */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border-2 border-indigo-500 relative overflow-hidden flex flex-col">
            <h3 className="text-xs font-black text-indigo-600 uppercase mb-4 md:6 tracking-tighter">La tua carta</h3>
            
            <div className="aspect-square bg-indigo-500 rounded-2xl flex flex-col items-center justify-center shadow-inner mb-6 md:mb-8 text-white relative">
              <span className="text-5xl md:text-7xl font-black tracking-tighter">{assignedCoordinate}</span>
              <div className="mt-3 md:mt-4 bg-white/20 px-4 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest">
                {rowWord} + {colWord}
              </div>
              <div className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="absolute bottom-4 left-4 w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="absolute bottom-4 right-4 w-1.5 h-1.5 rounded-full bg-white/20" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Suggerisci un termine:</label>
                <input
                  type="text"
                  value={clue}
                  onChange={(e) => setClue(e.target.value)}
                  placeholder="Scrivi qui..."
                  className="w-full p-4 md:p-5 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none font-bold text-lg md:text-xl text-slate-700 placeholder:text-slate-300 transition-colors shadow-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 md:py-5 rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-3"
              >
                Invia <Send size={20} />
              </button>
            </form>
          </div>

          {/* Game Log */}
          <div className="flex-1 bg-white p-5 md:p-6 rounded-3xl shadow-lg border-2 border-slate-100 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-tighter">Cronologia</h3>
              <span className="text-[10px] font-black text-slate-300 uppercase">{clues.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {clues.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4 group transition-all"
                  >
                     <div className="w-10 h-10 shrink-0 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        {item.coordinate}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-black text-slate-700 leading-tight">"{item.clue}"</p>
                        <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mt-1">Tu</p>
                      </div>
                  </motion.div>
                ))}
                {clues.length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center text-center opacity-30">
                    <HelpCircle size={32} className="mb-2 text-slate-300" />
                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Pronto per il primo indizio?</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="mt-auto hidden sm:flex justify-between items-center px-4 md:px-0">
        <div className="flex gap-4">
          <button className="px-6 py-2 bg-white rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest">Regole</button>
          <button className="px-6 py-2 bg-white rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest">Audio</button>
        </div>
        <div className="text-[10px] font-black text-slate-400 flex items-center gap-3 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            SERVER: EU-WEST (24ms)
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}

