import React, { useEffect, useRef } from 'react';

export default function NeuralBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Generate neural nodes in amber, bronze, honey, and warm beige
    const nodeCount = Math.floor((width * height) / 22000);
    const nodes = [];
    const colorPalette = ['#f59e0b', '#fbbf24', '#d97706', '#cbab83', '#b45309', '#eddabb'];

    for (let i = 0; i < Math.max(35, Math.min(nodeCount, 65)); i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 2 + 1.2,
        color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
        pulse: Math.random() * Math.PI,
      });
    }

    // Synaptic pulses traveling along connections
    const pulses = [];
    const maxPulses = 14;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle warm bronze & amber ambient glow gradients in background
      const grad1 = ctx.createRadialGradient(width * 0.25, height * 0.25, 10, width * 0.25, height * 0.25, 480);
      grad1.addColorStop(0, 'rgba(217, 119, 6, 0.07)');
      grad1.addColorStop(1, 'rgba(12, 7, 4, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(width * 0.8, height * 0.75, 10, width * 0.8, height * 0.75, 520);
      grad2.addColorStop(0, 'rgba(180, 83, 9, 0.06)');
      grad2.addColorStop(1, 'rgba(12, 7, 4, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Update & render neural nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.x += node.vx;
        node.y += node.vy;
        node.pulse += 0.02;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        const currentRadius = node.radius + Math.sin(node.pulse) * 0.6;

        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(0.5, currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw connections to nearby nodes in warm golden bronze
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 155) {
            const alpha = (1 - dist / 155) * 0.18;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(217, 119, 6, ${alpha})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();

            // Randomly spawn synaptic firing pulses along axon
            if (Math.random() < 0.0009 && pulses.length < maxPulses) {
              pulses.push({
                x1: node.x,
                y1: node.y,
                x2: other.x,
                y2: other.y,
                progress: 0,
                speed: 0.015 + Math.random() * 0.02,
                color: Math.random() > 0.5 ? '#fcd34d' : '#f59e0b',
              });
            }
          }
        }
      }

      // Render traveling action potential sparks (synaptic firing in warm gold/amber)
      for (let p = pulses.length - 1; p >= 0; p--) {
        const pulse = pulses[p];
        pulse.progress += pulse.speed;

        if (pulse.progress >= 1) {
          pulses.splice(p, 1);
          continue;
        }

        const px = pulse.x1 + (pulse.x2 - pulse.x1) * pulse.progress;
        const py = pulse.y1 + (pulse.y2 - pulse.y1) * pulse.progress;

        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = pulse.color;
        ctx.shadowColor = pulse.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-80"
    />
  );
}
