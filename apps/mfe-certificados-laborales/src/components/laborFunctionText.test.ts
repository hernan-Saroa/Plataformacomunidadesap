import { describe, expect, it } from 'vitest';
import { extractFunctionItems, splitFunctions } from './laborFunctionText';

describe('texto de funciones laborales', () => {
  it('une los renglones de continuación en listas numeradas', () => {
    const text = '1. Revisar los pagos y verificar los descuentos\r\nlegales\r\n2. Consolidar los movimientos contables de manera\noportuna';
    expect(extractFunctionItems(text)).toEqual([
      'Revisar los pagos y verificar los descuentos legales',
      'Consolidar los movimientos contables de manera oportuna',
    ]);
    expect(splitFunctions(text)).toHaveLength(2);
  });

  it('conserva las listas sin numeración, viñetas y arreglos existentes', () => {
    expect(extractFunctionItems('Atender las solicitudes.\nPresentar informes.')).toEqual([
      'Atender las solicitudes.', 'Presentar informes.',
    ]);
    expect(extractFunctionItems('• Atender las solicitudes.\n• Presentar informes.')).toEqual([
      'Atender las solicitudes.', 'Presentar informes.',
    ]);
    expect(extractFunctionItems(['Atender las\nsolicitudes.'])).toEqual([
      'Atender las solicitudes.',
    ]);
  });

  it('elimina duplicados después de unir sus líneas de continuación', () => {
    expect(splitFunctions('1. Atender las\nsolicitudes.\n2. Atender las solicitudes.')).toEqual([
      'Atender las solicitudes.',
    ]);
  });
});
