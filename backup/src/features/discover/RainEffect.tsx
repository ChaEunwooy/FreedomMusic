import { useRef, useEffect } from 'react';

interface Drop {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
  windOffset: number;
  windSpeed: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
}

const RainEffect = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let drops: Drop[] = [];
    let ripples: Ripple[] = [];
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    const createDrop = (): Drop => ({
      x: Math.random() * W(),
      y: Math.random() * H() - H(),
      speed: 8 + Math.random() * 7,
      length: 15 + Math.random() * 15,
      opacity: 0.08 + Math.random() * 0.15,
      windOffset: Math.random() * Math.PI * 2,
      windSpeed: 0.5 + Math.random() * 1.5,
    });

    const createRipple = (x: number, y: number): Ripple => ({
      x, y,
      radius: 1,
      maxRadius: 8 + Math.random() * 12,
      opacity: 0.3,
    });

    for (let i = 0; i < 100; i++) {
      drops.push(createDrop());
    }

    const animate = () => {
      ctx.clearRect(0, 0, W(), H());
      time += 0.016;

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        const wind = Math.sin(time * d.windSpeed + d.windOffset) * 1.5;

        d.y += d.speed;
        d.x += wind;

        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - wind * 0.5, d.y - d.length);
        ctx.strokeStyle = `rgba(200, 220, 255, ${d.opacity})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        if (d.y > H()) {
          if (ripples.length < 20) {
            ripples.push(createRipple(d.x, H() - 2));
          }
          drops[i] = createDrop();
          drops[i].y = -Math.random() * 50;
        }
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 0.8;
        r.opacity -= 0.012;

        if (r.opacity <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(180, 210, 255, ${r.opacity})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
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

export default RainEffect;
