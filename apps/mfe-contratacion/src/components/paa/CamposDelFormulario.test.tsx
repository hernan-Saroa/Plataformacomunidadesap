import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CamposDelFormulario } from './CamposDelFormulario';
import { contratacionService } from '../../services/contratacionService';
import { fijarAlcance } from '../../auth/alcance';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    paa: { documentos: vi.fn(), campos: vi.fn(), guardarCampos: vi.fn() },
  },
}));

const paa = (contratacionService as unknown as { paa: Record<string, ReturnType<typeof vi.fn>> }).paa;

const campo = (clave: string, etiqueta: string, extra: object = {}) => ({
  clave,
  etiquetaFormato: etiqueta,
  etiqueta,
  visible: true,
  orden: 0,
  uso: 'informativo',
  siempreVisible: false,
  estado: 'normal',
  ...extra,
});

describe('CamposDelFormulario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fijarAlcance({ alcances: [{ accion: 'editar', lugar: 'PAA' }], transversales: [] });
    paa.documentos.mockResolvedValue([
      {
        id: 'd-sede',
        codigo: 'SEDE_CENTRAL',
        nombre: 'Sede Central y Chocó',
        regiones: [{ id: 'r-sede', documentoId: 'd-sede', codigo: 'SEDE_CENTRAL', nombre: 'Sede Central', prefijoLinea: 'LINEA', unidadContratacion: 'Contratación', activa: true }],
        vigencias: [{ id: 'v-2027', documentoId: 'd-sede', anio: 2027, vigente: true, activa: null, versiones: [] }],
      },
    ]);
    paa.campos.mockResolvedValue({
      region: { id: 'r-sede', nombre: 'Sede Central' },
      vigencia: { id: 'v-2027', anio: 2027, vigente: true },
      origen: 'vigencia_anterior',
      campos: [
        campo('objeto', 'Objeto', { uso: 'proceso', siempreVisible: true }),
        campo('responsable_correo', 'Correo del responsable', { visible: false }),
        campo('extra:Prioridad', 'Prioridad', { estado: 'nueva' }),
      ],
    });
  });

  it('dice que la configuración se hereda del año anterior y señala lo nuevo', async () => {
    render(<CamposDelFormulario />);

    expect(await screen.findByText(/se propone la del año anterior/)).toBeInTheDocument();
    expect(screen.getByText('Nueva')).toBeInTheDocument();
    expect(screen.getByLabelText('Mostrar Objeto')).toBeDisabled();
  });

  it('guarda la visibilidad, el orden y el nombre propio', async () => {
    paa.guardarCampos.mockImplementation(async () => paa.campos());
    render(<CamposDelFormulario />);

    await userEvent.click(await screen.findByLabelText('Mostrar Correo del responsable'));
    await userEvent.click(screen.getByRole('button', { name: 'Subir Prioridad' }));
    await userEvent.click(screen.getByRole('button', { name: /Guardar formulario/ }));

    await waitFor(() =>
      expect(paa.guardarCampos).toHaveBeenCalledWith('r-sede', 2027, [
        { clave: 'objeto', visible: true, etiqueta: null },
        { clave: 'extra:Prioridad', visible: true, etiqueta: null },
        { clave: 'responsable_correo', visible: true, etiqueta: null },
      ]),
    );
  });
});
