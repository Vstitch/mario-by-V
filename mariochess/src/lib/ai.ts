import { Chess, type Move } from "chess.js";
import { PIECE_VALUES } from "./pieces";

export type Difficulty = "goomba" | "koopa" | "bowser";

const DEPTH: Record<Difficulty, number> = {
  goomba: 1,
  koopa: 2,
  bowser: 3,
};

// Positional bonus tables (simplified, for black's perspective flipped)
const PAWN_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

function evaluate(game: Chess): number {
  if (game.isCheckmate()) return game.turn() === "w" ? -100000 : 100000;
  if (game.isDraw()) return 0;
  const board = game.board();
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const v = PIECE_VALUES[piece.type];
      const idx = r * 8 + f;
      const positional = piece.type === "p" ? (piece.color === "w" ? PAWN_TABLE[idx] : -PAWN_TABLE[63 - idx]) : 0;
      score += piece.color === "w" ? v + positional : -(v + Math.abs(positional));
    }
  }
  // From black's perspective (AI plays black), positive = good for black
  return -score;
}

function minimax(game: Chess, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0 || game.isGameOver()) return evaluate(game);
  const moves = game.moves({ verbose: true });
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.max(best, minimax(game, depth - 1, alpha, beta, false));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.min(best, minimax(game, depth - 1, alpha, beta, true));
      game.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function bestMove(fen: string, difficulty: Difficulty): Move | null {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;
  const depth = DEPTH[difficulty];

  // Goomba: 50% random for fun
  if (difficulty === "goomba" && Math.random() < 0.4) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let best: Move | null = null;
  let bestScore = -Infinity;
  // Shuffle for variety on equal scores
  const shuffled = [...moves].sort(() => Math.random() - 0.5);
  for (const m of shuffled) {
    game.move(m);
    const score = minimax(game, depth - 1, -Infinity, Infinity, false);
    game.undo();
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}
