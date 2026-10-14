// Capture short, authentic screen recordings of the public websites.
// Runs on GitHub Actions, never accesses the private source repositories.
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const targets = [
  { name: 'allitro', url: 'https://allitro.vercel.app/' },
  { name: 'footsteplab', url: 'https://footsteplab.vercel.app/' },
];

function encodeGif(folder, output) {
  const filters = 'fps=4,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4';
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '4',
    '-i', join(folder, 'frame-%02d.png'),
    '-filter_complex', filters, '-loop', '0', output
  ], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('FFmpeg failed for ' + output);
}

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'] });
try {
  await mkdir('assets/demos', { recursive: true });
  for (const target of targets) {
    const frameDir = await mkdtemp(join(tmpdir(), target.name + '-'));
    const page = await browser.newPage({
      viewport: { width: 1024, height: 600 }, deviceScaleFactor: 1,
      reducedMotion: 'reduce', colorScheme: 'dark'
    });
    try {
      console.log('Recording public website: ' + target.url);
      const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      if (!response || response.status() >= 400) throw new Error('Bad HTTP response for ' + target.url);
      await page.waitForTimeout(4500);
      const text = await page.locator('body').innerText();
      if (text.length < 80) throw new Error('Site has no meaningful page content: ' + target.url);
      await page.mouse.move(565, 355);
      for (let i = 0; i < 20; i++) {
        if (target.name === 'allitro') {
          // A user-like pan of the actual MapLibre map, with real public data.
          if (i === 4) await page.mouse.down();
          if (i >= 5 && i <= 15) await page.mouse.move(565 - (i - 4) * 19, 355 + (i - 4) * 3, { steps: 2 });
          if (i === 16) await page.mouse.up();
        } else {
          // Show the actual homepage and move to the actual audio optimizer.
          if (i === 9) {
            await page.goto('https://footsteplab.vercel.app/optimizer', { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(2000);
          }
          if (i > 10) await page.mouse.wheel(0, 65);
        }
        await page.waitForTimeout(190);
        await page.screenshot({ path: join(frameDir, 'frame-' + String(i).padStart(2, '0') + '.png'), animations: 'disabled' });
      }
      const outfile = 'assets/demos/' + target.name + '.gif';
      encodeGif(frameDir, outfile);
      console.log('Created ' + outfile);
    } finally {
      await page.close();
      await rm(frameDir, { recursive: true, force: true });
    }
  }
} finally {
  await browser.close();
}
