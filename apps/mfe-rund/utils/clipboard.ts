/**
 * Utilidades para copiar al portapapeles con fallback
 * Maneja errores de permisos del Clipboard API
 */

/**
 * Copia texto al portapapeles con método de fallback
 * @param text - Texto a copiar
 * @returns Promise<boolean> - true si se copió exitosamente, false si falló
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Intentar primero con el Clipboard API moderno
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback: usar el método antiguo con textarea temporal
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.top = '0';
      textarea.style.left = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      return successful;
    } catch (fallbackError) {
      console.error('Error al copiar al portapapeles:', fallbackError);
      return false;
    }
  }
}

/**
 * Verifica si el Clipboard API está disponible
 * @returns boolean - true si está disponible
 */
export function isClipboardAvailable(): boolean {
  return !!(navigator.clipboard && navigator.clipboard.writeText);
}
