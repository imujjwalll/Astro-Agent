import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  twinkle: boolean;
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.6 + 0.2,
    duration: Math.random() * 4 + 2,
    delay: Math.random() * 5,
    twinkle: Math.random() > 0.5,
  }));
}

const STARS = generateStars(200);

export function StarBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const starData = STARS.map((s) => ({
      ...s,
      px: (s.x / 100) * canvas.width,
      py: (s.y / 100) * canvas.height,
    }));

    function draw(timestamp: number) {
      if (!canvas || !ctx) return;
      const delta = timestamp - timeRef.current;
      timeRef.current = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      starData.forEach((star) => {
        const t = (timestamp / 1000 + star.delay) / star.duration;
        const twinkleFactor = star.twinkle
          ? 0.5 + 0.5 * Math.sin(t * Math.PI * 2)
          : 1;

        const alpha = star.opacity * twinkleFactor;
        const size = star.size * (0.9 + 0.1 * twinkleFactor);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = size * 3;
        ctx.shadowColor = "rgba(180, 180, 255, 0.8)";
        ctx.beginPath();
        ctx.arc(
          (star.x / 100) * canvas.width,
          (star.y / 100) * canvas.height,
          size / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <>
      {/* Radial nebula gradients */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(91, 88, 250, 0.15) 0%, transparent 60%), " +
            "radial-gradient(ellipse 60% 40% at 80% 60%, rgba(217, 70, 239, 0.08) 0%, transparent 50%), " +
            "radial-gradient(ellipse 50% 30% at 20% 80%, rgba(91, 88, 250, 0.06) 0%, transparent 40%), " +
            "linear-gradient(180deg, #0a0a1a 0%, #0d0d24 50%, #0a0a1a 100%)",
          zIndex: 0,
        }}
      />
      {/* Star canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />
    </>
  );
}
