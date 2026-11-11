import { RundPhotosService } from './rund-photos.service';

describe('Responsables del historial de fotos RUND',()=>{
  const author='770e8400-e29b-41d4-a716-446655440001';
  const reviewer='770e8400-e29b-41d4-a716-446655440002';
  it('resuelve cargador y revisor por sus referencias sin alterar el origen ni la decisión',async()=>{
    const rows=[
      {id:'pending',estado:'PENDIENTE',origen:'PTA',creado_por:author,revisado_por:null,nombre:'new.png'},
      {id:'approved',estado:'APROBADA',origen:'RUND',creado_por:reviewer,revisado_por:reviewer,revisado_en:'2026-10-28T12:00:00Z',nombre:'approved.png'},
      {id:'rejected',estado:'RECHAZADA',origen:'MASIVA',creado_por:author,revisado_por:reviewer,observacion:'Imagen borrosa',nombre:'old.png'},
    ];
    const db={query:jest.fn().mockResolvedValueOnce(rows).mockResolvedValueOnce([
      {actor_id:author,nombre:'Docente de Prueba'},{actor_id:reviewer,nombre:'Revisora del Grupo'},
    ])};
    const result=await new RundPhotosService(db as any).status('person');
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(result.solicitud).toMatchObject({id:'pending',creado_por:author,creadoPorNombre:'Docente de Prueba',revisadoPorNombre:null,origen:'PTA'});
    expect(result.publicada).toMatchObject({id:'approved',revisado_por:reviewer,revisadoPorNombre:'Revisora del Grupo',revisado_en:'2026-10-28T12:00:00Z',origen:'RUND'});
    expect(result.historial[2]).toMatchObject({id:'rejected',origen:'MASIVA',observacion:'Imagen borrosa',creadoPorNombre:'Docente de Prueba',revisadoPorNombre:'Revisora del Grupo'});
    expect(rows[0]).not.toHaveProperty('creadoPorNombre');
    expect(result.historial.every((photo:any)=>!Object.hasOwn(photo,'contenido'))).toBe(true);
  });
  it('una identidad eliminada o un directorio caído no impide consultar el historial',async()=>{
    const row={id:'old',estado:'ARCHIVADA',origen:'RUND',creado_por:author,revisado_por:reviewer};
    const db={query:jest.fn().mockResolvedValueOnce([row]).mockRejectedValueOnce(new Error('Directorio no disponible'))};
    const result=await new RundPhotosService(db as any).status('person');
    expect(result.historial[0]).toMatchObject({...row,creadoPorNombre:'Usuario no disponible',revisadoPorNombre:'Usuario no disponible'});
    expect(result.publicada).toBeNull();
  });
  it('no consulta el directorio cuando no hay fotos registradas',async()=>{
    const db={query:jest.fn().mockResolvedValue([])};
    expect(await new RundPhotosService(db as any).status('person')).toEqual({personaId:'person',publicada:null,solicitud:null,historial:[]});
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});
