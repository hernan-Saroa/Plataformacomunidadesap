/**
 * ExportadorReportesPTA — Utilidad de exportación de reportes PTA
 *
 * Componente reutilizable con botón y modal que permite exportar
 * datos tabulares en CSV, Excel (.xls con formato), JSON, PDF (impresión)
 * o copiarlos al portapapeles listos para pegar en Excel.
 * Permite elegir qué columnas exportar (todas por defecto).
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download, FileSpreadsheet, FileJson, X, CheckCircle, Copy,
  FileText, Columns3,
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportColumn {
  key: string;
  label: string;
  /** Recibe el valor crudo y opcionalmente la fila completa (para columnas calculadas) */
  formatter?: (value: any, row?: any) => string;
}

interface ExportadorProps {
  /** Datos a exportar (array de objetos) */
  data: any[];
  /** Columnas con keys y labels para headers */
  columns: ExportColumn[];
  /** Nombre del archivo sin extensión */
  filename: string;
  /** Título del reporte para el header del CSV */
  title?: string;
  /** Subtítulo/descripción */
  subtitle?: string;
  /** Variante del botón */
  variant?: 'button' | 'icon' | 'compact';
  /** Disabled */
  disabled?: boolean;
}

function cellValue(row: any, col: ExportColumn): string {
  if (col.formatter) return col.formatter(row[col.key], row) ?? '';
  const raw = row[col.key];
  return raw === null || raw === undefined ? '' : String(raw);
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHTML(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateCSV(data: any[], columns: ExportColumn[], title?: string, subtitle?: string): string {
  const BOM = String.fromCharCode(0xFEFF); // UTF-8 BOM for Excel compatibility
  const lines: string[] = [];

  // Header rows
  if (title) lines.push(escapeCSV(title));
  if (subtitle) lines.push(escapeCSV(subtitle));
  lines.push(`Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`);
  lines.push(`Total registros: ${data.length}`);
  lines.push(''); // Empty line separator

  // Column headers
  lines.push(columns.map(c => escapeCSV(c.label)).join(','));

  // Data rows
  data.forEach(row => {
    lines.push(columns.map(col => escapeCSV(cellValue(row, col))).join(','));
  });

  return BOM + lines.join('\r\n');
}

/** TSV sin metadatos — pega limpio en Excel/Sheets (cada campo en su celda) */
function generateTSV(data: any[], columns: ExportColumn[]): string {
  const sanitize = (s: string) => s.replace(/[\t\n\r]/g, ' ');
  const lines: string[] = [];
  lines.push(columns.map(c => sanitize(c.label)).join('\t'));
  data.forEach(row => {
    lines.push(columns.map(col => sanitize(cellValue(row, col))).join('\t'));
  });
  return lines.join('\r\n');
}

/** Tabla HTML compartida por el .xls y la vista de impresión */
function generateTableHTML(data: any[], columns: ExportColumn[]): string {
  const head = columns
    .map(c => `<th style="background:#003DA5;color:#ffffff;padding:6px 10px;border:1px solid #1E3A8A;font-size:12px;text-align:left;white-space:nowrap;">${escapeHTML(c.label)}</th>`)
    .join('');
  const body = data
    .map((row, i) => {
      const tds = columns
        .map(col => `<td style="padding:5px 10px;border:1px solid #D1D5DB;font-size:12px;">${escapeHTML(cellValue(row, col))}</td>`)
        .join('');
      return `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#F9FAFB'};">${tds}</tr>`;
    })
    .join('');
  return `<table style="border-collapse:collapse;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function generateExcelHTML(data: any[], columns: ExportColumn[], title?: string, subtitle?: string): string {
  const meta = `
    ${title ? `<p style="font-size:15px;font-weight:bold;color:#003DA5;margin:0;">${escapeHTML(title)}</p>` : ''}
    ${subtitle ? `<p style="font-size:12px;color:#374151;margin:2px 0 0;">${escapeHTML(subtitle)}</p>` : ''}
    <p style="font-size:11px;color:#6B7280;margin:2px 0 10px;">Generado: ${escapeHTML(new Date().toLocaleString('es-CO'))} · ${data.length} registros</p>
  `;
  return String.fromCharCode(0xFEFF) + `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Reporte</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body>${meta}${generateTableHTML(data, columns)}</body></html>`;
}

function generatePrintHTML(data: any[], columns: ExportColumn[], title?: string, subtitle?: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${escapeHTML(title || 'Reporte PTA')}</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; padding: 24px; }
  h1 { font-size: 17px; color: #003DA5; }
  .sub { font-size: 12px; color: #374151; margin-top: 2px; }
  .meta { font-size: 11px; color: #6B7280; margin: 4px 0 14px; }
  table { border-collapse: collapse; width: 100%; }
  th { background: #003DA5; color: white; padding: 6px 8px; border: 1px solid #1E3A8A; font-size: 10.5px; text-align: left; }
  td { padding: 5px 8px; border: 1px solid #D1D5DB; font-size: 10.5px; }
  tr:nth-child(even) td { background: #F9FAFB; }
  .pie { margin-top: 14px; font-size: 10px; color: #9CA3AF; }
  @media print {
    body { padding: 8px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1>${escapeHTML(title || 'Reporte PTA')}</h1>
  ${subtitle ? `<div class="sub">${escapeHTML(subtitle)}</div>` : ''}
  <div class="meta">Generado: ${escapeHTML(new Date().toLocaleString('es-CO'))} · ${data.length} registros</div>
  ${generateTableHTML(data, columns)}
  <div class="pie">Plataforma Comunidad ESAP — Plan de Trabajo Académico</div>
  <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 250); });</script>
</body>
</html>`;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const fechaArchivo = () => new Date().toISOString().slice(0, 10);

export function ExportadorReportesPTA({ data, columns, filename, title, subtitle, variant = 'button', disabled = false }: ExportadorProps) {
  const [showModal, setShowModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedCols, setSelectedCols] = useState<Set<string>>(() => new Set(columns.map(c => c.key)));

  // Si el consumidor cambia las columnas, re-seleccionar todas
  const colSignature = columns.map(c => c.key).join('|');
  useEffect(() => {
    setSelectedCols(new Set(columns.map(c => c.key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colSignature]);

  // Cerrar con Escape
  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showModal]);

  const activeColumns = useMemo(
    () => columns.filter(c => selectedCols.has(c.key)),
    [columns, selectedCols],
  );
  const noCols = activeColumns.length === 0;

  const toggleCol = (key: string) => {
    setSelectedCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const runExport = (fn: () => void, formato: string) => {
    if (noCols) { toast.error('Selecciona al menos una columna para exportar'); return; }
    setExporting(true);
    try {
      fn();
      toast.success(`Exportado ${formato} — ${data.length} registros, ${activeColumns.length} columnas`);
      setShowModal(false);
    } catch (error) {
      console.error(`Error exportando ${formato}:`, error);
      toast.error(`Error al exportar ${formato}`);
    }
    setExporting(false);
  };

  const handleExportCSV = () => runExport(() => {
    const csv = generateCSV(data, activeColumns, title, subtitle);
    downloadFile(csv, `${filename}_${fechaArchivo()}.csv`, 'text/csv;charset=utf-8');
  }, 'CSV');

  const handleExportExcel = () => runExport(() => {
    const html = generateExcelHTML(data, activeColumns, title, subtitle);
    downloadFile(html, `${filename}_${fechaArchivo()}.xls`, 'application/vnd.ms-excel;charset=utf-8');
  }, 'Excel');

  const handleExportJSON = () => runExport(() => {
    const jsonContent = JSON.stringify({
      metadata: { titulo: title, subtitulo: subtitle, generado: new Date().toISOString(), totalRegistros: data.length },
      columnas: activeColumns.map(c => ({ campo: c.key, etiqueta: c.label })),
      datos: data.map(row => Object.fromEntries(
        activeColumns.map(c => [c.key, c.formatter ? c.formatter(row[c.key], row) : (row[c.key] ?? null)]),
      )),
    }, null, 2);
    downloadFile(jsonContent, `${filename}_${fechaArchivo()}.json`, 'application/json;charset=utf-8');
  }, 'JSON');

  const handlePrintPDF = () => {
    if (noCols) { toast.error('Selecciona al menos una columna para exportar'); return; }
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('El navegador bloqueó la ventana', { description: 'Permite ventanas emergentes para exportar a PDF' });
      return;
    }
    w.document.write(generatePrintHTML(data, activeColumns, title, subtitle));
    w.document.close();
    toast.success('Vista de impresión abierta', { description: 'Usa "Guardar como PDF" en el diálogo de impresión' });
  };

  const handleCopyClipboard = async () => {
    if (noCols) { toast.error('Selecciona al menos una columna para exportar'); return; }
    try {
      const tsv = generateTSV(data, activeColumns);
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Datos copiados al portapapeles', { description: 'Listos para pegar directo en Excel o Google Sheets' });
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  };

  // Preview data (first 15 rows, todas las columnas seleccionadas)
  const previewData = data.slice(0, 15);

  const formatCards: Array<{ label: string; desc: string; icon: any; color: string; hoverBg: string; onClick: () => void }> = [
    { label: 'Excel', desc: 'Hoja .xls con formato', icon: FileSpreadsheet, color: '#059669', hoverBg: '#ECFDF5', onClick: handleExportExcel },
    { label: 'CSV', desc: 'Texto plano universal', icon: FileText, color: '#003DA5', hoverBg: '#EFF6FF', onClick: handleExportCSV },
    { label: 'JSON', desc: 'Datos estructurados', icon: FileJson, color: '#7C3AED', hoverBg: '#F3E8FF', onClick: handleExportJSON },
    { label: 'PDF', desc: 'Imprimir / guardar PDF', icon: Download, color: '#DC2626', hoverBg: '#FEF2F2', onClick: handlePrintPDF },
  ];

  const renderTrigger = () => {
    if (variant === 'icon') {
      return (
        <button
          onClick={() => setShowModal(true)}
          disabled={disabled || data.length === 0}
          title="Exportar reporte"
          style={{
            width: 36, height: 36, borderRadius: 8, border: '1px solid #D1D5DB',
            background: 'white', cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: disabled || data.length === 0 ? 0.5 : 1,
          }}
        >
          <Download style={{ width: 16, height: 16, color: '#6B7280' }} />
        </button>
      );
    }
    if (variant === 'compact') {
      return (
        <button
          onClick={() => setShowModal(true)}
          disabled={disabled || data.length === 0}
          style={{
            padding: '6px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
            background: 'white', cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem',
            fontWeight: 600, color: '#374151',
            opacity: disabled || data.length === 0 ? 0.5 : 1,
          }}
        >
          <Download style={{ width: 14, height: 14 }} />
          Exportar
        </button>
      );
    }
    return (
      <button
        onClick={() => setShowModal(true)}
        disabled={disabled || data.length === 0}
        style={{
          padding: '9px 18px', borderRadius: 10, border: '1px solid #003DA5',
          background: '#EFF6FF', cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem',
          fontWeight: 600, color: '#003DA5',
          opacity: disabled || data.length === 0 ? 0.5 : 1,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = '#003DA5'; e.currentTarget.style.color = 'white'; }}}
        onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#003DA5'; }}
      >
        <Download style={{ width: 16, height: 16 }} />
        Exportar Reporte ({data.length})
      </button>
    );
  };

  return (
    <>
      {renderTrigger()}

      <AnimatePresence>
        {showModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 70, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '104px 16px 48px',
            background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)',
          }} onClick={() => setShowModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: 16, width: '100%', maxWidth: 680,
                maxHeight: 'calc(100vh - 152px)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              }}
            >
              {/* Header */}
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Download style={{ width: 20, height: 20, color: '#003DA5' }} />
                    Exportar Reporte
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title || filename} — {data.length} registros{subtitle ? ` · ${subtitle}` : ''}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} title="Cerrar (Esc)" style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X style={{ width: 18, height: 18, color: '#6B7280' }} />
                </button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                {/* Format options */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
                  {formatCards.map(card => (
                    <button
                      key={card.label}
                      onClick={card.onClick}
                      disabled={exporting || noCols}
                      style={{
                        padding: '14px 10px', borderRadius: 12, border: '2px solid #E5E7EB',
                        background: 'white', cursor: exporting || noCols ? 'not-allowed' : 'pointer', textAlign: 'center',
                        opacity: noCols ? 0.5 : 1, transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!noCols) { e.currentTarget.style.borderColor = card.color; e.currentTarget.style.background = card.hoverBg; } }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = 'white'; }}
                    >
                      <card.icon style={{ width: 26, height: 26, color: card.color, margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{card.label}</div>
                      <div style={{ fontSize: '0.65rem', color: '#6B7280', marginTop: 2 }}>{card.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Copy to clipboard */}
                <button
                  onClick={handleCopyClipboard}
                  disabled={exporting || noCols}
                  style={{
                    width: '100%', padding: '9px 14px', borderRadius: 10, border: '1px dashed #D1D5DB',
                    background: copied ? '#ECFDF5' : '#FAFAFA', cursor: exporting || noCols ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    fontSize: '0.78rem', fontWeight: 600, color: copied ? '#059669' : '#4B5563',
                    opacity: noCols ? 0.5 : 1, transition: 'all 0.15s', marginBottom: 18,
                  }}
                >
                  {copied
                    ? <><CheckCircle style={{ width: 14, height: 14 }} /> ¡Copiado! Pégalo en Excel o Sheets</>
                    : <><Copy style={{ width: 14, height: 14 }} /> Copiar al portapapeles (pegar directo en Excel)</>}
                </button>

                {/* Column selection */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Columns3 style={{ width: 13, height: 13, color: '#6B7280' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>
                      Columnas a exportar ({activeColumns.length}/{columns.length})
                    </span>
                    <button
                      onClick={() => setSelectedCols(new Set(columns.map(c => c.key)))}
                      style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: '#003DA5', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setSelectedCols(new Set())}
                      style={{ border: 'none', background: 'transparent', color: '#9CA3AF', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                    >
                      Ninguna
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {columns.map(col => {
                      const active = selectedCols.has(col.key);
                      return (
                        <button
                          key={col.key}
                          onClick={() => toggleCol(col.key)}
                          style={{
                            padding: '3px 10px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 600,
                            border: `1px solid ${active ? '#93C5FD' : '#E5E7EB'}`,
                            background: active ? '#EFF6FF' : 'white',
                            color: active ? '#1E40AF' : '#9CA3AF',
                            cursor: 'pointer', transition: 'all 0.15s',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          {active && <CheckCircle style={{ width: 10, height: 10 }} />}
                          {col.label}
                        </button>
                      );
                    })}
                  </div>
                  {noCols && (
                    <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#DC2626', fontWeight: 600 }}>
                      Selecciona al menos una columna para poder exportar.
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div style={{ borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontSize: '0.78rem', fontWeight: 600, color: '#6B7280' }}>
                    Vista previa (primeros {previewData.length} de {data.length} registros · {activeColumns.length} columnas)
                  </div>
                  <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 300 }}>
                    {noCols ? (
                      <div style={{ padding: '18px 14px', textAlign: 'center', fontSize: '0.75rem', color: '#9CA3AF' }}>
                        Sin columnas seleccionadas.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.75rem' }}>
                        <thead>
                          <tr>
                            {activeColumns.map(col => (
                              <th key={col.key} style={{
                                padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#6B7280',
                                fontSize: '0.68rem', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E7EB',
                                position: 'sticky', top: 0, background: '#F9FAFB', zIndex: 1,
                              }}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, i) => (
                            <tr key={i}>
                              {activeColumns.map(col => (
                                <td key={col.key} style={{ padding: '6px 10px', color: '#374151', whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', borderBottom: '1px solid #F3F4F6' }} title={cellValue(row, col)}>
                                  {cellValue(row, col)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.75rem', color: '#1E40AF', lineHeight: 1.5 }}>
                  <strong>Nota:</strong> Excel y CSV incluyen BOM UTF-8 — tildes y eñes se preservan correctamente.
                  El PDF se genera desde el diálogo de impresión del navegador ("Guardar como PDF").
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
