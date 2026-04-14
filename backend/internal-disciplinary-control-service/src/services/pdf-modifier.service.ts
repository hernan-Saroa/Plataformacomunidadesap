import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageService } from './storage.service';

@Injectable()
export class PdfModifierService {
    constructor(private storageService: StorageService) { }

    /**
     * Agrega el consecutivo aprobado del auto en la esquina superior derecha.
     */
    async addConsecutive(filename: string, consecutive: string): Promise<void> {
        try {
            const cleanFilename = path.basename(filename);
            const filePath = this.storageService.getFullPath(cleanFilename);
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
                    color: rgb(0.09, 0.44, 0.34),
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
     * Adds a signature placeholder at the bottom of the last page.
     */
    async addSignature(filename: string, signerName: string, role: string): Promise<void> {
        try {
            const cleanFilename = path.basename(filename);
            const filePath = this.storageService.getFullPath(cleanFilename);
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
            const yPosition = 100; // From bottom

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
