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

// Extensions actually rendered inline by VisorDocumentoModal (pdf.js canvas / <img> / mammoth for .docx).
// Narrower than VIEWABLE_EXTENSIONS: video, audio and plain-text formats fall back to
// VisorDocumentoModal's "Vista previa no disponible" screen, so they must not offer a preview button.
const PLATFORM_PREVIEW_EXTENSIONS = [
    '.pdf',
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.docx'
];

/**
 * Check if a file can be rendered inline by VisorDocumentoModal (the in-platform document viewer)
 * @param filename - The name of the file (with extension) or URL
 * @returns true if VisorDocumentoModal has a real renderer for this file type
 */
export function isPreviewableInPlatform(filename: string | null | undefined): boolean {
    if (!filename) return false;

    const extension = getFileExtension(filename);
    if (!extension) return false;

    return PLATFORM_PREVIEW_EXTENSIONS.includes(extension);
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
