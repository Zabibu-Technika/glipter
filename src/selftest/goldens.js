/**
 * Synthetic landmark generator used by the geometry and BSL rule tests.
 * It is deliberately simple: a 21-point hand that satisfies a requested
 * finger-extension state. This is a unit-test fixture, not training data.
 */

export function makeSyntheticHand(state, { offsetX = 0, offsetY = 0 } = {}) {
  const lm = new Array(21);
  const shift = (p) => ({ x: p.x + offsetX, y: p.y + offsetY, z: 0 });
  lm[0] = shift({ x: 0.5, y: 0.75 });

  if (state.thumb) {
    lm[1] = shift({ x: 0.40, y: 0.70 });
    lm[2] = shift({ x: 0.34, y: 0.66 });
    lm[3] = shift({ x: 0.28, y: 0.62 });
    lm[4] = shift({ x: 0.22, y: 0.58 });
  } else {
    lm[1] = shift({ x: 0.44, y: 0.70 });
    lm[2] = shift({ x: 0.47, y: 0.68 });
    lm[3] = shift({ x: 0.46, y: 0.65 });
    lm[4] = shift({ x: 0.44, y: 0.67 });
  }

  const defs = [
    { mcp: 5, baseX: 0.45, ext: state.index },
    { mcp: 9, baseX: 0.50, ext: state.middle },
    { mcp: 13, baseX: 0.55, ext: state.ring },
    { mcp: 17, baseX: 0.60, ext: state.pinky },
  ];
  for (const finger of defs) {
    const mcpY = 0.60;
    lm[finger.mcp] = shift({ x: finger.baseX, y: mcpY });
    if (finger.ext) {
      lm[finger.mcp + 1] = shift({ x: finger.baseX, y: mcpY - 0.05 });
      lm[finger.mcp + 2] = shift({ x: finger.baseX, y: mcpY - 0.10 });
      lm[finger.mcp + 3] = shift({ x: finger.baseX, y: mcpY - 0.15 });
    } else {
      lm[finger.mcp + 1] = shift({ x: finger.baseX, y: mcpY - 0.04 });
      lm[finger.mcp + 2] = shift({ x: finger.baseX + 0.03, y: mcpY - 0.04 });
      lm[finger.mcp + 3] = shift({ x: finger.baseX + 0.03, y: mcpY - 0.02 });
    }
  }
  return lm;
}

export const GEOMETRY_GOLDENS = [
  { name: "geometry · open hand", fingers: { thumb: true, index: true, middle: true, ring: true, pinky: true } },
  { name: "geometry · fist", fingers: { thumb: false, index: false, middle: false, ring: false, pinky: false } },
  { name: "geometry · index only", fingers: { thumb: false, index: true, middle: false, ring: false, pinky: false } },
  { name: "geometry · L shape", fingers: { thumb: true, index: true, middle: false, ring: false, pinky: false } },
  { name: "geometry · Y shape", fingers: { thumb: true, index: false, middle: false, ring: false, pinky: true } },
];

export const BSL_GOLDENS = [
  { name: "BSL · B two-handed", dom: { thumb: false, index: true, middle: true, ring: true, pinky: true }, non: { thumb: true, index: true, middle: true, ring: true, pinky: true }, expect: "B" },
  { name: "BSL · V two-handed", dom: { thumb: false, index: true, middle: true, ring: false, pinky: false }, non: { thumb: true, index: true, middle: true, ring: true, pinky: true }, expect: "V" },
  { name: "BSL · L two-handed", dom: { thumb: true, index: true, middle: false, ring: false, pinky: false }, non: { thumb: true, index: true, middle: true, ring: true, pinky: true }, expect: "L" },
  { name: "BSL · A two-handed", dom: { thumb: false, index: false, middle: false, ring: false, pinky: false }, non: { thumb: true, index: true, middle: true, ring: true, pinky: true }, expect: "A" },
];
