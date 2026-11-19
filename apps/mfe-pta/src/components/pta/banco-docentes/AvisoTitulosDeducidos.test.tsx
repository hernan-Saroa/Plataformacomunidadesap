import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { AvisoTitulosDeducidos } from './AvisoTitulosDeducidos';
afterEach(cleanup);

it('informa cuántos títulos se deducen y cuántos quedan sin clasificar', () => {
  render(<AvisoTitulosDeducidos deducidos={12} sinClasificar={2} />);
  const nota = screen.getByRole('note');
  expect(nota.textContent).toContain('12 títulos se registrarán como información adicional');
  expect(nota.textContent).toContain('2 no se pudieron clasificar con certeza y quedan solo en el perfil académico');
});
it('singular y sin pendientes', () => {
  render(<AvisoTitulosDeducidos deducidos={1} sinClasificar={0} />);
  expect(screen.getByRole('note').textContent).toContain('1 título se registrará');
  expect(screen.getByRole('note').textContent).not.toContain('clasificar');
});
it('no muestra nada si no hay títulos que informar', () => {
  const { container } = render(<AvisoTitulosDeducidos />);
  expect(container.firstChild).toBeNull();
});
