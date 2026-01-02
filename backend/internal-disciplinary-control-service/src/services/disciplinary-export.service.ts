import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';

@Injectable()
export class DisciplinaryExportService {
    private readonly logger = new Logger(DisciplinaryExportService.name);

    constructor(
        @InjectRepository(DisciplinaryProcess)
        private processRepo: Repository<DisciplinaryProcess>,
    ) { }

    async exportAllExpedientesToZip(): Promise<any> {
        this.logger.log('Iniciando exportación masiva de expedientes...');

        try {
            // Usar require interno para máxima compatibilidad y evitar problemas de importación ESM/CJS
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const archiver = require('archiver');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const PDFDocument = require('pdfkit');

            // 1. Obtener todos los procesos con sus relaciones
            const processes = await this.processRepo.find({
                relations: ['news'],
                order: { createdAt: 'DESC' },
            });

            this.logger.log(`Se encontraron ${processes.length} procesos para exportar.`);

            // 2. Crear el archivo ZIP (stream)
            const archive = archiver('zip', {
                zlib: { level: 9 }, // Nivel máximo de compresión
            });

            // 3. Generar un PDF por cada proceso
            for (const process of processes) {
                try {
                    const doc = new PDFDocument();
                    const radicado = process.radicadoProceso || `Proceso_${process.id.substring(0, 8)}`;
                    const filename = `Expediente_${radicado}.pdf`;

                    // Añadir el PDF al ZIP
                    archive.append(doc, { name: filename });

                    // --- Generación del Contenido del PDF ---

                    // PORTADA
                    const pageWidth = doc.page.width;

                    // Header Azul
                    doc.rect(0, 0, pageWidth, 100).fill('#003DA5');

                    doc.fillColor('white')
                        .fontSize(24)
                        .font('Helvetica-Bold')
                        .text('EXPEDIENTE ELECTRÓNICO', 0, 40, { align: 'center' });

                    doc.fontSize(14)
                        .font('Helvetica')
                        .text('Oficina de Control Interno Disciplinario', 0, 70, { align: 'center' });

                    doc.fillColor('black').fontSize(12).moveDown(4);

                    // Información General
                    doc.font('Helvetica-Bold').fontSize(16).text('INFORMACIÓN DEL PROCESO', { underline: true });
                    doc.moveDown();

                    const infoX = 50;
                    let currentY = doc.y;

                    doc.font('Helvetica-Bold').fontSize(11).text('Radicado:', infoX, currentY);
                    doc.font('Helvetica').text(process.radicadoProceso || 'N/A', infoX + 100, currentY);
                    currentY += 20;

                    doc.font('Helvetica-Bold').text('Estado:', infoX, currentY);
                    doc.font('Helvetica').text(process.estado || 'Activo', infoX + 100, currentY);
                    currentY += 20;

                    doc.font('Helvetica-Bold').text('Etapa:', infoX, currentY);
                    doc.font('Helvetica').text(process.etapaActual || 'N/A', infoX + 100, currentY);
                    currentY += 20;

                    doc.font('Helvetica-Bold').text('Fecha Inicio:', infoX, currentY);
                    doc.font('Helvetica').text(
                        process.createdAt ? new Date(process.createdAt).toLocaleDateString('es-CO') : 'N/A',
                        infoX + 100,
                        currentY
                    );
                    currentY += 40;

                    // Disciplinable
                    doc.font('Helvetica-Bold').fontSize(14).text('IMPLICADOS', infoX, currentY);
                    currentY += 20;

                    if (process.news?.disciplinable) {
                        let disciplinables: any[] = [];
                        if (Array.isArray(process.news.disciplinable)) {
                            disciplinables = process.news.disciplinable;
                        } else {
                            disciplinables = [process.news.disciplinable];
                        }

                        disciplinables.forEach((d: any) => {
                            doc.font('Helvetica-Bold').fontSize(11).text('Nombre:', infoX, currentY);
                            doc.font('Helvetica').text(d.nombre || 'N/A', infoX + 80, currentY);
                            currentY += 15;

                            doc.font('Helvetica-Bold').text('Cargo:', infoX, currentY);
                            doc.font('Helvetica').text(d.cargo || 'N/A', infoX + 80, currentY);
                            currentY += 25;
                        });
                    } else {
                        doc.font('Helvetica').text('No hay información de implicados.', infoX, currentY);
                        currentY += 20;
                    }

                    // Resumen Documental (Simulado)
                    doc.moveDown(2);
                    doc.font('Helvetica-Bold').fontSize(14).text('RESUMEN DOCUMENTAL', { underline: true });
                    doc.moveDown();

                    doc.fontSize(10).font('Helvetica').text(
                        'Este expediente contiene la trazabilidad completa, autos, evidencias y actas asociadas al proceso disciplinario.'
                    );
                    doc.moveDown();
                    doc.text('El índice electrónico completo y la auditoría detallada pueden ser consultados en la plataforma.');

                    // Footer
                    const pages = doc.bufferedPageRange();
                    for (let i = 0; i < pages.count; i++) {
                        doc.switchToPage(i);
                        doc.fontSize(8).fillColor('grey')
                            .text(
                                `Generado el ${new Date().toLocaleString('es-CO')}`,
                                50,
                                doc.page.height - 50,
                                { align: 'left' }
                            );
                    }

                    doc.end();
                } catch (pdfError) {
                    this.logger.error(`Error generando PDF para proceso ${process.id}: ${pdfError.message}`, pdfError.stack);
                    // Continuamos con el siguiente
                }
            }

            // Finalizar ZIP
            archive.finalize();
            return archive;

        } catch (error) {
            this.logger.error('Error crítico en exportAllExpedientesToZip:', error);
            throw error;
        }
    }
}
