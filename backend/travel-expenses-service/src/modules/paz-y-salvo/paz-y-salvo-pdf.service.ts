import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { ContenidoPazYSalvo, FirmaOtp } from './paz-y-salvo.model';

/** Patrón visual del PDF existente, sin modificar TravelExpensesService. */
@Injectable()
export class PazYSalvoPdfService {
  generar(contenido: ContenidoPazYSalvo, firma: FirmaOtp, hash: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'letter' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#003DA5')
        .text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP', { align: 'center' });
      doc.font('Helvetica').fontSize(9).fillColor('#333333')
        .text('Subdirección de Gestión Corporativa · Módulo de Viáticos', { align: 'center' })
        .text('PBX: +57 (1) 220 2790 · www.esap.edu.co', { align: 'center' });
      doc.moveDown(0.5).strokeColor('#003DA5').lineWidth(2).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(2).font('Helvetica-Bold').fontSize(16).text('PAZ Y SALVO DE VIÁTICOS', { align: 'center' });
      doc.moveDown().font('Helvetica').fontSize(9).text(`Documento: ${contenido.id}`);
      doc.moveDown(2).fontSize(11).text(
        `Se certifica que ${contenido.nombre}, identificado(a) con documento ${contenido.documento}, ` +
        'no registra comisiones pendientes de legalización a la fecha de expedición, según la configuración de modalidad de pago vigente.',
        { align: 'justify' },
      );
      doc.moveDown().text('Esta certificación refleja la situación al momento de su emisión. Las comisiones posteriores se consultan en el sistema.');
      doc.moveDown(2).font('Helvetica-Bold').text('Firma verificada mediante código OTP');
      doc.font('Helvetica').fontSize(10)
        .text(`Coordinación de Viáticos: ${contenido.coordinadoraNombre}`)
        .text(`Usuario: ${contenido.coordinadoraId}`)
        .text(`Correo: ${firma.email}`)
        .text(`Fecha: ${firma.fechaFirma}`)
        .text(`Evidencia: ${firma.id}`);
      doc.moveDown().fontSize(8).text(`SHA-256 del contenido autorizado: ${hash}`);
      doc.fontSize(8).fillColor('#666666').text('ESAP · Paz y salvo de Viáticos · Página 1', 50, 730, { align: 'center' });
      doc.end();
    });
  }
}
