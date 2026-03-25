(function () {
  if (window.matchMedia('(max-width: 768px)').matches) return;
  const EDGES = ['top', 'bottom', 'left', 'right'];
  const DIV_COUNT = 16;
  const STRENGTH = 0.18;
  const SIZE = '220px';
  const increment = 100 / DIV_COUNT;

  const directions = { top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right' };

  EDGES.forEach(edge => {
    const isVertical = edge === 'top' || edge === 'bottom';
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '3',
      [edge]: '0',
      ...(isVertical
        ? { left: '0', right: '0', height: SIZE }
        : { top: '0', bottom: '0', width: SIZE })
    });

    for (let i = 1; i <= DIV_COUNT; i++) {
      const progress = i / DIV_COUNT;
      const blur = (0.0625 * (progress * DIV_COUNT + 1) * STRENGTH).toFixed(3);

      const p1 = Math.round((increment * (i - 1)) * 10) / 10;
      const p2 = Math.round((increment * i) * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let grad = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) grad += `, black ${p3}%`;
      if (p4 <= 100) grad += `, transparent ${p4}%`;

      const mask = `linear-gradient(${directions[edge]}, ${grad})`;
      const div = document.createElement('div');
      Object.assign(div.style, {
        position: 'absolute',
        inset: '0',
        backdropFilter: `blur(${blur}rem)`,
        WebkitBackdropFilter: `blur(${blur}rem)`,
        maskImage: mask,
        WebkitMaskImage: mask,
      });
      wrapper.appendChild(div);
    }

    document.body.appendChild(wrapper);
  });
})();
