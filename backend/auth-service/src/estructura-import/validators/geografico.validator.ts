import { DireccionTerritorialRow, CetapRow } from '../parsers/estructura-excel-parser.service';

export type ErrorSeverity = 'error' | 'warning';

export interface DataQualityError {
  hoja: string;
  fila?: number;
  columna?: string;
  datoErrado?: string;
  valorEsperado?: string;
  mensaje: string;
  severity: ErrorSeverity;
  /** Código de la fila afectada para poder omitirla */
  codigoFila?: string;
}

export interface ValidationResult {
  isValid: boolean;
  hasBlockingErrors: boolean;
  errors: DataQualityError[];
  warnings: DataQualityError[];
  /** Territoriales que pasaron validación */
  validTerritoriales: DireccionTerritorialRow[];
  /** CETAPs que pasaron validación */
  validCetaps: CetapRow[];
  /** Territoriales con errores (omitibles) */
  invalidTerritoriales: DireccionTerritorialRow[];
  /** CETAPs con errores (omitibles) */
  invalidCetaps: CetapRow[];
}

export class GeograficoValidator {
  static validarPreInsert(territoriales: DireccionTerritorialRow[], cetaps: CetapRow[]): ValidationResult {
    const errors: DataQualityError[] = [];
    const warnings: DataQualityError[] = [];

    // Sets para rastrear filas inválidas
    const invalidDtCodes = new Set<string>();
    const invalidCetapCodes = new Set<string>();

    // G1. DIRECCIONES_TERRITORIALES tiene al menos 17 filas
    if (territoriales.length < 17) {
      warnings.push({
        hoja: 'DIRECCIONES_TERRITORIALES',
        mensaje: `Solo hay ${territoriales.length} territoriales. Se esperan al menos 17.`,
        datoErrado: `${territoriales.length} filas`,
        valorEsperado: 'Al menos 17 filas',
        severity: 'warning'
      });
    }

    // G2. CETAPS tiene al menos 288 filas
    if (cetaps.length < 288) {
      warnings.push({
        hoja: 'CETAPS',
        mensaje: `Solo hay ${cetaps.length} CETAPs. Se esperan al menos 288.`,
        datoErrado: `${cetaps.length} filas`,
        valorEsperado: 'Al menos 288 filas',
        severity: 'warning'
      });
    }

    // G3. Todos los codigo_dt son únicos y no vacíos
    const dtCodes = new Set<string>();
    const dtCodeFirstSeen = new Map<string, number>(); // codigo -> fila donde se vio primero

    for (const t of territoriales) {
      if (!t.codigo_dt) {
        errors.push({
          hoja: 'DIRECCIONES_TERRITORIALES',
          fila: t._row,
          columna: 'codigo_dt',
          datoErrado: '(Vacío)',
          valorEsperado: 'Un código válido (Ej: DT-XXX)',
          mensaje: 'Falta codigo_dt. Esta fila será omitida.',
          severity: 'error',
          codigoFila: `DT-ROW-${t._row}`
        });
        invalidDtCodes.add(`DT-ROW-${t._row}`);
      } else if (dtCodes.has(t.codigo_dt)) {
        errors.push({
          hoja: 'DIRECCIONES_TERRITORIALES',
          fila: t._row,
          columna: 'codigo_dt',
          datoErrado: t.codigo_dt,
          valorEsperado: `Código único (primera aparición en fila ${dtCodeFirstSeen.get(t.codigo_dt)})`,
          mensaje: `G3: codigo_dt "${t.codigo_dt}" duplicado. Esta fila será omitida.`,
          severity: 'error',
          codigoFila: t.codigo_dt
        });
        invalidDtCodes.add(t.codigo_dt);
      } else {
        dtCodes.add(t.codigo_dt);
        dtCodeFirstSeen.set(t.codigo_dt, t._row ?? 0);
      }
    }

    // G4. Todos los codigo_cetap son únicos y no vacíos
    const cetapCodes = new Set<string>();
    const cetapCodeFirstSeen = new Map<string, number>();

    for (const c of cetaps) {
      if (!c.codigo_cetap) {
        errors.push({
          hoja: 'CETAPS',
          fila: c._row,
          columna: 'codigo_cetap',
          datoErrado: '(Vacío)',
          valorEsperado: 'Un código válido (Ej: CET-XXXX)',
          mensaje: 'Falta codigo_cetap. Esta fila será omitida.',
          severity: 'error',
          codigoFila: `CET-ROW-${c._row}`
        });
        invalidCetapCodes.add(`CET-ROW-${c._row}`);
      } else if (cetapCodes.has(c.codigo_cetap)) {
        errors.push({
          hoja: 'CETAPS',
          fila: c._row,
          columna: 'codigo_cetap',
          datoErrado: c.codigo_cetap,
          valorEsperado: `Código único (primera aparición en fila ${cetapCodeFirstSeen.get(c.codigo_cetap)})`,
          mensaje: `G4: codigo_cetap "${c.codigo_cetap}" duplicado. Esta fila será omitida.`,
          severity: 'error',
          codigoFila: c.codigo_cetap
        });
        invalidCetapCodes.add(c.codigo_cetap);
      } else {
        cetapCodes.add(c.codigo_cetap);
        cetapCodeFirstSeen.set(c.codigo_cetap, c._row ?? 0);
      }
    }

    // G5. Todo CETAP referencia un codigo_dt que existe en DIRECCIONES_TERRITORIALES
    for (const c of cetaps) {
      if (c.codigo_cetap && !invalidCetapCodes.has(c.codigo_cetap) && !dtCodes.has(c.codigo_dt)) {
        errors.push({
          hoja: 'CETAPS',
          fila: c._row,
          columna: 'codigo_dt',
          datoErrado: c.codigo_dt,
          valorEsperado: `Un código que exista en DIRECCIONES_TERRITORIALES (${Array.from(dtCodes).slice(0, 5).join(', ')}...)`,
          mensaje: `G5: CETAP "${c.codigo_cetap}" referencia territorial "${c.codigo_dt}" que no existe. Esta fila será omitida.`,
          severity: 'error',
          codigoFila: c.codigo_cetap
        });
        invalidCetapCodes.add(c.codigo_cetap);
      }
    }

    // G6. Cada DT regional tiene al menos un CETAP de tipo='otro'
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
        warnings.push({
          hoja: 'CETAPS',
          columna: 'tipo',
          valorEsperado: 'Al menos un CETAP con tipo "otro"',
          mensaje: `G6: La Territorial "${dtCode}" no tiene ningún CETAP regional (tipo="otro"). Se cargará sin CETAP "otro".`,
          severity: 'warning'
        });
      }
    });

    // G7. SEDE_CENTRAL tiene exactamente un CETAP de tipo='sede_central' (BLOQUEANTE GLOBAL)
    const sedesCentralesCount = cetaps.filter(c => c.tipo === 'sede_central').length;
    let hasBlockingErrors = false;
    if (sedesCentralesCount !== 1) {
      errors.push({
        hoja: 'CETAPS',
        columna: 'tipo',
        datoErrado: `${sedesCentralesCount} CETAP(s) tipo 'sede_central'`,
        valorEsperado: "Exactamente 1 CETAP con tipo='sede_central'",
        mensaje: "G7: Se requiere exactamente 1 CETAP de tipo 'sede_central'. Este error bloquea toda la importación.",
        severity: 'error'
      });
      hasBlockingErrors = true;
    }

    // Separar filas válidas e inválidas
    const validTerritoriales = territoriales.filter(t => {
      if (!t.codigo_dt) return false;
      return !invalidDtCodes.has(t.codigo_dt);
    });

    const invalidTerritoriales = territoriales.filter(t => {
      if (!t.codigo_dt) return true;
      return invalidDtCodes.has(t.codigo_dt);
    });

    const validCetaps = cetaps.filter(c => {
      if (!c.codigo_cetap) return false;
      return !invalidCetapCodes.has(c.codigo_cetap);
    });

    const invalidCetaps = cetaps.filter(c => {
      if (!c.codigo_cetap) return true;
      return invalidCetapCodes.has(c.codigo_cetap);
    });

    return {
      isValid: errors.length === 0,
      hasBlockingErrors,
      errors,
      warnings,
      validTerritoriales,
      validCetaps,
      invalidTerritoriales,
      invalidCetaps,
    };
  }
}
