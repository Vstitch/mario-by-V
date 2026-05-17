import wKing from "@/assets/pieces/w-king.png";
import wQueen from "@/assets/pieces/w-queen.png";
import wBishop from "@/assets/pieces/w-bishop.png";
import wKnight from "@/assets/pieces/w-knight.png";
import wRook from "@/assets/pieces/w-rook.png";
import wPawn from "@/assets/pieces/w-pawn.png";
import bKing from "@/assets/pieces/b-king.png";
import bQueen from "@/assets/pieces/b-queen.png";
import bBishop from "@/assets/pieces/b-bishop.png";
import bKnight from "@/assets/pieces/b-knight.png";
import bRook from "@/assets/pieces/b-rook.png";
import bPawn from "@/assets/pieces/b-pawn.png";

export const PIECE_IMAGES: Record<string, string> = {
  wk: wKing, wq: wQueen, wb: wBishop, wn: wKnight, wr: wRook, wp: wPawn,
  bk: bKing, bq: bQueen, bb: bBishop, bn: bKnight, br: bRook, bp: bPawn,
};

export const PIECE_NAMES: Record<string, string> = {
  wk: "Mario", wq: "Peach", wb: "Luigi", wn: "Yoshi", wr: "Thwomp", wp: "Toad",
  bk: "Bowser", bq: "Bowser Jr.", bb: "Kamek", bn: "Dark Yoshi", br: "Bullet Bill", bp: "Goomba",
};

export const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};
