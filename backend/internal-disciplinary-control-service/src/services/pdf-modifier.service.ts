import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { StorageService } from './storage.service';

@Injectable()
export class PdfModifierService {
    constructor(private storageService: StorageService) { }

    /**
     * Agrega el consecutivo aprobado del auto en la esquina superior derecha.
     */
    async addConsecutive(filename: string, consecutive: string): Promise<void> {
        try {
            const filePath = this.storageService.getFullPath(filename);
            const pdfBytes = await fs.readFile(filePath);
            const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const label = consecutive.toUpperCase();
            const fontSize = 11;

            const firstPage = pdfDoc.getPages()[0];
            if (firstPage) {
                const { width, height } = firstPage.getSize();
                const textWidth = helveticaFont.widthOfTextAtSize(label, fontSize);
                const textX = width - textWidth - 24;
                const textY = height - fontSize - 18;

                firstPage.drawText(label, {
                    x: textX,
                    y: textY,
                    size: fontSize,
                    font: helveticaFont,
                    color: rgb(0, 0, 0),
                });
            }

            const pdfBytesModified = await pdfDoc.save();
            await fs.writeFile(filePath, pdfBytesModified);
        } catch (error) {
            console.error('Error adding consecutive to PDF:', error);
            throw error;
        }
    }

    /**
     * Adds the jefe's signature image (if configured) + text block at the bottom of the last page.
     */
    async addSignature(filename: string, signerName: string, role: string): Promise<void> {
        try {
            const filePath = this.storageService.getFullPath(filename);
            const pdfBytes = await fs.readFile(filePath);
            const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            const pages = pdfDoc.getPages();
            const lastPageIndex = pages.length - 1;
            const lastPage = pages[lastPageIndex];
            const { width, height } = lastPage.getSize();

            const signText = "FIRMADO DIGITALMENTE POR:";
            const nameText = signerName.toUpperCase();
            const roleText = role.toUpperCase();
            const officeText = "JEFE OFICINA CONTROL INTERNO DISCIPLINARIO";

            const fontSize = 10;

            // Verificar si hay imagen de firma configurada
            const pngPath = this.storageService.getFullPath('firma_jefe.png');
            const jpgPath = this.storageService.getFullPath('firma_jefe.jpg');
            const hasSignatureImage = existsSync(pngPath) || existsSync(jpgPath);

            // Dimensiones del bloque de firma:
            // Imagen: hasta 60pt de alto (+10 de offset sobre yPosition)
            // Texto: desde yPosition hasta yPosition - 45 (45pt + margen)
            const signatureTopOffset = hasSignatureImage ? 70 : 15;
            const signatureBottomOffset = 45;
            // El pie institucional en 4.8cm equivale a ~136pt. Dejamos margen seguro.
            const footerClearanceY = 136;
            const minRequiredYPosition = footerClearanceY + signatureBottomOffset + 5; // ~186pt

            // Detectar dónde termina el texto del cuerpo del auto en la última página
            const lowestBodyY = await this.getLowestBodyY(pdfBytes, lastPageIndex, footerClearanceY, height - 80);

            let targetPage = lastPage;
            let yPosition: number;

            if (lowestBodyY === null) {
                // Si la página no tiene texto en el cuerpo o no se pudo extraer, usar posición segura
                yPosition = 210;
            } else {
                // La parte superior de la firma debe quedar al menos a 25pt por debajo del texto más bajo
                const maxYPositionBelowText = lowestBodyY - signatureTopOffset - 25;

                if (maxYPositionBelowText >= minRequiredYPosition) {
                    // Cabe en la última página sin sobreponerse al texto ni al pie de página
                    yPosition = Math.min(maxYPositionBelowText, 210);
                } else {
                    // No cabe en la última página sin solaparse: se crea una nueva página limpia para la firma
                    targetPage = pdfDoc.addPage([width, height]);
                    yPosition = height - 200;
                }
            }

            // Embed signature image if the jefe has configured one
            try {
                let signatureImage: any = null;
                if (existsSync(pngPath)) {
                    const imgBytes = await fs.readFile(pngPath);
                    signatureImage = await pdfDoc.embedPng(imgBytes);
                } else if (existsSync(jpgPath)) {
                    const imgBytes = await fs.readFile(jpgPath);
                    signatureImage = await pdfDoc.embedJpg(imgBytes);
                }
                if (signatureImage) {
                    const maxWidth = 150;
                    const maxHeight = 60;
                    const scale = Math.min(maxWidth / signatureImage.width, maxHeight / signatureImage.height, 1);
                    const imgWidth = signatureImage.width * scale;
                    const imgHeight = signatureImage.height * scale;
                    targetPage.drawImage(signatureImage, {
                        x: (width - imgWidth) / 2,
                        y: yPosition + 10,
                        width: imgWidth,
                        height: imgHeight,
                    });
                }
            } catch (imgError) {
                console.warn('No se pudo embeber imagen de firma:', imgError.message);
            }

            // Center text horizontally
            const drawCenteredText = (text: string, font: any, y: number) => {
                const textWidth = font.widthOfTextAtSize(text, fontSize);
                targetPage.drawText(text, {
                    x: (width - textWidth) / 2,
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0),
                });
            };

            drawCenteredText(signText, helveticaBold, yPosition);
            drawCenteredText(nameText, helveticaFont, yPosition - 15);
            drawCenteredText(roleText, helveticaFont, yPosition - 30);
            drawCenteredText(officeText, helveticaBold, yPosition - 45);

            const pdfBytesModified = await pdfDoc.save();
            await fs.writeFile(filePath, pdfBytesModified);
        } catch (error) {
            console.error('Error adding signature to PDF:', error);
            throw error;
        }
    }

    /**
     * Extrae la coordenada Y más baja del texto del cuerpo en una página específica del PDF.
     */
    private async getLowestBodyY(
        pdfBytes: Buffer,
        pageIndex: number,
        footerThreshold: number,
        headerThreshold: number
    ): Promise<number | null> {
        try {
            const pdfjsLib = require('pdfjs-dist/build/pdf.js');
            const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
            const page = await doc.getPage(pageIndex + 1);
            const textContent = await page.getTextContent();
            let lowestY: number | null = null;
            for (const item of textContent.items) {
                if (!item.str || !item.str.trim()) continue;
                const y = Math.round(item.transform[5]);
                if (y > footerThreshold && y < headerThreshold) {
                    if (lowestY === null || y < lowestY) {
                        lowestY = y;
                    }
                }
            }
            return lowestY;
        } catch (error) {
            console.warn('No se pudo extraer coordenadas de texto con pdfjs-dist:', error?.message);
            return null;
        }
    }
}
