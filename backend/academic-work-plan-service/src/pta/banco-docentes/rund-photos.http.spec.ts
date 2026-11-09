import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { BancoDocentesService } from './banco-docentes.service';
import { RundPhotosController } from './rund-photos.controller';
import { RundPhotosService } from './rund-photos.service';

describe('Fotos RUND: permisos HTTP y propiedad', () => {
  const person = '11111111-1111-4111-8111-111111111111';
  const photo = '22222222-2222-4222-8222-222222222222';
  let app: INestApplication;
  let role = 'DOCENTE';
  const service = {
    ownPerson: jest.fn().mockResolvedValue(person), status: jest.fn().mockResolvedValue({ personaId: person }),
    published: jest.fn().mockResolvedValue({ id: null,url: null }), preview: jest.fn().mockResolvedValue({ url: 'only-authorized' }),
    upload: jest.fn().mockResolvedValue({ solicitud: { estado: 'PENDIENTE' } }), decide: jest.fn().mockResolvedValue({}),
    pending: jest.fn().mockResolvedValue({ items: [], total: 0 }), bulkPerson: jest.fn().mockResolvedValue(person),
  };
  const permissions: Record<string,string[]> = {
    UPLOADER: ['banco-docentes.rund.photos.manage'], REVIEWER: ['banco-docentes.rund.photos.validate'],
    VIEWER: ['banco-docentes.rund.view'], OLD_REVIEWER: ['banco-docentes.rund.revision'],
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [RundPhotosController],providers: [
      { provide: RundPhotosService,useValue: service },
      { provide: BancoDocentesService,useValue: { getById: jest.fn().mockResolvedValue({ persona_id: person }) } },
      { provide: DataSource,useValue: { query: jest.fn(async (_sql: string,[roles]: string[][]) => roles.flatMap(role => permissions[role] || []).map(code => ({ code }))) } },
    ] }).compile();
    app=module.createNestApplication();
    app.use((req: any,_res: any,next: any)=>{ req.user={ userId: 'AUTHENTICATED',roles: [role] }; next(); });
    await app.init();
  });
  afterAll(()=>app.close());
  beforeEach(()=>{
    jest.clearAllMocks(); role='DOCENTE';
    service.bulkPerson.mockReset().mockResolvedValue(person);
    service.upload.mockReset().mockResolvedValue({solicitud:{estado:'PENDIENTE'}});
  });

  it('la carga PTA ignora personaId, estado y actor enviados por el cliente',async()=>{
    await request(app.getHttpServer()).post('/pta/fotos-perfil/mia').field('personaId','OTHER').field('estado','APROBADA').field('actor','IMPOSTOR')
      .attach('file',Buffer.from('fixture'),{ filename: 'test.png',contentType: 'image/png' }).expect(201);
    expect(service.ownPerson).toHaveBeenCalledWith({ userId: 'AUTHENTICATED',roles: ['DOCENTE'] });
    expect(service.upload).toHaveBeenCalledWith(person,expect.anything(),'AUTHENTICATED','PTA');
  });
  it.each(['DOCENTE','VIEWER','UPLOADER','OLD_REVIEWER'])('%s no puede aprobar ni rechazar sin el permiso específico',async current=>{
    role=current;
    await request(app.getHttpServer()).post(`/pta/fotos-perfil/docentes/${person}/versiones/${photo}/decision`).send({ estado: 'APROBADA' }).expect(403);
    expect(service.decide).not.toHaveBeenCalled();
  });
  it('el validador puede decidir pero no cargar fotos',async()=>{
    role='REVIEWER';
    await request(app.getHttpServer()).post(`/pta/fotos-perfil/docentes/${person}/versiones/${photo}/decision`).send({ estado: 'RECHAZADA',observacion: 'Fondo incorrecto',actorId: 'IMPOSTOR' }).expect(201);
    expect(service.decide).toHaveBeenCalledWith(person,photo,'RECHAZADA','Fondo incorrecto','AUTHENTICATED');
    await request(app.getHttpServer()).post(`/pta/fotos-perfil/docentes/${person}`).expect(403);
    await request(app.getHttpServer()).get('/pta/fotos-perfil/pendientes').expect(200);
  });
  it('el cargador solo envía la foto como pendiente',async()=>{
    role='UPLOADER';
    await request(app.getHttpServer()).post(`/pta/fotos-perfil/docentes/${person}`)
      .attach('file',Buffer.from('fixture'),'test.png').expect(201);
    expect(service.upload).toHaveBeenCalledWith(person,expect.anything(),'AUTHENTICATED','RUND');
  });
  it('las versiones pendientes ajenas no son accesibles al docente, incluso con UUID conocido',async()=>{
    await request(app.getHttpServer()).get(`/pta/fotos-perfil/docentes/${person}/versiones/${photo}`).expect(403);
    await request(app.getHttpServer()).get(`/pta/fotos-perfil/personas/${person}/publicada`).expect(200);
    expect(service.preview).not.toHaveBeenCalled();
    expect(service.published).toHaveBeenCalledWith(person);
  });
  it('la vista previa propia siempre usa la identidad autenticada',async()=>{
    await request(app.getHttpServer()).get(`/pta/fotos-perfil/mia/versiones/${photo}`).expect(200).expect('Cache-Control','private, no-store');
    expect(service.preview).toHaveBeenCalledWith(person,photo);
  });
  it('rechaza lotes vacíos y archivos mayores de 2 MB',async()=>{
    role='UPLOADER';
    await request(app.getHttpServer()).post('/pta/fotos-perfil/masiva').expect(400);
    await request(app.getHttpServer()).post('/pta/fotos-perfil/mia').attach('file',Buffer.alloc(2097153),'big.png').expect(413);
    expect(service.upload).not.toHaveBeenCalled();
  });
  it.each(['DOCENTE','VIEWER','REVIEWER'])('%s no carga lotes sin permiso específico',async current=>{
    role=current;
    await request(app.getHttpServer()).post('/pta/fotos-perfil/masiva').attach('files',Buffer.from('synthetic'),'123456.png').expect(403);
    expect(service.upload).not.toHaveBeenCalled();
  });
  it('el lote informa por archivo y evita dos solicitudes para la misma persona',async()=>{
    role='UPLOADER';
    const result=await request(app.getHttpServer()).post('/pta/fotos-perfil/masiva')
      .field('actorId','IMPOSTOR').field('estado','APROBADA')
      .attach('files',Buffer.from('synthetic'),'123456.png').attach('files',Buffer.from('synthetic'),'123456.jpg').expect(201);
    expect(result.body.results.map((row:any)=>row.success)).toEqual([true,false]);
    expect(result.body.results[1].message).toContain('Documento repetido');
    expect(service.upload).toHaveBeenCalledTimes(1);
    expect(service.upload).toHaveBeenCalledWith(person,expect.anything(),'AUTHENTICATED','MASIVA');
  });
  it('un archivo sin docente registrado no impide procesar otro válido',async()=>{
    role='UPLOADER';service.bulkPerson.mockRejectedValueOnce(new Error('Docente no encontrado'));
    const result=await request(app.getHttpServer()).post('/pta/fotos-perfil/masiva')
      .attach('files',Buffer.from('synthetic'),'missing.png').attach('files',Buffer.from('synthetic'),'123456.png').expect(201);
    expect(result.body.results.map((row:any)=>row.success)).toEqual([false,true]);
    expect(service.upload).toHaveBeenCalledTimes(1);
  });
  it('rechaza más de 20 fotos antes de ejecutar la carga del lote',async()=>{
    role='UPLOADER';
    let pending=request(app.getHttpServer()).post('/pta/fotos-perfil/masiva');
    for(let index=0;index<21;index++) pending=pending.attach('files',Buffer.from('synthetic'),`${index}.png`);
    await pending.expect(400);expect(service.upload).not.toHaveBeenCalled();
  });
});
