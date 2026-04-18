import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = resolve(ROOT, 'public');
const OUTPUT_FILE = resolve(ROOT, 'src/generated/photo-catalogs.ts');
const THUMB_MAX_EDGE = 760;

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

const catalogs = [
  {
    directory: 'freiburg-colmar-strassburg-munich',
    slug: 'freiburg-strassburg-colmar-munich',
    name: 'Freiburg/Strassburg/Colmar/Munich',
    description: 'A moving travel gallery through Freiburg, Strassburg, Colmar, and Munich.',
    locationLabel: 'Germany / France',
    coverPhotoId: 'big-4',
    altLabel: 'Freiburg, Strassburg, Colmar, and Munich',
  },
  {
    directory: 'barcelona',
    slug: 'barcelona',
    name: 'Barcelona',
    description: 'A moving travel gallery through Barcelona, Park Guell, Camp Nou, and Sagrada Familia.',
    locationLabel: 'Spain',
    coverPhotoId: 'full-sagrada',
    altLabel: 'Barcelona',
  },
];

function toTsString(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function toPosixPath(value) {
  return value.replaceAll('\\', '/');
}

function getImageFiles(catalogDir) {
  return readdirSync(catalogDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => collator.compare(a, b));
}

function readJpegDimensions(buffer, filePath) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error(`${filePath} is not a valid JPEG file.`);
  }

  let offset = 2;
  while (offset < buffer.length) {
    while (buffer[offset] === 0xff) {
      offset += 1;
    }

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (offset + 2 > buffer.length) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset);
    const isStartOfFrame = (
      (marker >= 0xc0 && marker <= 0xc3)
      || (marker >= 0xc5 && marker <= 0xc7)
      || (marker >= 0xc9 && marker <= 0xcb)
      || (marker >= 0xcd && marker <= 0xcf)
    );

    if (isStartOfFrame) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }

    offset += segmentLength;
  }

  throw new Error(`Could not read JPEG dimensions from ${filePath}.`);
}

function readPngDimensions(buffer, filePath) {
  const pngSignature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== pngSignature) {
    throw new Error(`${filePath} is not a valid PNG file.`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readImageDimensions(filePath) {
  const buffer = readFileSync(filePath);
  const extension = extname(filePath).toLowerCase();

  if (extension === '.jpg' || extension === '.jpeg') {
    return readJpegDimensions(buffer, filePath);
  }

  if (extension === '.png') {
    return readPngDimensions(buffer, filePath);
  }

  throw new Error(`Unsupported image type: ${filePath}`);
}

function getThumbnailDimensions(width, height) {
  const scale = Math.min(1, THUMB_MAX_EDGE / Math.max(width, height));

  return {
    thumbWidth: Math.round(width * scale),
    thumbHeight: Math.round(height * scale),
  };
}

function buildCatalog(config) {
  const catalogDir = resolve(PUBLIC_DIR, config.directory);
  const files = getImageFiles(catalogDir);

  if (files.length === 0) {
    throw new Error(`No images found in ${relative(ROOT, catalogDir)}.`);
  }

  const photos = files.map((fileName, index) => {
    const id = basename(fileName, extname(fileName));
    const { width, height } = readImageDimensions(resolve(catalogDir, fileName));
    const { thumbWidth, thumbHeight } = getThumbnailDimensions(width, height);

    return {
      id,
      alt: `${config.altLabel} travel photograph ${String(index + 1).padStart(2, '0')}`,
      originalSrc: `/${toPosixPath(join(config.directory, fileName))}`,
      thumbSrc: `/${toPosixPath(join(config.directory, 'thumbs', `${id}.webp`))}`,
      width,
      height,
      thumbWidth,
      thumbHeight,
    };
  });

  if (!photos.some((photo) => photo.id === config.coverPhotoId)) {
    throw new Error(`Cover photo ${config.coverPhotoId} was not found in ${relative(ROOT, catalogDir)}.`);
  }

  const missingThumbs = photos
    .map((photo) => photo.thumbSrc.slice(1))
    .filter((thumbPath) => !existsSync(resolve(PUBLIC_DIR, thumbPath)));

  if (missingThumbs.length > 0) {
    console.warn(
      `Missing ${missingThumbs.length} thumbnails for ${config.slug}. First missing: ${missingThumbs[0]}`,
    );
  }

  return {
    slug: config.slug,
    name: config.name,
    description: config.description,
    locationLabel: config.locationLabel,
    coverPhotoId: config.coverPhotoId,
    photos,
  };
}

function writeTypeDefinitions(lines) {
  lines.push('/* This file is generated by scripts/generate-photo-catalogs.mjs. */');
  lines.push('export type PhotoAsset = {');
  lines.push('  readonly id: string;');
  lines.push('  readonly alt: string;');
  lines.push('  readonly originalSrc: string;');
  lines.push('  readonly thumbSrc: string;');
  lines.push('  readonly width: number;');
  lines.push('  readonly height: number;');
  lines.push('  readonly thumbWidth: number;');
  lines.push('  readonly thumbHeight: number;');
  lines.push('};');
  lines.push('');
  lines.push('export type PhotoCatalog = {');
  lines.push('  readonly slug: string;');
  lines.push('  readonly name: string;');
  lines.push('  readonly description: string;');
  lines.push('  readonly locationLabel: string;');
  lines.push('  readonly coverPhotoId: string;');
  lines.push('  readonly photos: readonly PhotoAsset[];');
  lines.push('};');
  lines.push('');
}

function writePhoto(lines, photo) {
  lines.push('      {');
  lines.push(`        id: ${toTsString(photo.id)},`);
  lines.push(`        alt: ${toTsString(photo.alt)},`);
  lines.push(`        originalSrc: ${toTsString(photo.originalSrc)},`);
  lines.push(`        thumbSrc: ${toTsString(photo.thumbSrc)},`);
  lines.push(`        width: ${photo.width},`);
  lines.push(`        height: ${photo.height},`);
  lines.push(`        thumbWidth: ${photo.thumbWidth},`);
  lines.push(`        thumbHeight: ${photo.thumbHeight},`);
  lines.push('      },');
}

function writeCatalog(lines, catalog) {
  lines.push('  {');
  lines.push(`    slug: ${toTsString(catalog.slug)},`);
  lines.push(`    name: ${toTsString(catalog.name)},`);
  lines.push(`    description: ${toTsString(catalog.description)},`);
  lines.push(`    locationLabel: ${toTsString(catalog.locationLabel)},`);
  lines.push(`    coverPhotoId: ${toTsString(catalog.coverPhotoId)},`);
  lines.push('    photos: [');
  catalog.photos.forEach((photo) => writePhoto(lines, photo));
  lines.push('    ],');
  lines.push('  },');
}

const generatedCatalogs = catalogs.map((catalog) => buildCatalog(catalog));
const lines = [];

writeTypeDefinitions(lines);
lines.push('export const photoCatalogs = [');
generatedCatalogs.forEach((catalog) => writeCatalog(lines, catalog));
lines.push('] as const satisfies readonly PhotoCatalog[];');
lines.push('');

mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf-8');

const photoCount = generatedCatalogs.reduce((count, catalog) => count + catalog.photos.length, 0);
console.log(`Wrote ${toPosixPath(relative(ROOT, OUTPUT_FILE))} with ${generatedCatalogs.length} catalogs and ${photoCount} photos.`);
