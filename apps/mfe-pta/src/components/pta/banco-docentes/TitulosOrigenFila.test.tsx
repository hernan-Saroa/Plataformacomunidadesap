import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { TitulosOrigenFila } from './TitulosOrigenFila';
afterEach(cleanup);

it('marca el título de la plantilla como precargado y cada otro como información adicional', () => {
  render(<TitulosOrigenFila nivel="Pregrado" tienePrecargado adicionales={['Abogado', 'Politólogo']} />);
  expect(screen.getByText('Información precargada')).toBeTruthy();
  const lista = screen.getByRole('list', { name: 'Títulos adicionales de pregrado' });
  const items = within(lista).getAllByRole('listitem');
  expect(items.map(item => item.textContent)).toEqual(['AbogadoInformación adicional', 'PolitólogoInformación adicional']);
});

it('sin adicionales solo muestra la etiqueta de precargado; sin precargado no la muestra', () => {
  const { rerender } = render(<TitulosOrigenFila nivel="Maestría" tienePrecargado adicionales={[]} />);
  expect(screen.getByText('Información precargada')).toBeTruthy();
  expect(screen.queryByRole('list')).toBeNull();
  rerender(<TitulosOrigenFila nivel="Maestría" tienePrecargado={false} adicionales={['Magíster']} />);
  expect(screen.queryByText('Información precargada')).toBeNull();
  expect(screen.getByText('Magíster')).toBeTruthy();
});
