import { ConflictException, NotFoundException } from '@nestjs/common';
import { CAMPOS_SOPORTE_RUND, RundValidacionService } from './rund-validacion.service';

describe('RundValidacionService', () => {
  const docente = { id: 'doc-1', personaId: '11111111-1111-4111-8111-111111111111' };
  let docenteRepo: { findOne: jest.Mock };
  let dataSource: { query: jest.Mock };
  let service: RundValidacionService;

  beforeEach(() => {
    docenteRepo = { findOne: jest.fn() };
    dataSource = { query: jest.fn() };
    service = new RundValidacionService(docenteRepo as any, dataSource as any);
  });

  describe('getRundDocente', () => {
    it('lanza NotFound si el docente no existe ni en el banco ni en auth', async () => {
      docenteRepo.findOne.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([]);
      await expect(service.getRundDocente('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('resuelve por persona de auth cuando el id recibido no es del banco', async () => {
      docenteRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(docente);
      dataSource.query
        .mockResolvedValueOnce([{ person_id: docente.personaId }]) // auth.personas
        .mockResolvedValueOnce([{ campo_rund: 'GENERO', estado_documento: 'Aceptado' }]); // validaciones
      const r = await service.getRundDocente('user-9');
      expect(r.docenteId).toBe('doc-1');
      expect(docenteRepo.findOne).toHaveBeenLastCalledWith({ where: [{ id: docente.personaId }, { personaId: docente.personaId }] });
    });

    it('consulta identificadores textuales sin compararlos con personaId UUID', async () => {
      docenteRepo.findOne.mockResolvedValue(docente);
      dataSource.query.mockResolvedValue([{ estado_documento: 'Sin cargar' }]);
      const result = await service.getRundDocente('DOC-HISTORICO-001');
      expect(result.docenteId).toBe('doc-1');
      expect(docenteRepo.findOne).toHaveBeenCalledWith({ where: [{ id: 'DOC-HISTORICO-001' }] });
    });

    it.each([
      '11111111-1111-4111-8111-111111111111',
      '11111111111141118111111111111111',
      '{11111111-1111-4111-8111-111111111111}',
    ])('conserva la búsqueda por persona para el UUID %s', async (key) => {
      docenteRepo.findOne.mockResolvedValue(docente);
      dataSource.query.mockResolvedValue([{ estado_documento: 'Sin cargar' }]);
      await service.getRundDocente(key);
      expect(docenteRepo.findOne).toHaveBeenCalledWith({ where: [{ id: key }, { personaId: key }] });
    });

    it('si no hay validaciones, siembra los 24 campos en "Sin cargar" y los devuelve', async () => {
      docenteRepo.findOne.mockResolvedValue(docente);
      const sembrados: any[] = [];
      dataSource.query.mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO rund.validacion_documental')) {
          sembrados.push(params);
          return [];
        }
        // Primera lectura vacía, la relectura devuelve lo sembrado.
        return sembrados.length ? sembrados.map((p) => ({ campo_rund: p[1], tipo_documento_soporte: p[2], estado_documento: 'Sin cargar' })) : [];
      });
      const r = await service.getRundDocente('doc-1');
      expect(CAMPOS_SOPORTE_RUND).toHaveLength(24);
      expect(sembrados).toHaveLength(24);
      expect(r.validaciones).toHaveLength(24);
      expect(r.completitud).toBe(0);
    });

    it('calcula la completitud como % de campos Aceptado', async () => {
      docenteRepo.findOne.mockResolvedValue(docente);
      dataSource.query.mockResolvedValue([
        { estado_documento: 'Aceptado' },
        { estado_documento: 'Aceptado' },
        { estado_documento: 'Pendiente' },
        { estado_documento: 'Rechazado' },
      ]);
      expect((await service.getRundDocente('doc-1')).completitud).toBe(50);
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
      service = new RundValidacionService(docenteRepo as any, dataSource as any, sync as any);
      await expect(service.syncRundDocuments('doc-1', {})).resolves.toEqual({ propietario: 'auth' });
      expect(docenteRepo.findOne).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
      expect(sync.syncPersona).toHaveBeenCalledWith(docente.personaId);
      expect(dataSource.query).not.toHaveBeenCalled();
    });
  });
});
