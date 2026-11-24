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

describe('Respuestas tardías del visualizador de soportes', () => {
  it.each(['cerrar', 'cambiar docente', 'abrir otro soporte'])('descarta el archivo pendiente después de %s', async action => {
    const create = vi.fn().mockReturnValue('blob:actual');
    vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = vi.fn(); });
    let complete!: (value: Blob) => void;
    vi.mocked(apiClient.getBlob).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    vi.mocked(apiClient.getBlob).mockResolvedValue(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));
    const originalGet = vi.mocked(apiClient.get).getMockImplementation()!;
    vi.mocked(apiClient.get).mockImplementation(async url => {
      const value = await originalGet(url);
      return url.includes('/tarjeta-rund') && url.includes('/docente-2/') ? { ...value, docenteId: 'docente-2', idRund: 'RUND-ACTUAL' } : value;
    });
    blocks[0].soportes.push({ ...blocks[0].soportes[0], id: 'segundo', documento_perfil_id: 'version-2', documento_carpeta_id: '/segunda.pdf' });
    const view = render(<RundValidationPanel docenteId="docente-1" />);
    const buttons = await screen.findAllByRole('button', { name: 'Ver', exact: true });
    fireEvent.click(buttons[0]);
    await screen.findByText('Visualizador Seguro de Documentos RUND');
    if (action === 'cerrar') {
      const header = screen.getByText('Visualizador Seguro de Documentos RUND').parentElement!.parentElement!.parentElement!;
      fireEvent.click(header.querySelector('button')!);
    } else if (action === 'cambiar docente') {
      view.rerender(<RundValidationPanel docenteId="docente-2" />);
      await screen.findByText('RUND-ACTUAL');
    } else {
      fireEvent.click(buttons[1]);
      await screen.findByTitle('Document Viewer');
    }
    await act(async () => { complete(new Blob(['%PDF-1.7 anterior'], { type: 'application/pdf' })); });
    if (action === 'abrir otro soporte') {
      expect(screen.getByTitle('Document Viewer').getAttribute('src')).toBe('blob:actual');
      expect(create).toHaveBeenCalledTimes(1);
    } else {
      expect(screen.queryByText('Visualizador Seguro de Documentos RUND')).toBeNull();
      expect(create).not.toHaveBeenCalled();
    }
  });
});

it.each([
  ['IDENTIDAD', '00 Datos básicos', 'documento_identidad'],
  ['FORMACION', '01 Títulos de formación', 'diploma_pregrado'],
  ['VINCULACION', '10 Novedades talento humano', 'contrato'],
  ['ACADEMICO', '04 Experiencia investigativa', 'acto_asignacion_nucleo'],
  ['TRANSVERSAL', 'Transversal', 'autorizacion_habeas_data'],
])('actualiza la devolución de %s al cargar o retirar su soporte', async (code, label, type) => {
  const block=blocks.find(b=>b.bloque===code);
  block.soportes=[];
  render(<RundValidationPanel docenteId="docente-1" />);
  await screen.findByText('RUND-PRUEBA');
  if(code!=='IDENTIDAD')fireEvent.click(screen.getByRole('tab',{name:new RegExp(label)}));
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




describe('Revisión centralizada de documentos compartidos', () => {
  it.each([['IDENTIDAD','00 Datos básicos','documento_identidad',5],['VINCULACION','10 Novedades talento humano','contrato',2],['VINCULACION','10 Novedades talento humano','acto_administrativo_dedicacion',2]])('una decisión revisa todos los datos acreditados por %s / %s', async (code,label,type,count) => {
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
    expect(screen.getByRole('group',{name:'Soportes de esta sección'})).toBeTruthy();
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
    expect(screen.getByText('2 archivos')).toBeTruthy();
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
    expect(screen.getByText(/1 admitido de 1 soporte/)).toBeTruthy();
    const sources=screen.getByText('Consultar soportes de este dato (1)').closest('details')!;
    expect(within(sources).getByText('segunda.pdf')).toBeTruthy();
    expect(within(sources).queryByText('primera.pdf')).toBeNull();
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
    const upload = (await screen.findAllByRole('button', { name: 'Adjuntar soporte' }))[0];
    const input = screen.getByLabelText('Archivo de soporte para Nombre completo') as HTMLInputElement;
    const picker = vi.spyOn(input, 'click').mockImplementation(() => {});
    upload.focus();
    expect(document.activeElement).toBe(upload);
    fireEvent.click(upload);
    expect(picker).toHaveBeenCalledTimes(1);
  });
});

describe('Carga por fila con datos', () => {
  it('la guía lleva al dato o a la confirmación sin ejecutar una decisión', async () => {
    const scroll = vi.fn();
    const view = render(<RundValidationPanel docenteId="docente-1" />);
    const guide = await screen.findByRole('navigation', { name: 'Pasos para revisar esta sección' });
    const data = view.container.querySelector('.rund-data-section') as HTMLElement;
    const panel = screen.getByRole('tabpanel');
    expect(panel.contains(guide)).toBe(true);
    expect(panel.contains(data)).toBe(true);
    expect(panel.querySelector('.rund-review-section-intro h4')?.textContent).toBe('00 · Datos básicos');
    data.scrollIntoView = scroll;
    fireEvent.click(within(guide).getByRole('button', { name: /Revisar datos/ }));
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(apiClient.post).not.toHaveBeenCalled();
    const tools = view.container.querySelector('.rund-review-tools') as HTMLDetailsElement;
    expect(tools.open).toBe(false);
    fireEvent.click(tools.querySelector('summary')!);
    expect(tools.open).toBe(true);
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(tools.compareDocumentPosition(data) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const confirmation = view.container.querySelector('.rund-review-confirmation')!;
    expect(data.compareDocumentPosition(confirmation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Volver a los datos/ }));
    expect(scroll).toHaveBeenCalledTimes(2);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('no ofrece carga ni reemplazo sin datos, pero conserva la consulta del soporte', async () => {
    const view = render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('RUND-PRUEBA');
    expect(screen.getByRole('button', { name: 'Ver', exact: true })).toBeTruthy();
    // Solo las filas de soporte documental sin campo en RUND (codificación GGP) permiten cargar sin dato previo.
    expect([...view.container.querySelectorAll('input[type="file"]')].map(input => input.getAttribute('aria-label')))
      .toEqual(['Archivo de soporte para Tarjeta profesional', 'Archivo de soporte para Hoja de vida']);
    fireEvent.click(screen.getByRole('tab', { name: /Novedades talento humano/ }));
    expect(view.container.querySelectorAll('input[type="file"]')).toHaveLength(0);
    expect(screen.getAllByText('Sin dato para soportar').length).toBeGreaterThan(0);
    expect(apiClient.upload).not.toHaveBeenCalled();
  });

  it('ubica la carga compartida en la primera fila con datos y envia su identificador', async () => {
    blocks[0].soportes = [];
    profileBlocks = { IDENTIDAD: { campos: [{ campo: 'NOMBRE_COMPLETO', valor: 'PERSONA DE PRUEBA' }] } };
    const view = render(<RundValidationPanel docenteId="docente-1" />);
    await waitFor(() => expect(view.container.querySelectorAll('.rund-checkpoint-row__data')[1]?.textContent).toContain('PERSONA DE PRUEBA'));
    const inputs = [screen.getByLabelText('Archivo de soporte para Nombre completo')];
    expect(view.container.querySelectorAll('input[type="file"]')).toHaveLength(3);
    fireEvent.change(inputs[0], { target: { files: [new File(['%PDF-1.7'], 'identidad.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalled());
    const form = vi.mocked(apiClient.upload).mock.calls[0][1] as FormData;
    expect(form.get('campo')).toBe('NOMBRE_COMPLETO');
    expect(form.get('tipoSoporte')).toBe('documento_identidad');
  });
});
