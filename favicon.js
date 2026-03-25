(function () {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Dark background
  const r0 = size * 0.35;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r0);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Random p, q
  const P_MIN = 2, P_MAX = 5, Q_MAX = 9;
  const p = P_MIN + Math.floor(Math.random() * (P_MAX - P_MIN + 1));
  const q = (p + 1) + Math.floor(Math.random() * (Q_MAX - p));

  // Random base hue, complementary spread
  const baseHue = Math.random() * 360;

  const R = 0.55, r = 0.18;
  const cx = size / 2, cy = size / 2;
  const scale = size * 0.44;
  const steps = 400;

  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    pts.push({
      x: cx + (R + r * Math.cos(q * t)) * Math.cos(p * t) * scale,
      y: cy + (R + r * Math.cos(q * t)) * Math.sin(p * t) * scale,
      z: r * Math.sin(q * t),
    });
  }

  // Draw back-to-front for correct depth ordering
  const order = pts.slice(0, steps).map((pt, i) => ({ i, z: pt.z }));
  order.sort((a, b) => a.z - b.z);

  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (const { i } of order) {
    const progress = i / steps;
    const depth = (pts[i].z + r) / (2 * r); // 0..1
    const hue = (baseHue + progress * 200) % 360;
    const sat = 80 + depth * 20;
    const light = 40 + depth * 45;
    ctx.strokeStyle = `hsl(${hue},${sat}%,${light}%)`;
    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
    ctx.stroke();
  }

  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = canvas.toDataURL();
  document.head.appendChild(link);
})();
