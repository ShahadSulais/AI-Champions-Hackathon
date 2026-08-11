// Service for visual particle celebration (confetti) and dynamic floating XP popups

export function triggerConfetti(options = {}) {
  try {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const count = options.count || 40;
    const particles = [];
    const colors = ['#9333ea', '#c026d3', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height * 0.4 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 10 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        opacity: 1,
        life: 0
      });
    }

    let animationFrame;
    const startTime = Date.now();

    function update() {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.vRot;
        p.opacity = Math.max(0, 1 - elapsed / 1800);

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (elapsed < 1800) {
        animationFrame = requestAnimationFrame(update);
      } else {
        cancelAnimationFrame(animationFrame);
        canvas.remove();
      }
    }

    update();
  } catch (err) {
    console.warn('Confetti effect warning:', err);
  }
}

export function triggerXpPopup(amountText, anchorElement) {
  try {
    const popup = document.createElement('div');
    popup.className = 'xp-float-popup';
    popup.textContent = amountText;

    let rect = { left: window.innerWidth / 2 - 40, top: window.innerHeight / 2 };
    if (anchorElement && anchorElement.getBoundingClientRect) {
      const r = anchorElement.getBoundingClientRect();
      rect = { left: r.left + r.width / 2 - 30, top: r.top - 20 };
    }

    popup.style.left = `${Math.max(10, rect.left)}px`;
    popup.style.top = `${Math.max(10, rect.top)}px`;

    document.body.appendChild(popup);

    setTimeout(() => {
      popup.remove();
    }, 1200);
  } catch (err) {
    console.warn('XP Popup warning:', err);
  }
}
