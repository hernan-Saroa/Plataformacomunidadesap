import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RundDocumentManager } from './RundDocumentManager';
import { apiClient } from '../../../../../shell/src/services/api';
import { toast } from 'sonner';
import { RUND_BLOCK_LABELS } from '../../../utils/rundDocumentScope';

vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), upload: vi.fn(), getBlob: vi.fn(), delete: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const docs = [
  { id: 'identity', bloque: 'IDENTIDAD', tipoSoporte: 'documento_identidad', categoria: 'IDENTIDAD', categoriaNombre: 'Identidad', nombreArchivo: 'Identificación.pdf', descripcion: 'Documento personal', estado: 'ACTIVO', estadoRevision: 'Aprobado', version: 2, totalVersiones: 2, tamanoBytes: 100, contenidoUrl: '/identity', creadoPor: '770e8400-e29b-41d4-a716-446655440001', creadoPorNombre: 'Gestor Documental' },
  { id: 'degree', bloque: 'FORMACION', tipoSoporte: 'diploma_maestria', categoria: 'TITULOS', categoriaNombre: 'Títulos', nombreArchivo: 'Maestría.pdf', descripcion: 'Formación profesional', estado: 'ACTIVO', version: 1, totalVersiones: 1, tamanoBytes: 100, contenidoUrl: '/degree' },
  { id: 'restricted', bloque: 'IDENTIDAD', categoria: 'IDENTIDAD', categoriaNombre: 'Identidad', nombreArchivo: 'Restringido.pdf', estado: 'ACTIVO', version: 1, totalVersiones: 1, contenidoUrl: '/restricted', contenidoRestringido: true },
];
const old = { ...docs[0], id: 'old', nombreArchivo: 'Identificación anterior.pdf', estado: 'REEMPLAZADO', version: 1, contenidoUrl: '/old' };
const categories = [
  { codigo: 'IDENTIDAD', nombre: 'Identidad' }, { codigo: 'TITULOS', nombre: 'Títulos' },
  { codigo: 'CONTRATOS', nombre: 'Contratos' }, { codigo: 'CERTIFICADOS', nombre: 'Certificados' },
  { codigo: 'RESOLUCIONES', nombre: 'Resoluciones' }, { codigo: 'AUTORIZACIONES', nombre: 'Autorizaciones' },
  { codigo: 'OTROS', nombre: 'Otros' },
];
const props = { docenteId: 'docente-1', canManage: true, onView: vi.fn(), onChanged: vi.fn(), evidenceOptions: [{ block: 'IDENTIDAD', type: 'documento_identidad', label: 'Documento de identidad' }] };
const row = (name: string) => within(screen.getByTitle(name).closest('article')!);
const loaded = () => waitFor(() => expect(screen.getByRole('region', { name: 'Lista de documentos del perfil' }).getAttribute('aria-busy')).toBe('false'));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => url.endsWith('/categorias')
    ? categories
    : url.endsWith('/configuracion') ? { habilitado: true }
    : url.endsWith('historial=true') ? [...docs, old] : docs);
  vi.mocked(apiClient.upload).mockResolvedValue({ success: true });
  vi.mocked(apiClient.delete).mockResolvedValue({ success: true });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Biblioteca compacta de documentos RUND', () => {
  it('incorporación gestiona contratos y oculta cambios en los otros soportes de Vinculación', async () => {
    const previous = vi.mocked(apiClient.get).getMockImplementation()!;
    const contract = { ...docs[0], id: 'contract', bloque: 'VINCULACION', tipoSoporte: 'contrato', nombreArchivo: 'Contrato.pdf' };
    const category = { ...docs[0], id: 'category', bloque: 'VINCULACION', tipoSoporte: 'resolucion_escalafon', nombreArchivo: 'Categoria.pdf' };
    vi.mocked(apiClient.get).mockImplementation(async url => url.includes('/documentos?') ? [contract, category] : previous(url));
    render(<RundDocumentManager {...props} activeBlock="VINCULACION" activeBlockLabel="Vinculación" allowedSupportTypes={['contrato','acto_administrativo_vinculacion']}
      evidenceOptions={[{ block: 'VINCULACION', type: 'contrato', label: 'Contrato' }, { block: 'VINCULACION', type: 'resolucion_escalafon', label: 'Categoría' }]} />);
    await screen.findByText('Contrato.pdf');
    expect(row('Contrato.pdf').getByTitle(/Reemplazar/)).toBeTruthy();
    expect(row('Categoria.pdf').queryByTitle(/Reemplazar/)).toBeNull();
    expect(row('Categoria.pdf').queryByTitle('Eliminar')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Agregar documento/ }));
    expect(screen.queryByRole('button', { name: 'Anexo general', exact: true })).toBeNull();
    expect(screen.queryByText('Categoría', { selector: 'option' })).toBeNull();
  });
  it.each(Object.entries(RUND_BLOCK_LABELS))('muestra únicamente archivos de %s y los recupera al regresar a la pestaña', async (block, label) => {
    const files = Object.entries(RUND_BLOCK_LABELS).map(([bloque, name]) => ({
      ...docs[0], id: bloque, bloque, tipoSoporte: undefined, nombreArchivo: `${name}.pdf`,
    }));
    const previous = vi.mocked(apiClient.get).getMockImplementation()!;
    vi.mocked(apiClient.get).mockImplementation(async url => url.includes('/documentos?') ? files : previous(url));
    const view = render(<RundDocumentManager {...props} activeBlock={block} activeBlockLabel={label} />);
    await screen.findByText(`${label}.pdf`);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: new RegExp(`Documentos de ${label}`) })).toBeTruthy();
    expect(screen.getByText('1 de 1 documentos')).toBeTruthy();
    for (const file of files.filter(file => file.bloque !== block)) expect(screen.queryByText(file.nombreArchivo)).toBeNull();
    const calls = vi.mocked(apiClient.get).mock.calls.length;
    const other = block === 'IDENTIDAD' ? 'FORMACION' : 'IDENTIDAD';
    view.rerender(<RundDocumentManager {...props} activeBlock={other} activeBlockLabel={RUND_BLOCK_LABELS[other]} />);
    expect(screen.queryByText(`${label}.pdf`)).toBeNull();
    expect(screen.getByText(`${RUND_BLOCK_LABELS[other]}.pdf`)).toBeTruthy();
    view.rerender(<RundDocumentManager {...props} activeBlock={block} activeBlockLabel={label} />);
    expect(screen.getByText(`${label}.pdf`)).toBeTruthy();
    expect(apiClient.get).toHaveBeenCalledTimes(calls);
    expect(apiClient.upload).not.toHaveBeenCalled();
  });

  it('separa los anexos generales de las pestañas aunque su categoría coincida con una sección', async () => {
    const previous = vi.mocked(apiClient.get).getMockImplementation()!;
    const general = { ...docs[0], id: 'general', bloque: undefined, tipoSoporte: undefined, nombreArchivo: 'Anexo complementario.pdf' };
    vi.mocked(apiClient.get).mockImplementation(async url => url.includes('/documentos?') ? [...docs, general] : previous(url));
    render(<RundDocumentManager {...props} activeBlock="FORMACION" activeBlockLabel="Formación Académica" canManage={false} />);
    await screen.findByText('Maestría.pdf');
    expect(screen.queryByText('Identificación.pdf')).toBeNull();
    expect(screen.queryByText('Anexo complementario.pdf')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Anexos generales (1)' }));
    expect(screen.getByRole('heading', { name: /Anexos generales/ })).toBeTruthy();
    expect(screen.getByText('Anexo complementario.pdf')).toBeTruthy();
    expect(screen.queryByText('Maestría.pdf')).toBeNull();
    expect(screen.queryByText('Identificación.pdf')).toBeNull();
    expect(screen.getByText(/sin sección asignada/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Formación Académica (1)' }));
    expect(screen.getByText('Maestría.pdf')).toBeTruthy();
    expect(screen.queryByText('Anexo complementario.pdf')).toBeNull();
  });

  it('limita el historial y los filtros a la sección activa y limpia la búsqueda al cambiarla', async () => {
    const previous = vi.mocked(apiClient.get).getMockImplementation()!;
    const oldDegree = { ...docs[1], id: 'old-degree', nombreArchivo: 'Maestría anterior.pdf', estado: 'REEMPLAZADO' };
    vi.mocked(apiClient.get).mockImplementation(async url => url.includes('/documentos?')
      ? url.endsWith('historial=true') ? [...docs, old, oldDegree] : docs : previous(url));
    const view = render(<RundDocumentManager {...props} activeBlock="IDENTIDAD" activeBlockLabel="Identidad" />);
    await screen.findByText('Identificación.pdf');
    expect(screen.queryByLabelText('Filtrar documentos por categoría')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    await screen.findByText('Identificación anterior.pdf');
    expect(screen.queryByText('Maestría anterior.pdf')).toBeNull();
    expect(screen.getByText('3 de 3 archivos y versiones')).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Identificación anterior' } });
    view.rerender(<RundDocumentManager {...props} activeBlock="FORMACION" activeBlockLabel="Formación Académica" />);
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Maestría.pdf')).toBeTruthy();
    expect(screen.getByText('Maestría anterior.pdf')).toBeTruthy();
    expect(screen.queryByText('Identificación anterior.pdf')).toBeNull();
    expect(screen.getByText('2 de 2 archivos y versiones')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ver vigentes' }));
    await waitFor(() => expect(screen.queryByText('Maestría anterior.pdf')).toBeNull());
    expect(screen.getByText('1 de 1 documentos')).toBeTruthy();
  });

  it('muestra el nombre del cargador en los detalles y no imprime su UUID', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    fireEvent.click(row('Identificación.pdf').getByText('Detalles'));
    expect(row('Identificación.pdf').getByText('Gestor Documental')).toBeTruthy();
    expect(document.body.textContent).not.toContain(docs[0].creadoPor);
  });

  it('no muestra el identificador cuando una versión anterior del servidor aún no trae el nombre', async () => {
    const previous = vi.mocked(apiClient.get).getMockImplementation()!;
    vi.mocked(apiClient.get).mockImplementation(async url => url.includes('/documentos?')
      ? [{ ...docs[0], creadoPorNombre: undefined }] : previous(url));
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    fireEvent.click(row('Identificación.pdf').getByText('Detalles'));
    expect(row('Identificación.pdf').getByText('Usuario no disponible')).toBeTruthy();
    expect(document.body.textContent).not.toContain(docs[0].creadoPor);
  });

  it('muestra todos los datos del soporte único de Identidad y permite cargar sin selector',async()=>{
    render(<RundDocumentManager {...props} activeBlock="IDENTIDAD" activeBlockLabel="Identidad" evidenceOptions={[
      {...props.evidenceOptions[0], fields: [
        {label:'Tipo y número de documento',value:'CC · 1000000000'},
        {label:'Nombre completo',value:'Docente de prueba'},
        {label:'Género',value:'M'}, {label:'Sexo biológico',value:'Hombre'},
        {label:'Fecha de nacimiento',value:'1984-11-01'},
      ]},
      {block:'FORMACION',type:'diploma_maestria',label:'Maestría',dataSummary:'Maestría de prueba'},
    ]}/>);
    await screen.findByText('Identificación.pdf');
    fireEvent.click(screen.getByRole('button',{name:'Agregar documento'}));
    expect(screen.queryByLabelText('Soporte que vas a cargar')).toBeNull();
    expect(screen.queryByRole('option',{name:'Maestría'})).toBeNull();
    for (const value of ['CC · 1000000000', 'Docente de prueba', 'M', 'Hombre', '1984-11-01']) expect(screen.getByText(value)).toBeTruthy();
    expect(screen.getByText(/Cada punto se revisa por separado/)).toBeTruthy();
    expect(screen.queryByLabelText('Categoría documental')).toBeNull();
    expect(screen.getByLabelText('Cargar PDF')).toBeTruthy();
  });

  it('limpia el propósito y la descripción al cambiar de pestaña y clasifica automáticamente la nueva carga',async()=>{
    const options=[...props.evidenceOptions,{block:'FORMACION',type:'diploma_maestria',label:'Maestría',dataSummary:'Maestría de prueba'}, {block:'FORMACION',type:'diploma_pregrado',label:'Pregrado'}];
    const view=render(<RundDocumentManager {...props} activeBlock="IDENTIDAD" activeBlockLabel="Identidad" evidenceOptions={options}/>);
    await screen.findByText('Identificación.pdf');
    fireEvent.click(screen.getByRole('button',{name:'Agregar documento'}));
    fireEvent.change(screen.getByLabelText('Descripción del documento'),{target:{value:'Descripción anterior'}});
    view.rerender(<RundDocumentManager {...props} activeBlock="FORMACION" activeBlockLabel="Formación Académica" evidenceOptions={options}/>);
    expect((screen.getByLabelText('Soporte que vas a cargar') as HTMLSelectElement).value).toBe('');
    expect(screen.queryByLabelText('Descripción del documento')).toBeNull();
    expect(screen.queryByRole('option',{name:'Documento de identidad'})).toBeNull();
    fireEvent.change(screen.getByLabelText('Soporte que vas a cargar'),{target:{value:'diploma_maestria'}});
    expect((screen.getByLabelText('Descripción del documento') as HTMLInputElement).value).toBe('');
    fireEvent.change(screen.getByLabelText('Cargar PDF'),{target:{files:[new File(['%PDF-1.7'],'maestria.pdf',{type:'application/pdf'})]}});
    await waitFor(()=>expect(apiClient.upload).toHaveBeenCalled());
    const form=vi.mocked(apiClient.upload).mock.calls[0][1] as FormData;
    expect(form.get('categoria')).toBe('TITULOS');
    expect(form.get('bloque')).toBe('FORMACION');
    expect(form.get('tipoSoporte')).toBe('diploma_maestria');
    expect(form.get('descripcion')).toBe('');
  });

  it('explica que Contacto no exige soporte y mantiene los anexos como una carga independiente',async()=>{
    render(<RundDocumentManager {...props} activeBlock="CONTACTO" activeBlockLabel="Contacto"/>);
    await loaded();
    fireEvent.click(screen.getByRole('button',{name:'Agregar documento'}));
    expect(screen.getByText('Contacto no requiere documentos soporte')).toBeTruthy();
    expect(screen.queryByLabelText('Información que acredita')).toBeNull();
    expect(screen.queryByLabelText('Cargar PDF')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Anexo general',exact:true}));
    fireEvent.click(screen.getByText('Clasificación opcional'));
    fireEvent.change(screen.getByLabelText('Categoría documental'),{target:{value:'TITULOS'}});
    fireEvent.change(screen.getByLabelText('Cargar PDF'),{target:{files:[new File(['%PDF-1.7'],'anexo.pdf',{type:'application/pdf'})]}});
    await waitFor(()=>expect(apiClient.upload).toHaveBeenCalled());
    const form=vi.mocked(apiClient.upload).mock.calls[0][1] as FormData;
    expect(form.get('categoria')).toBe('TITULOS');
    expect(form.has('bloque')).toBe(false);
    expect(form.has('tipoSoporte')).toBe(false);
  });

  it('no ofrece soportes de una sección sin datos del docente',async()=>{
    render(<RundDocumentManager {...props} activeBlock="FORMACION" activeBlockLabel="Formación Académica" evidenceOptions={[]}/>);
    await screen.findByText('Maestría.pdf');
    fireEvent.click(screen.getByRole('button',{name:'Agregar documento'}));
    expect(screen.getByText('No hay datos disponibles para respaldar en esta sección')).toBeTruthy();
    expect(screen.queryByLabelText('Cargar PDF')).toBeNull();
    expect(apiClient.upload).not.toHaveBeenCalled();
  });

  it('adapta la selección al pasar entre uno, varios y ningún soporte sin conservar descripciones de otro documento', async () => {
    const pregrado = { block: 'FORMACION', type: 'diploma_pregrado', label: 'Pregrado', dataSummary: 'Administración' };
    const maestria = { block: 'FORMACION', type: 'diploma_maestria', label: 'Maestría', dataSummary: 'Gestión' };
    const view = render(<RundDocumentManager {...props} activeBlock="FORMACION" evidenceOptions={[pregrado]} />);
    await screen.findByText('Maestría.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar documento' }));
    expect(screen.queryByLabelText('Soporte que vas a cargar')).toBeNull();
    fireEvent.change(screen.getByLabelText('Descripción del documento'), { target: { value: 'Descripción de pregrado' } });
    view.rerender(<RundDocumentManager {...props} activeBlock="FORMACION" evidenceOptions={[pregrado, maestria]} />);
    expect((screen.getByLabelText('Soporte que vas a cargar') as HTMLSelectElement).value).toBe('');
    expect(screen.queryByLabelText('Cargar PDF')).toBeNull();
    fireEvent.change(screen.getByLabelText('Soporte que vas a cargar'), { target: { value: maestria.type } });
    expect((screen.getByLabelText('Descripción del documento') as HTMLInputElement).value).toBe('');
    fireEvent.change(screen.getByLabelText('Descripción del documento'), { target: { value: 'Descripción de maestría' } });
    view.rerender(<RundDocumentManager {...props} activeBlock="FORMACION" evidenceOptions={[pregrado]} />);
    expect(screen.queryByLabelText('Soporte que vas a cargar')).toBeNull();
    expect(screen.getByText('Dato del perfil: Administración')).toBeTruthy();
    expect((screen.getByLabelText('Descripción del documento') as HTMLInputElement).value).toBe('');
    fireEvent.change(screen.getByLabelText('Cargar PDF'), { target: { files: [new File(['%PDF-1.7'], 'pregrado.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalled());
    const form = vi.mocked(apiClient.upload).mock.calls[0][1] as FormData;
    expect(form.get('tipoSoporte')).toBe('diploma_pregrado');
    expect(form.get('descripcion')).toBe('');
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
    view.rerender(<RundDocumentManager {...props} activeBlock="FORMACION" evidenceOptions={[]} />);
    expect(screen.queryByLabelText('Soporte que vas a cargar')).toBeNull();
    expect(screen.queryByLabelText('Cargar PDF')).toBeNull();
  });
  it.each(['disabled', 'older-backend', 'unavailable'])('oculta la ampliación pendiente con %s y conserva el listado y las acciones previas', async mode => {
    const previous = vi.mocked(apiClient.get).getMockImplementation()!;
    vi.mocked(apiClient.get).mockImplementation(async url => {
      if (!url.endsWith('/configuracion')) return previous(url);
      if (mode === 'unavailable') throw new Error('404');
      return mode === 'disabled' ? { habilitado: false } : {};
    });
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Maestría.pdf');
    expect(screen.queryByRole('button', { name: 'Preparar expediente' })).toBeNull();
    expect(screen.queryByText(/TRD pendiente|Almacenamiento provisional|configuración documental/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Agregar documento' })).toBeTruthy();
    expect(row('Maestría.pdf').getByTitle('Descargar')).toBeTruthy();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('informa al administrador que el almacenamiento es provisional y la TRD está pendiente', async () => {
    const previous = vi.mocked(apiClient.get).getMockImplementation()!;
    vi.mocked(apiClient.get).mockImplementation(async url => url.endsWith('/configuracion')
      ? { data: { habilitado: true, proveedor: 'LOCAL', almacenamientoProvisional: true, escrituraConfigurada: true, trd: { estado: 'PENDIENTE_TRD' } } }
      : previous(url));
    render(<RundDocumentManager {...props} />);
    expect(await screen.findByText(/Almacenamiento provisional local/)).toBeTruthy();
    expect(screen.getByText(/TRD pendiente/)).toBeTruthy();
    expect(await screen.findByText('Maestría.pdf')).toBeTruthy();
  });
  it('prepara un expediente vacío solo por acción del administrador', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ preparado: true });
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Maestría.pdf');
    expect(apiClient.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Preparar expediente' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/pta/api/v1/pta/banco-docentes/docente-1/expediente', {}));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('conserva las evidencias administrativas consultables, sin reemplazo ni eliminación', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => url.endsWith('/categorias') ? [] : [{
      ...docs[0], soporteGestion: true, tipoSoporte: 'soporte_edicion_perfil',
    }]);
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    expect(row('Identificación.pdf').getByTitle('Visualizar')).toBeTruthy();
    expect(row('Identificación.pdf').queryByTitle('Reemplazar PDF')).toBeNull();
    expect(row('Identificación.pdf').queryByTitle('Eliminar')).toBeNull();
  });
  it('bloquea una selección anterior si el dato dejó de estar disponible', async () => {
    const view = render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar documento' }));
    expect(screen.getByLabelText('Cargar PDF')).toBeTruthy();
    view.rerender(<RundDocumentManager {...props} evidenceOptions={[]} />);
    expect(screen.queryByLabelText('Cargar PDF')).toBeNull();
    expect(screen.queryByLabelText('Información que acredita')).toBeNull();
    expect(screen.getByText('No hay datos disponibles para respaldar en esta sección')).toBeTruthy();
    expect(apiClient.upload).not.toHaveBeenCalled();
  });

  it('conserva consulta de soportes sin datos, pero oculta el reemplazo', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => url.endsWith('/categorias') ? [] : [{ ...docs[1], tipoSoporte: 'diploma_maestria' }]);
    render(<RundDocumentManager {...props} evidenceOptions={[]} />);
    await screen.findByText('Maestría.pdf');
    expect(row('Maestría.pdf').getByTitle('Visualizar')).toBeTruthy();
    expect(row('Maestría.pdf').queryByTitle('Reemplazar PDF')).toBeNull();
    expect(screen.queryByLabelText(/Reemplazar/)).toBeNull();
  });

  it('combina búsqueda sin tildes y categoría sin consultar de nuevo el servidor', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Maestría.pdf');
    const requests = vi.mocked(apiClient.get).mock.calls.length;
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'formacion' } });
    expect(screen.getByText('Maestría.pdf')).toBeTruthy();
    expect(screen.queryByText('Identificación.pdf')).toBeNull();
    fireEvent.change(screen.getByLabelText('Filtrar documentos por categoría'), { target: { value: 'IDENTIDAD' } });
    expect(screen.getByText(/No hay documentos que coincidan/)).toBeTruthy();
    expect(apiClient.get).toHaveBeenCalledTimes(requests);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    expect(screen.getByText('Identificación.pdf')).toBeTruthy();
    expect(screen.queryByText('Maestría.pdf')).toBeNull();
  });

  it('ofrece solo categorías con archivos y sus cantidades, incluso si una categoría ya no está en el catálogo', async () => {
    const previous = vi.mocked(apiClient.get).getMockImplementation()!;
    vi.mocked(apiClient.get).mockImplementation(async url => url.includes('/documentos?')
      ? [...docs, { ...docs[1], id: 'legacy', categoria: 'LEGACY', categoriaNombre: 'Categoría anterior', nombreArchivo: 'Anterior.pdf' }]
      : previous(url));
    render(<RundDocumentManager {...props} />);
    const filter = await screen.findByLabelText('Filtrar documentos por categoría');
    expect(within(filter).getAllByRole('option').map(option => option.textContent)).toEqual([
      'Todas las categorías (4)', 'Categoría anterior (1)', 'Identidad (2)', 'Títulos (1)',
    ]);
    fireEvent.change(filter, { target: { value: 'LEGACY' } });
    expect(screen.getByText('Anterior.pdf')).toBeTruthy();
    expect(screen.queryByText('Maestría.pdf')).toBeNull();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sin coincidencias' } });
    expect(screen.getByText(/No hay documentos que coincidan/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull();
  });

  it('oculta búsqueda y categorías sin documentos, pero permite recuperar el historial', async () => {
    const previous = vi.mocked(apiClient.get).getMockImplementation()!;
    vi.mocked(apiClient.get).mockImplementation(async url => url.includes('/documentos?')
      ? url.endsWith('historial=true') ? [old] : [] : previous(url));
    render(<RundDocumentManager {...props} />);
    await screen.findByText(/Este perfil no tiene documentos vigentes/);
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByLabelText('Filtrar documentos por categoría')).toBeNull();
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    await screen.findByText('Identificación anterior.pdf');
    expect(screen.getByRole('searchbox')).toBeTruthy();
    expect(screen.queryByLabelText('Filtrar documentos por categoría')).toBeNull();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'anterior' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ver vigentes' }));
    await screen.findByText(/Este perfil no tiene documentos vigentes/);
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull();
  });

  it('descarta una categoría que solo existe en el historial al volver a los archivos vigentes', async () => {
    const previous = vi.mocked(apiClient.get).getMockImplementation()!;
    vi.mocked(apiClient.get).mockImplementation(async url => url.includes('/documentos?')
      ? url.endsWith('historial=true') ? [docs[1], old] : [docs[1]] : previous(url));
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Maestría.pdf');
    expect(screen.queryByLabelText('Filtrar documentos por categoría')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    const filter = await screen.findByLabelText('Filtrar documentos por categoría');
    fireEvent.change(filter, { target: { value: 'IDENTIDAD' } });
    expect(screen.queryByText('Maestría.pdf')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver vigentes' }));
    await screen.findByText('Maestría.pdf');
    expect(screen.queryByLabelText('Filtrar documentos por categoría')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull();
  });

  it('conserva la última vista solicitada al alternar rápidamente el historial', async () => {
    const previous = vi.mocked(apiClient.get).getMockImplementation()!;
    let finishHistory!: (value: typeof docs) => void;
    vi.mocked(apiClient.get).mockImplementation(async url => url.endsWith('historial=true')
      ? new Promise(resolve => { finishHistory = resolve; }) : previous(url));
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Maestría.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver vigentes' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Actualizar' }) as HTMLButtonElement).disabled).toBe(false));
    await act(async () => { finishHistory([...docs, old]); });
    expect(screen.queryByText('Identificación anterior.pdf')).toBeNull();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Historial' })).toBeTruthy();
  });

  it.each([
    ['IDENTIDAD', 'Identidad', 'documento_identidad', 'Documento de identidad', 'IDENTIDAD'],
    ['FORMACION', 'Formación Académica', 'diploma_maestria', 'Maestría', 'TITULOS'],
    ['VINCULACION', 'Vinculación', 'contrato', 'Acto administrativo', 'CONTRATOS'],
    ['VINCULACION', 'Vinculación', 'resolucion_escalafon', 'Categoría', 'RESOLUCIONES'],
    ['ACADEMICO', 'Académico', 'acto_asignacion_nucleo', 'Núcleo temático', 'RESOLUCIONES'],
    ['ACADEMICO', 'Académico', 'acta_evaluacion_desempeno', 'Última evaluación', 'CERTIFICADOS'],
    ['TRANSVERSAL', 'Transversal', 'autorizacion_habeas_data', 'Autorización de tratamiento de datos', 'AUTORIZACIONES'],
  ])('vincula el soporte correcto en %s: %s / %s', async (block, label, type, field, category) => {
    render(<RundDocumentManager {...props} activeBlock={block} activeBlockLabel={label} evidenceOptions={[
      { block, type, label: field, dataSummary: 'Dato registrado de prueba' },
      { block: 'OTRO_BLOQUE', type: 'otro_soporte', label: 'Campo ajeno' },
    ]} />);
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar documento' }));
    expect(screen.queryByText(/Sección seleccionada:/)).toBeNull();
    expect(screen.queryByRole('option', { name: 'Campo ajeno' })).toBeNull();
    expect(screen.queryByLabelText('Soporte que vas a cargar')).toBeNull();
    expect(screen.getByText('Dato del perfil: Dato registrado de prueba')).toBeTruthy();
    expect(screen.queryByLabelText('Categoría documental')).toBeNull();
    fireEvent.change(screen.getByLabelText('Cargar PDF'), { target: { files: [new File(['%PDF-1.7'], 'soporte.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalled());
    const form = vi.mocked(apiClient.upload).mock.calls[0][1] as FormData;
    expect([form.get('bloque'), form.get('tipoSoporte'), form.get('categoria')]).toEqual([block, type, category]);
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
  });

  it.each(['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'])('permite el anexo sencillo desde %s sin vincularlo a un punto de control', async block => {
    render(<RundDocumentManager {...props} activeBlock={block} />);
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar documento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anexo general', exact: true }));
    const classification = screen.getByText('Clasificación opcional').closest('details')!;
    expect(classification.open).toBe(false);
    expect((within(classification).getByLabelText('Categoría documental') as HTMLSelectElement).value).toBe('OTROS');
    fireEvent.change(screen.getByLabelText('Descripción del documento'), { target: { value: 'Archivo complementario' } });
    fireEvent.change(screen.getByLabelText('Cargar PDF'), { target: { files: [new File(['%PDF-1.7'], 'anexo.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalled());
    const form = vi.mocked(apiClient.upload).mock.calls[0][1] as FormData;
    expect(form.get('categoria')).toBe('OTROS');
    expect(form.get('descripcion')).toBe('Archivo complementario');
    expect(form.has('bloque')).toBe(false);
    expect(form.has('tipoSoporte')).toBe(false);
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
  });

  it('reinicia el anexo al cambiar de pestaña y no borra el formulario al pulsar su modo activo', async () => {
    const options = [...props.evidenceOptions, { block: 'FORMACION', type: 'diploma_maestria', label: 'Maestría' }];
    const view = render(<RundDocumentManager {...props} activeBlock="IDENTIDAD" evidenceOptions={options} />);
    await screen.findByText('Identificación.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar documento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anexo general', exact: true }));
    fireEvent.click(screen.getByText('Clasificación opcional'));
    fireEvent.change(screen.getByLabelText('Categoría documental'), { target: { value: 'TITULOS' } });
    fireEvent.change(screen.getByLabelText('Descripción del documento'), { target: { value: 'Descripción anterior' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anexo general', exact: true }));
    expect((screen.getByLabelText('Descripción del documento') as HTMLInputElement).value).toBe('Descripción anterior');
    view.rerender(<RundDocumentManager {...props} activeBlock="FORMACION" evidenceOptions={options} />);
    expect((screen.getByLabelText('Descripción del documento') as HTMLInputElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Anexo general', exact: true }));
    expect((screen.getByLabelText('Descripción del documento') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Categoría documental') as HTMLSelectElement).value).toBe('OTROS');
    expect(screen.getByText('Clasificación opcional').closest('details')!.open).toBe(false);
  });

  it('permite contraer y volver a abrir sin perder archivos ni hacer escrituras', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Contraer documentos' }));
    expect(screen.queryByRole('region', { name: 'Lista de documentos del perfil' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir documentos' }));
    expect(screen.getByText('Identificación.pdf')).toBeTruthy();
    expect(apiClient.upload).not.toHaveBeenCalled();
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('conserva la visualización y las restricciones del contenido original', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    fireEvent.click(row('Identificación.pdf').getByTitle('Visualizar'));
    expect(props.onView).toHaveBeenCalledWith('/identity', 'Identificación.pdf', 'Identidad');
    expect(row('Restringido.pdf').queryByTitle('Visualizar')).toBeNull();
    expect(row('Restringido.pdf').queryByTitle('Descargar')).toBeNull();
  });

  it('abre la carga y conserva el archivo, categoría y punto de control enviados', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    expect(screen.queryByLabelText('Categoría documental')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar documento' }));
    expect(screen.queryByLabelText('Soporte que vas a cargar')).toBeNull();
    fireEvent.change(screen.getByLabelText('Descripción del documento'), { target: { value: 'Nueva identificación' } });
    const file = new File(['%PDF-1.7'], 'nuevo.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Cargar PDF'), { target: { files: [file] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalled());
    const [url, form] = vi.mocked(apiClient.upload).mock.calls[0];
    expect(url).toBe('/pta/api/v1/pta/banco-docentes/docente-1/documentos');
    expect((form as FormData).get('file')).toBe(file);
    expect((form as FormData).get('categoria')).toBe('IDENTIDAD');
    expect((form as FormData).get('tipoSoporte')).toBe('documento_identidad');
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
  });

  it('descarga el archivo seleccionado y libera la URL temporal', async () => {
    const blob = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
    vi.mocked(apiClient.getBlob).mockResolvedValue(blob);
    const createObjectURL = vi.fn().mockReturnValue('blob:documento-prueba');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', class extends URL { static createObjectURL = createObjectURL; static revokeObjectURL = revokeObjectURL; });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('Maestr\u00eda.pdf');
    });
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Maestr\u00eda.pdf');
    fireEvent.click(row('Maestr\u00eda.pdf').getByTitle('Descargar'));
    await waitFor(() => expect(apiClient.getBlob).toHaveBeenCalledWith('/degree?download=true'));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:documento-prueba');
  });

  it('abre directamente la carga incluso si el panel se contrajo con ella abierta', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificaci\u00f3n.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar documento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Contraer documentos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar documento' }));
    expect(screen.queryByLabelText('Soporte que vas a cargar')).toBeNull();
    expect(screen.getByLabelText('Cargar PDF')).toBeTruthy();
    expect(screen.queryByLabelText('Categoría documental')).toBeNull();
  });

  it('conserva reemplazos y confirmación de eliminación sobre el archivo seleccionado', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    const input = row('Identificación.pdf').getByTitle(/Reemplazar/).querySelector('input')!;
    fireEvent.change(input, { target: { files: [new File(['%PDF-1.7'], 'v3.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalledWith(expect.stringContaining('/identity/reemplazo'), expect.any(FormData)));
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
    const confirm = vi.spyOn(window, 'confirm');
    fireEvent.click(row('Maestría.pdf').getByTitle('Eliminar'));
    let dialog = await screen.findByRole('alertdialog', { name: 'Eliminar documento' });
    expect(within(dialog).getByText('Maestría.pdf')).toBeTruthy();
    expect(apiClient.delete).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(apiClient.delete).not.toHaveBeenCalled();
    fireEvent.click(row('Maestría.pdf').getByTitle('Eliminar'));
    dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar documento' }));
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/pta/api/v1/pta/banco-docentes/docente-1/documentos/degree'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(confirm).not.toHaveBeenCalled();
  });

  it('permite cancelar con Escape y devuelve el foco al botón del archivo', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Maestría.pdf');
    const trigger = row('Maestría.pdf').getByTitle('Eliminar');
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('alertdialog');
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancelar' })));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('mantiene el diálogo durante la eliminación e impide solicitudes duplicadas', async () => {
    let finishDelete!: (value: any) => void;
    vi.mocked(apiClient.delete).mockImplementation(() => new Promise(resolve => { finishDelete = resolve; }));
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Maestría.pdf');
    fireEvent.click(row('Maestría.pdf').getByTitle('Eliminar'));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar documento' }));
    const deleting = within(dialog).getByRole('button', { name: 'Eliminando…' }) as HTMLButtonElement;
    expect(deleting.disabled).toBe(true);
    expect((within(dialog).getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(deleting);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(apiClient.delete).toHaveBeenCalledTimes(1);
    await act(async () => { finishDelete({ success: true }); });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(apiClient.delete).toHaveBeenCalledTimes(1);
  });

  it('conserva el archivo y ofrece reintentar dentro del diálogo si falla la eliminación', async () => {
    vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('No fue posible eliminar el documento. Puedes reintentar.'));
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Maestría.pdf');
    fireEvent.click(row('Maestría.pdf').getByTitle('Eliminar'));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar documento' }));
    expect(await within(dialog).findByRole('alert')).toBeTruthy();
    expect(row('Maestría.pdf').getByTitle('Visualizar')).toBeTruthy();
    expect(props.onChanged).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar documento' }));
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
  });

  it('descarta la confirmación al cambiar de docente o perder el permiso de gestión', async () => {
    const view = render(<RundDocumentManager {...props} />);
    await screen.findByText('Maestría.pdf');
    fireEvent.click(row('Maestría.pdf').getByTitle('Eliminar'));
    await screen.findByRole('alertdialog');
    view.rerender(<RundDocumentManager {...props} docenteId="docente-2" />);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await screen.findByText('Maestría.pdf');
    fireEvent.click(row('Maestría.pdf').getByTitle('Eliminar'));
    await screen.findByRole('alertdialog');
    view.rerender(<RundDocumentManager {...props} docenteId="docente-2" canManage={false} />);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('consulta versiones anteriores y mantiene inactivas sus acciones de modificación', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    await screen.findByText('Identificación anterior.pdf');
    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('historial=true'));
    expect(row('Identificación anterior.pdf').queryByTitle('Eliminar')).toBeNull();
    expect(row('Identificación anterior.pdf').queryByTitle(/Reemplazar/)).toBeNull();
    fireEvent.click(row('Identificación anterior.pdf').getByTitle('Visualizar'));
    expect(props.onView).toHaveBeenCalledWith('/old', 'Identificación anterior.pdf', 'Identidad');
    fireEvent.click(screen.getByRole('button', { name: 'Ver vigentes' }));
    await waitFor(() => expect(screen.queryByText('Identificación anterior.pdf')).toBeNull());
  });

  it('mantiene el acceso de solo consulta', async () => {
    render(<RundDocumentManager {...props} canManage={false} />);
    await screen.findByText('Identificación.pdf');
    expect(screen.queryByRole('button', { name: 'Agregar documento' })).toBeNull();
    expect(screen.queryAllByTitle('Eliminar')).toHaveLength(0);
    expect(screen.queryAllByTitle(/Reemplazar/)).toHaveLength(0);
    expect(row('Identificación.pdf').getByTitle('Descargar')).toBeTruthy();
  });
});

describe('Varias evidencias por punto de control', () => {
  const evidence = (id: string, name: string, soporteCreadoEn: string) => ({ ...docs[0], id, nombreArchivo: name, soporteCreadoEn, estadoRevision: 'Pendiente', version: 1, totalVersiones: 1 });
  const setDocuments = (files: any[]) => {
    const previous = vi.mocked(apiClient.get).getMockImplementation()!;
    vi.mocked(apiClient.get).mockImplementation(async url => url.includes('/documentos?') ? files : previous(url));
  };

  it('numera las evidencias vigentes de un punto por orden de incorporación', async () => {
    setDocuments([evidence('second', 'Cédula reverso.pdf', '2026-10-02T10:00:00Z'), evidence('first', 'Cédula anverso.pdf', '2026-10-01T10:00:00Z')]);
    render(<RundDocumentManager {...props} activeBlock="IDENTIDAD" activeBlockLabel="Identidad" />);
    await screen.findByText('Cédula anverso.pdf');
    expect(row('Cédula anverso.pdf').getByText(/Evidencia 1 de 2/)).toBeTruthy();
    expect(row('Cédula reverso.pdf').getByText(/Evidencia 2 de 2/)).toBeTruthy();
  });

  it('agrega un soporte existente como evidencia adicional y lo informa antes de cargar', async () => {
    setDocuments([evidence('first', 'Cédula anverso.pdf', '2026-10-01T10:00:00Z')]);
    render(<RundDocumentManager {...props} activeBlock="IDENTIDAD" activeBlockLabel="Identidad" />);
    await screen.findByText('Cédula anverso.pdf');
    fireEvent.click(screen.getByRole('button', { name: /Agregar documento/ }));
    expect(screen.getByText(/Este punto ya tiene 1 evidencia vigente\. El archivo se agregará como evidencia adicional/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Cargar PDF'), { target: { files: [new File(['%PDF-1.7'], 'reverso.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalledWith('/pta/api/v1/pta/banco-docentes/docente-1/documentos', expect.any(FormData)));
    const form = vi.mocked(apiClient.upload).mock.calls[0][1] as FormData;
    expect(form.get('tipoSoporte')).toBe('documento_identidad');
  });

  it('impide agregar más evidencias al llegar al máximo', async () => {
    setDocuments(Array.from({ length: 10 }, (_, index) => evidence(`e-${index}`, `Evidencia ${index}.pdf`, `2026-10-${String(index + 1).padStart(2, '0')}T10:00:00Z`)));
    render(<RundDocumentManager {...props} activeBlock="IDENTIDAD" activeBlockLabel="Identidad" />);
    await screen.findByText('Evidencia 0.pdf');
    fireEvent.click(screen.getByRole('button', { name: /Agregar documento/ }));
    expect(screen.getByText(/Este punto ya tiene 10 evidencias vigentes\. Reemplaza o elimina una/)).toBeTruthy();
    expect((screen.getByLabelText('Cargar PDF') as HTMLInputElement).disabled).toBe(true);
  });
});
