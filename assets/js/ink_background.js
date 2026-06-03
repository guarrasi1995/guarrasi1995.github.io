(function () {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  canvas.id = "ink-background";
  canvas.className = "ink-background-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);

  const palette = [
    { r: 187, g: 34, b: 28 },
    { r: 217, g: 54, b: 48 },
    { r: 23, g: 84, b: 209 },
    { r: 45, g: 111, b: 255 },
    { r: 116, g: 21, b: 19 }
  ];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let plumes = [];
  let pointer = null;
  let pointerFade = 0;
  let frame = 0;

  function rgba(color, alpha) {
    return "rgba(" + color.r + ", " + color.g + ", " + color.b + ", " + alpha + ")";
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function createPlumes() {
    const random = mulberry32(741513);
    const count = width < 720 ? 18 : 30;
    plumes = [];

    for (let i = 0; i < count; i += 1) {
      const color = palette[i % palette.length];
      const leftBias = i % 3 === 0;
      const x = leftBias
        ? width * (0.05 + random() * 0.42)
        : width * (0.36 + random() * 0.72);
      const y = height * (-0.08 + random() * 1.2);
      const size = Math.min(width, height) * (0.16 + random() * 0.28);

      plumes.push({
        x: x,
        y: y,
        rx: size * (0.86 + random() * 0.52),
        ry: size * (0.62 + random() * 0.78),
        angle: random() * Math.PI,
        color: color,
        alpha: 0.080 + random() * 0.075
      });
    }
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createPlumes();
    draw();
  }

  function drawPlume(plume, boost) {
    const alpha = plume.alpha + boost * 0.06;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "blur(9px)";
    ctx.translate(plume.x, plume.y);
    ctx.rotate(plume.angle);

    const gradient = ctx.createRadialGradient(0, 0, plume.rx * 0.08, 0, 0, plume.rx);
    gradient.addColorStop(0, rgba(plume.color, alpha));
    gradient.addColorStop(0.42, rgba(plume.color, alpha * 0.55));
    gradient.addColorStop(1, rgba(plume.color, 0));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, plume.rx, plume.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(12, Math.min(plume.rx, plume.ry) * 0.10);
    ctx.strokeStyle = rgba(plume.color, alpha * 0.46);
    ctx.beginPath();
    ctx.moveTo(-plume.rx * 0.46, -plume.ry * 0.06);
    ctx.bezierCurveTo(
      -plume.rx * 0.12,
      -plume.ry * 0.42,
      plume.rx * 0.16,
      plume.ry * 0.40,
      plume.rx * 0.50,
      plume.ry * 0.02
    );
    ctx.stroke();
    ctx.restore();
  }

  function drawPointerBloom() {
    if (!pointer || pointerFade <= 0.002) return;

    const radius = Math.min(width, height) * 0.12;
    const red = palette[1];
    const blue = palette[3];

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "blur(8px)";

    const redGradient = ctx.createRadialGradient(pointer.x - radius * 0.14, pointer.y, radius * 0.04, pointer.x, pointer.y, radius);
    redGradient.addColorStop(0, rgba(red, 0.17 * pointerFade));
    redGradient.addColorStop(0.55, rgba(red, 0.070 * pointerFade));
    redGradient.addColorStop(1, rgba(red, 0));
    ctx.fillStyle = redGradient;
    ctx.beginPath();
    ctx.ellipse(pointer.x - radius * 0.10, pointer.y, radius * 1.08, radius * 0.70, -0.18, 0, Math.PI * 2);
    ctx.fill();

    const blueGradient = ctx.createRadialGradient(pointer.x + radius * 0.12, pointer.y + radius * 0.08, radius * 0.04, pointer.x, pointer.y, radius * 1.06);
    blueGradient.addColorStop(0, rgba(blue, 0.16 * pointerFade));
    blueGradient.addColorStop(0.50, rgba(blue, 0.066 * pointerFade));
    blueGradient.addColorStop(1, rgba(blue, 0));
    ctx.fillStyle = blueGradient;
    ctx.beginPath();
    ctx.ellipse(pointer.x + radius * 0.10, pointer.y + radius * 0.08, radius * 0.96, radius * 0.76, 0.34, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < plumes.length; i += 1) {
      const plume = plumes[i];
      const distance = pointer
        ? Math.hypot(pointer.x - plume.x, pointer.y - plume.y)
        : Infinity;
      const boost = Math.max(0, 1 - distance / 360) * pointerFade;
      drawPlume(plume, boost);
    }

    drawPointerBloom();
  }

  function animatePointerFade() {
    frame = 0;
    pointerFade *= 0.90;
    draw();

    if (pointerFade > 0.01) {
      frame = window.requestAnimationFrame(animatePointerFade);
    }
  }

  window.addEventListener("resize", resize);

  window.addEventListener("pointermove", function (event) {
    pointer = {
      x: event.clientX,
      y: event.clientY
    };
    pointerFade = 1;
    draw();

    if (!frame && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frame = window.requestAnimationFrame(animatePointerFade);
    }
  }, { passive: true });

  window.addEventListener("pointerleave", function () {
    pointerFade = 0;
    draw();
  });

  resize();
}());
