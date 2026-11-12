import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Cpu,
  Users,
  Undo2,
  FlipVertical2,
  Lightbulb,
  Clock,
  Orbit,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { UiThemeId } from '../scene/BlackHoleScene';

type PieceColor = 'w' | 'b';
type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
type BotFamily = 'kerr' | 'andy';
type BotLevel = 1 | 2 | 3 | 4 | 5;
type EngineTier =
  | 'kerr_1'
  | 'kerr_2'
  | 'kerr_3'
  | 'kerr_4'
  | 'kerr_5'
  | 'andy_1'
  | 'andy_2'
  | 'andy_3'
  | 'andy_4'
  | 'andy_5';
type PlayerSidePref = 'w' | 'random' | 'b';
type ScenarioId = 'standard' | 'mate_in_2' | 'middlegame_tactic' | 'rook_endgame';
type BoardThemeId = 'brown' | 'blue' | 'obsidian';

interface ChessBotProfile {
  id: EngineTier;
  family: BotFamily;
  level: BotLevel;
  name: string;
  elo: number;
  styleTag: string;
  depth: number;
  jitter: number;
  aggression: number;
}

const CHESS_BOT_PROFILES: Record<EngineTier, ChessBotProfile> = {
  kerr_1: {
    id: 'kerr_1',
    family: 'kerr',
    level: 1,
    name: 'Kerr Engine Lv.1',
    elo: 1100,
    styleTag: 'Weak-Field',
    depth: 1,
    jitter: 44,
    aggression: 0,
  },
  kerr_2: {
    id: 'kerr_2',
    family: 'kerr',
    level: 2,
    name: 'Kerr Engine Lv.2',
    elo: 1400,
    styleTag: 'Linearized',
    depth: 1,
    jitter: 14,
    aggression: 0,
  },
  kerr_3: {
    id: 'kerr_3',
    family: 'kerr',
    level: 3,
    name: 'Kerr Engine Lv.3',
    elo: 1700,
    styleTag: 'Boyer-Lindquist',
    depth: 2,
    jitter: 9,
    aggression: 0,
  },
  kerr_4: {
    id: 'kerr_4',
    family: 'kerr',
    level: 4,
    name: 'Kerr Engine Lv.4',
    elo: 2000,
    styleTag: 'Pro Tensor',
    depth: 3,
    jitter: 4,
    aggression: 0,
  },
  kerr_5: {
    id: 'kerr_5',
    family: 'kerr',
    level: 5,
    name: 'Kerr Engine Lv.5',
    elo: 2350,
    styleTag: 'Apex Cluster',
    depth: 3,
    jitter: 0,
    aggression: 0.15,
  },
  andy_1: {
    id: 'andy_1',
    family: 'andy',
    level: 1,
    name: 'Andy Lv.1',
    elo: 1150,
    styleTag: 'Reckless',
    depth: 1,
    jitter: 34,
    aggression: 0.7,
  },
  andy_2: {
    id: 'andy_2',
    family: 'andy',
    level: 2,
    name: 'Andy Lv.2',
    elo: 1500,
    styleTag: 'Sharp',
    depth: 2,
    jitter: 16,
    aggression: 0.9,
  },
  andy_3: {
    id: 'andy_3',
    family: 'andy',
    level: 3,
    name: 'Andy Lv.3',
    elo: 1800,
    styleTag: 'Aggressive',
    depth: 2,
    jitter: 6,
    aggression: 1.15,
  },
  andy_4: {
    id: 'andy_4',
    family: 'andy',
    level: 4,
    name: 'Andy Lv.4',
    elo: 2050,
    styleTag: 'Ruthless',
    depth: 3,
    jitter: 3,
    aggression: 1.35,
  },
  andy_5: {
    id: 'andy_5',
    family: 'andy',
    level: 5,
    name: 'Andy Lv.5',
    elo: 2300,
    styleTag: 'Apex Attacker',
    depth: 3,
    jitter: 0,
    aggression: 1.6,
  },
};

interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

type BoardState = (ChessPiece | null)[][];

interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

interface ChessGameState {
  board: BoardState;
  turn: PieceColor;
  castling: CastlingRights;
  enPassant: [number, number] | null;
  lastMove: { fr: number; fc: number; tr: number; tc: number } | null;
  sanMove?: string;
}

interface ChessMove {
  fr: number;
  fc: number;
  tr: number;
  tc: number;
  promotion?: PieceType;
  isEnPassant?: boolean;
  isCastling?: 'K' | 'Q';
}

const PIECE_UNICODE: Record<PieceColor, Record<PieceType, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const PIECE_ORDER: PieceType[] = ['q', 'r', 'b', 'n', 'p'];

interface LichessBoardTheme {
  id: BoardThemeId;
  label: string;
  lightSqClass: string;
  darkSqClass: string;
  coordOnLightClass: string;
  coordOnDarkClass: string;
  swatchLight: string;
  swatchDark: string;
}

const LICHESS_BOARD_THEMES: Record<BoardThemeId, LichessBoardTheme> = {
  brown: {
    id: 'brown',
    label: 'Brown',
    lightSqClass: 'bg-[#f0d9b5]',
    darkSqClass: 'bg-[#b58863]',
    coordOnLightClass: 'text-[#b58863]',
    coordOnDarkClass: 'text-[#f0d9b5]',
    swatchLight: '#f0d9b5',
    swatchDark: '#b58863',
  },
  blue: {
    id: 'blue',
    label: 'Blue',
    lightSqClass: 'bg-[#dee3e6]',
    darkSqClass: 'bg-[#8ca2ad]',
    coordOnLightClass: 'text-[#8ca2ad]',
    coordOnDarkClass: 'text-[#dee3e6]',
    swatchLight: '#dee3e6',
    swatchDark: '#8ca2ad',
  },
  obsidian: {
    id: 'obsidian',
    label: 'Obsidian',
    lightSqClass: 'bg-[#3d3934]',
    darkSqClass: 'bg-[#24211e]',
    coordOnLightClass: 'text-[#9e9488]',
    coordOnDarkClass: 'text-[#756d63]',
    swatchLight: '#3d3934',
    swatchDark: '#24211e',
  },
};

/**
 * Crisp Cburnett / Lichess-style 45x45 vector chess pieces.
 * Ensures zero line-height or font-metric distortion so every square stays 100% uniform.
 */
const ChessPieceSvg: React.FC<{ color: PieceColor; type: PieceType; className?: string }> = ({
  color,
  type,
  className = 'w-[82%] h-[82%]',
}) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#ffffff' : '#1f1f1f';
  const stroke = isWhite ? '#1b1b1b' : '#0a0a0a';
  const innerStroke = isWhite ? '#1b1b1b' : '#d4d4d8';

  return (
    <svg
      viewBox="0 0 45 45"
      className={`${className} pointer-events-none select-none block shrink-0 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.45)]`}
      aria-hidden="true"
    >
      {type === 'p' && (
        <path
          d="M 22.5,9 C 19.5,9 17,11.5 17,14.5 C 17,16.8 18.4,18.7 20.4,19.5 C 17.5,21 15.5,24 15.5,28 C 15.5,30 16.5,31.5 16.5,31.5 L 12,35.5 L 12,38.5 L 33,38.5 L 33,35.5 L 28.5,31.5 C 28.5,31.5 29.5,30 29.5,28 C 29.5,24 27.5,21 24.6,19.5 C 26.6,18.7 28,16.8 28,14.5 C 28,11.5 25.5,9 22.5,9 z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}

      {type === 'r' && (
        <g
          fill={fill}
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z" />
          <path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z" />
          <path d="M 14,29.5 L 14,16.5 L 31,16.5 L 31,29.5 L 14,29.5 z" />
          <path d="M 14,16.5 L 11,14 L 34,14 L 31,16.5 L 14,16.5 z" />
          <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14" />
          <path d="M 12,32 L 14,29.5 L 31,29.5 L 33,32 L 12,32 z" />
          {!isWhite && (
            <path
              d="M 14,16.5 L 31,16.5 M 14,29.5 L 31,29.5 M 12,32 L 33,32"
              stroke={innerStroke}
              strokeWidth="1"
              fill="none"
            />
          )}
        </g>
      )}

      {type === 'n' && (
        <g
          fill={fill}
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
          <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" />
          <circle cx="15.5" cy="14.5" r="1.2" fill={innerStroke} stroke="none" />
        </g>
      )}

      {type === 'b' && (
        <g
          fill={fill}
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.06 9,36 9,36 z" />
          <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z" />
          <circle cx="22.5" cy="8" r="2.2" />
          <path
            d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18"
            stroke={innerStroke}
            strokeWidth="1.3"
            fill="none"
          />
        </g>
      )}

      {type === 'q' && (
        <g
          fill={fill}
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" />
          <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" />
          <circle cx="6" cy="12" r="1.8" />
          <circle cx="14" cy="9" r="1.8" />
          <circle cx="22.5" cy="8" r="1.8" />
          <circle cx="31" cy="9" r="1.8" />
          <circle cx="39" cy="12" r="1.8" />
          {!isWhite && (
            <path
              d="M 11.5,30 C 15,29 30,29 33.5,30 M 12,33.5 C 18,32.5 27,32.5 33,33.5"
              stroke={innerStroke}
              strokeWidth="1.1"
              fill="none"
            />
          )}
        </g>
      )}

      {type === 'k' && (
        <g
          fill={fill}
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 22.5,11.63 L 22.5,6" fill="none" />
          <path d="M 20,8 L 25,8" fill="none" />
          <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" />
          <path d="M 11.5,37 C 17,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 19,16 9.5,13 6.5,19.5 C 3.5,25.5 11.5,29.5 11.5,29.5 L 11.5,37 z" />
          <path
            d="M 11.5,30 C 17,27 27,27 32.5,30 M 11.5,33.5 C 17,30.5 27,30.5 32.5,33.5 M 11.5,37 C 17,34 27,34 32.5,37"
            stroke={innerStroke}
            strokeWidth="1.15"
            fill="none"
          />
        </g>
      )}
    </svg>
  );
};

// Positional Piece-Square Tables (White perspective, r=0 is rank 8, r=7 is rank 1)
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 27, 27, 10, 5, 5],
  [0, 0, 0, 24, 24, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 22, 22, 15, 5, -30],
  [-30, 0, 15, 22, 22, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 12, 12, 5, 5, -10],
  [-10, 0, 10, 12, 12, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 8, 8, 5, 0, -5],
  [0, 0, 5, 8, 8, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

function getPositionalBonus(piece: ChessPiece, r: number, c: number): number {
  const row = piece.color === 'w' ? r : 7 - r;
  switch (piece.type) {
    case 'p':
      return PAWN_PST[row][c];
    case 'n':
      return KNIGHT_PST[row][c];
    case 'b':
      return BISHOP_PST[row][c];
    case 'r':
      return ROOK_PST[row][c];
    case 'q':
      return QUEEN_PST[row][c];
    case 'k':
      return KING_PST[row][c];
  }
}

interface ScenarioConfig {
  id: ScenarioId;
  name: string;
  subtitle: string;
  description: string;
  rows: string[];
  castling: CastlingRights;
}

const DEFAULT_CASTLING: CastlingRights = {
  wK: true,
  wQ: true,
  bK: true,
  bQ: true,
};

const NO_CASTLING: CastlingRights = {
  wK: false,
  wQ: false,
  bK: false,
  bQ: false,
};

const SCENARIO_PRESETS: Record<ScenarioId, ScenarioConfig> = {
  standard: {
    id: 'standard',
    name: 'Standard',
    subtitle: 'Full FIDE Starting Position',
    description: 'Classical starting position with castling, en passant, and promotion.',
    rows: [
      'rnbqkbnr',
      'pppppppp',
      '........',
      '........',
      '........',
      '........',
      'PPPPPPPP',
      'RNBQKBNR',
    ],
    castling: { ...DEFAULT_CASTLING },
  },
  mate_in_2: {
    id: 'mate_in_2',
    name: 'Mate in 2',
    subtitle: 'Tactical Puzzle · White to Play',
    description: 'White has a forced checkmate sequence against the Black king.',
    rows: [
      'r....rk.',
      'ppp..ppp',
      '..n.....',
      '....N...',
      '....Q...',
      '........',
      'PPP..PPP',
      'R...K..R',
    ],
    castling: { wK: true, wQ: true, bK: false, bQ: false },
  },
  middlegame_tactic: {
    id: 'middlegame_tactic',
    name: 'Open Center',
    subtitle: 'Sharp Tactical Middlegame',
    description: 'Open central tension where control of d4/e4/d5/e5 dominates.',
    rows: [
      'r.bq.rk.',
      'ppp.bppp',
      '..np.n..',
      '....p...',
      '..B.P...',
      '..NP.N..',
      'PPP..PPP',
      'R.BQ.RK.',
    ],
    castling: { ...NO_CASTLING },
  },
  rook_endgame: {
    id: 'rook_endgame',
    name: 'Endgame',
    subtitle: 'Rook & Passed Pawn Endgame',
    description: 'Precision endgame featuring a passed d-pawn and active rooks.',
    rows: [
      '....k...',
      'r....ppp',
      '........',
      '...P....',
      '........',
      '........',
      '.....PPP',
      '...R..K.',
    ],
    castling: { ...NO_CASTLING },
  },
};

function parseFenBoard(rows: string[]): BoardState {
  return rows.map((row) =>
    row.split('').map((ch) => {
      if (ch === '.') return null;
      const color: PieceColor = ch === ch.toUpperCase() ? 'w' : 'b';
      const type = ch.toLowerCase() as PieceType;
      return { type, color };
    })
  );
}

function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function isSquareInErgosphere(r: number, c: number): boolean {
  return r >= 3 && r <= 4 && c >= 3 && c <= 4;
}

function isSquareInPhotonRing(r: number, c: number): boolean {
  if (isSquareInErgosphere(r, c)) return false;
  return r >= 2 && r <= 5 && c >= 2 && c <= 5;
}

function findKingSquare(board: BoardState, color: PieceColor): [number, number] | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.type === 'k') {
        return [r, c];
      }
    }
  }
  return null;
}

function isSquareAttackedBy(
  board: BoardState,
  targetR: number,
  targetC: number,
  attackerColor: PieceColor
): boolean {
  const pawnDir = attackerColor === 'w' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const pr = targetR + pawnDir;
    const pc = targetC + dc;
    if (inBounds(pr, pc)) {
      const p = board[pr][pc];
      if (p && p.color === attackerColor && p.type === 'p') return true;
    }
  }

  const knightJumps = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  for (const [dr, dc] of knightJumps) {
    const nr = targetR + dr;
    const nc = targetC + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === attackerColor && p.type === 'n') return true;
    }
  }

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const kr = targetR + dr;
      const kc = targetC + dc;
      if (inBounds(kr, kc)) {
        const p = board[kr][kc];
        if (p && p.color === attackerColor && p.type === 'k') return true;
      }
    }
  }

  const orthoDirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of orthoDirs) {
    let nr = targetR + dr;
    let nc = targetC + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === attackerColor && (p.type === 'r' || p.type === 'q')) {
          return true;
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  const diagDirs = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (const [dr, dc] of diagDirs) {
    let nr = targetR + dr;
    let nc = targetC + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === attackerColor && (p.type === 'b' || p.type === 'q')) {
          return true;
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  return false;
}

function isKingInCheck(board: BoardState, color: PieceColor): boolean {
  const kingSq = findKingSquare(board, color);
  if (!kingSq) return false;
  const enemy: PieceColor = color === 'w' ? 'b' : 'w';
  return isSquareAttackedBy(board, kingSq[0], kingSq[1], enemy);
}

function getPseudoMovesForSquare(
  state: ChessGameState,
  r: number,
  c: number,
  defaultPromo: PieceType = 'q'
): ChessMove[] {
  const { board, castling, enPassant } = state;
  const piece = board[r][c];
  if (!piece) return [];
  const moves: ChessMove[] = [];
  const { type, color } = piece;
  const enemy: PieceColor = color === 'w' ? 'b' : 'w';

  if (type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRank = color === 'w' ? 6 : 1;
    const promoRank = color === 'w' ? 0 : 7;
    const nr = r + dir;

    if (inBounds(nr, c) && !board[nr][c]) {
      if (nr === promoRank) {
        moves.push({ fr: r, fc: c, tr: nr, tc: c, promotion: defaultPromo });
      } else {
        moves.push({ fr: r, fc: c, tr: nr, tc: c });
        const nnr = r + dir * 2;
        if (r === startRank && inBounds(nnr, c) && !board[nnr][c]) {
          moves.push({ fr: r, fc: c, tr: nnr, tc: c });
        }
      }
    }

    for (const dc of [-1, 1]) {
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const target = board[nr][nc];
      if (target && target.color !== color) {
        if (nr === promoRank) {
          moves.push({ fr: r, fc: c, tr: nr, tc: nc, promotion: defaultPromo });
        } else {
          moves.push({ fr: r, fc: c, tr: nr, tc: nc });
        }
      } else if (enPassant && enPassant[0] === nr && enPassant[1] === nc) {
        moves.push({ fr: r, fc: c, tr: nr, tc: nc, isEnPassant: true });
      }
    }
    return moves;
  }

  if (type === 'n') {
    const jumps = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ];
    for (const [dr, dc] of jumps) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc]!.color !== color)) {
        moves.push({ fr: r, fc: c, tr: nr, tc: nc });
      }
    }
    return moves;
  }

  if (type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc]!.color !== color)) {
          moves.push({ fr: r, fc: c, tr: nr, tc: nc });
        }
      }
    }

    const homeRank = color === 'w' ? 7 : 0;
    if (r === homeRank && c === 4 && !isSquareAttackedBy(board, homeRank, 4, enemy)) {
      const canK = color === 'w' ? castling.wK : castling.bK;
      if (
        canK &&
        !board[homeRank][5] &&
        !board[homeRank][6] &&
        board[homeRank][7]?.type === 'r' &&
        board[homeRank][7]?.color === color &&
        !isSquareAttackedBy(board, homeRank, 5, enemy) &&
        !isSquareAttackedBy(board, homeRank, 6, enemy)
      ) {
        moves.push({ fr: homeRank, fc: 4, tr: homeRank, tc: 6, isCastling: 'K' });
      }

      const canQ = color === 'w' ? castling.wQ : castling.bQ;
      if (
        canQ &&
        !board[homeRank][3] &&
        !board[homeRank][2] &&
        !board[homeRank][1] &&
        board[homeRank][0]?.type === 'r' &&
        board[homeRank][0]?.color === color &&
        !isSquareAttackedBy(board, homeRank, 3, enemy) &&
        !isSquareAttackedBy(board, homeRank, 2, enemy)
      ) {
        moves.push({ fr: homeRank, fc: 4, tr: homeRank, tc: 2, isCastling: 'Q' });
      }
    }
    return moves;
  }

  const dirs: [number, number][] = [];
  if (type === 'r' || type === 'q') {
    dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
  }
  if (type === 'b' || type === 'q') {
    dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
  }

  for (const [dr, dc] of dirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      if (!board[nr][nc]) {
        moves.push({ fr: r, fc: c, tr: nr, tc: nc });
      } else {
        if (board[nr][nc]!.color !== color) {
          moves.push({ fr: r, fc: c, tr: nr, tc: nc });
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return moves;
}

function executeMoveOnState(state: ChessGameState, move: ChessMove): ChessGameState {
  const nextBoard = cloneBoard(state.board);
  const moving = nextBoard[move.fr][move.fc];
  if (!moving) return state;

  const nextCastling: CastlingRights = { ...state.castling };
  let nextEnPassant: [number, number] | null = null;

  if (move.isEnPassant) {
    nextBoard[move.fr][move.tc] = null;
  }

  if (move.isCastling === 'K') {
    const rank = move.fr;
    nextBoard[rank][5] = nextBoard[rank][7];
    nextBoard[rank][7] = null;
  } else if (move.isCastling === 'Q') {
    const rank = move.fr;
    nextBoard[rank][3] = nextBoard[rank][0];
    nextBoard[rank][0] = null;
  }

  nextBoard[move.tr][move.tc] = {
    color: moving.color,
    type: move.promotion || moving.type,
  };
  nextBoard[move.fr][move.fc] = null;

  if (moving.type === 'p' && Math.abs(move.tr - move.fr) === 2) {
    nextEnPassant = [(move.fr + move.tr) / 2, move.fc];
  }

  if (moving.type === 'k') {
    if (moving.color === 'w') {
      nextCastling.wK = false;
      nextCastling.wQ = false;
    } else {
      nextCastling.bK = false;
      nextCastling.bQ = false;
    }
  }
  if (move.fr === 7 && move.fc === 0) nextCastling.wQ = false;
  if (move.fr === 7 && move.fc === 7) nextCastling.wK = false;
  if (move.fr === 0 && move.fc === 0) nextCastling.bQ = false;
  if (move.fr === 0 && move.fc === 7) nextCastling.bK = false;
  if (move.tr === 7 && move.tc === 0) nextCastling.wQ = false;
  if (move.tr === 7 && move.tc === 7) nextCastling.wK = false;
  if (move.tr === 0 && move.tc === 0) nextCastling.bQ = false;
  if (move.tr === 0 && move.tc === 7) nextCastling.bK = false;

  const nextTurn: PieceColor = state.turn === 'w' ? 'b' : 'w';
  return {
    board: nextBoard,
    turn: nextTurn,
    castling: nextCastling,
    enPassant: nextEnPassant,
    lastMove: { fr: move.fr, fc: move.fc, tr: move.tr, tc: move.tc },
  };
}

function getLegalMovesForSquare(
  state: ChessGameState,
  r: number,
  c: number,
  defaultPromo: PieceType = 'q'
): ChessMove[] {
  const piece = state.board[r][c];
  if (!piece) return [];
  const pseudo = getPseudoMovesForSquare(state, r, c, defaultPromo);
  return pseudo.filter((m) => {
    const nextState = executeMoveOnState(state, m);
    return !isKingInCheck(nextState.board, piece.color);
  });
}

function getAllLegalMoves(
  state: ChessGameState,
  color: PieceColor,
  defaultPromo: PieceType = 'q'
): ChessMove[] {
  const all: ChessMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (state.board[r][c]?.color === color) {
        all.push(...getLegalMovesForSquare(state, r, c, defaultPromo));
      }
    }
  }
  return all;
}

function toAlgebraic(r: number, c: number): string {
  return `${String.fromCharCode(97 + c)}${8 - r}`;
}

function formatMoveSan(
  prevState: ChessGameState,
  move: ChessMove,
  nextState: ChessGameState
): string {
  const moving = prevState.board[move.fr][move.fc];
  if (!moving) return '';

  let suffix = '';
  const oppColor = nextState.turn;
  const oppMoves = getAllLegalMoves(nextState, oppColor);
  const inCheck = isKingInCheck(nextState.board, oppColor);
  if (inCheck) {
    suffix = oppMoves.length === 0 ? '#' : '+';
  }

  if (move.isCastling === 'K') return `O-O${suffix}`;
  if (move.isCastling === 'Q') return `O-O-O${suffix}`;

  const captured = prevState.board[move.tr][move.tc] || move.isEnPassant;
  const dest = toAlgebraic(move.tr, move.tc);
  const promoStr = move.promotion ? `=${move.promotion.toUpperCase()}` : '';
  const epStr = move.isEnPassant ? ' e.p.' : '';

  if (moving.type === 'p') {
    if (captured) {
      const origFile = String.fromCharCode(97 + move.fc);
      return `${origFile}x${dest}${promoStr}${suffix}${epStr}`;
    }
    return `${dest}${promoStr}${suffix}`;
  }

  const pieceChar = moving.type.toUpperCase();
  const capChar = captured ? 'x' : '';
  return `${pieceChar}${capChar}${dest}${suffix}`;
}

function evaluateBoardPosition(
  board: BoardState,
  ergosphereActive: boolean,
  aggressionMult = 0
): number {
  let score = 0;
  const whiteKing = aggressionMult > 0 ? findKingSquare(board, 'w') : null;
  const blackKing = aggressionMult > 0 ? findKingSquare(board, 'b') : null;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      let val = PIECE_VALUES[p.type] + getPositionalBonus(p, r, c);
      if (ergosphereActive && p.type !== 'k') {
        if (isSquareInErgosphere(r, c)) {
          val += 28;
        } else if (isSquareInPhotonRing(r, c)) {
          val += 12;
        }
      }

      // Andy Aggressive Profile: Rewards king-tropism, forward piece storms, and attacking initiative
      if (aggressionMult > 0 && p.type !== 'k') {
        const enemyKing = p.color === 'w' ? blackKing : whiteKing;
        const advanceRanks = p.color === 'w' ? 7 - r : r;
        val += Math.round(advanceRanks * (p.type === 'p' ? 5 : 7) * aggressionMult);

        if (enemyKing) {
          const distToEnemyKing = Math.abs(r - enemyKing[0]) + Math.abs(c - enemyKing[1]);
          const tropismWeight =
            p.type === 'q' ? 11 : p.type === 'r' ? 7 : p.type === 'n' || p.type === 'b' ? 8 : 4;
          val += Math.round(Math.max(0, 10 - distToEnemyKing) * tropismWeight * aggressionMult);
        }
      }

      score += p.color === 'w' ? val : -val;
    }
  }
  return score;
}

function computeBestEngineMove(
  state: ChessGameState,
  tier: EngineTier,
  ergosphereActive: boolean
): { move: ChessMove | null; evalCp: number; nodesSearched: number; depth: number } {
  const profile = CHESS_BOT_PROFILES[tier] || CHESS_BOT_PROFILES.kerr_5;
  const maxDepth = profile.depth;
  const agg = profile.aggression;
  let nodesSearched = 0;

  const legalMoves = getAllLegalMoves(state, state.turn, 'q');
  if (legalMoves.length === 0) {
    return {
      move: null,
      evalCp: evaluateBoardPosition(state.board, ergosphereActive, agg),
      nodesSearched: 0,
      depth: maxDepth,
    };
  }

  const scoreMoveOrdering = (b: BoardState, m: ChessMove) => {
    const victim = b[m.tr][m.tc];
    const attacker = b[m.fr][m.fc];
    let s = 0;
    if (victim && attacker) {
      s += 10 * PIECE_VALUES[victim.type] - PIECE_VALUES[attacker.type] / 10;
      if (agg > 0) s += Math.round(60 * agg);
    }
    if (m.promotion) s += 800;
    if (m.isCastling) s += 60;
    if (agg > 0 && attacker) {
      const forwardDelta = attacker.color === 'b' ? m.tr - m.fr : m.fr - m.tr;
      if (forwardDelta > 0) s += Math.round(forwardDelta * 12 * agg);
    }
    return s;
  };

  function alphaBeta(
    curState: ChessGameState,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean
  ): number {
    nodesSearched++;
    if (depth === 0) {
      return evaluateBoardPosition(curState.board, ergosphereActive, agg);
    }

    const moves = getAllLegalMoves(curState, curState.turn, 'q');
    if (moves.length === 0) {
      if (isKingInCheck(curState.board, curState.turn)) {
        return maximizingPlayer ? -18000 - depth * 100 : 18000 + depth * 100;
      }
      return 0;
    }

    moves.sort((a, b) => scoreMoveOrdering(curState.board, b) - scoreMoveOrdering(curState.board, a));

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      for (const m of moves) {
        const nextSt = executeMoveOnState(curState, m);
        const ev = alphaBeta(nextSt, depth - 1, alpha, beta, false);
        if (ev > maxEval) maxEval = ev;
        if (ev > alpha) alpha = ev;
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        const nextSt = executeMoveOnState(curState, m);
        const ev = alphaBeta(nextSt, depth - 1, alpha, beta, true);
        if (ev < minEval) minEval = ev;
        if (ev < beta) beta = ev;
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  const isMaximizing = state.turn === 'w';
  legalMoves.sort(
    (a, b) => scoreMoveOrdering(state.board, b) - scoreMoveOrdering(state.board, a)
  );

  let bestMove = legalMoves[0];
  let bestVal = isMaximizing ? -Infinity : Infinity;
  const oppColor: PieceColor = state.turn === 'w' ? 'b' : 'w';

  for (const m of legalMoves) {
    const nextSt = executeMoveOnState(state, m);
    const jitter = profile.jitter > 0 ? (Math.random() - 0.5) * profile.jitter * 2 : 0;

    let attackBias = 0;
    if (agg > 0) {
      const givesCheck = isKingInCheck(nextSt.board, oppColor);
      const isCapture = Boolean(state.board[m.tr][m.tc] || m.isEnPassant);
      const forwardSteps = state.turn === 'b' ? m.tr - m.fr : m.fr - m.tr;
      const rawBias =
        ((givesCheck ? 45 : 0) + (isCapture ? 25 : 0) + Math.max(0, forwardSteps) * 8) * agg;
      attackBias = isMaximizing ? rawBias : -rawBias;
    }

    const ev =
      alphaBeta(nextSt, maxDepth - 1, -Infinity, Infinity, !isMaximizing) +
      attackBias +
      jitter;

    if (isMaximizing) {
      if (ev > bestVal) {
        bestVal = ev;
        bestMove = m;
      }
    } else {
      if (ev < bestVal) {
        bestVal = ev;
        bestMove = m;
      }
    }
  }

  return {
    move: bestMove,
    evalCp: Math.round(bestVal),
    nodesSearched,
    depth: maxDepth,
  };
}

function computeSideTimeDilationFactor(board: BoardState, color: PieceColor): number {
  let totalWeight = 0;
  let weightedDilation = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== color) continue;
      const distFromCenter = Math.hypot(r - 3.5, c - 3.5);
      const rRs = 1.45 + distFromCenter * 0.65;
      const localDilation = Math.sqrt(Math.max(0.25, 1.0 - 1.0 / rRs));
      const pieceWeight = p.type === 'k' ? 1.5 : p.type === 'q' ? 2.0 : 1.0;
      totalWeight += pieceWeight;
      weightedDilation += localDilation * pieceWeight;
    }
  }
  return totalWeight > 0 ? weightedDilation / totalWeight : 0.92;
}

interface ChessModuleProps {
  uiTheme?: UiThemeId;
  onHapticLight?: () => void;
  onHapticMedium?: () => void;
  onHapticSuccess?: () => void;
}

export const ChessModule: React.FC<ChessModuleProps> = ({
  onHapticLight,
  onHapticMedium,
  onHapticSuccess,
}) => {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('standard');
  const [boardThemeId, setBoardThemeId] = useState<BoardThemeId>('brown');
  const [gameState, setGameState] = useState<ChessGameState>(() => ({
    board: parseFenBoard(SCENARIO_PRESETS.standard.rows),
    turn: 'w',
    castling: { ...DEFAULT_CASTLING },
    enPassant: null,
    lastMove: null,
  }));
  const [history, setHistory] = useState<ChessGameState[]>([]);
  const [moveLog, setMoveLog] = useState<string[]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [vsEngine, setVsEngine] = useState<boolean>(true);
  const [botFamily, setBotFamily] = useState<BotFamily>('kerr');
  const [botLevel, setBotLevel] = useState<BotLevel>(3);
  const [playerSidePref, setPlayerSidePref] = useState<PlayerSidePref>('w');
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [promotionChoice, setPromotionChoice] = useState<PieceType>('q');
  const [boardFlipped, setBoardFlipped] = useState<boolean>(false);
  const [ergosphereMode, setErgosphereMode] = useState<boolean>(true);
  const [hintMove, setHintMove] = useState<ChessMove | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('White to move');
  const [engineTelemetry, setEngineTelemetry] = useState<{
    nodes: number;
    depth: number;
    evalCp: number;
  }>({ nodes: 0, depth: 3, evalCp: 0 });
  const [copiedPgn, setCopiedPgn] = useState<boolean>(false);

  const engineTier: EngineTier = `${botFamily}_${botLevel}` as EngineTier;
  const activeBot = CHESS_BOT_PROFILES[engineTier];

  // Relativistic Proper-Time Clocks (5:00 default)
  const [clockEnabled, setClockEnabled] = useState<boolean>(true);
  const [whiteProperSec, setWhiteProperSec] = useState<number>(300);
  const [blackProperSec, setBlackProperSec] = useState<number>(300);
  const engineTimerRef = useRef<number | null>(null);

  const board = gameState.board;
  const turn = gameState.turn;
  const activeBoardTheme = LICHESS_BOARD_THEMES[boardThemeId];

  const whiteDilation = useMemo(
    () => computeSideTimeDilationFactor(board, 'w'),
    [board]
  );
  const blackDilation = useMemo(
    () => computeSideTimeDilationFactor(board, 'b'),
    [board]
  );

  const isGameOver = useMemo(() => {
    return (
      statusMessage.includes('Checkmate') ||
      statusMessage.includes('Stalemate') ||
      statusMessage.includes('Time out')
    );
  }, [statusMessage]);

  useEffect(() => {
    if (!clockEnabled || isGameOver || moveLog.length === 0) return;
    const interval = window.setInterval(() => {
      if (turn === 'w') {
        setWhiteProperSec((prev) => {
          const next = Math.max(0, prev - 0.2 * (ergosphereMode ? whiteDilation : 1.0));
          if (next <= 0) {
            setStatusMessage('Time out — Black wins on time');
          }
          return next;
        });
      } else {
        setBlackProperSec((prev) => {
          const next = Math.max(0, prev - 0.2 * (ergosphereMode ? blackDilation : 1.0));
          if (next <= 0) {
            setStatusMessage('Time out — White wins on time');
          }
          return next;
        });
      }
    }, 200);
    return () => window.clearInterval(interval);
  }, [clockEnabled, isGameOver, moveLog.length, turn, ergosphereMode, whiteDilation, blackDilation]);

  useEffect(() => {
    return () => {
      if (engineTimerRef.current !== null) {
        window.clearTimeout(engineTimerRef.current);
      }
    };
  }, []);

  const selectedLegalMoves = useMemo(() => {
    if (!selected) return [];
    return getLegalMovesForSquare(gameState, selected[0], selected[1], promotionChoice);
  }, [gameState, selected, promotionChoice]);

  const materialStats = useMemo(() => {
    const startCounts: Record<PieceType, number> = { q: 1, r: 2, b: 2, n: 2, p: 8, k: 1 };
    const currentW: Record<PieceType, number> = { q: 0, r: 0, b: 0, n: 0, p: 0, k: 0 };
    const currentB: Record<PieceType, number> = { q: 0, r: 0, b: 0, n: 0, p: 0, k: 0 };

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p) continue;
        if (p.color === 'w') currentW[p.type]++;
        else currentB[p.type]++;
      }
    }

    const capturedByWhite: PieceType[] = [];
    const capturedByBlack: PieceType[] = [];
    for (const t of PIECE_ORDER) {
      const missingB = Math.max(0, startCounts[t] - currentB[t]);
      for (let i = 0; i < missingB; i++) capturedByWhite.push(t);
      const missingW = Math.max(0, startCounts[t] - currentW[t]);
      for (let i = 0; i < missingW; i++) capturedByBlack.push(t);
    }

    const matW =
      currentW.q * 9 + currentW.r * 5 + currentW.b * 3 + currentW.n * 3 + currentW.p;
    const matB =
      currentB.q * 9 + currentB.r * 5 + currentB.b * 3 + currentB.n * 3 + currentB.p;

    const evalCp = evaluateBoardPosition(board, ergosphereMode);

    return {
      capturedByWhite,
      capturedByBlack,
      diff: matW - matB,
      evalPawns: evalCp / 100,
    };
  }, [board, ergosphereMode]);

  const evaluateGameEnd = useCallback(
    (nextState: ChessGameState) => {
      const nextTurn = nextState.turn;
      const legals = getAllLegalMoves(nextState, nextTurn, 'q');
      const inCheck = isKingInCheck(nextState.board, nextTurn);

      if (legals.length === 0) {
        if (inCheck) {
          setStatusMessage(
            `Checkmate • ${nextTurn === 'w' ? 'Black' : 'White'} is victorious`
          );
          onHapticSuccess?.();
        } else {
          setStatusMessage('Stalemate • Draw');
        }
        return true;
      }

      if (inCheck) {
        setStatusMessage(`${nextTurn === 'w' ? 'White' : 'Black'} is in check`);
      } else {
        setStatusMessage(`${nextTurn === 'w' ? 'White' : 'Black'} to move`);
      }
      return false;
    },
    [onHapticSuccess]
  );

  const triggerEngineReply = useCallback(
    (currentState: ChessGameState, customTier?: EngineTier) => {
      const activeTier = customTier || engineTier;
      const result = computeBestEngineMove(currentState, activeTier, ergosphereMode);
      if (!result.move) return;

      const nextState = executeMoveOnState(currentState, result.move);
      const notation = formatMoveSan(currentState, result.move, nextState);

      setEngineTelemetry({
        nodes: result.nodesSearched,
        depth: result.depth,
        evalCp: result.evalCp,
      });
      setHistory((prev) => [...prev, currentState]);
      setGameState(nextState);
      setMoveLog((prev) => [...prev, notation]);
      evaluateGameEnd(nextState);
    },
    [engineTier, ergosphereMode, evaluateGameEnd]
  );

  const engineColor: PieceColor = playerColor === 'w' ? 'b' : 'w';

  const handleSquareClick = (r: number, c: number) => {
    if (isGameOver) return;
    if (vsEngine && turn === engineColor) return;

    setHintMove(null);

    if (selected) {
      const [sr, sc] = selected;
      if (sr === r && sc === c) {
        setSelected(null);
        return;
      }

      const matchedMove = selectedLegalMoves.find((m) => m.tr === r && m.tc === c);
      if (matchedMove) {
        const nextState = executeMoveOnState(gameState, matchedMove);
        const notation = formatMoveSan(gameState, matchedMove, nextState);

        onHapticMedium?.();
        setHistory((prev) => [...prev, gameState]);
        setGameState(nextState);
        setSelected(null);
        setMoveLog((prev) => [...prev, notation]);

        const ended = evaluateGameEnd(nextState);
        if (!ended && vsEngine && nextState.turn === engineColor) {
          if (engineTimerRef.current !== null) {
            window.clearTimeout(engineTimerRef.current);
          }
          engineTimerRef.current = window.setTimeout(() => {
            triggerEngineReply(nextState);
          }, 220);
        }
        return;
      }
    }

    if (board[r][c] && board[r][c]!.color === turn) {
      onHapticLight?.();
      setSelected([r, c]);
    } else {
      setSelected(null);
    }
  };

  const startFreshMatch = useCallback(
    (sidePref: PlayerSidePref, nextScenarioId: ScenarioId = 'standard', nextVsEngine = vsEngine) => {
      if (engineTimerRef.current !== null) {
        window.clearTimeout(engineTimerRef.current);
      }
      onHapticMedium?.();
      const resolvedColor: PieceColor =
        sidePref === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : sidePref;
      const preset = SCENARIO_PRESETS[nextScenarioId];
      const freshState: ChessGameState = {
        board: parseFenBoard(preset.rows),
        turn: 'w',
        castling: { ...preset.castling },
        enPassant: null,
        lastMove: null,
      };

      setScenarioId(nextScenarioId);
      setPlayerSidePref(sidePref);
      setPlayerColor(resolvedColor);
      setBoardFlipped(resolvedColor === 'b');
      setGameState(freshState);
      setHistory([]);
      setMoveLog([]);
      setSelected(null);
      setHintMove(null);
      setWhiteProperSec(300);
      setBlackProperSec(300);
      setStatusMessage('White to move');

      // If playing vs AI and the player is assigned Black, the AI plays White's opening move automatically
      if (nextVsEngine && resolvedColor === 'b') {
        engineTimerRef.current = window.setTimeout(() => {
          triggerEngineReply(freshState);
        }, 260);
      }
    },
    [onHapticMedium, triggerEngineReply, vsEngine]
  );

  const handleResetGame = () => {
    startFreshMatch(playerSidePref, scenarioId, vsEngine);
  };

  const handleUndoMove = () => {
    if (history.length === 0) return;
    if (engineTimerRef.current !== null) {
      window.clearTimeout(engineTimerRef.current);
    }
    onHapticLight?.();
    setHintMove(null);
    setSelected(null);

    const stepsBack = vsEngine && turn === playerColor && history.length >= 2 ? 2 : 1;
    const targetIdx = Math.max(0, history.length - stepsBack);
    const restoredState = history[targetIdx];

    setGameState(restoredState);
    setHistory((prev) => prev.slice(0, targetIdx));
    setMoveLog((prev) => prev.slice(0, targetIdx));
    evaluateGameEnd(restoredState);
  };

  const handleRequestHint = () => {
    if (isGameOver) return;
    onHapticLight?.();
    const res = computeBestEngineMove(gameState, 'kerr_5', ergosphereMode);
    if (res.move) {
      setHintMove(res.move);
      setSelected([res.move.fr, res.move.fc]);
      setEngineTelemetry({
        nodes: res.nodesSearched,
        depth: res.depth,
        evalCp: res.evalCp,
      });
    }
  };

  const handleCopyMoveLog = () => {
    if (moveLog.length === 0) return;
    const pairs: string[] = [];
    for (let i = 0; i < moveLog.length; i += 2) {
      const wMove = moveLog[i];
      const bMove = moveLog[i + 1] ? ` ${moveLog[i + 1]}` : '';
      pairs.push(`${Math.floor(i / 2) + 1}. ${wMove}${bMove}`);
    }
    void navigator.clipboard?.writeText(pairs.join(' '));
    setCopiedPgn(true);
    window.setTimeout(() => setCopiedPgn(false), 1800);
  };

  const formatClock = (sec: number) => {
    const whole = Math.max(0, Math.floor(sec));
    const m = Math.floor(whole / 60);
    const s = whole % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const checkedKingSquare = useMemo(() => {
    if (isKingInCheck(board, 'w')) return findKingSquare(board, 'w');
    if (isKingInCheck(board, 'b')) return findKingSquare(board, 'b');
    return null;
  }, [board]);

  const pairedMoves = useMemo(() => {
    const rows: { moveNum: number; white: string; black?: string }[] = [];
    for (let i = 0; i < moveLog.length; i += 2) {
      rows.push({
        moveNum: Math.floor(i / 2) + 1,
        white: moveLog[i],
        black: moveLog[i + 1],
      });
    }
    return rows;
  }, [moveLog]);

  const evalWhitePct = useMemo(() => {
    const clamped = Math.max(-8, Math.min(8, materialStats.evalPawns));
    return Math.round(50 + (clamped / 8) * 45);
  }, [materialStats.evalPawns]);

  const displayIndices = boardFlipped
    ? [7, 6, 5, 4, 3, 2, 1, 0]
    : [0, 1, 2, 3, 4, 5, 6, 7];

  const engineDisplayLabel = `${activeBot.name} · ${activeBot.elo} ELO (${activeBot.styleTag})`;

  const whiteSideLabel = !vsEngine
    ? 'Player 1 (White)'
    : playerColor === 'w'
    ? 'Observer (White)'
    : engineDisplayLabel;

  const blackSideLabel = !vsEngine
    ? 'Player 2 (Black)'
    : playerColor === 'b'
    ? 'Observer (Black)'
    : engineDisplayLabel;

  const topPlayerLabel = boardFlipped ? whiteSideLabel : blackSideLabel;
  const bottomPlayerLabel = boardFlipped ? blackSideLabel : whiteSideLabel;

  return (
    <div
      data-testid="settings-chess-tab-panel"
      className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto space-y-3 text-xs font-mono bg-[#161512]"
    >
      {/* Lichess-Style Top Configuration Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#262421] border border-[#36332e]">
        {/* Left: Side Selector (White / Random / Black) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-[#9e9b95] uppercase tracking-wider mr-0.5">Side:</span>
          <div className="flex items-center rounded overflow-hidden border border-[#36332e] bg-[#1b1a17]">
            {(
              [
                { id: 'w', label: '♔ White', title: 'Play as White' },
                { id: 'random', label: '🎲 Random', title: 'Randomly assign White or Black' },
                { id: 'b', label: '♚ Black', title: 'Play as Black' },
              ] as const
            ).map((sOpt) => (
              <button
                key={sOpt.id}
                type="button"
                data-testid={`chess-side-${sOpt.id}`}
                title={sOpt.title}
                onClick={() => startFreshMatch(sOpt.id, scenarioId, vsEngine)}
                className={`px-2 py-1 text-[10px] cursor-pointer transition-colors ${
                  playerSidePref === sOpt.id
                    ? 'bg-[#3692e7] text-white font-bold'
                    : 'text-[#bababa] hover:text-white'
                }`}
              >
                {sOpt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center/Right: Bot Family (Kerr 1-5 | Andy 1-5 | 2P) + Level 1-5 + Board Themes */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Bot Persona / 2P Selector */}
          <div className="flex items-center rounded overflow-hidden border border-[#36332e] bg-[#1b1a17]">
            <button
              type="button"
              data-testid="chess-bot-family-kerr"
              onClick={() => {
                onHapticLight?.();
                setVsEngine(true);
                setBotFamily('kerr');
              }}
              className={`flex items-center gap-1.5 px-2 py-1 text-[10px] cursor-pointer transition-colors ${
                vsEngine && botFamily === 'kerr'
                  ? 'bg-[#201815] text-[#F4A688] font-bold border-r border-[#D97757]/50'
                  : 'text-[#bababa] hover:text-white'
              }`}
              title="Kerr Engine Bots (Levels 1–5 · Positional & Relativistic)"
            >
              <svg
                width="12"
                height="12"
                viewBox="-24 -24 48 48"
                className="shrink-0 overflow-visible"
                aria-hidden="true"
              >
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const angle = (i * Math.PI) / 6;
                  const rRay = i % 2 === 0 ? 18 : 14.5;
                  return (
                    <line
                      key={i}
                      x1={Math.cos(angle) * -rRay}
                      y1={Math.sin(angle) * -rRay}
                      x2={Math.cos(angle) * rRay}
                      y2={Math.sin(angle) * rRay}
                      stroke="rgba(232, 139, 107, 0.94)"
                      strokeWidth={i % 3 === 0 ? '2.4' : '1.6'}
                      strokeLinecap="round"
                    />
                  );
                })}
                <circle
                  cx="0"
                  cy="0"
                  r="4.6"
                  fill="#090A0F"
                  stroke="rgba(246, 184, 158, 0.96)"
                  strokeWidth="2.1"
                />
              </svg>
              <span>Kerr Bot</span>
            </button>

            <button
              type="button"
              data-testid="chess-bot-family-andy"
              onClick={() => {
                onHapticLight?.();
                setVsEngine(true);
                setBotFamily('andy');
              }}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] cursor-pointer transition-colors ${
                vsEngine && botFamily === 'andy'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'text-[#bababa] hover:text-white'
              }`}
              title="Andy Bots (Levels 1–5 · Aggressive Tactician)"
            >
              <span>⚡ Andy Bot</span>
            </button>

            <button
              type="button"
              data-testid="chess-mode-2p"
              onClick={() => {
                onHapticLight?.();
                setVsEngine(false);
              }}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] cursor-pointer transition-colors ${
                !vsEngine
                  ? 'bg-[#3692e7] text-white font-bold'
                  : 'text-[#bababa] hover:text-white'
              }`}
              title="2-Player Over-the-Board"
            >
              <Users className="w-3 h-3" />
              <span>2P</span>
            </button>
          </div>

          {/* Bot Level 1–5 Selector */}
          {vsEngine && (
            <div className="flex items-center rounded overflow-hidden border border-[#36332e] bg-[#1b1a17]">
              {([1, 2, 3, 4, 5] as BotLevel[]).map((lvl) => {
                const tierKey = `${botFamily}_${lvl}` as EngineTier;
                const prof = CHESS_BOT_PROFILES[tierKey];
                const isSelected = botLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    data-testid={`chess-level-${lvl}`}
                    title={`${prof.name} · ${prof.elo} ELO (${prof.styleTag})`}
                    onClick={() => {
                      onHapticLight?.();
                      setBotLevel(lvl);
                    }}
                    className={`px-2 py-1 text-[10px] cursor-pointer transition-colors ${
                      isSelected
                        ? botFamily === 'andy'
                          ? 'bg-rose-600 text-white font-bold'
                          : 'bg-[#D97757] text-[#F7F4EE] font-bold'
                        : 'text-[#999] hover:text-white'
                    }`}
                  >
                    Lv.{lvl}
                  </button>
                );
              })}
            </div>
          )}

          {/* Lichess Board Theme Switcher (Brown / Blue / Obsidian) */}
          <div className="flex items-center gap-1 pl-1 border-l border-[#36332e]">
            {(Object.keys(LICHESS_BOARD_THEMES) as BoardThemeId[]).map((thId) => {
              const th = LICHESS_BOARD_THEMES[thId];
              const isSelected = boardThemeId === thId;
              return (
                <button
                  key={thId}
                  type="button"
                  onClick={() => {
                    onHapticLight?.();
                    setBoardThemeId(thId);
                  }}
                  title={`Board Theme: ${th.label}`}
                  className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#302e2c] border-[#dbd9d5] text-white font-semibold'
                      : 'bg-[#1b1a17] border-[#36332e] text-[#999] hover:text-white'
                  }`}
                >
                  <span className="inline-flex w-3 h-3 rounded-[2px] overflow-hidden border border-black/40 shrink-0">
                    <span className="w-1/2 h-full" style={{ backgroundColor: th.swatchLight }} />
                    <span className="w-1/2 h-full" style={{ backgroundColor: th.swatchDark }} />
                  </span>
                  <span className="hidden sm:inline">{th.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Lichess 2-Column Arena: Left [Square 8x8 Board + Eval Bar] | Right [Clocks, Move Table, Controls] */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
        {/* LEFT COLUMN: Exact 1:1 Square Board + Vertical Lichess Evaluation Gauge */}
        <div className="md:col-span-7 flex items-center justify-center">
          <div className="flex items-stretch gap-1.5 w-full max-w-[390px] sm:max-w-[420px]">
            {/* Lichess Vertical Evaluation Bar */}
            <div
              className="w-3.5 rounded-[3px] overflow-hidden border border-[#36332e] bg-[#262421] flex flex-col justify-between relative select-none shrink-0"
              title={`Evaluation: ${materialStats.evalPawns >= 0 ? '+' : ''}${materialStats.evalPawns.toFixed(1)}`}
            >
              <div
                className="w-full bg-[#403d39] transition-all duration-300"
                style={{ height: `${100 - evalWhitePct}%` }}
              />
              <div
                className="w-full bg-[#e6e4e1] transition-all duration-300"
                style={{ height: `${evalWhitePct}%` }}
              />
              {/* Center 0.0 Equilibrium Tick */}
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[1.5px] bg-[#d97757]/80" />
              <span
                className={`pointer-events-none absolute inset-x-0 ${
                  materialStats.evalPawns >= 0 ? 'bottom-1 text-[#161512]' : 'top-1 text-[#e6e4e1]'
                } text-[7.5px] font-bold text-center leading-none`}
              >
                {materialStats.evalPawns >= 0
                  ? `+${materialStats.evalPawns.toFixed(1)}`
                  : materialStats.evalPawns.toFixed(1)}
              </span>
            </div>

            {/* 8x8 Chessboard Grid — Strictly 8 Equal Columns x 8 Equal Rows (1:1 Square Cells) */}
            <div
              data-testid="chess-board-grid"
              className="grid grid-cols-8 grid-rows-8 w-full aspect-square rounded-[3px] overflow-hidden border border-[#36332e] shadow-[0_10px_28px_rgba(0,0,0,0.75)] select-none"
            >
              {displayIndices.map((r) =>
                displayIndices.map((c) => {
                  const cell = board[r][c];
                  const isDark = (r + c) % 2 === 1;
                  const isSel = selected?.[0] === r && selected?.[1] === c;
                  const legalMove = selectedLegalMoves.find(
                    (m) => m.tr === r && m.tc === c
                  );
                  const isLegalDest = Boolean(legalMove);
                  const isLastMoveSq =
                    gameState.lastMove &&
                    ((gameState.lastMove.fr === r && gameState.lastMove.fc === c) ||
                      (gameState.lastMove.tr === r && gameState.lastMove.tc === c));
                  const isHintSq =
                    hintMove &&
                    ((hintMove.fr === r && hintMove.fc === c) ||
                      (hintMove.tr === r && hintMove.tc === c));
                  const isKingCheckedHere =
                    checkedKingSquare?.[0] === r && checkedKingSquare?.[1] === c;
                  const inErgo = ergosphereMode && isSquareInErgosphere(r, c);

                  const showRankCoord = c === (boardFlipped ? 7 : 0);
                  const showFileCoord = r === (boardFlipped ? 0 : 7);

                  const baseSqClass = isDark
                    ? activeBoardTheme.darkSqClass
                    : activeBoardTheme.lightSqClass;
                  const coordTextClass = isDark
                    ? activeBoardTheme.coordOnDarkClass
                    : activeBoardTheme.coordOnLightClass;

                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      data-testid={`chess-square-${r}-${c}`}
                      onClick={() => handleSquareClick(r, c)}
                      className={`relative w-full h-full aspect-square p-0 m-0 border-0 outline-none flex items-center justify-center overflow-hidden select-none leading-none cursor-pointer ${baseSqClass}`}
                    >
                      {/* Lichess Last-Move Olive Highlight */}
                      {isLastMoveSq && !isSel && (
                        <span
                          className="pointer-events-none absolute inset-0 bg-[#9bc700]/45"
                          aria-hidden="true"
                        />
                      )}

                      {/* Lichess Selected Square Green Tint */}
                      {isSel && (
                        <span
                          className="pointer-events-none absolute inset-0 bg-[#14551e]/50"
                          aria-hidden="true"
                        />
                      )}

                      {/* Engine Hint Highlight */}
                      {isHintSq && !isSel && (
                        <span
                          className="pointer-events-none absolute inset-0 bg-[#3692e7]/45 ring-2 ring-inset ring-[#3692e7]"
                          aria-hidden="true"
                        />
                      )}

                      {/* Lichess King in Check Radial Crimson Glow */}
                      {isKingCheckedHere && (
                        <span
                          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,0,0,0.92)_0%,rgba(231,0,0,0.65)_45%,rgba(169,0,0,0)_89%)]"
                          aria-hidden="true"
                        />
                      )}

                      {/* Subtle Ergosphere Center Corner Hairline */}
                      {inErgo && (
                        <span
                          className="pointer-events-none absolute inset-[2px] border border-dashed border-black/20"
                          aria-hidden="true"
                        />
                      )}

                      {/* Lichess Rank & File Edge Coordinates */}
                      {showRankCoord && (
                        <span
                          className={`pointer-events-none absolute top-[2px] left-[3px] text-[9px] font-bold leading-none ${coordTextClass}`}
                        >
                          {8 - r}
                        </span>
                      )}
                      {showFileCoord && (
                        <span
                          className={`pointer-events-none absolute bottom-[2px] right-[3px] text-[9px] font-bold leading-none ${coordTextClass}`}
                        >
                          {String.fromCharCode(97 + c)}
                        </span>
                      )}

                      {/* Crisp Cburnett Vector Chess Piece + Screen-Reader Unicode */}
                      {cell && (
                        <>
                          <ChessPieceSvg color={cell.color} type={cell.type} />
                          <span className="sr-only">
                            {PIECE_UNICODE[cell.color][cell.type]}
                          </span>
                        </>
                      )}

                      {/* Lichess Legal Destination Dot (Empty Square) */}
                      {isLegalDest && !cell && (
                        <span
                          className="pointer-events-none w-[26%] h-[26%] rounded-full bg-[#14551e]/50"
                          aria-hidden="true"
                        />
                      )}

                      {/* Lichess Legal Capture Ring (Occupied Square) */}
                      {isLegalDest && cell && (
                        <span
                          className="pointer-events-none absolute inset-0 ring-[4px] ring-inset ring-[#14551e]/55"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Lichess Side Panel (Top Opponent Clock -> Move List & Controls -> Bottom Player Clock) */}
        <div className="md:col-span-5 flex flex-col justify-between rounded-lg bg-[#262421] border border-[#36332e] overflow-hidden">
          {/* 1. Top Player / Engine Header + Lichess Digital Clock */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#1f1e1b] border-b border-[#36332e]">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    turn === (boardFlipped ? 'w' : 'b') && !isGameOver
                      ? 'bg-[#629924]'
                      : 'bg-[#5c5955]'
                  }`}
                />
                <span className="font-bold text-[#dbd9d5] text-[11px] truncate">
                  {topPlayerLabel}
                </span>
              </div>
              {/* Captured Pieces + Material Advantage */}
              <div className="flex items-center gap-1 min-h-[16px] mt-0.5 text-[11px] text-[#9e9b95] truncate">
                <span className="tracking-tighter">
                  {(boardFlipped
                    ? materialStats.capturedByWhite
                    : materialStats.capturedByBlack
                  )
                    .map((pt) => PIECE_UNICODE.w[pt])
                    .join('')}
                </span>
                {((boardFlipped && materialStats.diff > 0) ||
                  (!boardFlipped && materialStats.diff < 0)) && (
                  <span className="px-1 rounded bg-[#36332e] text-[#dbd9d5] text-[9.5px] font-bold">
                    +{Math.abs(materialStats.diff)}
                  </span>
                )}
              </div>
            </div>

            {clockEnabled && (
              <div
                className={`px-2.5 py-1 rounded font-mono text-sm font-bold tabular-nums border shrink-0 ${
                  turn === (boardFlipped ? 'w' : 'b') && !isGameOver
                    ? 'bg-[#384722] border-[#629924] text-white'
                    : 'bg-[#161512] border-[#36332e] text-[#8c8984]'
                }`}
                title="Proper Time τ (dilated inside the central Ergosphere)"
              >
                {formatClock(boardFlipped ? whiteProperSec : blackProperSec)}
              </div>
            )}
          </div>

          {/* 2. Match Status Banner */}
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#2b2926] border-b border-[#36332e] text-[10.5px]">
            <div className="flex items-center gap-1.5 truncate font-semibold text-[#e6e4e1]">
              {checkedKingSquare && (
                <ShieldAlert className="w-3.5 h-3.5 text-[#e04f4f] shrink-0" />
              )}
              <span className={checkedKingSquare ? 'text-[#ff7b7b]' : 'text-[#dbd9d5]'}>
                {statusMessage}
              </span>
            </div>
            <span className="text-[9.5px] text-[#9e9b95] shrink-0 tabular-nums">
              {engineTelemetry.nodes > 0
                ? `d=${engineTelemetry.depth} · ${engineTelemetry.nodes}n`
                : SCENARIO_PRESETS[scenarioId].subtitle}
            </span>
          </div>

          {/* 3. Lichess 2-Column Algebraic Move List */}
          <div className="flex-1 min-h-[165px] max-h-[210px] overflow-y-auto bg-[#1b1a17] custom-scrollbar">
            {pairedMoves.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 text-[#8c8984] space-y-1">
                <div className="text-[11px] font-semibold text-[#bababa]">
                  {SCENARIO_PRESETS[scenarioId].subtitle}
                </div>
                <div className="text-[10px]">
                  Click a White piece to make the opening move.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#262421]">
                {pairedMoves.map((row, idx) => (
                  <div
                    key={row.moveNum}
                    className={`grid grid-cols-12 items-center text-[11px] ${
                      idx % 2 === 0 ? 'bg-[#1b1a17]' : 'bg-[#21201d]'
                    }`}
                  >
                    <span className="col-span-2 py-1 px-2 text-[#6e6b65] bg-[#161512]/60 text-right select-none">
                      {row.moveNum}.
                    </span>
                    <span className="col-span-5 py-1 px-2.5 font-semibold text-[#e6e4e1] truncate">
                      {row.white}
                    </span>
                    <span className="col-span-5 py-1 px-2.5 font-semibold text-[#bababa] truncate">
                      {row.black || ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Lichess Action Bar (Flip, Takeback, Hint, New Game, PGN) */}
          <div className="grid grid-cols-5 border-t border-b border-[#36332e] bg-[#262421] divide-x divide-[#36332e]">
            <button
              type="button"
              onClick={() => {
                onHapticLight?.();
                setBoardFlipped((prev) => !prev);
              }}
              className="flex items-center justify-center gap-1 py-2 text-[#bababa] hover:text-white hover:bg-[#302e2c] transition-colors cursor-pointer text-[10px]"
              title="Flip Board"
            >
              <FlipVertical2 className="w-3.5 h-3.5" />
              <span>Flip</span>
            </button>

            <button
              type="button"
              disabled={history.length === 0}
              onClick={handleUndoMove}
              className={`flex items-center justify-center gap-1 py-2 transition-colors text-[10px] ${
                history.length > 0
                  ? 'text-[#bababa] hover:text-white hover:bg-[#302e2c] cursor-pointer'
                  : 'text-[#555] cursor-not-allowed'
              }`}
              title="Takeback / Undo Move"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={handleRequestHint}
              className="flex items-center justify-center gap-1 py-2 text-[#bababa] hover:text-white hover:bg-[#302e2c] transition-colors cursor-pointer text-[10px]"
              title="Engine Move Hint"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#3692e7]" />
              <span>Hint</span>
            </button>

            <button
              type="button"
              data-testid="chess-reset-btn"
              onClick={handleResetGame}
              className="flex items-center justify-center gap-1 py-2 text-[#bababa] hover:text-white hover:bg-[#302e2c] transition-colors cursor-pointer text-[10px] font-semibold"
              title="New Game / Reset Position"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#629924]" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              disabled={moveLog.length === 0}
              onClick={handleCopyMoveLog}
              className={`flex items-center justify-center gap-1 py-2 transition-colors text-[10px] ${
                moveLog.length > 0
                  ? 'text-[#bababa] hover:text-white hover:bg-[#302e2c] cursor-pointer'
                  : 'text-[#555] cursor-not-allowed'
              }`}
              title="Copy PGN"
            >
              {copiedPgn ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#629924]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>PGN</span>
                </>
              )}
            </button>
          </div>

          {/* 5. Promotion Piece & Relativistic Options Strip */}
          <div className="flex items-center justify-between gap-1.5 px-3 py-1.5 bg-[#21201d] border-b border-[#36332e] text-[10px]">
            <div className="flex items-center gap-1">
              <span className="text-[#8c8984]">Promote:</span>
              {(['q', 'r', 'b', 'n'] as PieceType[]).map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => {
                    onHapticLight?.();
                    setPromotionChoice(pt);
                  }}
                  className={`px-1.5 py-0.5 rounded border uppercase font-bold cursor-pointer transition-colors ${
                    promotionChoice === pt
                      ? 'bg-[#3692e7] border-[#3692e7] text-white'
                      : 'bg-[#161512] border-[#36332e] text-[#9e9b95] hover:text-white'
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onHapticLight?.();
                  setErgosphereMode((prev) => !prev);
                }}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9.5px] cursor-pointer ${
                  ergosphereMode
                    ? 'bg-[#2a3822] border-[#629924] text-[#b8e086]'
                    : 'bg-[#161512] border-[#36332e] text-[#8c8984]'
                }`}
                title="Toggle Ergosphere Center Bonus & Gravitational Clock Dilation"
              >
                <Orbit className="w-2.5 h-2.5" />
                <span>Ergo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onHapticLight?.();
                  setClockEnabled((prev) => !prev);
                }}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9.5px] cursor-pointer ${
                  clockEnabled
                    ? 'bg-[#1e2c3a] border-[#3692e7] text-[#9cd0ff]'
                    : 'bg-[#161512] border-[#36332e] text-[#8c8984]'
                }`}
                title="Toggle Match Clock"
              >
                <Clock className="w-2.5 h-2.5" />
                <span>Clock</span>
              </button>
            </div>
          </div>

          {/* 6. Bottom Player Header + Lichess Digital Clock */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#1f1e1b]">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    turn === (boardFlipped ? 'b' : 'w') && !isGameOver
                      ? 'bg-[#629924]'
                      : 'bg-[#5c5955]'
                  }`}
                />
                <span className="font-bold text-[#dbd9d5] text-[11px] truncate">
                  {bottomPlayerLabel}
                </span>
              </div>
              {/* Captured Pieces + Material Advantage */}
              <div className="flex items-center gap-1 min-h-[16px] mt-0.5 text-[11px] text-[#9e9b95] truncate">
                <span className="tracking-tighter">
                  {(boardFlipped
                    ? materialStats.capturedByBlack
                    : materialStats.capturedByWhite
                  )
                    .map((pt) => PIECE_UNICODE.w[pt])
                    .join('')}
                </span>
                {((!boardFlipped && materialStats.diff > 0) ||
                  (boardFlipped && materialStats.diff < 0)) && (
                  <span className="px-1 rounded bg-[#36332e] text-[#dbd9d5] text-[9.5px] font-bold">
                    +{Math.abs(materialStats.diff)}
                  </span>
                )}
              </div>
            </div>

            {clockEnabled && (
              <div
                className={`px-2.5 py-1 rounded font-mono text-sm font-bold tabular-nums border shrink-0 ${
                  turn === (boardFlipped ? 'b' : 'w') && !isGameOver
                    ? 'bg-[#384722] border-[#629924] text-white'
                    : 'bg-[#161512] border-[#36332e] text-[#8c8984]'
                }`}
                title="Proper Time τ (dilated inside the central Ergosphere)"
              >
                {formatClock(boardFlipped ? blackProperSec : whiteProperSec)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
