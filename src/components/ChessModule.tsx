import React, { useState, useCallback, useMemo } from 'react';
import { RotateCcw, Crown, Cpu, Users, Sparkles } from 'lucide-react';
import { UiThemeId } from '../scene/BlackHoleScene';

type PieceColor = 'w' | 'b';
type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

type BoardState = (ChessPiece | null)[][];

const INITIAL_BOARD: BoardState = [
  [
    { type: 'r', color: 'b' },
    { type: 'n', color: 'b' },
    { type: 'b', color: 'b' },
    { type: 'q', color: 'b' },
    { type: 'k', color: 'b' },
    { type: 'b', color: 'b' },
    { type: 'n', color: 'b' },
    { type: 'r', color: 'b' },
  ],
  Array(8)
    .fill(null)
    .map(() => ({ type: 'p' as PieceType, color: 'b' as PieceColor })),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8)
    .fill(null)
    .map(() => ({ type: 'p' as PieceType, color: 'w' as PieceColor })),
  [
    { type: 'r', color: 'w' },
    { type: 'n', color: 'w' },
    { type: 'b', color: 'w' },
    { type: 'q', color: 'w' },
    { type: 'k', color: 'w' },
    { type: 'b', color: 'w' },
    { type: 'n', color: 'w' },
    { type: 'r', color: 'w' },
  ],
];

const PIECE_UNICODE: Record<PieceColor, Record<PieceType, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

const PIECE_VALUES: Record<PieceType, number> = {
  p: 10,
  n: 30,
  b: 32,
  r: 50,
  q: 90,
  k: 900,
};

function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getPseudoMoves(board: BoardState, r: number, c: number): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: [number, number][] = [];
  const { type, color } = piece;

  const addSlide = (dr: number, dc: number) => {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const target = board[nr][nc];
      if (!target) {
        moves.push([nr, nc]);
      } else {
        if (target.color !== color) moves.push([nr, nc]);
        break;
      }
      nr += dr;
      nc += dc;
    }
  };

  if (type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      moves.push([r + dir, c]);
      if (r === startRow && inBounds(r + dir * 2, c) && !board[r + dir * 2][c]) {
        moves.push([r + dir * 2, c]);
      }
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc]!.color !== color) {
        moves.push([nr, nc]);
      }
    }
  } else if (type === 'n') {
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
        moves.push([nr, nc]);
      }
    }
  } else if (type === 'b') {
    addSlide(-1, -1);
    addSlide(-1, 1);
    addSlide(1, -1);
    addSlide(1, 1);
  } else if (type === 'r') {
    addSlide(-1, 0);
    addSlide(1, 0);
    addSlide(0, -1);
    addSlide(0, 1);
  } else if (type === 'q') {
    addSlide(-1, -1);
    addSlide(-1, 1);
    addSlide(1, -1);
    addSlide(1, 1);
    addSlide(-1, 0);
    addSlide(1, 0);
    addSlide(0, -1);
    addSlide(0, 1);
  } else if (type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc]!.color !== color)) {
          moves.push([nr, nc]);
        }
      }
    }
  }

  return moves;
}

function isKingInCheck(board: BoardState, kingColor: PieceColor): boolean {
  let kr = -1;
  let kc = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === kingColor && p.type === 'k') {
        kr = r;
        kc = c;
        break;
      }
    }
  }
  if (kr === -1) return true;
  const enemy: PieceColor = kingColor === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === enemy) {
        const moves = getPseudoMoves(board, r, c);
        if (moves.some(([mr, mc]) => mr === kr && mc === kc)) {
          return true;
        }
      }
    }
  }
  return false;
}

function applyMove(board: BoardState, fr: number, fc: number, tr: number, tc: number): BoardState {
  const next = cloneBoard(board);
  const moving = next[fr][fc];
  next[fr][fc] = null;
  if (moving) {
    // Auto-queen promotion
    if (moving.type === 'p' && (tr === 0 || tr === 7)) {
      next[tr][tc] = { type: 'q', color: moving.color };
    } else {
      next[tr][tc] = moving;
    }
  }
  return next;
}

function getLegalMoves(board: BoardState, r: number, c: number): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];
  return getPseudoMoves(board, r, c).filter(([tr, tc]) => {
    const simulated = applyMove(board, r, c, tr, tc);
    return !isKingInCheck(simulated, piece.color);
  });
}

function toCoordLabel(r: number, c: number): string {
  return `${String.fromCharCode(97 + c)}${8 - r}`;
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
  const [board, setBoard] = useState<BoardState>(() => cloneBoard(INITIAL_BOARD));
  const [turn, setTurn] = useState<PieceColor>('w');
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [vsEngine, setVsEngine] = useState<boolean>(true);
  const [moveLog, setMoveLog] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('White to move');

  const selectedLegalMoves = useMemo(() => {
    if (!selected) return [];
    return getLegalMoves(board, selected[0], selected[1]);
  }, [board, selected]);

  const evaluateGameEnd = useCallback((nextBoard: BoardState, nextTurn: PieceColor) => {
    let anyLegal = false;
    for (let r = 0; r < 8 && !anyLegal; r++) {
      for (let c = 0; c < 8 && !anyLegal; c++) {
        if (nextBoard[r][c]?.color === nextTurn && getLegalMoves(nextBoard, r, c).length > 0) {
          anyLegal = true;
        }
      }
    }
    const inCheck = isKingInCheck(nextBoard, nextTurn);
    if (!anyLegal) {
      if (inCheck) {
        setStatusMessage(
          `Checkmate! ${nextTurn === 'w' ? 'Black (Kerr Engine)' : 'White'} wins!`
        );
        onHapticSuccess?.();
      } else {
        setStatusMessage('Stalemate — Draw');
      }
      return true;
    }
    if (inCheck) {
      setStatusMessage(`${nextTurn === 'w' ? 'White' : 'Black'} is in CHECK!`);
    } else {
      setStatusMessage(`${nextTurn === 'w' ? 'White' : 'Black'} to move`);
    }
    return false;
  }, [onHapticSuccess]);

  const triggerEngineReply = useCallback(
    (currentBoard: BoardState) => {
      const allMoves: { fr: number; fc: number; tr: number; tc: number; score: number }[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (currentBoard[r][c]?.color === 'b') {
            const legals = getLegalMoves(currentBoard, r, c);
            for (const [tr, tc] of legals) {
              const captured = currentBoard[tr][tc];
              const captureScore = captured ? PIECE_VALUES[captured.type] : 0;
              const centerBonus = (3.5 - Math.abs(3.5 - tr)) + (3.5 - Math.abs(3.5 - tc));
              const nextB = applyMove(currentBoard, r, c, tr, tc);
              const checkBonus = isKingInCheck(nextB, 'w') ? 15 : 0;
              allMoves.push({
                fr: r,
                fc: c,
                tr,
                tc,
                score: captureScore + centerBonus * 0.8 + checkBonus + Math.random() * 2,
              });
            }
          }
        }
      }
      if (allMoves.length === 0) return;
      allMoves.sort((a, b) => b.score - a.score);
      const best = allMoves[0];
      const piece = currentBoard[best.fr][best.fc]!;
      const captured = currentBoard[best.tr][best.tc];
      const nextBoard = applyMove(currentBoard, best.fr, best.fc, best.tr, best.tc);
      const notation = `${PIECE_UNICODE.b[piece.type]} ${toCoordLabel(best.fr, best.fc)}${
        captured ? '×' : '→'
      }${toCoordLabel(best.tr, best.tc)}`;

      setBoard(nextBoard);
      setMoveLog((prev) => [...prev, notation]);
      setTurn('w');
      evaluateGameEnd(nextBoard, 'w');
    },
    [evaluateGameEnd]
  );

  const handleSquareClick = (r: number, c: number) => {
    if (vsEngine && turn === 'b') return;

    if (selected) {
      const [sr, sc] = selected;
      if (sr === r && sc === c) {
        setSelected(null);
        return;
      }
      const isLegal = selectedLegalMoves.some(([mr, mc]) => mr === r && mc === c);
      if (isLegal) {
        const piece = board[sr][sc]!;
        const captured = board[r][c];
        const nextBoard = applyMove(board, sr, sc, r, c);
        const notation = `${PIECE_UNICODE[piece.color][piece.type]} ${toCoordLabel(sr, sc)}${
          captured ? '×' : '→'
        }${toCoordLabel(r, c)}`;
        onHapticMedium?.();
        setBoard(nextBoard);
        setSelected(null);
        setMoveLog((prev) => [...prev, notation]);
        const nextTurn: PieceColor = turn === 'w' ? 'b' : 'w';
        setTurn(nextTurn);
        const ended = evaluateGameEnd(nextBoard, nextTurn);
        if (!ended && vsEngine && nextTurn === 'b') {
          window.setTimeout(() => {
            triggerEngineReply(nextBoard);
          }, 260);
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

  const handleResetGame = () => {
    onHapticMedium?.();
    setBoard(cloneBoard(INITIAL_BOARD));
    setTurn('w');
    setSelected(null);
    setMoveLog([]);
    setStatusMessage('White to move');
  };

  return (
    <div
      data-testid="settings-chess-tab-panel"
      className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-mono"
    >
      {/* Header Card */}
      <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-[#14100d] via-[#09090b] to-black p-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-amber-300 font-bold uppercase tracking-wider text-[11px]">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Kerr Relativistic Chess Sandbox</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[9px] text-amber-200">
              DEV SANDBOX
            </span>
          </div>
          <p className="text-[10.5px] text-neutral-400">
            {statusMessage}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              onHapticLight?.();
              setVsEngine((prev) => !prev);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-[10.5px] cursor-pointer"
          >
            {vsEngine ? <Cpu className="w-3.5 h-3.5 text-cyan-400" /> : <Users className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{vsEngine ? 'vs Kerr AI' : '2-Player Pass'}</span>
          </button>

          <button
            type="button"
            data-testid="chess-reset-btn"
            onClick={handleResetGame}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[10.5px] font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Game</span>
          </button>
        </div>
      </div>

      {/* Chess Board + Move History */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
        <div className="sm:col-span-8 flex justify-center">
          <div
            data-testid="chess-board-grid"
            className="grid grid-cols-8 border-2 border-neutral-700 rounded-xl overflow-hidden shadow-2xl w-full max-w-[320px] aspect-square"
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSel = selected?.[0] === r && selected?.[1] === c;
                const isLegalDest = selectedLegalMoves.some(([mr, mc]) => mr === r && mc === c);
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    data-testid={`chess-square-${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    className={`relative flex items-center justify-center text-xl sm:text-2xl select-none cursor-pointer transition-colors ${
                      isSel
                        ? 'bg-amber-500/45 ring-2 ring-inset ring-amber-300'
                        : isLegalDest
                        ? isDark
                          ? 'bg-emerald-900/60 hover:bg-emerald-800/70'
                          : 'bg-emerald-800/45 hover:bg-emerald-700/60'
                        : isDark
                        ? 'bg-[#12131a] hover:bg-[#191b24]'
                        : 'bg-[#232634] hover:bg-[#2c3040]'
                    }`}
                  >
                    {cell && (
                      <span
                        className={
                          cell.color === 'w'
                            ? 'text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]'
                            : 'text-cyan-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]'
                        }
                      >
                        {PIECE_UNICODE[cell.color][cell.type]}
                      </span>
                    )}
                    {isLegalDest && !cell && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/75 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Algebraic Move Log */}
        <div className="sm:col-span-4 rounded-xl bg-neutral-950 border border-neutral-800 p-3 space-y-2 h-full max-h-[320px] flex flex-col">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 text-[10.5px] font-bold text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Geodesic Move Log</span>
            </span>
            <span className="text-neutral-500">{moveLog.length} ply</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 text-[10.5px] text-neutral-300 pr-1">
            {moveLog.length === 0 ? (
              <div className="text-neutral-500 text-[10px] py-6 text-center">
                Select any White piece to initiate opening manoeuvre.
              </div>
            ) : (
              moveLog.map((mv, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2 py-1 rounded bg-neutral-900/80 border border-neutral-800/80"
                >
                  <span className="text-neutral-500">#{idx + 1}</span>
                  <span className="font-semibold text-amber-200">{mv}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
