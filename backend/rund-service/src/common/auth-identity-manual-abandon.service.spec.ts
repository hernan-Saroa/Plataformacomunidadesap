import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityManualAbandonService } from './auth-identity-manual-abandon.service';

describe('Abandono manual limitado a solicitudes sin journal',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',actorId='abcdef00-2222-4222-8222-222222222222';
  const actor=()=>({actorId,roles:['OPERADOR'],fullAccess:false,expiresAt:Date.now()/1000+600});
  const setup=()=>{
    let stored=false;
    const query=jest.fn(async()=>stored?[{solicitud_id:id}]:[]);
    const txQuery=jest.fn(async(sql:string)=>{if(sql.startsWith('INSERT'))stored=true;return [];});
    const transaction=jest.fn(async(work:any)=>work({query:txQuery}));
    const identities={permisosRoles:jest.fn().mockResolvedValue(['banco-docentes.rund.manage'])};
    return {service:new AuthIdentityManualAbandonService({query,transaction} as any,identities as any),query,txQuery,transaction,identities};
  };
  it('persiste abandono y devuelve recibo mínimo por actor con comprobación vigente posterior',async()=>{
    const s=setup(),result=await s.service.abandonar(id,actor());
    expect(result).toEqual({solicitudId:id,estado:'ABANDONADA',puedeIniciarOtra:true});
    expect(s.txQuery).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT'),[actorId,id]);
    expect(s.identities.permisosRoles).toHaveBeenCalledTimes(2);expect(Object.keys(result)).toHaveLength(3);
    expect(s.query).toHaveBeenCalledWith(expect.stringContaining('WHERE actor_id=$1 AND solicitud_id=$2'),[actorId,id]);
  });
  it('consulta recupera un abandono conocido sin escribir otra vez',async()=>{
    const s=setup();await s.service.abandonar(id,actor());s.transaction.mockClear();
    expect((await s.service.consultar(id,actor())).estado).toBe('ABANDONADA');expect(s.transaction).not.toHaveBeenCalled();
  });
  it('ausencia no equivale a abandono ni libera un ID',async()=>{
    const s=setup();await expect(s.service.consultar(id,actor())).rejects.toBeInstanceOf(NotFoundException);
  });
  it.each(['P7601','P7602'])('conflicto SQL %s conserva un 409 sin entregar detalles',async code=>{
    const s=setup();s.transaction.mockRejectedValue(Object.assign(new Error('SQL PRIVADO'),{driverError:{code}}));
    await expect(s.service.abandonar(id,actor())).rejects.toBeInstanceOf(ConflictException);expect(s.query).not.toHaveBeenCalled();
  });
  it('fallo de infraestructura se propaga para sanitizar en el controlador',async()=>{
    const s=setup(),error=new Error('FALLO');s.transaction.mockRejectedValue(error);
    await expect(s.service.abandonar(id,actor())).rejects.toBe(error);
  });
  it.each([undefined,1,NaN])('sesión exp %s impide leer o escribir',async expiresAt=>{
    const s=setup();await expect(s.service.abandonar(id,{...actor(),expiresAt})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(s.transaction).not.toHaveBeenCalled();expect(s.query).not.toHaveBeenCalled();
  });
  it('UUID inválido no escribe',async()=>{
    const s=setup();await expect(s.service.abandonar('NO',actor())).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.service.abandonar(id,{...actor(),actorId:'NO'})).rejects.toBeInstanceOf(UnauthorizedException);expect(s.transaction).not.toHaveBeenCalled();
  });
  it('permiso revocado o consulta Auth fallida no escribe',async()=>{
    const s=setup();s.identities.permisosRoles.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('AUTH'));
    await expect(s.service.abandonar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(s.service.abandonar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.transaction).not.toHaveBeenCalled();
  });
  it('revocación tras commit no entrega éxito y otra autorización recupera el mismo abandono',async()=>{
    const s=setup();s.identities.permisosRoles.mockResolvedValueOnce(['banco-docentes.rund.manage']).mockResolvedValueOnce([]);
    await expect(s.service.abandonar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);
    expect((await s.service.consultar(id,actor())).estado).toBe('ABANDONADA');
  });
  it.each(['GESTION_PROFESORAL','SUPER_ADMIN','ADMIN'])('rol %s conserva autorización por rol',async role=>{
    const s=setup();await s.service.abandonar(id,{...actor(),roles:[role]});expect(s.identities.permisosRoles).not.toHaveBeenCalled();
  });
});
