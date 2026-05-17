import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square, type Move } from "chess.js";
import { z } from "zod";
import { io, type Socket } from "socket.io-client";
import { ChessBoard } from "@/components/ChessBoard";
import { CapturedPanel } from "@/components/CapturedPanel";
import { sfx } from "@/lib/sounds";

const search = z.object({
  room: z.string().optional(),
});

export const Route = createFileRoute("/multiplayer")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Multiplayer — Super Mario Chess" },
      { name: "description", content: "Play Mario Chess online with friends. Invite them using a custom game room." },
    ],
  }),
  component: MultiplayerPage,
});

function MultiplayerPage() {
  const { room: roomId } = Route.useSearch();
  const navigate = useNavigate();

  const [username, setUsername] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("mc_username") || "";
    }
    return "";
  });
  
  const [nameEntered, setNameEntered] = useState(false);
  const [inputName, setInputName] = useState(username);
  const [inputRoomId, setInputRoomId] = useState("");

  const [socket, setSocket] = useState<Socket | null>(null);
  const [role, setRole] = useState<"w" | "b" | "spectator" | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [spectators, setSpectators] = useState<any[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Waiting for players to connect...");

  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [captured, setCaptured] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  
  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ username: string; message: string; isSystem?: boolean }[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Copy indicator
  const [copied, setCopied] = useState(false);

  const playerColor = role;
  const isMyTurn = game.turn() === playerColor && gameStarted && !game.isGameOver();

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Connect to socket when username & roomId are present
  useEffect(() => {
    if (!roomId || !username || !nameEntered) return;

    // Connect to port 3001 (force http for local network hostnames)
    const isLocal = typeof window !== "undefined" && (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168.") ||
      window.location.hostname.startsWith("10.")
    );
    const socketUrl = typeof window !== "undefined"
      ? `${isLocal ? "http" : window.location.protocol.slice(0, -1)}://${window.location.hostname}:${isLocal ? "3001" : window.location.port || "3001"}`
      : "http://localhost:3001";
      
    console.log("Connecting to WebSocket server:", socketUrl);
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    // Join room
    newSocket.emit("join-room", { roomId, username });

    newSocket.on("room-joined", ({ role, players, spectators, gameStarted, fen }) => {
      setRole(role);
      setPlayers(players);
      setSpectators(spectators);
      setGameStarted(gameStarted);
      sfx.coin();

      if (fen) {
        const loadedGame = new Chess(fen);
        setGame(loadedGame);
      }

      setChatMessages((prev) => [
        ...prev,
        { username: "System", message: `You joined as ${role === "w" ? "Mario (White)" : role === "b" ? "Bowser (Black)" : "Spectator"}!`, isSystem: true }
      ]);
    });

    newSocket.on("user-joined", ({ username, role, players, spectators }) => {
      setPlayers(players);
      setSpectators(spectators);
      
      const roleText = role === "w" ? "Mario" : role === "b" ? "Bowser" : "Spectator";
      setChatMessages((prev) => [
        ...prev,
        { username: "System", message: `${username} joined as ${roleText}!`, isSystem: true }
      ]);

      if (players.length === 2) {
        setGameStarted(true);
        sfx.victory();
      }
    });

    newSocket.on("move-made", ({ move, fen }) => {
      const cloned = new Chess(fen);
      
      // Determine capture/sound
      if (move.captured) {
        const capturedKey = (move.color === "w" ? "b" : "w") + move.captured;
        setCaptured((c) => [...c, capturedKey]);
        sfx.capture();
      } else {
        sfx.move();
      }

      setGame(cloned);
      setLastMove({ from: move.from as Square, to: move.to as Square });
      setHistory((h) => [...h, move.san]);

      if (cloned.inCheck() && !cloned.isCheckmate()) {
        setTimeout(() => sfx.check(), 200);
      }
      if (cloned.isCheckmate()) {
        setTimeout(() => (cloned.turn() === role ? sfx.defeat() : sfx.victory()), 300);
      }
    });

    newSocket.on("game-reset", () => {
      const newGame = new Chess();
      setGame(newGame);
      setSelected(null);
      setLastMove(null);
      setCaptured([]);
      setHistory([]);
      setChatMessages((prev) => [
        ...prev,
        { username: "System", message: `The game was reset.`, isSystem: true }
      ]);
    });

    newSocket.on("chat-msg-received", ({ message, username }) => {
      setChatMessages((prev) => [...prev, { username, message }]);
      sfx.select();
    });

    newSocket.on("player-left", ({ username, players }) => {
      setPlayers(players);
      setGameStarted(false);
      setChatMessages((prev) => [
        ...prev,
        { username: "System", message: `${username} (player) disconnected. Match paused.`, isSystem: true }
      ]);
    });

    newSocket.on("spectator-left", ({ id, spectators }) => {
      setSpectators(spectators);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, username, nameEntered]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;
    localStorage.setItem("mc_username", inputName);
    setUsername(inputName);
    setNameEntered(true);
  };

  const handleCreateRoom = () => {
    const randomRoomId = Math.random().toString(36).substring(2, 9).toUpperCase();
    navigate({ to: "/multiplayer", search: { room: randomRoomId } });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRoomId.trim()) return;
    navigate({ to: "/multiplayer", search: { room: inputRoomId.trim().toUpperCase() } });
  };

  const legalTargets = useMemo<Square[]>(() => {
    if (!selected) return [];
    return game.moves({ square: selected, verbose: true }).map((m) => m.to as Square);
  }, [selected, game]);

  const applyMove = useCallback(
    (move: Move) => {
      const cloned = new Chess(game.fen());
      const result = cloned.move({ from: move.from, to: move.to, promotion: "q" });
      if (!result) return;
      
      if (result.captured) {
        const capturedKey = (result.color === "w" ? "b" : "w") + result.captured;
        setCaptured((c) => [...c, capturedKey]);
        sfx.capture();
      } else {
        sfx.move();
      }

      setGame(cloned);
      setLastMove({ from: result.from as Square, to: result.to as Square });
      setHistory((h) => [...h, result.san]);
      setSelected(null);

      // Emit to server
      if (socket && roomId) {
        socket.emit("make-move", { roomId, move: result, fen: cloned.fen() });
      }

      if (cloned.inCheck() && !cloned.isCheckmate()) {
        setTimeout(() => sfx.check(), 200);
      }
      if (cloned.isCheckmate()) {
        setTimeout(() => (cloned.turn() === role ? sfx.defeat() : sfx.victory()), 300);
      }
    },
    [game, socket, roomId, role],
  );

  const onSquareClick = useCallback(
    (sq: Square) => {
      if (!isMyTurn) return;
      const piece = game.get(sq);
      if (selected) {
        const moves = game.moves({ square: selected, verbose: true });
        const target = moves.find((m) => m.to === sq);
        if (target) {
          applyMove(target);
          return;
        }
        if (piece && piece.color === playerColor) {
          setSelected(sq);
          sfx.select();
          return;
        }
        setSelected(null);
        return;
      }
      if (piece && piece.color === playerColor) {
        setSelected(sq);
        sfx.select();
      }
    },
    [game, selected, isMyTurn, playerColor, applyMove],
  );

  const reset = () => {
    if (socket && roomId) {
      socket.emit("reset-game", { roomId });
      const newGame = new Chess();
      setGame(newGame);
      setSelected(null);
      setLastMove(null);
      setCaptured([]);
      setHistory([]);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket || !roomId) return;
    
    socket.emit("chat-message", { roomId, message: chatInput.trim(), username });
    setChatMessages((prev) => [...prev, { username, message: chatInput.trim() }]);
    setChatInput("");
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/multiplayer?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const status = game.isCheckmate()
    ? game.turn() === "w"
      ? "💀 Checkmate — Bowser wins!"
      : "🏆 Checkmate — Mario wins!"
    : game.isDraw()
      ? "🤝 Draw"
      : game.inCheck()
        ? "⚠️ Check!"
        : !gameStarted
          ? "Waiting for opponent..."
          : game.turn() === role
            ? "Your turn!"
            : "Opponent's turn...";

  // 1. Enter username first if not captured
  if (!username || !nameEntered) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-[oklch(0.18_0.06_270)] to-background py-6 px-4">
        <div className="fixed top-20 left-10 w-72 h-72 bg-mario-red/20 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-20 right-10 w-72 h-72 bg-nintendo-blue/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="mario-card p-8 max-w-md w-full text-center relative z-10">
          <Link to="/" className="absolute top-4 left-4 text-xs font-display text-muted-foreground hover:text-coin-gold uppercase">
            ← Home
          </Link>
          
          <h2 className="font-display text-3xl text-coin-gold mb-6 mt-4">Who are you?</h2>
          <p className="text-sm text-foreground/80 mb-6">Choose your gamer tag to enter the Mushroom Kingdom Arena.</p>
          
          <form onSubmit={handleSaveName} className="flex flex-col gap-4">
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="e.g. LuigiPlayer"
              className="px-4 py-3 rounded-xl bg-card border-2 border-muted font-display uppercase tracking-wider text-center text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-coin-gold"
              maxLength={15}
              required
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-mario-red border-2 border-coin-gold font-display text-sm tracking-wider uppercase text-primary-foreground hover:scale-105 active:scale-95 transition-all"
            >
              Let's Play!
            </button>
          </form>
        </div>
      </main>
    );
  }

  // 2. Room lobby - if no room ID is active
  if (!roomId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-[oklch(0.18_0.06_270)] to-background py-6 px-4">
        <div className="fixed top-20 left-10 w-72 h-72 bg-mario-red/20 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-20 right-10 w-72 h-72 bg-nintendo-blue/20 rounded-full blur-3xl pointer-events-none" />

        <div className="mario-card p-8 max-w-lg w-full text-center relative z-10 flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xs font-display text-muted-foreground hover:text-coin-gold uppercase">
              ← Home
            </Link>
            <span className="text-xs font-display text-coin-gold uppercase">Player: {username}</span>
          </div>

          <div>
            <h1 className="font-display text-4xl md:text-5xl text-coin-gold mb-2">Online Arena</h1>
            <p className="text-sm text-foreground/75">Play with your friends anywhere across the globe!</p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={handleCreateRoom}
              className="px-6 py-4 rounded-xl bg-mario-red border-2 border-coin-gold font-display text-lg tracking-wider uppercase text-primary-foreground hover:scale-105 active:scale-95 transition-all shadow-glow-red"
            >
              🎮 Create New Arena
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-muted"></div>
            <span className="flex-shrink mx-4 text-xs font-display text-muted-foreground uppercase">OR JOIN FRIEND</span>
            <div className="flex-grow border-t border-muted"></div>
          </div>

          <form onSubmit={handleJoinRoom} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value)}
              placeholder="ENTER ARENA CODE"
              className="flex-1 px-4 py-3 rounded-xl bg-card border-2 border-muted font-display uppercase tracking-wider text-center text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-coin-gold"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-luigi-green border-2 border-coin-gold font-display tracking-wider uppercase text-primary-foreground hover:scale-105 active:scale-95 transition-all"
            >
              Join
            </button>
          </form>
        </div>
      </main>
    );
  }

  const whitePlayer = players.find(p => p.role === "w");
  const blackPlayer = players.find(p => p.role === "b");

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-[oklch(0.18_0.06_270)] to-background py-6 px-4">
      <div className="fixed top-20 left-10 w-72 h-72 bg-mario-red/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-72 h-72 bg-nintendo-blue/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link to="/multiplayer" className="font-display text-lg text-coin-gold hover:text-mario-red transition-colors">
              ← Lobby
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </div>
          </div>

          <div className="mario-card px-5 py-2 flex items-center gap-3">
            <span className="text-xs font-display text-muted-foreground uppercase tracking-wider">Arena Code:</span>
            <span className="font-display text-coin-gold uppercase tracking-wider font-bold">{roomId}</span>
            <button
              onClick={handleCopyLink}
              className="ml-2 text-xs bg-muted hover:bg-muted/80 text-foreground px-2 py-1 rounded transition-colors"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

          <button
            onClick={reset}
            disabled={!gameStarted}
            className="px-4 py-2 rounded-xl bg-mario-red border-2 border-coin-gold font-display text-sm tracking-wider uppercase text-primary-foreground hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            ↻ Reset Arena
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Board column */}
          <div className="flex flex-col gap-3">
            {/* Bowser's army captured (Always opponent captures if we're White) */}
            <CapturedPanel
              captured={captured}
              side={role === "b" ? "w" : "b"}
              label={role === "b" ? "Mario's captures" : "Bowser's captures"}
            />
            
            <ChessBoard
              game={game}
              selected={selected}
              legalTargets={legalTargets}
              lastMove={lastMove}
              onSquareClick={onSquareClick}
              disabled={!isMyTurn}
              flipped={role === "b"} // Flip the board if player is Black / Bowser
            />

            {/* Fallen captures */}
            <CapturedPanel
              captured={captured}
              side={role === "b" ? "b" : "w"}
              label={role === "b" ? "Your fallen (Bowser)" : "Your fallen (Mario)"}
            />
          </div>

          {/* Side Panel (Status, Players, Chat) */}
          <aside className="flex flex-col gap-4 max-h-[85vh]">
            {/* Status card */}
            <div className="mario-card p-5">
              <div className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-1">Status</div>
              <div className={`font-display text-xl ${game.inCheck() ? "text-mario-red" : "text-coin-gold"}`}>
                {status}
              </div>
              <div className="mt-3 flex flex-col gap-1 text-sm border-t border-muted pt-3">
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-0.5 rounded font-display text-xs ${game.turn() === "w" ? "bg-mario-red text-white" : "bg-card"}`}>
                    🔴 Mario (White):
                  </span>
                  <span className="font-mono text-xs max-w-[120px] truncate text-foreground/80">
                    {whitePlayer ? whitePlayer.username : "Waiting..."}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1.5">
                  <span className={`px-2 py-0.5 rounded font-display text-xs ${game.turn() === "b" ? "bg-nintendo-blue text-white" : "bg-card"}`}>
                    🔵 Bowser (Black):
                  </span>
                  <span className="font-mono text-xs max-w-[120px] truncate text-foreground/80">
                    {blackPlayer ? blackPlayer.username : "Waiting..."}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground text-center font-display uppercase">
                You are playing as {role === "w" ? "🔴 Mario (White)" : role === "b" ? "🔵 Bowser (Black)" : "Spectator"}
              </div>
            </div>

            {/* Chat Room Card */}
            <div className="mario-card p-4 flex-1 flex flex-col min-h-0">
              <div className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-2">Arena Chat</div>
              
              {/* Chat history */}
              <div className="overflow-y-auto flex-1 min-h-[150px] max-h-[30vh] lg:max-h-[none] pr-1 mb-3 flex flex-col gap-2 border border-muted/50 rounded-lg p-2 bg-black/20">
                {chatMessages.length === 0 ? (
                  <div className="text-xs italic text-muted-foreground text-center my-auto">Say hello to your opponent!</div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`text-xs ${msg.isSystem ? "text-coin-gold italic border-l-2 border-coin-gold pl-1 bg-coin-gold/5" : ""}`}
                    >
                      {!msg.isSystem && (
                        <span className={`font-bold mr-1 ${msg.username === username ? "text-mario-red" : "text-nintendo-blue"}`}>
                          {msg.username}:
                        </span>
                      )}
                      <span className="text-foreground/90">{msg.message}</span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Send a message..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-card border border-muted font-sans text-xs focus:outline-none focus:border-coin-gold text-foreground"
                  maxLength={100}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-luigi-green text-white font-display text-xs hover:scale-105 active:scale-95 transition-all"
                >
                  Send
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
