import { useRef, useEffect } from 'react';

const WaveEffect = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;
    let ripples: { x: number; y: number; age: number; maxAge: number }[] = [];
    let lastSpawn = 0;

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
    const diag = () => Math.sqrt(W() * W() + H() * H());
    const dx = () => -W() / diag();
    const dy = () => H() / diag();

    const spawn = () => {
      ripples.push({
        x: W() * 0.95,
        y: H() * 0.05,
        age: 0,
        maxAge: 2.5 + Math.random(),
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, W(), H());
      time += 0.016;

      if (time - lastSpawn > 0.8) {
        spawn();
        lastSpawn = time;
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.age += 0.016;

        const t = r.age / r.maxAge;
        if (t >= 1) { ripples.splice(i, 1); continue; }

        // 沿对角线移动
        r.x += dx() * 2;
        r.y += dy() * 2;

        const radius = 20 + t * 80;
        const opacity = (1 - t) * 0.25;

        // 画 3 圈水波纹
        for (let ring = 0; ring < 3; ring++) {
          const rr = radius * (0.5 + ring * 0.3);
          const oo = opacity * (1 - ring * 0.25);
          if (oo <= 0 || rr <= 0) continue;

          ctx.beginPath();
          ctx.ellipse(r.x, r.y, rr, rr * 0.45, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(140, 220, 255, ${oo})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      if (ripples.length > 12) ripples.splice(0, ripples.length - 12);

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
      className="absolute inset-0 w-full h-full pointer-events-none z-[2]"
    />
  );
};

export default WaveEffect;
