import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CAMPOS_SOPORTE_RUND, RundValidacionService } from './rund-validacion.service';

describe('RundValidacionService', () => {
  const docente = { id: 'doc-1', personaId: '11111111-1111-4111-8111-111111111111' };
  let docenteRepo: { findOne: jest.Mock; find: jest.Mock };
  let dataSource: { query: jest.Mock };
  let identities: { resolver: jest.Mock };
  let service: RundValidacionService;
  const catalogo = () => CAMPOS_SOPORTE_RUND.map(item => ({ campo_rund: item.campo,
    tipo_documento_soporte: item.tipo, estado_documento: 'Sin cargar' }));

  beforeEach(() => {
    docenteRepo = { findOne: jest.fn().mockResolvedValue(docente), find: jest.fn().mockResolvedValue([]) };
    dataSource = { query: jest.fn().mockResolvedValue(catalogo()) };
    identities = { resolver: jest.fn().mockResolvedValue(null) };
    service = new RundValidacionService(docenteRepo as any, dataSource as any, identities as any);
  });

  describe('getRundDocente', () => {
    it('lanza NotFound si el docente no existe ni en el banco ni en auth', async () => {
      docenteRepo.findOne.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([]);
      await expect(service.getRundDocente('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('resuelve por persona de auth cuando el id recibido no es del banco', async () => {
      docenteRepo.findOne.mockResolvedValue(null);
      docenteRepo.find.mockResolvedValue([docente]);
      identities.resolver.mockResolvedValue(docente.personaId);
      const r = await service.getRundDocente('user-9');
      expect(r.docenteId).toBe('doc-1');
      expect(identities.resolver).toHaveBeenCalledWith('user-9');
      expect(dataSource.query.mock.calls.every(([sql]) => !sql.includes('auth.'))).toBe(true);
      expect(docenteRepo.find).toHaveBeenCalledWith({ where: { personaId: docente.personaId }, take: 2, order: { id: 'ASC' } });
    });

    it('consulta identificadores textuales sin compararlos con personaId UUID', async () => {
      docenteRepo.findOne.mockResolvedValue(docente);
      const result = await service.getRundDocente('DOC-HISTORICO-001');
      expect(result.docenteId).toBe('doc-1');
      expect(docenteRepo.findOne).toHaveBeenCalledWith({ where: { id: 'DOC-HISTORICO-001' } });
      expect(docenteRepo.find).not.toHaveBeenCalled();
      expect(identities.resolver).not.toHaveBeenCalled();
    });

    it.each([
      '11111111-1111-4111-8111-111111111111',
      '11111111111141118111111111111111',
      '{11111111-1111-4111-8111-111111111111}',
    ])('conserva la búsqueda por persona para el UUID %s', async (key) => {
      docenteRepo.findOne.mockResolvedValue(null);
      docenteRepo.find.mockResolvedValue([docente]);
      await service.getRundDocente(key);
      expect(docenteRepo.findOne).toHaveBeenCalledWith({ where: { id: key } });
      expect(docenteRepo.find).toHaveBeenCalledWith({ where: { personaId: key }, take: 2, order: { id: 'ASC' } });
    });

    it('si no hay validaciones, siembra los 36 campos del banco en "Sin cargar" y los devuelve', async () => {
      docenteRepo.findOne.mockResolvedValue(docente);
      const sembrados: any[] = [];
      dataSource.query.mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO rund.validacion_documental')) {
          sembrados.push(...params![1].map((campo: string, index: number) => [params![0], campo, params![2][index]]));
          return [];
        }
        // Primera lectura vacía, la relectura devuelve lo sembrado.
        return sembrados.length ? sembrados.map((p) => ({ campo_rund: p[1], tipo_documento_soporte: p[2], estado_documento: 'Sin cargar' })) : [];
      });
      const r = await service.getRundDocente('doc-1');
      expect(CAMPOS_SOPORTE_RUND).toHaveLength(36);
      expect(sembrados).toHaveLength(36);
      expect(r.validaciones).toHaveLength(36);
      expect(r.completitud).toBe(0);
    });

    it('calcula la completitud como % de campos Aceptado', async () => {
      docenteRepo.findOne.mockResolvedValue(docente);
      dataSource.query.mockResolvedValue(catalogo().map((row, index) => ({ ...row, estado_documento: index < 18 ? 'Aceptado' : 'Pendiente' })));
      expect((await service.getRundDocente('doc-1')).completitud).toBe(50);
    });

    it('un perfil explícito se conserva aunque la persona tenga otros períodos', async () => {
      docenteRepo.find.mockResolvedValue([docente, { ...docente, id: 'otro-periodo' }]);
      expect((await service.getRundDocente('doc-1')).docenteId).toBe('doc-1');
      expect(docenteRepo.find).not.toHaveBeenCalled();
    });

    it('un alias de persona ambiguo devuelve conflicto antes de leer o sembrar estados', async () => {
      docenteRepo.findOne.mockResolvedValue(null);
      docenteRepo.find.mockResolvedValue([docente, { ...docente, id: 'otro-periodo' }]);
      await expect(service.getRundDocente(docente.personaId)).rejects.toBeInstanceOf(ConflictException);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('un alias de usuario tampoco selecciona un período arbitrario', async () => {
      docenteRepo.findOne.mockResolvedValue(null);
      docenteRepo.find.mockResolvedValue([docente, { ...docente, id: 'otro-periodo' }]);
      identities.resolver.mockResolvedValue(docente.personaId);
      await expect(service.getRundDocente('user-9')).rejects.toBeInstanceOf(ConflictException);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('un fallo de Auth no se presenta como docente inexistente', async () => {
      docenteRepo.findOne.mockResolvedValue(null);
      identities.resolver.mockRejectedValue(new ServiceUnavailableException());
      await expect(service.getRundDocente('user-9')).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('completa solo faltantes sin perder aprobación, observación ni actor existentes', async () => {
      const aceptado = { ...catalogo()[0], id: 'estado-original', estado_documento: 'Aceptado',
        validado_por: 'actor-original', observacion: 'CONSERVAR', fecha_validacion: '2026-01-01' };
      let rows = [aceptado];
      dataSource.query.mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO')) {
          expect(params[1]).not.toContain('DOCUMENTO_IDENTIDAD');
          rows = [...rows, ...catalogo().filter(row => row.campo_rund !== aceptado.campo_rund)] as any;
          return [];
        }
        return rows;
      });
      const result = await service.getRundDocente('doc-1');
      expect(result.validaciones).toHaveLength(36);
      expect(result.validaciones[0]).toEqual(aceptado);
      expect(result.completitud).toBe(3);
      expect(dataSource.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO'))).toHaveLength(1);
    });

    it('no escribe cuando el catálogo ya está completo; extras históricos no inflan completitud', async () => {
      dataSource.query.mockResolvedValue([...catalogo(), { campo_rund: 'ADICIONAL_HISTORICO', estado_documento: 'Aceptado' }]);
      const result = await service.getRundDocente('doc-1');
      expect(result.validaciones).toHaveLength(37);
      expect(result.completitud).toBe(0);
      expect(dataSource.query).toHaveBeenCalledTimes(1);
    });

    it('un catálogo histórico de 24 campos no anuncia 100% ni pierde sus decisiones al completar los 36', async () => {
      const ampliados = new Set(['SEXO_BIOLOGICO', 'CORREO_ALTERNATIVO', 'TELEFONO', 'DEDICACION_HORAS_SEMANA',
        'HORAS_PTA', 'REGIMEN_NORMATIVO', 'ORIGEN_VINCULACION', 'SITUACION_CATEGORIA', 'ESTADO_DOCENTE',
        'INVESTIGACION_ACTIVA', 'OBSERVACIONES', 'ID_RUND']);
      const legacy = catalogo().filter(row => !ampliados.has(row.campo_rund))
        .map(row => ({ ...row, estado_documento: 'Aceptado', observacion: 'CONSERVAR' }));
      let rows: any[] = [...legacy];
      dataSource.query.mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO')) {
          expect(new Set(params[1])).toEqual(ampliados);
          rows.push(...catalogo().filter(row => ampliados.has(row.campo_rund)));
          return [];
        }
        return rows;
      });
      expect(legacy).toHaveLength(24);
      const result = await service.getRundDocente('doc-1');
      expect(result.completitud).toBe(67);
      expect(result.validaciones).toHaveLength(36);
      expect(result.validaciones.filter(row => !ampliados.has(row.campo_rund)))
        .toEqual(legacy.map(row => ({ ...row })));
    });

    it('una inicialización que no confirma todos los campos falla sin anunciar 100%', async () => {
      dataSource.query.mockResolvedValue([{ campo_rund: 'DOCUMENTO_IDENTIDAD', estado_documento: 'Aceptado' }]);
      await expect(service.getRundDocente('doc-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('rechaza estados duplicados o inválidos en lugar de elegir una decisión', async () => {
      dataSource.query.mockResolvedValue([...catalogo(), catalogo()[0]]);
      await expect(service.getRundDocente('doc-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
      dataSource.query.mockResolvedValue(catalogo().map((row, index) => index ? row : { ...row, estado_documento: 'DESCONOCIDO' }));
      await expect(service.getRundDocente('doc-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('syncRundDocuments', () => {
    beforeEach(() => {
      docenteRepo.findOne.mockResolvedValue(docente);
      dataSource.query.mockImplementation(async (sql: string) => (sql.startsWith('SELECT') ? [{ estado_documento: 'Sin cargar' }] : []));
    });

    it.each([[], { documentos: [] }, { documentos: [{ categoria: 'personal', estado: 'validado' }] }, { roles: ['SUPER_ADMIN'] }])(
      'rechaza datos del cliente sin consultar ni modificar el banco', async body => {
      await expect(service.syncRundDocuments('doc-1', body)).rejects.toBeInstanceOf(ConflictException);
      expect(dataSource.query).not.toHaveBeenCalled();
      expect(docenteRepo.findOne).not.toHaveBeenCalled();
    });

    it('deshabilitado no consulta Auth ni tablas nuevas', async () => {
      await expect(service.syncRundDocuments('doc-1', {})).rejects.toBeInstanceOf(ConflictException);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('usa exclusivamente el perfil exacto y el UUID de persona persistido', async () => {
      const sync = { enabled: true, syncPersona: jest.fn().mockResolvedValue({ propietario: 'auth' }) };
      service = new RundValidacionService(docenteRepo as any, dataSource as any, identities as any, sync as any);
      await expect(service.syncRundDocuments('doc-1', {})).resolves.toEqual({ propietario: 'auth' });
      expect(docenteRepo.findOne).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
      expect(sync.syncPersona).toHaveBeenCalledWith(docente.personaId);
      expect(dataSource.query).not.toHaveBeenCalled();
    });
  });
});
