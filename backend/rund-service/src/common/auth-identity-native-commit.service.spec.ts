import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AuthIdentityNativeCommitService } from './auth-identity-native-commit.service';

describe('Confirmacion nativa con contexto persistido',()=>{
  const id='abcdef00-1111-4111-8111-111111111111';
  const setup=()=>{
    const query=jest.fn().mockResolvedValue([]),transaction=jest.fn(fn=>fn({query})),coordination={preparar:jest.fn()},banco={persistirPerfilNativoConManager:jest.fn()};
    return {query,transaction,coordination,banco,service:new AuthIdentityNativeCommitService({query,transaction} as any,coordination as any,banco as any)};
  };
  it('contexto o ID invalido no prepara intencion ni abre transaccion',async()=>{
    const s=setup();await expect(s.service.preparar(id,{},{} as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.service.confirmarNativo('no-id')).rejects.toBeInstanceOf(BadRequestException);
    expect(s.transaction).not.toHaveBeenCalled();expect(s.coordination.preparar).not.toHaveBeenCalled();
  });
  it('contexto inexistente no inicia escritura nativa',async()=>{
    const s=setup();await expect(s.service.confirmarNativo(id)).rejects.toBeInstanceOf(NotFoundException);expect(s.banco.persistirPerfilNativoConManager).not.toHaveBeenCalled();
  });
  it.each(['PREPARADA','AUTH_REGISTRADA','CANCELADA'])('estado Auth %s no confirma el negocio',async estado=>{
    const s=setup();s.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{estado}]).mockResolvedValueOnce([{estado:'PREPARADA'}]);
    await expect(s.service.confirmarNativo(id)).rejects.toBeInstanceOf(ConflictException);expect(s.banco.persistirPerfilNativoConManager).not.toHaveBeenCalled();
  });
  it('recibo nativo confirmado se recupera sin volver a guardar el perfil',async()=>{
    const s=setup(),native={intencion_id:id,huella_contexto:'a'.repeat(64),estado:'CONFIRMADA',preparada_en:new Date(),confirmada_en:new Date(),docente_id:'NATIVO',resultado_nativo:{docenteId:'NATIVO'}};
    s.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{estado:'AUTH_APLICADA'}]).mockResolvedValueOnce([native]);
    expect((await s.service.confirmarNativo(id)).resultado).toEqual(native.resultado_nativo);expect(s.banco.persistirPerfilNativoConManager).not.toHaveBeenCalled();
  });
});
