import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RundCargaMasivaSoportes } from './RundCargaMasivaSoportes';
import type { RundSupportGroup } from './RundSupportList';

const grupo = (tipoSoporte: string, campo: string, extra: Partial<RundSupportGroup> = {}): RundSupportGroup => {
  const field = { tipoSoporte, campo, documento: campo };
  return { field, fields: [field], uploadField: field, evidences: [], canUpload: true, canManage: true, ...extra };
};
const pdf = (nombre: string) => new File(['%PDF-1.7'], nombre, { type: 'application/pdf' });

afterEach(cleanup);

const abrir = (props: Partial<Parameters<typeof RundCargaMasivaSoportes>[0]> = {}) => {
  const onSubir = vi.fn().mockResolvedValue(null);
  const onTerminado = vi.fn();
  render(<RundCargaMasivaSoportes bloque="FORMACION" etiquetaCarpeta="01 Títulos de formación" onSubir={onSubir} onTerminado={onTerminado}
    grupos={[grupo('diploma_pregrado', 'Pregrado', { titulos: ['Administrador Público'] }), grupo('diploma_especializacion', 'Especialización', { titulos: [] })]} {...props} />);
  fireEvent.click(screen.getByRole('button', { name: /Carga masiva/ }));
  return { onSubir, onTerminado, dialogo: screen.getByRole('dialog') };
};
const elegir = (archivos: File[]) => fireEvent.change(screen.getByLabelText(/Documentos \(PDF/), { target: { files: archivos } });

describe('Carga masiva de soportes — botón y simulación', () => {
  it('abre el diálogo con la nomenclatura obligatoria de la carpeta y permite elegir varios archivos', () => {
    const { dialogo } = abrir();
    expect(within(dialogo).getByText(/Carga masiva · 01 Títulos de formación/)).toBeTruthy();
    expect(within(dialogo).getByText('1.1.1_PREGRADO_UNIVERSIDAD')).toBeTruthy();
    expect((screen.getByLabelText(/Documentos \(PDF/) as HTMLInputElement).multiple).toBe(true);
    expect((screen.getByRole('button', { name: /Cargar 0 archivos/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('en 08 y 09 avisa que la nomenclatura no es obligatoria', () => {
    abrir({ bloque: 'ESTUDIO_HOJA_VIDA', etiquetaCarpeta: '08 Estudio hoja de vida', grupos: [grupo('estudio_hoja_vida', 'Estudio')] });
    expect(screen.getByText(/la nomenclatura no es obligatoria/)).toBeTruthy();
  });

  it('muestra la simulación sin subir nada: válidos, rechazados con su motivo y el título que se creará', () => {
    const { onSubir } = abrir();
    elegir([pdf('1.1.1_PREGRADO_UNAL.pdf'), pdf('1.2.1_ESPECIALIZACION_SURCOLOMBIANA.pdf'), pdf('mal nombre.pdf')]);
    expect(screen.getByRole('status').textContent).toContain('3 archivos: 2 se cargarán, 1 rechazado, 0 advertencias.');
    const filaTitulo = screen.getByRole('row', { name: /1\.1\.1_PREGRADO_UNAL/ });
    expect(filaTitulo.textContent).toContain('Título: Administrador Público');
    expect(screen.getByRole('row', { name: /1\.2\.1_ESPECIALIZACION_SURCOLOMBIANA/ }).textContent).toContain('Se registrará el título «Especialización (Surcolombiana)»');
    expect(screen.getByRole('row', { name: /mal nombre/ }).textContent).toContain('Rechazado: No cumple la nomenclatura de 01');
    expect(onSubir).not.toHaveBeenCalled();
  });

  it('rechaza una selección de más de 300 archivos', () => {
    abrir();
    elegir(Array.from({ length: 301 }, (_, i) => pdf(`2002_${i}_ESAP.pdf`)));
    expect(screen.getByRole('alert').textContent).toContain('máximo 300');
  });
});

describe('Carga masiva de soportes — carga', () => {
  it('sube en orden, manda título y descripción, y refresca una sola vez al terminar', async () => {
    const { onSubir, onTerminado } = abrir();
    elegir([pdf('1.2.1_ESPECIALIZACION_SURCOLOMBIANA.pdf'), pdf('1.1.1_PREGRADO_UNAL.pdf')]);
    fireEvent.click(screen.getByRole('button', { name: /Cargar 2 archivos/ }));
    await waitFor(() => expect(onTerminado).toHaveBeenCalledTimes(1));
    expect(onSubir.mock.calls.map(([file]) => file.name)).toEqual(['1.1.1_PREGRADO_UNAL.pdf', '1.2.1_ESPECIALIZACION_SURCOLOMBIANA.pdf']);
    expect(onSubir.mock.calls[0][2]).toEqual({ titulo: undefined, descripcion: 'Carga masiva · 1.1.1_PREGRADO_UNAL.pdf · Unal' });
    expect(onSubir.mock.calls[1][2].titulo).toBe('Especialización (Surcolombiana)');
    expect(screen.getByRole('status').textContent).toContain('Resultado: 2 cargados');
    expect(screen.getAllByText('Cargado')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeTruthy();
  });

  it('un error en un archivo no detiene los demás y se informa con su motivo', async () => {
    const { onSubir, onTerminado } = abrir({ bloque: 'EXPERIENCIA_DOCENTE', etiquetaCarpeta: '02 Experiencia docente', grupos: [grupo('experiencia_docente', 'Experiencia docente')] });
    onSubir.mockImplementation(async (file: File) => (file.name.startsWith('2002') ? 'El servidor rechazó el archivo.' : null));
    elegir([pdf('2002_1_ESAP.pdf'), pdf('2005_2_ESAP.pdf')]);
    fireEvent.click(screen.getByRole('button', { name: /Cargar 2 archivos/ }));
    await waitFor(() => expect(onTerminado).toHaveBeenCalled());
    expect(onSubir).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('row', { name: /2002_1_ESAP/ }).textContent).toContain('Error: El servidor rechazó el archivo.');
    expect(screen.getByRole('row', { name: /2005_2_ESAP/ }).textContent).toContain('Cargado');
    expect(screen.getByRole('status').textContent).toContain('Resultado: 1 cargado, 1 con error');
  });

  it('si falla el título 1.x.1 no carga el 1.x.2 del mismo nivel (quedaría con el título equivocado)', async () => {
    const { onSubir, onTerminado } = abrir();
    onSubir.mockImplementation(async (file: File) => (file.name.startsWith('1.1.1') ? 'Fallo' : null));
    elegir([pdf('1.1.1_PREGRADO_UNAL.pdf'), pdf('1.1.2_PREGRADO_ADICIONAL_UNAL.pdf')]);
    fireEvent.click(screen.getByRole('button', { name: /Cargar 2 archivos/ }));
    await waitFor(() => expect(onTerminado).toHaveBeenCalled());
    expect(onSubir).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('row', { name: /1\.1\.2_PREGRADO_ADICIONAL_UNAL/ }).textContent).toContain('falló el documento anterior');
  });

  it('si onSubir lanza una excepción el archivo queda con error y el lote continúa', async () => {
    const { onSubir, onTerminado } = abrir({ bloque: 'EXPERIENCIA_DOCENTE', etiquetaCarpeta: '02', grupos: [grupo('experiencia_docente', 'Experiencia docente')] });
    onSubir.mockImplementation(async (file: File) => { if (file.name.startsWith('2002')) throw new Error('Red caída'); return null; });
    elegir([pdf('2002_1_ESAP.pdf'), pdf('2005_2_ESAP.pdf')]);
    fireEvent.click(screen.getByRole('button', { name: /Cargar 2 archivos/ }));
    await waitFor(() => expect(onTerminado).toHaveBeenCalled());
    expect(screen.getByRole('row', { name: /2002_1_ESAP/ }).textContent).toContain('Error: Red caída');
    expect(screen.getByRole('row', { name: /2005_2_ESAP/ }).textContent).toContain('Cargado');
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeTruthy();
  });

  it('al terminar conserva el resultado de lo cargado aunque la vista refrescada ya tenga esos archivos', async () => {
    const { onTerminado } = abrir({ bloque: 'EXPERIENCIA_DOCENTE', etiquetaCarpeta: '02 Experiencia docente', grupos: [grupo('experiencia_docente', 'Experiencia docente')] });
    elegir([pdf('2003_1_ESAP.pdf')]);
    fireEvent.click(screen.getByRole('button', { name: /Cargar 1 archivo/ }));
    await waitFor(() => expect(onTerminado).toHaveBeenCalled());
    expect(screen.getByRole('status').textContent).toContain('1 se cargará');
    expect(screen.getByRole('status').textContent).toContain('Resultado: 1 cargado');
  });

  it('Esc y Cancelar cierran el diálogo sin cargar', () => {
    const { onSubir } = abrir();
    elegir([pdf('1.1.1_PREGRADO_UNAL.pdf')]);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onSubir).not.toHaveBeenCalled();
  });

  it('con el botón deshabilitado no abre el diálogo', () => {
    render(<RundCargaMasivaSoportes bloque="FORMACION" etiquetaCarpeta="01" grupos={[]} disabled onSubir={vi.fn()} onTerminado={vi.fn()} />);
    expect((screen.getByRole('button', { name: /Carga masiva/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
