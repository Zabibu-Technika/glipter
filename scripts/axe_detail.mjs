import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const axeSource = readFileSync('node_modules/axe-core/axe.min.js','utf8');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport:{width:1440,height:900} });
await context.addInitScript(() => localStorage.setItem('glipter.onboarding.v1','1'));
await context.addInitScript({ content: axeSource });
const page = await context.newPage();
await page.goto('http://127.0.0.1:3000/', { waitUntil:'domcontentloaded' });
await page.waitForFunction(() => document.getElementById('status-self-test')?.textContent?.includes('self-test'));
const r = await page.evaluate(async () => {
  const res = await window.axe.run(document, { runOnly: { type:'rule', values:['label-content-name-mismatch'] } });
  return res.violations.map(v => ({ id:v.id, nodes:v.nodes.map(n=>({html:n.html, any:n.any, all:n.all, none:n.none, failureSummary:n.failureSummary})) }));
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
