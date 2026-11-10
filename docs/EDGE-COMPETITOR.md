# What it takes to be a real edge competitor to Signverse

*Strategy note for Glipter Studio — written against the Tier 0 build in this repository.*

---

## The short answer

Glipter's intent is genuinely differentiated from cloud-avatar products such as Signverse / Terp 360:

- **Direction:** sign → text first, not speech → 3D avatar.
- **Infrastructure:** on-device, offline-capable, no backend in the recognition path.
- **Cost:** runs on hardware people already own, not a GPU-rendering contract.
- **Language priority:** Kenyan Sign Language and other African sign languages first, not as an afterthought.
- **Governance:** Deaf-led validation and community-authored profiles.

That intent is a credible wedge. But **intent alone is not a moat**. The current build is a high-quality Tier 0 demonstrator: a real data-driven ASL model, a four-word KSL pilot, a working offline PWA, and a voice bridge. To compete as a local/edge product it needs four hard things that cannot be faked:

1. **A KSL-first data and validation engine** — not just a model.
2. **Continuous signing recognition** — isolated handshapes are the easy part.
3. **A ruthlessly small, fast runtime** that still works on low-end Android and kiosk hardware.
4. **A Deaf-led trust and governance layer** that a commercial vendor cannot copy quickly.

The rest of this document is the gap analysis and the build order.

---

## 1. Where the edge advantage is real

| Dimension | Cloud avatar competitor | Glipter's edge |
|---|---|---|
| Bandwidth | Needs a stable connection | Works after first load; recognition is local |
| Hardware | GPU rendering, capable device | Landmark model + small MLP; CPU-friendly |
| Privacy | Video/audio may leave the device | Camera frames stay in the browser |
| Cost | Per-seat / enterprise contract | Zero marginal infrastructure cost |
| African SLs | Often one language, often Western-first | KSL is the default and first-class |
| Failure mode | Session drops when the network does | Degrades to demo/learn/text instead of dying |

The edge advantage is strongest where the competitor is weakest: **rural schools, public service counters, low-end phones, intermittent connectivity, and languages with little commercial dataset incentive.**

---

## 2. The four gaps that decide the outcome

### Gap A — Data and validation (the real moat)

The current ASL model is trained on 10,508 frames from one curated public corpus. The KSL model knows four glosses from 818 sequences. That is enough to prove the pipeline, not enough to interpret.

To become a competitor, Glipter needs:

- **A KSL lexicon corpus:** 5,000–10,000 glosses, 40–60 Deaf signers, multiple regions and ages, studio and real-world lighting, at least 100–200 hours of usable video/landmarks.
- **Signer-independent splits:** train/test separation by signer, not by frame. Publish per-signer accuracy and worst-case signers.
- **Non-manual features:** face, mouthing, eyebrows, head tilt, body pose. KSL grammar is not hands-only.
- **Continuous signing:** natural sentences, not isolated signs. This requires sign segmentation and boundary annotations.
- **A consent and compensation model:** community recording days, paid Deaf annotators, clear data licences, right to withdraw.
- **A review workflow:** every profile version has named Deaf reviewers, a changelog, and an explicit accuracy/coverage statement.

Without this, Glipter can demo, but it cannot claim to translate.

**Gate to call it real:** a signer-independent KSL benchmark with published top-1/top-5, a confusion analysis, and a Deaf review panel sign-off. Anything less is a demo.

### Gap B — Continuous recognition

Static handshape classification is the entry point, not the product. The hard problems are:

- **Segmentation:** where does one sign end and the next begin?
- **Co-articulation:** hands do not reset neatly between signs.
- **Two-handed signs:** hand interaction, occlusion, role switching.
- **Motion:** path, repetition, hold, and handshape change carry meaning.
- **Grammar:** KSL is S-O-V; questions, negation, and conditionals use non-manual markers.

The architecture that fits the edge constraint:

1. **Landmark front-end:** MediaPipe Tasks HandLandmarker (current) or a lightweight holistic model for face/pose. Keep it local; GPU delegate with CPU/WASM fallback.
2. **Temporal encoder:** a small TCN or transformer over 30–120 frames. Quantise to int8; target <15 MB.
3. **Segmentation head:** boundary prediction plus a "rest pose" detector. Start with a pause/rest-pose contract (Tier 1), then move to learned segmentation (Tier 2).
4. **Gloss decoder:** per-language lexicon + a constrained grammar layer. Do not let a generic LLM invent KSL grammar.
5. **Personalisation:** a short calibration pass per signer (hand size, camera angle, signing speed) that updates only a small adapter, not the whole model.

**Gate:** a 30-second continuous KSL sentence with ≥80% gloss recall on a held-out signer, running under 100 ms per frame on a mid-range Android device.

### Gap C — The runtime

The current runtime is deliberately tiny: plain JS MLP, 283 features, no GPU, no ONNX. That is an asset. Keep it.

Requirements for Tier 4:

- **Model budget:** <20 MB total (landmarks + temporal model + language profiles) so a 2 GB Android phone can install it.
- **Latency:** <100 ms end-to-end at 15–30 fps; camera → landmark → classifier → text.
- **Thermals/battery:** no continuous GPU inference. Prefer WASM SIMD, WebGPU only when available, and a lite/full model switch.
- **Graceful degradation:** lite model on low-end devices, demo/learn/text when no camera, embedded eSpeak TTS when no network or no OS voice.
- **Browser reality:** Chrome/Edge first; Safari and Firefox need explicit testing. MediaPipe, Web Speech, and service worker behaviour differ.
- **Kiosk mode:** full-screen, auto-start, no browser chrome, offline update path, physical camera mount guidance.

**Gate:** a 5-year-old mid-range Android phone runs 10 minutes of continuous recognition without thermal throttling below 15 fps, with <100 ms latency and no network.

**Voice bridge caveat:** the current build uses browser ASR and an **embedded eSpeak NG** voice (English + African languages) that needs no OS voice or network. Browser ASR may call a vendor service, so it is not a true offline ASR system. For Tier 1, either vendor a small offline ASR model (Whisper tiny / Vosk WASM / a domain-specific keyword model) or keep the text/phrase fallback and label ASR as network-dependent. Do not claim offline speech recognition until it actually works with the network off.

### Gap D — Trust, governance, and distribution

This is where a community project can beat a vendor:

- **Deaf-led review board** per language, with named reviewers and a public decision log.
- **No overclaiming:** the UI says "Tier 0 demonstrator" and "not validated" until it is not. Keep that discipline at every tier.
- **Published evaluation dashboard:** accuracy, latency, coverage, and known failure modes per language and profile version.
- **Data sovereignty:** communities can own and withdraw their contributions.
- **Distribution partnerships:** schools for the deaf, eKitabu-type organisations, hospitals, government service counters, Deaf associations.
- **Sustainability:** grants, public-interest funding, paid deployments, and a support model — not a per-seat SaaS trap.

**Gate:** at least one real deployment with a written Deaf-led evaluation, a named owner, and a support path. A pilot that nobody supports is not a product.

---

## 3. What the current Tier 0 already gets right

- **Real public data, real models.** ASL: 10,508 samples, 99.9% same-corpus held-out top-1. KSL: 818 sequences, four glosses, 99.2% held-out top-1. The numbers are labelled with their limits.
- **Offline by construction.** MediaPipe Tasks and eSpeak NG are vendored; the service worker precaches the shell and voice; the demo and learn library work without a camera.
- **A working two-way bridge.** Browser ASR for speech → text, embedded eSpeak NG for text → speech, a Talk thread, and a speech-to-sign preview, with explicit network caveats.
- **A self-test culture.** 74 checks on load, 18 Node tests, a static check for missing assets and CDN leaks.
- **An app, not a landing page.** Rail navigation, inspector, timeline, command palette, status bar, keyboard workflow.
- **Credits and provenance.** Zabibu Technika, Tehillah Kachila, dataset authors, and licences are visible in the product.

These are the seeds of trust. They are not yet a competitor.

---

## 4. 18-month build order (gated)

### Months 0–3 — Tier 1: honest MVP

- Full ASL/KSL fingerspelling alphabet with per-letter calibration.
- 50 static KSL signs, recorded with Deaf signers and reviewed.
- Motion signs for a small set (J, Z, thank-you, sorry, please).
- Pause/rest-pose segmentation contract.
- PWA install + embedded offline TTS with African language coverage.
- Transcript export and a classroom-friendly session view.
- **Gate:** 20 Deaf KSL reviewers try it; ≥70% prefer it to "no tool" for a scripted school-office conversation; all limitations visible.

### Months 3–9 — Tier 2: real translator

- 500+ KSL glosses; continuous signing with a learned segmentation head.
- Signer-independent evaluation; per-signer worst-case reporting.
- Face/pose features for non-manual grammar.
- Text → sign via **Gliptic Typography** (handshape + orientation + motion arrow + location), reviewed for legibility by Deaf users — not a 3D avatar.
- Language auto-detection as an explicit research feature, with measured accuracy or no claim.
- **Gate:** 30-second continuous KSL sentence ≥80% gloss recall on held-out signers; latency <100 ms on a mid-range Android; public evaluation dashboard.

### Months 9–15 — Tier 3: community platform

- No-code profile authoring: record, label, review, publish.
- Community dataset pipeline with consent, compensation, and withdrawal.
- Versioned profile library with reviewer credit and changelogs.
- ONNX/TinyML plug-in path for third-party models; rules remain as an interpretable fallback.
- **Gate:** two additional African sign languages authored by community teams without editing engine code; each has a named Deaf review panel.

### Months 15–18 — Tier 4: universal edge

- Offline-first on 2 GB Android and a $30 SBC/kiosk.
- Sub-100 ms end-to-end; 10-minute thermal test.
- Public per-language accuracy/latency/coverage dashboard.
- Embeddable web component and kiosk image.
- **Gate:** a real deployment in a school or public service counter, with a support contract and a published evaluation.

---

## 5. Metrics that matter

Do not optimise for demo accuracy. Optimise for:

- **Signer-independent top-1 / top-5** per language and per profile version.
- **Continuous gloss recall / precision** on natural sentences.
- **Worst-signer accuracy**, not just the average.
- **Latency p50/p95** on low-end hardware.
- **Offline success rate** after first load.
- **Task success:** can a Deaf student complete a scripted office/school task with the tool?
- **Reviewer sign-off:** did native Deaf signers approve this version?
- **Cost per deployment** and **cost per supported language**.

---

## 6. What not to do

- **Do not build a 3D avatar.** It loses the low-resource contexts that are the whole point.
- **Do not claim "sign language" as one language.** KSL, ASL, BSL, and Nigerian SL are distinct.
- **Do not ship a profile without a named Deaf reviewer.** A model card is not consent.
- **Do not hide the limits.** The moment the UI implies interpretation-grade accuracy, the trust advantage is gone.
- **Do not depend on a CDN or a cloud ASR for the core path.** Vendor what you can; label what you cannot.
- **Do not chase every language before one language is genuinely useful.** KSL first, then replicate the playbook.
- **Do not confuse a demo with a deployment.** A pilot without support, consent, and review is theatre.

---

## 7. The honest verdict

Glipter's **intent** is a real competitive position: edge-first, sign→text, African SL first, Deaf-led, cheap hardware, offline. That is a better fit for the actual gap than a cloud avatar product.

The **current build** is a strong Tier 0 seed: real data, real models, a polished app shell, a voice bridge, offline PWA, and an honest self-test. It is not yet a local/edge competitor to Signverse in the sense that matters — continuous, signer-independent, Deaf-validated interpretation.

The distance is not primarily a UI problem. It is:

1. a **data and review engine** for KSL,
2. a **continuous signing model**,
3. a **hard latency/size budget** on cheap hardware,
4. a **trust and distribution layer** that only a community can build.

Win those four, and the intent becomes a moat. Skip them, and Glipter remains a very good demo.

---

*Prepared for the Glipter project. A Zabibu Technika product, led by Tehillah Kachila.*
