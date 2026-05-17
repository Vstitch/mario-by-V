import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square, type Move } from "chess.js";
import { z } from "zod";
import { ChessBoard } from "@/components/ChessBoard";
import { CapturedPanel } from "@/components/CapturedPanel";
import { bestMove, type Difficulty } from "@/lib/ai";
import { sfx } from "@/lib/sounds";

const search = z.object({
  d: z.enum(["goomba", "koopa", "bowser"]).catch("koopa"),
});

export const Route = createFileRoute("/play")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Play — Super Mario Chess" },
      { name: "description", content: "Play Mario Chess against the AI. Pick your difficulty: Goomba, Koopa, or Bowser." },
    ],
  }),
  component: PlayPage,
});

const DIFF_LABEL: Record<Difficulty, string> = {
  goomba: "Goomba",
  koopa: "Koopa",
  bowser: "Bowser",
};

function PlayPage() {
  const { d } = Route.useSearch();
  const navigate = useNavigate();
  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [captured, setCaptured] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const aiTimeout = useRef<number | null>(null);

  const playerColor = "w" as const;
  const isPlayerTurn = game.turn() === playerColor && !game.isGameOver();

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

      if (cloned.inCheck() && !cloned.isCheckmate()) {
        setTimeout(() => sfx.check(), 200);
      }
      if (cloned.isCheckmate()) {
        setTimeout(() => (cloned.turn() === playerColor ? sfx.defeat() : sfx.victory()), 300);
      }
    },
    [game],
  );

  const onSquareClick = useCallback(
    (sq: Square) => {
      if (!isPlayerTurn) return;
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
    [game, selected, isPlayerTurn, applyMove],
  );

  // AI move
  useEffect(() => {
    if (game.isGameOver() || game.turn() === playerColor) return;
    setThinking(true);
    aiTimeout.current = window.setTimeout(() => {
      const move = bestMove(game.fen(), d);
      if (move) applyMove(move);
      setThinking(false);
    }, 500);
    return () => {
      if (aiTimeout.current) window.clearTimeout(aiTimeout.current);
    };
  }, [game, d, applyMove]);

  const reset = () => {
    setGame(new Chess());
    setSelected(null);
    setLastMove(null);
    setCaptured([]);
    setHistory([]);
  };

  const status = game.isCheckmate()
    ? game.turn() === playerColor
      ? "💀 Checkmate — Bowser wins!"
      : "🏆 Checkmate — Mario wins!"
    : game.isDraw()
      ? "🤝 Draw"
      : game.inCheck()
        ? "⚠️ Check!"
        : isPlayerTurn
          ? "Your move"
          : `${DIFF_LABEL[d as Difficulty]} is thinking...`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-[oklch(0.18_0.06_270)] to-background py-6 px-4">
      {/* Decorative blur orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-mario-red/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-72 h-72 bg-nintendo-blue/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <Link to="/" className="font-display text-lg text-coin-gold hover:text-mario-red transition-colors">
            ← Home
          </Link>
          <div className="mario-card px-5 py-2 flex items-center gap-3">
            <span className="text-xs font-display text-muted-foreground uppercase tracking-wider">Difficulty</span>
            <select
              value={d}
              onChange={(e) => navigate({ to: "/play", search: { d: e.target.value as Difficulty } })}
              className="bg-transparent font-display text-coin-gold uppercase tracking-wider focus:outline-none cursor-pointer"
            >
              <option value="goomba" className="bg-card">🍄 Goomba</option>
              <option value="koopa" className="bg-card">🐢 Koopa</option>
              <option value="bowser" className="bg-card">🔥 Bowser</option>
            </select>
          </div>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl bg-mario-red border-2 border-coin-gold font-display text-sm tracking-wider uppercase text-primary-foreground hover:scale-105 transition-transform"
          >
            ↻ New Game
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Board column */}
          <div className="flex flex-col gap-3">
            <CapturedPanel captured={captured} side="b" label="Bowser's army (your captures)" />
            <ChessBoard
              game={game}
              selected={selected}
              legalTargets={legalTargets}
              lastMove={lastMove}
              onSquareClick={onSquareClick}
              disabled={!isPlayerTurn}
            />
            <CapturedPanel captured={captured} side="w" label="Your fallen (Mario's team)" />
          </div>

          {/* Side panel */}
          <aside className="flex flex-col gap-4">
            <div className="mario-card p-5">
              <div className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-1">Status</div>
              <div className={`font-display text-xl ${game.inCheck() ? "text-mario-red" : "text-coin-gold"} ${thinking ? "animate-pulse" : ""}`}>
                {status}
              </div>
              <div className="mt-3 flex gap-2 text-sm">
                <span className={`px-2 py-1 rounded-md font-display ${game.turn() === "w" ? "bg-mario-red text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Mario</span>
                <span className="text-muted-foreground self-center">vs</span>
                <span className={`px-2 py-1 rounded-md font-display ${game.turn() === "b" ? "bg-nintendo-blue text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Bowser</span>
              </div>
            </div>

            <div className="mario-card p-5 flex-1 flex flex-col min-h-0">
              <div className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-2">Move history</div>
              <div className="overflow-y-auto flex-1 max-h-[40vh] pr-1">
                {history.length === 0 ? (
                  <div className="text-sm italic text-muted-foreground">Make your first move...</div>
                ) : (
                  <ol className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 text-sm font-mono">
                    {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                      <div key={i} className="contents">
                        <span className="text-muted-foreground">{i + 1}.</span>
                        <span className="text-foreground">{history[i * 2]}</span>
                        <span className="text-foreground/70">{history[i * 2 + 1] ?? ""}</span>
                      </div>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {game.isGameOver() && (
              <div className="mario-card p-5 text-center animate-piece-pop">
                <div className="font-display text-2xl text-coin-gold mb-2">
                  {game.isCheckmate() ? (game.turn() === playerColor ? "Game Over" : "Victory!") : "Draw"}
                </div>
                <button
                  onClick={reset}
                  className="w-full mt-2 px-4 py-3 rounded-xl bg-luigi-green border-2 border-coin-gold font-display tracking-wider uppercase text-primary-foreground hover:scale-105 transition-transform"
                >
                  ▶ Play Again
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
