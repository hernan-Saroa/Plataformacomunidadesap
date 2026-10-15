import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DocentesContratoService } from './docentes-contrato.service';
import { RundDocentesClient, type DocenteRundCrudo } from '../../integracion-rund/rund-docentes.client';

const docente = (extra: Partial<DocenteRundCrudo> = {}): DocenteRundCrudo => ({
  idDocente: 'd1', idPersona: 'p1', documento: '123', nombreCompleto: 'ANA PRUEBA',
  correoInstitucional: 'ana@esap.edu.co', territorialCodigo: 'SC', territorialNombre: 'SEDE_CENTRAL',
  tipoVinculacion: 'Carrera1', dedicacion: 'TC', dedicacionHorasSemana: 40, escalafon: 'Asociado',
  regimenNormativo: 'Decreto 1279', horasAsignables: '40', fechaInicioVinculacion: '2024-02-01T00:00:00.000Z',
  fechaFinVinculacion: null, situacionAdministrativa: 'Servicio Activo', situacionCategoria: null, estado: 'ACTIVO',
  nivelFormacion: 'Maestria', nucleoTematico: 'Gestion Publica', ...extra,
});

describe('DocentesContratoService: el RUND se consulta a rund-service', () => {
  it('arma el DTO del contrato con los datos del RUND y clasifica la situación', async () => {
    const rund = { porDocumento: jest.fn().mockResolvedValue(docente()) } as unknown as RundDocentesClient;
    const dto = await new DocentesContratoService(rund).buscarPorDocumento(' 123 ');

    expect(rund.porDocumento).toHaveBeenCalledWith('123');
    expect(dto).toMatchObject({
      documento: '123', nombreCompleto: 'ANA PRUEBA', correoInstitucional: 'ana@esap.edu.co',
      territorial: { codigo: 'SC', nombre: 'SEDE_CENTRAL' }, vinculacion: 'Carrera1', dedicacion: 'TC',
      escalafon: 'Asociado', horasPta: 40, vinculacion_desde: '2024-02-01', vinculacion_hasta: null,
      nivelFormacion: 'Maestria',
    });
    expect(dto.situacion.asignable).toBe(true);
  });

  it('una comisión de servicios queda no asignable (la clasificación sigue en este contrato)', async () => {
    const rund = { porDocumento: jest.fn().mockResolvedValue(docente({ situacionCategoria: 'comision', situacionAdministrativa: 'Comisión de estudios' })) } as unknown as RundDocentesClient;
    const dto = await new DocentesContratoService(rund).buscarPorDocumento('123');
    expect(dto.situacion.asignable).toBe(false);
  });

  it('sin territorial devuelve null y un documento vacío es 400 sin llamar al RUND', async () => {
    const rund = { porDocumento: jest.fn().mockResolvedValue(docente({ territorialCodigo: null })) } as unknown as RundDocentesClient;
    const servicio = new DocentesContratoService(rund);
    expect((await servicio.buscarPorDocumento('123')).territorial).toBeNull();
    (rund.porDocumento as jest.Mock).mockClear();
    await expect(servicio.buscarPorDocumento('  ')).rejects.toBeInstanceOf(BadRequestException);
    expect(rund.porDocumento).not.toHaveBeenCalled();
  });

  it('propaga el 404 y la indisponibilidad del RUND', async () => {
    const rund = { porDocumento: jest.fn() } as unknown as RundDocentesClient;
    (rund.porDocumento as jest.Mock).mockRejectedValueOnce(new NotFoundException('no existe'));
    await expect(new DocentesContratoService(rund).buscarPorDocumento('9')).rejects.toBeInstanceOf(NotFoundException);
    (rund.porDocumento as jest.Mock).mockRejectedValueOnce(new ServiceUnavailableException('caído'));
    await expect(new DocentesContratoService(rund).buscarPorDocumento('9')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('RundDocentesClient', () => {
  const entorno = { ...process.env };
  const fetchOriginal = global.fetch;
  const resp = (status: number, cuerpo: unknown = {}) => ({ status, ok: status < 300, json: async () => cuerpo }) as unknown as Response;
  afterEach(() => { process.env = { ...entorno }; global.fetch = fetchOriginal; });

  it('llama a la API interna con el token de servicio', async () => {
    process.env.RUND_SERVICE_URL = 'http://rund:3016';
    process.env.INTERNAL_SERVICE_TOKEN = 't';
    const f = jest.fn().mockResolvedValue(resp(200, { data: docente({ documento: '1', idPersona: '00000000-0000-0000-0000-000000000001' }) }));
    global.fetch = f as any;
    await expect(new RundDocentesClient().porDocumento('1')).resolves.toEqual(docente({ documento: '1', idPersona: '00000000-0000-0000-0000-000000000001' }));
    expect(f.mock.calls[0][0]).toBe('http://rund:3016/internal/rund/v1/docentes/por-documento/1');
    expect(f.mock.calls[0][1].headers['x-internal-service-token']).toBe('t');
  });

  it('404 → NotFound; error o caída → ServiceUnavailable; producción sin token → no llama', async () => {
    global.fetch = jest.fn().mockResolvedValue(resp(404)) as any;
    await expect(new RundDocentesClient().porDocumento('1')).rejects.toBeInstanceOf(NotFoundException);
    global.fetch = jest.fn().mockResolvedValue(resp(502)) as any;
    await expect(new RundDocentesClient().porDocumento('1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;
    await expect(new RundDocentesClient().porDocumento('1')).rejects.toBeInstanceOf(ServiceUnavailableException);

    delete process.env.INTERNAL_SERVICE_TOKEN;
    process.env.NODE_ENV = 'production';
    const f = jest.fn();
    global.fetch = f as any;
    await expect(new RundDocentesClient().porDocumento('1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(f).not.toHaveBeenCalled();
  });
});
