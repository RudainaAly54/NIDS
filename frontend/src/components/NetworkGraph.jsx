import {useEffect, useRef} from "react";

const NetworkGraph = ({isActive, threatLevel}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const centerX = width / 2;
    const centerY = height / 2;

    class NetworkNode {
      constructor(angle, radius, speed) {
        this.angle = angle;
        this.radius = radius;
        this.speed = speed;
        this.size = Math.random() * 3 + 2;
        this.x = centerX + Math.cos(angle) * radius;
        this.y = centerY + Math.sin(angle) * radius;
      }

      update() {
        this.angle += this.speed;
        this.x = centerX + Math.cos(this.angle) * this.radius;
        this.y = centerY + Math.sin(this.angle) * this.radius;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        const color = threatLevel === 'attack' ? 'rgba(255, 50, 50, 0.8)' : 'rgba(0, 240, 255, 0.8)';
        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const orbitingNodes = [];

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 60 + Math.random() * 40;
      const speed = (Math.random() - 0.5) * 0.02;
      orbitingNodes.push(new NetworkNode(angle, radius, speed));
    }

    let pulsePhase = 0;

    function animate() {
      ctx.fillStyle = 'rgba(15, 20, 35, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      pulsePhase += 0.05;
      const pulseSize = 8 + Math.sin(pulsePhase) * 3;

      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseSize + 10, 0, Math.PI * 2);
      const centerColor = threatLevel === 'attack' ? 'rgba(255, 50, 50, 0.1)' : 'rgba(0, 240, 255, 0.1)';
      ctx.fillStyle = centerColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
      const coreColor = threatLevel === 'attack' ? 'rgba(255, 50, 50, 1)' : 'rgba(0, 240, 255, 1)';
      ctx.fillStyle = coreColor;
      ctx.shadowBlur = 20;
      ctx.shadowColor = coreColor;
      ctx.fill();
      ctx.shadowBlur = 0;

      orbitingNodes.forEach(node => {
        if (isActive) {
          node.update();
        }
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(node.x, node.y);
        const lineColor = threatLevel === 'attack' ? 'rgba(255, 50, 50, 0.3)' : 'rgba(0, 240, 255, 0.3)';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        node.draw();
      });

      requestAnimationFrame(animate);
    }

    animate();
  }, [isActive, threatLevel]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
    />
  );
}

export default NetworkGraph;