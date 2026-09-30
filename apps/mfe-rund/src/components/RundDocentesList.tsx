import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  Edit,
  CreditCard,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Building,
  Mail,
  Phone,
  BookOpen,
} from 'lucide-react';
import { DocenteRund } from '../types/rund.types';
import { rundService } from '../services/api/rundService';

interface Props {
  onSelectDocente: (docente: DocenteRund) => void;
  onEditDocente: (docente: DocenteRund) => void;
  onCreateNew: () => void;
  onEmitirTarjeta: (docente: DocenteRund) => void;
}

export const RundDocentesList: React.FC<Props> = ({
  onSelectDocente,
  onEditDocente,
  onCreateNew,
  onEmitirTarjeta,
}) => {
  const [docentes, setDocentes] = useState<DocenteRund[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEscalafon, setSelectedEscalafon] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadDocentes();
  }, [searchTerm, selectedEscalafon, selectedEstado, page]);

  const loadDocentes = async () => {
    try {
      setLoading(true);
      const res = await rundService.getDocentes({
        q: searchTerm || undefined,
        escalafonDocente: selectedEscalafon || undefined,
        estadoRund: selectedEstado || undefined,
        page,
        limit: 10,
      });
      setDocentes(res.items);
      setTotal(res.total);
    } catch (err) {
      console.warn('Cargando datos demostrativos para listado RUND');
      const mockDocentes: DocenteRund[] = [
        {
          idDocente: '1',
          numeroDocumento: '1014234567',
          tipoDocumento: 'CC',
          nombres: 'María Alejandra',
          apellidos: 'Restrepo Gómez',
          correoInstitucional: 'maria.restrepo@esap.edu.co',
          celular: '3114567890',
          departamentoNombre: 'Bogotá D.C.',
          municipioNombre: 'Bogotá D.C.',
          escalafonDocente: 'ASOCIADO',
          categoriaMinciencias: 'INVESTIGADOR_SENIOR',
          estadoRund: 'ACTIVO',
          numeroTarjetaRund: 'RUND-2026-001045',
          horasSemanalesMax: 40,
          sedePrincipalNombre: 'Sede Central Bogotá',
          esParEvaluador: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          idDocente: '2',
          numeroDocumento: '79845123',
          tipoDocumento: 'CC',
          nombres: 'Hernando José',
          apellidos: 'Vargas Silva',
          correoInstitucional: 'hernando.vargas@esap.edu.co',
          celular: '3209876543',
          departamentoNombre: 'Antioquia',
          municipioNombre: 'Medellín',
          escalafonDocente: 'TITULAR',
          categoriaMinciencias: 'EMERITO',
          estadoRund: 'ACTIVO',
          numeroTarjetaRund: 'RUND-2026-001046',
          horasSemanalesMax: 40,
          sedePrincipalNombre: 'Territorial Antioquia - Chocó',
          esParEvaluador: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          idDocente: '3',
          numeroDocumento: '52890456',
          tipoDocumento: 'CC',
          nombres: 'Claudia Patricia',
          apellidos: 'Morales Benítez',
          correoInstitucional: 'claudia.morales@esap.edu.co',
          celular: '3157891234',
          departamentoNombre: 'Valle del Cauca',
          municipioNombre: 'Cali',
          escalafonDocente: 'ASISTENTE',
          categoriaMinciencias: 'ASOCIADO',
          estadoRund: 'EN_REVISION',
          numeroTarjetaRund: 'RUND-2026-001047',
          horasSemanalesMax: 40,
          sedePrincipalNombre: 'Territorial Valle',
          esParEvaluador: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setDocentes(mockDocentes);
      setTotal(mockDocentes.length);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'ACTIVO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Activo
          </span>
        );
      case 'EN_REVISION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3 h-3" /> En Revisión
          </span>
        );
      case 'PENDIENTE_VALIDACION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3" /> Pendiente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Directorio Oficial de Docentes (RUND)</h2>
          <p className="text-xs text-slate-500">Consulta y administración de expedientes docentes con validez nacional</p>
        </div>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#003DA5] hover:bg-[#002b75] text-white text-xs font-semibold rounded-lg shadow transition"
        >
          <Plus className="w-4 h-4" /> Registrar Nuevo Docente
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido, cédula o correo..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedEscalafon}
            onChange={(e) => {
              setSelectedEscalafon(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
          >
            <option value="">Todos los Escalafones</option>
            <option value="TITULAR">Titular</option>
            <option value="ASOCIADO">Asociado</option>
            <option value="ASISTENTE">Asistente</option>
            <option value="INSTRUCTOR">Instructor</option>
          </select>

          <select
            value={selectedEstado}
            onChange={(e) => {
              setSelectedEstado(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
          >
            <option value="">Todos los Estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="EN_REVISION">En Revisión</option>
            <option value="PENDIENTE_VALIDACION">Pendiente Validación</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </div>

      {/* Tabla de Docentes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Docente</th>
                <th className="py-3 px-4">Identificación / RUND</th>
                <th className="py-3 px-4">Escalafón & Minciencias</th>
                <th className="py-3 px-4">Sede / Territorial</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#003DA5] mb-2"></div>
                    <p>Cargando información oficial RUND...</p>
                  </td>
                </tr>
              ) : docentes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No se encontraron docentes con los criterios ingresados.
                  </td>
                </tr>
              ) : (
                docentes.map((docente) => (
                  <tr key={docente.idDocente} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {docente.nombres} {docente.apellidos}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                        <Mail className="w-3 h-3" /> {docente.correoInstitucional || 'Sin correo asignado'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">
                        {docente.tipoDocumento} {docente.numeroDocumento}
                      </div>
                      <div className="text-[11px] font-mono text-[#003DA5] font-semibold">
                        {docente.numeroTarjetaRund || 'Pendiente generación'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{docente.escalafonDocente}</div>
                      <div className="text-[11px] text-emerald-600 font-medium">
                        {docente.categoriaMinciencias.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-slate-700">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {docente.sedePrincipalNombre || 'Sede Principal'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {docente.municipioNombre || 'Colombia'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(docente.estadoRund)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onSelectDocente(docente)}
                          title="Ver Expediente 360°"
                          className="p-1.5 text-slate-600 hover:text-[#003DA5] hover:bg-blue-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEmitirTarjeta(docente)}
                          title="Emitir Tarjeta Digital RUND"
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditDocente(docente)}
                          title="Editar Datos"
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
