import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('../../../../services/api/legal.service', () => ({
  legalService: {
    getExpedientes: vi.fn().mockResolvedValue([]),
    getAbogados: vi.fn().mockResolvedValue([]),
    existeRadicado: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock('../../../../services/api/estructura.service', () => ({
  estructuraService: {
    geopolitica: {
      listarDepartamentos: vi.fn().mockResolvedValue({ data: [] }),
      listarCiudades: vi.fn().mockResolvedValue({ data: [] }),
    },
    seccionales: {
      listar: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
}));

vi.mock('../../../../services/api/authService', () => ({
  authService: {
    hasRole: vi.fn().mockReturnValue(true),
    isSuperAdmin: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('../config/ConfiguracionesSIGLContext', () => ({
  useConfiguracionModulo: () => ({
    configuracion: undefined,
    estadosActivos: [{ id: 'et1', nombre: 'Admisión', activo: true, orden: 1 }],
    tiposProcesosActivos: [{ id: 'tp1', nombre: 'Reparación Directa' }],
    tiempos: [],
    mediosControlActivos: [{ id: 'mc1', nombre: 'Ordinario' }],
    dependenciasActivas: [],
  }),
}));

import { legalService } from '../../../../services/api/legal.service';
import { ModalNuevaDemandaRESTAURADO } from './ModalNuevaDemandaRESTAURADO';

const expedienteEnEdicion = {
  id: 'exp-1',
  uuid: 'exp-1',
  radicado: '12345678901', // 11 dígitos, el propio valor original del expediente que se edita
  medioControl: 'Ordinario',
  tipoProceso: 'Reparación Directa',
  etapa: 'et1',
  demandantes: [],
  demandados: [],
  otrosActores: [],
  camposAdicionales: {},
} as any;

async function completarCamposObligatoriosPaso1() {
  fireEvent.click(screen.getByRole('combobox', { name: /Jurisdicción/i }));
  fireEvent.click(await screen.findByRole('option', { name: 'Ordinario' }));

  fireEvent.click(screen.getByRole('combobox', { name: /Medio de Control/i }));
  fireEvent.click(await screen.findByRole('option', { name: 'Reparación Directa' }));

  fireEvent.click(screen.getByRole('combobox', { name: /Etapa Procesal/i }));
  fireEvent.click(await screen.findByRole('option', { name: 'Admisión' }));
}

describe('ModalNuevaDemandaRESTAURADO · Paso 1 (Proceso) - validación en vivo de Número de Radicado', () => {
  beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.scrollIntoView = () => {};
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (legalService.getExpedientes as any).mockResolvedValue([]);
    (legalService.existeRadicado as any).mockResolvedValue(false);
  });

  it('no debe avanzar a "Demandantes" si el radicado tiene menos de 11 dígitos (y no debe llamar al backend a verificarlo)', async () => {
    render(<ModalNuevaDemandaRESTAURADO isOpen onClose={vi.fn()} onSave={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Número de Radicado/i), {
      target: { value: '123456789' }, // 9 dígitos, por debajo del mínimo
    });
    await completarCamposObligatoriosPaso1();

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    expect(await screen.findByText('El radicado debe tener entre 11 y 23 dígitos')).toBeInTheDocument();
    expect(screen.queryByText('No hay demandantes agregados')).not.toBeInTheDocument();
    expect(legalService.existeRadicado).not.toHaveBeenCalled();
  });

  it('no debe avanzar a "Demandantes" si el backend indica que el radicado ya existe (creación)', async () => {
    (legalService.existeRadicado as any).mockResolvedValue(true);

    render(<ModalNuevaDemandaRESTAURADO isOpen onClose={vi.fn()} onSave={vi.fn()} />);
    await waitFor(() => expect(screen.getByLabelText(/Número de Radicado/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Número de Radicado/i), {
      target: { value: '66001233300020260012399' },
    });
    await completarCamposObligatoriosPaso1();

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    expect(
      await screen.findByText('Este número de radicado ya está registrado en el sistema'),
    ).toBeInTheDocument();
    expect(screen.queryByText('No hay demandantes agregados')).not.toBeInTheDocument();
    expect(legalService.existeRadicado).toHaveBeenCalledWith('66001233300020260012399', undefined);
  });

  it('debe avanzar a "Demandantes" cuando el backend indica que el radicado es único', async () => {
    (legalService.existeRadicado as any).mockResolvedValue(false);

    render(<ModalNuevaDemandaRESTAURADO isOpen onClose={vi.fn()} onSave={vi.fn()} />);
    await waitFor(() => expect(screen.getByLabelText(/Número de Radicado/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Número de Radicado/i), {
      target: { value: '66001233300020260012300' },
    });
    await completarCamposObligatoriosPaso1();

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    expect(await screen.findByText('No hay demandantes agregados')).toBeInTheDocument();
  });

  it('si falla la verificación contra el backend (error de red), NO debe dejar avanzar y debe pedir reintentar', async () => {
    (legalService.existeRadicado as any).mockRejectedValue(new Error('network error'));

    render(<ModalNuevaDemandaRESTAURADO isOpen onClose={vi.fn()} onSave={vi.fn()} />);
    await waitFor(() => expect(screen.getByLabelText(/Número de Radicado/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Número de Radicado/i), {
      target: { value: '66001233300020260012300' },
    });
    await completarCamposObligatoriosPaso1();

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    expect(await screen.findByText('No se pudo verificar el radicado, intente nuevamente')).toBeInTheDocument();
    expect(screen.queryByText('No hay demandantes agregados')).not.toBeInTheDocument();
  });

  it('en edición: si cambio el radicado y ahora coincide con OTRO expediente existente, debe bloquear el avance', async () => {
    (legalService.existeRadicado as any).mockResolvedValue(true);

    render(
      <ModalNuevaDemandaRESTAURADO
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        expedienteEdit={expedienteEnEdicion}
      />,
    );
    await waitFor(() =>
      expect((screen.getByLabelText(/Número de Radicado/i) as HTMLInputElement).value).toBe('12345678901'),
    );

    // El expediente original tenía 11 dígitos; se le agregan 3 más y ese nuevo radicado
    // ya pertenece a otro expediente distinto del que se está editando.
    fireEvent.change(screen.getByLabelText(/Número de Radicado/i), {
      target: { value: '12345678901222' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    expect(
      await screen.findByText('Este número de radicado ya está registrado en el sistema'),
    ).toBeInTheDocument();
    expect(screen.queryByText('No hay demandantes agregados')).not.toBeInTheDocument();
    expect(legalService.existeRadicado).toHaveBeenCalledWith('12345678901222', 'exp-1');
  });

  it('en edición: no debe considerar duplicado el propio radicado del expediente que se está editando', async () => {
    // El backend ya excluye el propio id (excludeId) al verificar, así que al no cambiar
    // el radicado la verificación debe resolver "no existe" (no es un duplicado de sí mismo).
    (legalService.existeRadicado as any).mockResolvedValue(false);

    render(
      <ModalNuevaDemandaRESTAURADO
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        expedienteEdit={expedienteEnEdicion}
      />,
    );
    await waitFor(() =>
      expect((screen.getByLabelText(/Número de Radicado/i) as HTMLInputElement).value).toBe('12345678901'),
    );

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    expect(await screen.findByText('No hay demandantes agregados')).toBeInTheDocument();
    expect(legalService.existeRadicado).toHaveBeenCalledWith('12345678901', 'exp-1');
  });
});
