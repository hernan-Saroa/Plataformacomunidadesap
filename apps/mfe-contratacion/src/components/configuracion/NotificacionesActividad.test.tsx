import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificacionesActividad } from './NotificacionesActividad';
import { contratacionService } from '../../services/contratacionService';
import { AvisoEvento, ConfiguracionAvisos } from '../../types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const permiso = vi.hoisted(() => ({ configurar: true }));
vi.mock('../../auth/permisos', () => ({
  PERMISOS: { configurar: 'configurar' },
  tienePermiso: () => permiso.configurar,
}));

const PAPELES: ConfiguracionAvisos['papeles'] = [
  { codigo: 'QUIEN_ENVIO', nombre: 'Quien envió la actividad' },
  { codigo: 'QUIEN_APRUEBA', nombre: 'Quien la aprueba' },
  { codigo: 'ABOGADO', nombre: 'El abogado del proceso' },
  { codigo: 'EQUIPO_FINANCIERO', nombre: 'El equipo financiero' },
  { codigo: 'RADICADOR', nombre: 'Quien radicó el proceso' },
];

const aviso = (cambios: Partial<AvisoEvento>): AvisoEvento => ({
  evento: 'RECIBIDO_EN_CONTRATACION',
  nombre: 'Contratación recibe el proceso',
  ayuda: 'Para que el área que radicó sepa que su proceso ya entró a la Dirección.',
  personalizado: false,
  activo: false,
  papeles: ['RADICADOR'],
  dependencias: [],
  roles: [],
  personas: [],
  ...cambios,
});

const configuracion = (
  cambios: { recibido?: Partial<AvisoEvento>; requiereAprobacion?: boolean } = {},
): ConfiguracionAvisos => ({
  papeles: PAPELES,
  requiereAprobacion: cambios.requiereAprobacion ?? true,
  siempre:
    cambios.requiereAprobacion === false
      ? []
      : [
          { evento: 'ENVIADA_A_APROBACION', nombre: 'Se envía a aprobación', ayuda: '', aQuien: ['Quien la aprueba'] },
          { evento: 'DEVUELTA', nombre: 'Se devuelve una actividad', ayuda: '', aQuien: ['Quien envió la actividad'] },
        ],
  avisos: [
    aviso({
      evento: 'HABILITADA',
      nombre: 'Le toca a alguien hacerla',
      ayuda: 'Cuando se termina lo que venía antes y esta actividad ya se puede trabajar.',
      activo: true,
      papeles: ['EQUIPO_FINANCIERO'],
    }),
    aviso(cambios.recibido ?? {}),
    aviso({
      evento: 'DOCUMENTO_ADJUNTO',
      nombre: 'Se adjunta un documento',
      ayuda: 'Para enterarse cuando llega un soporte nuevo.',
      papeles: [],
    }),
  ],
});

const abrir = async (nombre: string) =>
  userEvent.click(await screen.findByRole('button', { name: `Cambiar a quién avisa: ${nombre}` }));

/** Los avisos dentro de la ficha de la actividad (EFDS-1183). */
describe('NotificacionesActividad', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    permiso.configurar = true;
    vi.spyOn(contratacionService, 'avisosDeActividad').mockResolvedValue(configuracion());
    vi.spyOn(contratacionService, 'rolesAprobadores').mockResolvedValue([
      { code: 'DIRECTOR_CONTRATACION', name: 'Director de Contratación' },
    ]);
    vi.spyOn(contratacionService, 'dependencias').mockResolvedValue([
      { id: '7', nombre: 'Dirección Financiera' },
      { id: '9', nombre: 'Oficina de TI' },
    ]);
  });

  describe('lo que se avisa siempre', () => {
    it('con aprobación, los muestra sin interruptor: no se pueden apagar', async () => {
      render(<NotificacionesActividad numeral="3.2" />);

      expect(await screen.findByText('Se envía a aprobación')).toBeInTheDocument();
      expect(screen.getByText('Avisa a quien la aprueba')).toBeInTheDocument();
      expect(screen.queryByRole('switch', { name: 'Se envía a aprobación' })).toBeNull();
      expect(screen.getByText(/Salen solos y no se pueden apagar/)).toBeInTheDocument();
    });

    it('sin aprobación, dice dónde se configura en vez de listar avisos que no saldrían', async () => {
      vi.spyOn(contratacionService, 'avisosDeActividad').mockResolvedValue(
        configuracion({ requiereAprobacion: false }),
      );
      render(<NotificacionesActividad numeral="3.2" />);

      expect(await screen.findByText(/no requiere aprobación/)).toBeInTheDocument();
      expect(screen.queryByText('Se envía a aprobación')).toBeNull();
      // Sin avisos fijos no se pone un título vacío.
      expect(screen.queryByText('Se avisa siempre')).toBeNull();
    });
  });

  describe('los que se deciden', () => {
    it('dice a quién avisa cada uno, en palabras', async () => {
      render(<NotificacionesActividad numeral="3.2" />);

      expect(await screen.findByText(/Avisa al equipo financiero/)).toBeInTheDocument();
      expect(screen.getByText(/Apagado · avisaría a quien radicó el proceso/)).toBeInTheDocument();
      expect(screen.getByText('Sin destinatario')).toBeInTheDocument();
    });

    it('apagar un aviso se guarda al momento', async () => {
      const guardar = vi.spyOn(contratacionService, 'guardarAvisoDeActividad').mockResolvedValue(configuracion());
      render(<NotificacionesActividad numeral="3.2" />);

      await userEvent.click(await screen.findByRole('switch', { name: 'Le toca a alguien hacerla' }));

      expect(guardar).toHaveBeenCalledWith('3.2', 'HABILITADA', { activo: false });
    });

    it('a quien le corresponde de por sí se ve como automático, sin poder quitarlo', async () => {
      render(<NotificacionesActividad numeral="3.2" />);
      await abrir('Le toca a alguien hacerla');

      expect(screen.getByText('El equipo financiero')).toBeInTheDocument();
      expect(screen.getByText('Automático')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Quitar El equipo financiero' })).toBeNull();
    });

    it('el buscador ofrece dependencias, roles y personas, y nada más', async () => {
      render(<NotificacionesActividad numeral="3.2" />);
      await abrir('Le toca a alguien hacerla');
      await userEvent.click(screen.getByRole('button', { name: /Agregar a quién avisar/ }));

      expect(screen.getByRole('button', { name: 'Dependencias' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Roles' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Personas' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'En el proceso' })).toBeNull();
    });

    it('elegir una dependencia se guarda al momento', async () => {
      const guardar = vi.spyOn(contratacionService, 'guardarAvisoDeActividad').mockResolvedValue(configuracion());
      render(<NotificacionesActividad numeral="3.2" />);
      await abrir('Le toca a alguien hacerla');
      await userEvent.click(screen.getByRole('button', { name: /Agregar a quién avisar/ }));
      await userEvent.click(await screen.findByRole('button', { name: 'Dirección Financiera' }));

      expect(guardar).toHaveBeenCalledWith('3.2', 'HABILITADA', {
        activo: true,
        dependencias: ['7'],
        roles: [],
        personas: [],
      });
    });

    it('agrega un rol desde su pestaña', async () => {
      const guardar = vi.spyOn(contratacionService, 'guardarAvisoDeActividad').mockResolvedValue(configuracion());
      render(<NotificacionesActividad numeral="3.2" />);
      await abrir('Le toca a alguien hacerla');
      await userEvent.click(screen.getByRole('button', { name: /Agregar a quién avisar/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Roles' }));
      await userEvent.click(await screen.findByRole('button', { name: 'Director de Contratación' }));

      expect(guardar).toHaveBeenCalledWith('3.2', 'HABILITADA', {
        activo: true,
        dependencias: [],
        roles: ['DIRECTOR_CONTRATACION'],
        personas: [],
      });
    });

    it('encender uno sin nadie abre el buscador, y se enciende con la primera persona', async () => {
      vi.spyOn(contratacionService, 'personas').mockResolvedValue([
        { id: 'p-ana', nombre: 'Ana Lucía Osorio', email: 'ana@esap.edu.co' },
      ] as never);
      const guardar = vi.spyOn(contratacionService, 'guardarAvisoDeActividad').mockResolvedValue(configuracion());
      render(<NotificacionesActividad numeral="3.2" />);

      await userEvent.click(await screen.findByRole('switch', { name: 'Se adjunta un documento' }));
      expect(guardar).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Personas' }));
      await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar una persona' }), 'Ana');
      await userEvent.click(await screen.findByRole('button', { name: /Ana Lucía Osorio/ }));

      expect(guardar).toHaveBeenCalledWith('3.2', 'DOCUMENTO_ADJUNTO', {
        activo: true,
        dependencias: [],
        roles: [],
        personas: ['p-ana'],
      });
    });

    it('quitar al único elegido apaga el aviso si no le llega a nadie más', async () => {
      vi.spyOn(contratacionService, 'avisosDeActividad').mockResolvedValue(configuracion());
      const conDependencia = configuracion();
      conDependencia.avisos[2] = { ...conDependencia.avisos[2], activo: true, personalizado: true, dependencias: [{ id: '9', nombre: 'Oficina de TI' }] };
      vi.spyOn(contratacionService, 'avisosDeActividad').mockResolvedValue(conDependencia);
      const guardar = vi.spyOn(contratacionService, 'guardarAvisoDeActividad').mockResolvedValue(configuracion());
      render(<NotificacionesActividad numeral="3.2" />);

      await abrir('Se adjunta un documento');
      await userEvent.click(screen.getByRole('button', { name: 'Quitar Oficina de TI' }));

      expect(guardar).toHaveBeenCalledWith('3.2', 'DOCUMENTO_ADJUNTO', {
        activo: false,
        dependencias: [],
        roles: [],
        personas: [],
      });
    });

    it('recuerda que un aviso apagado no sale aunque tenga a quién avisar', async () => {
      render(<NotificacionesActividad numeral="3.2" />);
      await abrir('Contratación recibe el proceso');

      expect(screen.getByText(/Este aviso está apagado: enciéndelo arriba/)).toBeInTheDocument();
    });

    it('lo cambiado puede volver a lo sugerido', async () => {
      vi.spyOn(contratacionService, 'avisosDeActividad').mockResolvedValue(
        configuracion({ recibido: { personalizado: true, activo: true } }),
      );
      const restablecer = vi
        .spyOn(contratacionService, 'restablecerAvisoDeActividad')
        .mockResolvedValue(configuracion());
      render(<NotificacionesActividad numeral="3.2" />);

      await abrir('Contratación recibe el proceso');
      await userEvent.click(screen.getByRole('button', { name: /Volver a lo sugerido/ }));

      expect(restablecer).toHaveBeenCalledWith('3.2', 'RECIBIDO_EN_CONTRATACION');
    });
  });

  it('a quien no configura se lo muestra sin dejarle cambiar', async () => {
    permiso.configurar = false;
    render(<NotificacionesActividad numeral="3.2" />);

    expect(await screen.findByRole('switch', { name: 'Le toca a alguien hacerla' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Cambiar a quién avisa/ })).toBeNull();
  });
});
