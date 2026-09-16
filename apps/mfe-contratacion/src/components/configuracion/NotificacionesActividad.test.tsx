import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificacionesActividad } from './NotificacionesActividad';
import { contratacionService } from '../../services/contratacionService';
import { ConfiguracionAvisos } from '../../types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const permiso = vi.hoisted(() => ({ configurar: true }));
vi.mock('../../auth/permisos', () => ({
  PERMISOS: { configurar: 'configurar' },
  tienePermiso: () => permiso.configurar,
}));

const PAPELES: ConfiguracionAvisos['papeles'] = [
  { codigo: 'QUIEN_ENVIO', nombre: 'Quien envió la actividad' },
  { codigo: 'ABOGADO', nombre: 'El abogado del proceso' },
];

const configuracion = (cambios: Partial<ConfiguracionAvisos['avisos'][number]> = {}): ConfiguracionAvisos => ({
  papeles: PAPELES,
  avisos: [
    {
      evento: 'DEVUELTA',
      nombre: 'Se devuelve una actividad',
      ayuda: 'Para que quien la trabajó sepa que tiene algo que corregir.',
      personalizado: false,
      activo: true,
      papeles: ['QUIEN_ENVIO'],
      roles: [],
      ...cambios,
    },
    {
      evento: 'ADJUNTO',
      nombre: 'Se adjunta un documento',
      ayuda: 'Para seguir lo que se carga.',
      personalizado: false,
      activo: false,
      papeles: [],
      roles: [],
    },
  ] as ConfiguracionAvisos['avisos'],
});

/** Los avisos dentro de la ficha de la actividad (EFDS-1183). */
describe('NotificacionesActividad', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    permiso.configurar = true;
    vi.spyOn(contratacionService, 'avisosDeActividad').mockResolvedValue(configuracion());
    vi.spyOn(contratacionService, 'rolesAprobadores').mockResolvedValue([
      { code: 'DIRECTOR_CONTRATACION', name: 'Director de Contratación' },
    ]);
  });

  it('dice a quién avisa cada uno, en palabras', async () => {
    render(<NotificacionesActividad numeral="3.2" />);

    expect(await screen.findByText(/Avisa a quien envió la actividad/)).toBeInTheDocument();
    expect(screen.getByText('Sin destinatario')).toBeInTheDocument();
    expect(contratacionService.avisosDeActividad).toHaveBeenCalledWith('3.2');
  });

  it('apagar un aviso se guarda al momento', async () => {
    const guardar = vi
      .spyOn(contratacionService, 'guardarAvisoDeActividad')
      .mockResolvedValue(configuracion({ activo: false }));
    render(<NotificacionesActividad numeral="3.2" />);

    await userEvent.click(await screen.findByRole('switch', { name: 'Se devuelve una actividad' }));

    expect(guardar).toHaveBeenCalledWith('3.2', 'DEVUELTA', { activo: false });
    expect(await screen.findByRole('switch', { name: 'Se devuelve una actividad' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('encender uno sin destinatario abre para elegir, sin guardar', async () => {
    const guardar = vi.spyOn(contratacionService, 'guardarAvisoDeActividad');
    render(<NotificacionesActividad numeral="3.2" />);

    await userEvent.click(await screen.findByRole('switch', { name: 'Se adjunta un documento' }));

    expect(guardar).not.toHaveBeenCalled();
    expect(screen.getByText('A quien cumple este papel en el proceso')).toBeInTheDocument();
  });

  it('cambia a quién avisa y lo guarda con sus roles', async () => {
    const guardar = vi
      .spyOn(contratacionService, 'guardarAvisoDeActividad')
      .mockResolvedValue(configuracion({ personalizado: true }));
    render(<NotificacionesActividad numeral="3.2" />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cambiar a quién avisa: Se devuelve una actividad' }),
    );
    await userEvent.click(screen.getByRole('button', { name: /El abogado del proceso/ }));
    await userEvent.click(screen.getByRole('button', { name: /Agregar un rol/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Director de Contratación' }));
    await userEvent.click(screen.getByRole('button', { name: /Guardar/ }));

    expect(guardar).toHaveBeenCalledWith('3.2', 'DEVUELTA', {
      activo: true,
      papeles: ['QUIEN_ENVIO', 'ABOGADO'],
      roles: ['DIRECTOR_CONTRATACION'],
    });
  });

  it('lo cambiado puede volver a lo sugerido', async () => {
    vi.spyOn(contratacionService, 'avisosDeActividad').mockResolvedValue(configuracion({ personalizado: true }));
    const restablecer = vi
      .spyOn(contratacionService, 'restablecerAvisoDeActividad')
      .mockResolvedValue(configuracion());
    render(<NotificacionesActividad numeral="3.2" />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cambiar a quién avisa: Se devuelve una actividad' }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Volver a lo sugerido/ }));

    expect(restablecer).toHaveBeenCalledWith('3.2', 'DEVUELTA');
  });

  it('a quien no configura se lo muestra sin dejarle cambiar', async () => {
    permiso.configurar = false;
    render(<NotificacionesActividad numeral="3.2" />);

    expect(await screen.findByRole('switch', { name: 'Se devuelve una actividad' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Cambiar a quién avisa/ })).toBeNull();
  });
});
