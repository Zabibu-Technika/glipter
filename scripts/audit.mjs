import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://127.0.0.1:3000/";
const OUT = join(process.cwd(), "docs", "audit");
mkdirSync(OUT, { recursive: true });
const axeSource = readFileSync(join(process.cwd(), "node_modules", "axe-core", "axe.min.js"), "utf8");

const report = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  viewports: [],
  axe: [],
  console: [],
  pageErrors: [],
  performance: null,
  offline: null,
};

const browser = await chromium.launch({ headless: true });

function attachLogging(page, tag) {
  page.on("console", (message) => {
    if (message.type() === "error") report.console.push({ tag, text: message.text() });
  });
  page.on("pageerror", (error) => report.pageErrors.push({ tag, text: String(error) }));
}

async function waitForApp(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => document.getElementById("status-self-test")?.textContent?.includes("self-test"),
    { timeout: 30000 },
  );
  await page.addStyleTag({
    content: "*,*::before,*::after{animation-duration:0.001ms!important;transition-duration:0.001ms!important;scroll-behavior:auto!important}",
  });
  await page.waitForTimeout(250);
}

async function measure(page, label) {
  return page.evaluate((name) => {
    const q = (selector) => document.querySelector(selector);
    const rect = (selector) => {
      const el = q(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const visible = (el) => el && el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden";
    const controls = [...document.querySelectorAll("button,a,select,input,textarea")]
      .filter(visible)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || "",
          label: (el.getAttribute("aria-label") || el.textContent || el.value || "").trim().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      })
      .filter((item) => item.w > 0 && item.h > 0);
    const under44 = controls.filter((item) => item.w < 44 || item.h < 44);
    const under24 = controls.filter((item) => item.w < 24 || item.h < 24);
    const headings = [...document.querySelectorAll("h1,h2,h3")]
      .filter(visible)
      .map((el) => ({ tag: el.tagName, text: el.textContent.trim().slice(0, 70) }))
      .slice(0, 16);
    return {
      label: name,
      viewport: { w: innerWidth, h: innerHeight },
      document: {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
      },
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      mainScroll: q("#main") ? { scrollHeight: q("#main").scrollHeight, clientHeight: q("#main").clientHeight } : null,
      rects: {
        appBar: rect(".app-bar"),
        rail: rect(".side-rail"),
        studio: rect(".studio"),
        camera: rect(".camera-panel"),
        inspector: rect(".inspector"),
        timeline: rect(".timeline-panel"),
        status: rect(".status-bar"),
        learnDetail: rect(".learn-detail"),
        voiceGrid: rect(".voice-grid"),
      },
      controls: controls.length,
      under44: under44.length,
      under24: under24.length,
      under44Samples: under44.slice(0, 14),
      headings,
      theme: document.documentElement.dataset.theme,
      title: document.title,
      lang: document.documentElement.lang,
      buttonsWithoutName: [...document.querySelectorAll("button")].filter(visible).filter((button) =>
        !button.getAttribute("aria-label") && !button.textContent.trim() && !button.title).length,
      imagesWithoutAlt: [...document.querySelectorAll("img")].filter(visible).filter((image) => !image.alt).length,
      asr: q("#asr-support")?.textContent ?? null,
      tts: q("#tts-support")?.textContent ?? null,
      selfTest: q("#status-self-test")?.textContent ?? null,
      offline: q("#offline-text")?.textContent ?? null,
    };
  }, label);
}

async function runAxe(page, label) {
  const result = await page.evaluate(async () => {
    const results = await window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
      },
    });
    return {
      violations: results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        count: violation.nodes.length,
        targets: violation.nodes.slice(0, 4).map((node) => node.target.join(" ")),
      })),
      passes: results.passes.length,
      incomplete: results.incomplete.map((item) => item.id),
    };
  });
  report.axe.push({ label, ...result });
}

async function capture(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
}

async function navigate(page, view) {
  await page.click(`.rail-item[data-view="${view}"]`);
  await page.waitForTimeout(220);
}

// ── Main viewport sweep ─────────────────────────────────────
const viewports = [
  { name: "small-mobile", width: 320, height: 568 },
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 1920, height: 1080 },
];

const context = await browser.newContext({ colorScheme: "dark", viewport: { width: 1440, height: 900 } });
await context.addInitScript(() => {
  try { localStorage.setItem("glipter.onboarding.v1", "1"); } catch {}
});
await context.addInitScript({ content: axeSource });
const page = await context.newPage();
attachLogging(page, "main");
await waitForApp(page);

for (const viewport of viewports) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await navigate(page, "live");
  await page.waitForTimeout(180);
  const measurement = await measure(page, viewport.name);
  report.viewports.push(measurement);
  await capture(page, `${viewport.name}-live`);

  await navigate(page, "transcript");
  await capture(page, `${viewport.name}-transcript`);

  await navigate(page, "learn");
  await capture(page, `${viewport.name}-learn`);

  await navigate(page, "voice");
  await capture(page, `${viewport.name}-voice`);
  if (viewport.name === "desktop" || viewport.name === "mobile") {
    await runAxe(page, `${viewport.name}-voice`);
  }

  await navigate(page, "about");
  await capture(page, `${viewport.name}-about`);
}

// Desktop deeper audit
await page.setViewportSize({ width: 1440, height: 900 });
await navigate(page, "live");
await runAxe(page, "desktop-live");
await page.click("#inspector-toggle");
await page.waitForTimeout(150);
await capture(page, "desktop-details");
await page.click("#inspector-toggle");
await page.click("#camera-more");
await page.waitForTimeout(150);
await capture(page, "desktop-camera-menu");
await page.keyboard.press("Escape");
await navigate(page, "learn");
await runAxe(page, "desktop-learn");
await navigate(page, "about");
await runAxe(page, "desktop-about");

await navigate(page, "live");
await page.click("#command-btn");
await page.waitForTimeout(180);
await capture(page, "desktop-command-palette");
await page.keyboard.press("Escape");

await page.click("#settings-btn");
await page.waitForTimeout(180);
await capture(page, "desktop-settings");
await page.keyboard.press("Escape");

// Demo pipeline test (no camera)
await navigate(page, "live");
await page.click("#demo-btn");
await page.waitForFunction(
  () => document.getElementById("stat-tokens")?.textContent !== "0",
  { timeout: 12000 },
);
await page.waitForFunction(
  () => document.getElementById("hand-count")?.textContent !== "0",
  { timeout: 8000 },
);
await page.waitForTimeout(120);
await capture(page, "desktop-demo");
report.demo = await page.evaluate(() => ({
  gloss: document.getElementById("gloss-stream")?.textContent,
  english: document.getElementById("english-stream")?.textContent,
  tokens: document.getElementById("stat-tokens")?.textContent,
  timeline: document.getElementById("timeline-count")?.textContent,
  engine: document.getElementById("engine-status")?.textContent?.trim(),
}));
await page.click("#stop-btn");

// Performance snapshot (fresh navigation, before demo)
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.getElementById("status-self-test")?.textContent?.includes("self-test"), { timeout: 30000 });
report.performance = await page.evaluate(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const resources = performance.getEntriesByType("resource");
  const totalTransfer = resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
  const totalDecoded = resources.reduce((sum, entry) => sum + (entry.decodedBodySize || 0), 0);
  return {
    domContentLoadedMs: Math.round(nav?.domContentLoadedEventEnd ?? 0),
    loadMs: Math.round(nav?.loadEventEnd ?? 0),
    resources: resources.length,
    transferKB: Math.round(totalTransfer / 1024),
    decodedKB: Math.round(totalDecoded / 1024),
    scriptCount: resources.filter((entry) => entry.name.endsWith(".js")).length,
    heapMB: performance.memory ? Math.round((performance.memory.usedJSHeapSize / 1048576) * 10) / 10 : null,
  };
});

// Light theme pass
const lightContext = await browser.newContext({ colorScheme: "light", viewport: { width: 1440, height: 900 } });
await lightContext.addInitScript(() => {
  try {
    localStorage.setItem("glipter.onboarding.v1", "1");
    localStorage.setItem("glipter.settings.v2", JSON.stringify({ theme: "light" }));
  } catch {}
});
await lightContext.addInitScript({ content: axeSource });
const lightPage = await lightContext.newPage();
attachLogging(lightPage, "light");
await waitForApp(lightPage);
await capture(lightPage, "desktop-light-live");
await runAxe(lightPage, "desktop-light-live");
await lightPage.setViewportSize({ width: 390, height: 844 });
await navigate(lightPage, "live");
await capture(lightPage, "mobile-light-live");
await lightContext.close();

// Midnight theme pass
const darkContext = await browser.newContext({ colorScheme: "dark", viewport: { width: 1440, height: 900 } });
await darkContext.addInitScript(() => {
  try {
    localStorage.setItem("glipter.onboarding.v1", "1");
    localStorage.setItem("glipter.settings.v2", JSON.stringify({ theme: "dark" }));
  } catch {}
});
await darkContext.addInitScript({ content: axeSource });
const darkPage = await darkContext.newPage();
attachLogging(darkPage, "dark");
await waitForApp(darkPage);
await capture(darkPage, "desktop-dark-live");
await runAxe(darkPage, "desktop-dark-live");
await darkContext.close();

// Offline pass
const offlineContext = await browser.newContext({ colorScheme: "dark", viewport: { width: 1440, height: 900 } });
await offlineContext.addInitScript(() => {
  try { localStorage.setItem("glipter.onboarding.v1", "1"); } catch {}
});
const offlinePage = await offlineContext.newPage();
attachLogging(offlinePage, "offline");
await waitForApp(offlinePage);
let offlineStatus = "unknown";
try {
  await offlinePage.waitForFunction(
    () => document.getElementById("offline-text")?.textContent === "Offline ready",
    { timeout: 45000 },
  );
  offlineStatus = "ready";
  await offlineContext.setOffline(true);
  await offlinePage.reload({ waitUntil: "domcontentloaded" });
  await offlinePage.waitForFunction(
    () => document.getElementById("status-self-test")?.textContent?.includes("self-test"),
    { timeout: 20000 },
  );
  await capture(offlinePage, "offline-live");
  offlineStatus = "reloaded-offline";
} catch (error) {
  offlineStatus = `failed: ${error.message}`;
}
report.offline = {
  status: offlineStatus,
  title: await offlinePage.title().catch(() => null),
  selfTest: await offlinePage.locator("#status-self-test").textContent().catch(() => null),
  offlineBadge: await offlinePage.locator("#offline-text").textContent().catch(() => null),
};
await offlineContext.setOffline(false);
await offlineContext.close();

// Practice mode screenshot
await navigate(page, "learn");
await page.click("#learn-practice");
await page.waitForFunction(() => !document.getElementById("practice-banner")?.classList.contains("hidden"), { timeout: 8000 });
await page.click("#demo-btn");
await page.waitForTimeout(1800);
await capture(page, "desktop-practice");
await page.click("#practice-exit");
await page.click("#stop-btn");

// First-run onboarding screenshot (fresh context, no seen flag)
const onboardingContext = await browser.newContext({ colorScheme: "dark", viewport: { width: 1440, height: 900 } });
const onboardingPage = await onboardingContext.newPage();
await onboardingPage.goto(BASE, { waitUntil: "domcontentloaded" });
await onboardingPage.waitForFunction(() => document.getElementById("onboarding-dialog")?.open, { timeout: 15000 });
await onboardingPage.waitForTimeout(250);
await onboardingPage.screenshot({ path: join(OUT, "desktop-onboarding.png"), fullPage: false });
await onboardingContext.close();

await context.close();
await browser.close();

writeFileSync(join(OUT, "audit-data.json"), JSON.stringify(report, null, 2));
console.log(`Audit written to ${OUT}`);
console.log(`Viewports: ${report.viewports.length}`);
console.log(`Axe runs: ${report.axe.length}`);
console.log(`Console errors: ${report.console.length}`);
console.log(`Page errors: ${report.pageErrors.length}`);
console.log(`Offline: ${report.offline.status}`);
console.log(`Demo: ${JSON.stringify(report.demo)}`);
console.log(`Performance: ${JSON.stringify(report.performance)}`);
