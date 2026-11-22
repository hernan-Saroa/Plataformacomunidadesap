import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { AvisoTitulosDeducidos } from './AvisoTitulosDeducidos';
afterEach(cleanup);

const nota = () => screen.getByRole('note').textContent || '';

it('informa cuántos títulos se reconocen, cuántos se registran y cuántos quedan sin clasificar', () => {
  render(<AvisoTitulosDeducidos reconocidos={12} deducidos={10} sinClasificar={2} />);
  expect(nota()).toContain('12 títulos reconocidos');
  expect(nota()).toContain('10 se registrarán como información adicional');
  expect(nota()).toContain('2 no se pudieron clasificar con certeza y quedan solo en el perfil académico');
});

it('singular y sin pendientes', () => {
  render(<AvisoTitulosDeducidos reconocidos={1} deducidos={1} sinClasificar={0} />);
  expect(nota()).toContain('1 título reconocido');
  expect(nota()).toContain('1 se registrará como información adicional');
  expect(nota()).not.toContain('clasificar');
});

it('QA: si todos los títulos del perfil ya están en las columnas de título, lo dice en vez de callar', () => {
  render(<AvisoTitulosDeducidos reconocidos={3} deducidos={0} sinClasificar={0} />);
  expect(nota()).toContain('3 títulos reconocidos');
  expect(nota()).toContain('No hay títulos adicionales nuevos por registrar');
});

it('nombres que no son títulos: solo informa los que no pudo clasificar', () => {
  render(<AvisoTitulosDeducidos reconocidos={0} deducidos={0} sinClasificar={3} />);
  expect(nota()).toContain('3 no se pudieron clasificar con certeza');
  expect(nota()).not.toContain('reconocido');
});

it('perfil sin títulos reconocibles en todas las filas: lo dice', () => {
  render(<AvisoTitulosDeducidos filasSinTitulos={4} />);
  expect(nota()).toContain('4 filas traen un perfil académico sin títulos reconocibles: no hay títulos que registrar');
});

it('con títulos reconocidos y algunas filas sin títulos, lo menciona sin repetir el "no hay títulos"', () => {
  render(<AvisoTitulosDeducidos reconocidos={5} deducidos={2} filasSinTitulos={1} />);
  expect(nota()).toContain('1 fila trae un perfil académico sin títulos reconocibles');
  expect(nota()).not.toContain('no hay títulos que registrar');
});

it('todas las filas con errores: avisa que no se analizaron y qué hacer (el caso del reporte de errores)', () => {
  render(<AvisoTitulosDeducidos filasConError={1} />);
  expect(nota()).toContain('1 fila con errores no se analizó');
  expect(nota()).toContain('corrige el reporte de errores y vuelve a cargar');
});

it('mezcla de filas válidas y con error: informa ambas cosas', () => {
  render(<AvisoTitulosDeducidos reconocidos={6} deducidos={1} filasConError={2} />);
  expect(nota()).toContain('6 títulos reconocidos');
  expect(nota()).toContain('2 filas con errores no se analizaron');
});

it('lista lo que no se pudo clasificar con su fila y docente, con tope', () => {
  const detalle = Array.from({ length: 10 }, (_, i) => ({ fila: i + 3, nombre: `DOCENTE ${i + 1}`, titulos: ['Posgrado en Cultura de la Paz'] }));
  render(<AvisoTitulosDeducidos sinClasificar={10} detalle={detalle} />);
  const items = screen.getAllByRole('listitem');
  expect(items[0].textContent).toBe('Fila 3 · DOCENTE 1: Posgrado en Cultura de la Paz');
  expect(items).toHaveLength(9);
  expect(items[8].textContent).toContain('y 2 fila(s) más');
});

it('no muestra nada si no hay nada que informar', () => {
  const { container } = render(<AvisoTitulosDeducidos />);
  expect(container.firstChild).toBeNull();
  cleanup();
  const vacio = render(<AvisoTitulosDeducidos reconocidos={0} deducidos={0} sinClasificar={0} filasSinTitulos={0} filasConError={0} detalle={[]} />);
  expect(vacio.container.firstChild).toBeNull();
});
