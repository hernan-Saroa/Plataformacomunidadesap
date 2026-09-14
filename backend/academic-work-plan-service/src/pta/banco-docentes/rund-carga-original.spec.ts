import { capturarDatosCarga, fechaCivilPersistencia, RUND_COLUMNAS_CARGA } from './rund-carga-original';
import { protectRundSensitiveData } from './banco-docentes-sensitive-data';
import { BancoDocentesService, resolveTerritorial } from './banco-docentes.service';

describe('Información original de la carga RUND', () => {
  it('conserva las 38 columnas, teléfonos múltiples, fechas y ceros sin guardar claves desconocidas', () => {
    const original = capturarDatosCarga({ 'Territorial': 'NORTESANTANDER', 'Fecha de nacimiento': '17/01/1966',
      TELEFONO: '6011234567 / 3001234567', EDAD: 0, PUNTAJE_SALARIAL: 0, extra: 'no guardar' });
    expect(Object.keys(original)).toEqual([...RUND_COLUMNAS_CARGA]);
    expect(original).toMatchObject({ TERRITORIAL:'NORTESANTANDER', FECHA_NACIMIENTO:'17/01/1966', TELEFONO:'6011234567 / 3001234567', EDAD:0, PUNTAJE_SALARIAL:0 });
    expect(original.extra).toBeUndefined();
  });

  it('enmascara también los valores sensibles del archivo original', () => {
    const original = capturarDatosCarga({ DOCUMENTO_IDENTIDAD:'1020304050', PUNTAJE_SALARIAL:145.5, TERRITORIAL:'META' });
    const restricted: any = protectRundSensitiveData({ datos_carga_masiva:original }, false);
    expect(restricted.datos_carga_masiva.DOCUMENTO_IDENTIDAD).toBe('******4050');
    expect(restricted.datos_carga_masiva.PUNTAJE_SALARIAL).toBeNull();
    expect(JSON.stringify(restricted)).not.toContain('145.5');
    expect(restricted.datos_carga_masiva.TERRITORIAL).toBe('META');
  });

  it('usa la fecha civil correcta al persistir en timestamp sin zona horaria', () => {
    const persisted = fechaCivilPersistencia(new Date('2025-01-20T00:00:00Z'))!;
    expect([persisted.getFullYear(),persisted.getMonth(),persisted.getDate(),persisted.getHours()]).toEqual([2025,0,20,0]);
    expect(fechaCivilPersistencia(null)).toBeNull();
  });

  it('no confunde NORTESANTANDER con Santander por una coincidencia parcial', () => {
    const catalog = [{id:'1',nombre:'Santander',codigo:null},{id:'2',nombre:'Norte de Santander',codigo:null}];
    expect(resolveTerritorial(catalog,'NORTESANTANDER')?.id).toBe('2');
  });

  it('entrega la territorial informativa y el archivo original en la tarjeta, conservando puntaje cero', async () => {
    const service = Object.create(BancoDocentesService.prototype) as any;
    service.resolveDocenteId = jest.fn().mockResolvedValue('docente-1');
    service.docenteRepo = { findOne: jest.fn().mockResolvedValue({ id:'docente-1', personaId:'persona-1',
      territorialId:'24', territorialReportada:'META', datosCargaMasiva:{TERRITORIAL:'META'}, puntajeSalarial:0 }) };
    service.getBloques = jest.fn().mockResolvedValue([]);
    service.getTerritoriales = jest.fn().mockResolvedValue([]);
    service.dataSource = { query:jest.fn().mockResolvedValue([]) };
    const tarjeta = await service.getTarjetaRUND('docente-1');
    expect(tarjeta.bloques.VINCULACION.campos).toContainEqual(expect.objectContaining({ campo:'TERRITORIAL', valor:'META' }));
    expect(tarjeta.bloques.VINCULACION.campos).toContainEqual(expect.objectContaining({ campo:'PUNTAJE_SALARIAL', valor:0 }));
    expect(tarjeta.datos_carga_masiva).toEqual({TERRITORIAL:'META'});
  });

  it('admite una territorial desconocida en el masivo como información sin asignar Sede Central', async () => {
    const service = Object.create(BancoDocentesService.prototype) as any;
    service.getTerritoriales = jest.fn().mockResolvedValue([{id:'31',nombre:'Sede Central',codigo:'SC'}]);
    const manager = {
      query:jest.fn(async (sql:string) => {
        if (sql.includes('SELECT *') && sql.includes('FROM auth.personas')) return [{ id_person:'persona-1',num_identificacion:'1020304050' }];
        if (sql.includes('SELECT * FROM auth."user"')) return [{id_user:'usuario-1',username:'prueba@esap.edu.co'}];
        if (sql.includes('FROM auth.role')) return [{id:'rol-1'}];
        return [];
      }),
      findOne:jest.fn().mockResolvedValue({id:'docente-1',personaId:'persona-1',territorialId:'',periodoCarga:'2026-2',idRund:'RUND-1'}),
      save:jest.fn(async (_entity:any,value:any)=>value),
    };
    await service.upsertDocente({
      DOCUMENTO_IDENTIDAD:'1020304050',TIPO_DOCUMENTO:'CC',NOMBRE_COMPLETO:'MARIA LOPEZ RUIZ',GENERO:'Femenino',
      FECHA_NACIMIENTO:'17/01/1980',CORREO_INSTITUCIONAL:'prueba@esap.edu.co',VINCULACION:'Ocasional',
      TERRITORIAL:'REGIONAL INFORMADA',DEDICACION:'Tiempo Completo',CATEGORIA_ESCALAFON:'Asociado',
      INICIO_VINCULACION:'20/01/2025',ACTO_ADMINISTRATIVO:'Resolución de prueba',NIVEL_FORMACION:'Maestría',
      TITULO_PREGRADO:'Administración',NUCLEO_TEMATICO:'Administración',PERFIL_ACADEMICO:'Docencia',PERIODO_CARGA:'2026-2',
    }, {bulkImport:true,outerManager:manager});
    expect(manager.save).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({
      territorialId:'',territorialReportada:'REGIONAL INFORMADA',datosCargaMasiva:expect.objectContaining({TERRITORIAL:'REGIONAL INFORMADA'}),
    }));
    const birthUpdate = manager.query.mock.calls.find(([sql]:any)=>sql.includes('UPDATE auth.personas')) as any;
    expect(birthUpdate[1][7]).toBe('1980-01-17');
    expect(birthUpdate[1][10]).toBeNull();
  });

  it('editar otro campo conserva la asignación operativa cuando no cambia la territorial reportada', async () => {
    const service = Object.create(BancoDocentesService.prototype) as any;
    service.resolveDocenteId = jest.fn().mockResolvedValue('docente-1');
    service.docenteRepo = {findOne:jest.fn().mockResolvedValue({id:'docente-1',personaId:'persona-1',periodoCarga:'2026-2',estado:'ACTIVO',territorialReportada:'META',territorialId:'24'})};
    service.dataSource = {query:jest.fn(async (sql:string)=>sql.includes('AS document_number') ? [{document_number:'1020304050'}] : [{id:'soporte-1'}])};
    service.upsertDocente = jest.fn().mockResolvedValue({action:'update'});
    await service.updateDocente('docente-1',{territorialNombre:'META',soporteEdicionId:'soporte-1',justificacionEdicion:'Corrección del teléfono',telefono:'3001234567'});
    expect(service.upsertDocente).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({preserveTerritorial:true}));
  });
});
