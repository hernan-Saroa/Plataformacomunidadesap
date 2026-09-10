import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BloqueDocumento } from './BloqueDocumento';
import { contratacionService } from '../../services/contratacionService';
import { DocumentoExpediente } from '../../types';

const documento = (cambios: Partial<DocumentoExpediente> = {}): DocumentoExpediente => ({
  id: crypto.randomUUID(),
  tipo: 'ADJUNTO',
  nombre: 'Estudio previo firmado.pdf',
  numeral: '3.1',
  hashSha256: 'a'.repeat(64),
  version: 1,
  subidoPor: 'jperez',
  createdAt: '2026-09-01T10:00:00.000Z',
  descargaUrl: 'hiring/files/b24bb264.pdf',
  ...cambios,
});

const montar = (documentos: DocumentoExpediente[], bloqueado = false) => {
  const onAdjuntado = vi.fn();
  render(
    <BloqueDocumento
      procesoId="7f1e1b8a-0000-4000-8000-000000000001"
      documentos={documentos}
      bloqueado={bloqueado}
      onAdjuntado={onAdjuntado}
    />,
  );
  return { onAdjuntado };
};

/**
 * El estudio previo y sus anexos (EFDS-1183).
 *
 * Dos cosas que la Dirección reportó de esta pantalla: que los soportes se
 * subían de uno en uno, y que una vez subidos no había forma de mirarlos, así
 * que el abogado no podía revisar lo que estaba aprobando.
 */
describe('BloqueDocumento', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('sube de una vez todos los archivos que se elijan', async () => {
    const adjuntar = vi
      .spyOn(contratacionService, 'adjuntarDocumento')
      .mockResolvedValue({ id: 'x', nombre: 'y' } as never);
    const { onAdjuntado } = montar([]);

    const entrada = document.querySelector('input[type="file"]') as HTMLInputElement;
    // El anexo no viaja solo: van el estudio, el análisis del sector y las
    // cotizaciones, y antes eso eran tres viajes al selector de archivos.
    expect(entrada).toHaveAttribute('multiple');

    await userEvent.upload(entrada, [
      new File(['a'], 'estudio.pdf', { type: 'application/pdf' }),
      new File(['b'], 'sector.pdf', { type: 'application/pdf' }),
    ]);

    await waitFor(() => expect(adjuntar).toHaveBeenCalledTimes(2));
    // Una sola relectura al final, no una por archivo.
    expect(onAdjuntado).toHaveBeenCalledTimes(1);
  });

  it('dice cuántos entraron cuando uno falla a mitad', async () => {
    vi.spyOn(contratacionService, 'adjuntarDocumento')
      .mockResolvedValueOnce({ id: 'x', nombre: 'y' } as never)
      .mockRejectedValueOnce(new Error('El estudio previo ya fue enviado'));
    montar([]);

    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, [
      new File(['a'], 'estudio.pdf', { type: 'application/pdf' }),
      new File(['b'], 'sector.pdf', { type: 'application/pdf' }),
    ]);

    // Callar el parcial dejaría al área creyendo que subió los dos.
    expect(await screen.findByRole('alert')).toHaveTextContent(/se adjuntaron 1 de 2/);
  });

  it('deja abrir el documento sin bajarlo al disco', async () => {
    const contenido = vi
      .spyOn(contratacionService, 'contenidoDocumento')
      .mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    // jsdom no la trae, y sin ella el visor no puede pintar el blob.
    URL.createObjectURL = vi.fn(() => 'blob:visor');
    URL.revokeObjectURL = vi.fn();

    montar([documento()]);

    await userEvent.click(screen.getByTitle(/Ver Estudio previo firmado/));

    await waitFor(() => expect(contenido).toHaveBeenCalledWith('hiring/files/b24bb264.pdf'));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Estudio previo firmado.pdf');
  });

  it('conserva la descarga para quien necesita el archivo fuera', () => {
    montar([documento()]);

    const enlace = screen.getByTitle(/Descargar Estudio previo firmado/);
    // `descargar=1` es lo que le pide al servicio la cabecera `attachment`:
    // sin él, el enlace enseñaría el PDF en la pestaña del módulo.
    expect(enlace).toHaveAttribute('href', expect.stringContaining('descargar=1'));
  });

  it('no ofrece adjuntar mientras el estudio está en revisión', () => {
    montar([documento()], true);

    // Lo bloquea el servicio —«ya fue enviado; no admite nuevos adjuntos»—, así
    // que ofrecerlo sería ofrecer algo que va a terminar en error.
    expect(document.querySelector('input[type="file"]')).toBeNull();
    // Verlos, en cambio, sigue estando: es justo lo que hace quien revisa.
    expect(screen.getByTitle(/Ver Estudio previo firmado/)).toBeInTheDocument();
  });
});
