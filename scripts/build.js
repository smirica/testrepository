const fs = require('fs').promises;
const path = require('path');

async function copy(src, dest) {
  const stat = await fs.stat(src);
  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src);
    for (const entry of entries) {
      await copy(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    await fs.copyFile(src, dest);
  }
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const src = path.join(root, 'src');
  const out = path.join(root, 'build');
  try {
    await fs.rm(out, { recursive: true, force: true });
  } catch (e) {}
  await copy(src, out);
  console.log('Built site ->', out);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
