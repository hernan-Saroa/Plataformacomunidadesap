import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfigSoportesLegalizacion from './ConfigSoportesLegalizacion';
import { legalizacionService } from '../services/api/legalizacionService';
import { viaticosService } from '../services/api/viaticosService';

vi.mock('../services/api/legalizacionService', () => ({
  CONDICIONES_SOPORTE_LEGALIZACION: [{ valor: 'TRANSPORTE_AEREO', etiqueta: 'Solo con transporte aéreo' }],
  legalizacionService: { obtenerConfig: vi.fn(), reemplazarChecklist: vi.fn() },
}));
vi.mock('../services/api/viaticosService', () => ({
  viaticosService: { obtenerTodasConfiguraciones: vi.fn(), obtenerTiposDocumentoSoporte: vi.fn(), crearTipoDocumentoSoporte: vi.fn() },
}));

const leg = legalizacionService as unknown as Record<string, ReturnType<typeof vi.fn>>;
const via = viaticosService as unknown as Record<string, ReturnType<typeof vi.fn>>;

const doc = (codigo: string, nombre: string) => ({ id: `id-${codigo}`, codigo, nombre, descripcion: null, activo: true });
const item = (tipo: string, codigo: string, nombre: string, orden: number, extra: Record<string, unknown> = {}) => ({
  tipo_comisionado: tipo, codigo, nombre, tipo_requisito: 'OBLIGATORIO', condicion: null, orden, activo: true, ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  via.obtenerTodasConfiguraciones.mockResolvedValue([{ tipoComisionado: 'FUNCIONARIO' }, { tipoComisionado: 'CONTRATISTA' }]);
  via.obtenerTiposDocumentoSoporte.mockResolvedValue([
    doc('LEG_GF_FO_031', 'Formato GF-FO-031'), doc('LEG_AGENDA', 'Agenda cumplida'), doc('PASABORDOS', 'Pasabordos'),
  ]);
  leg.obtenerConfig.mockResolvedValue({
    checklist: [
      item('FUNCIONARIO', 'LEG_AGENDA', 'Agenda cumplida', 2),
      item('FUNCIONARIO', 'LEG_GF_FO_031', 'Formato GF-FO-031', 1),
      item('FUNCIONARIO', 'PASABORDOS', 'Pasabordos', 3, { activo: false }),
      item('CONTRATISTA', 'LEG_GF_FO_031', 'Formato GF-FO-031', 1),
    ],
  });
  leg.reemplazarChecklist.mockResolvedValue([]);
});

/**
 * La lista se llena en un render posterior al título (useEffect sobre config/tipo):
 * esperar el título deja una carrera que bajo la carga de la suite completa falla.
 */
const esperarLista = () => screen.findAllByRole('listitem');

describe('EFDS-1309 — soportes de legalización administrables', () => {
  it('muestra solo los soportes activos del tipo de comisionado, en su orden', async () => {
    render(<ConfigSoportesLegalizacion />);
    await esperarLista();
    const nombres = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(nombres[0]).toContain('1. Formato GF-FO-031');
    expect(nombres[1]).toContain('2. Agenda cumplida');
    expect(nombres).toHaveLength(2);
  });

  it('modifica requisito, condición y orden, agrega del catálogo y guarda el checklist completo', async () => {
    render(<ConfigSoportesLegalizacion />);
    await esperarLista();
    const guardar = screen.getByRole('button', { name: /Guardar soportes de legalización/ });
    expect(guardar).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Requisito de Agenda cumplida'), { target: { value: 'OPCIONAL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir Agenda cumplida' }));
    fireEvent.change(screen.getByLabelText('Agregar documento del catálogo'), { target: { value: 'PASABORDOS' } });
    fireEvent.click(screen.getByRole('button', { name: /^Agregar$/ }));
    fireEvent.change(screen.getByLabelText('Condición de Pasabordos'), { target: { value: 'TRANSPORTE_AEREO' } });
    fireEvent.click(guardar);

    await screen.findByText('Soportes de legalización guardados.');
    expect(leg.reemplazarChecklist).toHaveBeenCalledWith('FUNCIONARIO', [
      { codigo: 'LEG_AGENDA', tipoRequisito: 'OPCIONAL', condicion: null, orden: 1 },
      { codigo: 'LEG_GF_FO_031', tipoRequisito: 'OBLIGATORIO', condicion: null, orden: 2 },
      { codigo: 'PASABORDOS', tipoRequisito: 'OBLIGATORIO', condicion: 'TRANSPORTE_AEREO', orden: 3 },
    ]);
  });

  it('quitar un soporte lo saca del checklist enviado', async () => {
    render(<ConfigSoportesLegalizacion />);
    await esperarLista();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Agenda cumplida' }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar soportes de legalización/ }));
    await waitFor(() => expect(leg.reemplazarChecklist).toHaveBeenCalledWith('FUNCIONARIO', [
      { codigo: 'LEG_GF_FO_031', tipoRequisito: 'OBLIGATORIO', condicion: null, orden: 1 },
    ]));
  });

  it('crea un documento nuevo en el catálogo y lo agrega al checklist de legalización', async () => {
    via.crearTipoDocumentoSoporte.mockResolvedValue(doc('LEG_CERT_ASISTENCIA', 'Certificado de asistencia'));
    render(<ConfigSoportesLegalizacion />);
    await esperarLista();
    fireEvent.change(screen.getByLabelText('Código'), { target: { value: 'leg_cert_asistencia' } });
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Certificado de asistencia' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear y agregar/ }));
    await screen.findByText(/Documento Certificado de asistencia creado/);
    expect(via.crearTipoDocumentoSoporte).toHaveBeenCalledWith({ codigo: 'LEG_CERT_ASISTENCIA', nombre: 'Certificado de asistencia' });
    expect(screen.getByText(/3\. Certificado de asistencia/)).toBeInTheDocument();
  });

  it('rechaza un código inválido sin llamar al servicio', async () => {
    render(<ConfigSoportesLegalizacion />);
    await esperarLista();
    fireEvent.change(screen.getByLabelText('Código'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Algo' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear y agregar/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El código debe tener de 2 a 50 caracteres');
    expect(via.crearTipoDocumentoSoporte).not.toHaveBeenCalled();
  });

  it('cambiar de tipo de comisionado muestra su propio checklist', async () => {
    render(<ConfigSoportesLegalizacion />);
    await esperarLista();
    fireEvent.change(screen.getByLabelText('Tipo de comisionado'), { target: { value: 'CONTRATISTA' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
});
