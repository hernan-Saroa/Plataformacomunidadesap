/**
 * ============================================
 * MODAL EXPEDIENTE AUDITORÍA - WORLD CLASS
 * ============================================
 * 
 * Modal estandarizado para mostrar el expediente completo de auditoría
 * Utiliza el componente ModalWorldClass como base
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Enero 2025
 */

import { useState } from 'react';
import {
  FileText, Calendar, Users, Target, AlertTriangle,
  Clock, CheckCircle, Download, MapPin, Activity,
  ChevronRight, TrendingUp, Shield, Hash
} from 'lucide-react';
import { ModalWorldClass, type ModalBadge } from './ModalWorldClass';
import { Badge } from '../../ui/badge';
import { motion } from 'motion/react';

// ============ TIPOS ============

type EstadoAuditoria = 'Planeación' | 'Ejecución' | 'Comunicación' | 'Seguimiento' | 'Finalizada';
type RiesgoAuditoria = 'Alto' | 'Medio' | 'Bajo';

interface Persona {
  nombre: string;
  cargo: string;
  iniciales: string;
}

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  estado: EstadoAuditoria;
  riesgo: RiesgoAuditoria;
  territorial: string;
  auditorLider: Persona;
  auditorAsignado: Persona;
  fechaInicio: string;
  fechaFin: string;
  progreso: number;
  hallazgos: number;
  diasRestantes: number;
  objetivos: { id: string; descripcion: string }[];
  documentos: number;
}

interface ModalExpedienteAuditoriaProps {
  isOpen: boolean;
  onClose: () => void;
  auditoria: Auditoria | null;
}

// ============ COMPONENTE PRINCIPAL ============

export function ModalExpedienteAuditoriaWorldClass({
  isOpen,
  onClose,
  auditoria
}: ModalExpedienteAuditoriaProps) {
  const [tabActiva, setTabActiva] = useState<'general' | 'equipo' | 'hallazgos' | 'documentos'>('general');

  if (!auditoria) return null;

  // Badges dinámicos
  const badges: ModalBadge[] = [
    {
      label: auditoria.estado,
      variant: 
        auditoria.estado === 'Finalizada' ? 'success' :
        auditoria.estado === 'Ejecución' ? 'primary' :
        auditoria.estado === 'Planeación' ? 'info' :
        'warning'
    },
    {
      label: `${auditoria.progreso}% Completado`,
      icon: <Activity className="w-3.5 h-3.5" />,
      variant: 
        auditoria.progreso >= 80 ? 'success' :
        auditoria.progreso >= 50 ? 'warning' :
        'danger'
    },
    {
      label: `${auditoria.hallazgos} Hallazgos`,
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      variant: auditoria.hallazgos > 5 ? 'danger' : 'warning'
    }
  ];

  return (
    <ModalWorldClass
      isOpen={isOpen}
      onClose={onClose}
      titulo={auditoria.titulo}
      codigo={auditoria.codigo}
      icono={<FileText className="w-6 h-6" />}
      badges={badges}
      size="xl"
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{auditoria.diasRestantes} días restantes</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => console.log('Exportar PDF')}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      }
    >
      {/* Tabs de navegación */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-4">
        <TabButton
          active={tabActiva === 'general'}
          onClick={() => setTabActiva('general')}
          icon={<FileText className="w-4 h-4" />}
          label="Información General"
        />
        <TabButton
          active={tabActiva === 'equipo'}
          onClick={() => setTabActiva('equipo')}
          icon={<Users className="w-4 h-4" />}
          label="Equipo Auditor"
        />
        <TabButton
          active={tabActiva === 'hallazgos'}
          onClick={() => setTabActiva('hallazgos')}
          icon={<AlertTriangle className="w-4 h-4" />}
          label={`Hallazgos (${auditoria.hallazgos})`}
        />
        <TabButton
          active={tabActiva === 'documentos'}
          onClick={() => setTabActiva('documentos')}
          icon={<FileText className="w-4 h-4" />}
          label={`Documentos (${auditoria.documentos})`}
        />
      </div>

      {/* Contenido según tab activa */}
      {tabActiva === 'general' && <TabGeneral auditoria={auditoria} />}
      {tabActiva === 'equipo' && <TabEquipo auditoria={auditoria} />}
      {tabActiva === 'hallazgos' && <TabHallazgos auditoria={auditoria} />}
      {tabActiva === 'documentos' && <TabDocumentos auditoria={auditoria} />}
    </ModalWorldClass>
  );
}

// ============ COMPONENTES DE TABS ============

function TabButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
        ${active 
          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
          : 'text-gray-600 hover:bg-gray-50'
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}

function TabGeneral({ auditoria }: { auditoria: Auditoria }) {
  return (
    <div className="space-y-6">
      {/* Información básica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoCard
          icon={<Hash className="w-5 h-5" />}
          label="Código de Auditoría"
          value={auditoria.codigo}
        />
        <InfoCard
          icon={<MapPin className="w-5 h-5" />}
          label="Territorial"
          value={auditoria.territorial}
        />
        <InfoCard
          icon={<Calendar className="w-5 h-5" />}
          label="Fecha de Inicio"
          value={auditoria.fechaInicio}
        />
        <InfoCard
          icon={<Calendar className="w-5 h-5" />}
          label="Fecha de Fin"
          value={auditoria.fechaFin}
        />
      </div>

      {/* Descripción */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Descripción</h3>
        <p className="text-sm text-gray-700">{auditoria.descripcion}</p>
      </div>

      {/* Objetivos */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600" />
          Objetivos de la Auditoría
        </h3>
        <div className="space-y-2">
          {auditoria.objetivos.map((obj, index) => (
            <div key={obj.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                {index + 1}
              </div>
              <p className="text-sm text-gray-700 flex-1">{obj.descripcion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Progreso */}
      <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-blue-900">Progreso General</h3>
          <span className="text-2xl font-bold text-blue-700">{auditoria.progreso}%</span>
        </div>
        <div className="w-full h-3 bg-white rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${auditoria.progreso}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

function TabEquipo({ auditoria }: { auditoria: Auditoria }) {
  const miembros = [
    { persona: auditoria.auditorLider, rol: 'Auditor Líder', principal: true },
    { persona: auditoria.auditorAsignado, rol: 'Auditor Asignado', principal: false }
  ];

  return (
    <div className="space-y-4">
      {miembros.map((miembro, index) => (
        <div
          key={index}
          className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
        >
          {/* Avatar */}
          <div className={`
            flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-medium shadow-md
            ${miembro.principal 
              ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
              : 'bg-gradient-to-br from-gray-500 to-gray-600'
            }
          `}>
            {miembro.persona.iniciales}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-gray-900">
                {miembro.persona.nombre}
              </h4>
              {miembro.principal && (
                <Badge variant="default" size="sm">Principal</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">{miembro.persona.cargo}</p>
            <p className="text-xs text-gray-500 mt-1">{miembro.rol}</p>
          </div>

          {/* Indicador */}
          <div className="flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TabHallazgos({ auditoria }: { auditoria: Auditoria }) {
  // Datos de ejemplo
  const hallazgos = [
    {
      id: 'h1',
      codigo: 'H-001',
      titulo: 'Falta de documentación en proceso administrativo',
      tipo: 'Documental',
      riesgo: 'Alto',
      estado: 'Abierto'
    },
    {
      id: 'h2',
      codigo: 'H-002',
      titulo: 'Incumplimiento de plazos en gestión financiera',
      tipo: 'Procedimiento',
      riesgo: 'Medio',
      estado: 'En revisión'
    }
  ];

  return (
    <div className="space-y-4">
      {hallazgos.map((hallazgo) => (
        <div
          key={hallazgo.id}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-orange-300 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">{hallazgo.titulo}</h4>
                <p className="text-xs text-gray-600 mt-1">{hallazgo.codigo}</p>
              </div>
            </div>
            <Badge 
              variant={hallazgo.riesgo === 'Alto' ? 'danger' : 'warning'}
              size="sm"
            >
              {hallazgo.riesgo}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              {hallazgo.tipo}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              {hallazgo.estado}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TabDocumentos({ auditoria }: { auditoria: Auditoria }) {
  const documentos = [
    { nombre: 'Plan de Auditoría.pdf', fecha: '15/01/2025', tamaño: '1.2 MB' },
    { nombre: 'Matriz de Riesgos.xlsx', fecha: '18/01/2025', tamaño: '450 KB' },
    { nombre: 'Evidencias Fotográficas.zip', fecha: '20/01/2025', tamaño: '5.8 MB' }
  ];

  return (
    <div className="space-y-3">
      {documentos.map((doc, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">{doc.nombre}</h4>
              <p className="text-xs text-gray-600">{doc.fecha} • {doc.tamaño}</p>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ============ COMPONENTE AUXILIAR ============

function InfoCard({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 text-gray-600 mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-sm text-gray-900 font-medium">{value}</p>
    </div>
  );
}
