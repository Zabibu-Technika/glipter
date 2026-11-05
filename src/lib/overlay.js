import { CONNECTIONS, TIPS } from "./landmarks.js";

const COLORS = {
  Right: {
    bone: "rgba(56, 189, 248, 0.95)",
    tip: "#7dd3fc",
    joint: "#e0f2fe",
    label: "R",
  },
  Left: {
    bone: "rgba(167, 139, 250, 0.95)",
    tip: "#c4b5fd",
    joint: "#ede9fe",
    label: "L",
  },
  Unknown: {
    bone: "rgba(148, 163, 184, 0.9)",
    tip: "#cbd5e1",
    joint: "#f1f5f9",
    label: "?",
  },
};

/**
 * Draw a hand skeleton on a canvas whose internal resolution matches the
 * video frame. Mirroring is done here, in code, so the overlay always lines
 * up with the mirrored <video> element.
 */
export function drawHands(ctx, hands, options = {}) {
  const { mirror = true, showSkeleton = true, showLabels = true } = options;
  const { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);
  if (!hands?.length) return;

  const px = (p) => (mirror ? 1 - p.x : p.x) * w;
  const py = (p) => p.y * h;

  for (const hand of hands) {
    if (!hand?.landmarks?.length) continue;
    const palette = COLORS[hand.handedness] ?? COLORS.Unknown;
    const lm = hand.landmarks;

    if (showSkeleton) {
      ctx.save();
      ctx.strokeStyle = palette.bone;
      ctx.lineWidth = Math.max(2, w / 320);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = palette.bone;
      ctx.shadowBlur = Math.max(4, w / 90);
      for (const [a, b] of CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(px(lm[a]), py(lm[a]));
        ctx.lineTo(px(lm[b]), py(lm[b]));
        ctx.stroke();
      }
      ctx.restore();

      for (let i = 0; i < lm.length; i++) {
        const isTip = TIPS.includes(i);
        ctx.beginPath();
        ctx.arc(px(lm[i]), py(lm[i]), isTip ? Math.max(5, w / 110) : Math.max(3, w / 190), 0, Math.PI * 2);
        ctx.fillStyle = isTip ? palette.tip : palette.joint;
        ctx.fill();
      }
    }

    if (showLabels) {
      const wrist = lm[0];
      const x = px(wrist);
      const y = py(wrist);
      const r = Math.max(12, w / 50);
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "rgba(8, 12, 20, 0.72)";
      ctx.beginPath();
      ctx.arc(x, y + r * 1.9, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.bone;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = palette.tip;
      ctx.font = `700 ${Math.max(11, w / 48)}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(palette.label, x, y + r * 1.9);
      ctx.restore();
    }
  }
}

export function clearOverlay(ctx) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
}
