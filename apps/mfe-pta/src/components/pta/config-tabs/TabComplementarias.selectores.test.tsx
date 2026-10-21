import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { normalizePTARules, type PTARules } from '../ConfiguracionReglasPTA';
import { TabComplementarias } from './TabComplementarias';

vi.mock('../../../services/api/ptaApi', () => ({ getConfiguracionPTAGlobal: vi.fn(), updateConfiguracionPTAGlobal: vi.fn() }));
afterEach(cleanup);

const sections = [
  ['complementarias_docencia', 'ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA'],
  ['academico_administrativas', 'ACTIVIDADES ACADÉMICO-ADMINISTRATIVAS'],
] as const;
const approvers = ['gestion_profesoral', 'decanatura', 'territorial'] as const;

function Editor({ initial }: { initial: PTARules }) {
  const [draft, setDraft] = useState(initial);
  return <>
    <TabComplementarias draft={draft} handleChange={(key, value) => setDraft(prev => ({ ...prev, [key]: value }))} />
    <output data-testid="configuracion">{JSON.stringify(draft.comp_actividades_v2)}</output>
  </>;
}

describe('selectores independientes de Complementarias', () => {
  it.each(sections.flatMap(([section, label]) => approvers.map(approver => ({ section, label, approver }))))(
    '$section permite cambiar Programa con Aprueba=$approver y conserva la configuración',
    ({ section, label, approver }) => {
      const otherSection = sections.find(([key]) => key !== section)![0];
      const activity = { id: 'COMP_SELECT', nombre: 'Bloque de prueba', nivel_programa: null,
        tipo_aprobacion: approver, items: [{ nombre: 'Actividad conservada', tipo: 'hasta' as const, horas: 40 }] };
      const initial = normalizePTARules({ comp_actividades_v2: {
        [section]: [activity], [otherSection]: [{ id: 'OTRO', nombre: 'Otro bloque', items: [] }],
      } });
      const { unmount } = render(<Editor initial={initial} />);
      if (section !== sections[0][0]) fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }));
      const programa = screen.getByRole('combobox', { name: 'Programa de Bloque de prueba' }) as HTMLSelectElement;
      const aprueba = screen.getByRole('combobox', { name: 'Aprueba Bloque de prueba' }) as HTMLSelectElement;
      expect(within(programa).getAllByRole('option').map(option => option.textContent)).toEqual(['Ninguno', 'Pregrado', 'Posgrado']);
      expect(within(aprueba).getAllByRole('option').map(option => option.textContent)).toEqual(['Gestión Profesoral', 'Decanatura', 'Territorial']);
      expect(programa.disabled).toBe(false);
      for (const value of ['pregrado', 'posgrado', '']) {
        fireEvent.change(programa, { target: { value } });
        expect(programa.value).toBe(value);
        expect(aprueba.value).toBe(approver);
      }
      fireEvent.change(programa, { target: { value: 'posgrado' } });
      for (const value of approvers) {
        fireEvent.change(aprueba, { target: { value } });
        expect(aprueba.value).toBe(value);
        expect(programa.value).toBe('posgrado');
        expect(programa.disabled).toBe(false);
      }
      const saved = JSON.parse(screen.getByTestId('configuracion').textContent!);
      expect(saved[section][0]).toMatchObject({ nivel_programa: 'posgrado', tipo_aprobacion: 'territorial', items: activity.items });
      expect(saved[otherSection]).toEqual(initial.comp_actividades_v2[otherSection]);
      unmount();
      render(<Editor initial={normalizePTARules({ comp_actividades_v2: saved })} />);
      if (section !== sections[0][0]) fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }));
      expect((screen.getByRole('combobox', { name: 'Programa de Bloque de prueba' }) as HTMLSelectElement).value).toBe('posgrado');
      expect((screen.getByRole('combobox', { name: 'Aprueba Bloque de prueba' }) as HTMLSelectElement).value).toBe('territorial');
    },
  );
});
