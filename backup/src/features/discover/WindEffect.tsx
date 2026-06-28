import { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  wobble: number;
  wobbleSpeed: number;
  length: number;
}

const WindEffect = () => {
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

    const createParticle = (): Particle => {
      const isLeaf = Math.random() < 0.3;
      return {
        x: W() + Math.random() * 60,
        y: Math.random() * H() * 0.8 - H() * 0.2,
        size: isLeaf ? 2 + Math.random() * 3 : 1 + Math.random() * 2,
        speedX: -(2 + Math.random() * 3),
        speedY: 0.5 + Math.random() * 1.5,
        opacity: 0.05 + Math.random() * 0.12,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.03 + Math.random() * 0.05,
        length: isLeaf ? 0 : 10 + Math.random() * 20,
      };
    };

    for (let i = 0; i < 50; i++) {
      const p = createParticle();
      p.x = Math.random() * W();
      p.y = Math.random() * H();
      particles.push(p);
    }

    const animate = () => {
      ctx.clearRect(0, 0, W(), H());
      time += 0.016;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.speedX;
        p.y += p.speedY + Math.sin(time * 2 + p.wobble) * 0.3;
        p.wobble += p.wobbleSpeed;

        const wobbleY = Math.sin(p.wobble) * 2;

        if (p.length > 0) {
          // 风痕（细线）
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + wobbleY);
          ctx.lineTo(p.x - p.length, p.y + wobbleY + p.length * 0.1);
          ctx.strokeStyle = `rgba(200, 230, 210, ${p.opacity})`;
          ctx.lineWidth = p.size * 0.4;
          ctx.lineCap = 'round';
          ctx.stroke();
        } else {
          // 小叶片/光点
          ctx.beginPath();
          ctx.ellipse(p.x, p.y + wobbleY, p.size, p.size * 0.5, p.wobble, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 220, 190, ${p.opacity * 1.5})`;
          ctx.fill();
        }

        // 超出左侧 → 从右侧重生
        if (p.x < -30 || p.y > H() + 20) {
          particles[i] = createParticle();
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

export default WindEffect;
