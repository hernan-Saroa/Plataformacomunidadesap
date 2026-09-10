import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MatrizRoles } from './MatrizRoles';
import { contratacionService } from '../../services/contratacionService';
import { MatrizDeRoles } from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: { matrizDeRoles: vi.fn() },
}));

const servicio = contratacionService as unknown as {
  matrizDeRoles: ReturnType<typeof vi.fn>;
};

const MATRIZ: MatrizDeRoles = {
  confirmada: false,
  transversales: ['SUPER_ADMIN'],
  permisos: [
    {
      codigo: 'contratacion.proceso.create',
      nombre: 'Radicar proceso',
      descripcion: 'Crear el proceso y darle su número de radicado',
      recurso: 'proceso',
      columna: 'Radicar',
    },
    {
      codigo: 'contratacion.proceso.view',
      nombre: 'Consultar proceso',
      descripcion: 'Abrir los procesos a los que se tiene acceso',
      recurso: 'proceso',
      columna: null,
    },
    {
      codigo: 'contratacion.config.manage',
      nombre: 'Configurar el módulo',
      descripcion: 'Administrar la parametrización',
      recurso: 'config',
      columna: 'Configurar',
    },
  ],
  roles: [
    {
      codigo: 'GESTOR_CONTRATACION',
      nombre: 'Gestor de Contratación',
      descripcion: 'Adelanta el proceso y lleva el expediente.',
      quienLoEjerce: 'Abogados de la Dirección de Contratación',
      procedencia: 'INTERNA',
      origen: 'MODULO',
      nota: 'Parte de lo que hace todavía se autoriza por nombre de rol.',
      permisos: ['contratacion.proceso.create', 'contratacion.proceso.view'],
    },
    {
      codigo: 'ENTE_DE_CONTROL',
      nombre: 'Ente u Organismo de Control',
      descripcion: 'Hace seguimiento y control a la compra pública.',
      quienLoEjerce: 'Organismos de control externos',
      procedencia: 'EXTERNA',
      origen: 'FORMATO',
      permisos: [],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  servicio.matrizDeRoles.mockResolvedValue(MATRIZ);
});

describe('MatrizRoles', () => {
  it('dibuja una columna por rol y una fila por permiso', async () => {
    render(<MatrizRoles />);

    // El grupo «proceso» se abre de entrada; el de configuración va plegado.
    expect(await screen.findByText('Radicar proceso')).toBeInTheDocument();
    expect(screen.getByText('Consultar proceso')).toBeInTheDocument();
    expect(screen.queryByText('Configurar el módulo')).not.toBeInTheDocument();

    // Las columnas se rotulan con la sigla, con el nombre para el lector.
    expect(screen.getByRole('button', { name: /GC · Gestor de Contratación/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /EC · Ente u Organismo de Control/ }),
    ).toBeInTheDocument();
  });

  it('marca solo las casillas que el rol tiene', async () => {
    render(<MatrizRoles />);

    const fila = (await screen.findByText('Radicar proceso')).closest('tr')!;
    const celdas = within(fila).getAllByRole('cell');

    // La primera celda es el nombre; luego una por rol, en el mismo orden.
    expect(within(celdas[1]).getByText('Sí')).toBeInTheDocument();
    expect(within(celdas[2]).getByText('No')).toBeInTheDocument();
  });

  it('dice de qué columna del formato viene cada permiso', async () => {
    render(<MatrizRoles />);

    expect(await screen.findByText('Formato · Radicar')).toBeInTheDocument();
    // El módulo tiene permisos de etapas que el formato no alcanzó a cubrir, y
    // la pantalla lo dice en vez de dejar el hueco en blanco.
    expect(screen.getByText('Sin columna en el formato')).toBeInTheDocument();
  });

  it('avisa de que la matriz no está confirmada', async () => {
    render(<MatrizRoles />);

    expect(await screen.findByText(/Sin confirmar/)).toBeInTheDocument();
    expect(
      screen.getByText(/todavía no ha ratificado la matriz/),
    ).toBeInTheDocument();
  });

  it('al pulsar una columna abre la ficha del rol', async () => {
    const usuario = userEvent.setup();
    render(<MatrizRoles />);

    await usuario.click(
      await screen.findByRole('button', { name: /EC · Ente u Organismo de Control/ }),
    );

    expect(await screen.findByText('Externo a la entidad')).toBeInTheDocument();
    expect(screen.getByText('Fila del formato')).toBeInTheDocument();
    expect(screen.getByText(/Organismos de control externos/)).toBeInTheDocument();

    // Volver a pulsarla la cierra: es la misma columna, no otra.
    await usuario.click(screen.getByRole('button', { name: /EC · Ente u Organismo de Control/ }));
    await waitFor(() =>
      expect(screen.queryByText('Externo a la entidad')).not.toBeInTheDocument(),
    );
  });

  it('la ficha muestra la nota de lo que la rejilla no puede enseñar', async () => {
    const usuario = userEvent.setup();
    render(<MatrizRoles />);

    await usuario.click(
      await screen.findByRole('button', { name: /GC · Gestor de Contratación/ }),
    );

    expect(
      await screen.findByText(/todavía se autoriza por nombre de rol/),
    ).toBeInTheDocument();
  });

  it('buscar abre los grupos plegados que contienen el resultado', async () => {
    const usuario = userEvent.setup();
    render(<MatrizRoles />);
    await screen.findByText('Radicar proceso');

    await usuario.type(screen.getByPlaceholderText('Buscar un permiso'), 'configurar');

    expect(await screen.findByText('Configurar el módulo')).toBeInTheDocument();
    expect(screen.queryByText('Radicar proceso')).not.toBeInTheDocument();
  });

  it('cuenta los roles sin ninguna casilla', async () => {
    render(<MatrizRoles />);

    // El ente de control no tiene ninguna en este juego de datos: decirlo es lo
    // que permite ver de un vistazo que una fila quedó vacía.
    expect(await screen.findByText(/roles sin ninguna/)).toBeInTheDocument();
  });

  it('muestra el error cuando la matriz no se puede consultar', async () => {
    servicio.matrizDeRoles.mockRejectedValue(new Error('No tienes permisos para esta acción.'));
    render(<MatrizRoles />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes permisos para esta acción.',
    );
  });
});

/**
 * Los cuatro perfiles por defecto (EFDS-1183).
 *
 * Quien abre esta pantalla lo hace casi siempre para responder «¿qué le pongo a
 * esta persona?», y la rejilla sola contesta con treinta y cinco casillas. Los
 * perfiles contestan con cuatro nombres.
 */
describe('MatrizRoles · perfiles por defecto', () => {
  const PERFILES = [
    {
      codigo: 'AREA_SOLICITANTE',
      nombre: 'Área solicitante',
      descripcion: 'Diligencia el estudio previo y el análisis del sector.',
      quienLoEjerce: 'Áreas de la entidad que piden una contratación',
      roles: ['ESTRUCTURADOR_TECNICO'],
    },
    {
      codigo: 'CONSULTA',
      nombre: 'Consulta',
      descripcion: 'Ve los procesos sin intervenir en ninguno.',
      quienLoEjerce: 'Control interno y organismos de control',
      roles: ['APOYO_SUPERVISION', 'ENTE_DE_CONTROL'],
    },
  ];

  it('los enseña con los roles que hay que marcar en el backoffice', async () => {
    servicio.matrizDeRoles.mockResolvedValue({ ...MATRIZ, perfiles: PERFILES } as MatrizDeRoles);

    render(<MatrizRoles />);

    expect(await screen.findByText('Área solicitante')).toBeInTheDocument();
    // Asignarlos se hace en el backoffice de la plataforma, así que sin los
    // códigos de rol el perfil no le sirve de nada a quien da de alta.
    expect(screen.getByText('APOYO_SUPERVISION + ENTE_DE_CONTROL')).toBeInTheDocument();
  });

  it('sin perfiles la pantalla sigue siendo la matriz de siempre', async () => {
    // Un servidor que aún no los manda no debe dejar la pantalla a medias.
    servicio.matrizDeRoles.mockResolvedValue(MATRIZ);

    render(<MatrizRoles />);

    expect(await screen.findByText(/Lo que se puede hacer/)).toBeInTheDocument();
    expect(screen.queryByText(/Perfiles por defecto/)).toBeNull();
  });
});
