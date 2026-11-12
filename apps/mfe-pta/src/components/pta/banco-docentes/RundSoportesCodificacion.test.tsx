import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RundSoportesCodificacion } from './RundSoportesCodificacion';
import type { RundSupportGroup } from './RundSupportList';

const grupo = (tipoSoporte: string, campo: string, evidences: any[] = [], extra: Partial<RundSupportGroup> = {}): RundSupportGroup => {
  const field = { tipoSoporte, campo, documento: campo };
  return { field, fields: [field], uploadField: field, evidences, canUpload: true, canManage: true, ...extra };
};
const evidencia = (id: string, estado = 'Pendiente') => ({ id, estado, nombre_archivo: `${id}.pdf`, documento_perfil_id: `doc-${id}` });
const pdf = new File(['%PDF-1.7'], 'titulo.pdf', { type: 'application/pdf' });

let clic: ReturnType<typeof vi.spyOn>;
let seleccionado: File | undefined;
beforeEach(() => {
  seleccionado = pdf;
  // Simula el selector de archivos: al abrirse entrega el PDF elegido.
  clic = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
    Object.defineProperty(this, 'files', { value: seleccionado ? [seleccionado] : [], configurable: true });
    this.onchange?.(new Event('change') as any);
  });
});
afterEach(() => { cleanup(); clic.mockRestore(); });

const props = () => ({ onUpload: vi.fn(), onView: vi.fn(), onDelete: vi.fn() });

describe('Soportes documentales según codificación', () => {
  it('muestra código, soporte, nomenclatura, archivo, estado y acción de cada fila', () => {
    render(<RundSoportesCodificacion grupos={[grupo('diploma_maestria', 'Maestría', [evidencia('a', 'Aprobado')])]} {...props()} />);
    for (const encabezado of ['Código', 'Soporte', 'Nomenclatura', 'Archivo', 'Estado', 'Acción']) expect(screen.getByRole('columnheader', { name: encabezado })).toBeTruthy();
    const fila = screen.getByRole('row', { name: /1\.3\.1/ });
    expect(fila.textContent).toContain('Maestría');
    expect(fila.textContent).toContain('1.3.1_MAGISTER_UNIVERSIDAD');
    expect(fila.textContent).toContain('a.pdf');
    expect(fila.textContent).toContain('Aprobado');
  });

  it('un soporte sin archivo muestra «Sin archivo», «Sin cargar» y la acción Cargar', () => {
    const acciones = props();
    render(<RundSoportesCodificacion grupos={[grupo('diploma_pregrado', 'Pregrado')]} {...acciones} />);
    const fila = screen.getByRole('row', { name: /1\.1\.1/ });
    expect(fila.textContent).toContain('Sin archivo');
    expect(fila.textContent).toContain('Sin cargar');
    expect(screen.queryByRole('button', { name: /^Ver / })).toBeNull();
    expect(screen.queryByRole('button', { name: /Agregar otro/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Cargar Pregrado 1\.1\.1/ }));
    // Sin título registrado se abre el formulario en lugar del selector de archivos.
    expect(screen.getByRole('dialog', { name: /Cargar pregrado/ })).toBeTruthy();
    expect(acciones.onUpload).not.toHaveBeenCalled();
  });

  it('un diploma con título registrado carga directo, sin pedir el título otra vez', () => {
    const acciones = props();
    render(<RundSoportesCodificacion grupos={[grupo('diploma_pregrado', 'Pregrado', [], { titulos: ['Administración Pública'] })]} {...acciones} />);
    expect(screen.getByText('Administración Pública')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Cargar Pregrado 1\.1\.1/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(acciones.onUpload).toHaveBeenCalledWith(pdf, expect.anything());
    expect(acciones.onUpload.mock.calls[0][2]).toBeUndefined();
    expect(acciones.onUpload.mock.calls[0][3]).toBeUndefined();
  });

  it('un soporte con archivo ofrece Ver en lugar de Cargar', () => {
    const acciones = props();
    const evidencias = [evidencia('a')];
    render(<RundSoportesCodificacion grupos={[grupo('diploma_maestria', 'Maestría', evidencias)]} {...acciones} />);
    expect(screen.queryByRole('button', { name: /^Cargar / })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Ver Maestría 1\.3\.1/ }));
    expect(acciones.onView).toHaveBeenCalledWith(evidencias[0], expect.anything(), 1);
  });

  it('«Agregar otro» sube un archivo nuevo como siguiente título del mismo nivel, sin reemplazar el anterior', () => {
    const acciones = props();
    render(<RundSoportesCodificacion grupos={[grupo('diploma_maestria', 'Maestría', [evidencia('a'), evidencia('b')])]} {...acciones} />);
    expect(screen.getAllByRole('row').filter(fila => /1\.3\.\d/.test(fila.textContent || ''))).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /Agregar otro/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Agregar otro maestría' }).textContent).toContain('Agregar otro maestría');
    fireEvent.click(screen.getByRole('button', { name: /Agregar otro/ }));
    // Para un título nuevo se pide el título y el PDF juntos.
    expect(screen.getByRole('dialog', { name: /Cargar maestría/ })).toBeTruthy();
    expect(acciones.onUpload).not.toHaveBeenCalled();
  });

  it('el formulario exige título y PDF, y los envía juntos', () => {
    const acciones = props();
    render(<RundSoportesCodificacion grupos={[grupo('diploma_especializacion', 'Especialización', [], { canUpload: false, titulos: [] })]} {...acciones} />);
    fireEvent.click(screen.getByRole('button', { name: /Cargar Especialización/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cargar documento' }));
    expect(screen.getByRole('alert').textContent).toContain('Escriba el título de especialización');
    fireEvent.change(screen.getByLabelText(/Título de especialización/), { target: { value: '  Especialización en Gerencia  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar documento' }));
    expect(screen.getByRole('alert').textContent).toContain('Seleccione el documento en PDF');
    fireEvent.change(screen.getByLabelText(/Documento \(PDF/), { target: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar documento' }));
    expect(screen.getByRole('alert').textContent).toContain('PDF válido');
    fireEvent.change(screen.getByLabelText(/Documento \(PDF/), { target: { files: [pdf] } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar documento' }));
    expect(acciones.onUpload).toHaveBeenCalledWith(pdf, expect.objectContaining({ field: expect.objectContaining({ tipoSoporte: 'diploma_especializacion' }) }), undefined, 'Especialización en Gerencia');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cancelar el formulario no carga nada', () => {
    const acciones = props();
    render(<RundSoportesCodificacion grupos={[grupo('diploma_doctorado', 'Doctorado', [], { titulos: [] })]} {...acciones} />);
    fireEvent.click(screen.getByRole('button', { name: /Cargar Doctorado/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(acciones.onUpload).not.toHaveBeenCalled();
  });

  it('«Agregar otro» de un soporte sin título (bachiller) sigue abriendo el selector de archivos', () => {
    const acciones = props();
    render(<RundSoportesCodificacion grupos={[grupo('diploma_bachiller', 'Bachiller', [evidencia('a')])]} {...acciones} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar otro bachiller' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(acciones.onUpload).toHaveBeenCalledTimes(1);
  });

  it('editar reemplaza el archivo de esa fila', () => {
    const acciones = props();
    const evidencias = [evidencia('a'), evidencia('b')];
    render(<RundSoportesCodificacion grupos={[grupo('diploma_maestria', 'Maestría', evidencias)]} {...acciones} />);
    fireEvent.click(screen.getByRole('button', { name: /Reemplazar Maestría adicional 1\.3\.2/ }));
    expect(acciones.onUpload).toHaveBeenCalledWith(pdf, expect.anything(), evidencias[1]);
  });

  it('eliminar pide borrar el archivo de esa fila', () => {
    const acciones = props();
    const evidencias = [evidencia('a'), evidencia('b')];
    render(<RundSoportesCodificacion grupos={[grupo('diploma_maestria', 'Maestría', evidencias)]} {...acciones} />);
    fireEvent.click(screen.getByRole('button', { name: /Eliminar Maestría 1\.3\.1/ }));
    expect(acciones.onDelete).toHaveBeenCalledWith(evidencias[0], expect.anything());
  });

  it('un diploma de nivel sin dato registrado ya no queda bloqueado: ofrece Cargar', () => {
    render(<RundSoportesCodificacion grupos={[grupo('diploma_doctorado', 'Doctorado', [], { canUpload: false, titulos: [] })]} {...props()} />);
    expect(screen.getByRole('button', { name: /Cargar Doctorado/ })).toBeTruthy();
    expect(screen.queryByText('Sin dato')).toBeNull();
  });

  it('un soporte que no es título y no tiene dato sigue explicando por qué no se puede cargar', () => {
    render(<RundSoportesCodificacion grupos={[grupo('resolucion_escalafon', 'Categoría', [], { canUpload: false })]} {...props()} />);
    expect(screen.queryByRole('button', { name: /Cargar/ })).toBeNull();
    expect(screen.getByText('Sin dato').getAttribute('title')).toContain('Registra primero el dato');
  });

  it('cada título registrado aparece como fila, también los adicionales sin archivo', () => {
    const titulos = Array.from({ length: 12 }, (_, i) => `Pregrado ${i + 1}`);
    render(<RundSoportesCodificacion grupos={[grupo('diploma_pregrado', 'Pregrado', [evidencia('a')], { titulos })]} {...props()} />);
    for (const titulo of titulos) expect(screen.getByText(titulo)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Cargar / })).toHaveLength(11);
    expect(screen.queryByRole('button', { name: /Agregar otro/ })).toBeNull();
  });

  it('en solo consulta se puede ver el archivo pero no cargar, editar, agregar ni eliminar', () => {
    render(<RundSoportesCodificacion grupos={[grupo('diploma_maestria', 'Maestría', [evidencia('a')], { canManage: false })]} {...props()} />);
    expect(screen.getByRole('button', { name: /Ver Maestría/ })).toBeTruthy();
    for (const nombre of [/Reemplazar/, /Eliminar/, /Agregar otro/, /Cargar/]) expect(screen.queryByRole('button', { name: nombre })).toBeNull();
  });

  it('con acciones en curso se bloquean las cargas', () => {
    render(<RundSoportesCodificacion grupos={[grupo('diploma_pregrado', 'Pregrado')]} disabled {...props()} />);
    expect((screen.getByRole('button', { name: /Cargar Pregrado/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('no deja controles de archivo en la página', () => {
    const { container } = render(<RundSoportesCodificacion grupos={[grupo('diploma_pregrado', 'Pregrado')]} {...props()} />);
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(0);
  });

  describe('filas de título: editar el nombre y eliminar', () => {
    const conTitulos = (evidences: any[], titulos: string[], acciones: ReturnType<typeof props>, extra: Partial<RundSupportGroup> = {}) => {
      const onEditTitle = vi.fn().mockResolvedValue(true);
      const onDeleteTitle = vi.fn();
      render(<RundSoportesCodificacion grupos={[grupo('diploma_pregrado', 'Pregrado', evidences, { titulos, ...extra })]} {...acciones} onEditTitle={onEditTitle} onDeleteTitle={onDeleteTitle} />);
      return { onEditTitle, onDeleteTitle };
    };

    it('cada fila con título ofrece Ver, Editar título y Eliminar título (en lugar de reemplazar el archivo)', () => {
      const acciones = props();
      conTitulos([evidencia('a')], ['Economía'], acciones);
      expect(screen.getByRole('button', { name: /^Ver / })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Editar título Pregrado 1\.1\.1/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Eliminar título Pregrado 1\.1\.1/ })).toBeTruthy();
      expect(screen.queryByRole('button', { name: /Reemplazar/ })).toBeNull();
    });

    it('un título sin archivo ofrece Cargar, Editar y Eliminar', () => {
      conTitulos([], ['Economía'], props());
      expect(screen.getByRole('button', { name: /Cargar Pregrado 1\.1\.1/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Editar título/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Eliminar título/ })).toBeTruthy();
    });

    it('editar cambia el nombre del título sin tocar el archivo', async () => {
      const acciones = props();
      const { onEditTitle } = conTitulos([evidencia('a')], ['Economía'], acciones);
      fireEvent.click(screen.getByRole('button', { name: /Editar título/ }));
      const caja = screen.getByLabelText(/Título de pregrado/) as HTMLInputElement;
      expect(caja.value).toBe('Economía');
      fireEvent.change(caja, { target: { value: '  Ingeniería Industrial ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      await waitFor(() => expect(onEditTitle).toHaveBeenCalledWith(expect.objectContaining({ field: expect.objectContaining({ tipoSoporte: 'diploma_pregrado' }) }), 'Economía', 'Ingeniería Industrial'));
      expect(acciones.onUpload).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('editar con un PDF nuevo reemplaza ese archivo después de guardar el título', async () => {
      const acciones = props();
      const evidencias = [evidencia('a')];
      const { onEditTitle } = conTitulos(evidencias, ['Economía'], acciones);
      fireEvent.click(screen.getByRole('button', { name: /Editar título/ }));
      fireEvent.change(screen.getByLabelText(/Título de pregrado/), { target: { value: 'Economía y Finanzas' } });
      fireEvent.change(screen.getByLabelText(/Reemplazar documento/), { target: { files: [pdf] } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      await waitFor(() => expect(acciones.onUpload).toHaveBeenCalledWith(pdf, expect.anything(), evidencias[0]));
      expect(onEditTitle).toHaveBeenCalledTimes(1);
      expect(onEditTitle.mock.invocationCallOrder[0]).toBeLessThan(acciones.onUpload.mock.invocationCallOrder[0]);
    });

    it('sin cambios no llama al servicio; con título vacío o PDF inválido muestra el error y no guarda', async () => {
      const acciones = props();
      const { onEditTitle } = conTitulos([evidencia('a')], ['Economía'], acciones);
      fireEvent.click(screen.getByRole('button', { name: /Editar título/ }));
      fireEvent.change(screen.getByLabelText(/Título de pregrado/), { target: { value: '   ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      expect(screen.getByRole('alert').textContent).toContain('Escriba el título');
      fireEvent.change(screen.getByLabelText(/Título de pregrado/), { target: { value: 'Economía' } });
      fireEvent.change(screen.getByLabelText(/Reemplazar documento/), { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      expect(screen.getByRole('alert').textContent).toContain('PDF válido');
      expect(onEditTitle).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText(/Reemplazar documento/), { target: { files: [] } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(onEditTitle).not.toHaveBeenCalled();
      expect(acciones.onUpload).not.toHaveBeenCalled();
    });

    it('si el título no se pudo guardar no se sube el archivo', async () => {
      const acciones = props();
      const { onEditTitle } = conTitulos([evidencia('a')], ['Economía'], acciones);
      onEditTitle.mockResolvedValue(false);
      fireEvent.click(screen.getByRole('button', { name: /Editar título/ }));
      fireEvent.change(screen.getByLabelText(/Título de pregrado/), { target: { value: 'Otro' } });
      fireEvent.change(screen.getByLabelText(/Reemplazar documento/), { target: { files: [pdf] } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      await waitFor(() => expect(onEditTitle).toHaveBeenCalled());
      expect(acciones.onUpload).not.toHaveBeenCalled();
    });

    it('cancelar la edición no cambia nada', () => {
      const acciones = props();
      const { onEditTitle } = conTitulos([evidencia('a')], ['Economía'], acciones);
      fireEvent.click(screen.getByRole('button', { name: /Editar título/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(onEditTitle).not.toHaveBeenCalled();
    });

    it('eliminar entrega el título y su archivo para retirarlos juntos', () => {
      const acciones = props();
      const evidencias = [evidencia('a'), evidencia('b')];
      const { onDeleteTitle } = conTitulos(evidencias, ['Economía', 'Derecho'], acciones);
      fireEvent.click(screen.getByRole('button', { name: /Eliminar título Pregrado adicional 1\.1\.2/ }));
      expect(onDeleteTitle).toHaveBeenCalledWith(expect.anything(), 'Derecho', evidencias[1]);
    });

    it('eliminar un título sin archivo lo entrega sin evidencia', () => {
      const { onDeleteTitle } = conTitulos([], ['Economía'], props());
      fireEvent.click(screen.getByRole('button', { name: /Eliminar título/ }));
      expect(onDeleteTitle).toHaveBeenCalledWith(expect.anything(), 'Economía', undefined);
    });

    it('en solo consulta no hay Editar ni Eliminar, y sin los controladores se conserva el reemplazo de archivo', () => {
      const acciones = props();
      conTitulos([evidencia('a')], ['Economía'], acciones, { canManage: false });
      expect(screen.queryByRole('button', { name: /Editar título|Eliminar título/ })).toBeNull();
      cleanup();
      render(<RundSoportesCodificacion grupos={[grupo('diploma_pregrado', 'Pregrado', [evidencia('a')], { titulos: ['Economía'] })]} {...acciones} />);
      expect(screen.getByRole('button', { name: /Reemplazar Pregrado/ })).toBeTruthy();
    });
  });

  describe('cierre de los formularios con Esc y retorno del foco', () => {
    it('Esc cierra el formulario de cargar y el foco vuelve al botón que lo abrió', () => {
      const acciones = props();
      render(<RundSoportesCodificacion grupos={[grupo('diploma_doctorado', 'Doctorado', [], { titulos: [] })]} {...acciones} />);
      const abrir = screen.getByRole('button', { name: /Cargar Doctorado/ });
      abrir.focus();
      fireEvent.click(abrir);
      expect(screen.getByRole('dialog', { name: /Cargar doctorado/ })).toBeTruthy();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(abrir);
      expect(acciones.onUpload).not.toHaveBeenCalled();
    });

    it('Esc cierra el formulario de editar título sin guardar nada', () => {
      const acciones = props();
      const onEditTitle = vi.fn();
      render(<RundSoportesCodificacion grupos={[grupo('diploma_pregrado', 'Pregrado', [evidencia('a')], { titulos: ['Economía'] })]} {...acciones}
        onEditTitle={onEditTitle} onDeleteTitle={vi.fn()} />);
      const abrir = screen.getByRole('button', { name: /Editar título/ });
      abrir.focus();
      fireEvent.click(abrir);
      fireEvent.change(screen.getByLabelText(/Título de pregrado/), { target: { value: 'Otro' } });
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(onEditTitle).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(abrir);
    });

    it('otras teclas no cierran el formulario, y con una acción en curso Esc tampoco', () => {
      render(<RundSoportesCodificacion grupos={[grupo('diploma_doctorado', 'Doctorado', [], { titulos: [] })]} {...props()} />);
      fireEvent.click(screen.getByRole('button', { name: /Cargar Doctorado/ }));
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(screen.getByRole('dialog')).toBeTruthy();
      cleanup();
      const { rerender } = render(<RundSoportesCodificacion grupos={[grupo('diploma_doctorado', 'Doctorado', [], { titulos: [] })]} {...props()} />);
      fireEvent.click(screen.getByRole('button', { name: /Cargar Doctorado/ }));
      rerender(<RundSoportesCodificacion grupos={[grupo('diploma_doctorado', 'Doctorado', [], { titulos: [] })]} {...props()} disabled />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.getByRole('dialog')).toBeTruthy();
    });
  });

  it('sin soportes no muestra nada', () => {
    const { container } = render(<RundSoportesCodificacion grupos={[]} {...props()} />);
    expect(container.innerHTML).toBe('');
  });
});
