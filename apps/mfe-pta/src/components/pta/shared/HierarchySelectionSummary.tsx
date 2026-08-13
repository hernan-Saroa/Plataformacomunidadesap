import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  CornerDownRight,
  GitBranch,
} from 'lucide-react';
import {
  buildHierarchyBranchTree,
  formatHierarchyBranchPath,
  getHierarchyBranchDisplayLevels,
  getHierarchySelectionInfo,
  type HierarchySelectionBranch,
  type HierarchyBranchTreeNode,
} from './extensionSelection';
import { formatConfiguredHourRecognition } from './configuredHours';

interface HierarchySelectionSummaryProps {
  activity: any;
  accent?: string;
  compact?: boolean;
  className?: string;
}

export function HierarchyBranchTree({
  branches,
  accent = '#7C3AED',
  compact = false,
  selectedKeys,
  disabled = false,
  onToggle,
  renderSelectionControl,
}: {
  branches: HierarchySelectionBranch[];
  accent?: string;
  compact?: boolean;
  selectedKeys?: ReadonlySet<string>;
  disabled?: boolean;
  onToggle?: (
    selectionKey: string,
    conflictingKeys?: string[],
    clearOnly?: boolean,
  ) => void;
  renderSelectionControl?: (
    selectionKey: string,
    recognition: Record<string, any> | undefined,
    selected: boolean,
  ) => ReactNode;
}) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const tree = buildHierarchyBranchTree(branches);
  if (tree.length === 0) return null;
  const interactive = Boolean(onToggle && selectedKeys);

  const toggleExpanded = (selectionKey: string) => {
    setExpandedKeys(current => {
      const next = new Set(current);
      if (next.has(selectionKey)) next.delete(selectionKey);
      else next.add(selectionKey);
      return next;
    });
  };

  const getNodeSelectionKeys = (
    node: HierarchyBranchTreeNode,
    includeNode = true,
  ): string[] => {
    const keys: string[] = includeNode && node.children.length > 0
      ? [node.selectionKey]
      : [];
    node.branches.forEach(branch => keys.push(branch.clave));
    node.children.forEach(child => keys.push(...getNodeSelectionKeys(child)));
    return keys;
  };

  const renderEndpoint = (
    node: HierarchyBranchTreeNode,
    branch: HierarchySelectionBranch,
    endpointIndex: number,
    hideColumn: boolean,
  ) => {
    const checked = selectedKeys?.has(branch.clave) || false;
    const content = (
      <span className="flex min-w-0 flex-1 flex-wrap items-start gap-2">
        <span className="min-w-0 flex-1">
        {node.columna && !hideColumn && (
          <span
            className="mb-0.5 inline-flex rounded-full border px-1.5 font-bold tracking-wide"
            style={{
              color: accent,
              borderColor: `${accent}30`,
              backgroundColor: `${accent}0A`,
              fontSize: '11px',
              lineHeight: '16px',
            }}
          >
            {node.columna}
          </span>
        )}
        <span
          className="block break-words font-medium text-slate-700"
          style={{ fontSize: '13px', lineHeight: 1.45 }}
        >
          {node.valor}
        </span>
        </span>
        {renderSelectionControl?.(
          branch.clave,
          getHierarchyBranchDisplayLevels(branch).slice(-1)[0]?.reconocimiento,
          checked,
        )}
      </span>
    );

    if (interactive) {
      const ariaPath = getHierarchyBranchDisplayLevels(branch)
        .map(level => level.valor)
        .join(', ');
      return (
        <div
          key={`${branch.clave}:${endpointIndex}`}
          className={`flex flex-wrap items-start gap-2 rounded-md border px-2 py-1.5 transition-colors ${
            checked
              ? 'border-violet-200 bg-violet-50 shadow-sm'
              : 'border-slate-200 bg-slate-50/70 hover:border-violet-200 hover:bg-violet-50/50'
          }`}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={() => onToggle?.(branch.clave)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer disabled:cursor-not-allowed"
            style={{ accentColor: accent, width: 16, height: 16 }}
            aria-label={`Seleccionar ${ariaPath || branch.nombre || 'ramificación'}`}
          />
          {content}
        </div>
      );
    }

    return (
      <div key={`${branch.clave}:${endpointIndex}`} className="flex items-start gap-1.5 py-0.5">
        <CheckCircle2 className="mt-0.5 h-2.5 w-2.5 shrink-0" style={{ color: accent }} />
        {content}
      </div>
    );
  };

  const countEndpoints = (node: HierarchyBranchTreeNode): number =>
    node.branches.length
    + node.children.reduce((total, child) => total + countEndpoints(child), 0);

  const renderNode = (
    node: HierarchyBranchTreeNode,
    depth: number,
    hideColumn = false,
  ) => {
    const hasChildren = node.children.length > 0;
    const grouped = hasChildren;
    const optionCount = countEndpoints(node);
    const nodeSelected = Boolean(selectedKeys?.has(node.selectionKey));
    const descendantSelectionKeys = getNodeSelectionKeys(node, false);
    const nestedSelectedCount = descendantSelectionKeys
      .filter(key => selectedKeys?.has(key))
      .length;
    const selectedCount = Number(nodeSelected) + nestedSelectedCount;
    const nodeActive = nodeSelected || nestedSelectedCount > 0;
    const isExpanded = !interactive || expandedKeys.has(node.selectionKey);
    const sharedChildColumn = node.children.length > 0
      && node.children[0].columna
      && node.children.every(child => child.columna === node.children[0].columna)
      ? node.children[0].columna
      : '';
    const statusLabel = nodeSelected && nestedSelectedCount > 0
      ? `Este nivel + ${nestedSelectedCount} ${nestedSelectedCount === 1 ? 'subopción' : 'subopciones'}`
      : nodeSelected
      ? 'Este nivel seleccionado'
      : selectedCount > 0
        ? `${selectedCount} ${selectedCount === 1 ? 'seleccionada' : 'seleccionadas'}`
        : `${optionCount} ${optionCount === 1 ? 'opción' : 'opciones'}`;

    const headerContent = (
      <>
        <span className="min-w-0 flex-1 text-left">
          {node.columna && !hideColumn && (
            <span
              className="mb-0.5 inline-flex rounded-full border px-1.5 font-bold tracking-wide"
              style={{
                color: accent,
                borderColor: `${accent}30`,
                backgroundColor: `${accent}0A`,
                fontSize: '11px',
                lineHeight: '16px',
              }}
            >
              {node.columna}
            </span>
          )}
          <span
            className="block break-words font-semibold text-slate-700"
            style={{ fontSize: '14px', lineHeight: 1.45 }}
          >
            {node.valor}
          </span>
        </span>
        {(interactive || !sharedChildColumn) && (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 font-bold ${
              selectedCount > 0 ? 'text-violet-700' : 'text-slate-500'
            }`}
            style={{
              borderColor: selectedCount > 0 ? `${accent}60` : `${accent}30`,
              backgroundColor: selectedCount > 0 ? `${accent}14` : `${accent}08`,
              fontSize: '11px',
              lineHeight: '16px',
            }}
          >
            {statusLabel}
          </span>
        )}
      </>
    );

    return (
      <div
        key={node.clave}
        className={depth === 0
          ? 'rounded-xl border border-slate-200 bg-white'
          : ''}
      >
        {grouped && (
          <div className={`${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'} flex min-w-0 flex-wrap items-start gap-2`}>
            {interactive ? (
              <>
                <input
                  type="checkbox"
                  checked={nodeSelected}
                  disabled={disabled}
                  onChange={() => onToggle?.(node.selectionKey)}
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  style={{ accentColor: accent, width: 16, height: 16 }}
                  title={nodeSelected
                    ? 'Desmarcar solamente este nivel'
                    : 'Seleccionar este nivel sin modificar sus subopciones'}
                  aria-label={`${nodeSelected ? 'Desmarcar' : 'Seleccionar'} este nivel: ${node.valor}`}
                />
                <button
                  type="button"
                  onClick={() => toggleExpanded(node.selectionKey)}
                  className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 border-0 bg-transparent p-0 text-left"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Contraer' : 'Desplegar'} ${node.valor}`}
                >
                  {headerContent}
                  <ChevronDown
                    className={`mt-1 h-4 w-4 shrink-0 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    style={{ color: selectedCount > 0 ? accent : '#64748B' }}
                    aria-hidden="true"
                  />
                </button>
                {renderSelectionControl?.(
                  node.selectionKey,
                  node.ruta.slice(-1)[0]?.reconocimiento,
                  nodeSelected,
                )}
              </>
            ) : (
              <>
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: accent, boxShadow: `0 0 0 1px ${accent}40` }}
                  aria-hidden="true"
                />
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  {headerContent}
                </div>
                {renderSelectionControl?.(
                  node.selectionKey,
                  node.ruta.slice(-1)[0]?.reconocimiento,
                  nodeActive,
                )}
              </>
            )}
          </div>
        )}
        {(!grouped || isExpanded) && (
          <div
            className={`${grouped
              ? `${compact ? 'mb-2 ml-5 mr-2 pl-3' : 'mb-2.5 ml-6 mr-2.5 pl-4'} border-l-2`
              : ''} grid gap-1.5`}
            style={grouped ? { borderColor: `${accent}55` } : undefined}
          >
            {node.branches.map((branch, index) =>
              renderEndpoint(
                node,
                branch,
                index,
                hideColumn,
              ))}
            {sharedChildColumn && (
              <div className="flex min-w-0 items-center gap-1.5 pb-0.5">
                <CornerDownRight
                  className="h-2.5 w-2.5 shrink-0"
                  style={{ color: `${accent}B0` }}
                  aria-hidden="true"
                />
                <span
                  className="font-bold tracking-wide text-slate-500"
                  style={{ fontSize: '11px', lineHeight: '16px' }}
                >
                  {sharedChildColumn}
                </span>
                <span
                  className="font-semibold text-slate-400"
                  style={{ fontSize: '11px', lineHeight: '16px' }}
                >
                  · {optionCount} {optionCount === 1 ? 'opción' : 'opciones'}
                </span>
              </div>
            )}
            {node.children.map(child =>
              renderNode(
                child,
                depth + 1,
                Boolean(sharedChildColumn),
              ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid min-w-0 gap-1.5">
      {tree.map(node => renderNode(node, 0))}
    </div>
  );
}

/**
 * Resumen reutilizable de lo que el docente eligió dentro de una actividad
 * configurada en árbol. Sirve en portal, aprobación, impresión y reportes.
 */
export function HierarchySelectionSummary({
  activity,
  accent = '#7C3AED',
  compact = false,
  className = '',
}: HierarchySelectionSummaryProps) {
  const selections = getHierarchySelectionInfo(activity);
  if (selections.length === 0) return null;

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50 ${compact ? 'p-2' : 'p-3'} ${className}`}
      data-pta-hierarchy-summary
    >
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        <GitBranch className="h-3.5 w-3.5" style={{ color: accent }} />
        Desglose seleccionado
      </div>
      <div className="space-y-2">
        {selections.map(selection => (
          <div key={selection.clave} className="rounded-md border border-slate-200 bg-white px-2.5 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {selection.etiqueta}
                </div>
                <div className="mt-0.5 text-[12px] font-semibold leading-snug text-slate-700">
                  {selection.nombre}
                </div>
              </div>
              {selection.horas > 0 ? (
                <span
                  className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold"
                  style={{ color: accent, borderColor: `${accent}45`, backgroundColor: `${accent}0D` }}
                >
                  Total {selection.horas}h
                </span>
              ) : (
                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                  Total 0h · informativo
                </span>
              )}
            </div>
            {selection.reconocimiento && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50/80 px-2 py-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Reconocimiento base
                </span>
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                  style={{ color: accent, borderColor: `${accent}35`, backgroundColor: '#FFFFFF' }}
                >
                  {formatConfiguredHourRecognition(
                    selection.reconocimiento,
                    selection.horas_base,
                  )}
                </span>
              </div>
            )}
            {selection.ramificaciones.length > 0 && (
              <div className="mt-2 border-t border-slate-100 pt-2">
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Opciones elegidas ({selection.ramificaciones.length})
                </div>
                <div className="grid gap-1.5">
                  {selection.ramificaciones.map((branch, branchIndex) => {
                    const levels = getHierarchyBranchDisplayLevels(branch);
                    const selectedLevel = levels[levels.length - 1];
                    const recognition = selectedLevel?.reconocimiento;
                    const recognitionLabel = recognition
                      ? formatConfiguredHourRecognition(recognition, branch.horas)
                      : branch.horas !== undefined
                        ? `${branch.horas}h`
                        : 'Detalle seleccionado';
                    return (
                      <div
                        key={`${branch.clave}:${branchIndex}`}
                        className="flex min-w-0 flex-wrap items-start gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                        <div className="min-w-0 flex-1">
                          <div className="break-words text-[11px] font-semibold leading-snug text-slate-700">
                            {selectedLevel?.valor || branch.nombre}
                          </div>
                          <div className="mt-0.5 break-words text-[9px] leading-snug text-slate-400">
                            {formatHierarchyBranchPath(branch)}
                          </div>
                        </div>
                        <span
                          className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold"
                          style={{ color: accent, borderColor: `${accent}35`, backgroundColor: `${accent}08` }}
                        >
                          {recognitionLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
