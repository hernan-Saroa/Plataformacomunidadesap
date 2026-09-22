import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), info: vi.fn() },
}));

import { VisorDocumentoModal } from './VisorDocumentoModal';

// JSDOM no implementa scrollIntoView / matchMedia usados por Radix Dialog.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = window.matchMedia || (() => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })) as any;
});

const firmaGuardada = JSON.stringify({
  firmado: true,
  coords: { x: 50, y: 80, page: 1 },
  firmaImg: 'data:image/png;base64,AAAA',
  hash: 'SHA256:ABC',
  timestamp: new Date().toISOString(),
  firmante: 'Jefe de Gestión Legal',
  cargo: 'Jefe de Gestión Legal',
  certificadoId: 'ESAP-CERT-1',
  scale: 1,
});

describe('VisorDocumentoModal · documento ya firmado', () => {
  it('un PDF real firmado no debe duplicar el sello en pantalla (el sello ya viene incrustado en el archivo)', () => {
    render(
      <VisorDocumentoModal
        isOpen
        onClose={vi.fn()}
        archivo="http://localhost/api/legal/documentos/doc-1.pdf"
        numero="doc-1.pdf"
        asunto="Auto de trámite"
        descripcion={firmaGuardada}
        docId="doc-1"
        allowSigning={false}
        onSignComplete={vi.fn()}
      />,
    );

    // El iframe muestra el PDF real, cuyos bytes ya contienen la firma incrustada por stampPdf().
    expect(document.querySelector('iframe[title="Visor PDF"]')).toBeInTheDocument();

    // No debe existir el overlay HTML de firma superpuesto: duplicaría visualmente el sello
    // que ya está dentro del PDF (bug reportado: doble firma en pantalla, correcta al descargar).
    expect(document.querySelectorAll('.signature-stamp')).toHaveLength(0);

    // El indicador "Firmado" del toolbar sigue confirmando el estado sin repetir el sello completo.
    expect(screen.getByText('Firmado')).toBeInTheDocument();
  });

  it('una imagen firmada sí debe mostrar el sello superpuesto (el archivo original no se puede re-estampar)', () => {
    render(
      <VisorDocumentoModal
        isOpen
        onClose={vi.fn()}
        archivo="http://localhost/api/legal/documentos/doc-2.png"
        numero="doc-2.png"
        asunto="Evidencia digitalizada"
        descripcion={firmaGuardada}
        docId="doc-2"
        allowSigning={false}
        onSignComplete={vi.fn()}
      />,
    );

    // Para tipos de archivo que pdf-lib no puede re-estampar (imágenes, DOCX), el overlay
    // sigue siendo la única representación visual de la firma, así que debe conservarse una sola vez.
    expect(document.querySelectorAll('.signature-stamp')).toHaveLength(1);
  });
});
