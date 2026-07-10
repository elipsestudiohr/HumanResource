import { useEffect, useRef } from 'react';

export default function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'];
    
    interface Particle {
      x: number;
      y: number;
      rotation: number;
      rotationSpeed: number;
      color: string;
      speedX: number;
      speedY: number;
      size: number;
      gravity: number;
    }

    const particles: Particle[] = [];
    
    const spawnParticles = () => {
      for (let i = 0; i < 150; i++) {
        // Left launcher
        particles.push({
          x: 0,
          y: height,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          speedX: Math.random() * 15 + 10,
          speedY: -(Math.random() * 20 + 15),
          size: Math.random() * 8 + 6,
          gravity: 0.4
        });
        // Right launcher
        particles.push({
          x: width,
          y: height,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          speedX: -(Math.random() * 15 + 10),
          speedY: -(Math.random() * 20 + 15),
          size: Math.random() * 8 + 6,
          gravity: 0.4
        });
      }
    };

    spawnParticles();

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += p.gravity;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        if (p.y > height + 20 || p.x < -20 || p.x > width + 20) {
          particles.splice(i, 1);
        }
      }

      if (particles.length > 0) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 99999
      }}
    />
  );
}
