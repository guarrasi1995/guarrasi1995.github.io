(function () {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  canvas.id = "ink-background";
  canvas.className = "ink-background-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);

  const colors = {
    red: { r: 229, g: 39, b: 48 },
    redDeep: { r: 122, g: 22, b: 24 },
    blue: { r: 38, g: 105, b: 255 },
    blueDeep: { r: 17, g: 53, b: 154 },
    ink: { r: 14, g: 18, b: 58 }
  };

  const codeTokens = [
    "fuse(image, text)",
    "attention",
    "encoder",
    "clinical_prior",
    "MRI",
    "ECG",
    "tensor",
    "backprop",
    "synthetic_data",
    "AUC",
    "latent",
    "diagnosis",
    "grad",
    "mask",
    "health.ai",
    "pipeline",
    "evidence=True"
  ];

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let tokens = [];
  let pointer = { x: 0, y: 0, active: false, force: 0 };
  let frameId = 0;
  let tick = 0;

  function rgba(color, alpha) {
    return "rgba(" + color.r + ", " + color.g + ", " + color.b + ", " + alpha + ")";
  }

  function mix(a, b, amount) {
    return {
      r: Math.round(a.r + (b.r - a.r) * amount),
      g: Math.round(a.g + (b.g - a.g) * amount),
      b: Math.round(a.b + (b.b - a.b) * amount)
    };
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

  function createField() {
    const random = mulberry32(19951013 + Math.round(width));
    const nodeCount = width < 720 ? 36 : 72;
    const tokenCount = width < 720 ? 16 : 30;

    nodes = [];
    tokens = [];

    for (let i = 0; i < nodeCount; i += 1) {
      const side = i % 2;
      const color = side ? colors.blue : colors.red;
      nodes.push({
        x: random() * width,
        y: random() * height,
        ox: random() * width,
        oy: random() * height,
        vx: (random() - 0.5) * 0.22,
        vy: (random() - 0.5) * 0.22,
        radius: 1.6 + random() * 2.8,
        color: color,
        phase: random() * Math.PI * 2
      });
    }

    for (let i = 0; i < tokenCount; i += 1) {
      tokens.push({
        text: codeTokens[i % codeTokens.length],
        x: random() * width,
        y: random() * height,
        speed: 0.10 + random() * 0.34,
        alpha: 0.10 + random() * 0.16,
        color: i % 3 === 0 ? colors.red : colors.blue
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

    createField();
    draw();
  }

  function drawGrid() {
    const spacing = width < 720 ? 48 : 64;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(38, 105, 255, 0.045)";

    for (let x = (tick * 0.08) % spacing; x < width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(229, 39, 48, 0.038)";
    for (let y = (tick * 0.06) % spacing; y < height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawInstitutionRibbons() {
    const t = tick * 0.006;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";

    ctx.lineWidth = Math.max(52, width * 0.055);
    ctx.strokeStyle = rgba(colors.red, 0.12);
    ctx.beginPath();
    ctx.moveTo(-width * 0.08, height * (0.28 + Math.sin(t) * 0.02));
    ctx.bezierCurveTo(
      width * 0.22,
      height * 0.02,
      width * 0.52,
      height * 0.58,
      width * 1.08,
      height * 0.18
    );
    ctx.stroke();

    ctx.lineWidth = Math.max(58, width * 0.062);
    ctx.strokeStyle = rgba(colors.blue, 0.13);
    ctx.beginPath();
    ctx.moveTo(-width * 0.10, height * (0.78 + Math.cos(t) * 0.02));
    ctx.bezierCurveTo(
      width * 0.26,
      height * 0.96,
      width * 0.60,
      height * 0.20,
      width * 1.12,
      height * 0.72
    );
    ctx.stroke();

    ctx.restore();
  }

  function updateNodes() {
    const drift = reduceMotion.matches ? 0 : 1;

    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      const orbitX = Math.cos(tick * 0.003 + node.phase) * 0.22 * drift;
      const orbitY = Math.sin(tick * 0.003 + node.phase) * 0.22 * drift;

      node.x += node.vx * drift + orbitX;
      node.y += node.vy * drift + orbitY;

      if (pointer.active && pointer.force > 0.01) {
        const dx = node.x - pointer.x;
        const dy = node.y - pointer.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const push = Math.max(0, 1 - dist / 280) * pointer.force;
        node.x += (dx / dist) * push * 2.8;
        node.y += (dy / dist) * push * 2.8;
      }

      if (node.x < -40) node.x = width + 40;
      if (node.x > width + 40) node.x = -40;
      if (node.y < -40) node.y = height + 40;
      if (node.y > height + 40) node.y = -40;
    }

    pointer.force *= 0.92;
  }

  function drawEdges() {
    const threshold = width < 720 ? 118 : 156;

    ctx.save();
    ctx.lineWidth = 1;

    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);

        if (dist < threshold) {
          const alpha = (1 - dist / threshold) * 0.18;
          const color = mix(a.color, b.color, 0.5);
          ctx.strokeStyle = rgba(color, alpha);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  function drawNodes() {
    ctx.save();

    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      const glow = pointer.active
        ? Math.max(0, 1 - Math.hypot(node.x - pointer.x, node.y - pointer.y) / 240) * pointer.force
        : 0;

      ctx.fillStyle = rgba(node.color, 0.42 + glow * 0.42);
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + glow * 2.4, 0, Math.PI * 2);
      ctx.fill();

      if (glow > 0.04) {
        ctx.strokeStyle = rgba(node.color, glow * 0.34);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 9 + glow * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function drawTokens() {
    ctx.save();
    ctx.font = width < 720 ? "11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" : "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textBaseline = "middle";

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      const motion = reduceMotion.matches ? 0 : token.speed;
      token.y += motion;

      if (token.y > height + 24) {
        token.y = -24;
      }

      ctx.fillStyle = rgba(token.color, token.alpha);
      ctx.fillText(token.text, token.x, token.y);
    }

    ctx.restore();
  }

  function drawPointer() {
    if (!pointer.active || pointer.force < 0.01) return;

    const radius = Math.min(width, height) * 0.20;
    const gradient = ctx.createRadialGradient(pointer.x, pointer.y, radius * 0.02, pointer.x, pointer.y, radius);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.18)");
    gradient.addColorStop(0.22, rgba(colors.blue, 0.16 * pointer.force));
    gradient.addColorStop(0.48, rgba(colors.red, 0.11 * pointer.force));
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawVignette() {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.42)");
    gradient.addColorStop(0.42, "rgba(255, 255, 255, 0.20)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.68)");

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f8fbff";
    ctx.fillRect(0, 0, width, height);

    drawGrid();
    drawInstitutionRibbons();
    updateNodes();
    drawEdges();
    drawNodes();
    drawTokens();
    drawPointer();
    drawVignette();
  }

  function animate() {
    tick += 1;
    draw();

    if (!reduceMotion.matches) {
      frameId = window.requestAnimationFrame(animate);
    }
  }

  function restartAnimation() {
    window.cancelAnimationFrame(frameId);
    tick = 0;
    draw();

    if (!reduceMotion.matches) {
      frameId = window.requestAnimationFrame(animate);
    }
  }

  window.addEventListener("resize", resize);

  window.addEventListener("pointermove", function (event) {
    pointer = {
      x: event.clientX,
      y: event.clientY,
      active: true,
      force: 1
    };
  }, { passive: true });

  window.addEventListener("pointerleave", function () {
    pointer.active = false;
  });

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener("change", restartAnimation);
  }

  resize();
  restartAnimation();
}());
