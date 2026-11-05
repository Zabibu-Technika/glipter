/**
 * Sliding-window majority vote.
 *
 * Raw frame classifiers flicker. A sign is only committed after it wins
 * `minVotes` of the last `windowSize` frames. Null/empty frames count toward
 * the window so a sign can be released cleanly.
 */
export class GestureDebouncer {
  constructor(windowSize = 10, minVotes = 6) {
    this.windowSize = windowSize;
    this.minVotes = minVotes;
    this.history = [];
    this.committed = null;
    this.confidence = 0;
  }

  setWindow(windowSize, minVotes = Math.ceil(windowSize * 0.6)) {
    this.windowSize = Math.max(3, windowSize);
    this.minVotes = Math.max(2, Math.min(this.windowSize, minVotes));
    this.reset();
  }

  push(id, confidence = 0) {
    this.history.push({ id: id ?? "", confidence });
    if (this.history.length > this.windowSize) this.history.shift();

    const counts = new Map();
    for (const entry of this.history) {
      if (!entry.id) continue;
      const current = counts.get(entry.id) ?? { count: 0, confidence: 0 };
      current.count += 1;
      current.confidence += entry.confidence;
      counts.set(entry.id, current);
    }

    let best = null;
    let bestCount = 0;
    let bestConfidence = 0;
    for (const [id, value] of counts) {
      if (value.count > bestCount && value.count >= this.minVotes) {
        best = id;
        bestCount = value.count;
        bestConfidence = value.confidence / value.count;
      }
    }

    const changed = best !== this.committed;
    const prev = this.committed;
    this.committed = best;
    this.confidence = bestConfidence;
    return { gesture: best, changed, prev, confidence: bestConfidence, votes: bestCount };
  }

  reset() {
    this.history = [];
    this.committed = null;
    this.confidence = 0;
  }
}
