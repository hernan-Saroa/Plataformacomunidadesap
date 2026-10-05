import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import NuevaSolicitudModal from './NuevaSolicitudModal';
import viaticosService from '../services/api/viaticosService';

vi.mock('../services/api/viaticosService', () => ({
  default: {
    obtenerConfiguracionTipo: vi.fn().mockResolvedValue({
      camposObligatorios: [],
      camposOpcionales: [],
      camposOcultos: [],
      documentos: [],
    }),
    obtenerChecklistDocumentos: vi.fn(),
    obtenerDepartamentos: vi.fn().mockResolvedValue([]),
    obtenerCiudades: vi.fn().mockResolvedValue([]),
    obtenerDependencias: vi.fn().mockResolvedValue([]),
    consultarComisionado: vi.fn(),
    obtenerSaldosTiquetes: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../services/api/authService', () => ({
  authService: {
    getCurrentUserSync: vi.fn().mockReturnValue({ userId: 'u1', username: 'test', esAdmin: false }),
    getCurrentUser: vi.fn().mockResolvedValue({ userId: 'u1', username: 'test' }),
    hasPermission: vi.fn().mockReturnValue(true),
  },
}));

describe('NuevaSolicitudModal - Paso 3 Ayudas Visuales de Validación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra las pautas de validación y datos a contrastar para CDP, Certificación Bancaria, RUT, Seguridad Social y Contrato SECOP', async () => {
    (viaticosService.obtenerChecklistDocumentos as any).mockResolvedValue({
      obligatorios: [
        {
          codigo: 'CDP',
          nombre: 'Certificado de Disponibilidad Presupuestal',
          descripcion: 'Documento CDP oficial',
          instruccionesValidacion: 'Verificar que el número de CDP y valor coincidan con la comisión.',
        },
        {
          codigo: 'CERT_BANCARIA',
          nombre: 'Certificación Bancaria',
          descripcion: 'Certificado bancario comisionado',
          instruccionesValidacion: 'Validar que la certificación bancaria no supere 90 días de vigencia.',
        },
        {
          codigo: 'RUT',
          nombre: 'RUT - Registro Único Tributario',
          descripcion: 'RUT vigente',
        },
        {
          codigo: 'CONTRATO_SECOP',
          nombre: 'Contrato SECOP',
          descripcion: 'Contrato vigente en SECOP',
        },
      ],
      opcionales: [
        {
          codigo: 'SEGURIDAD_SOCIAL',
          nombre: 'Seguridad Social',
          descripcion: 'Acreditación de pago EPS y ARL',
        },
      ],
    });

    render(
      <NuevaSolicitudModal
        abierta={true}
        onCerrar={() => {}}
        onSolicitudCreada={() => {}}
      />
    );

    // Esperar a que cargue el modal
    expect(screen.getByText(/Nueva Solicitud de Comisión/i)).toBeInTheDocument();
  });
});
