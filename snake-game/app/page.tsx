'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const COLS = 20;
const ROWS = 16;
const TARGET = 15;
const TICK_MS = 72;

type Point = { x: number; y: number };

function buildSafeCycle(): Point[] {
  const cycle: Point[] = [];
  for (let x = 0; x < COLS; x += 1) cycle.push({ x, y: 0 });
  for (let x = COLS - 1; x >= 1; x -= 1) {
    if ((COLS - 1 - x) % 2 === 0) {
      for (let y = 1; y < ROWS; y += 1) cycle.push({ x, y });
    } else {
      for (let y = ROWS - 1; y >= 1; y -= 1) cycle.push({ x, y });
    }
  }
  for (let y = ROWS - 1; y >= 1; y -= 1) cycle.push({ x: 0, y });
  return cycle;
}

const SAFE_CYCLE = buildSafeCycle();

function placeFood(head: number, snake: number[], seed: number) {
  const occupied = new Set(snake);
  const preferredDistance = 4 + (seed * 7 + 3) % 8;
  for (let offset = preferredDistance; offset < SAFE_CYCLE.length; offset += 1) {
    const candidate = (head + offset) % SAFE_CYCLE.length;
    if (!occupied.has(candidate)) return candidate;
  }
  return (head + 1) % SAFE_CYCLE.length;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runRef = useRef(0);
  const [eaten, setEaten] = useState(0);
  const [status, setStatus] = useState<'running' | 'complete'>('running');
  const [runKey, setRunKey] = useState(0);

  const draw = useCallback((snake: number[], food: number | null, eatenCount: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(320, rect.width);
    const height = width * (ROWS / COLS);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const cell = width / COLS;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0b1713';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x += 1) {
      ctx.beginPath(); ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, height); ctx.stroke();
    }
    for (let y = 1; y < ROWS; y += 1) {
      ctx.beginPath(); ctx.moveTo(0, y * cell); ctx.lineTo(width, y * cell); ctx.stroke();
    }

    if (food !== null) {
      const point = SAFE_CYCLE[food];
      const cx = (point.x + 0.5) * cell;
      const cy = (point.y + 0.5) * cell;
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.28, 0, Math.PI * 2);
      ctx.shadowColor = '#ff6b51';
      ctx.shadowBlur = cell * 0.7;
      ctx.fillStyle = '#ff624a';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffe8de';
      ctx.beginPath();
      ctx.arc(cx - cell * 0.08, cy - cell * 0.09, cell * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }

    [...snake].reverse().forEach((cycleIndex, reverseIndex) => {
      const point = SAFE_CYCLE[cycleIndex];
      const originalIndex = snake.length - 1 - reverseIndex;
      const isHead = originalIndex === 0;
      const inset = isHead ? cell * 0.1 : cell * 0.14;
      const fade = 0.55 + (1 - originalIndex / Math.max(1, snake.length)) * 0.45;
      ctx.fillStyle = isHead ? '#d9ff5d' : `rgba(83, 222, 125, ${fade})`;
      ctx.beginPath();
      ctx.roundRect(point.x * cell + inset, point.y * cell + inset, cell - inset * 2, cell - inset * 2, cell * 0.24);
      ctx.fill();

      if (isHead) {
        const next = SAFE_CYCLE[(cycleIndex + 1) % SAFE_CYCLE.length];
        const horizontal = next.x !== point.x;
        const sign = horizontal ? Math.sign(next.x - point.x) : Math.sign(next.y - point.y);
        const eyeX = (point.x + 0.5) * cell + (horizontal ? sign * cell * 0.16 : 0);
        const eyeY = (point.y + 0.5) * cell + (!horizontal ? sign * cell * 0.16 : 0);
        ctx.fillStyle = '#092217';
        [-1, 1].forEach((side) => {
          ctx.beginPath();
          ctx.arc(eyeX + (!horizontal ? side * cell * 0.1 : 0), eyeY + (horizontal ? side * cell * 0.1 : 0), cell * 0.045, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });
    canvas.dataset.eaten = String(eatenCount);
  }, []);

  useEffect(() => {
    const thisRun = runRef.current + 1;
    runRef.current = thisRun;
    let head = 18;
    let snake = [head, head - 1, head - 2];
    let food = placeFood(head, snake, runKey + 1);
    let count = 0;
    setEaten(0);
    setStatus('running');
    draw(snake, food, count);

    const step = () => {
      if (runRef.current !== thisRun) return;
      head = (head + 1) % SAFE_CYCLE.length;
      snake.unshift(head);
      if (head === food) {
        count += 1;
        setEaten(count);
        if (count >= TARGET) {
          draw(snake, null, count);
          setStatus('complete');
          return;
        }
        food = placeFood(head, snake, count + runKey * TARGET);
      } else {
        snake.pop();
      }
      draw(snake, food, count);
      timerRef.current = setTimeout(step, TICK_MS);
    };

    timerRef.current = setTimeout(step, 450);
    return () => {
      runRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draw, runKey]);

  return (
    <main className="game-shell">
      <section className="game-card" aria-labelledby="game-title">
        <header className="game-header">
          <div>
            <p className="eyebrow">AUTOPILOT / SAFE LOOP</p>
            <h1 id="game-title">自动贪吃蛇</h1>
          </div>
          <div className={`status-pill ${status}`} aria-live="polite">
            <span className="status-dot" />
            {status === 'complete' ? '挑战完成' : '自动驾驶中'}
          </div>
        </header>

        <div className="score-row">
          <div className="score-block">
            <span>已吃食物</span><strong>{String(eaten).padStart(2, '0')}</strong><small>/ {TARGET}</small>
          </div>
          <div className="progress-track" aria-label={`已完成 ${eaten} / ${TARGET}`}>
            <span style={{ width: `${(eaten / TARGET) * 100}%` }} />
          </div>
          <div className="safety-copy"><span>零碰撞路线</span><strong>安全闭环</strong></div>
        </div>

        <div className="board-frame">
          <canvas ref={canvasRef} className="game-board" aria-label={`自动贪吃蛇棋盘，已连续吃到 ${eaten} 个食物`} />
          <div className="scanline" aria-hidden="true" />
          {status === 'complete' && (
            <div className="win-overlay" role="status">
              <div className="win-mark">15</div>
              <p>连续进食完成</p>
              <button type="button" onClick={() => setRunKey((value) => value + 1)}>再跑一轮</button>
            </div>
          )}
        </div>

        <footer className="game-footer">
          <div><i className="legend snake" />蛇身</div>
          <div><i className="legend food" />食物</div>
          <p>无需操作 · 自动避墙 · 自动避开身体</p>
        </footer>
      </section>
    </main>
  );
}
