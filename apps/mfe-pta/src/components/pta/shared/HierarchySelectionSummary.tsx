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
      className={`rounded-lg ${className}`}
      style={{
        marginTop: 6,
        padding: compact ? '6px 8px' : '10px 12px',
        background: '#F8FAFC',
        border: '1px solid #CBD5E1',
        borderRadius: 6,
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
      data-pta-hierarchy-summary
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        marginBottom: 6,
        fontSize: '0.6rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        color: '#475569',
      }}>
        <GitBranch style={{ width: 12, height: 12, color: accent, flexShrink: 0 }} />
        <span>Desglose seleccionado</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {selections.map(selection => (
          <div
            key={selection.clave}
            style={{
              padding: compact ? '5px 7px' : '8px 10px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 5,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.54rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.02em' }}>
                  {selection.etiqueta}
                </div>
                <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#1E293B', lineHeight: 1.25, marginTop: 1, overflowWrap: 'anywhere' }}>
                  {selection.nombre}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                {selection.horas > 0 ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: `1px solid ${accent}45`,
                      background: `${accent}0D`,
                      color: accent,
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                    }}
                  >
                    Total {selection.horas}h
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: '1px solid #CBD5E1',
                      background: '#F1F5F9',
                      color: '#64748B',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                    }}
                  >
                    Total 0h · informativo
                  </span>
                )}
              </div>
            </div>
            {selection.reconocimiento && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 4,
                paddingTop: 4,
                borderTop: '1px dashed #E2E8F0',
                fontSize: '0.58rem',
              }}>
                <span style={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', fontSize: '0.54rem' }}>
                  Reconocimiento base:
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '1px 6px',
                    borderRadius: 4,
                    border: `1px solid ${accent}35`,
                    background: '#FFFFFF',
                    color: accent,
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatConfiguredHourRecognition(
                    selection.reconocimiento,
                    selection.horas_base,
                  )}
                </span>
              </div>
            )}
            {selection.ramificaciones.length > 0 && (
              <div style={{ marginTop: 6, paddingTop: 5, borderTop: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.54rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', marginBottom: 4 }}>
                  Opciones elegidas ({selection.ramificaciones.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {selection.ramificaciones.map((branch, branchIndex) => {
                    const levels = getHierarchyBranchDisplayLevels(branch);
                    const selectedLevel = levels[levels.length - 1];
                    const recognition = selectedLevel?.reconocimiento;
                    const effectiveHours = Number(branch.horas) > 0
                      ? Number(branch.horas)
                      : (Number(selection.horas) > 0
                          ? Number(selection.horas)
                          : undefined);
                    const recognitionLabel = recognition
                      ? formatConfiguredHourRecognition(recognition, effectiveHours)
                      : effectiveHours !== undefined
                        ? `${effectiveHours}h`
                        : 'Detalle seleccionado';
                    return (
                      <div
                        key={`${branch.clave}:${branchIndex}`}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6,
                          padding: '4px 6px',
                          borderRadius: 4,
                          border: '1px solid #E2E8F0',
                          background: '#F8FAFC',
                          boxSizing: 'border-box',
                        }}
                      >
                        <CheckCircle2 style={{ width: 12, height: 12, color: accent, flexShrink: 0, marginTop: 2 }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#334155', lineHeight: 1.25, overflowWrap: 'anywhere' }}>
                            {selectedLevel?.valor || branch.nombre}
                          </div>
                          <div style={{ fontSize: '0.54rem', color: '#94A3B8', marginTop: 1, overflowWrap: 'anywhere' }}>
                            {formatHierarchyBranchPath(branch)}
                          </div>
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '1px 6px',
                            borderRadius: 4,
                            border: `1px solid ${accent}35`,
                            background: `${accent}0D`,
                            color: accent,
                            fontSize: '0.58rem',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
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
