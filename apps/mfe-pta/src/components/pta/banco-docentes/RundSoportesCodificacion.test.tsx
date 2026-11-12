import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    expect(acciones.onUpload).toHaveBeenCalledWith(pdf, expect.objectContaining({ field: expect.objectContaining({ tipoSoporte: 'diploma_pregrado' }) }));
    expect(acciones.onUpload.mock.calls[0][2]).toBeUndefined();
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
    fireEvent.click(screen.getByRole('button', { name: /Agregar otro/ }));
    expect(acciones.onUpload).toHaveBeenCalledTimes(1);
    expect(acciones.onUpload.mock.calls[0][2]).toBeUndefined();
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

  it('sin dato registrado no se ofrece cargar y se explica por qué', () => {
    render(<RundSoportesCodificacion grupos={[grupo('diploma_doctorado', 'Doctorado', [], { canUpload: false })]} {...props()} />);
    expect(screen.queryByRole('button', { name: /Cargar/ })).toBeNull();
    expect(screen.getByText('Sin dato').getAttribute('title')).toContain('Registra primero el dato');
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

  it('sin soportes no muestra nada', () => {
    const { container } = render(<RundSoportesCodificacion grupos={[]} {...props()} />);
    expect(container.innerHTML).toBe('');
  });
});
