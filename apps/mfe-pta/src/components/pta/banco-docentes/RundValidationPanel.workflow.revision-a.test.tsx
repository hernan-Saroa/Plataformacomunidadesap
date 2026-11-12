import { RUND_STANDALONE_SUPPORTS } from '../../../utils/rundEvidenceData';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RundValidationPanel } from './RundValidationPanel';
import { RundDocumentManager } from './RundDocumentManager';
import { RundSupportList } from './RundSupportList';
import { apiClient } from '../../../../../shell/src/services/api';
import { RUND_DATA_FIELDS } from '../../../../../../backend/academic-work-plan-service/src/pta/banco-docentes/rund-data-review';

vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), upload: vi.fn(), getBlob: vi.fn() } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => authContext }));
vi.mock('./BancoDocenteEditModal', () => ({ BancoDocenteEditModal: () => null }));
vi.mock('./RundDocumentManager', () => ({ RundDocumentManager: vi.fn(({ onChanged, supportReview }: any) => <>
  <button onClick={onChanged}>Recargar expediente</button>
  {supportReview && <RundSupportList {...supportReview} />}
</>) }));

let blocks: any[];
let authContext: any;
let profileBlocks: Record<string, any>;
let fixtureDataReviews:Record<string,any>;
const fixtureBlocks=()=>JSON.parse(JSON.stringify(blocks.map(block=>({...block,revisionDatos:Object.fromEntries(RUND_DATA_FIELDS[block.bloque].map(field=>{
  const admitted=block.soportes.filter((support:any)=>field.types.includes(support.tipo_soporte)&&support.estado==='Aprobado');
  const huella=JSON.stringify({campo:field.id,refs:admitted.map((support:any)=>support.documento_perfil_id||support.documento_carpeta_id)});
  const saved=fixtureDataReviews[block.bloque+':'+field.id];
  const supplied=(profileBlocks[block.bloque]?.campos||[]).some((item:any)=>item.campo===field.id&&item.valor);
  return [field.id,{campo:field.id,huella,puedeValidar:true,requiereRevision:field.required||supplied||block.soportes.some((support:any)=>field.types.includes(support.tipo_soporte)),
    estado:saved?.huella===huella?saved.estado:block.estado==='Aprobado'?'Aprobado':'Pendiente',observacion:saved?.huella===huella?saved.observacion:null}];
}))}))));
beforeEach(() => {
  authContext = { userRole: 'SUPER_ADMIN', isSuperUser: true, hasAnyPermission: () => true };
  vi.clearAllMocks();
  profileBlocks = {};
  fixtureDataReviews={};
  blocks = ['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'].map(bloque => ({ bloque, version: 1, estado: 'Soporte faltante', soportes: [] }));
  blocks[0] = { bloque: 'IDENTIDAD', version: 1, estado: 'En revisión', soportes: [{ id: 'soporte-1', tipo_soporte: 'documento_identidad', documento_perfil_id: 'version-1', documento_carpeta_id: '/pta/documento-1', nombre_archivo: 'identidad.pdf', estado: 'Pendiente' }] };
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url.includes('/bloques')) return fixtureBlocks();
    if (url.includes('/auditoria')) return [{ id: 'log-1', accion: 'CARGAR_DOCUMENTO', bloque: 'IDENTIDAD', actorId: '770e8400-e29b-41d4-a716-446655440001', actorNombre: 'Gestor Documental', createdAt: '2026-09-08T12:00:00Z', metadata: { version: 1, nombreArchivo: 'identidad.pdf' } },
      { id: 'log-2', accion: 'EDITAR', bloque: 'GENERAL', actorId: 'u-2', actorNombre: 'Super User', createdAt: '2026-09-09T12:00:00Z', metadata: {}, cambios: [{ campo: 'dedicacion', anterior: 'MT', nuevo: 'TC' }, { campo: 'observaciones', anterior: null, nuevo: 'texto' }] }];
    return { docenteId: 'docente-1', idRund: 'RUND-PRUEBA', proteccion_datos: { acceso_completo: true }, bloques: profileBlocks };
  });
  vi.mocked(apiClient.post).mockImplementation(async (url: string, body: any) => {
    const block = blocks.find(b => url.includes(`/bloques/${b.bloque}/`));
    if (url.includes('/datos/')&&url.endsWith('/revision')) {
      const campo=url.split('/datos/')[1].split('/')[0];
      fixtureDataReviews[block.bloque+':'+campo]={...body};
      block.estado=body.estado==='Rechazado'?'Devuelto':'En revisión';block.version++;
    } else if (url.endsWith('/revision')) {
      const support = block.soportes.find((s: any) => url.includes(`/soportes/${s.id}/`));
      const fields = body.alcance === 'documento' ? (block.bloque === 'IDENTIDAD' ? ['DOCUMENTO_IDENTIDAD','NOMBRE_COMPLETO','GENERO','SEXO_BIOLOGICO','FECHA_NACIMIENTO'] : support.tipo_soporte === 'contrato' ? ['ACTO_ADMINISTRATIVO','FECHAS_VINCULACION'] : support.tipo_soporte === 'acto_administrativo_dedicacion' ? ['DEDICACION','HORAS_PTA'] : [support.tipo_soporte]) : [body.campo];
      support.revisiones_campos = { ...support.revisiones_campos, ...Object.fromEntries(fields.map(campo => [campo, { estado: body.estado, observacion: body.observacion, documentoVersionId: body.documentoVersionId }])) };
      const decisions = Object.values(support.revisiones_campos) as any[];
      support.estado = decisions.some(d => d.estado === 'Rechazado') ? 'Rechazado' : decisions.length === fields.length ? 'Aprobado' : 'Pendiente';
      const dataDecisions=fixtureBlocks().find(item=>item.bloque===block.bloque).revisionDatos;
      block.estado = Object.values(dataDecisions).some((decision:any)=>decision.estado==='Rechazado')?'Devuelto':'En revisión';
      block.version++;
    } else if (url.endsWith('/aprobar')) {
      block.estado = 'Aprobado';
      block.fecha_revision = '2026-09-08T12:00:00Z';
      block.version++;
    } else if (url.endsWith('/devolver')) {
      block.estado = 'Devuelto';
      block.observacion = body.observacion;
      block.version++;
    }
    return { success: true };
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function approveRemainingRows() {
  await waitFor(() => expect(screen.queryAllByRole('button', { name: 'Validar soporte', exact: true })).toHaveLength(0));
  await approveDataRows();
}
async function approveDataRows(){
  for(let count=0;count<20;count++){
    const button=screen.queryAllByRole('button',{name:'Validar dato',exact:true}).find(item=>!(item as HTMLButtonElement).disabled);
    if(!button)return;
    const before=screen.queryAllByRole('button',{name:'Validar dato',exact:true}).length;
    fireEvent.click(button);
    await waitFor(()=>expect(screen.queryAllByRole('button',{name:'Validar dato',exact:true}).length).toBeLessThan(before));
  }
}


describe('Revisión documental persistida en el panel RUND', () => {
  it.each([
    ['IDENTIDAD','00 Datos básicos','documento_identidad'],
    ['FORMACION','01 Títulos de formación','diploma_pregrado'],
    ['VINCULACION','10 Novedades talento humano','contrato'],
    ['ACADEMICO','04 Experiencia investigativa','acto_asignacion_nucleo'],
    ['TRANSVERSAL','Transversal','autorizacion_habeas_data'],
  ])('un archivo pendiente o devuelto no respalda datos en %s y conserva su motivo',async(code,label,type)=>{
    const block=blocks.find(block=>block.bloque===code);
    block.soportes=[{id:'archivo-devuelto',tipo_soporte:type,documento_perfil_id:'v-devuelta',documento_carpeta_id:'/file/devuelta',
      nombre_archivo:'no-corresponde.pdf',estado:'Pendiente'}];
    const view=render(<RundValidationPanel docenteId="docente-1"/>);
    await screen.findByText('RUND-PRUEBA');
    if(code!=='IDENTIDAD')fireEvent.click(screen.getByRole('tab',{name:new RegExp(label)}));
    expect(view.container.querySelectorAll('.rund-data-sources')).toHaveLength(0);
    const dataButtons=screen.getAllByRole('button',{name:'Validar dato',exact:true}).length;
    fireEvent.click(screen.getByRole('button',{name:'Devolver soporte',exact:true}));
    fireEvent.change(screen.getByLabelText('Motivo y corrección requerida'),{target:{value:'Este archivo no corresponde al dato.'}});
    fireEvent.click(screen.getByRole('button',{name:'Confirmar devolución',exact:true}));
    await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Devolver soporte'})).toBeNull());
    await waitFor(()=>expect(view.container.querySelectorAll('.rund-data-sources')).toHaveLength(0));
    expect(view.container.querySelectorAll('.rund-checkpoint-grid button').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button',{name:'Validar dato',exact:true})).toHaveLength(dataButtons);
    const history=screen.getByRole('list',{name:/Evidencias de/});
    expect(within(history).getByText('no-corresponde.pdf')).toBeTruthy();
    expect(within(history).getByText('Este archivo no corresponde al dato.')).toBeTruthy();
    expect(screen.queryByText('Pendiente de corrección')).toBeNull();
    expect(screen.queryByText(/admitidos de 1 soporte/)).toBeNull();
    view.unmount();
    const restored=render(<RundValidationPanel docenteId="docente-1"/>);
    await screen.findByText('RUND-PRUEBA');
    if(code!=='IDENTIDAD')fireEvent.click(screen.getByRole('tab',{name:new RegExp(label)}));
    expect(restored.container.querySelectorAll('.rund-data-sources')).toHaveLength(0);
    expect(screen.getByText('Este archivo no corresponde al dato.')).toBeTruthy();
  });
  it.each([
    ['IDENTIDAD','00 Datos básicos','documento_identidad'],
    ['FORMACION','01 Títulos de formación','diploma_pregrado'],
    ['VINCULACION','10 Novedades talento humano','contrato'],
    ['ACADEMICO','04 Experiencia investigativa','acto_asignacion_nucleo'],
    ['TRANSVERSAL','Transversal','autorizacion_habeas_data'],
  ])('solo cuenta y permite consultar archivos aceptados para los datos de %s',async(code,label,type)=>{
    const fields=code==='IDENTIDAD'?['DOCUMENTO_IDENTIDAD','NOMBRE_COMPLETO','GENERO','SEXO_BIOLOGICO','FECHA_NACIMIENTO']:
      type==='contrato'?['ACTO_ADMINISTRATIVO','FECHAS_VINCULACION']:[type];
    blocks.find(block=>block.bloque===code).soportes=['Aprobado','Pendiente','Rechazado'].map((estado,index)=>({
      id:`archivo-${index}`,tipo_soporte:type,documento_perfil_id:`v-${index}`,documento_carpeta_id:`/file/${index}`,
      nombre_archivo:`${estado}.pdf`,estado,revisiones_campos:Object.fromEntries(fields.map(field=>[field,{estado,documentoVersionId:`v-${index}`}]))}));
    const view=render(<RundValidationPanel docenteId="docente-1"/>);
    await screen.findByText('RUND-PRUEBA');
    if(code!=='IDENTIDAD')fireEvent.click(screen.getByRole('tab',{name:new RegExp(label)}));
    const sources=Array.from(view.container.querySelectorAll('.rund-data-sources'));
    expect(sources).toHaveLength(fields.length);
    for(const source of sources){
      expect(source.querySelector('summary')!.textContent).toBe('Consultar soportes de este dato (1)');
      expect(source.textContent).toContain('Aprobado.pdf');
      expect(source.textContent).not.toContain('Pendiente.pdf');
      expect(source.textContent).not.toContain('Rechazado.pdf');
    }
    const history=screen.getByRole('list',{name:/Evidencias de/});
    expect(within(history).getAllByRole('listitem')).toHaveLength(3);
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('respeta decisiones históricas por dato sin ocultar los demás respaldos del archivo compartido',async()=>{
    const support=blocks[0].soportes[0];
    support.estado='Rechazado';
    support.revisiones_campos=Object.fromEntries(['DOCUMENTO_IDENTIDAD','NOMBRE_COMPLETO','GENERO','SEXO_BIOLOGICO','FECHA_NACIMIENTO']
      .map(campo=>[campo,{estado:campo==='DOCUMENTO_IDENTIDAD'?'Rechazado':'Aprobado',documentoVersionId:'version-1'}]));
    const view=render(<RundValidationPanel docenteId="docente-1"/>);
    await screen.findByText('RUND-PRUEBA');
    const rows=view.container.querySelectorAll('.rund-checkpoint-row');
    expect(rows[0].querySelector('.rund-data-sources')).toBeNull();
    expect(rows[1].querySelector('.rund-data-sources')?.textContent).toContain('identidad.pdf');
    expect(view.container.querySelectorAll('.rund-data-sources')).toHaveLength(4);
  });
  it('una versión nueva espera su propia aceptación antes de mostrarse como respaldo',async()=>{
    const support=blocks[0].soportes[0];
    support.revisiones_campos={DOCUMENTO_IDENTIDAD:{estado:'Rechazado',documentoVersionId:'version-antigua'}};
    const view=render(<RundValidationPanel docenteId="docente-1"/>);
    await screen.findByText('RUND-PRUEBA');
    expect(view.container.querySelectorAll('.rund-data-sources')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button',{name:'Validar soporte',exact:true}));
    await waitFor(()=>expect(view.container.querySelectorAll('.rund-data-sources')).toHaveLength(5));
  });
  it.each([['IDENTIDAD','00 Datos básicos'],['FORMACION','01 Títulos de formación'],['VINCULACION','10 Novedades talento humano'],['ACADEMICO','04 Experiencia investigativa'],['TRANSVERSAL','Transversal']])('permite revisar datos y aprobar %s sin adjuntar archivos',async(code,label)=>{
    for(const block of blocks){block.soportes=[];block.estado='Soporte faltante';}
    render(<RundValidationPanel docenteId="docente-1"/>);
    await screen.findByText('RUND-PRUEBA');
    if(code!=='IDENTIDAD')fireEvent.click(screen.getByRole('tab',{name:new RegExp(label)}));
    await approveDataRows();
    await waitFor(()=>expect((screen.getByRole('button',{name:'Aprobar bloque'}) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button',{name:'Aprobar bloque'}));
    await screen.findByText('Espacio aprobado');
    expect(blocks.find(block=>block.bloque===code).soportes).toEqual([]);
    expect(vi.mocked(apiClient.post).mock.calls.some(([url])=>url.includes('/soportes/'))).toBe(false);
    expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/bloques/'+code+'/aprobar'),expect.any(Object));
  });
  it('admitir la cédula no valida datos: cada fila se decide por separado antes del bloque',async()=>{
    profileBlocks={IDENTIDAD:{campos:[{campo:'NOMBRE_COMPLETO',valor:'DOCENTE DE PRUEBA'}]}};
    render(<RundValidationPanel docenteId="docente-1"/>);
    fireEvent.click((await screen.findAllByRole('button',{name:'Validar soporte',exact:true}))[0]);
    await waitFor(()=>expect(screen.queryByRole('button',{name:'Validar soporte',exact:true})).toBeNull());
    expect((screen.getByRole('button',{name:'Aprobar bloque'}) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByRole('button',{name:'Validar dato',exact:true})).toHaveLength(5);
    fireEvent.click(screen.getAllByRole('button',{name:'Validar dato',exact:true})[0]);
    await waitFor(()=>expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/datos/DOCUMENTO_IDENTIDAD/revision'),expect.objectContaining({estado:'Aprobado',huella:expect.any(String)})));
    await waitFor(()=>expect(screen.getAllByRole('button',{name:'Validar dato',exact:true})).toHaveLength(4));
    expect((screen.getByRole('button',{name:'Aprobar bloque'}) as HTMLButtonElement).disabled).toBe(true);
    await approveDataRows();
    expect((screen.getByRole('button',{name:'Aprobar bloque'}) as HTMLButtonElement).disabled).toBe(false);
  });
  it('devuelve un dato con motivo sin rechazar el documento admitido y conserva la decisión al consultar de nuevo',async()=>{
    const support=blocks[0].soportes[0];support.estado='Aprobado';
    support.revisiones_campos=Object.fromEntries(['DOCUMENTO_IDENTIDAD','NOMBRE_COMPLETO','GENERO','SEXO_BIOLOGICO','FECHA_NACIMIENTO'].map(id=>[id,{estado:'Aprobado',documentoVersionId:'version-1'}]));
    const view=render(<RundValidationPanel docenteId="docente-1"/>);
    const returns=await screen.findAllByRole('button',{name:'Devolver dato',exact:true});fireEvent.click(returns[1]);
    expect((screen.getByRole('button',{name:'Confirmar devolución del dato'}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Motivo y corrección del dato'),{target:{value:'El apellido registrado no coincide con la cédula.'}});
    fireEvent.click(screen.getByRole('button',{name:'Confirmar devolución del dato'}));
    await screen.findByText('Dato devuelto');
    expect(support.estado).toBe('Aprobado');
    expect((screen.getByRole('button',{name:'Aprobar bloque'}) as HTMLButtonElement).disabled).toBe(true);
    expect(vi.mocked(apiClient.post).mock.calls.every(([url])=>url.includes('/datos/'))).toBe(true);
    view.unmount();render(<RundValidationPanel docenteId="docente-1"/>);
    await screen.findByText('Dato devuelto');
    expect(screen.getAllByText('El apellido registrado no coincide con la cédula.').length).toBeGreaterThan(0);
  });
  it.each(['carga', 'revision', 'incorporacion'])('autoriza el perfil %s con un solo permiso funcional', async profile => {
    authContext = { userRole: 'PERSONALIZADO', isSuperUser: false, hasAnyPermission: (codes: string[]) => codes.includes(`banco-docentes.rund.${profile}`) };
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByRole('tab', { name: /Datos básicos/ });
    expect(Boolean(screen.queryByRole('button', { name: 'Editar Datos' }))).toBe(profile === 'carga');
    expect(screen.queryAllByRole('button', { name: 'Validar soporte', exact: true }).length > 0).toBe(profile === 'revision');
    expect(vi.mocked(RundDocumentManager).mock.calls.at(-1)![0].canManage).toBe(profile === 'carga');
    fireEvent.click(screen.getByRole('tab', { name: /Novedades talento humano/ }));
    expect(Boolean(screen.queryByRole('form', { name: 'Datos de contratación' }))).toBe(profile === 'incorporacion');
    expect(vi.mocked(RundDocumentManager).mock.calls.at(-1)![0].canManage).toBe(profile !== 'revision');
    for (const tab of screen.getAllByRole('tab')) {
      fireEvent.click(tab);
      const vinculation = tab.textContent!.includes('Novedades talento');
      expect(Boolean(screen.queryByRole('button', { name: 'Aprobar bloque' }))).toBe(profile === 'revision');
      expect(Boolean(screen.queryByRole('button', { name: 'Devolver bloque' }))).toBe(profile === 'revision');
      expect(Boolean(screen.queryByRole('form', { name: 'Datos de contratación' }))).toBe(profile === 'incorporacion' && vinculation);
      const documentProps = vi.mocked(RundDocumentManager).mock.calls.at(-1)![0];
      expect(documentProps.canManage).toBe(profile === 'carga' || profile === 'incorporacion' && vinculation);
      if (profile === 'incorporacion') expect(documentProps.allowedSupportTypes).toEqual(['contrato','acto_administrativo_vinculacion']);
    }
    expect(vi.mocked(apiClient.get).mock.calls.some(([url]) => url.includes('/auditoria'))).toBe(profile === 'revision');
  });
  it.each([
    { profiles: ['carga', 'revision'], edit: true, review: true, incorporation: false },
    { profiles: ['carga', 'incorporacion'], edit: true, review: false, incorporation: true },
    { profiles: ['revision', 'incorporacion'], edit: false, review: true, incorporation: true },
    { profiles: ['carga', 'revision', 'incorporacion'], edit: true, review: true, incorporation: true },
  ])('acumula las facultades de $profiles en las seis pestañas', async ({ profiles, edit, review, incorporation }) => {
    authContext = { userRole: 'PERSONALIZADO', isSuperUser: false,
      hasAnyPermission: (codes: string[]) => profiles.some(profile => codes.includes(`banco-docentes.rund.${profile}`)) };
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByRole('tab', { name: /Datos básicos/ });
    expect(Boolean(screen.queryByRole('button', { name: 'Editar Datos' }))).toBe(edit);
    for (const tab of screen.getAllByRole('tab')) {
      fireEvent.click(tab);
      const vinculation = tab.textContent!.includes('Novedades talento');
      expect(Boolean(screen.queryByRole('button', { name: 'Devolver bloque' }))).toBe(review);
      expect(Boolean(screen.queryByRole('form', { name: 'Datos de contratación' }))).toBe(incorporation && vinculation);
      const props = vi.mocked(RundDocumentManager).mock.calls.at(-1)![0];
      expect(props.canManage).toBe(edit || incorporation && vinculation);
      if (edit) expect(props.allowedSupportTypes).toBeUndefined();
    }
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('retirar revisión cierra una devolución pendiente e impide enviar la decisión', async () => {
    const view = render(<RundValidationPanel docenteId="docente-1" />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Devolver soporte', exact: true }))[0]);
    fireEvent.change(screen.getByLabelText('Motivo y corrección requerida'), { target: { value: 'Corrija el documento.' } });
    authContext = { userRole: 'PERSONALIZADO', isSuperUser: false,
      hasAnyPermission: (codes: string[]) => codes.includes('banco-docentes.rund.carga') };
    view.rerender(<RundValidationPanel docenteId="docente-1" />);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('button', { name: 'Devolver bloque' })).toBeNull();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it.each(['CARGADOR', 'APROBADOR'])('respeta las capacidades de %s incluso cuando su rol general es GGP', async capability => {
    const permissions = capability === 'CARGADOR'
      ? ['banco-docentes.rund.edit', 'banco-docentes.rund.documents.manage']
      : ['banco-docentes.rund.validate'];
    authContext = { userRole: 'GESTION_PROFESORAL', isSuperUser: false, hasAnyPermission: (codes: string[]) => codes.some(code => permissions.includes(code)) };
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByRole('tab', { name: /Datos básicos/ });
    expect(Boolean(screen.queryByRole('button', { name: 'Editar Datos' }))).toBe(capability === 'CARGADOR');
    expect(screen.queryAllByRole('button', { name: 'Validar soporte', exact: true }).length > 0).toBe(capability === 'APROBADOR');
    expect(Boolean(screen.queryByRole('button', { name: 'Devolver bloque' }))).toBe(capability === 'APROBADOR');
    expect(vi.mocked(RundDocumentManager).mock.calls.at(-1)![0].canManage).toBe(capability === 'CARGADOR');
  });
  it('permite aprobar por decisión del revisor aunque el soporte esté vencido', async () => {
    const support = blocks[0].soportes[0];
    support.estado = 'Aprobado';
    support.fecha_vencimiento = '2000-01-01';
    support.revisiones_campos = Object.fromEntries(['DOCUMENTO_IDENTIDAD', 'NOMBRE_COMPLETO', 'GENERO', 'SEXO_BIOLOGICO', 'FECHA_NACIMIENTO'].map(campo => [campo, { estado: 'Aprobado', documentoVersionId: 'version-1' }]));
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('RUND-PRUEBA');
    await approveDataRows();
    expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(false);
    expect(support.fecha_vencimiento).toBe('2000-01-01');
  });

});
