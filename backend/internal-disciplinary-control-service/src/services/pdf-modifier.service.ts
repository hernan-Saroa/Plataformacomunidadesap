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
            const lastPage = pages[pages.length - 1];
            const { width } = lastPage.getSize();

            const signText = "FIRMADO DIGITALMENTE POR:";
            const nameText = signerName.toUpperCase();
            const roleText = role.toUpperCase();
            const officeText = "JEFE OFICINA CONTROL INTERNO DISCIPLINARIO";

            const fontSize = 10;
            // Desde el borde inferior. Debe quedar por encima del pie institucional
            // que agrega la conversión Word→PDF (margen inferior ~4cm ≈ 113pt).
            const yPosition = 170;

            // Embed signature image if the jefe has configured one
            const pngPath = this.storageService.getFullPath('firma_jefe.png');
            const jpgPath = this.storageService.getFullPath('firma_jefe.jpg');
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
                    lastPage.drawImage(signatureImage, {
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
                lastPage.drawText(text, {
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
}
