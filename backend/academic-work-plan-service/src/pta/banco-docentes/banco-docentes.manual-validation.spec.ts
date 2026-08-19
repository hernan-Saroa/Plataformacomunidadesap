import { BadRequestException } from '@nestjs/common';
import {
  BancoDocentesService,
  normalizeBancoDocentePayload,
  validateManualBancoDocentePayload,
} from './banco-docentes.service';

const validManualPayload = {
  documentNumber: '1020304050',
  documentType: 'CC',
  nombreCompleto: 'MARIA FERNANDA LOPEZ GARCIA',
  genero: 'Femenino',
  sexoBiologico: 'Mujer',
  fechaNacimiento: '1985-06-15',
  correoInstitucional: 'maria.lopez@esap.edu.co',
  correoAlternativo: 'maria.lopez@example.com',
  telefono: '3001234567',
  tipoVinculacion: 'OCASIONAL',
  regimenNormativo: 'Circular Dispositiva 003/2025',
  horasPta: 800,
  territorialNombre: 'Sede Central',
  dedicacion: 'TC',
  dedicacionHorasSemana: 40,
  escalafon: 'Asistente',
  fechaInicioVinculacion: '2026-01-15',
  fechaFinVinculacion: '2026-12-15',
  estado: 'ACTIVO',
  actoAdministrativoVinculacion: 'Resolucion 001 de 2026',
  origenVinculacion: 'Convocatoria docente',
  puntajeSalarial: 145.5,
  situacionAdministrativa: 'Servicio activo',
  situacionCategoria: 'Servicio Activo',
  nivelFormacion: 'Maestria',
  pregrado: 'Administradora Publica',
  nucleoTematico: 'Administracion Publica',
  perfilAcademico: 'Administradora publica con experiencia docente',
  periodoCarga: '2026-2',
};

function validate(raw: Record<string, unknown>) {
  return validateManualBancoDocentePayload(normalizeBancoDocentePayload(raw), raw);
}

describe('BancoDocentesService - validacion del Canal 2 manual', () => {
  it('normaliza sin mutar el objeto que tambien usa la carga masiva', () => {
    const raw = { ...validManualPayload };
    const snapshot = { ...raw };
    normalizeBancoDocentePayload(raw);
    expect(raw).toEqual(snapshot);
    expect(raw).not.toHaveProperty('DOCUMENTNUMBER');
  });

  it('acepta un perfil completo alineado con los campos RUND', () => {
    expect(() => validate(validManualPayload)).not.toThrow();
  });

  it('rechaza letras en una cedula numerica', () => {
    expect(() => validate({ ...validManualPayload, documentNumber: '1020ABC050' }))
      .toThrow(BadRequestException);
  });

  it('permite un pasaporte alfanumerico pero no simbolos', () => {
    expect(() => validate({ ...validManualPayload, documentType: 'PA', documentNumber: 'AB123456' }))
      .not.toThrow();
    expect(() => validate({ ...validManualPayload, documentType: 'PA', documentNumber: 'AB-123456' }))
      .toThrow(BadRequestException);
  });

  it('rechaza letras en telefono o celular', () => {
    expect(() => validate({ ...validManualPayload, telefono: '300ABC4567' }))
      .toThrow(BadRequestException);
  });

  it('exige correo institucional ESAP y correo personal diferente', () => {
    expect(() => validate({ ...validManualPayload, correoInstitucional: 'maria@example.com' }))
      .toThrow(BadRequestException);
    expect(() => validate({
      ...validManualPayload,
      correoAlternativo: validManualPayload.correoInstitucional,
    })).toThrow(BadRequestException);
  });

  it('rechaza rangos de fechas y periodos inconsistentes', () => {
    expect(() => validate({
      ...validManualPayload,
      fechaInicioVinculacion: '2026-12-15',
      fechaFinVinculacion: '2026-01-15',
    })).toThrow(BadRequestException);
    expect(() => validate({ ...validManualPayload, periodoCarga: '2026-3' }))
      .toThrow(BadRequestException);
  });

  it('rechaza genero o estado fuera de los catalogos del perfil', () => {
    expect(() => validate({ ...validManualPayload, genero: 'valor libre' }))
      .toThrow(BadRequestException);
    expect(() => validate({ ...validManualPayload, estado: 'ELIMINADO' }))
      .toThrow(BadRequestException);
  });

  it.each([
    ['horasPta', 'ochocientas'],
    ['dedicacionHorasSemana', 'cuarenta'],
    ['puntajeSalarial', 'ciento cuarenta'],
    ['fechaFinVinculacion', 'fecha desconocida'],
  ])('rechaza texto en el campo tipado %s', (field, value) => {
    expect(() => validate({ ...validManualPayload, [field]: value }))
      .toThrow(BadRequestException);
  });
});

describe('BancoDocentesService - protecciones de edicion manual', () => {
  function buildService(queryResults: any[] = []) {
    const docente = { id: 'docente-1', personaId: 'persona-1', periodoCarga: '2026-2', estado: 'ACTIVO' };
    const docenteRepo = {
      findOne: jest.fn().mockResolvedValue(docente),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const dataSource = {
      query: jest.fn().mockImplementation(async () => queryResults.shift() || []),
    };
    const service = new BancoDocentesService(
      docenteRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
    );
    return { service, dataSource, docenteRepo, docente };
  }

  it('bloquea una edicion sin soporte y justificacion', async () => {
    const { service } = buildService();
    await expect(service.updateDocente('docente-1', {})).rejects.toThrow(BadRequestException);
  });

  it('bloquea cualquier intento de modificar la cedula', async () => {
    const { service } = buildService([
      [{ id: 'soporte-1' }],
      [{ document_number: '1020304050' }],
    ]);
    await expect(service.updateDocente('docente-1', {
      soporteEdicionId: 'soporte-1',
      justificacionEdicion: 'Correccion de datos',
      documentNumber: '9999999999',
    })).rejects.toThrow(BadRequestException);
  });

  it('bloquea el cambio de periodo para conservar las relaciones PTA', async () => {
    const { service } = buildService([
      [{ id: 'soporte-1' }],
      [{ document_number: '1020304050' }],
    ]);
    await expect(service.updateDocente('docente-1', {
      soporteEdicionId: 'soporte-1',
      justificacionEdicion: 'Correccion de datos',
      documentNumber: '1020304050',
      periodoCarga: '2027-1',
    })).rejects.toThrow(BadRequestException);
  });

  it('impide cambiar el estado mediante la edicion general', async () => {
    const { service } = buildService([
      [{ id: 'soporte-1' }],
      [{ document_number: '1020304050' }],
    ]);
    await expect(service.updateDocente('docente-1', {
      soporteEdicionId: 'soporte-1',
      justificacionEdicion: 'Correccion de datos generales',
      documentNumber: '1020304050',
      periodoCarga: '2026-2',
      estado: 'INACTIVO',
    })).rejects.toThrow('Use la accion Activar/Inactivar');
  });

  it('exige soporte y justificacion para activar o inactivar', async () => {
    const { service } = buildService();
    await expect(service.cambiarEstado('docente-1', {
      estadoObjetivo: 'INACTIVO',
      justificacion: 'Motivo valido del cambio',
    })).rejects.toThrow(BadRequestException);
  });

  it('cambia solo el perfil del periodo y registra actor, motivo y soporte', async () => {
    const { service, dataSource, docenteRepo, docente } = buildService([[{ id: 'soporte-estado-1' }]]);
    const auditSpy = jest.spyOn(service, 'logAudit').mockResolvedValue(undefined);

    const result = await service.cambiarEstado('docente-1', {
      estadoObjetivo: 'INACTIVO',
      justificacion: 'Terminacion de la vinculacion docente',
      soporteId: 'soporte-estado-1',
      actorId: 'usuario-ggp-1',
      periodoCarga: '2026-2',
    });

    expect(result).toMatchObject({ id: 'docente-1', estado: 'INACTIVO', periodoCarga: '2026-2' });
    expect(docente.estado).toBe('INACTIVO');
    expect(docenteRepo.save).toHaveBeenCalledWith(docente);
    expect(dataSource.query).toHaveBeenCalledTimes(1);
    expect(String(dataSource.query.mock.calls[0][0])).not.toContain('UPDATE auth."user"');
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({
      accion: 'DESACTIVAR',
      actorId: 'usuario-ggp-1',
      soporteId: 'soporte-estado-1',
      datoPrevio: 'ACTIVO',
      datoNuevo: 'INACTIVO',
    }));
  });

});

describe('BancoDocentesService - consulta por cedula y periodo', () => {
  it('busca por documento y exige coincidencia exacta del periodo solicitado', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{
        docente_id: 'docente-1',
        persona_id: 'persona-1',
        usuario_id: 'usuario-1',
        documento_identidad: '1020304050',
        nombre_completo: 'MARIA FERNANDA LOPEZ GARCIA',
        periodo_carga: '2026-2',
        estado: 'ACTIVO',
      }]),
    };
    const service = new BancoDocentesService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
    );

    const result = await service.getById('1020304050', '2026-2');
    const [sql, params] = dataSource.query.mock.calls[0];

    expect(result).toMatchObject({ documento_identidad: '1020304050', periodoCarga: '2026-2' });
    expect(sql).toContain('documento_identidad = $1');
    expect(sql).toContain('AND ($2::text IS NULL OR periodo_carga = $2::text)');
    expect(params).toEqual(['1020304050', '2026-2']);
  });

});
