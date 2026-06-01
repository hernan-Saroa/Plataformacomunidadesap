import { DireccionTerritorialRow, CetapRow } from '../parsers/estructura-excel-parser.service';

export interface DataQualityError {
  hoja: string;
  fila?: number;
  columna?: string;
  datoErrado?: string;
  valorEsperado?: string;
  mensaje: string;
}

export class GeograficoValidator {
  static validarPreInsert(territoriales: DireccionTerritorialRow[], cetaps: CetapRow[]): { isValid: boolean; errors: DataQualityError[] } {
    const errors: DataQualityError[] = [];

    // G1. DIRECCIONES_TERRITORIALES tiene exactamente 17 filas
    if (territoriales.length !== 17) {
      errors.push({
        hoja: 'DIRECCIONES_TERRITORIALES',
        mensaje: 'La cantidad de filas en Direcciones Territoriales es incorrecta',
        datoErrado: `${territoriales.length} filas`,
        valorEsperado: 'Exactamente 17 filas'
      });
    }

    // G2. CETAPS tiene exactamente 288 filas
    if (cetaps.length !== 288) {
      errors.push({
        hoja: 'CETAPS',
        mensaje: 'La cantidad de filas en CETAPs es incorrecta',
        datoErrado: `${cetaps.length} filas`,
        valorEsperado: 'Exactamente 288 filas'
      });
    }

    // G3. Todos los codigo_dt son únicos
    const dtCodes = new Set<string>();
    for (const t of territoriales) {
      if (!t.codigo_dt) {
        errors.push({
          hoja: 'DIRECCIONES_TERRITORIALES',
          fila: t._row,
          columna: 'codigo_dt',
          datoErrado: '(Vacío)',
          valorEsperado: 'Un código válido (Ej: DT-XXX)',
          mensaje: 'Falta codigo_dt en DT'
        });
      } else if (dtCodes.has(t.codigo_dt)) {
        errors.push({
          hoja: 'DIRECCIONES_TERRITORIALES',
          fila: t._row,
          columna: 'codigo_dt',
          datoErrado: t.codigo_dt,
          valorEsperado: 'Código único y no repetido',
          mensaje: 'G3: codigo_dt duplicado en territoriales'
        });
      }
      dtCodes.add(t.codigo_dt);
    }

    // G4. Todos los codigo_cetap son únicos
    const cetapCodes = new Set<string>();
    for (const c of cetaps) {
      if (!c.codigo_cetap) {
        errors.push({
          hoja: 'CETAPS',
          fila: c._row,
          columna: 'codigo_cetap',
          datoErrado: '(Vacío)',
          valorEsperado: 'Un código válido (Ej: CET-XXX)',
          mensaje: 'Falta codigo_cetap en CETAP'
        });
      } else if (cetapCodes.has(c.codigo_cetap)) {
        errors.push({
          hoja: 'CETAPS',
          fila: c._row,
          columna: 'codigo_cetap',
          datoErrado: c.codigo_cetap,
          valorEsperado: 'Código único y no repetido',
          mensaje: 'G4: codigo_cetap duplicado en CETAPS'
        });
      }
      cetapCodes.add(c.codigo_cetap);
    }

    // G5. Todo CETAP referencia un codigo_dt que existe en la misma hoja
    for (const c of cetaps) {
      if (!dtCodes.has(c.codigo_dt)) {
        errors.push({
          hoja: 'CETAPS',
          fila: c._row,
          columna: 'codigo_dt',
          datoErrado: c.codigo_dt,
          valorEsperado: 'Un código_dt que exista en la hoja DIRECCIONES_TERRITORIALES',
          mensaje: 'G5: CETAP referencia codigo_dt inexistente'
        });
      }
    }

    // G6. Cada DT regional (todo excepto sede central) tiene al menos un CETAP de tipo='otro'
    const dtConOtro = new Set<string>();
    let sedeCentralDtCode = '';

    for (const c of cetaps) {
      if (c.tipo === 'otro') {
        dtConOtro.add(c.codigo_dt);
      }
      if (c.tipo === 'sede_central') {
        sedeCentralDtCode = c.codigo_dt;
      }
    }

    dtCodes.forEach((dtCode) => {
      if (dtCode !== sedeCentralDtCode && !dtConOtro.has(dtCode)) {
        errors.push({
          hoja: 'CETAPS',
          columna: 'tipo',
          valorEsperado: 'Al menos un CETAP con tipo "otro"',
          mensaje: `G6: La Territorial ${dtCode} no tiene ningún CETAP regional (tipo="otro")`
        });
      }
    });

    // G7. SEDE_CENTRAL tiene un CETAP de tipo='sede_central'
    const sedesCentralesCount = cetaps.filter(c => c.tipo === 'sede_central').length;
    if (sedesCentralesCount !== 1) {
      errors.push({
        hoja: 'CETAPS',
        columna: 'tipo',
        datoErrado: `${sedesCentralesCount} CETAP(s) tipo 'sede_central'`,
        valorEsperado: "Exactamente 1 CETAP con tipo='sede_central'",
        mensaje: "G7: Se requiere exactamente 1 CETAP de tipo 'sede_central'"
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
