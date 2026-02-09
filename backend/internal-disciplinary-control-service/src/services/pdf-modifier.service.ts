import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageService } from './storage.service';

@Injectable()
export class PdfModifierService {
    constructor(private storageService: StorageService) { }

    /**
     * Adds the auto consecutive number and process radicado to the PDF header.
     */
    async addConsecutive(filename: string, consecutive: string, processRadicado: string): Promise<void> {
        try {
            // Extract just the filename in case a URL path like /files/foo.pdf is passed
            const cleanFilename = path.basename(filename);
            const filePath = this.storageService.getFullPath(cleanFilename);
            const pdfBytes = await fs.readFile(filePath);
            const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();

            const text = `${consecutive} - ${processRadicado}`;
            const textSize = 12;
            const textWidth = helveticaFont.widthOfTextAtSize(text, textSize);

            // Draw text at top right corner
            firstPage.drawText(text, {
                x: width - textWidth - 20,
                y: height - 20,
                size: textSize,
                font: helveticaFont,
                color: rgb(0.8, 0.2, 0.2), // Red color for visibility
            });

            const pdfBytesModified = await pdfDoc.save();
            await fs.writeFile(filePath, pdfBytesModified);
        } catch (error) {
            console.error('Error adding consecutive to PDF:', error);
            // Determine if we should throw or just log error (fail soft)
            // throw error; 
        }
    }

    /**
     * Adds a signature placeholder at the bottom of the last page.
     */
    async addSignature(filename: string, signerName: string, role: string): Promise<void> {
        try {
            // Extract just the filename in case a URL path like /files/foo.pdf is passed
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
        }
    }
}
