// Embed recordings only after both live GIFs were successfully created.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
const file = 'README.md';
let readme = readFileSync(file, 'utf8');
const items = [
  { key: 'ALLITRO', name: 'allitro', url: 'https://allitro.vercel.app/' },
  { key: 'FOOTSTEPLAB', name: 'footsteplab', url: 'https://footsteplab.vercel.app/' }
];
for (const item of items) {
  const media = 'assets/demos/' + item.name + '.gif';
  if (statSync(media).size < 1024) throw new Error('Demo looks empty: ' + media);
  const start = '<!-- ' + item.key + '_DEMO_START -->';
  const end = '<!-- ' + item.key + '_DEMO_END -->';
  const a = readme.indexOf(start);
  const b = readme.indexOf(end);
  if (a === -1 || b === -1 || b <= a) throw new Error('Missing README markers for ' + item.name);
  const frame = '<a href="' + item.url + '"><img width="100%" src="./' + media + '" alt="Authentic screen recording of the public ' + item.name + ' web application" /></a>';
  readme = readme.slice(0, a + start.length) + '\n\n' + frame + '\n\n' + readme.slice(b);
}
writeFileSync(file, readme);
console.log('Inserted both real project GIFs in README.md');
