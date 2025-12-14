/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * GUÍA DE CONTEXTO UNIVERSITARIO PARA MRAE v3.0
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Componente que explica cómo aplicar cada lineamiento MinTIC
 * en el contexto de una institución de educación superior (ESAP)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  GraduationCap,
  Building2,
  Users,
  Shield,
  Network,
  FileText,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  ChevronRight,
  Lightbulb,
  Target,
  Zap,
  Award,
  TrendingUp
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  CONTEXTO_ESAP,
  DOMINIOS_UNIVERSITARIOS,
  EVIDENCIAS_UNIVERSITARIAS,
  CASOS_USO_UNIVERSITARIOS,
  GLOSARIO_UNIVERSITARIO
} from '../../lib/data/configuracion-esap-universidad';

interface GuiaContextoUniversitarioProps {
  lineamientoCodigo?: string;
  onClose?: () => void;
}

export function GuiaContextoUniversitario({ 
  lineamientoCodigo,
  onClose 
}: GuiaContextoUniversitarioProps) {
  const [activeTab, setActiveTab] = useState<'contexto' | 'ejemplos' | 'evidencias' | 'glosario'>('contexto');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#0052CC] p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Guía de Contexto Universitario</h2>
                <p className="text-white/90 mt-1">
                  MRAE v3.0 MinTIC adaptado para ESAP - Institución de Educación Superior
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Stats ESAP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <p className="text-white/70 text-xs">Estudiantes</p>
              <p className="text-xl font-bold">{CONTEXTO_ESAP.poblacion.estudiantes.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <p className="text-white/70 text-xs">Docentes</p>
              <p className="text-xl font-bold">{CONTEXTO_ESAP.poblacion.docentes.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <p className="text-white/70 text-xs">Territoriales</p>
              <p className="text-xl font-bold">{CONTEXTO_ESAP.estructura.territoriales}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <p className="text-white/70 text-xs">CETAPs</p>
              <p className="text-xl font-bold">{CONTEXTO_ESAP.estructura.cetaps}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b-2 border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            <TabButton
              active={activeTab === 'contexto'}
              onClick={() => setActiveTab('contexto')}
              icon={Building2}
              label="Contexto ESAP"
            />
            <TabButton
              active={activeTab === 'ejemplos'}
              onClick={() => setActiveTab('ejemplos')}
              icon={Lightbulb}
              label="Ejemplos Prácticos"
            />
            <TabButton
              active={activeTab === 'evidencias'}
              onClick={() => setActiveTab('evidencias')}
              icon={FileText}
              label="Evidencias"
            />
            <TabButton
              active={activeTab === 'glosario'}
              onClick={() => setActiveTab('glosario')}
              icon={BookOpen}
              label="Glosario"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <AnimatePresence mode="wait">
            {activeTab === 'contexto' && <TabContexto />}
            {activeTab === 'ejemplos' && <TabEjemplos />}
            {activeTab === 'evidencias' && <TabEvidencias />}
            {activeTab === 'glosario' && <TabGlosario />}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-[#003DA5] text-[#003DA5] bg-white'
          : 'border-transparent text-gray-600 hover:text-[#003DA5] hover:bg-gray-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

function TabContexto() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Información Institucional */}
      <Card className="p-6 border-2 border-blue-200 bg-blue-50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Building2 className="w-6 h-6 text-[#003DA5]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {CONTEXTO_ESAP.nombreCompleto} ({CONTEXTO_ESAP.sigla})
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              <strong>Tipo:</strong> {CONTEXTO_ESAP.naturaleza}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Sector</p>
                <p className="font-semibold">{CONTEXTO_ESAP.sector}</p>
              </div>
              <div>
                <p className="text-gray-600">Cobertura</p>
                <p className="font-semibold">Nacional (17 Territoriales + 307 CETAPs)</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Procesos Misionales */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-[#003DA5]" />
          Procesos Misionales Académicos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONTEXTO_ESAP.procesosMisionales.map((proceso, index) => (
            <Card key={index} className="p-4 border-2 border-gray-200 hover:border-[#003DA5] transition-colors">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="font-semibold text-gray-900">{proceso}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Sistemas de Información */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Network className="w-5 h-5 text-[#003DA5]" />
          Sistemas de Información Académica
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CONTEXTO_ESAP.sistemasAcademicos.slice(0, 9).map((sistema, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <ChevronRight className="w-4 h-4 text-[#003DA5]" />
              <span className="text-gray-700">{sistema}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Diferencias vs Empresa Tradicional */}
      <Card className="p-6 border-2 border-yellow-200 bg-yellow-50">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-gray-900 mb-2">
              📚 Diferencias con una Empresa Tradicional
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span><strong>Usuarios:</strong> No son "clientes", son estudiantes, docentes, administrativos con diferentes roles académicos</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span><strong>Procesos:</strong> Giran en torno a la academia: admisiones, matrículas, calificaciones, grados, investigación</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span><strong>Regulación:</strong> MEN (Ministerio de Educación), CNA (Acreditación), SNIES, no solo MinTIC</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span><strong>Evidencias:</strong> PEI, PEP, Reglamento Académico, Registro Calificado, Acreditación CNA</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span><strong>Sistemas:</strong> SGA, LMS, Biblioteca Digital, Portal Estudiantil (no ERP corporativo tradicional)</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function TabEjemplos() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-900">
            <strong>Casos de uso reales</strong> de cómo aplicar lineamientos MRAE en procesos académicos de ESAP
          </p>
        </div>
      </div>

      {CASOS_USO_UNIVERSITARIOS.map((caso) => (
        <Card key={caso.id} className="p-6 border-2 border-gray-200 hover:border-[#003DA5] transition-all">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Zap className="w-6 h-6 text-[#003DA5]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-gray-900">{caso.nombre}</h3>
                <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                  {caso.id}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">{caso.descripcion}</p>
              
              {/* Actores */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">👥 Actores:</p>
                <div className="flex flex-wrap gap-2">
                  {caso.actores.map((actor, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                      {actor}
                    </span>
                  ))}
                </div>
              </div>

              {/* Flujo */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">📋 Flujo:</p>
                <ol className="space-y-1">
                  {caso.flujo.map((paso, index) => (
                    <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                      <ChevronRight className="w-3 h-3 text-[#003DA5] mt-0.5 flex-shrink-0" />
                      {paso}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Lineamientos Relacionados */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">🔗 Lineamientos Relacionados:</p>
                <div className="flex flex-wrap gap-2">
                  {caso.lineamientos.map((lin, index) => (
                    <Badge key={index} className="bg-green-100 text-green-700 border-green-300 text-xs">
                      {lin}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}

      {/* Ejemplos de Aplicación por Dominio */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          Ejemplos de Aplicación por Dominio
        </h3>

        <div className="space-y-4">
          {/* Estrategia */}
          <Card className="p-5 border-2 border-purple-200 bg-purple-50">
            <h4 className="font-bold text-purple-900 mb-3">Dominio: Estrategia Institucional</h4>
            <div className="space-y-2 text-sm">
              {DOMINIOS_UNIVERSITARIOS.mae.estrategia.ejemplos.map((ejemplo, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Award className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{ejemplo}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Procesos Misionales */}
          <Card className="p-5 border-2 border-blue-200 bg-blue-50">
            <h4 className="font-bold text-blue-900 mb-3">Dominio: Procesos Misionales Académicos</h4>
            <div className="space-y-2 text-sm">
              {DOMINIOS_UNIVERSITARIOS.mae.misional.ejemplos.map((ejemplo, index) => (
                <div key={index} className="flex items-start gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{ejemplo}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Sistemas */}
          <Card className="p-5 border-2 border-green-200 bg-green-50">
            <h4 className="font-bold text-green-900 mb-3">Dominio: Sistemas de Información Académica</h4>
            <div className="space-y-2 text-sm">
              {DOMINIOS_UNIVERSITARIOS.mggti.sistemas.ejemplos.map((ejemplo, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Network className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{ejemplo}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function TabEvidencias() {
  const categorias = [
    { key: 'estrategicas', titulo: 'Evidencias Estratégicas', icon: Target, color: 'purple' },
    { key: 'academicas', titulo: 'Evidencias Académicas', icon: GraduationCap, color: 'blue' },
    { key: 'tecnologicas', titulo: 'Evidencias Tecnológicas', icon: Network, color: 'green' },
    { key: 'seguridad', titulo: 'Evidencias de Seguridad', icon: Shield, color: 'red' },
    { key: 'cumplimiento', titulo: 'Evidencias de Cumplimiento', icon: Award, color: 'yellow' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-900">
            <strong>Documentos y evidencias típicas</strong> que una universidad debe cargar para cumplir los lineamientos MRAE
          </p>
        </div>
      </div>

      {categorias.map(({ key, titulo, icon: Icon, color }) => (
        <div key={key}>
          <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 text-${color}-900`}>
            <Icon className={`w-5 h-5 text-${color}-600`} />
            {titulo}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(EVIDENCIAS_UNIVERSITARIAS as any)[key].map((evidencia: any) => (
              <Card key={evidencia.id} className={`p-4 border-2 border-${color}-200 hover:border-${color}-400 transition-colors`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 bg-${color}-100 rounded-lg`}>
                    <FileText className={`w-5 h-5 text-${color}-600`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">{evidencia.nombre}</h4>
                    <p className="text-xs text-gray-600 mb-2">{evidencia.descripcion}</p>
                    <Badge className={`bg-${color}-100 text-${color}-700 border-${color}-300 text-xs`}>
                      📄 {evidencia.ejemplo}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function TabGlosario() {
  const terminos = Object.entries(GLOSARIO_UNIVERSITARIO);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-900">
            <strong>Términos y acrónimos</strong> específicos del sector educativo que aparecen en la documentación de AE
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {terminos.map(([termino, definicion], index) => (
          <Card key={index} className="p-4 border-2 border-gray-200 hover:border-[#003DA5] transition-colors">
            <div className="flex items-start gap-3">
              <div className="px-3 py-1 bg-[#003DA5] text-white rounded-lg font-bold text-sm flex-shrink-0">
                {termino}
              </div>
              <p className="text-sm text-gray-700 flex-1">{definicion}</p>
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
