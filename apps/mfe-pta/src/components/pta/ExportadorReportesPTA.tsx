/**
 * ExportadorReportesPTA — Utilidad de exportación CSV/Excel de reportes PTA
 *
 * Componente reutilizable con botón y modal que permite exportar
 * datos tabulares en CSV (compatible con Excel) o JSON.
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download, FileSpreadsheet, FileJson, X, CheckCircle, Copy,
  FileText, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: any) => string;
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

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV(data: any[], columns: ExportColumn[], title?: string, subtitle?: string): string {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
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
    const values = columns.map(col => {
      const rawValue = row[col.key];
      if (col.formatter) return escapeCSV(col.formatter(rawValue));
      return escapeCSV(rawValue);
    });
    lines.push(values.join(','));
  });

  return BOM + lines.join('\r\n');
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

export function ExportadorReportesPTA({ data, columns, filename, title, subtitle, variant = 'button', disabled = false }: ExportadorProps) {
  const [showModal, setShowModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewMode, setPreviewMode] = useState<'csv' | 'json'>('csv');

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const csv = generateCSV(data, columns, title, subtitle);
      downloadFile(csv, `${filename}_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8');
      toast.success(`Exportado: ${filename}.csv (${data.length} registros)`);
      setShowModal(false);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Error al exportar CSV');
    }
    setExporting(false);
  };

  const handleExportJSON = () => {
    setExporting(true);
    try {
      const jsonContent = JSON.stringify({
        metadata: { titulo: title, subtitulo: subtitle, generado: new Date().toISOString(), totalRegistros: data.length },
        columnas: columns.map(c => ({ campo: c.key, etiqueta: c.label })),
        datos: data,
      }, null, 2);
      downloadFile(jsonContent, `${filename}_${new Date().toISOString().slice(0,10)}.json`, 'application/json;charset=utf-8');
      toast.success(`Exportado: ${filename}.json (${data.length} registros)`);
      setShowModal(false);
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast.error('Error al exportar JSON');
    }
    setExporting(false);
  };

  const handleCopyClipboard = async () => {
    try {
      const csv = generateCSV(data, columns, title, subtitle);
      await navigator.clipboard.writeText(csv);
      toast.success('Datos copiados al portapapeles (formato CSV)');
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  };

  // Preview data (first 5 rows)
  const previewData = data.slice(0, 5);

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
            alignItems: 'center', justifyContent: 'center', padding: 16,
            background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)',
          }} onClick={() => setShowModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: 16, width: '100%', maxWidth: 640,
                maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              }}
            >
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Download style={{ width: 20, height: 20, color: '#003DA5' }} />
                    Exportar Reporte
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>{title || filename} — {data.length} registros</p>
                </div>
                <button onClick={() => setShowModal(false)} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X style={{ width: 18, height: 18, color: '#6B7280' }} />
                </button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                {/* Format options */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                  <button
                    onClick={handleExportCSV}
                    disabled={exporting}
                    style={{
                      padding: '16px 14px', borderRadius: 12, border: '2px solid #E5E7EB',
                      background: 'white', cursor: 'pointer', textAlign: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#003DA5'; e.currentTarget.style.background = '#EFF6FF'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = 'white'; }}
                  >
                    <FileSpreadsheet style={{ width: 28, height: 28, color: '#059669', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>CSV / Excel</div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>Compatible con Excel</div>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    disabled={exporting}
                    style={{
                      padding: '16px 14px', borderRadius: 12, border: '2px solid #E5E7EB',
                      background: 'white', cursor: 'pointer', textAlign: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.background = '#F3E8FF'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = 'white'; }}
                  >
                    <FileJson style={{ width: 28, height: 28, color: '#7C3AED', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>JSON</div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>Datos estructurados</div>
                  </button>
                  <button
                    onClick={handleCopyClipboard}
                    style={{
                      padding: '16px 14px', borderRadius: 12, border: '2px solid #E5E7EB',
                      background: 'white', cursor: 'pointer', textAlign: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#D97706'; e.currentTarget.style.background = '#FFFBEB'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = 'white'; }}
                  >
                    <Copy style={{ width: 28, height: 28, color: '#D97706', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>Copiar</div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>Al portapapeles</div>
                  </button>
                </div>

                {/* Preview */}
                <div style={{ borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontSize: '0.78rem', fontWeight: 600, color: '#6B7280' }}>
                    Vista previa (primeros {previewData.length} de {data.length} registros)
                  </div>
                  <div style={{ overflowX: 'auto', maxHeight: 220 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead>
                        <tr style={{ background: '#F9FAFB' }}>
                          {columns.slice(0, 6).map(col => (
                            <th key={col.key} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#6B7280', fontSize: '0.68rem', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E7EB' }}>{col.label}</th>
                          ))}
                          {columns.length > 6 && <th style={{ padding: '6px 10px', color: '#9CA3AF', fontSize: '0.68rem', borderBottom: '1px solid #E5E7EB' }}>+{columns.length - 6}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            {columns.slice(0, 6).map(col => (
                              <td key={col.key} style={{ padding: '6px 10px', color: '#374151', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {col.formatter ? col.formatter(row[col.key]) : String(row[col.key] ?? '')}
                              </td>
                            ))}
                            {columns.length > 6 && <td style={{ padding: '6px 10px', color: '#D1D5DB' }}>...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Info */}
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.78rem', color: '#1E40AF' }}>
                  <strong>Nota:</strong> El archivo CSV incluye BOM UTF-8 para compatibilidad completa con Excel. Los caracteres especiales (tildes, eñes) se preservan correctamente.
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
