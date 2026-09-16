import { PdfModifierService } from './pdf-modifier.service';
import { StorageService } from './storage.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('PdfModifierService', () => {
  let service: PdfModifierService;
  let storageService: jest.Mocked<StorageService>;
  const tempFiles: string[] = [];

  beforeEach(() => {
    storageService = {
      getFullPath: jest.fn((filename: string) => path.resolve('./test-temp', filename)),
    } as any;
    service = new PdfModifierService(storageService);
  });

  afterAll(async () => {
    for (const f of tempFiles) {
      await fs.unlink(f).catch(() => undefined);
    }
  });

  it('should add signature without error and position it on the document', async () => {
    const tempDir = path.resolve('./test-temp');
    await fs.mkdir(tempDir, { recursive: true });

    // Create a dummy PDF with 1 page
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText('Test auto content at the top', {
      x: 50,
      y: 700,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();
    const testPdfPath = path.join(tempDir, `test-sig-${Date.now()}.pdf`);
    await fs.writeFile(testPdfPath, pdfBytes);
    tempFiles.push(testPdfPath);

    storageService.getFullPath.mockImplementation((name: string) => {
      if (name.includes('firma_jefe')) {
        return path.join(tempDir, 'non_existent_firma.png');
      }
      return testPdfPath;
    });

    await service.addSignature(path.basename(testPdfPath), 'Dr. Juan Pérez', 'Jefe Oficina');

    // Read back modified PDF
    const modifiedBytes = await fs.readFile(testPdfPath);
    const modifiedDoc = await PDFDocument.load(modifiedBytes);
    expect(modifiedDoc.getPageCount()).toBe(1);
  });

  it('should add consecutive on the top-right corner of the first page', async () => {
    const tempDir = path.resolve('./test-temp');
    await fs.mkdir(tempDir, { recursive: true });

    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595, 842]);
    const pdfBytes = await pdfDoc.save();
    const testPdfPath = path.join(tempDir, `test-consec-${Date.now()}.pdf`);
    await fs.writeFile(testPdfPath, pdfBytes);
    tempFiles.push(testPdfPath);

    storageService.getFullPath.mockReturnValue(testPdfPath);

    await service.addConsecutive(path.basename(testPdfPath), 'AUTO-00099');

    const modifiedBytes = await fs.readFile(testPdfPath);
    const modifiedDoc = await PDFDocument.load(modifiedBytes);
    expect(modifiedDoc.getPageCount()).toBe(1);
  });
});
