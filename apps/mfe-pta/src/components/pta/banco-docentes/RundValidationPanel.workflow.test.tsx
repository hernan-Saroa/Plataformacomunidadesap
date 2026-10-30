import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RundValidationPanel } from './RundValidationPanel';
import { RundDocumentManager } from './RundDocumentManager';
import { apiClient } from '../../../../../shell/src/services/api';
import { RUND_DATA_FIELDS } from '../../../../../../backend/academic-work-plan-service/src/pta/banco-docentes/rund-data-review';

vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), upload: vi.fn() } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => authContext }));
vi.mock('./BancoDocenteEditModal', () => ({ BancoDocenteEditModal: () => null }));
vi.mock('./RundDocumentManager', () => ({ RundDocumentManager: vi.fn(({ onChanged }: any) => <button onClick={onChanged}>Recargar expediente</button>) }));

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
    if (url.includes('/auditoria')) return [{ id: 'log-1', accion: 'CARGAR_DOCUMENTO', bloque: 'IDENTIDAD', actorId: '770e8400-e29b-41d4-a716-446655440001', actorNombre: 'Gestor Documental', createdAt: '2026-09-08T12:00:00Z', metadata: { version: 1, nombreArchivo: 'identidad.pdf' } }];
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
      block.estado = body.estado === 'Rechazado' ? 'Devuelto' : 'En revisión';
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
afterEach(cleanup);

it.each([
  ['IDENTIDAD', 'Identidad', 'documento_identidad'],
  ['FORMACION', 'Formación Académica', 'diploma_pregrado'],
  ['VINCULACION', 'Vinculación', 'contrato'],
  ['ACADEMICO', 'Académico', 'acto_asignacion_nucleo'],
  ['TRANSVERSAL', 'Transversal', 'autorizacion_habeas_data'],
])('actualiza la devolución de %s al cargar o retirar su soporte', async (code, label, type) => {
  const block=blocks.find(b=>b.bloque===code);
  block.soportes=[];
  render(<RundValidationPanel docenteId="docente-1" />);
  await screen.findByText('RUND-PRUEBA');
  if(code!=='IDENTIDAD')fireEvent.click(screen.getByText(label));
  expect((screen.getByRole('button',{name:'Devolver bloque'}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Devolver bloque'}));
  expect(screen.queryByPlaceholderText(/Especifique qué soporte/)).toBeNull();
  block.soportes=[{id:'nuevo',tipo_soporte:type,documento_perfil_id:'v1',documento_carpeta_id:'/file',estado_documento:'ACTIVO',estado:'Pendiente'}];
  fireEvent.click(screen.getByRole('button',{name:'Recargar expediente'}));
  await waitFor(()=>expect((screen.getByRole('button',{name:'Devolver bloque'}) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'Devolver bloque'}));
  fireEvent.change(screen.getByPlaceholderText(/Especifique qué soporte/),{target:{value:'El documento no corresponde.'}});
  block.soportes=[];
  fireEvent.click(screen.getByRole('button',{name:'Recargar expediente'}));
  await waitFor(()=>expect((screen.getByRole('button',{name:'Confirmar devolución'}) as HTMLButtonElement).disabled).toBe(true));
  fireEvent.click(screen.getByRole('button',{name:'Confirmar devolución'}));
  expect(apiClient.post).not.toHaveBeenCalled();
});

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
  it.each([['IDENTIDAD','Identidad'],['CONTACTO','Contacto'],['FORMACION','Formación Académica'],['VINCULACION','Vinculación'],['ACADEMICO','Académico'],['TRANSVERSAL','Transversal']])('permite revisar datos y aprobar %s sin adjuntar archivos',async(code,label)=>{
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
    await screen.findByRole('tab', { name: /Identidad/ });
    expect(Boolean(screen.queryByRole('button', { name: 'Editar Datos' }))).toBe(profile === 'carga');
    expect(screen.queryAllByRole('button', { name: 'Validar soporte', exact: true }).length > 0).toBe(profile === 'revision');
    expect(vi.mocked(RundDocumentManager).mock.calls.at(-1)![0].canManage).toBe(profile === 'carga');
    fireEvent.click(screen.getByRole('tab', { name: /Vinculación/ }));
    expect(Boolean(screen.queryByRole('form', { name: 'Datos de contratación' }))).toBe(profile === 'incorporacion');
    expect(vi.mocked(RundDocumentManager).mock.calls.at(-1)![0].canManage).toBe(profile !== 'revision');
    for (const tab of screen.getAllByRole('tab')) {
      fireEvent.click(tab);
      const vinculation = tab.textContent!.includes('Vinculaci');
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
    await screen.findByRole('tab', { name: /Identidad/ });
    expect(Boolean(screen.queryByRole('button', { name: 'Editar Datos' }))).toBe(edit);
    for (const tab of screen.getAllByRole('tab')) {
      fireEvent.click(tab);
      const vinculation = tab.textContent!.includes('Vinculaci');
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
    await screen.findByRole('tab', { name: /Identidad/ });
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

  it('excluye Contacto del contador y resalta el perfil con las cinco secciones aprobadas', async () => {
    for (const block of blocks) block.estado = block.bloque === 'CONTACTO' ? 'Pendiente' : 'Aprobado';
    render(<RundValidationPanel docenteId="docente-1" />);
    expect(await screen.findByText('Perfil RUND aprobado')).toBeTruthy();
    expect(screen.getByText('5 / 5')).toBeTruthy();
    expect(screen.getByText('Contacto no requiere soporte documental.')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /Contacto/ }));
    expect(screen.queryByRole('button', { name: 'Validar soporte', exact: true })).toBeNull();
    expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('una devolución retira el estado de perfil aprobado y admite nueva revisión tras el reemplazo', async () => {
    for (const block of blocks) block.estado = block.bloque === 'CONTACTO' ? 'Pendiente' : 'Aprobado';
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('Perfil RUND aprobado');
    blocks[0].estado = 'Devuelto';
    fireEvent.click(screen.getByRole('button', { name: 'Recargar expediente' }));
    await screen.findByText('Pendiente de corrección');
    expect(screen.queryByText('Perfil RUND aprobado')).toBeNull();
    blocks[0].estado = 'En revisión';
    blocks[0].version = 8;
    blocks[0].soportes[0].documento_perfil_id = 'version-corregida';
    fireEvent.click(screen.getByRole('button', { name: 'Recargar expediente' }));
    await screen.findByText('Pendiente de aprobación');
    fireEvent.click(screen.getAllByRole('button', { name: 'Validar soporte', exact: true })[0]);
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/revision'), expect.objectContaining({ documentoVersionId: 'version-corregida', blockVersion: 8 })));
  });

  it('envía la versión vigente al aprobar Contacto sin pedir archivos', async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    fireEvent.click(await screen.findByRole('tab', { name: /Contacto/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar bloque' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/CONTACTO/aprobar'), { blockVersion: 1 }));
  });

  it('exige motivo y envía la versión vigente al devolver Contacto', async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    fireEvent.click(await screen.findByRole('tab', { name: /Contacto/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Devolver bloque' }));
    const confirm = screen.getByRole('button', { name: 'Confirmar devolución' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/Especifique/), { target: { value: 'Corrija el correo personal.' } });
    fireEvent.click(confirm);
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/CONTACTO/devolver'), { observacion: 'Corrija el correo personal.', blockVersion: 1 }));
  });

  it('envía todos los datos del soporte compartido y excluye campos ausentes, derivados y restringidos', async () => {
    profileBlocks = {
      IDENTIDAD: { campos: [
        { campo: 'TIPO_DOCUMENTO', valor: 'CC' }, { campo: 'DOCUMENTO_IDENTIDAD', valor: '1000000000' },
        { campo: 'NOMBRE_COMPLETO', valor: 'DOCENTE DE PRUEBA' }, { campo: 'GENERO', valor: 'M' },
        { campo: 'SEXO_BIOLOGICO', valor: 'Hombre' }, { campo: 'FECHA_NACIMIENTO', valor: '1984-11-01' },
        { campo: 'EDAD', valor: 41 },
      ] },
      VINCULACION: { campos: [
        { campo: 'ACTO_ADMINISTRATIVO', valor: 'Resolución 123' },
        { campo: 'INICIO_VINCULACION', valor: '2026-01-01' },
        { campo: 'DEDICACION', valor: 'TC' }, { campo: 'HORAS_PTA', valor: 800 },
        { campo: 'PUNTAJE_SALARIAL', valor: 'Restringido', restringido: true },
      ] },
    };
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByRole('tab', { name: /Identidad/ });
    const options = vi.mocked(RundDocumentManager).mock.calls.at(-1)![0].evidenceOptions!;
    const identity = options.filter(option => option.block === 'IDENTIDAD');
    expect(identity).toHaveLength(1);
    expect(identity[0].label).toBe('Documento de identidad');
    expect(identity[0].fields?.map(field => field.label)).toEqual([
      'Tipo y número de documento', 'Nombre completo', 'Género', 'Sexo biológico', 'Fecha de nacimiento',
    ]);
    expect(identity[0].fields?.map(field => field.value)).toEqual([
      'CC · 1000000000', 'DOCENTE DE PRUEBA', 'M', 'Hombre', '1984-11-01',
    ]);
    expect(options.find(option => option.type === 'contrato')?.fields?.map(field => field.label)).toEqual(['Acto administrativo', 'Inicio / Fin de vinculación']);
    expect(options.find(option => option.type === 'acto_administrativo_dedicacion')?.fields?.map(field => field.label)).toEqual(['Dedicación (TC/MT/HC)', 'Horas PTA']);
    expect(options.some(option => option.type === 'resolucion_puntaje_salarial')).toBe(false);
    expect(options.some(option => option.block === 'CONTACTO' || option.block === 'FORMACION' || option.block === 'ACADEMICO')).toBe(false);
    expect(options.find(option => option.block === 'TRANSVERSAL')?.type).toBe('autorizacion_habeas_data');
  });

  it('permite recorrer las seis pestañas con el teclado y mantiene seleccionada la sección visible', async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    const identity = await screen.findByRole('tab', { name: /Identidad/ });
    const contact = screen.getByRole('tab', { name: /Contacto/ });
    const transversal = screen.getByRole('tab', { name: /Transversal/ });
    expect(identity.tabIndex).toBe(0);
    expect(contact.tabIndex).toBe(-1);
    fireEvent.keyDown(identity, { key: 'ArrowRight' });
    expect(contact.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(contact);
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(contact.id);
    fireEvent.keyDown(contact, { key: 'End' });
    expect(transversal.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(transversal, { key: 'ArrowRight' });
    expect(identity.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(identity, { key: 'ArrowLeft' });
    expect(transversal.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(transversal, { key: 'Home' });
    expect(identity.getAttribute('aria-selected')).toBe('true');
    expect(apiClient.upload).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('registra la decisión con la versión vigente y después aprueba el espacio', async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    const approve = (await screen.findAllByRole('button', { name: 'Validar soporte', exact: true }))[0];
    expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(approve);
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/soportes/soporte-1/revision'), expect.objectContaining({ estado: 'Aprobado', alcance: 'documento', documentoVersionId: 'version-1' })));
    await approveRemainingRows();
    await waitFor(() => expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar bloque' }));
    expect(await screen.findByText('Espacio aprobado')).toBeTruthy();
    expect(vi.mocked(apiClient.post).mock.calls.some(([url]) => url.includes('validacion-documental/batch'))).toBe(false);
  });

  it('exige motivo antes de devolver y muestra la corrección solicitada', async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Devolver soporte', exact: true }))[0]);
    const confirm = screen.getByRole('button', { name: 'Confirmar devolución' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Motivo y corrección requerida'), { target: { value: 'Adjunte el documento de la persona registrada.' } });
    fireEvent.click(confirm);
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/revision'), expect.objectContaining({ estado: 'Rechazado', observacion: 'Adjunte el documento de la persona registrada.' })));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect((await screen.findAllByText('Adjunte el documento de la persona registrada.')).length).toBeGreaterThan(0);
  });

  it('descarta las aprobaciones anteriores cuando llega un reemplazo pendiente', async () => {
    blocks[0].estado = 'Aprobado';
    blocks[0].soportes[0].estado = 'Aprobado';
    blocks[0].soportes[0].revisiones_campos = Object.fromEntries(['DOCUMENTO_IDENTIDAD', 'NOMBRE_COMPLETO', 'GENERO', 'SEXO_BIOLOGICO', 'FECHA_NACIMIENTO'].map(campo => [campo, { estado: 'Aprobado', documentoVersionId: 'version-1' }]));
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('Espacio aprobado');
    blocks[0].estado = 'En revisión';
    blocks[0].soportes[0] = { ...blocks[0].soportes[0], estado: 'Pendiente', documento_perfil_id: 'version-2', documento_carpeta_id: '/pta/documento-2' };
    fireEvent.click(screen.getByRole('button', { name: 'Recargar expediente' }));
    await screen.findAllByRole('button', { name: 'Validar soporte', exact: true });
    expect(screen.queryByText('Espacio aprobado')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Validar soporte', exact: true })[0]);
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/revision'), expect.objectContaining({ documentoVersionId: 'version-2' })));
  });

  it('expone archivo, actor y versión en la trazabilidad', async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver trazabilidad de revisiones y documentos' }));
    // The checkpoint also lists the evidence file name; the audit trail is checked on its own region.
    const audit = within(screen.getByRole('region', { name: 'Trazabilidad de revisiones y documentos' }));
    expect(audit.getByText('identidad.pdf')).toBeTruthy();
    expect(audit.getByText('Versión 1')).toBeTruthy();
    expect(audit.getByText(/Gestor Documental/)).toBeTruthy();
    expect(document.body.textContent).not.toContain('770e8400-e29b-41d4-a716-446655440001');
  });
  it('recupera las aprobaciones del servidor al montar una pantalla nueva', async () => {
    const first = render(<RundValidationPanel docenteId="docente-1" />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Validar soporte', exact: true }))[0]);
    await approveRemainingRows();
    await waitFor(() => expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar bloque' }));
    await screen.findByText('Espacio aprobado');
    first.unmount();
    vi.mocked(apiClient.get).mockClear();
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('Espacio aprobado');
    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('/docente-1/bloques'));
  });

  it('permite aprobar sin decidir las sugerencias OCR y no las aplica ni descarta automáticamente', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url.includes('/extracciones')) return { enabled: true, documents: [], jobs: [{
        id: 'job-1', documento_id: 'pdf-1', nombre_archivo: 'identidad.pdf', version: 1,
        estado: 'COMPLETADO', documento_estado: 'ACTIVO', sugerencias: [{
          id: 'suggestion-1', campo: 'nombreCompleto', label: 'Nombre completo', valor: 'PERSONA CORRECTA',
          valor_previo: 'PERSONA ANTERIOR', pagina: 1, evidencia: 'NOMBRES PERSONA CORRECTA', estado: 'PENDIENTE', baja_confianza: false,
        }],
      }] };
      if (url.includes('/bloques')) return fixtureBlocks();
      if (url.includes('/auditoria')) return [];
      return { docenteId: 'docente-1', idRund: 'RUND-PRUEBA', proteccion_datos: { acceso_completo: true }, bloques: profileBlocks };
    });
    render(<RundValidationPanel docenteId="docente-1" />);
    const first = (await screen.findAllByRole('button', { name: 'Validar soporte', exact: true }))[0];
    fireEvent.click(first);
    await approveRemainingRows();
    await waitFor(() => expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.queryByText(/Resuelva.*sugerencia OCR/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar bloque' }));
    await screen.findByText('Espacio aprobado');
    expect(vi.mocked(apiClient.post).mock.calls.some(([url]) => url.endsWith('/aprobar'))).toBe(true);
    expect(vi.mocked(apiClient.post).mock.calls.some(([url]) => /confirmar|descartar/.test(url))).toBe(false);
  });

  it.each(['PENDIENTE', 'PROCESANDO', 'ERROR'])('permite aprobar las filas revisadas aunque el OCR esté %s', async estado => {
    const support = blocks[0].soportes[0];
    support.estado = 'Aprobado';
    support.revisiones_campos = Object.fromEntries(['DOCUMENTO_IDENTIDAD', 'NOMBRE_COMPLETO', 'GENERO', 'SEXO_BIOLOGICO', 'FECHA_NACIMIENTO']
      .map(campo => [campo, { estado: 'Aprobado', documentoVersionId: 'version-1' }]));
    const originalGet = vi.mocked(apiClient.get).getMockImplementation()!;
    vi.mocked(apiClient.get).mockImplementation(async (url: string, ...args: any[]) => url.includes('/extracciones')
      ? { enabled: true, documents: [], jobs: [{ id: 'job', bloque: 'IDENTIDAD', documento_estado: 'ACTIVO', estado, sugerencias: [] }] }
      : originalGet(url, ...args));
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('RUND-PRUEBA');
    await approveDataRows();
    await waitFor(() => expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar bloque' }));
    await screen.findByText('Espacio aprobado');
    fireEvent.click(screen.getByRole('tab', { name: /Contacto/ }));
    expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('un fallo al consultar el OCR tampoco bloquea la revisión documental', async () => {
    const support=blocks[0].soportes[0];
    support.estado='Aprobado';
    support.revisiones_campos=Object.fromEntries(['DOCUMENTO_IDENTIDAD','NOMBRE_COMPLETO','GENERO','SEXO_BIOLOGICO','FECHA_NACIMIENTO'].map(campo=>[campo,{estado:'Aprobado',documentoVersionId:'version-1'}]));
    const originalGet=vi.mocked(apiClient.get).getMockImplementation()!;
    vi.mocked(apiClient.get).mockImplementation(async(url:string,...args:any[])=>{
      if(url.includes('/extracciones'))throw new Error('OCR no disponible');
      return originalGet(url,...args);
    });
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('No fue posible actualizar el análisis');
    await approveDataRows();
    expect((screen.getByRole('button',{name:'Aprobar bloque'}) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button',{name:'Aprobar bloque'}));
    await screen.findByText('Espacio aprobado');
  });

  it('ante un fallo del servidor no inventa estados usando los datos de la tabla', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Servidor no disponible'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<RundValidationPanel docenteId="docente-1" docente={{ nombre_completo: 'DOCENTE TABLA', documento_identidad: '12345' }} />);
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo verificar el estado vigente');
    expect(screen.queryByRole('button', { name: 'Aprobar bloque' })).toBeNull();
    expect(screen.queryByText('RUND-12345')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(apiClient.post).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it.each(['Validar dato','Validar soporte'])('un guardado tardío de %s no sustituye el expediente del docente actual',async action=>{
    const originalGet=vi.mocked(apiClient.get).getMockImplementation()!;
    vi.mocked(apiClient.get).mockImplementation(async(url:string)=>{
      if(url.includes('/tarjeta-rund')){
        const old=url.includes('/docente-1/');
        return {docenteId:old?'docente-1':'docente-2',idRund:old?'RUND-ANTERIOR':'RUND-ACTUAL',bloques:profileBlocks,proteccion_datos:{acceso_completo:true}};
      }
      return originalGet(url);
    });
    let complete!:(value:any)=>void;
    vi.mocked(apiClient.post).mockImplementationOnce(()=>new Promise(resolve=>{complete=resolve;}));
    const view=render(<RundValidationPanel docenteId="docente-1"/>);
    await screen.findByText('RUND-ANTERIOR');
    fireEvent.click(screen.getAllByRole('button',{name:action,exact:true})[0]);
    expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/docente-1/'),expect.any(Object));
    view.rerender(<RundValidationPanel docenteId="docente-2"/>);
    await screen.findByText('RUND-ACTUAL');
    const previousReads=vi.mocked(apiClient.get).mock.calls.filter(([url])=>url.includes('/docente-1/')).length;
    await act(async()=>{complete({success:true});});
    expect(screen.queryByText('RUND-ANTERIOR')).toBeNull();
    expect(screen.getByText('RUND-ACTUAL')).toBeTruthy();
    expect(vi.mocked(apiClient.get).mock.calls.filter(([url])=>url.includes('/docente-1/')).length).toBe(previousReads);
  });
  it('no vuelve a consultar un expediente cerrado cuando termina un guardado pendiente',async()=>{
    let complete!:(value:any)=>void;
    vi.mocked(apiClient.post).mockImplementationOnce(()=>new Promise(resolve=>{complete=resolve;}));
    const view=render(<RundValidationPanel docenteId="docente-1"/>);
    await screen.findByText('RUND-PRUEBA');
    fireEvent.click(screen.getAllByRole('button',{name:'Validar dato',exact:true})[0]);
    view.unmount();
    vi.mocked(apiClient.get).mockClear();
    await act(async()=>{complete({success:true});});
    expect(apiClient.get).not.toHaveBeenCalled();
  });
  it('descarta respuestas tardías de otro docente al cambiar de expediente', async () => {
    const pending: Array<() => void> = [];
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      const old = url.includes('/docente-1/');
      const result = url.includes('/bloques') ? blocks.map(b => ({ ...b, estado: old ? 'Aprobado' : 'En revisión' }))
        : url.includes('/auditoria') ? [] : { docenteId: old ? 'docente-1' : 'docente-2', idRund: old ? 'RUND-ANTERIOR' : 'RUND-ACTUAL', bloques: {} };
      return old ? new Promise(resolve => pending.push(() => resolve(result))) : result;
    });
    const view = render(<RundValidationPanel docenteId="docente-1" />);
    view.rerender(<RundValidationPanel docenteId="docente-2" />);
    await screen.findByText('RUND-ACTUAL');
    await act(async () => { pending.forEach(resolve => resolve()); });
    expect(screen.queryByText('RUND-ANTERIOR')).toBeNull();
    expect(screen.queryByText('Espacio aprobado')).toBeNull();
    expect(screen.getByText('RUND-ACTUAL')).toBeTruthy();
  });

});


describe('Revisión centralizada de documentos compartidos', () => {
  it.each([['IDENTIDAD','Identidad','documento_identidad',5],['VINCULACION','Vinculación','contrato',2],['VINCULACION','Vinculación','acto_administrativo_dedicacion',2]])('una decisión revisa todos los datos acreditados por %s / %s', async (code,label,type,count) => {
    const block=blocks.find(b=>b.bloque===code);
    block.soportes=[{id:'shared',tipo_soporte:type,estado:'Pendiente',documento_perfil_id:'v1',documento_carpeta_id:'/file'}];
    render(<RundValidationPanel docenteId="docente-1"/>);await screen.findByText('RUND-PRUEBA');
    if(code!=='IDENTIDAD')fireEvent.click(screen.getByRole('tab',{name:new RegExp(String(label))}));
    const review=screen.getAllByRole('button',{name:'Validar soporte',exact:true});expect(review).toHaveLength(1);
    fireEvent.click(review[0]);
    await waitFor(()=>expect(screen.queryAllByRole('button',{name:'Validar soporte',exact:true})).toHaveLength(0));
    expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/shared/revision'),expect.objectContaining({alcance:'documento',documentoVersionId:'v1',blockVersion:1}));
    expect(Object.values(block.soportes[0].revisiones_campos)).toHaveLength(Number(count));
    expect(Object.values(block.soportes[0].revisiones_campos).every((decision:any)=>decision.estado==='Aprobado')).toBe(true);
    expect(screen.getByRole('region',{name:'Selección y revisión de soportes'})).toBeTruthy();
  });
});

describe('Varias evidencias por punto de control', () => {
  const evidence = (id: string, version: string, createdAt: string, extra: any = {}) => ({
    id, tipo_soporte: 'autorizacion_habeas_data', bloque: 'TRANSVERSAL', documento_perfil_id: version, documento_carpeta_id: `/pta/${version}`,
    estado_documento: 'ACTIVO', nombre_archivo: `${id}.pdf`, estado: 'Pendiente', createdAt, ...extra,
  });
  const openTransversal = async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('RUND-PRUEBA');
    fireEvent.click(screen.getByRole('tab', { name: /Transversal/ }));
  };
  beforeEach(() => {
    const block = blocks.find(b => b.bloque === 'TRANSVERSAL');
    block.estado = 'En revisión';
    // Listed newest first by the server; the panel numbers them by upload order.
    block.soportes = [evidence('segunda', 'v2', '2026-10-02T10:00:00Z'), evidence('primera', 'v1', '2026-10-01T10:00:00Z')];
  });

  it('numera las evidencias por orden de carga y revisa cada una por separado', async () => {
    await openTransversal();
    const list = within(screen.getByRole('list', { name: 'Evidencias de Autorización de tratamiento de datos' }));
    const items = list.getAllByRole('listitem');
    expect(items.map(item => item.textContent)).toEqual([expect.stringContaining('Evidencia 1'), expect.stringContaining('Evidencia 2')]);
    expect(items[0].textContent).toContain('primera.pdf');
    expect(screen.getByText('2 soportes vigentes · una decisión por archivo')).toBeTruthy();
    expect(screen.getByText('Pendiente de validar el dato')).toBeTruthy();
    fireEvent.click(within(items[1]).getByRole('button', { name: 'Validar soporte' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/TRANSVERSAL/soportes/segunda/revision'),
      expect.objectContaining({ estado: 'Aprobado', alcance: 'documento', documentoVersionId: 'v2' })));
  });

  it('aprueba el bloque con la evidencia admitida aunque otra del mismo punto haya sido devuelta', async () => {
    await openTransversal();
    const approve = screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    let items = within(screen.getByRole('list', { name: /Evidencias de/ })).getAllByRole('listitem');
    fireEvent.click(within(items[0]).getByRole('button', { name: 'Devolver soporte' }));
    expect(screen.getByRole('dialog', { name: 'Devolver soporte' }).textContent).toContain('Evidencia 1 de 2');
    fireEvent.change(screen.getByLabelText('Motivo y corrección requerida'), { target: { value: 'El formato no está firmado.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar devolución' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('El formato no está firmado.')).toBeTruthy();
    items = within(screen.getByRole('list', { name: /Evidencias de/ })).getAllByRole('listitem');
    fireEvent.click(within(items[1]).getByRole('button', { name: 'Validar soporte' }));
    await waitFor(()=>expect(screen.queryAllByRole('button',{name:'Validar soporte',exact:true})).toHaveLength(0));
    await approveDataRows();
    await waitFor(() => expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getByText(/1 admitido de 2 soportes/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar bloque' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/TRANSVERSAL/aprobar'), expect.any(Object)));
  });

  it('permite aprobar los datos por criterio del revisor aunque todas sus evidencias estén devueltas', async () => {
    const block = blocks.find(b => b.bloque === 'TRANSVERSAL');
    block.soportes = block.soportes.map((support: any) => ({ ...support, estado: 'Rechazado', revisiones_campos: {
      autorizacion_habeas_data: { estado: 'Rechazado', observacion: 'No corresponde.', documentoVersionId: support.documento_perfil_id } } }));
    await openTransversal();
    await approveDataRows();
    expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(false);
    expect(block.soportes.every((support:any)=>support.estado==='Rechazado')).toBe(true);
  });

  it('agrega otra evidencia o reemplaza exactamente la elegida', async () => {
    vi.mocked(apiClient.upload).mockResolvedValue({ id: 'nuevo' });
    await openTransversal();
    const pdf = () => new File(['%PDF-1.7'], 'nueva.pdf', { type: 'application/pdf' });
    // Real buttons (keyboard operable) open the hidden picker.
    const addButton = screen.getByRole('button', { name: 'Agregar otra evidencia' });
    const addInput = screen.getByLabelText('Archivo de otra evidencia para Autorización de tratamiento de datos') as HTMLInputElement;
    const picker = vi.spyOn(addInput, 'click').mockImplementation(() => {});
    fireEvent.click(addButton);
    expect(picker).toHaveBeenCalledTimes(1);
    fireEvent.change(addInput, { target: { files: [pdf()] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalledTimes(1));
    const added = vi.mocked(apiClient.upload).mock.calls[0][1] as FormData;
    expect(added.get('modo')).toBe('agregar');
    expect(added.get('documentoId')).toBeNull();
    await waitFor(() => expect((screen.getByRole('button', { name: 'Reemplazar evidencia 2' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('Archivo para reemplazar la evidencia 2'), { target: { files: [pdf()] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalledTimes(2));
    const replaced = vi.mocked(apiClient.upload).mock.calls[1][1] as FormData;
    expect(replaced.get('documentoId')).toBe('v2');
    expect(replaced.get('modo')).toBeNull();
  });
});

describe('Evidencias de identidad y soportes históricos', () => {
  it('reemplaza una evidencia de pasaporte del punto de identidad enviando su documento', async () => {
    vi.mocked(apiClient.upload).mockResolvedValue({ id: 'nuevo' });
    profileBlocks = { IDENTIDAD: { campos: [{ campo: 'NOMBRE_COMPLETO', valor: 'PERSONA DE PRUEBA' }] } };
    blocks[0].soportes = [{ id: 'pasaporte-1', tipo_soporte: 'pasaporte', documento_perfil_id: 'v-pa', documento_carpeta_id: '/pa', estado_documento: 'ACTIVO', estado: 'Pendiente', nombre_archivo: 'pasaporte.pdf' }];
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findAllByText('pasaporte.pdf');
    fireEvent.change(screen.getByLabelText('Archivo para reemplazar el documento'), { target: { files: [new File(['%PDF-1.7'], 'nuevo.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalled());
    const form = vi.mocked(apiClient.upload).mock.calls[0][1] as FormData;
    expect(form.get('documentoId')).toBe('v-pa');
    expect(form.get('tipoSoporte')).toBe('documento_identidad');
  });

  it('reemplaza un soporte histórico sin versión documental indicando su fila de revisión', async () => {
    vi.mocked(apiClient.upload).mockResolvedValue({ id: 'nuevo' });
    profileBlocks = { IDENTIDAD: { campos: [{ campo: 'NOMBRE_COMPLETO', valor: 'PERSONA DE PRUEBA' }] } };
    blocks[0].soportes = [{ id: 'historico-1', tipo_soporte: 'documento_identidad', documento_perfil_id: null, documento_carpeta_id: '/pta/uploads/cedula.pdf', estado: 'Pendiente', nombre_archivo: 'cedula.pdf' }];
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findAllByText('cedula.pdf');
    fireEvent.change(screen.getByLabelText('Archivo para reemplazar el documento'), { target: { files: [new File(['%PDF-1.7'], 'nuevo.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalled());
    const form = vi.mocked(apiClient.upload).mock.calls[0][1] as FormData;
    expect(form.get('soporteHistoricoId')).toBe('historico-1');
    expect(form.get('modo')).toBeNull();
    expect(form.get('documentoId')).toBeNull();
  });

  it('el botón Subir de un punto vacío se puede usar con teclado', async () => {
    blocks[0].soportes = [];
    profileBlocks = { IDENTIDAD: { campos: [{ campo: 'NOMBRE_COMPLETO', valor: 'PERSONA DE PRUEBA' }] } };
    render(<RundValidationPanel docenteId="docente-1" />);
    const upload = await screen.findByRole('button', { name: 'Adjuntar soporte' });
    const input = screen.getByLabelText('Archivo de soporte para Nombre completo') as HTMLInputElement;
    const picker = vi.spyOn(input, 'click').mockImplementation(() => {});
    upload.focus();
    expect(document.activeElement).toBe(upload);
    fireEvent.click(upload);
    expect(picker).toHaveBeenCalledTimes(1);
  });
});

describe('Carga por fila con datos', () => {
  it('no ofrece carga ni reemplazo sin datos, pero conserva la consulta del soporte', async () => {
    const view = render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('RUND-PRUEBA');
    expect(screen.getByRole('button', { name: 'Ver', exact: true })).toBeTruthy();
    expect(view.container.querySelectorAll('input[type="file"]')).toHaveLength(0);
    fireEvent.click(screen.getByText('Vinculaci\u00f3n'));
    expect(view.container.querySelectorAll('input[type="file"]')).toHaveLength(0);
    expect(screen.getAllByText('Sin dato para soportar').length).toBeGreaterThan(0);
    expect(apiClient.upload).not.toHaveBeenCalled();
  });

  it('ubica la carga compartida en la primera fila con datos y envia su identificador', async () => {
    blocks[0].soportes = [];
    profileBlocks = { IDENTIDAD: { campos: [{ campo: 'NOMBRE_COMPLETO', valor: 'PERSONA DE PRUEBA' }] } };
    const view = render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('PERSONA DE PRUEBA');
    const inputs = view.container.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(1);
    fireEvent.change(inputs[0], { target: { files: [new File(['%PDF-1.7'], 'identidad.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalled());
    const form = vi.mocked(apiClient.upload).mock.calls[0][1] as FormData;
    expect(form.get('campo')).toBe('NOMBRE_COMPLETO');
    expect(form.get('tipoSoporte')).toBe('documento_identidad');
  });
});
