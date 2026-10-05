import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FirmaDigitalViaticosModal, { FirmaDigitalData } from './FirmaDigitalViaticosModal';

describe('FirmaDigitalViaticosModal — Flujo Institucional de Firma OTP', () => {
  const defaultProps = {
    isOpen: true,
    solicitudId: 'sol-viat-12345',
    consecutivo: 'GF-FO-023-2026-0099',
    comisionadoNombre: 'Pedro Pérez',
    destino: 'Medellín, Antioquia',
    fechas: '2026-10-05 al 2026-10-09',
    firmanteNombre: 'Carlos Andrés Gómez',
    firmanteCargo: 'Jefe de Dependencia / Ordenador del Gasto',
    etapaLabel: 'Aprobación Jefe de Dependencia',
    correoDestino: 'carlos.gomez@esap.edu.co',
    devCode: '123456',
    onVerifyCodigo: vi.fn().mockResolvedValue(undefined),
    onFirmaCompleta: vi.fn().mockResolvedValue(true),
    onCancelar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza correctamente el modal con información de la solicitud y campos OTP', () => {
    render(<FirmaDigitalViaticosModal {...defaultProps} />);

    expect(screen.getByText(/Firma Digital Institucional/i)).toBeInTheDocument();
    expect(screen.getByText(/GF-FO-023-2026-0099/i)).toBeInTheDocument();
    expect(screen.getByText(/Pedro Pérez/i)).toBeInTheDocument();
    expect(screen.getByText(/carlos.gomez@esap.edu.co/i)).toBeInTheDocument();
    expect(screen.getByText(/Modo Pruebas \/ Dev: Autocompletar OTP \(123456\)/i)).toBeInTheDocument();
  });

  it('permite autocompletar el código OTP en modo desarrollo y disparar la verificación', async () => {
    render(<FirmaDigitalViaticosModal {...defaultProps} />);

    const autoFillBtn = screen.getByText(/Modo Pruebas \/ Dev: Autocompletar OTP \(123456\)/i);
    fireEvent.click(autoFillBtn);

    await waitFor(() => {
      expect(defaultProps.onVerifyCodigo).toHaveBeenCalledWith('123456');
    });
  });

  it('avanza al paso de confirmación y emite el certificado digital con SHA-256 al firmar', async () => {
    render(<FirmaDigitalViaticosModal {...defaultProps} />);

    const autoFillBtn = screen.getByText(/Modo Pruebas \/ Dev: Autocompletar OTP \(123456\)/i);
    fireEvent.click(autoFillBtn);

    // Esperar a que pase la animación y se muestre la pantalla de confirmación
    const confirmBtn = await screen.findByRole('button', { name: /Confirmar y Firmar/i }, { timeout: 3000 });
    expect(confirmBtn).toBeInTheDocument();

    expect(screen.getByText(/ESAP-CERT-VIAT-/i)).toBeInTheDocument();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(defaultProps.onFirmaCompleta).toHaveBeenCalledWith(
        expect.objectContaining({
          pin_verificado: true,
          codigoOtp: '123456',
          firmante: 'Carlos Andrés Gómez',
          cargo: 'Jefe de Dependencia / Ordenador del Gasto',
          certificado_id: expect.stringMatching(/^ESAP-CERT-VIAT-/),
          hash: expect.stringMatching(/^SHA256:/),
        }),
      );
    });
  });

  it('cierra el modal cuando el usuario hace clic en el botón cancelar', () => {
    render(<FirmaDigitalViaticosModal {...defaultProps} />);

    const closeBtn = screen.getByTitle('Cerrar modal');
    fireEvent.click(closeBtn);

    expect(defaultProps.onCancelar).toHaveBeenCalled();
  });
});
