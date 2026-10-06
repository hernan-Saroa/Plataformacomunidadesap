import { NotFoundException } from '@nestjs/common';
import { CAMPOS_SOPORTE_RUND, RundValidacionService } from './rund-validacion.service';

describe('RundValidacionService', () => {
  const docente = { id: 'doc-1', personaId: 'per-1' };
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
        .mockResolvedValueOnce([{ person_id: 'per-1' }]) // auth.personas
        .mockResolvedValueOnce([{ campo_rund: 'GENERO', estado_documento: 'Aceptado' }]); // validaciones
      const r = await service.getRundDocente('user-9');
      expect(r.docenteId).toBe('doc-1');
      expect(docenteRepo.findOne).toHaveBeenLastCalledWith({ where: [{ id: 'per-1' }, { personaId: 'per-1' }] });
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

    const updates = () => dataSource.query.mock.calls.filter(([sql]) => String(sql).includes('UPDATE rund.validacion_documental'));

    it('mapea categoría y estado de Carpeta Digital al bloque y estado de validación', async () => {
      await service.syncRundDocuments('doc-1', [{ id: 'carp-1', categoria: 'Formacion', estado: 'validado', comentarios: 'ok' }]);
      const [[, params]] = updates();
      expect(params[0]).toBe('Aceptado');
      expect(params[1]).toBe('carp-1');
      expect(params[3]).toEqual(expect.any(String)); // fecha_validacion automática al aceptar
      expect(params[5]).toBe('ok');
      expect(params[6]).toBe('doc-1');
      expect(params[7]).toBe('FORMACION');
    });

    it('ignora categorías desconocidas y usa "Sin cargar" para estados desconocidos', async () => {
      await service.syncRundDocuments('doc-1', [
        { categoria: 'inventada', estado: 'validado' },
        { categoria: 'laboral', estado: 'raro' },
      ]);
      expect(updates()).toHaveLength(1);
      expect(updates()[0][1][0]).toBe('Sin cargar');
      expect(updates()[0][1][7]).toBe('VINCULACION');
    });

    it('no falla si no recibe documentos', async () => {
      await expect(service.syncRundDocuments('doc-1', undefined as any)).resolves.toBeDefined();
      expect(updates()).toHaveLength(0);
    });
  });
});
