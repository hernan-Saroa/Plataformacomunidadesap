// @vitest-environment jsdom
// RUND-013 — línea "Datos de contacto" del cabezote, con edición por campo.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PerfilDocenteCabezote, type EdicionContactoCabezote } from './PerfilDocenteCabezote';
import { buildCabezotePerfilDocente } from '../../../utils/rundPerfilCabezote';
import { CONTACTO_ERRORES, validarContactoCabezote } from '../../../utils/rundContactoCabezote';

vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ id: null, url: null }) } }));

afterEach(cleanup);

const PERFIL = {
  docente_id: 'docente-1',
  nombre_completo: 'PEDRO NEL PAEZ PEREZ',
  vinculacion: 'Carrera1',
  categoria: 'Titular',
  territorial: 'SEDE_CENTRAL',
  estado: 'ACTIVO',
  id_rund: 'RUND-1016',
  periodo_carga: '2026-1',
  correo_institucional: 'pedrpaez@esap.edu.co',
  correo_personal: 'pedronelpaez@gmail.com',
  telefono: '3183918243 - 6452018',
  proteccion_datos: { acceso_completo: true },
};

const edicion = (guardar: EdicionContactoCabezote['guardar'], puedeEditar = true): EdicionContactoCabezote => ({ puedeEditar, guardar });
const tarjeta = (clave: string) => screen.getByTestId(`cabezote-contacto-${clave}`);

describe('RUND-013 — Datos de contacto en el cabezote', () => {
  it('CA-01/CA-02: muestra la línea con etiqueta, valor y origen, sin franja de validación ni contador', () => {
    const { container } = render(<PerfilDocenteCabezote docente={PERFIL} />);
    expect(screen.getByRole('group', { name: 'Datos de contacto' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Datos de contacto' })).toBeTruthy();
    expect(within(tarjeta('CORREO_INSTITUCIONAL')).getByText('pedrpaez@esap.edu.co')).toBeTruthy();
    expect(within(tarjeta('CORREO_INSTITUCIONAL')).getByText('Asignación institucional')).toBeTruthy();
    expect(within(tarjeta('CORREO_ALTERNATIVO')).getByText('pedronelpaez@gmail.com')).toBeTruthy();
    expect(within(tarjeta('CORREO_ALTERNATIVO')).getByText('Autodeclarado')).toBeTruthy();
    expect(within(tarjeta('TELEFONO')).getByText('3183918243 - 6452018')).toBeTruthy();
    expect(within(tarjeta('TELEFONO')).getByText('Autodeclarado')).toBeTruthy();
    expect(container.textContent).not.toMatch(/Pendiente de validar el dato|Validar dato|Devolver dato|datos validados/);
  });

  it('CA-01: el orden es Correo institucional, Correo personal y Teléfono', () => {
    render(<PerfilDocenteCabezote docente={PERFIL} />);
    const orden = screen.getByRole('group', { name: 'Datos de contacto' }).querySelectorAll('dt');
    expect(Array.from(orden).map(dt => dt.textContent)).toEqual(['Correo institucional', 'Correo personal', 'Teléfono']);
  });

  it('un contacto sin dato se muestra como "No registrado" y puede editarse para registrarlo', async () => {
    const guardar = vi.fn().mockResolvedValue({ ok: true });
    render(<PerfilDocenteCabezote docente={{ ...PERFIL, correo_personal: null }} edicionContacto={edicion(guardar)} />);
    expect(within(tarjeta('CORREO_ALTERNATIVO')).getByText('No registrado')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Editar correo personal' }));
    expect((screen.getByLabelText('Correo personal') as HTMLInputElement).value).toBe('');
  });

  it('CA-07/CA-08: sin permiso no hay botón de edición; con permiso, un botón por campo con su nombre', () => {
    const { unmount } = render(<PerfilDocenteCabezote docente={PERFIL} edicionContacto={edicion(vi.fn(), false)} />);
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
    unmount();
    render(<PerfilDocenteCabezote docente={PERFIL} edicionContacto={edicion(vi.fn())} />);
    expect(screen.getByRole('button', { name: 'Editar correo institucional' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Editar correo personal' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Editar teléfono' })).toBeTruthy();
  });

  it('CA-03: al pulsar editar solo ese campo pasa a ser editable con Guardar y Cancelar', () => {
    render(<PerfilDocenteCabezote docente={PERFIL} edicionContacto={edicion(vi.fn())} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar teléfono' }));
    const campo = screen.getByLabelText('Teléfono') as HTMLInputElement;
    expect(campo.value).toBe('3183918243 - 6452018');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('CA-04: Guardar envía el valor, y al confirmar cierra la edición', async () => {
    const guardar = vi.fn().mockResolvedValue({ ok: true });
    render(<PerfilDocenteCabezote docente={PERFIL} edicionContacto={edicion(guardar)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar correo personal' }));
    fireEvent.change(screen.getByLabelText('Correo personal'), { target: { value: '  nuevo@gmail.com ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(guardar).toHaveBeenCalledWith('CORREO_ALTERNATIVO', 'nuevo@gmail.com'));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull());
    expect(screen.getByRole('button', { name: 'Editar correo personal' })).toBeTruthy();
  });

  it('CA-05: Cancelar descarta lo escrito y vuelve a mostrar el valor anterior', () => {
    const guardar = vi.fn();
    render(<PerfilDocenteCabezote docente={PERFIL} edicionContacto={edicion(guardar)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar correo personal' }));
    fireEvent.change(screen.getByLabelText('Correo personal'), { target: { value: 'otro@gmail.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(guardar).not.toHaveBeenCalled();
    expect(within(tarjeta('CORREO_ALTERNATIVO')).getByText('pedronelpaez@gmail.com')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull();
  });

  it('CA-06: un formato inválido muestra el error y no llama al servidor', async () => {
    const guardar = vi.fn();
    render(<PerfilDocenteCabezote docente={PERFIL} edicionContacto={edicion(guardar)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar correo institucional' }));
    fireEvent.change(screen.getByLabelText('Correo institucional'), { target: { value: 'x@gmail.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect((await screen.findByRole('alert')).textContent).toBe(CONTACTO_ERRORES.institucional);
    expect(guardar).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy();
  });

  it('CA-06: si el servidor rechaza el dato, muestra su mensaje y conserva la edición', async () => {
    const guardar = vi.fn().mockResolvedValue({ ok: false, mensaje: 'Ya existe otra cuenta con ese correo institucional.' });
    render(<PerfilDocenteCabezote docente={PERFIL} edicionContacto={edicion(guardar)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar correo institucional' }));
    fireEvent.change(screen.getByLabelText('Correo institucional'), { target: { value: 'otro@esap.edu.co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Ya existe otra cuenta con ese correo institucional.');
    expect(screen.getByLabelText('Correo institucional')).toBeTruthy();
  });

  it('si guardar lanza una excepción, muestra un error y no deja la tarjeta bloqueada', async () => {
    const guardar = vi.fn().mockRejectedValue(new Error('red'));
    render(<PerfilDocenteCabezote docente={PERFIL} edicionContacto={edicion(guardar)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar teléfono' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect((await screen.findByRole('alert')).textContent).toBe('No fue posible guardar el dato de contacto.');
    expect((screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('Escape también cancela cuando el foco está en Guardar o en Cancelar', () => {
    const guardar = vi.fn();
    render(<PerfilDocenteCabezote docente={PERFIL} edicionContacto={edicion(guardar)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar correo personal' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Guardar' }), { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Editar teléfono' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Cancelar' }), { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
    expect(guardar).not.toHaveBeenCalled();
  });

  it('Enter guarda y Escape cancela', async () => {
    const guardar = vi.fn().mockResolvedValue({ ok: true });
    render(<PerfilDocenteCabezote docente={PERFIL} edicionContacto={edicion(guardar)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar teléfono' }));
    fireEvent.keyDown(screen.getByLabelText('Teléfono'), { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Editar teléfono' }));
    fireEvent.keyDown(screen.getByLabelText('Teléfono'), { key: 'Enter' });
    await waitFor(() => expect(guardar).toHaveBeenCalledWith('TELEFONO', '3183918243 - 6452018'));
  });
});

describe('RUND-013 — modelo de vista y validación', () => {
  it('el modelo expone los tres contactos con su origen', () => {
    const vista = buildCabezotePerfilDocente(PERFIL);
    expect(vista.contacto.map(c => [c.clave, c.valorActual, c.origen])).toEqual([
      ['CORREO_INSTITUCIONAL', 'pedrpaez@esap.edu.co', 'Asignación institucional'],
      ['CORREO_ALTERNATIVO', 'pedronelpaez@gmail.com', 'Autodeclarado'],
      ['TELEFONO', '3183918243 - 6452018', 'Autodeclarado'],
    ]);
  });

  it('valida correo institucional, personal y teléfono', () => {
    expect(validarContactoCabezote('CORREO_INSTITUCIONAL', 'a@esap.edu.co')).toBeNull();
    expect(validarContactoCabezote('CORREO_INSTITUCIONAL', '')).toBe(CONTACTO_ERRORES.institucionalVacio);
    expect(validarContactoCabezote('CORREO_INSTITUCIONAL', 'a@otro.com')).toBe(CONTACTO_ERRORES.institucional);
    expect(validarContactoCabezote('CORREO_ALTERNATIVO', '')).toBeNull();
    expect(validarContactoCabezote('CORREO_ALTERNATIVO', 'a@b.co')).toBeNull();
    expect(validarContactoCabezote('CORREO_ALTERNATIVO', 'a@b')).toBe(CONTACTO_ERRORES.personal);
    expect(validarContactoCabezote('TELEFONO', '3183918243 - 6452018')).toBeNull();
    expect(validarContactoCabezote('TELEFONO', '3183918243, 6452018')).toBeNull();
    expect(validarContactoCabezote('TELEFONO', '')).toBeNull();
    expect(validarContactoCabezote('TELEFONO', 'abc')).toBe(CONTACTO_ERRORES.telefono);
    expect(validarContactoCabezote('TELEFONO', '123')).toBe(CONTACTO_ERRORES.telefono);
  });
});
