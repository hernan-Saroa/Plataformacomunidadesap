import React, { useState } from 'react';
import {
  ArrowLeft,
  User,
  GraduationCap,
  Briefcase,
  BookOpen,
  FileCheck,
  AlertTriangle,
  CreditCard,
  Building,
  Mail,
  Phone,
  MapPin,
  Award,
  CheckCircle2,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { DocenteRund } from '../types/rund.types';

interface Props {
  docente: DocenteRund;
  onBack: () => void;
  onEdit: (docente: DocenteRund) => void;
  onEmitirTarjeta: (docente: DocenteRund) => void;
}

export const RundDocente360Detail: React.FC<Props> = ({
  docente,
  onBack,
  onEdit,
  onEmitirTarjeta,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'formacion' | 'experiencia' | 'produccion' | 'situaciones' | 'soportes'>('info');

  return (
    <div className="space-y-6">
      {/* Top Bar / Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#003DA5] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Directorio RUND
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEmitirTarjeta(docente)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow transition"
          >
            <CreditCard className="w-4 h-4" /> Tarjeta Digital RUND
          </button>
          <button
            onClick={() => onEdit(docente)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-sm transition"
          >
            Editar Perfil
          </button>
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#003DA5] to-[#0ea5e9] text-white flex items-center justify-center font-bold text-2xl shadow-md">
            {docente.nombres.charAt(0)}{docente.apellidos.charAt(0)}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {docente.nombres} {docente.apellidos}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#003DA5] border border-blue-200 font-mono">
                {docente.numeroTarjetaRund || 'RUND EN TRÁMITE'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {docente.estadoRund}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
              <span>{docente.tipoDocumento}: <strong>{docente.numeroDocumento}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {docente.correoInstitucional || 'Sin correo institucional'}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> {docente.sedePrincipalNombre || 'Sede Central'}</span>
            </p>
          </div>
        </div>

        {/* Sub-pestañas */}
        <div className="mt-6 flex border-b border-slate-200 overflow-x-auto gap-2">
          {[
            { id: 'info', label: 'Datos Generales', icon: User },
            { id: 'formacion', label: 'Formación Académica', icon: GraduationCap, count: docente.formaciones?.length },
            { id: 'experiencia', label: 'Experiencia & Docencia', icon: Briefcase, count: docente.experiencias?.length },
            { id: 'produccion', label: 'Producción Intelectual', icon: BookOpen, count: docente.producciones?.length },
            { id: 'situaciones', label: 'Situaciones Admin.', icon: AlertTriangle, count: docente.situaciones?.length },
            { id: 'soportes', label: 'Soportes & Validación', icon: FileCheck, count: docente.soportes?.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-[#003DA5] text-[#003DA5]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b pb-2">Información de Contacto & Ubicación</h3>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <span className="text-slate-400">Teléfono / Celular:</span>
                <span className="font-medium text-slate-900">{docente.celular || docente.telefono || 'No registrado'}</span>
                <span className="text-slate-400">Correo Personal:</span>
                <span className="font-medium text-slate-900">{docente.correoPersonal || 'No registrado'}</span>
                <span className="text-slate-400">Dirección:</span>
                <span className="font-medium text-slate-900">{docente.direccion || 'No registrada'}</span>
                <span className="text-slate-400">Departamento / Municipio:</span>
                <span className="font-medium text-slate-900">{docente.departamentoNombre || ''} - {docente.municipioNombre || ''}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b pb-2">Régimen & Parámetros Académicos</h3>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <span className="text-slate-400">Escalafón Docente:</span>
                <span className="font-semibold text-slate-900">{docente.escalafonDocente}</span>
                <span className="text-slate-400">Categoría Minciencias:</span>
                <span className="font-semibold text-emerald-700">{docente.categoriaMinciencias.replace('_', ' ')}</span>
                <span className="text-slate-400">Horas Semanales Máximas:</span>
                <span className="font-medium text-slate-900">{docente.horasSemanalesMax} horas</span>
                <span className="text-slate-400">Par Evaluador:</span>
                <span className="font-medium text-slate-900">{docente.esParEvaluador ? 'Sí (Acreditado)' : 'No'}</span>
                <span className="text-slate-400">Fecha Ingreso ESAP:</span>
                <span className="font-medium text-slate-900">{docente.fechaIngresoEsap || 'No registrada'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'formacion' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Títulos y Grados Académicos</h3>
            {docente.formaciones && docente.formaciones.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {docente.formaciones.map((f) => (
                  <div key={f.idFormacion} className="py-3 flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 text-xs">{f.tituloObtenido}</div>
                      <div className="text-slate-500 text-[11px]">{f.institucion} • {f.pais} ({f.anoGraduacion})</div>
                      <div className="text-[11px] text-blue-600 font-medium mt-0.5">{f.nivelEducativo}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {f.estadoValidacion}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-xs py-4">No hay títulos académicos registrados.</p>
            )}
          </div>
        )}

        {activeTab === 'experiencia' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Trayectoria Docente y Profesional</h3>
            {docente.experiencias && docente.experiencias.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {docente.experiencias.map((exp) => (
                  <div key={exp.idExperiencia} className="py-3 flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 text-xs">{exp.cargoAsignatura}</div>
                      <div className="text-slate-500 text-[11px]">{exp.institucionEmpresa}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {exp.fechaInicio} hasta {exp.esActual ? 'Actualidad' : exp.fechaFin} • {exp.horasSemanales} hrs/sem
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#003DA5]">
                      {exp.tipoExperiencia.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-xs py-4">No hay experiencia registrada.</p>
            )}
          </div>
        )}

        {activeTab === 'produccion' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Publicaciones y Producción Científica</h3>
            {docente.producciones && docente.producciones.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {docente.producciones.map((p) => (
                  <div key={p.idProduccion} className="py-3 flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 text-xs">{p.titulo}</div>
                      <div className="text-slate-500 text-[11px]">{p.revistaEditorial} ({p.anoPublicacion}) {p.issnIsbn ? `• ISBN/ISSN: ${p.issnIsbn}` : ''}</div>
                      <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{p.tipoProduccion} {p.indexacionTipo ? `• ${p.indexacionTipo}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-xs py-4">No hay producción intelectual registrada.</p>
            )}
          </div>
        )}

        {activeTab === 'situaciones' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Historial de Situaciones Administrativas y Novedades</h3>
            {docente.situaciones && docente.situaciones.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {docente.situaciones.map((s) => (
                  <div key={s.idSituacion} className="py-3 flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 text-xs">{s.tipoNovedad.replace('_', ' ')}</div>
                      <div className="text-slate-500 text-[11px]">Acto Admin: {s.numeroActoAdministrativo || 'S/N'} • {s.fechaInicio} a {s.fechaFin || 'Indefinido'}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                      {s.estado}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-xs py-4">No hay situaciones administrativas registradas.</p>
            )}
          </div>
        )}

        {activeTab === 'soportes' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Expediente de Soportes Digitales Validados</h3>
            {docente.soportes && docente.soportes.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {docente.soportes.map((sop) => (
                  <div key={sop.idSoporte} className="py-3 flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 text-xs">{sop.nombreArchivo}</div>
                      <div className="text-slate-500 text-[11px]">{sop.tipoDocumento} • Categoría: {sop.categoria}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                      {sop.estadoValidacion}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-xs py-4">No hay soportes digitales en el expediente.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
