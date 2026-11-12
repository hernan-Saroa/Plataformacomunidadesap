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
  it('excluye Contacto del contador y resalta el perfil con las cinco secciones aprobadas', async () => {
    for (const block of blocks) block.estado = block.bloque === 'CONTACTO' ? 'Pendiente' : 'Aprobado';
    render(<RundValidationPanel docenteId="docente-1" />);
    expect(await screen.findByText('Perfil RUND aprobado')).toBeTruthy();
    expect(screen.getByText('5 / 5')).toBeTruthy();
    expect(screen.getByText('Contacto no requiere soporte documental.')).toBeTruthy();
    // RUND-013: Contacto ya no tiene pestaña propia; se gestiona en el cabezote.
    expect(screen.queryByRole('tab', { name: /Contacto/ })).toBeNull();
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
    await waitFor(()=>expect(screen.getByRole('status').textContent).toBe('Pendiente de revisión'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Validar soporte', exact: true })[0]);
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/revision'), expect.objectContaining({ documentoVersionId: 'version-corregida', blockVersion: 8 })));
  });

  it('RUND-013: oculta la sección de Contacto (sin pestaña, franja ni botones de validar/devolver dato)', async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('RUND-PRUEBA');
    expect(screen.queryByRole('tab', { name: /Contacto/ })).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.queryByText('Correo institucional')).toBeNull();
    expect(screen.queryByText('Revisa los correos y teléfonos. Esta sección no requiere soportes.')).toBeNull();
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
    await screen.findByRole('tab', { name: /Datos básicos/ });
    const options = vi.mocked(RundDocumentManager).mock.calls.at(-1)![0].evidenceOptions!;
    const identity = options.filter(option => option.block === 'IDENTIDAD' && option.type === 'documento_identidad');
    // Soportes de la codificación sin campo en RUND: opciones propias, disponibles sin dato previo.
    expect(options.filter(option => option.block === 'IDENTIDAD').map(option => option.type)).toEqual(['documento_identidad', 'tarjeta_profesional', 'hoja_vida']);
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
    // Sin datos de formación ni académicos solo quedan disponibles los soportes de la codificación sin campo en RUND.
    expect(options.some(option => (option.block === 'CONTACTO' || option.block === 'FORMACION' || option.block === 'ACADEMICO') && !RUND_STANDALONE_SUPPORTS.includes(option.type))).toBe(false);
    expect(options.find(option => option.block === 'TRANSVERSAL')?.type).toBe('autorizacion_habeas_data');
  });

  it('RUND-002: Datos básicos ofrece hoja de vida y tarjeta profesional como soportes opcionales sin dato previo ni validación de dato', async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByRole('tab', { name: /00 Datos básicos/ });
    for (const label of ['Hoja de vida', 'Tarjeta profesional']) {
      const row = (await screen.findByText(label, { selector: '.rund-checkpoint-label' })).closest('.rund-checkpoint-row') as HTMLElement;
      expect(row.textContent).toContain('Solo soporte documental (opcional)');
      expect(row.textContent).not.toContain('Validar dato');
      expect(row.textContent).not.toContain('Sin dato para soportar');
    }
    // Las cinco filas de la cédula conservan su validación de dato.
    expect(screen.getAllByRole('button', { name: 'Validar dato', exact: true })).toHaveLength(5);
  });

  it('RUND-002: una carpeta que no aplica al tipo de vinculación del docente no se muestra ni cuenta en el indicador', async () => {
    blocks.find(block => block.bloque === 'ACADEMICO').aplica = false;
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByRole('tab', { name: /Datos básicos/ });
    expect(screen.queryByRole('tab', { name: /Experiencia investigativa/ })).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByText('0 / 4')).toBeTruthy();
  });

  it('RUND-002: las carpetas aplican por defecto cuando el servidor no informa configuración', async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByRole('tab', { name: /Datos básicos/ });
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByText('0 / 5')).toBeTruthy();
  });

  it('permite recorrer las cinco pestañas con el teclado y mantiene seleccionada la sección visible', async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    const identity = await screen.findByRole('tab', { name: /Datos básicos/ });
    const formacion = screen.getByRole('tab', { name: /Títulos de formación/ });
    const transversal = screen.getByRole('tab', { name: /Transversal/ });
    expect(identity.tabIndex).toBe(0);
    expect(formacion.tabIndex).toBe(-1);
    fireEvent.keyDown(identity, { key: 'ArrowRight' });
    expect(formacion.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(formacion);
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(formacion.id);
    fireEvent.keyDown(formacion, { key: 'End' });
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
    // HU 1365: cada edición muestra campo, valor anterior y valor nuevo.
    const cambios = audit.getAllByTestId('rund-audit-cambio').map(node => node.textContent);
    expect(cambios).toEqual(['dedicacion: MT → TC', 'observaciones: (vacío) → texto']);
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
