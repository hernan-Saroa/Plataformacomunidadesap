import {randomUUID} from 'crypto';
import {RundCarpetaConsultaService} from './rund-carpeta-consulta.service';

describe('Catálogo RUND sin aprovisionamiento',()=>{
 const person=randomUUID(),actor={actorId:'test',roles:['SUPER_ADMIN'],fullAccess:true};
 it('lee todos los periodos y solo registra el acceso, sin crear perfiles/bloques',async()=>{
  const profiles=[{id:'DOC-1',persona_id:person,periodo_carga:'2026-1',estado:'ACTIVO'},{id:'DOC-2',persona_id:person,periodo_carga:'2026-2',estado:'INACTIVO'}];
  const db={query:jest.fn().mockResolvedValueOnce(profiles).mockResolvedValue([])};
  expect(await new RundCarpetaConsultaService(db as any).profiles(person,actor)).toMatchObject({complete:true,perfiles:profiles});
  expect(db.query.mock.calls[0][1]).toEqual([person]);expect(db.query.mock.calls[1][0]).toContain('RundAccesoDatosLog');
  expect(db.query.mock.calls.some(([sql])=>/INSERT INTO rund\."(Docente|RundCampoEstado)"/.test(sql))).toBe(false);
 });
 it('un vacío explícito no inicia una sincronización con Auth',async()=>{
  const db={query:jest.fn().mockResolvedValue([])};
  expect((await new RundCarpetaConsultaService(db as any).profiles(person,actor)).perfiles).toEqual([]);
  expect(db.query.mock.calls.some(([sql])=>sql.includes('auth.'))).toBe(false);
 });
 it('rechaza una identidad inválida antes de consultar',async()=>{
  const db={query:jest.fn()};await expect(new RundCarpetaConsultaService(db as any).profiles('documento-123',actor)).rejects.toThrow();expect(db.query).not.toHaveBeenCalled();
 });
});
