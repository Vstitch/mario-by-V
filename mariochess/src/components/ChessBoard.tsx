import { useMemo } from "react";
import type { Chess, Square } from "chess.js";
import { PIECE_IMAGES } from "@/lib/pieces";

interface BoardProps {
  game: Chess;
  selected: Square | null;
  legalTargets: Square[];
  lastMove: { from: Square; to: Square } | null;
  onSquareClick: (sq: Square) => void;
  flipped?: boolean;
  disabled?: boolean;
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export function ChessBoard({ game, selected, legalTargets, lastMove, onSquareClick, flipped, disabled }: BoardProps) {
  const board = useMemo(() => game.board(), [game]);
  const inCheckSquare: Square | null = useMemo(() => {
    if (!game.inCheck()) return null;
    const turn = game.turn();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === "k" && p.color === turn) {
          return (FILES[f] + (8 - r)) as Square;
        }
      }
    }
    return null;
  }, [game, board]);

  const ranks = flipped ? [...RANKS].reverse() : RANKS;
  const files = flipped ? [...FILES].reverse() : FILES;

  return (
    <div className="relative aspect-square w-full max-w-[min(90vw,640px)] mx-auto">
      {/* Floating frame */}
      <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-coin-gold/80 via-mario-red/60 to-nintendo-blue/80 blur-xl opacity-60 animate-pulse-glow" />
      <div className="relative grid grid-cols-8 grid-rows-8 rounded-2xl overflow-hidden border-4 border-coin-gold shadow-[0_20px_60px_rgba(0,0,0,0.5)] bg-card">
        {ranks.map((rank, rIdx) =>
          files.map((file, fIdx) => {
            const sq = (file + rank) as Square;
            const isLight = (rIdx + fIdx) % 2 === 0;
            const piece = board[8 - rank][FILES.indexOf(file)];
            const isSelected = selected === sq;
            const isTarget = legalTargets.includes(sq);
            const isCapture = isTarget && piece;
            const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
            const isCheck = inCheckSquare === sq;

            return (
              <button
                key={sq}
                onClick={() => !disabled && onSquareClick(sq)}
                disabled={disabled}
                className={`relative aspect-square flex items-center justify-center transition-all ${
                  isLight ? "bg-board-light" : "bg-board-dark"
                } ${isSelected ? "ring-4 ring-inset ring-coin-gold" : ""} ${
                  isLast ? "ring-2 ring-inset ring-nintendo-blue/70" : ""
                } ${isCheck ? "ring-4 ring-inset ring-mario-red animate-pulse" : ""} hover:brightness-110`}
              >
                {/* Coordinates */}
                {fIdx === 0 && (
                  <span className="absolute top-0.5 left-1 text-[10px] font-bold text-foreground/40">{rank}</span>
                )}
                {rIdx === 7 && (
                  <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-foreground/40">{file}</span>
                )}

                {/* Move dot */}
                {isTarget && !isCapture && (
                  <span className="absolute h-1/3 w-1/3 rounded-full bg-coin-gold/70 shadow-coin animate-pulse" />
                )}
                {isCapture && (
                  <span className="absolute inset-1 rounded-full border-4 border-mario-red/80 animate-pulse" />
                )}

                {piece && (
                  <img
                    src={PIECE_IMAGES[piece.color + piece.type]}
                    alt=""
                    draggable={false}
                    className={`relative w-[88%] h-[88%] object-contain select-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)] ${
                      isSelected ? "animate-bob" : ""
                    } ${isLast && lastMove?.to === sq ? "animate-piece-pop" : ""}`}
                    style={{ pointerEvents: "none" }}
                  />
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
