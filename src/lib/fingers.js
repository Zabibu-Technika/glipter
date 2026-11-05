import { LM, angle } from "./landmarks.js";

const EXT_ANGLE = 158;
const THUMB_ANGLE = 145;

function extended(lm, mcp, pip, dip, tip, minAngle = EXT_ANGLE) {
  return angle(lm[mcp], lm[pip], lm[dip]) > minAngle
      && angle(lm[pip], lm[dip], lm[tip]) > minAngle;
}

function thumbExtended(lm, minAngle = THUMB_ANGLE) {
  return angle(lm[LM.THUMB_CMC], lm[LM.THUMB_MCP], lm[LM.THUMB_IP]) > minAngle
      && angle(lm[LM.THUMB_MCP], lm[LM.THUMB_IP], lm[LM.THUMB_TIP]) > minAngle;
}

export function getFingerState(lm) {
  return {
    thumb: thumbExtended(lm),
    index: extended(lm, LM.INDEX_MCP, LM.INDEX_PIP, LM.INDEX_DIP, LM.INDEX_TIP),
    middle: extended(lm, LM.MIDDLE_MCP, LM.MIDDLE_PIP, LM.MIDDLE_DIP, LM.MIDDLE_TIP),
    ring: extended(lm, LM.RING_MCP, LM.RING_PIP, LM.RING_DIP, LM.RING_TIP),
    pinky: extended(lm, LM.PINKY_MCP, LM.PINKY_PIP, LM.PINKY_DIP, LM.PINKY_TIP),
  };
}

export function fingerKey(f) {
  return `t${+f.thumb}i${+f.index}m${+f.middle}r${+f.ring}p${+f.pinky}`;
}

export function extendedCount(f) {
  return [f.index, f.middle, f.ring, f.pinky].filter(Boolean).length;
}
