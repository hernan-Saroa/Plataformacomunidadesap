/**
 * Utility functions for file handling
 */

// File extensions that can be viewed directly in a browser
const VIEWABLE_EXTENSIONS = [
    // Images
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
    // PDF
    '.pdf',
    // Video
    '.mp4', '.webm', '.ogg', '.mov',
    // Audio
    '.mp3', '.wav', '.ogg',
    // Text
    '.txt', '.csv', '.json', '.xml', '.html', '.htm'
];

// File extensions that should only be downloaded (not viewable in browser)
const DOWNLOAD_ONLY_EXTENSIONS = [
    // Microsoft Office
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    // OpenOffice/LibreOffice
    '.odt', '.ods', '.odp',
    // Archives
    '.zip', '.rar', '.7z', '.tar', '.gz',
    // Executables
    '.exe', '.msi', '.dmg', '.app'
];

/**
 * Check if a file can be viewed directly in the browser
 * @param filename - The name of the file (with extension) or URL
 * @returns true if the file can be viewed in browser, false otherwise
 */
export function isViewableInBrowser(filename: string | null | undefined): boolean {
    if (!filename) return false;

    const lowerFilename = filename.toLowerCase();

    // Extract extension from filename or URL
    const lastDotIndex = lowerFilename.lastIndexOf('.');
    if (lastDotIndex === -1) return false;

    const extension = lowerFilename.substring(lastDotIndex);

    return VIEWABLE_EXTENSIONS.includes(extension);
}

/**
 * Check if a file should only be downloaded (not viewable)
 * @param filename - The name of the file (with extension) or URL
 * @returns true if the file should only be downloaded, false otherwise
 */
export function isDownloadOnly(filename: string | null | undefined): boolean {
    if (!filename) return false;

    const lowerFilename = filename.toLowerCase();

    const lastDotIndex = lowerFilename.lastIndexOf('.');
    if (lastDotIndex === -1) return true; // No extension, download only

    const extension = lowerFilename.substring(lastDotIndex);

    return DOWNLOAD_ONLY_EXTENSIONS.includes(extension);
}

/**
 * Get the file extension from a filename or URL
 * @param filename - The name of the file or URL
 * @returns The extension (including dot) or empty string
 */
export function getFileExtension(filename: string | null | undefined): string {
    if (!filename) return '';

    const lowerFilename = filename.toLowerCase();
    const lastDotIndex = lowerFilename.lastIndexOf('.');

    if (lastDotIndex === -1) return '';

    // Handle URLs with query params
    const extension = lowerFilename.substring(lastDotIndex);
    const queryIndex = extension.indexOf('?');

    return queryIndex === -1 ? extension : extension.substring(0, queryIndex);
}

// File extensions that require an electronic signature in approval flows.
// Only PDF and Word documents are signable; everything else (Excel, images,
// video, audio, archives, etc.) does not require a signature.
const SIGNABLE_EXTENSIONS = ['.pdf', '.doc', '.docx'];

/**
 * Check whether a document requires an electronic signature.
 * Only PDF and Word (.doc/.docx) require signing; any other type
 * (Excel, image, video, etc.) does not.
 * @param filename - The name of the file (with extension) or URL
 * @returns true if the document must be signed, false otherwise
 */
export function requiresSignature(filename: string | null | undefined): boolean {
    if (!filename) return false;
    // Signed documents get " (Firmado)" appended to their name; strip it before checking.
    const cleaned = filename.toLowerCase().replace(/\s*\(firmado\)\s*/g, '').trim();
    const ext = getFileExtension(cleaned);
    return SIGNABLE_EXTENSIONS.includes(ext);
}

// File extensions that the in-app document viewer (VisorDocumentoModal) can actually
// render for preview: PDF (iframe/pdf.js), Word .docx (mammoth -> HTML) and images.
// Anything else (Excel, video, audio, .doc binario, comprimidos, etc.) no lo soporta
// el visor y cae al estado "Vista previa no disponible", por lo que el botón de
// previsualizar debe ocultarse para esos tipos.
const PREVIEWABLE_EXTENSIONS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Check whether a document can be previewed by the in-app viewer (VisorDocumentoModal).
 * Solo PDF, Word .docx e imágenes (jpg/jpeg/png/gif/webp) son previsualizables;
 * Excel, video, audio y otros tipos no lo son.
 * @param filename - The name of the file (with extension) or URL
 * @returns true if the document can be previewed in the viewer, false otherwise
 */
export function isPreviewableInViewer(filename: string | null | undefined): boolean {
    if (!filename) return false;
    // Signed documents get " (Firmado)" appended to their name; strip it before checking.
    const cleaned = filename.toLowerCase().replace(/\s*\(firmado\)\s*/g, '').trim();
    const ext = getFileExtension(cleaned);
    return PREVIEWABLE_EXTENSIONS.includes(ext);
}

/**
 * Get file type category for display purposes
 * @param filename - The name of the file
 * @returns A human-readable category string
 */
export function getFileTypeCategory(filename: string | null | undefined): string {
    const ext = getFileExtension(filename);

    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) return 'Imagen';
    if (['.pdf'].includes(ext)) return 'PDF';
    if (['.mp4', '.webm', '.ogg', '.mov'].includes(ext)) return 'Video';
    if (['.mp3', '.wav'].includes(ext)) return 'Audio';
    if (['.doc', '.docx'].includes(ext)) return 'Word';
    if (['.xls', '.xlsx'].includes(ext)) return 'Excel';
    if (['.ppt', '.pptx'].includes(ext)) return 'PowerPoint';
    if (['.zip', '.rar', '.7z'].includes(ext)) return 'Archivo';
    if (['.txt', '.csv'].includes(ext)) return 'Texto';

    return 'Documento';
}
