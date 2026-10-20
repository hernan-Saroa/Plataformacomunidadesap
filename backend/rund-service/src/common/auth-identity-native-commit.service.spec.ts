import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AuthIdentityNativeCommitService } from './auth-identity-native-commit.service';
import { identityWritePlan } from '../modules/banco-docentes/rund-identity-writer';
import { identityWriteFingerprint } from './auth-identity-command';
import { nativeBusinessContext, nativeBusinessFingerprint } from '../modules/banco-docentes/rund-native-business-context';

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

  function reviewed(change: Record<string, unknown> = {}) {
    const identity = { personaId: id, num_identificacion: '12345678', tip_identificacion: 'CC', nom_largo: 'ANA PRUEBA', gen_tercero: 'F', fec_nacimiento: null };
    const input: any = { payload: { documentNumber: '12345678', documentType: 'CC', periodoCarga: '2026-2', pregrado: 'Administración Pública' },
      rawPayload: { canal_origen: 'MODAL' }, emailFinal: 'ana@example.test', phoneFinal: null, finalFullName: 'ANA PRUEBA',
      options: { preserveTerritorial: true, audit: { actorId: 'GGP', canalOrigen: 'MODAL', observacion: 'Original revisado',
        sensitiveAccess: { fullAccess: true }, requiredSupport: { id: 'soporte', type: 'soporte_edicion_perfil', docenteId: 'perfil-legacy' } },
      extractionReview: { docenteId: 'perfil-legacy', ids: [id], values: { pregrado: 'Administración Pública' }, identity } } };
    const plan = identityWritePlan(input); if (!plan.ok) throw new Error('Fixture de contexto inválido');
    const context = nativeBusinessContext(plan.command, plan.input), hash = nativeBusinessFingerprint(context);
    const native: any = { intencion_id: id, huella_contexto: hash, contexto: context, estado: 'PREPARADA', preparada_en: new Date(), docente_id: null };
    const selected = { id, campo: 'pregrado', valor: 'Administración Pública', valor_previo: 'Derecho', estado: 'PENDIENTE', documento_estado: 'ACTIVO', trabajo_estado: 'COMPLETADO', ...change };
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT * FROM rund.identidad_operacion')) return [{ estado: 'AUTH_APLICADA', huella_comando: identityWriteFingerprint(plan.command), recibo_auth: { identidadAplicada: true, resultado: { personaId: id, usuarioId: id, usuarioCreado: false, camposModificados: [], cambios: {} } } }];
      if (sql.includes('SELECT * FROM rund.identidad_contexto_nativo')) return [native];
      if (sql.includes('SELECT * FROM rund.identidad_ejecucion')) return [{ decision: 'EN_CURSO', huella_contexto: hash }];
      if (sql.includes('SELECT d.*')) return [{ id: 'perfil-legacy', personaId: id, pregrado: 'Derecho' }];
      if (sql.includes('SELECT s.*')) return [selected];
      if (sql.includes('WITH confirmada')) return [{ ...native, estado: 'CONFIRMADA', confirmada_en: new Date(), docente_id: 'perfil-legacy', resultado_nativo: { docenteId: 'perfil-legacy' } }];
      if (/auth\./i.test(sql)) throw new Error('SQL Auth prohibido');
      return [];
    });
    const banco = { persistirPerfilNativoConManager: jest.fn().mockResolvedValue({ action: 'update', docenteId: 'perfil-legacy' }) };
    return { query, banco, service: new AuthIdentityNativeCommitService({ transaction: async (cb: any) => cb({ query }) } as any, {} as any, banco as any) };
  }
  it('perfil, sugerencias y recibo se confirman con el mismo manager nativo, sin HTTP ni SQL Auth', async () => {
    const s = reviewed(); await expect(s.service.confirmarNativo(id)).resolves.toHaveProperty('estado', 'CONFIRMADA');
    const manager = s.banco.persistirPerfilNativoConManager.mock.calls[0][0]; expect(manager.query).toBe(s.query);
    const approval = s.query.mock.calls.find(([sql]) => sql.includes('SET estado = $2'));
    expect(approval).toBeDefined(); expect(s.query.mock.calls.some(([sql]) => /auth\./i.test(sql))).toBe(false);
    expect(s.query.mock.calls.findIndex(([sql]) => sql.includes('SET estado = $2'))).toBeLessThan(s.query.mock.calls.findIndex(([sql]) => sql.includes('WITH confirmada')));
  });
  it.each([{ estado: 'APROBADA' }, { documento_estado: 'REEMPLAZADO' }, { valor_previo: 'Otro título' }])('un cambio concurrente %p impide confirmar el perfil y la sugerencia', async change => {
    const s = reviewed(change); await expect(s.service.confirmarNativo(id)).rejects.toBeInstanceOf(ConflictException);
    expect(s.banco.persistirPerfilNativoConManager).not.toHaveBeenCalled();
    expect(s.query.mock.calls.some(([sql]) => sql.includes('WITH confirmada') || sql.includes('SET estado = $2'))).toBe(false);
  });
  it('un fallo al guardar el perfil no puede aprobar sugerencias ni confirmar el recibo', async () => {
    const s = reviewed(); s.banco.persistirPerfilNativoConManager.mockRejectedValueOnce(new Error('FALLO NATIVO'));
    await expect(s.service.confirmarNativo(id)).rejects.toThrow('FALLO NATIVO');
    expect(s.query.mock.calls.some(([sql]) => sql.includes('WITH confirmada') || sql.includes('SET estado = $2'))).toBe(false);
  });
});
