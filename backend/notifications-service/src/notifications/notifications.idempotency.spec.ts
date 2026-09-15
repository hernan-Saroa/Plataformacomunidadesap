import { ConflictException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
describe('Entrega idempotente opcional',()=>{
  const dto={id_usuario_destinatario:'user',tipo_notificacion:'rund_extraccion_finalizada',titulo:'RUND',mensaje:'Finalizó'};
  function fixture(saved:any={...dto,id_notificacion:'event',leida:true}){
    const builder:any={};for(const key of ['insert','into','values','onConflict'])builder[key]=jest.fn(()=>builder);
    builder.execute=jest.fn().mockResolvedValue({});
    const repo={create:jest.fn(v=>({...v})),save:jest.fn().mockResolvedValue(dto),createQueryBuilder:jest.fn(()=>builder),findOneByOrFail:jest.fn().mockResolvedValue(saved)};
    return {repo,builder,service:new NotificationsService(repo as any)};
  }
  it('conserva la creación existente cuando no se proporciona clave',async()=>{
    const {repo,service}=fixture();await service.create(dto);expect(repo.save).toHaveBeenCalledTimes(1);expect(repo.createQueryBuilder).not.toHaveBeenCalled();
  });
  it('un reintento usa ON CONFLICT y conserva lectura e identidad del aviso anterior',async()=>{
    const {builder,service}=fixture();const value=await service.create({...dto,clave_idempotencia:'event'});
    expect(builder.onConflict).toHaveBeenCalledWith('("id_notificacion") DO NOTHING');expect(value.leida).toBe(true);
  });
  it('no reutiliza una clave de otro destinatario',async()=>{
    const {service}=fixture({...dto,id_usuario_destinatario:'otro'});
    await expect(service.create({...dto,clave_idempotencia:'event'})).rejects.toBeInstanceOf(ConflictException);
  });
});
