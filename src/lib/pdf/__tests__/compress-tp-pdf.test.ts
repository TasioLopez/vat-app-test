import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  PDFArray,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  StandardFonts,
} from 'pdf-lib';
import sharp from 'sharp';
import {
  TP_PDF_MAX_BYTES,
  compressTpPdfImages,
  shrinkTrajectplanPdf,
} from '../compress-tp-pdf';

const A4: [number, number] = [595.28, 841.89];

function imageStreams(doc: PDFDocument): PDFRawStream[] {
  const images: PDFRawStream[] = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    if (obj.dict.lookup(PDFName.of('Subtype')) === PDFName.of('Image')) images.push(obj);
  }
  return images;
}

function imageSize(stream: PDFRawStream): { width: number; height: number } {
  const width = stream.dict.lookup(PDFName.of('Width'));
  const height = stream.dict.lookup(PDFName.of('Height'));
  assert.ok(width instanceof PDFNumber);
  assert.ok(height instanceof PDFNumber);
  return { width: width.asNumber(), height: height.asNumber() };
}

function pageContentBytes(doc: PDFDocument, pageIndex: number): Buffer {
  const contents = doc.getPage(pageIndex).node.Contents();
  const streams: PDFRawStream[] = [];
  if (contents instanceof PDFRawStream) streams.push(contents);
  else if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) {
      const item = contents.lookup(i);
      if (item instanceof PDFRawStream) streams.push(item);
    }
  }
  return Buffer.concat(streams.map((stream) => Buffer.from(stream.contents)));
}

function assertSameMediaBox(before: PDFDocument, after: PDFDocument) {
  assert.equal(after.getPageCount(), before.getPageCount());
  for (let i = 0; i < before.getPageCount(); i++) {
    const a = before.getPage(i).getMediaBox();
    const b = after.getPage(i).getMediaBox();
    assert.ok(Math.abs(a.x - b.x) < 0.01);
    assert.ok(Math.abs(a.y - b.y) < 0.01);
    assert.ok(Math.abs(a.width - b.width) < 0.01);
    assert.ok(Math.abs(a.height - b.height) < 0.01);
  }
}

describe('compressTpPdfImages', () => {
  it('shrinks a large JPEG and keeps the page box', async () => {
    const jpeg = await sharp({
      create: {
        width: 2400,
        height: 3400,
        channels: 3,
        noise: { type: 'gaussian', mean: 128, sigma: 40 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    const doc = await PDFDocument.create();
    const page = doc.addPage(A4);
    const image = await doc.embedJpg(jpeg);
    page.drawImage(image, { x: 0, y: 0, width: A4[0], height: A4[1] });
    const bytes = new Uint8Array(await doc.save());

    const compressed = await compressTpPdfImages(bytes, { jpegQuality: 70 });
    assert.ok(compressed.byteLength < bytes.byteLength);

    const before = await PDFDocument.load(bytes);
    const after = await PDFDocument.load(compressed);
    assertSameMediaBox(before, after);

    const images = imageStreams(after);
    assert.equal(images.length, 1);
    assert.equal(images[0].dict.lookup(PDFName.of('Filter')), PDFName.of('DCTDecode'));
    const size = imageSize(images[0]);
    assert.ok(size.width < 2400);
    assert.ok(size.height < 3400);
    assert.ok(images[0].dict.get(PDFName.of('SMask')) === undefined);
  });

  it('keeps an alpha mask when a transparent image is downsampled', async () => {
    const raw = crypto.randomBytes(800 * 800 * 4);
    const png = await sharp(raw, { raw: { width: 800, height: 800, channels: 4 } }).png().toBuffer();

    const doc = await PDFDocument.create();
    const page = doc.addPage(A4);
    const image = await doc.embedPng(png);
    page.drawImage(image, { x: 100, y: 400, width: 200, height: 200 });
    const bytes = new Uint8Array(await doc.save());

    const compressed = await compressTpPdfImages(bytes, { jpegQuality: 70 });
    const after = await PDFDocument.load(compressed);
    const before = await PDFDocument.load(bytes);
    assertSameMediaBox(before, after);

    const images = imageStreams(after).filter(
      (stream) => stream.dict.lookup(PDFName.of('ColorSpace')) === PDFName.of('DeviceRGB')
    );
    assert.equal(images.length, 1);
    const color = images[0];
    assert.equal(color.dict.lookup(PDFName.of('Filter')), PDFName.of('FlateDecode'));
    assert.ok(color.dict.get(PDFName.of('SMask')) !== undefined);
    const size = imageSize(color);
    assert.ok(size.width < 800);
    assert.ok(size.height < 800);

    const maskRef = color.dict.get(PDFName.of('SMask'));
    const mask = after.context.lookup(maskRef);
    assert.ok(mask instanceof PDFRawStream);
    assert.equal(mask.dict.lookup(PDFName.of('ColorSpace')), PDFName.of('DeviceGray'));
    assert.equal(imageSize(mask).width, size.width);
    assert.equal(imageSize(mask).height, size.height);
  });
});

describe('shrinkTrajectplanPdf', () => {
  it('returns a text-only PDF under the cap unchanged', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage(A4);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Trajectplan', { x: 48, y: 760, size: 12, font });
    const bytes = new Uint8Array(await doc.save());
    assert.ok(bytes.byteLength <= TP_PDF_MAX_BYTES);

    const out = await shrinkTrajectplanPdf(bytes);
    assert.deepEqual(out, bytes);
  });

  it('brings an oversized JPEG trajectplan under 500 KB without moving the page box', async () => {
    const jpeg = await sharp({
      create: {
        width: 2400,
        height: 3400,
        channels: 3,
        noise: { type: 'gaussian', mean: 128, sigma: 50 },
      },
    })
      .jpeg({ quality: 95 })
      .toBuffer();

    const doc = await PDFDocument.create();
    const page = doc.addPage(A4);
    const image = await doc.embedJpg(jpeg);
    page.drawImage(image, { x: 0, y: 0, width: A4[0], height: A4[1] });
    const bytes = new Uint8Array(await doc.save());
    assert.ok(bytes.byteLength > TP_PDF_MAX_BYTES);

    const out = await shrinkTrajectplanPdf(bytes);
    assert.ok(out.byteLength <= TP_PDF_MAX_BYTES);
    assertSameMediaBox(await PDFDocument.load(bytes), await PDFDocument.load(out));
  });

  it('keeps a non-image PDF over the cap instead of turning it into a photo', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage(A4);
    page.drawRectangle({ x: 10, y: 10, width: 20, height: 20, borderWidth: 1 });
    const loaded = await PDFDocument.load(await doc.save());
    const contents = loaded.getPage(0).node.Contents();
    const stream =
      contents instanceof PDFRawStream
        ? contents
        : contents instanceof PDFArray
          ? contents.lookup(0)
          : undefined;
    assert.ok(stream instanceof PDFRawStream);
    const payload = crypto.randomBytes(600 * 1024);
    (stream as unknown as { contents: Uint8Array }).contents = payload;
    stream.dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'));
    stream.dict.set(PDFName.of('Length'), PDFNumber.of(stream.contents.byteLength));
    const bloated = new Uint8Array(await loaded.save());
    assert.ok(bloated.byteLength > TP_PDF_MAX_BYTES);

    const out = await shrinkTrajectplanPdf(bloated);
    assert.ok(out.byteLength > TP_PDF_MAX_BYTES);
    const after = await PDFDocument.load(out);
    const before = await PDFDocument.load(bloated);
    assertSameMediaBox(before, after);
    assert.deepEqual(pageContentBytes(after, 0), pageContentBytes(before, 0));
    assert.equal(imageStreams(after).length, 0);
  });

  it('leaves the body page as text when the cover is snapshotted', async () => {
    const doc = await PDFDocument.create();
    const cover = doc.addPage(A4);
    cover.drawRectangle({ x: 10, y: 10, width: 20, height: 20, borderWidth: 1 });
    const body = doc.addPage(A4);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    body.drawText('Body line stays put.', { x: 48, y: 760, size: 12, font });
    const loaded = await PDFDocument.load(await doc.save());
    const contents = loaded.getPage(0).node.Contents();
    const stream =
      contents instanceof PDFRawStream
        ? contents
        : contents instanceof PDFArray
          ? contents.lookup(0)
          : undefined;
    assert.ok(stream instanceof PDFRawStream);
    (stream as unknown as { contents: Uint8Array }).contents = crypto.randomBytes(600 * 1024);
    stream.dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'));
    stream.dict.set(PDFName.of('Length'), PDFNumber.of(stream.contents.byteLength));
    const bloated = new Uint8Array(await loaded.save());
    assert.ok(bloated.byteLength > TP_PDF_MAX_BYTES);
    const bodyBefore = pageContentBytes(await PDFDocument.load(bloated), 1);

    const snapshot = await sharp({
      create: { width: 400, height: 560, channels: 3, background: { r: 207, g: 191, b: 141 } },
    })
      .jpeg({ quality: 80 })
      .toBuffer();

    const out = await shrinkTrajectplanPdf(bloated, {
      captureCover: async () => new Uint8Array(snapshot),
    });
    const after = await PDFDocument.load(out);
    assert.equal(after.getPageCount(), 2);
    assert.deepEqual(pageContentBytes(after, 1), bodyBefore);
    assert.ok(imageStreams(after).length >= 1);
  });
});
