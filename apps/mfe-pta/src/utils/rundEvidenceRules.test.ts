import { describe, expect, it } from 'vitest';
import { rundBlockReadiness, rundCheckpointEvidences, rundDocumentDecision, rundEvidenceDecision, rundRowStatus } from './rundEvidenceRules';

const evidence = (id: string, estado: string, createdAt: string, extra: any = {}) => ({
  id, tipo_soporte: 'autorizacion_habeas_data', documento_perfil_id: `v-${id}`, documento_carpeta_id: `/file/${id}`, createdAt, estado: 'Pendiente',
  revisiones_campos: estado === 'Pendiente' ? {} : { autorizacion_habeas_data: { estado, documentoVersionId: `v-${id}` } }, ...extra,
});
const row = { tipoSoporte: 'autorizacion_habeas_data', required: true };

describe('Reglas de varias evidencias por punto de control', () => {
  it('mantiene pendiente una revisión histórica parcial o mixta hasta decidir el documento completo', () => {
    const fields = ['ACTO_ADMINISTRATIVO','FECHAS_VINCULACION'].map(revisionId=>({tipoSoporte:'contrato',revisionId}));
    const support = {tipo_soporte:'contrato',documento_perfil_id:'v1',estado:'Pendiente',revisiones_campos:{
      ACTO_ADMINISTRATIVO:{estado:'Aprobado',documentoVersionId:'v1'},
      FECHAS_VINCULACION:{estado:'Rechazado',documentoVersionId:'v1'},
    }};
    expect(rundDocumentDecision(support,fields).estado).toBe('Pendiente');
    support.revisiones_campos.FECHAS_VINCULACION.estado='Aprobado';
    expect(rundDocumentDecision(support,fields).estado).toBe('Aprobado');
    expect(rundDocumentDecision({...support,documento_perfil_id:'v2'},fields).estado).toBe('Pendiente');
  });
  it('ordena por fecha de carga y agrupa CC, CE y pasaporte en el mismo punto', () => {
    const supports = [
      { id: 'b', tipo_soporte: 'pasaporte', createdAt: '2026-10-02' },
      { id: 'c', tipo_soporte: 'contrato', createdAt: '2026-10-01' },
      { id: 'a', tipo_soporte: 'documento_identidad', createdAt: '2026-10-01' },
    ];
    expect(rundCheckpointEvidences(supports, 'documento_identidad').map(s => s.id)).toEqual(['a', 'b']);
    expect(rundCheckpointEvidences(supports, 'contrato').map(s => s.id)).toEqual(['c']);
  });

  it('no hereda la decisión de una versión anterior del archivo', () => {
    const replaced = evidence('a', 'Aprobado', '2026-10-01', { documento_perfil_id: 'v-nueva' });
    expect(rundEvidenceDecision(replaced, { tipoSoporte: 'autorizacion_habeas_data' }).estado).toBe('Pendiente');
  });

  it('el estado de la fila queda pendiente mientras alguna evidencia espera decisión', () => {
    expect(rundRowStatus([], row)).toBeNull();
    expect(rundRowStatus([evidence('a', 'Aprobado', '1'), evidence('b', 'Pendiente', '2')], row)).toBe('Pendiente');
    expect(rundRowStatus([evidence('a', 'Rechazado', '1'), evidence('b', 'Aprobado', '2')], row)).toBe('Aprobado');
    expect(rundRowStatus([evidence('a', 'Rechazado', '1'), evidence('b', 'Rechazado', '2')], row)).toBe('Rechazado');
  });

  it('el bloque está listo con una evidencia admitida aunque otra haya sido devuelta', () => {
    expect(rundBlockReadiness([evidence('a', 'Rechazado', '1'), evidence('b', 'Aprobado', '2')], [row]).ready).toBe(true);
    const pending = rundBlockReadiness([evidence('a', 'Aprobado', '1'), evidence('b', 'Pendiente', '2')], [row]);
    expect(pending).toMatchObject({ ready: false, allDecided: false, hasAllRequired: true });
    const returned = rundBlockReadiness([evidence('a', 'Rechazado', '1')], [row]);
    expect(returned).toMatchObject({ ready: false, allDecided: true, requiredAdmitted: false });
    expect(rundBlockReadiness([], [row])).toMatchObject({ ready: false, hasAllRequired: false });
  });

  it('una evidencia admitida vencida impide aprobar; una devuelta vencida no', () => {
    const expired = { fecha_vencimiento: '2000-01-01' };
    expect(rundBlockReadiness([evidence('a', 'Aprobado', '1', { ...expired, estado: 'Aprobado' })], [row]).hasExpired).toBe(true);
    expect(rundBlockReadiness([evidence('a', 'Rechazado', '1', expired), evidence('b', 'Aprobado', '2')], [row]).ready).toBe(true);
  });

  it('las filas que comparten un documento se deciden por separado y una devolución histórica sigue vigente', () => {
    const shared = { id: 's', tipo_soporte: 'contrato', documento_perfil_id: 'v1', estado: 'Rechazado', revisiones_campos: {
      ACTO_ADMINISTRATIVO: { estado: 'Rechazado', documentoVersionId: 'v1' } } };
    expect(rundEvidenceDecision(shared, { tipoSoporte: 'contrato', revisionId: 'ACTO_ADMINISTRATIVO' }).estado).toBe('Rechazado');
    expect(rundEvidenceDecision(shared, { tipoSoporte: 'contrato', revisionId: 'FECHAS_VINCULACION' }).estado).toBe('Pendiente');
    const legacy = { ...shared, revisiones_campos: {} };
    expect(rundEvidenceDecision(legacy, { tipoSoporte: 'contrato', revisionId: 'FECHAS_VINCULACION' }).estado).toBe('Rechazado');
  });
});
