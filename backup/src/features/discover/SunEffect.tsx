import { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  phase: number;
  phaseSpeed: number;
  hue: number;
}

const SunEffect = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let particles: Particle[] = [];
    let time = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    const createParticle = (): Particle => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      size: 3 + Math.random() * 5,
      speedX: (Math.random() - 0.5) * 0.25,
      speedY: -0.2 - Math.random() * 0.4,
      opacity: 0.15 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.012 + Math.random() * 0.025,
      hue: 36 + Math.random() * 24,
    });

    for (let i = 0; i < 35; i++) {
      particles.push(createParticle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, W(), H());
      time += 0.016;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX + Math.sin(time + p.phase) * 0.05;
        p.y += p.speedY;
        p.phase += p.phaseSpeed;

        const twinkle = Math.sin(p.phase) * 0.3 + 0.7;
        const alpha = p.opacity * twinkle;

        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
        glow.addColorStop(0, `hsla(${p.hue}, 90%, 80%, ${alpha * 0.9})`);
        glow.addColorStop(0.25, `hsla(${p.hue}, 80%, 75%, ${alpha * 0.5})`);
        glow.addColorStop(0.6, `hsla(${p.hue}, 65%, 68%, ${alpha * 0.15})`);
        glow.addColorStop(1, `hsla(${p.hue}, 50%, 60%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 95%, ${alpha})`;
        ctx.fill();

        if (p.y < -20 || p.x < -20 || p.x > W() + 20) {
          particles[i] = createParticle();
          particles[i].y = H() + 10;
          particles[i].x = Math.random() * W();
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
    />
  );
};

export default SunEffect;
