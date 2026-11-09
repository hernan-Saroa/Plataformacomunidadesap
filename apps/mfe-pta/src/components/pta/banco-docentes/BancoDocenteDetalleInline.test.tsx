import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BancoDocenteDetalleInline } from './BancoDocenteDetalleInline';
import { getBancoDocenteCabezote, updateBancoDocenteContacto } from '../../../services/api/ptaApi';

let permisos: string[] = [];
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ isSuperUser: false, hasAnyPermission: (codes: string[]) => codes.some((code) => permisos.includes(code)) }),
}));
vi.mock('../../../services/api/ptaApi', () => ({ getBancoDocenteCabezote: vi.fn(), updateBancoDocenteContacto: vi.fn() }));
vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ id: null, url: null }) } }));
vi.mock('./RundValidationPanel', () => ({ RundValidationPanel: () => <div>Validación existente</div> }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); permisos = []; });

const fila = { id: 'docente-1', nombre_completo: 'NOMBRE DEL LISTADO', periodoCarga: '2026-2' };
const perfil = {
  nombre_completo: 'NOMBRE CONFIRMADO', tipo_vinculacion: 'Ocasional', categoria: 'Asociado',
  territorial: 'Antioquia', puntaje_salarial: 150, ultima_evaluacion: 'Excelente',
  periodo_carga: '2026-2', proteccion_datos: { acceso_completo: true },
};
const vista = (docente = fila, periodoCarga = '2026-2') => (
  <table><tbody><BancoDocenteDetalleInline docente={docente} periodoCarga={periodoCarga} /></tbody></table>
);

describe('Integración del cabezote en el detalle RUND', () => {
  it('consulta el periodo seleccionado y muestra los datos del servidor', async () => {
    vi.mocked(getBancoDocenteCabezote).mockResolvedValue({ success: true, data: perfil });
    render(vista());
    expect(screen.getByRole('status')).toBeTruthy();
    await screen.findByRole('heading', { name: 'NOMBRE CONFIRMADO' });
    expect(getBancoDocenteCabezote).toHaveBeenCalledWith('docente-1', '2026-2');
    expect(screen.getByText('Asociado')).toBeTruthy();
    expect(screen.queryByText('NOMBRE DEL LISTADO')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByTitle('Cerrar detalle')).toBeNull();
    expect(screen.getByText('Validación existente')).toBeTruthy();
  });

  it('descarta respuestas de otro periodo que terminan después de la consulta actual', async () => {
    let resolverAnterior!: (value: any) => void;
    vi.mocked(getBancoDocenteCabezote)
      .mockImplementationOnce(() => new Promise((resolve) => { resolverAnterior = resolve; }))
      .mockResolvedValueOnce({ success: true, data: perfil });
    const { rerender } = render(vista(fila, '2025-2'));
    rerender(vista(fila));
    await screen.findByRole('heading', { name: 'NOMBRE CONFIRMADO' });
    await act(async () => resolverAnterior({ success: true, data: { ...perfil, nombre_completo: 'PERFIL ANTERIOR' } }));
    expect(screen.queryByText('PERFIL ANTERIOR')).toBeNull();
    expect(screen.getByRole('heading', { name: 'NOMBRE CONFIRMADO' })).toBeTruthy();
  });

  it('muestra el fallo de consulta sin confundirlo con campos no registrados', async () => {
    vi.mocked(getBancoDocenteCabezote).mockResolvedValue({ success: false, data: null });
    render(vista());
    await screen.findByRole('alert');
    expect(screen.queryByText('No registrado')).toBeNull();
    expect(screen.getByText('Validación existente')).toBeTruthy();
  });

  it('vuelve a consultar cuando el listado se actualiza tras editar', async () => {
    vi.mocked(getBancoDocenteCabezote).mockResolvedValue({ success: true, data: perfil });
    const { rerender } = render(vista());
    await screen.findByRole('heading', { name: 'NOMBRE CONFIRMADO' });
    vi.mocked(getBancoDocenteCabezote).mockResolvedValue({ success: true, data: { ...perfil, categoria: 'Titular' } });
    rerender(vista({ ...fila }));
    await waitFor(() => expect(screen.getByText('Titular')).toBeTruthy());
    expect(getBancoDocenteCabezote).toHaveBeenCalledTimes(2);
  });

  describe('RUND-013 — responsive dentro de la tabla con scroll', () => {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    afterEach(() => {
      if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
      else delete (HTMLElement.prototype as any).clientWidth;
    });

    it('limita el detalle al ancho visible del contenedor con scroll y lo fija a su borde izquierdo', async () => {
      vi.mocked(getBancoDocenteCabezote).mockResolvedValue({ success: true, data: perfil });
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        get() { return (this as HTMLElement).style.overflowX === 'auto' ? 420 : 0; },
      });
      render(<div style={{ overflowX: 'auto' }}><table style={{ minWidth: 900 }}><tbody><BancoDocenteDetalleInline docente={fila} periodoCarga='2026-2' /></tbody></table></div>);
      await screen.findByRole('heading', { name: 'NOMBRE CONFIRMADO' });
      const contenido = screen.getByTestId('detalle-docente-contenido');
      await waitFor(() => expect(contenido.style.width).toBe('420px'));
      expect(contenido.style.position).toBe('sticky');
      expect(contenido.style.left).toBe('0px');
    });

    it('sin contenedor con scroll conserva el ancho natural', async () => {
      vi.mocked(getBancoDocenteCabezote).mockResolvedValue({ success: true, data: perfil });
      render(vista());
      await screen.findByRole('heading', { name: 'NOMBRE CONFIRMADO' });
      const contenido = screen.getByTestId('detalle-docente-contenido');
      expect(contenido.style.width).toBe('');
      expect(contenido.style.position).toBe('');
    });
  });

  describe('RUND-013 — edición de contacto desde el cabezote', () => {
    const conContacto = { ...perfil, correo_institucional: 'a@esap.edu.co', correo_personal: 'b@gmail.com', telefono: '3001234567' };

    it('sin permiso de modificación no muestra el botón de edición', async () => {
      vi.mocked(getBancoDocenteCabezote).mockResolvedValue({ success: true, data: conContacto });
      permisos = ['banco-docentes.rund.view'];
      render(vista());
      await screen.findByRole('heading', { name: 'NOMBRE CONFIRMADO' });
      expect(screen.getByText('a@esap.edu.co')).toBeTruthy();
      expect(screen.queryByRole('button', { name: /Editar (correo|teléfono)/ })).toBeNull();
    });

    it('con permiso guarda en el servidor con el periodo, actualiza la tarjeta y avisa al listado', async () => {
      vi.mocked(getBancoDocenteCabezote).mockResolvedValue({ success: true, data: conContacto });
      vi.mocked(updateBancoDocenteContacto).mockResolvedValue({ success: true, data: { campo: 'TELEFONO', valor: '3183918243 - 6452018', valor_anterior: '3001234567' } } as any);
      permisos = ['banco-docentes.rund.edit'];
      const onUpdated = vi.fn();
      render(<table><tbody><BancoDocenteDetalleInline docente={fila} periodoCarga='2026-2' onUpdated={onUpdated} /></tbody></table>);
      await screen.findByRole('heading', { name: 'NOMBRE CONFIRMADO' });
      fireEvent.click(screen.getByRole('button', { name: 'Editar teléfono' }));
      fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '3183918243 - 6452018' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
      await waitFor(() => expect(screen.getByText('3183918243 - 6452018')).toBeTruthy());
      expect(updateBancoDocenteContacto).toHaveBeenCalledWith('docente-1', { campo: 'TELEFONO', valor: '3183918243 - 6452018', periodoCarga: '2026-2' });
      expect(onUpdated).toHaveBeenCalledTimes(1);
    });

    it('si el servidor rechaza el dato conserva el valor anterior y muestra el mensaje', async () => {
      vi.mocked(getBancoDocenteCabezote).mockResolvedValue({ success: true, data: conContacto });
      vi.mocked(updateBancoDocenteContacto).mockResolvedValue({ success: false, data: null, message: 'Ya existe otra cuenta con ese correo institucional.' } as any);
      permisos = ['banco-docentes.rund.manage'];
      const onUpdated = vi.fn();
      render(<table><tbody><BancoDocenteDetalleInline docente={fila} periodoCarga='2026-2' onUpdated={onUpdated} /></tbody></table>);
      await screen.findByRole('heading', { name: 'NOMBRE CONFIRMADO' });
      fireEvent.click(screen.getByRole('button', { name: 'Editar correo institucional' }));
      fireEvent.change(screen.getByLabelText('Correo institucional'), { target: { value: 'otro@esap.edu.co' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
      expect((await screen.findByRole('alert')).textContent).toBe('Ya existe otra cuenta con ese correo institucional.');
      expect(onUpdated).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.getByText('a@esap.edu.co')).toBeTruthy();
    });
  });
});
