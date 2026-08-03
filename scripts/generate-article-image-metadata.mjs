import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const POSTS_DIR = resolve(ROOT, 'src/content/posts');
const OUTPUT_FILE = resolve(ROOT, 'src/generated/article-image-metadata.ts');
const THEME_COLOR_SAMPLE_SIZE = 112;
const MATERIAL_COLOR_UTILITIES_DIR = dirname(
  fileURLToPath(import.meta.resolve('@material/material-color-utilities')),
);
const [{ QuantizerCelebi }, { Score }, { argbFromRgb }, { hexFromArgb }] = await Promise.all([
  import(pathToFileURL(resolve(MATERIAL_COLOR_UTILITIES_DIR, 'quantize/quantizer_celebi.js')).href),
  import(pathToFileURL(resolve(MATERIAL_COLOR_UTILITIES_DIR, 'score/score.js')).href),
  import(pathToFileURL(resolve(MATERIAL_COLOR_UTILITIES_DIR, 'utils/color_utils.js')).href),
  import(pathToFileURL(resolve(MATERIAL_COLOR_UTILITIES_DIR, 'utils/string_utils.js')).href),
]);

function toPosixPath(path) {
  return path.replace(/\\/g, '/');
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function readPngSize(buffer) {
  if (
    buffer.length < 24 ||
    buffer.toString('ascii', 1, 4) !== 'PNG' ||
    buffer.toString('ascii', 12, 16) !== 'IHDR'
  ) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readJpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const isStartOfFrame = (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    );

    if (isStartOfFrame) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
      };
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) {
      return null;
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function readWebpSize(buffer) {
  if (
    buffer.length < 30 ||
    buffer.toString('ascii', 0, 4) !== 'RIFF' ||
    buffer.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    return null;
  }

  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;

    if (dataOffset + chunkSize > buffer.length) {
      return null;
    }

    if (chunkType === 'VP8X' && chunkSize >= 10) {
      return {
        width: readUInt24LE(buffer, dataOffset + 4) + 1,
        height: readUInt24LE(buffer, dataOffset + 7) + 1,
      };
    }

    if (chunkType === 'VP8 ' && chunkSize >= 10) {
      return {
        width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    }

    if (chunkType === 'VP8L' && chunkSize >= 5 && buffer[dataOffset] === 0x2f) {
      const byte1 = buffer[dataOffset + 1];
      const byte2 = buffer[dataOffset + 2];
      const byte3 = buffer[dataOffset + 3];
      const byte4 = buffer[dataOffset + 4];

      return {
        width: 1 + byte1 + ((byte2 & 0x3f) << 8),
        height: 1 + ((byte2 & 0xc0) >> 6) + (byte3 << 2) + ((byte4 & 0x0f) << 10),
      };
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  return null;
}

function readImageSize(filePath) {
  const buffer = readFileSync(filePath);
  const extension = extname(filePath).toLowerCase();

  switch (extension) {
    case '.png':
      return readPngSize(buffer);
    case '.jpg':
    case '.jpeg':
      return readJpegSize(buffer);
    case '.webp':
      return readWebpSize(buffer);
    default:
      return null;
  }
}

function readImageFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory)) {
    const fullPath = resolve(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...readImageFiles(fullPath));
      continue;
    }

    if (/\.(?:jpe?g|png|webp)$/i.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

function readThumbnailFiles(directory) {
  const thumbnails = new Set();

  for (const entry of readdirSync(directory)) {
    const fullPath = resolve(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      for (const thumbnail of readThumbnailFiles(fullPath)) {
        thumbnails.add(thumbnail);
      }
      continue;
    }

    if (!/\.md$/i.test(entry)) {
      continue;
    }

    const markdown = readFileSync(fullPath, 'utf-8');
    const frontmatter = /^---\r?\n([\s\S]+?)\r?\n---/.exec(markdown)?.[1];
    const rawThumbnail = frontmatter
      ? /^thumbnail:\s*(.+?)\s*$/im.exec(frontmatter)?.[1]
      : undefined;
    const thumbnail = rawThumbnail?.trim().replace(/^['"]|['"]$/g, '');

    if (!thumbnail || /^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(thumbnail)) {
      continue;
    }

    const thumbnailPath = resolve(dirname(fullPath), thumbnail);
    const relativeThumbnailPath = relative(POSTS_DIR, thumbnailPath);
    const isOutsidePosts = (
      relativeThumbnailPath === '..' ||
      relativeThumbnailPath.startsWith(`..${sep}`) ||
      isAbsolute(relativeThumbnailPath)
    );

    if (
      !isOutsidePosts &&
      existsSync(thumbnailPath) &&
      /\.(?:jpe?g|png|webp)$/i.test(thumbnailPath)
    ) {
      thumbnails.add(thumbnailPath);
    }
  }

  return thumbnails;
}

async function readImageThemeColor(filePath) {
  const { data } = await sharp(filePath, { failOn: 'none' })
    .resize({
      fit: 'inside',
      height: THEME_COLOR_SAMPLE_SIZE,
      width: THEME_COLOR_SAMPLE_SIZE,
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = [];

  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] < 255) {
      continue;
    }

    pixels.push(argbFromRgb(data[offset], data[offset + 1], data[offset + 2]));
  }

  if (pixels.length === 0) {
    return undefined;
  }

  let randomState = 2166136261;
  for (const character of toPosixPath(relative(POSTS_DIR, filePath))) {
    randomState = Math.imul(randomState ^ character.charCodeAt(0), 16777619) >>> 0;
  }

  const originalRandom = Math.random;
  Math.random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 0x100000000;
  };

  let quantizedColors;
  try {
    quantizedColors = QuantizerCelebi.quantize(pixels, 128);
  } finally {
    Math.random = originalRandom;
  }

  const rankedColors = Score.score(quantizedColors);
  return rankedColors[0] === undefined ? undefined : hexFromArgb(rankedColors[0]);
}

async function main() {
  const imageMetadata = {};
  const thumbnailFiles = readThumbnailFiles(POSTS_DIR);

  for (const file of readImageFiles(POSTS_DIR)) {
    const size = readImageSize(file);

    if (!size || size.width <= 0 || size.height <= 0) {
      continue;
    }

    const key = `../content/posts/${toPosixPath(relative(POSTS_DIR, file))}`;
    const themeColor = thumbnailFiles.has(file)
      ? await readImageThemeColor(file)
      : undefined;
    imageMetadata[key] = themeColor ? { ...size, themeColor } : size;
  }

  const outputDirectory = dirname(OUTPUT_FILE);
  if (!existsSync(outputDirectory)) {
    mkdirSync(outputDirectory, { recursive: true });
  }

  const output = [
    '// Generated by scripts/generate-article-image-metadata.mjs. Do not edit by hand.',
    'export type ArticleImageMetadata = {',
    '  height: number;',
    '  themeColor?: string;',
    '  width: number;',
    '};',
    '',
    `export const articleImageMetadata: Record<string, ArticleImageMetadata> = ${JSON.stringify(imageMetadata, null, 2)};`,
    '',
  ].join('\n');

  writeFileSync(OUTPUT_FILE, output, 'utf-8');
}

await main();
