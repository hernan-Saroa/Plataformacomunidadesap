import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NuevaSolicitudModal from './NuevaSolicitudModal';
import viaticosService from '../services/api/viaticosService';

vi.mock('../services/api/viaticosService', () => ({
  __esModule: true,
  default: {
    obtenerDepartamentos: vi.fn().mockResolvedValue([
      { id: '11', codigo: '11', nombre: 'Bogotá D.C.' },
      { id: '05', codigo: '05', nombre: 'Antioquia' },
    ]),
    obtenerCiudadesPorDepartamento: vi.fn().mockResolvedValue([
      { id: '11001', codigo: '11001', nombre: 'Bogotá, D.C.', idPadre: '11' },
      { id: '05001', codigo: '05001', nombre: 'Medellín', idPadre: '05' },
    ]),
    obtenerTodasCiudades: vi.fn().mockResolvedValue([
      { id: '11001', codigo: '11001', nombre: 'Bogotá, D.C.', idPadre: '11' },
      { id: '05001', codigo: '05001', nombre: 'Medellín', idPadre: '05' },
    ]),
    obtenerDependencias: vi.fn().mockResolvedValue([]),
    obtenerUsuarioActual: vi.fn().mockResolvedValue({ id: 'u1', username: 'admin' }),
    obtenerParametrizacionFormulario: vi.fn().mockResolvedValue({ campos: [], configuraciones: {} }),
    consultarComisionado: vi.fn(),
    verificarSolapamiento: vi.fn(),
    crearSolicitudComision: vi.fn(),
    actualizarSolicitud: vi.fn(),
    obtenerChecklistDocumentos: vi.fn().mockResolvedValue({ obligatorios: [], opcionales: [] }),
    finalizarSolicitud: vi.fn(),
  },
}));

vi.mock('../services/authService', () => ({
  __esModule: true,
  default: {
    hasPermission: vi.fn().mockReturnValue(true),
    getUser: vi.fn().mockReturnValue({ id: 'u1' }),
  },
}));

describe('NuevaSolicitudModal — Validación de Solapamiento / Duplicidad al Guardar y Continuar', () => {
  const comisionadoMock = {
    id: 'com-001',
    numeroDocumento: '1020304050',
    primerNombre: 'Ana',
    primerApellido: 'Martínez',
    email: 'ana.martinez@esap.edu.co',
    tipoComisionado: 'FUNCIONARIO',
    autorizacionHabeasData: true,
    fechaFinContrato: '2027-12-31',
  };

  it('alerta y bloquea el avance la primera vez cuando hay solapamiento de fechas', async () => {
    vi.mocked(viaticosService.consultarComisionado).mockResolvedValue(comisionadoMock as any);
    vi.mocked(viaticosService.verificarSolapamiento).mockResolvedValue({
      haySolapamiento: true,
      mensaje: 'La comisión se solapa con la solicitud SOL-2026-0099 (desde 2026-10-15 hasta 2026-10-20).',
      solicitudConflicto: {
        id: 'sol-099',
        consecutivoUnico: 'SOL-2026-0099',
        estadoSolicitud: 'RADICADA',
        fechaInicio: '2026-10-15',
        fechaFin: '2026-10-20',
        destinoCiudad: 'Medellín',
      },
    });

    render(
      <NuevaSolicitudModal
        abierta={true}
        onCerrar={vi.fn()}
        onSolicitudCreada={vi.fn()}
      />
    );

    // 1. Paso 1: Consultar comisionado
    const docInput = screen.getByLabelText(/Documento de Identidad/i);
    fireEvent.change(docInput, { target: { value: '1020304050' } });
    fireEvent.click(screen.getByRole('button', { name: /Consultar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Ana Martínez/i)).toBeInTheDocument();
    });

    // Avanzar a Paso 2
    fireEvent.click(screen.getByRole('button', { name: /Guardar y Continuar/i }));

    await waitFor(() => {
      expect(screen.getByText(/2\. Objeto y Destino de la Comisión/i)).toBeInTheDocument();
    });

    // 2. Llenar objeto de la comisión
    const objetoInput = screen.getByPlaceholderText(/Describa el objetivo institucional/i);
    fireEvent.change(objetoInput, {
      target: { value: 'Visita técnica territorial para verificación de proyectos institucionales' },
    });

    // El itinerario por defecto ya tiene Bogotá -> Medellín configurado en formInicialNuevaSolicitud
    // Pulsar "Guardar y Continuar" (primer intento)
    const btnGuardar = screen.getByRole('button', { name: /Guardar y Continuar/i });
    fireEvent.click(btnGuardar);

    // Debe llamar a verificarSolapamiento
    await waitFor(() => {
      expect(viaticosService.verificarSolapamiento).toHaveBeenCalled();
    });

    // Debe mostrar la alerta de solapamiento y NO debe llamar a crearSolicitudComision
    await waitFor(() => {
      expect(screen.getByText(/Alerta de Duplicidad \/ Solapamiento de Fechas/i)).toBeInTheDocument();
      expect(screen.getByText(/Bloqueo preventivo/i)).toBeInTheDocument();
      expect(screen.getByText(/Primera advertencia:/i)).toBeInTheDocument();
      expect(viaticosService.crearSolicitudComision).not.toHaveBeenCalled();
    });

    // Sigue en el Paso 2
    expect(screen.getByText(/2\. Objeto y Destino de la Comisión/i)).toBeInTheDocument();
    expect(screen.queryByText(/3\. Documentos de la Comisión/i)).not.toBeInTheDocument();

    // 3. Segundo intento / Confirmar continuar de todos modos
    vi.mocked(viaticosService.crearSolicitudComision).mockResolvedValue({
      id: 'sol-nueva-001',
      estadoSolicitud: 'PENDIENTE',
      consecutivoUnico: 'SOL-2026-BORRADOR',
    } as any);

    const btnContinuarTodosModos = screen.getByRole('button', {
      name: /Continuar de todos modos al cargue de soportes/i,
    });
    fireEvent.click(btnContinuarTodosModos);

    // Ahora sí se debe guardar el borrador y avanzar al paso 3
    await waitFor(() => {
      expect(viaticosService.crearSolicitudComision).toHaveBeenCalled();
      expect(screen.getByText(/3\. Documentos de la Comisión/i)).toBeInTheDocument();
    });

    // En el Paso 3 debe verse el aviso de advertencia de que la solicitud tiene solapamiento
    expect(screen.getByText(/Aviso de Solapamiento de Fechas/i)).toBeInTheDocument();
  });
});
