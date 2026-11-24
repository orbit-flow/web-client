import { useEffect, useRef, useState } from 'react';
import { subscribeLevelUp } from '../../utils/levelUp';

const DURATION_MS = 2200;
const BURSTS = 4;
const PARTICLES_PER_BURST = 80;
const GRAVITY = 0.06;
const DRAG = 0.985;

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// 한 발: 화면 위쪽 절반 어딘가에서 사방으로 퍼지는 무지개 파티클
function makeBurst(width, height, delay) {
  const x = width * (0.2 + Math.random() * 0.6);
  const y = height * (0.2 + Math.random() * 0.3);
  return Array.from({ length: PARTICLES_PER_BURST }, (_, i) => {
    const angle = (Math.PI * 2 * i) / PARTICLES_PER_BURST + Math.random() * 0.2;
    const speed = 2.5 + Math.random() * 4;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      // 한 발 안에서 색상환을 한 바퀴 돌아 무지개가 되게
      hue: (360 * i) / PARTICLES_PER_BURST,
      size: 2 + Math.random() * 2.5,
      delay,
    };
  });
}

// 폭죽 캔버스(클릭은 통과) + 가운데 "레벨 업! Lv.N". 2초쯤 뒤 사라진다. 동작 줄이기를 켰으면 문구만
export function LevelUpCelebration() {
  const [level, setLevel] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => subscribeLevelUp((next, reward) => setLevel({ value: next, reward, key: Date.now() })), []);

  useEffect(() => {
    if (!level) return undefined;
    const hide = setTimeout(() => setLevel(null), DURATION_MS);
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return () => clearTimeout(hide);

    const ratio = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext('2d');
    context.scale(ratio, ratio);

    const particles = Array.from({ length: BURSTS }, (_, i) => makeBurst(width, height, i * 280)).flat();
    const start = performance.now();
    let frame;

    const draw = (now) => {
      const elapsed = now - start;
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        const age = elapsed - particle.delay;
        if (age < 0) continue;
        particle.vx *= DRAG;
        particle.vy = particle.vy * DRAG + GRAVITY;
        particle.x += particle.vx;
        particle.y += particle.vy;
        const alpha = Math.max(0, 1 - age / (DURATION_MS - particle.delay));
        context.fillStyle = `hsla(${particle.hue}, 90%, 60%, ${alpha})`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      if (elapsed < DURATION_MS) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      clearTimeout(hide);
      cancelAnimationFrame(frame);
    };
  }, [level]);

  if (!level) return null;

  return (
    <div className="level-up" role="status" aria-live="polite">
      <canvas ref={canvasRef} className="level-up__canvas" aria-hidden="true" />
      <div key={level.key} className="level-up__message">
        <p className="level-up__text">
          레벨 업! <span className="num">Lv.{level.value}</span>
        </p>
        {level.reward > 0 && <p className="level-up__reward num">+{level.reward}P</p>}
      </div>
    </div>
  );
}
