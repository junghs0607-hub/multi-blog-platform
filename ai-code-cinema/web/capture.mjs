// Playwright 프레임 캡처: index.html의 render(t)를 시간별로 호출해 PNG 저장.
// 사용: node capture.mjs --html <path> --out <dir> --dur <sec> --fps <n> --w <px> --h <px>
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);
const html = args.html, out = args.out;
const dur = parseFloat(args.dur), fps = parseInt(args.fps);
const W = parseInt(args.w), H = parseInt(args.h);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto('file://' + html);
await page.waitForFunction('window.READY === true', null, { timeout: 30000 });
const n = Math.round(dur * fps);
for (let i = 0; i < n; i++) {
  const t = Math.min(i / fps, dur - 1e-4);
  await page.evaluate((tt) => window.render(tt), t);
  await page.screenshot({ path: join(out, `frame_${String(i).padStart(6, '0')}.png`) });
  if (i % 48 === 0) console.log(`frames ${i + 1}/${n}`);
}
console.log(`frames ${n}/${n} done`);
await browser.close();
