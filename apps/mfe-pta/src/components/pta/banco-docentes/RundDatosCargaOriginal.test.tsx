import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { COLUMNAS_CARGA_POR_BLOQUE, RundDatosCargaOriginal } from './RundDatosCargaOriginal';
afterEach(cleanup);

describe('Consulta del archivo de carga', () => {
  it('distribuye las 38 columnas entre los seis bloques sin perder ni duplicar columnas', () => {
    const keys = Object.values(COLUMNAS_CARGA_POR_BLOQUE).flat().map(([key])=>key);
    expect(keys).toHaveLength(38);
    expect(new Set(keys).size).toBe(38);
  });
  it('conserva todos los teléfonos reportados', () => {
    render(<RundDatosCargaOriginal bloque="CONTACTO" datos={{TELEFONO:'6011234567 / 3001234567'}} accesoCompleto />);
    expect(screen.getByText('6011234567 / 3001234567')).toBeTruthy();
  });
  it('no expone puntaje del archivo original sin permiso', () => {
    const {container} = render(<RundDatosCargaOriginal bloque="VINCULACION" datos={{PUNTAJE_SALARIAL:145.5,TERRITORIAL:'META'}} accesoCompleto={false} />);
    expect(screen.getByText('Información restringida')).toBeTruthy();
    expect(container.innerHTML).not.toContain('145.5');
    expect(screen.getByText('META')).toBeTruthy();
  });
  it('distingue cero de una celda vacía', () => {
    render(<RundDatosCargaOriginal bloque="VINCULACION" datos={{PUNTAJE_SALARIAL:0}} accesoCompleto />);
    expect(screen.getByText('0')).toBeTruthy();
  });
});
