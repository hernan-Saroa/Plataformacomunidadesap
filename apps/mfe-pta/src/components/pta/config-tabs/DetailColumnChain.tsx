import React from 'react';
import { Plus, Tag, X } from 'lucide-react';
import { ExtItem } from '../ConfiguracionReglasPTA';
import { HourLimitControl, type HourLimitType } from './HourLimitControl';

// ─────────────────────────────────────────────────────────────────────────────
// Columnas de detalle en escalera.
// La cadena (`chain`) son las columnas posteriores a `_items_` en el orden de la
// sección: cada columna se anida dentro de los valores de la anterior.
// La relación padre→hijo se persiste en item.col_parents[col][i] = índice del
// valor padre en la columna anterior. Los datos legacy (sin col_parents) se
// emparejan por orden: el valor i cuelga del padre i (acotado al último padre).
// ─────────────────────────────────────────────────────────────────────────────

const valsOf = (item: ExtItem, col: string): string[] => {
  const v = item.col_valores?.[col];
  return Array.isArray(v) ? v : [];
};

type DetailHourMeta = NonNullable<ExtItem['col_meta']>[string][number];

const metaOf = (item: ExtItem, col: string): DetailHourMeta[] => {
  const value = item.col_meta?.[col];
  return Array.isArray(value) ? value : [];
};

const normalizeMetaType = (meta: DetailHourMeta, tipo: HourLimitType): DetailHourMeta => {
  if (tipo === 'sin_horas') return { ...meta, tipo };
  if (tipo === 'intervalo') {
    const currentMin = Number(meta.horas_min);
    const horasMin = Number.isFinite(currentMin) && currentMin > 0 ? currentMin : 1;
    const currentMax = Number(meta.horas);
    const horas = Number.isFinite(currentMax) && currentMax > horasMin
      ? currentMax
      : Math.max(2, horasMin + 1);
    return { ...meta, tipo, horas_min: horasMin, horas };
  }
  if (tipo === 'porcentaje') {
    const current = Number(meta.porcentaje_pta);
    return {
      ...meta,
      tipo,
      porcentaje_pta: Number.isFinite(current) ? Math.min(100, Math.max(1, current)) : 1,
    };
  }
  const current = Number(meta.horas);
  return { ...meta, tipo, horas: Number.isFinite(current) && current > 0 ? current : 1 };
};

const updateDetailMeta = (
  item: ExtItem,
  col: string,
  valIdx: number,
  update: (meta: DetailHourMeta) => DetailHourMeta,
): ExtItem => {
  const metadata = [...metaOf(item, col)];
  while (metadata.length < valsOf(item, col).length) metadata.push({ tipo: 'sin_horas' });
  metadata[valIdx] = update(metadata[valIdx] || { tipo: 'sin_horas' });
  return { ...item, col_meta: { ...(item.col_meta || {}), [col]: metadata } };
};

// Padre efectivo del valor `valIdx` de chain[level]. -1 = sin padre (nivel 0 de
// la cadena o columna anterior vacía).
export const effectiveParentIdx = (item: ExtItem, chain: string[], level: number, valIdx: number): number => {
  if (level <= 0) return -1;
  const prevCount = valsOf(item, chain[level - 1]).length;
  if (prevCount === 0) return -1;
  const stored = item.col_parents?.[chain[level]]?.[valIdx];
  const base = typeof stored === 'number' && Number.isFinite(stored) ? stored : Math.min(valIdx, prevCount - 1);
  return Math.max(0, Math.min(base, prevCount - 1));
};

// Niveles de la cadena que arrancan un panel propio al nivel del ítem: el 0 y
// cualquier columna cuya anterior no tenga valores (así nada queda invisible).
export const chainSegments = (item: ExtItem, chain: string[]): number[] => {
  const segments: number[] = chain.length ? [0] : [];
  for (let level = 1; level < chain.length; level++) {
    if (valsOf(item, chain[level - 1]).length === 0) segments.push(level);
  }
  return segments;
};

// Congela los padres efectivos actuales para que el emparejamiento legacy no se
// mueva cuando los índices cambian.
const materializedParents = (item: ExtItem, chain: string[], level: number): number[] =>
  valsOf(item, chain[level]).map((_, i) => effectiveParentIdx(item, chain, level, i));

export const addDetailValue = (item: ExtItem, chain: string[], level: number, parentIdx: number | null): ExtItem => {
  const col = chain[level];
  const colValores = { ...(item.col_valores || {}), [col]: [...valsOf(item, col), ''] };
  const colMeta = { ...(item.col_meta || {}), [col]: [...metaOf(item, col), { tipo: 'sin_horas' as const }] };
  const colParents = { ...(item.col_parents || {}) };
  if (level > 0 && parentIdx !== null && parentIdx >= 0 && valsOf(item, chain[level - 1]).length > 0) {
    colParents[col] = [...materializedParents(item, chain, level), parentIdx];
  } else {
    delete colParents[col];
  }
  return { ...item, col_valores: colValores, col_parents: colParents, col_meta: colMeta };
};

export const updateDetailValue = (item: ExtItem, col: string, valIdx: number, value: string): ExtItem => ({
  ...item,
  col_valores: { ...(item.col_valores || {}), [col]: valsOf(item, col).map((v, i) => (i === valIdx ? value : v)) },
});

// Elimina un valor y sus descendientes en cascada, reindexando los padres de
// los valores que sobreviven en las columnas más profundas.
export const removeDetailValue = (item: ExtItem, chain: string[], level: number, valIdx: number): ExtItem => {
  const colValores = { ...(item.col_valores || {}) };
  const colParents = { ...(item.col_parents || {}) };
  const colMeta = { ...(item.col_meta || {}) };

  let removedAtPrev = new Set<number>([valIdx]);
  for (let l = level; l < chain.length; l++) {
    const col = chain[l];
    const vals = valsOf(item, col);
    const parents = vals.map((_, i) => effectiveParentIdx(item, chain, l, i));
    const removeHere = new Set<number>();
    if (l === level) {
      removeHere.add(valIdx);
    } else {
      if (removedAtPrev.size === 0) break;
      parents.forEach((p, i) => { if (p !== -1 && removedAtPrev.has(p)) removeHere.add(i); });
    }
    const removedPrevSorted = [...removedAtPrev].sort((a, b) => a - b);
    const shiftParent = (p: number) => p - removedPrevSorted.filter(r => r < p).length;
    const keptVals: string[] = [];
    const keptMeta: DetailHourMeta[] = [];
    const keptParents: number[] = [];
    vals.forEach((v, i) => {
      if (removeHere.has(i)) return;
      keptVals.push(v);
      keptMeta.push(metaOf(item, col)[i] || { tipo: 'sin_horas' });
      const p = parents[i];
      keptParents.push(l === level || p === -1 ? p : shiftParent(p));
    });
    colValores[col] = keptVals;
    colMeta[col] = keptMeta;
    if (l > 0 && keptParents.length > 0 && keptParents.every(p => p >= 0)) {
      colParents[col] = keptParents;
    } else {
      delete colParents[col];
    }
    removedAtPrev = removeHere;
  }
  return { ...item, col_valores: colValores, col_parents: colParents, col_meta: colMeta };
};

// ─────────────────────────────────────────────────────────────────────────────
// Render recursivo
// ─────────────────────────────────────────────────────────────────────────────

interface DetailColumnChainProps {
  item: ExtItem;
  chain: string[];
  onItemChange: (next: ExtItem) => void;
}

export function DetailColumnChain({ item, chain, onItemChange }: DetailColumnChainProps) {
  if (!chain.length) return null;
  return (
    <>
      {chainSegments(item, chain).map(level => {
        // Los segmentos huérfanos (nivel > 0 con la columna anterior vacía) solo
        // se muestran si traen datos legacy; el alta de esos niveles se hace
        // siempre desde dentro de su nivel padre.
        if (level > 0 && valsOf(item, chain[level]).length === 0) return null;
        return (
          <ChainLevel
            key={`chain-${level}-${chain[level]}`}
            item={item}
            chain={chain}
            level={level}
            parentIdx={null}
            onItemChange={onItemChange}
          />
        );
      })}
    </>
  );
}

function ChainLevel({ item, chain, level, parentIdx, onItemChange }: {
  item: ExtItem;
  chain: string[];
  level: number;
  parentIdx: number | null;
  onItemChange: (next: ExtItem) => void;
}) {
  const col = chain[level];
  const vals = valsOf(item, col);
  const indices = vals
    .map((_, i) => i)
    .filter(i => (parentIdx === null ? true : effectiveParentIdx(item, chain, level, i) === parentIdx));
  const hasNextLevel = level + 1 < chain.length;

  // Sin valores en este contexto: no se pinta ningún panel automático, solo un
  // botón discreto para crear el primer valor cuando el usuario lo decida.
  if (indices.length === 0) {
    return (
      <button
        type="button"
        onClick={() => onItemChange(addDetailValue(item, chain, level, parentIdx))}
        className="config-chain-add"
        title={`Agregar ${col}`}
      >
        <Plus className="w-2.5 h-2.5" /> Agregar {col}
      </button>
    );
  }

  return (
    <div className={`config-chain-panel config-chain-depth-${level % 5}`}>
      <div className="config-chain-header flex items-center gap-1.5">
        <Tag className="w-2.5 h-2.5 text-slate-300 shrink-0" />
        <span className="flex-1 min-w-0 truncate text-[9px] font-bold text-slate-400 uppercase tracking-wider">{col}</span>
        <button
          type="button"
          onClick={() => onItemChange(addDetailValue(item, chain, level, parentIdx))}
          className="text-[9px] text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-0.5 shrink-0 transition-colors"
          title={`Agregar valor de ${col}`}
        >
          <Plus className="w-2.5 h-2.5" /> Agregar
        </button>
      </div>
      <div className="config-chain-body">
        {indices.map(i => (
          <div key={i} className="config-chain-value">
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                value={vals[i]}
                draggable={false}
                onChange={e => onItemChange(updateDetailValue(item, col, i, e.target.value))}
                placeholder={`${col}...`}
                className="flex-1 min-w-0 bg-white border border-slate-200 text-slate-600 text-[11px] rounded px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
              <HourLimitControl
                type={metaOf(item, col)[i]?.tipo || 'sin_horas'}
                hours={metaOf(item, col)[i]?.tipo === 'porcentaje'
                  ? (metaOf(item, col)[i]?.porcentaje_pta ?? 1)
                  : metaOf(item, col)[i]?.horas}
                minHours={metaOf(item, col)[i]?.horas_min}
                onTypeChange={tipo => onItemChange(updateDetailMeta(
                  item,
                  col,
                  i,
                  meta => normalizeMetaType(meta, tipo),
                ))}
                onHoursChange={value => onItemChange(updateDetailMeta(item, col, i, meta => (
                  meta.tipo === 'porcentaje'
                    ? { ...meta, porcentaje_pta: Math.min(100, Math.max(1, Number(value) || 1)) }
                    : { ...meta, horas: value === '' ? 0 : Math.max(1, Number(value) || 1) }
                )))}
                onMinHoursChange={value => onItemChange(updateDetailMeta(item, col, i, meta => ({
                  ...meta,
                  horas_min: value === '' ? 1 : Math.max(1, Number(value) || 1),
                })))}
                compact
              />
              <button
                type="button"
                onClick={() => onItemChange(removeDetailValue(item, chain, level, i))}
                className="config-inline-delete"
                title={hasNextLevel ? `Eliminar valor de ${col} y sus niveles anidados` : `Eliminar valor de ${col}`}
                aria-label={`Eliminar valor de ${col}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
            {hasNextLevel && (
              <div className="config-chain-children">
                <ChainLevel item={item} chain={chain} level={level + 1} parentIdx={i} onItemChange={onItemChange} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
