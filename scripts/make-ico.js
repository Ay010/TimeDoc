const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createIco() {
  const sizes = [16, 32, 48, 64, 128, 256];
  const images = [];

  for (const size of sizes) {
    const buf = await sharp(path.join(__dirname, '..', 'public', 'icon.png'))
      .resize(size, size)
      .png()
      .toBuffer();
    images.push({ size, data: buf });
  }

  const headerSize = 6;
  const dirEntrySize = 16;
  const numImages = images.length;
  let offset = headerSize + dirEntrySize * numImages;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.size < 256 ? img.size : 0, 0);
    entry.writeUInt8(img.size < 256 ? img.size : 0, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += img.data.length;
  }

  const ico = Buffer.concat([header, ...dirEntries, ...images.map(i => i.data)]);
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'icon.ico'), ico);
  console.log('icon.ico erstellt! (' + ico.length + ' bytes)');
}

createIco().catch(console.error);
