import PDFDocument = require('pdfkit');
import { PazYSalvoPdfService } from './paz-y-salvo-pdf.service';

describe('EFDS-1311 :: fecha legal del PDF en Colombia', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each([
    ['2026-10-03T00:30:00.000Z', '02/10/2026, 19:30:00'],
    ['2026-10-03T04:59:59.000Z', '02/10/2026, 23:59:59'],
    ['2026-10-03T05:00:00.000Z', '03/10/2026, 00:00:00'],
    ['2027-01-01T01:15:00.000Z', '31/12/2026, 20:15:00'],
  ])('AC-01 :: imprime %s como %s sin alterar evidencia UTC', async (fechaFirma, esperada) => {
    const text = jest.spyOn(PDFDocument.prototype, 'text');
    const firma = { id: 'OTP-TEST', email: 'test@example.invalid', fechaFirma,
      metodo: 'OTP_EMAIL' as const, context: 'contexto' };
    const bytes = await new PazYSalvoPdfService().generar({
      id: 'test', comisionadoId: 'persona', nombre: 'Persona prueba', documento: '9001',
      coordinadoraId: 'coordinacion', coordinadoraNombre: 'Firma prueba', solicitadoEn: fechaFirma,
    }, firma, 'a'.repeat(64));
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(text).toHaveBeenCalledWith(`Fecha: ${esperada} (hora de Colombia)`);
    expect(text).not.toHaveBeenCalledWith(`Fecha: ${fechaFirma}`);
    expect(firma.fechaFirma).toBe(fechaFirma);
  });
});
