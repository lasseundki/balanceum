import sharp from 'sharp'
import { writeFileSync } from 'fs'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="88" fill="#7BA89B"/>
  <text
    x="262"
    y="392"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="390"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    dominant-baseline="auto">B</text>
</svg>`

const buf = Buffer.from(svg)

await sharp(buf).resize(512, 512).png().toFile('public/pwa-512x512.png')
await sharp(buf).resize(192, 192).png().toFile('public/pwa-192x192.png')
await sharp(buf).resize(180, 180).png().toFile('public/apple-touch-icon.png')

// favicon: 32x32 ICO approximation as PNG renamed
await sharp(buf).resize(32, 32).png().toFile('public/favicon-32.png')

console.log('Icons generated.')
