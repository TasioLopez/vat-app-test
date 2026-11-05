import zlib from 'node:zlib';
import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFObject,
  PDFPage,
  PDFRawStream,
  PDFRef,
  PDFStream,
} from 'pdf-lib';
import sharp from 'sharp';

/** Hard cap for a downloaded trajectplan. 500 KiB. */
export const TP_PDF_MAX_BYTES = 500 * 1024;

/** Longest edge of a placed image, in samples per inch of that placement. */
const TARGET_DPI = 120;

const JPEG_QUALITIES = [70, 60, 45] as const;
const COVER_JPEG_QUALITIES = [70, 55, 40, 30] as const;
const PAGE_SCALES = [1, 0.75, 0.55, 0.4] as const;
const PAGE_JPEG_QUALITIES = [60, 40, 28, 18] as const;

const A4_LONG_PT = 841.89;

type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export type TpPdfCapture = {
  /**
   * JPEG of every `.print-page`, in order, at the size Chrome already painted.
   * Called only when shrinking images is not enough to get under the cap.
   */
  capturePrintPages: () => Promise<Uint8Array[]>;
};

type PlacedSize = { w: number; h: number };

/**
 * Shrink a trajectplan PDF to {@link TP_PDF_MAX_BYTES}.
 * Image samples are replaced inside the boxes Chrome already drew.
 * Page content streams, media boxes, and crop boxes stay as they are
 * until a page has to be snapshotted to get under the cap.
 */
export async function shrinkTrajectplanPdf(
  pdfBytes: Uint8Array,
  capture?: TpPdfCapture
): Promise<Uint8Array> {
  if (pdfBytes.byteLength <= TP_PDF_MAX_BYTES) return pdfBytes;

  let best = pdfBytes;
  for (const quality of JPEG_QUALITIES) {
    const out = await compressTpPdfImages(pdfBytes, { jpegQuality: quality });
    if (out.byteLength < best.byteLength) best = out;
    if (out.byteLength <= TP_PDF_MAX_BYTES) return out;
  }

  if (!capture) {
    throw new Error(
      `Trajectplan PDF is ${best.byteLength} bytes, over the ${TP_PDF_MAX_BYTES} byte cap`
    );
  }

  const masters = await capture.capturePrintPages();
  if (masters.length === 0) {
    throw new Error('Trajectplan print page did not produce a snapshot');
  }

  for (const quality of COVER_JPEG_QUALITIES) {
    const cover = await recompressJpeg(masters[0], quality, 1);
    const replaced = await replacePageWithJpeg(pdfBytes, 0, cover);
    const out = await compressTpPdfImages(replaced, { jpegQuality: quality });
    if (out.byteLength < best.byteLength) best = out;
    if (out.byteLength <= TP_PDF_MAX_BYTES) return out;
  }

  for (const scale of PAGE_SCALES) {
    for (const quality of PAGE_JPEG_QUALITIES) {
      const jpegs = await Promise.all(
        masters.map((master) => recompressJpeg(master, quality, scale))
      );
      const out = await rebuildPdfFromPageJpegs(pdfBytes, jpegs);
      if (out.byteLength < best.byteLength) best = out;
      if (out.byteLength <= TP_PDF_MAX_BYTES) return out;
    }
  }

  throw new Error(
    `Trajectplan PDF is ${best.byteLength} bytes after compression, over the ${TP_PDF_MAX_BYTES} byte cap`
  );
}

export async function compressTpPdfImages(
  pdfBytes: Uint8Array,
  options?: { jpegQuality?: number }
): Promise<Uint8Array> {
  const jpegQuality = options?.jpegQuality ?? JPEG_QUALITIES[0];
  const doc = await PDFDocument.load(pdfBytes);
  const placed = measureImagePlacements(doc);
  const maskRefs = collectSoftMaskRefs(doc);
  let changed = false;

  for (const [ref, stream] of imageEntries(doc)) {
    if (maskRefs.has(refKey(ref))) continue;
    if (stream.dict.lookup(PDFName.of('ImageMask')) === PDFBool.True) continue;
    if (hasNonDefaultDecode(stream)) continue;

    try {
      const did = await recompressImage(doc, stream, placed.get(refKey(ref)), jpegQuality);
      if (did) changed = true;
    } catch {
      // Leave streams sharp cannot decode exactly as Chrome wrote them.
    }
  }

  if (!changed) return pdfBytes;
  const saved = new Uint8Array(await doc.save());
  return saved.byteLength < pdfBytes.byteLength ? saved : pdfBytes;
}

async function recompressImage(
  doc: PDFDocument,
  stream: PDFRawStream,
  placed: PlacedSize | undefined,
  jpegQuality: number
): Promise<boolean> {
  const srcW = dictNumber(stream.dict, 'Width');
  const srcH = dictNumber(stream.dict, 'Height');
  if (!srcW || !srcH) return false;

  const target = targetPixelSize(placed, srcW, srcH);
  const smaskRef = softMaskRef(stream);
  const smask = smaskRef ? (doc.context.lookup(smaskRef) as PDFObject) : undefined;
  const maskStream = smask instanceof PDFRawStream ? smask : undefined;

  if (maskStream) {
    return recompressWithMask(stream, maskStream, srcW, srcH, target);
  }

  if (isJpegStream(stream)) {
    const next = await sharp(Buffer.from(stream.contents))
      .resize({ width: target.w, height: target.h, fit: 'fill', withoutEnlargement: true })
      .jpeg({ quality: jpegQuality })
      .toBuffer();
    if (next.byteLength >= stream.contents.byteLength) return false;
    const meta = await sharp(next).metadata();
    writeJpegStream(stream, next, meta.width ?? target.w, meta.height ?? target.h);
    return true;
  }

  const raw = decodeFlateImage(stream);
  if (!raw) return false;
  if (raw.channels !== 1 && raw.channels !== 3) return false;

  const next = await sharp(Buffer.from(raw.pixels), {
    raw: { width: srcW, height: srcH, channels: raw.channels },
  })
    .resize({ width: target.w, height: target.h, fit: 'fill', withoutEnlargement: true })
    .jpeg({ quality: jpegQuality })
    .toBuffer();

  if (next.byteLength >= stream.contents.byteLength) return false;

  const meta = await sharp(next).metadata();
  writeJpegStream(stream, next, meta.width ?? target.w, meta.height ?? target.h);
  return true;
}

async function recompressWithMask(
  color: PDFRawStream,
  mask: PDFRawStream,
  srcW: number,
  srcH: number,
  target: { w: number; h: number }
): Promise<boolean> {
  const maskW = dictNumber(mask.dict, 'Width');
  const maskH = dictNumber(mask.dict, 'Height');
  if (maskW !== srcW || maskH !== srcH) return false;

  let rgb: Uint8Array;
  if (isJpegStream(color)) {
    const { data, info } = await sharp(Buffer.from(color.contents))
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.width !== srcW || info.height !== srcH || info.channels < 3) return false;
    const rgbOnly = new Uint8Array(srcW * srcH * 3);
    for (let px = 0, o = 0; px < srcW * srcH; px++) {
      rgbOnly[o++] = data[px * info.channels];
      rgbOnly[o++] = data[px * info.channels + 1];
      rgbOnly[o++] = data[px * info.channels + 2];
    }
    rgb = rgbOnly;
  } else {
    const decoded = decodeFlateImage(color);
    if (!decoded || decoded.channels !== 3) return false;
    rgb = decoded.pixels;
  }

  const decodedMask = decodeFlateImage(mask);
  if (!decodedMask || decodedMask.channels !== 1) return false;

  const rgba = new Uint8Array(srcW * srcH * 4);
  for (let px = 0; px < srcW * srcH; px++) {
    rgba[px * 4] = rgb[px * 3];
    rgba[px * 4 + 1] = rgb[px * 3 + 1];
    rgba[px * 4 + 2] = rgb[px * 3 + 2];
    rgba[px * 4 + 3] = decodedMask.pixels[px];
  }

  const resized = await sharp(Buffer.from(rgba), {
    raw: { width: srcW, height: srcH, channels: 4 },
  })
    .resize({ width: target.w, height: target.h, fit: 'fill', withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = resized.info.width;
  const h = resized.info.height;
  if (w === srcW && h === srcH) return false;

  const outRgb = Buffer.alloc(w * h * 3);
  const outMask = Buffer.alloc(w * h);
  for (let px = 0; px < w * h; px++) {
    outRgb[px * 3] = resized.data[px * 4];
    outRgb[px * 3 + 1] = resized.data[px * 4 + 1];
    outRgb[px * 3 + 2] = resized.data[px * 4 + 2];
    outMask[px] = resized.data[px * 4 + 3];
  }

  const colorBytes = zlib.deflateSync(outRgb);
  const maskBytes = zlib.deflateSync(outMask);
  if (colorBytes.byteLength + maskBytes.byteLength >= color.contents.byteLength + mask.contents.byteLength) {
    return false;
  }

  writeFlateSamples(color, colorBytes, w, h, 3);
  writeFlateSamples(mask, maskBytes, w, h, 1);
  return true;
}

function writeJpegStream(stream: PDFRawStream, jpeg: Buffer, width: number, height: number) {
  setStreamContents(stream, new Uint8Array(jpeg));
  stream.dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
  stream.dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
  stream.dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
  stream.dict.set(PDFName.of('Width'), PDFNumber.of(width));
  stream.dict.set(PDFName.of('Height'), PDFNumber.of(height));
  stream.dict.delete(PDFName.of('DecodeParms'));
  stream.dict.delete(PDFName.of('Decode'));
}

function writeFlateSamples(
  stream: PDFRawStream,
  deflated: Buffer,
  width: number,
  height: number,
  channels: number
) {
  setStreamContents(stream, new Uint8Array(deflated));
  stream.dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'));
  stream.dict.set(
    PDFName.of('ColorSpace'),
    channels === 1 ? PDFName.of('DeviceGray') : PDFName.of('DeviceRGB')
  );
  stream.dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
  stream.dict.set(PDFName.of('Width'), PDFNumber.of(width));
  stream.dict.set(PDFName.of('Height'), PDFNumber.of(height));
  stream.dict.delete(PDFName.of('DecodeParms'));
  stream.dict.delete(PDFName.of('Decode'));
}

export async function replacePageWithJpeg(
  pdfBytes: Uint8Array,
  pageIndex: number,
  jpegBytes: Uint8Array
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPage(pageIndex);
  const box = page.getMediaBox();
  detachPageContents(doc, page);
  detachPageResources(doc, page);
  const image = await doc.embedJpg(jpegBytes);
  page.drawImage(image, { x: box.x, y: box.y, width: box.width, height: box.height });
  deleteUnreferencedXObjects(doc);
  return new Uint8Array(await doc.save());
}

export async function rebuildPdfFromPageJpegs(
  pdfBytes: Uint8Array,
  jpegs: Uint8Array[]
): Promise<Uint8Array> {
  const src = await PDFDocument.load(pdfBytes);
  if (src.getPageCount() !== jpegs.length) {
    throw new Error(
      `Expected ${src.getPageCount()} trajectplan page snapshots, received ${jpegs.length}`
    );
  }
  const doc = await PDFDocument.create();
  for (let i = 0; i < jpegs.length; i++) {
    const box = src.getPage(i).getMediaBox();
    const page = doc.addPage([box.width, box.height]);
    const image = await doc.embedJpg(jpegs[i]);
    page.drawImage(image, { x: 0, y: 0, width: box.width, height: box.height });
  }
  return new Uint8Array(await doc.save());
}

async function recompressJpeg(master: Uint8Array, quality: number, scale: number): Promise<Uint8Array> {
  let pipeline = sharp(Buffer.from(master));
  if (scale < 0.999) {
    const meta = await sharp(Buffer.from(master)).metadata();
    const width = Math.max(1, Math.round((meta.width ?? 1) * scale));
    pipeline = sharp(Buffer.from(master)).resize({ width });
  }
  return new Uint8Array(await pipeline.jpeg({ quality }).toBuffer());
}

function targetPixelSize(
  placed: PlacedSize | undefined,
  srcW: number,
  srcH: number
): { w: number; h: number } {
  const wantW =
    placed && placed.w >= 1
      ? Math.max(1, Math.round((placed.w / 72) * TARGET_DPI))
      : Math.round((A4_LONG_PT / 72) * TARGET_DPI);
  const wantH =
    placed && placed.h >= 1
      ? Math.max(1, Math.round((placed.h / 72) * TARGET_DPI))
      : Math.round((A4_LONG_PT / 72) * TARGET_DPI);
  const scale = Math.min(1, wantW / srcW, wantH / srcH);
  return {
    w: Math.max(1, Math.round(srcW * scale)),
    h: Math.max(1, Math.round(srcH * scale)),
  };
}

function measureImagePlacements(doc: PDFDocument): Map<string, PlacedSize> {
  const sizes = new Map<string, PlacedSize>();
  for (const page of doc.getPages()) {
    const resources = page.node.Resources();
    for (const stream of pageContentStreams(page)) {
      try {
        walkContent(doc, stream, resources, IDENTITY, sizes, new Set());
      } catch {
        // A content stream that cannot be tokenized keeps the full-page pixel cap.
      }
    }
  }
  return sizes;
}

function walkContent(
  doc: PDFDocument,
  stream: PDFRawStream,
  resources: PDFDict | undefined,
  ctm: Matrix,
  sizes: Map<string, PlacedSize>,
  stack: Set<string>
) {
  const decoded = decodeStreamBytes(stream);
  if (!decoded) return;
  const ops = tokenizeContent(latin1(decoded));
  const saved: Matrix[] = [];
  let current = ctm;

  for (const { op, args } of ops) {
    if (op === 'q') {
      saved.push(current);
      continue;
    }
    if (op === 'Q') {
      current = saved.pop() ?? current;
      continue;
    }
    if (op === 'cm') {
      const nums = args.slice(-6);
      if (nums.length === 6 && nums.every((n) => typeof n === 'number')) {
        current = multiply(current, nums as Matrix);
      }
      continue;
    }
    if (op !== 'Do') continue;

    const nameArg = [...args].reverse().find((arg) => typeof arg === 'string' && arg.startsWith('/'));
    if (typeof nameArg !== 'string') continue;
    const xobjects = resources?.lookupMaybe(PDFName.of('XObject'), PDFDict);
    if (!xobjects) continue;
    const raw = xobjects.get(PDFName.of(nameArg.slice(1)));
    if (!(raw instanceof PDFRef)) continue;

    const key = refKey(raw);
    const obj = doc.context.lookup(raw);
    if (!(obj instanceof PDFRawStream)) continue;
    const subtype = obj.dict.lookup(PDFName.of('Subtype'));
    if (subtype === PDFName.of('Image')) {
      const size = unitSquareSize(current);
      const prev = sizes.get(key);
      sizes.set(key, {
        w: Math.max(prev?.w ?? 0, size.w),
        h: Math.max(prev?.h ?? 0, size.h),
      });
      continue;
    }
    if (subtype === PDFName.of('Form') && !stack.has(key)) {
      stack.add(key);
      const formResources = obj.dict.lookupMaybe(PDFName.of('Resources'), PDFDict) ?? resources;
      walkContent(doc, obj, formResources, multiply(current, readMatrix(obj.dict)), sizes, stack);
      stack.delete(key);
    }
  }
}

function tokenizeContent(src: string): Array<{ op: string; args: Array<number | string> }> {
  const ops: Array<{ op: string; args: Array<number | string> }> = [];
  const args: Array<number | string> = [];
  let i = 0;
  const n = src.length;

  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f' || c === '\0') {
      i++;
      continue;
    }
    if (c === '%') {
      while (i < n && src[i] !== '\n' && src[i] !== '\r') i++;
      continue;
    }
    if (c === '(') {
      i++;
      let depth = 1;
      while (i < n && depth > 0) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === '(') depth++;
        else if (src[i] === ')') depth--;
        i++;
      }
      continue;
    }
    if (c === '<' && src[i + 1] === '<') {
      i += 2;
      let depth = 1;
      while (i < n && depth > 0) {
        if (src[i] === '<' && src[i + 1] === '<') {
          depth++;
          i += 2;
          continue;
        }
        if (src[i] === '>' && src[i + 1] === '>') {
          depth--;
          i += 2;
          continue;
        }
        i++;
      }
      continue;
    }
    if (c === '<') {
      i++;
      while (i < n && src[i] !== '>') i++;
      i++;
      continue;
    }
    if (c === '[' || c === ']') {
      i++;
      continue;
    }
    if (c === '/') {
      i++;
      let name = '';
      while (i < n && !isDelimiter(src[i])) {
        name += src[i];
        i++;
      }
      args.push(`/${name}`);
      continue;
    }
    if (c === '-' || c === '+' || c === '.' || (c >= '0' && c <= '9')) {
      let j = i + 1;
      while (j < n && /[0-9.eE]/.test(src[j])) j++;
      const num = Number(src.slice(i, j));
      if (!Number.isNaN(num)) args.push(num);
      i = j;
      continue;
    }

    let j = i;
    while (j < n && !isDelimiter(src[j])) j++;
    const op = src.slice(i, j);
    i = j;
    if (op === 'BI') {
      const end = src.indexOf('EI', i);
      i = end === -1 ? n : end + 2;
      args.length = 0;
      continue;
    }
    ops.push({ op, args: args.splice(0, args.length) });
  }
  return ops;
}

function isDelimiter(char: string): boolean {
  const code = char.charCodeAt(0);
  return code <= 32 || '/[]()<>{}%'.includes(char);
}

function multiply(m1: Matrix, m2: Matrix): Matrix {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

function unitSquareSize(ctm: Matrix): PlacedSize {
  return { w: Math.hypot(ctm[0], ctm[1]), h: Math.hypot(ctm[2], ctm[3]) };
}

function readMatrix(dict: PDFDict): Matrix {
  const arr = dict.lookup(PDFName.of('Matrix'));
  if (!(arr instanceof PDFArray) || arr.size() < 6) return IDENTITY;
  const nums: number[] = [];
  for (let i = 0; i < 6; i++) {
    const n = arr.lookup(i);
    nums.push(n instanceof PDFNumber ? n.asNumber() : 0);
  }
  return nums as Matrix;
}

type DecodedSamples = { pixels: Uint8Array; channels: number };

function decodeFlateImage(stream: PDFRawStream): DecodedSamples | null {
  const width = dictNumber(stream.dict, 'Width');
  const height = dictNumber(stream.dict, 'Height');
  const bpc = dictNumber(stream.dict, 'BitsPerComponent') ?? 8;
  if (!width || !height || bpc !== 8) return null;
  if (isJpegStream(stream)) return null;

  const channels = colorChannels(stream.dict);
  if (!channels) return null;

  const inflated = decodeStreamBytes(stream);
  if (!inflated) return null;

  const parms = decodeParms(stream.dict);
  const predictor = parms ? (dictNumber(parms, 'Predictor') ?? 1) : 1;
  const colors = parms ? (dictNumber(parms, 'Colors') ?? channels) : channels;
  const columns = parms ? (dictNumber(parms, 'Columns') ?? width) : width;
  const rowBytes = Math.ceil((columns * colors * bpc) / 8);
  if (colors !== channels || rowBytes !== width * channels) return null;

  let pixels: Uint8Array;
  if (predictor >= 10) {
    if (inflated.byteLength !== height * (rowBytes + 1)) return null;
    pixels = unfilterPng(inflated, height, rowBytes, colors);
  } else if (predictor === 2) {
    if (inflated.byteLength !== height * rowBytes) return null;
    pixels = unfilterTiff(inflated, height, rowBytes, colors);
  } else if (predictor === 1) {
    if (inflated.byteLength !== height * rowBytes) return null;
    pixels = inflated;
  } else {
    return null;
  }

  return { pixels, channels };
}

function unfilterPng(data: Uint8Array, height: number, rowBytes: number, bpp: number): Uint8Array {
  const out = new Uint8Array(height * rowBytes);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = data[pos++];
    const row = y * rowBytes;
    for (let x = 0; x < rowBytes; x++) {
      const raw = data[pos++];
      const left = x >= bpp ? out[row + x - bpp] : 0;
      const up = y > 0 ? out[row - rowBytes + x] : 0;
      const upLeft = y > 0 && x >= bpp ? out[row - rowBytes + x - bpp] : 0;
      let value = raw;
      if (filter === 1) value = (raw + left) & 255;
      else if (filter === 2) value = (raw + up) & 255;
      else if (filter === 3) value = (raw + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (raw + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`Unsupported PNG predictor filter ${filter}`);
      out[row + x] = value;
    }
  }
  return out;
}

function unfilterTiff(data: Uint8Array, height: number, rowBytes: number, bpp: number): Uint8Array {
  const out = new Uint8Array(data);
  for (let y = 0; y < height; y++) {
    const row = y * rowBytes;
    for (let x = bpp; x < rowBytes; x++) {
      out[row + x] = (out[row + x] + out[row + x - bpp]) & 255;
    }
  }
  return out;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function colorChannels(dict: PDFDict): number | null {
  const cs = dict.lookup(PDFName.of('ColorSpace'));
  if (cs === PDFName.of('DeviceRGB') || cs === PDFName.of('CalRGB')) return 3;
  if (cs === PDFName.of('DeviceGray') || cs === PDFName.of('CalGray')) return 1;
  if (cs instanceof PDFArray && cs.size() >= 2) {
    const kind = cs.lookup(0);
    if (kind === PDFName.of('ICCBased')) {
      const profile = cs.lookup(1);
      if (profile instanceof PDFRawStream) {
        const n = profile.dict.lookup(PDFName.of('N'));
        if (n instanceof PDFNumber) return n.asNumber();
      }
    }
    if (kind === PDFName.of('CalRGB')) return 3;
    if (kind === PDFName.of('CalGray')) return 1;
  }
  return null;
}

function decodeStreamBytes(stream: PDFRawStream): Uint8Array | null {
  const filter = stream.dict.lookup(PDFName.of('Filter'));
  if (!filter) return stream.contents;
  if (filter === PDFName.of('FlateDecode')) {
    try {
      return zlib.inflateSync(stream.contents);
    } catch {
      return null;
    }
  }
  if (filter instanceof PDFArray && filter.size() === 1 && filter.lookup(0) === PDFName.of('FlateDecode')) {
    try {
      return zlib.inflateSync(stream.contents);
    } catch {
      return null;
    }
  }
  return null;
}

function isJpegStream(stream: PDFRawStream): boolean {
  const filter = stream.dict.lookup(PDFName.of('Filter'));
  if (filter === PDFName.of('DCTDecode')) return true;
  return stream.contents.length > 2 && stream.contents[0] === 0xff && stream.contents[1] === 0xd8;
}

function decodeParms(dict: PDFDict): PDFDict | undefined {
  const parms = dict.lookup(PDFName.of('DecodeParms'));
  if (parms instanceof PDFDict) return parms;
  if (parms instanceof PDFArray && parms.size() > 0) {
    const first = parms.lookup(0);
    if (first instanceof PDFDict) return first;
  }
  return undefined;
}

function hasNonDefaultDecode(stream: PDFRawStream): boolean {
  const decode = stream.dict.lookup(PDFName.of('Decode'));
  if (!(decode instanceof PDFArray)) return false;
  for (let i = 0; i < decode.size(); i++) {
    const n = decode.lookup(i);
    const expected = i % 2 === 0 ? 0 : 1;
    if (!(n instanceof PDFNumber) || n.asNumber() !== expected) return true;
  }
  return false;
}

function softMaskRef(stream: PDFRawStream): PDFRef | undefined {
  const raw = stream.dict.get(PDFName.of('SMask'));
  return raw instanceof PDFRef ? raw : undefined;
}

function collectSoftMaskRefs(doc: PDFDocument): Set<string> {
  const refs = new Set<string>();
  for (const [, stream] of imageEntries(doc)) {
    const mask = softMaskRef(stream);
    if (mask) refs.add(refKey(mask));
  }
  return refs;
}

function imageEntries(doc: PDFDocument): Array<[PDFRef, PDFRawStream]> {
  const images: Array<[PDFRef, PDFRawStream]> = [];
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    if (obj.dict.lookup(PDFName.of('Subtype')) !== PDFName.of('Image')) continue;
    images.push([ref, obj]);
  }
  return images;
}

function pageContentStreams(page: PDFPage): PDFRawStream[] {
  const contents = page.node.Contents();
  if (!contents) return [];
  if (contents instanceof PDFRawStream) return [contents];
  if (contents instanceof PDFArray) {
    const streams: PDFRawStream[] = [];
    for (let i = 0; i < contents.size(); i++) {
      const item = contents.lookup(i);
      if (item instanceof PDFRawStream) streams.push(item);
    }
    return streams;
  }
  return [];
}

function detachPageContents(doc: PDFDocument, page: PDFPage) {
  const raw = page.node.get(PDFName.Contents);
  const counts = contentRefCounts(doc);
  page.node.delete(PDFName.Contents);

  if (raw instanceof PDFRef) {
    const resolved = doc.context.lookup(raw);
    if (resolved instanceof PDFArray) {
      for (const streamRef of refsInArray(resolved)) {
        if ((counts.get(refKey(streamRef)) ?? 0) <= 1) doc.context.delete(streamRef);
      }
      doc.context.delete(raw);
      return;
    }
    if ((counts.get(refKey(raw)) ?? 0) <= 1) doc.context.delete(raw);
    return;
  }

  if (raw instanceof PDFArray) {
    for (const streamRef of refsInArray(raw)) {
      if ((counts.get(refKey(streamRef)) ?? 0) <= 1) doc.context.delete(streamRef);
    }
  }
}

function detachPageResources(doc: PDFDocument, page: PDFPage) {
  const raw = page.node.get(PDFName.Resources);
  const users = resourceRefCounts(doc);
  page.node.set(PDFName.Resources, doc.context.obj({}));
  if (raw instanceof PDFRef && (users.get(refKey(raw)) ?? 0) <= 1) {
    doc.context.delete(raw);
  }
}

function contentRefCounts(doc: PDFDocument): Map<string, number> {
  const counts = new Map<string, number>();
  for (const page of doc.getPages()) {
    for (const ref of contentRefs(page.node.get(PDFName.Contents), doc)) {
      const key = refKey(ref);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function contentRefs(raw: PDFObject | undefined, doc: PDFDocument): PDFRef[] {
  if (raw instanceof PDFRef) {
    const resolved = doc.context.lookup(raw);
    if (resolved instanceof PDFArray) return refsInArray(resolved);
    return [raw];
  }
  if (raw instanceof PDFArray) return refsInArray(raw);
  return [];
}

function refsInArray(array: PDFArray): PDFRef[] {
  const refs: PDFRef[] = [];
  for (let i = 0; i < array.size(); i++) {
    const item = array.get(i);
    if (item instanceof PDFRef) refs.push(item);
  }
  return refs;
}

function resourceRefCounts(doc: PDFDocument): Map<string, number> {
  const counts = new Map<string, number>();
  for (const page of doc.getPages()) {
    const raw = page.node.get(PDFName.Resources);
    if (raw instanceof PDFRef) {
      const key = refKey(raw);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function deleteUnreferencedXObjects(doc: PDFDocument) {
  for (let pass = 0; pass < 4; pass++) {
    const referenced = new Set<string>();
    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
      collectRefs(obj, referenced);
    }
    collectRefs(doc.catalog, referenced);

    let removed = false;
    for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
      if (!isDroppableXObject(obj)) continue;
      if (referenced.has(refKey(ref))) continue;
      doc.context.delete(ref);
      removed = true;
    }
    if (!removed) break;
  }
}

function isDroppableXObject(obj: PDFObject): boolean {
  if (!(obj instanceof PDFRawStream)) return false;
  const subtype = obj.dict.lookup(PDFName.of('Subtype'));
  return subtype === PDFName.of('Image') || subtype === PDFName.of('Form');
}

function collectRefs(obj: PDFObject | undefined, into: Set<string>, seen = new Set<PDFObject>()) {
  if (!obj || seen.has(obj)) return;
  seen.add(obj);
  if (obj instanceof PDFRef) {
    into.add(refKey(obj));
    return;
  }
  if (obj instanceof PDFArray) {
    for (let i = 0; i < obj.size(); i++) collectRefs(obj.get(i), into, seen);
    return;
  }
  if (obj instanceof PDFStream || obj instanceof PDFDict) {
    const dict = obj instanceof PDFDict ? obj : obj.dict;
    for (const [, value] of dict.entries()) collectRefs(value, into, seen);
  }
}

function dictNumber(dict: PDFDict, key: string): number | undefined {
  const value = dict.lookup(PDFName.of(key));
  return value instanceof PDFNumber ? value.asNumber() : undefined;
}

function refKey(ref: PDFRef): string {
  return `${ref.objectNumber}:${ref.generationNumber}`;
}

function setStreamContents(stream: PDFRawStream, bytes: Uint8Array) {
  (stream as unknown as { contents: Uint8Array }).contents = bytes;
}

function latin1(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('latin1');
}
