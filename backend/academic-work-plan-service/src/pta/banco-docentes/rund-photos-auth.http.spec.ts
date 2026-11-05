import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { JwtStrategy } from '../../auth/jwt.strategy';
import { BancoDocentesService } from './banco-docentes.service';
import { RundPhotosController } from './rund-photos.controller';
import { RundPhotosService } from './rund-photos.service';

describe('Autenticación real de las fotos por JWT y cookie',()=>{
  const person='11111111-1111-4111-8111-111111111111';
  const secret=randomUUID();
  const jwt=new JwtService({secret});
  const originalSecret=process.env.JWT_SECRET,originalPublicPaths=process.env.JWT_PUBLIC_PATHS;
  const photos={published:jest.fn().mockResolvedValue({id:null,url:null}),ownPerson:jest.fn().mockResolvedValue(person),status:jest.fn().mockResolvedValue({personaId:person}),upload:jest.fn()};
  let app: INestApplication;
  beforeAll(async()=>{
    process.env.JWT_SECRET=secret;delete process.env.JWT_PUBLIC_PATHS;
    const module=await Test.createTestingModule({imports:[PassportModule.register({defaultStrategy:'jwt'})],controllers:[RundPhotosController],providers:[
      JwtStrategy,{provide:APP_GUARD,useClass:JwtAuthGuard},
      {provide:RundPhotosService,useValue:photos},{provide:BancoDocentesService,useValue:{}},
      {provide:DataSource,useValue:{query:jest.fn().mockResolvedValue([])}},
    ]}).compile();
    app=module.createNestApplication();await app.init();
  });
  beforeEach(()=>jest.clearAllMocks());
  afterAll(async()=>{
    await app?.close();
    if(originalSecret===undefined) delete process.env.JWT_SECRET;else process.env.JWT_SECRET=originalSecret;
    if(originalPublicPaths===undefined) delete process.env.JWT_PUBLIC_PATHS;else process.env.JWT_PUBLIC_PATHS=originalPublicPaths;
  });
  it.each(['/pta/fotos-perfil/mia','/pta/fotos-perfil/pendientes',`/pta/fotos-perfil/personas/${person}/publicada`])('no permite acceso anónimo a %s',async url=>{
    await request(app.getHttpServer()).get(url).expect(401);
    expect(photos.published).not.toHaveBeenCalled();expect(photos.ownPerson).not.toHaveBeenCalled();
  });
  it('no acepta una carga sin sesión antes de procesar el archivo',async()=>{
    await request(app.getHttpServer()).post('/pta/fotos-perfil/mia').attach('file',Buffer.from('synthetic'),'photo.png').expect(401);
    expect(photos.upload).not.toHaveBeenCalled();
  });
  it('rechaza un token vencido',async()=>{
    const token=jwt.sign({sub:'SYNTHETIC_USER',roles:['DOCENTE']},{expiresIn:-1});
    await request(app.getHttpServer()).get('/pta/fotos-perfil/mia').set('Authorization',`Bearer ${token}`).expect(401);
  });
  it('acepta la cookie HttpOnly de la sesión y resuelve la identidad del token',async()=>{
    const token=jwt.sign({sub:'SYNTHETIC_USER',roles:['DOCENTE']},{expiresIn:60});
    await request(app.getHttpServer()).get('/pta/fotos-perfil/mia').set('Cookie',`esap_access_token=${token}`).expect(200);
    expect(photos.ownPerson).toHaveBeenCalledWith(expect.objectContaining({userId:'SYNTHETIC_USER'}));
  });
  it('un JWT válido de docente tampoco permite acceder a la bandeja del grupo',async()=>{
    const token=jwt.sign({sub:'SYNTHETIC_USER',roles:['DOCENTE']},{expiresIn:60});
    await request(app.getHttpServer()).get('/pta/fotos-perfil/pendientes').set('Authorization',`Bearer ${token}`).expect(403);
  });
});
