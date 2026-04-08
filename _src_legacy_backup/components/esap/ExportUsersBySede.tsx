/**
 * COMPONENTE - EXPORTAR USUARIOS POR SEDE
 * Genera reportes en Excel/CSV filtrados por estructura territorial
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Building2,
  X,
  CheckCircle,
  Filter
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { SelectorEstructuraCompacto } from '../estructura-organizacional/SelectorEstructura';
import { Badge } from '../ui/badge';

interface ExportUsersBySedeProps {
  isOpen: boolean;
  onClose: () => void;
  usuarios: any[];
}

export function ExportUsersBySede({ isOpen, onClose, usuarios }: ExportUsersBySedeProps) {
  const [selectedSede, setSelectedSede] = useState<string | undefined>(undefined);
  const [formato, setFormato] = useState<'excel' | 'csv'>('excel');
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [incluirSedesSecundarias, setIncluirSedesSecundarias] = useState(false);

  const usuariosFiltrados = usuarios.filter(usuario => {
    // Filtro por estado
    if (!incluirInactivos && usuario.status !== 'active') return false;

    // Filtro por sede
    if (!selectedSede || selectedSede === 'todas') return true;

    if (!usuario.asignacionesSedes || usuario.asignacionesSedes.length === 0) return false;

    if (incluirSedesSecundarias) {
      // Incluir si tiene la sede como principal o secundaria
      return usuario.asignacionesSedes.some((a: any) => a.unidadId === selectedSede);
    } else {
      // Solo incluir si es sede principal
      return usuario.asignacionesSedes.some((a: any) => 
        a.unidadId === selectedSede && a.esPrincipal
      );
    }
  });

  const handleExport = () => {
    if (!selectedSede || selectedSede === 'todas') {
      toast.error('Seleccione una sede específica');
      return;
    }

    // Preparar datos para exportar
    const data = usuariosFiltrados.map(usuario => {
      const sedePrincipal = usuario.asignacionesSedes?.find((a: any) => a.esPrincipal);
      const sedesSecundarias = usuario.asignacionesSedes?.filter((a: any) => !a.esPrincipal) || [];

      return {
        'Documento': usuario.document,
        'Nombre Completo': `${usuario.firstName} ${usuario.lastName}`,
        'Email': usuario.email,
        'Teléfono': usuario.phone || 'N/A',
        'Roles': usuario.roles.map((r: any) => r.name).join(', '),
        'Estado': usuario.status === 'active' ? 'Activo' : 'Inactivo',
        'Sede Principal': sedePrincipal?.unidad?.nombre || 'Sin sede',
        'Código Sede': sedePrincipal?.unidad?.codigo || 'N/A',
        'Ámbito Acceso': sedePrincipal?.ambitoAcceso || 'N/A',
        'Sedes Secundarias': sedesSecundarias.length,
        'Última Actividad': usuario.lastActivity ? new Date(usuario.lastActivity).toLocaleDateString('es-CO') : 'N/A',
        'Ubicación': usuario.location || 'N/A'
      };
    });

    // Simular exportación
    const sedeNombre = usuarios
      .flatMap(u => u.asignacionesSedes || [])
      .find((a: any) => a.unidadId === selectedSede)?.unidad?.nombre || 'Sede';

    const fileName = `usuarios_${sedeNombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;

    if (formato === 'excel') {
      // Simular descarga de Excel
      toast.success('Exportación Exitosa', {
        description: `${data.length} usuarios exportados a ${fileName}.xlsx`,
        icon: <FileSpreadsheet className="w-5 h-5 text-green-600" />
      });
    } else {
      // Simular descarga de CSV
      const csv = convertToCSV(data);
      downloadCSV(csv, fileName);
      toast.success('Exportación Exitosa', {
        description: `${data.length} usuarios exportados a ${fileName}.csv`,
        icon: <FileText className="w-5 h-5 text-green-600" />
      });
    }

    console.log('Exportando:', { formato, data });
    onClose();
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  };

  const downloadCSV = (csv: string, fileName: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-2xl"
              style={{ boxShadow: 'var(--esap-shadow-2xl)' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="px-6 py-5 border-b border-gray-200"
                style={{ background: 'linear-gradient(to bottom, #F9FAFB 0%, #FFFFFF 100%)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        boxShadow: 'var(--esap-shadow-md)'
                      }}
                    >
                      <Download className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Exportar Usuarios por Sede</h2>
                      <p className="text-sm text-gray-600">Genere reportes filtrados por estructura territorial</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Selector de Sede */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Seleccionar Sede *
                  </label>
                  <SelectorEstructuraCompacto
                    value={selectedSede}
                    onChange={setSelectedSede}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Seleccione la sede específica para el reporte
                  </p>
                </div>

                {/* Formato */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Formato de Exportación
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setFormato('excel')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formato === 'excel'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileSpreadsheet 
                        className={`w-8 h-8 mx-auto mb-2 ${
                          formato === 'excel' ? 'text-green-600' : 'text-gray-400'
                        }`}
                      />
                      <p className="font-semibold text-sm text-gray-900">Excel (.xlsx)</p>
                      <p className="text-xs text-gray-500">Formato completo</p>
                    </button>

                    <button
                      onClick={() => setFormato('csv')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formato === 'csv'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileText 
                        className={`w-8 h-8 mx-auto mb-2 ${
                          formato === 'csv' ? 'text-green-600' : 'text-gray-400'
                        }`}
                      />
                      <p className="font-semibold text-sm text-gray-900">CSV (.csv)</p>
                      <p className="text-xs text-gray-500">Datos planos</p>
                    </button>
                  </div>
                </div>

                {/* Opciones */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Opciones de Filtrado
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={incluirInactivos}
                      onChange={(e) => setIncluirInactivos(e.target.checked)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-medium text-sm text-gray-900">Incluir usuarios inactivos</p>
                      <p className="text-xs text-gray-500">Exportar también usuarios con estado inactivo o bloqueado</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={incluirSedesSecundarias}
                      onChange={(e) => setIncluirSedesSecundarias(e.target.checked)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-medium text-sm text-gray-900">Incluir sedes secundarias</p>
                      <p className="text-xs text-gray-500">Exportar usuarios que tengan la sede como principal o secundaria</p>
                    </div>
                  </label>
                </div>

                {/* Preview */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="w-4 h-4 text-blue-600" />
                    <p className="font-semibold text-sm text-blue-900">Vista Previa</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">Usuarios a exportar:</span>
                    <Badge className="bg-blue-600 text-white">
                      {usuariosFiltrados.length} usuarios
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-5 py-3 border border-gray-300 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <motion.button
                  onClick={handleExport}
                  disabled={!selectedSede || selectedSede === 'todas'}
                  className="flex-1 px-5 py-3 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    boxShadow: 'var(--esap-shadow-md)'
                  }}
                  whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download className="w-4 h-4" />
                  Exportar {formato.toUpperCase()}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
