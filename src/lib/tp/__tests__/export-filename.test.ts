import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTpDownloadFilename,
  buildVgrDownloadFilename,
  contentDispositionAttachment,
  formatExportPersonLabel,
  resolveExportNameParts,
  sanitizeDownloadFilename,
} from '../export-filename';

describe('formatExportPersonLabel', () => {
  it('formats male with de heer', () => {
    assert.equal(
      formatExportPersonLabel('John', 'Doe', 'Man'),
      'de heer J. Doe (John)'
    );
  });

  it('formats female with mevrouw', () => {
    assert.equal(
      formatExportPersonLabel('Kim ', 'Baaijens ', 'Vrouw'),
      'mevrouw K. Baaijens (Kim)'
    );
  });

  it('omits title when gender unknown', () => {
    assert.equal(
      formatExportPersonLabel('John', 'Doe', null),
      'J. Doe (John)'
    );
  });

  it('returns null when a name part is missing', () => {
    assert.equal(formatExportPersonLabel('John', '', 'Man'), null);
    assert.equal(formatExportPersonLabel(null, 'Doe', 'Man'), null);
  });

  it('keeps Dutch particles in last name', () => {
    assert.equal(
      formatExportPersonLabel('Calvin', 'van Lambaart', 'Man'),
      'de heer C. van Lambaart (Calvin)'
    );
  });
});

describe('buildTpDownloadFilename', () => {
  it('builds full TP name', () => {
    assert.equal(
      buildTpDownloadFilename('John', 'Doe', 'Man'),
      'Trajectplan tweede spoor begeleiding de heer J. Doe (John).pdf'
    );
  });

  it('falls back without person label', () => {
    assert.equal(
      buildTpDownloadFilename(null, null, null),
      'Trajectplan tweede spoor begeleiding.pdf'
    );
  });
});

describe('buildVgrDownloadFilename', () => {
  it('builds full VGR name', () => {
    assert.equal(
      buildVgrDownloadFilename('John', 'Doe', 'Man'),
      'Voortgangsrapportage de heer J. Doe (John).pdf'
    );
  });

  it('falls back without person label', () => {
    assert.equal(
      buildVgrDownloadFilename('', '', null),
      'Voortgangsrapportage.pdf'
    );
  });
});

describe('sanitizeDownloadFilename', () => {
  it('keeps spaces and parentheses', () => {
    assert.equal(
      sanitizeDownloadFilename(
        'Trajectplan tweede spoor begeleiding de heer J. Doe (John).pdf'
      ),
      'Trajectplan tweede spoor begeleiding de heer J. Doe (John).pdf'
    );
  });

  it('strips path separators', () => {
    assert.equal(
      sanitizeDownloadFilename('foo/bar\\baz.pdf'),
      'foobarbaz.pdf'
    );
  });

  it('appends .pdf when missing', () => {
    assert.equal(sanitizeDownloadFilename('Report'), 'Report.pdf');
  });
});

describe('resolveExportNameParts', () => {
  it('prefers profile over snapshot', () => {
    assert.deepEqual(
      resolveExportNameParts(
        { first_name: 'John', last_name: 'Doe', gender: 'Man' },
        { first_name: 'Other', last_name: 'Name', gender: 'Vrouw' }
      ),
      { first_name: 'John', last_name: 'Doe', gender: 'Man' }
    );
  });

  it('fills gaps from snapshot', () => {
    assert.deepEqual(
      resolveExportNameParts(
        { first_name: null, last_name: null, gender: null },
        { first_name: 'Kim', last_name: 'Baaijens', gender: 'Vrouw' }
      ),
      { first_name: 'Kim', last_name: 'Baaijens', gender: 'Vrouw' }
    );
  });
});

describe('contentDispositionAttachment', () => {
  it('includes filename and filename*', () => {
    const header = contentDispositionAttachment(
      'Voortgangsrapportage mevrouw K. Baaijens (Kim).pdf'
    );
    assert.match(header, /^attachment; filename="/);
    assert.match(header, /filename\*=UTF-8''/);
  });
});
