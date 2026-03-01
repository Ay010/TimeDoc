const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const buildDir = path.join(__dirname, '..', 'build')
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true })

async function createInstallerImages() {
  const icon = await sharp(path.join(__dirname, '..', 'public', 'icon.png'))
    .resize(100, 100).png().toBuffer()

  const sidebarSvg = `<svg width="164" height="314" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1e3a5f"/>
        <stop offset="100%" stop-color="#0f1f33"/>
      </linearGradient>
    </defs>
    <rect width="164" height="314" fill="url(#bg)"/>
    <text x="82" y="240" text-anchor="middle" fill="white" font-family="Segoe UI" font-size="18" font-weight="bold">TimeDoc</text>
    <text x="82" y="264" text-anchor="middle" fill="#8ab4f8" font-family="Segoe UI" font-size="11">Installer</text>
  </svg>`

  await sharp(Buffer.from(sidebarSvg))
    .composite([{ input: icon, top: 100, left: 32 }])
    .png()
    .toFile(path.join(buildDir, 'installerSidebar.png'))

  const headerIcon = await sharp(path.join(__dirname, '..', 'public', 'icon.png'))
    .resize(40, 40).png().toBuffer()

  const headerSvg = `<svg width="150" height="57" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="hbg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#1e3a5f"/>
        <stop offset="100%" stop-color="#2563eb"/>
      </linearGradient>
    </defs>
    <rect width="150" height="57" fill="url(#hbg)"/>
    <text x="100" y="35" text-anchor="middle" fill="white" font-family="Segoe UI" font-size="14" font-weight="bold">TimeDoc</text>
  </svg>`

  await sharp(Buffer.from(headerSvg))
    .composite([{ input: headerIcon, top: 8, left: 5 }])
    .png()
    .toFile(path.join(buildDir, 'installerHeader.png'))

  console.log('Installer images created!')
}

createInstallerImages().catch(console.error)
