import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const iconSvg = readFileSync(join(root, 'icon.svg'))

const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
]

for (const { name, size } of sizes) {
  const png = await sharp(iconSvg).resize(size, size).png().toBuffer()
  writeFileSync(join(root, name), png)
  console.log(`Generated ${name} (${size}x${size})`)
}
