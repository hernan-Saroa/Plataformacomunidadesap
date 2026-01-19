import { Injectable } from '@nestjs/common';

@Injectable()
export class OnlyOfficeService {
    private readonly onlyOfficeUrl: string;
    private readonly apiUrl: string;

    constructor() {
        this.onlyOfficeUrl = process.env.ONLYOFFICE_URL || 'http://onlyoffice:80';
        // OnlyOffice necesita acceder al backend usando el nombre del servicio Docker
        this.apiUrl = process.env.BACKEND_URL || 'http://internal-disciplinary-control-service:3005';
    }

    /**
     * Generar configuración de OnlyOffice para edición de documentos
     */
    generateConfig(documentUrl: string, documentKey: string, fileName: string, userId: string) {
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        const fileType = fileExtension === 'docx' ? 'docx' : 'doc';

        // Agregar timestamp a la key para evitar problemas de caché
        const uniqueKey = `${documentKey}_${Date.now()}`;

        return {
            documentType: 'word',
            document: {
                title: fileName,
                url: documentUrl,
                fileType: fileType,
                key: uniqueKey,
                permissions: {
                    edit: true,
                    download: true,
                    print: true,
                    review: true,
                    comment: true,
                },
            },
            editorConfig: {
                mode: 'edit',
                lang: 'es',
                callbackUrl: `${this.apiUrl}/disciplinary-autos/onlyoffice/callback`,
                user: {
                    id: userId,
                    name: `Usuario ${userId}`,
                },
                customization: {
                    autosave: true,
                    forcesave: true,
                },
            },
        };
    }
}
