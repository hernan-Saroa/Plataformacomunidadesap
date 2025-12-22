/**
 * ============================================
 * RF004: AUDITORÍA - INICIO (WIZARD)
 * ============================================
 * 
 * Sistema de Inicio Formal de Auditorías con Generación Automática de Documentos
 * Basado en: EM-PT-004 - Auditorías Internas V3
 * 
 * FUNCIONALIDADES:
 * - Wizard de 4 pasos para inicio formal
 * - Generación automática de 4 documentos oficiales:
 *   1. Oficio de Anuncio (al área auditada)
 *   2. Carta de Representante Legal
 *   3. Carta de Compromiso de Confidencialidad
 *   4. Programa Individual de Auditoría
 * - Vista previa de documentos antes de enviar
 * - Creación automática de expediente digital
 * - Notificaciones al área auditada y equipo auditor
 * - Cambio de estado a "En Planeación"
 * - Registro de auditoría de cambios (compliance)
 * 
 * INTEGRACIÓN:
 * - Programa Anual CIG (RF003) - Auditorías programadas
 * - Gestión Organizacional - Áreas auditables
 * - Gestión de Personas - Auditores y responsables
 * 
 * WORKFLOW:
 * 1. Seleccionar auditoría programada
 * 2. Configurar equipo, fechas y alcance
 * 3. Generar y previsualizar documentos
 * 4. Confirmar y enviar → Crear expediente + notificar
 * 
 * ÚLTIMA ACTUALIZACIÓN: 21 Diciembre 2025
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Users, Calendar, CheckCircle, X, ChevronRight, 
  ChevronLeft, Download, Send, Eye, AlertCircle, Sparkles,
  Building2, MapPin, Clock, Target, FileCheck, Mail, Shield, Settings
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Componentes del design system
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/Button';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';

// ============ TIPOS ============

type PasoWizard = 1 | 2 | 3 | 4;
type TipoDocumento = 'oficio' | 'carta-representante' | 'carta-compromiso' | 'programa-individual';

interface AuditoriaProgramada {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'Sede' | 'Territorial';
  areaAuditable: string;
  procesoNombre: string;
  responsableArea: {
    id: string;
    nombre: string;
    cargo: string;
    email: string;
  };
  auditorLider: {
    id: string;
    nombre: string;
    email: string;
  };
  equipoAuditores: {
    id: string;
    nombre: string;
    email: string;
  }[];
  fechaInicio: Date;
  duracionDias: {
    planeacion: number;
    ejecucion: number;
    comunicacion: number;
  };
}

interface DocumentoGenerado {
  tipo: TipoDocumento;
  titulo: string;
  contenido: string;
  generadoEn: Date;
  size: string;
  icono: React.ReactNode;
  color: string;
}

interface ConfiguracionAuditoria {
  objetivo: string;
  alcance: string;
  criterios: string;
  fechaReunionApertura?: Date;
  observaciones?: string;
}

// ============ DATOS MOCK ============

const AUDITORIA_MOCK: AuditoriaProgramada = {
  id: 'prog-001',
  codigo: 'AUD-2025-001',
  nombre: 'Auditoría Gestión Financiera',
  tipo: 'Sede',
  areaAuditable: 'SEDE-001',
  procesoNombre: 'Gestión Financiera',
  responsableArea: {
    id: 'resp-001',
    nombre: 'Dr. Carlos Andrés Pérez',
    cargo: 'Director Administrativo y Financiero',
    email: 'carlos.perez@esap.edu.co'
  },
  auditorLider: {
    id: 'aud-001',
    nombre: 'Fernando Ávila',
    email: 'fernando.avila@esap.edu.co'
  },
  equipoAuditores: [
    { id: 'aud-004', nombre: 'William Alonso', email: 'william.alonso@esap.edu.co' },
    { id: 'aud-005', nombre: 'Natalia Cañón', email: 'natalia.canon@esap.edu.co' }
  ],
  fechaInicio: new Date('2025-01-15'),
  duracionDias: {
    planeacion: 7,
    ejecucion: 20,
    comunicacion: 12
  }
};

// ============ GENERADORES DE DOCUMENTOS ============

function generarOficioAnuncio(auditoria: AuditoriaProgramada, config: ConfiguracionAuditoria): string {
  const fechaHoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  const fechaInicio = auditoria.fechaInicio.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  
  return `
ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP
OFICINA DE CONTROL INTERNO

Bogotá D.C., ${fechaHoy}

${auditoria.codigo}

Señor(a)
${auditoria.responsableArea.nombre}
${auditoria.responsableArea.cargo}
ESAP

REF: ANUNCIO DE AUDITORÍA INTERNA

Respetado(a) señor(a):

En cumplimiento del Programa Anual de Auditorías aprobado para la vigencia 2025 y de conformidad con lo establecido en el Manual de Procesos y Procedimientos de la Oficina de Control Interno (EM-PT-004), me permito informarle que se realizará una auditoría al proceso de ${auditoria.procesoNombre} bajo su responsabilidad.

**DATOS DE LA AUDITORÍA:**

Código: ${auditoria.codigo}
Nombre: ${auditoria.nombre}
Tipo: Auditoría ${auditoria.tipo === 'Sede' ? 'a Proceso de Sede Central' : 'a Territorial'}
Alcance: ${config.alcance}

**OBJETIVO:**
${config.objetivo}

**CRITERIOS DE AUDITORÍA:**
${config.criterios}

**CRONOGRAMA:**
- Fecha de inicio: ${fechaInicio}
- Fase de Planeación: ${auditoria.duracionDias.planeacion} días
- Fase de Ejecución: ${auditoria.duracionDias.ejecucion} días
- Fase de Comunicación: ${auditoria.duracionDias.comunicacion} días

**EQUIPO AUDITOR:**
- Auditor Líder: ${auditoria.auditorLider.nombre}
- Equipo de apoyo: ${auditoria.equipoAuditores.map(a => a.nombre).join(', ')}

Se solicita designar un representante del área que actuará como enlace durante el desarrollo de la auditoría y coordinar la disponibilidad de la información requerida.

La reunión de apertura se llevará a cabo el día ${config.fechaReunionApertura?.toLocaleDateString('es-CO') || '[Fecha por confirmar]'} en las instalaciones de la Oficina de Control Interno.

Agradecemos su colaboración y disposición.

Cordialmente,

____________________________________
Oficina de Control Interno
ESAP

Anexos:
- Carta de designación de representante
- Carta de compromiso de confidencialidad
- Programa individual de auditoría
`;
}

function generarCartaRepresentante(auditoria: AuditoriaProgramada): string {
  const fechaHoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  
  return `
ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP
OFICINA DE CONTROL INTERNO

${auditoria.codigo} - CARTA DE DESIGNACIÓN DE REPRESENTANTE

Bogotá D.C., ${fechaHoy}

Yo, ${auditoria.responsableArea.nombre}, identificado(a) con cédula de ciudadanía _____________, en mi calidad de ${auditoria.responsableArea.cargo}, designo como representante del área ante la Oficina de Control Interno para el desarrollo de la auditoría "${auditoria.nombre}" (${auditoria.codigo}) a:

NOMBRE: _____________________________________________
CARGO: ______________________________________________
CÉDULA: _____________________________________________
TELÉFONO: ___________________________________________
EMAIL: ______________________________________________

El representante designado tendrá las siguientes responsabilidades:

1. Actuar como enlace entre el área auditada y el equipo auditor
2. Coordinar la disponibilidad de información y documentación requerida
3. Facilitar el acceso a instalaciones, sistemas y personal necesario
4. Participar en las reuniones de apertura y cierre de la auditoría
5. Recibir comunicaciones oficiales relacionadas con la auditoría
6. Coordinar la implementación de acciones derivadas de hallazgos

Esta designación tiene vigencia durante todo el desarrollo de la auditoría y sus actividades de seguimiento.

Atentamente,

____________________________________
${auditoria.responsableArea.nombre}
${auditoria.responsableArea.cargo}

Acepto la designación:

____________________________________
Representante designado
Fecha: _____________________________
`;
}

function generarCartaCompromiso(auditoria: AuditoriaProgramada): string {
  const fechaHoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  
  return `
ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP
OFICINA DE CONTROL INTERNO

${auditoria.codigo} - CARTA DE COMPROMISO DE CONFIDENCIALIDAD

Bogotá D.C., ${fechaHoy}

**ACUERDO DE CONFIDENCIALIDAD Y ÉTICA PROFESIONAL**

Yo, __________________________________, identificado(a) con cédula de ciudadanía _____________, en mi calidad de representante del área auditada en el proceso "${auditoria.nombre}", me comprometo a:

**1. CONFIDENCIALIDAD:**
- Mantener la confidencialidad de toda la información sensible, documentos y datos a los que tenga acceso durante el desarrollo de la auditoría.
- No divulgar información relacionada con hallazgos preliminares hasta que se emita el informe final.
- Proteger la información de acuerdo con las políticas de seguridad de la información de ESAP.

**2. OBJETIVIDAD Y TRANSPARENCIA:**
- Proporcionar información veraz, completa y oportuna al equipo auditor.
- No ocultar, alterar o manipular información o documentos solicitados.
- Facilitar el acceso a todas las fuentes de información necesarias para la auditoría.

**3. COLABORACIÓN:**
- Atender oportunamente los requerimientos del equipo auditor.
- Participar activamente en reuniones y actividades programadas.
- Mantener una actitud profesional y colaborativa durante todo el proceso.

**4. CUMPLIMIENTO NORMATIVO:**
- Acatar las disposiciones del Manual de Procesos EM-PT-004.
- Cumplir con los plazos establecidos para entrega de información.
- Implementar oportunamente las acciones derivadas de hallazgos.

**5. PROTECCIÓN DE DATOS PERSONALES:**
De conformidad con la Ley 1581 de 2012, me comprometo a proteger los datos personales a los que tenga acceso y a utilizarlos únicamente para los fines de la auditoría.

**CONSECUENCIAS DEL INCUMPLIMIENTO:**
El incumplimiento de este compromiso puede dar lugar a las acciones disciplinarias establecidas en el Código Disciplinario Único (Ley 734 de 2002) y demás normas aplicables.

Manifiesto que he leído, entendido y acepto los términos de este compromiso.

____________________________________
Firma del representante del área

Nombre: _____________________________
Cédula: _____________________________
Cargo: ______________________________
Fecha: ______________________________

**TESTIGOS:**

____________________________________     ____________________________________
Auditor Líder                           Jefe Oficina de Control Interno
${auditoria.auditorLider.nombre}

`;
}

function generarProgramaIndividual(auditoria: AuditoriaProgramada, config: ConfiguracionAuditoria): string {
  const fechaHoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  
  return `
ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP
OFICINA DE CONTROL INTERNO

PROGRAMA INDIVIDUAL DE AUDITORÍA
${auditoria.codigo}

═══════════════════════════════════════════════════════════════

**1. INFORMACIÓN GENERAL**

Código: ${auditoria.codigo}
Nombre: ${auditoria.nombre}
Tipo: Auditoría ${auditoria.tipo}
Proceso auditado: ${auditoria.procesoNombre}
Fecha de elaboración: ${fechaHoy}

**2. OBJETIVO DE LA AUDITORÍA**

${config.objetivo}

**3. ALCANCE**

${config.alcance}

**4. CRITERIOS DE AUDITORÍA**

${config.criterios}

**5. EQUIPO AUDITOR**

Auditor Líder: ${auditoria.auditorLider.nombre}
Email: ${auditoria.auditorLider.email}

Equipo de apoyo:
${auditoria.equipoAuditores.map(a => `- ${a.nombre} (${a.email})`).join('\n')}

**6. ÁREA AUDITADA**

Responsable: ${auditoria.responsableArea.nombre}
Cargo: ${auditoria.responsableArea.cargo}
Email: ${auditoria.responsableArea.email}

**7. CRONOGRAMA**

╔════════════════════╦═══════════════════╦═══════════════╗
║ FASE               ║ DURACIÓN          ║ ACTIVIDADES   ║
╠════════════════════╬═══════════════════╬═══════════════╣
║ PLANEACIÓN         ║ ${auditoria.duracionDias.planeacion} días           ║ ${auditoria.duracionDias.planeacion}             ║
║ EJECUCIÓN          ║ ${auditoria.duracionDias.ejecucion} días          ║ ${auditoria.duracionDias.ejecucion}             ║
║ COMUNICACIÓN       ║ ${auditoria.duracionDias.comunicacion} días          ║ ${auditoria.duracionDias.comunicacion}             ║
╚════════════════════╩═══════════════════╩═══════════════╝

**8. ACTIVIDADES POR FASE**

**FASE 1: PLANEACIÓN (${auditoria.duracionDias.planeacion} días)**
□ Revisión de documentación del proceso
□ Análisis de riesgos del área auditada
□ Solicitud de información preliminar
□ Preparación de listas de chequeo
□ Reunión de apertura con el área
□ Definición de muestras y pruebas

**FASE 2: EJECUCIÓN (${auditoria.duracionDias.ejecucion} días)**
□ Aplicación de listas de chequeo
□ Revisión de documentos y registros
□ Entrevistas con personal clave
□ Observación directa de procesos
□ Pruebas de cumplimiento normativo
□ Identificación y documentación de hallazgos
□ Recopilación de evidencias
□ Reunión de cierre con el área

**FASE 3: COMUNICACIÓN (${auditoria.duracionDias.comunicacion} días)**
□ Elaboración de informe preliminar
□ Socialización con el área auditada
□ Atención de controversias (si aplica)
□ Elaboración de informe final
□ Generación de informe ejecutivo
□ Formalización de plan de mejoramiento

**9. RECURSOS NECESARIOS**

- Acceso a sistemas de información del proceso
- Documentación de procesos y procedimientos
- Registros y evidencias del período auditado
- Disponibilidad de personal para entrevistas
- Espacio físico para trabajo del equipo auditor

**10. RESULTADOS ESPERADOS**

- Informe de auditoría con hallazgos identificados
- Plan de mejoramiento con acciones correctivas
- Recomendaciones para fortalecimiento del proceso
- Evaluación del nivel de riesgo del proceso

**11. OBSERVACIONES**

${config.observaciones || 'N/A'}

═══════════════════════════════════════════════════════════════

**APROBACIONES:**

____________________________________
Auditor Líder
${auditoria.auditorLider.nombre}
Fecha: _____________________________

____________________________________
Jefe Oficina de Control Interno
Fecha: _____________________________

═══════════════════════════════════════════════════════════════
Documento generado automáticamente por SIGL - Sistema Integrado de Gestión Legal ESAP
Fecha de generación: ${fechaHoy}
`;
}

// ============ COMPONENTE PRINCIPAL ============

interface InicioAuditoriaWizardProps {
  auditoria?: AuditoriaProgramada;
  onClose: () => void;
  onComplete: (auditoriaId: string) => void;
}

export function InicioAuditoriaWizard({ 
  auditoria = AUDITORIA_MOCK, 
  onClose,
  onComplete
}: InicioAuditoriaWizardProps) {
  const [pasoActual, setPasoActual] = useState<PasoWizard>(1);
  const [configuracion, setConfiguracion] = useState<ConfiguracionAuditoria>({
    objetivo: 'Evaluar el cumplimiento de los controles establecidos en el proceso de Gestión Financiera y verificar la adecuada aplicación de la normatividad vigente.',
    alcance: 'Revisión de las operaciones financieras del período enero a diciembre 2024, incluyendo presupuesto, tesorería, contabilidad y gestión de cartera.',
    criterios: 'Decreto 648 de 2017, Manual de Contratación, Estatuto Anticorrupción, Régimen de Contabilidad Pública, políticas internas de ESAP.',
    fechaReunionApertura: new Date('2025-01-15T10:00:00'),
    observaciones: ''
  });
  const [documentosGenerados, setDocumentosGenerados] = useState<DocumentoGenerado[]>([]);
  const [loading, setLoading] = useState(false);
  const [documentoVistaPrevia, setDocumentoVistaPrevia] = useState<DocumentoGenerado | null>(null);

  // Generar documentos
  const generarDocumentos = () => {
    setLoading(true);
    
    setTimeout(() => {
      const docs: DocumentoGenerado[] = [
        {
          tipo: 'oficio',
          titulo: 'Oficio de Anuncio',
          contenido: generarOficioAnuncio(auditoria, configuracion),
          generadoEn: new Date(),
          size: '2.1 KB',
          icono: <FileText className="w-5 h-5" />,
          color: '#3B82F6'
        },
        {
          tipo: 'carta-representante',
          titulo: 'Carta de Representante',
          contenido: generarCartaRepresentante(auditoria),
          generadoEn: new Date(),
          size: '1.8 KB',
          icono: <Users className="w-5 h-5" />,
          color: '#10B981'
        },
        {
          tipo: 'carta-compromiso',
          titulo: 'Carta de Compromiso',
          contenido: generarCartaCompromiso(auditoria),
          generadoEn: new Date(),
          size: '2.5 KB',
          icono: <Shield className="w-5 h-5" />,
          color: '#F59E0B'
        },
        {
          tipo: 'programa-individual',
          titulo: 'Programa Individual',
          contenido: generarProgramaIndividual(auditoria, configuracion),
          generadoEn: new Date(),
          size: '3.2 KB',
          icono: <FileCheck className="w-5 h-5" />,
          color: '#8B5CF6'
        }
      ];
      
      setDocumentosGenerados(docs);
      setLoading(false);
      toast.success('✅ Documentos generados exitosamente');
    }, 1500);
  };

  // Confirmar e iniciar auditoría
  const confirmarInicio = async () => {
    setLoading(true);
    
    // Simular creación de expediente y notificaciones
    setTimeout(() => {
      toast.success('🎉 Auditoría iniciada exitosamente');
      toast.info('📧 Notificaciones enviadas al área auditada');
      toast.info('📁 Expediente digital creado');
      setLoading(false);
      onComplete(auditoria.id);
    }, 2000);
  };

  const avanzarPaso = () => {
    if (pasoActual === 2) {
      generarDocumentos();
    }
    if (pasoActual < 4) {
      setPasoActual((prev) => (prev + 1) as PasoWizard);
    }
  };

  const retrocederPaso = () => {
    if (pasoActual > 1) {
      setPasoActual((prev) => (prev - 1) as PasoWizard);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl text-white font-bold">
                    Iniciar Auditoría - {auditoria.codigo}
                  </h2>
                  <p className="text-sm text-blue-100 mt-1">
                    RF004 - Generación automática de documentos oficiales
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2 mt-6">
              {[1, 2, 3, 4].map((paso) => (
                <div key={paso} className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                      paso === pasoActual
                        ? 'bg-white text-blue-600 shadow-lg scale-110'
                        : paso < pasoActual
                        ? 'bg-green-500 text-white'
                        : 'bg-white/20 text-white/60'
                    }`}
                  >
                    {paso < pasoActual ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-bold">{paso}</span>
                    )}
                  </div>
                  {paso < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded transition-all ${
                        paso < pasoActual ? 'bg-green-500' : 'bg-white/20'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {pasoActual === 1 && (
                <Paso1Informacion auditoria={auditoria} />
              )}
              {pasoActual === 2 && (
                <Paso2Configuracion
                  configuracion={configuracion}
                  onChange={setConfiguracion}
                />
              )}
              {pasoActual === 3 && (
                <Paso3Documentos
                  documentos={documentosGenerados}
                  loading={loading}
                  onPreview={setDocumentoVistaPrevia}
                />
              )}
              {pasoActual === 4 && (
                <Paso4Confirmacion
                  auditoria={auditoria}
                  configuracion={configuracion}
                  documentos={documentosGenerados}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Footer - Botones */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <ButtonSIGL
              variant="outline"
              icon={<ChevronLeft className="w-4 h-4" />}
              onClick={pasoActual === 1 ? onClose : retrocederPaso}
            >
              {pasoActual === 1 ? 'Cancelar' : 'Anterior'}
            </ButtonSIGL>

            <div className="text-sm text-gray-600">
              Paso {pasoActual} de 4
            </div>

            {pasoActual < 4 ? (
              <ButtonSIGL
                variant="primary"
                icon={<ChevronRight className="w-4 h-4" />}
                onClick={avanzarPaso}
                disabled={loading}
              >
                {loading ? 'Generando...' : 'Siguiente'}
              </ButtonSIGL>
            ) : (
              <ButtonSIGL
                variant="primary"
                icon={<Send className="w-4 h-4" />}
                onClick={confirmarInicio}
                disabled={loading}
              >
                {loading ? 'Iniciando...' : 'Confirmar e Iniciar'}
              </ButtonSIGL>
            )}
          </div>
        </motion.div>
      </div>

      {/* Modal de vista previa de documento */}
      {documentoVistaPrevia && (
        <ModalVistaPrevia
          documento={documentoVistaPrevia}
          onClose={() => setDocumentoVistaPrevia(null)}
        />
      )}
    </>
  );
}

// ============ PASO 1: INFORMACIÓN ============

function Paso1Informacion({ auditoria }: { auditoria: AuditoriaProgramada }) {
  return (
    <motion.div
      key="paso1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg text-gray-900 mb-2 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Información de la Auditoría
        </h3>
        <p className="text-sm text-gray-600">
          Verifique los datos de la auditoría programada antes de continuar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardSIGL className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">Información General</span>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-500">Código:</span>
              <p className="text-sm text-gray-900 font-medium">{auditoria.codigo}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Nombre:</span>
              <p className="text-sm text-gray-900">{auditoria.nombre}</p>
            </div>
            <div className="flex items-center gap-2">
              <BadgeSIGL variant={auditoria.tipo === 'Sede' ? 'info' : 'success'} size="sm">
                {auditoria.tipo === 'Sede' ? <Building2 className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                <span className="ml-1">{auditoria.tipo}</span>
              </BadgeSIGL>
            </div>
          </div>
        </CardSIGL>

        <CardSIGL className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-600">Área Auditada</span>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-500">Proceso:</span>
              <p className="text-sm text-gray-900">{auditoria.procesoNombre}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Responsable:</span>
              <p className="text-sm text-gray-900 font-medium">{auditoria.responsableArea.nombre}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Cargo:</span>
              <p className="text-sm text-gray-900">{auditoria.responsableArea.cargo}</p>
            </div>
          </div>
        </CardSIGL>

        <CardSIGL className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">Equipo Auditor</span>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-500">Auditor Líder:</span>
              <p className="text-sm text-gray-900 font-medium">{auditoria.auditorLider.nombre}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Equipo de apoyo:</span>
              {auditoria.equipoAuditores.map((auditor) => (
                <p key={auditor.id} className="text-sm text-gray-900">• {auditor.nombre}</p>
              ))}
            </div>
          </div>
        </CardSIGL>

        <CardSIGL className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-gray-600">Cronograma</span>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-500">Fecha de inicio:</span>
              <p className="text-sm text-gray-900 font-medium">
                {auditoria.fechaInicio.toLocaleDateString('es-CO')}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                P: {auditoria.duracionDias.planeacion}d
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                E: {auditoria.duracionDias.ejecucion}d
              </span>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                C: {auditoria.duracionDias.comunicacion}d
              </span>
            </div>
          </div>
        </CardSIGL>
      </div>

      <CardSIGL className="p-4 border-l-4 border-l-blue-500 bg-blue-50/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-900 font-medium mb-1">
              Inicio de Auditoría Formal
            </p>
            <p className="text-sm text-gray-700">
              Al continuar, se generarán automáticamente los documentos oficiales según el procedimiento EM-PT-004 
              y se notificará formalmente al área auditada.
            </p>
          </div>
        </div>
      </CardSIGL>
    </motion.div>
  );
}

// ============ PASO 2: CONFIGURACIÓN ============

function Paso2Configuracion({ 
  configuracion, 
  onChange 
}: { 
  configuracion: ConfiguracionAuditoria;
  onChange: (config: ConfiguracionAuditoria) => void;
}) {
  return (
    <motion.div
      key="paso2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg text-gray-900 mb-2 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Configuración de la Auditoría
        </h3>
        <p className="text-sm text-gray-600">
          Complete la información que se incluirá en los documentos oficiales.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Objetivo de la Auditoría <span className="text-red-500">*</span>
          </label>
          <textarea
            value={configuracion.objetivo}
            onChange={(e) => onChange({ ...configuracion, objetivo: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describa el objetivo principal de la auditoría..."
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Alcance <span className="text-red-500">*</span>
          </label>
          <textarea
            value={configuracion.alcance}
            onChange={(e) => onChange({ ...configuracion, alcance: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Defina el alcance temporal y temático de la auditoría..."
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Criterios de Auditoría <span className="text-red-500">*</span>
          </label>
          <textarea
            value={configuracion.criterios}
            onChange={(e) => onChange({ ...configuracion, criterios: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Normativa y referencias aplicables (leyes, decretos, políticas internas)..."
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Fecha de Reunión de Apertura <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={configuracion.fechaReunionApertura?.toISOString().slice(0, 16)}
            onChange={(e) => onChange({ ...configuracion, fechaReunionApertura: new Date(e.target.value) })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Observaciones Adicionales
          </label>
          <textarea
            value={configuracion.observaciones}
            onChange={(e) => onChange({ ...configuracion, observaciones: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Información adicional relevante (opcional)..."
          />
        </div>
      </div>
    </motion.div>
  );
}

// ============ PASO 3: DOCUMENTOS ============

function Paso3Documentos({ 
  documentos, 
  loading,
  onPreview 
}: { 
  documentos: DocumentoGenerado[];
  loading: boolean;
  onPreview: (doc: DocumentoGenerado) => void;
}) {
  if (loading) {
    return (
      <motion.div
        key="loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-gray-700 mt-6">Generando documentos oficiales...</p>
        <p className="text-sm text-gray-500 mt-2">Este proceso puede tomar unos segundos</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="paso3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg text-gray-900 mb-2 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-green-600" />
          Documentos Generados
        </h3>
        <p className="text-sm text-gray-600">
          Los siguientes documentos han sido generados automáticamente y están listos para revisión.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documentos.map((doc, idx) => (
          <motion.div
            key={doc.tipo}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <CardSIGL hover className="p-4">
              <div className="flex items-start gap-4">
                <div 
                  className="p-3 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: `${doc.color}20` }}
                >
                  <div style={{ color: doc.color }}>
                    {doc.icono}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm text-gray-900 font-medium mb-1">
                    {doc.titulo}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <span>{doc.size}</span>
                    <span>•</span>
                    <span>{doc.generadoEn.toLocaleTimeString('es-CO')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ButtonSIGL
                      variant="outline"
                      size="sm"
                      icon={<Eye className="w-3 h-3" />}
                      onClick={() => onPreview(doc)}
                    >
                      Ver
                    </ButtonSIGL>
                    <ButtonSIGL
                      variant="outline"
                      size="sm"
                      icon={<Download className="w-3 h-3" />}
                      onClick={() => toast.info('Descargando documento...')}
                    >
                      Descargar
                    </ButtonSIGL>
                  </div>
                </div>
              </div>
            </CardSIGL>
          </motion.div>
        ))}
      </div>

      <CardSIGL className="p-4 border-l-4 border-l-green-500 bg-green-50/50">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-900 font-medium mb-1">
              ✅ Todos los documentos generados correctamente
            </p>
            <p className="text-sm text-gray-700">
              Revise cada documento antes de continuar. Puede descargarlos para revisión offline.
            </p>
          </div>
        </div>
      </CardSIGL>
    </motion.div>
  );
}

// ============ PASO 4: CONFIRMACIÓN ============

function Paso4Confirmacion({ 
  auditoria,
  configuracion,
  documentos
}: { 
  auditoria: AuditoriaProgramada;
  configuracion: ConfiguracionAuditoria;
  documentos: DocumentoGenerado[];
}) {
  return (
    <motion.div
      key="paso4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg text-gray-900 mb-2 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Confirmar Inicio de Auditoría
        </h3>
        <p className="text-sm text-gray-600">
          Revise el resumen antes de confirmar. Esta acción iniciará formalmente la auditoría.
        </p>
      </div>

      <CardSIGL className="p-6 border-2 border-blue-200 bg-blue-50/30">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm text-gray-600 mb-2">Auditoría:</h4>
            <p className="text-gray-900 font-medium">{auditoria.codigo} - {auditoria.nombre}</p>
          </div>

          <div>
            <h4 className="text-sm text-gray-600 mb-2">Área Auditada:</h4>
            <p className="text-gray-900">{auditoria.procesoNombre}</p>
            <p className="text-sm text-gray-700">{auditoria.responsableArea.nombre}</p>
          </div>

          <div>
            <h4 className="text-sm text-gray-600 mb-2">Documentos a enviar:</h4>
            <div className="flex flex-wrap gap-2">
              {documentos.map((doc) => (
                <BadgeSIGL key={doc.tipo} variant="info" size="sm">
                  {doc.titulo}
                </BadgeSIGL>
              ))}
            </div>
          </div>
        </div>
      </CardSIGL>

      <div className="space-y-3">
        <h4 className="text-sm text-gray-700 font-medium">Al confirmar se realizarán las siguientes acciones:</h4>
        
        <div className="space-y-2">
          {[
            { icon: <FileCheck className="w-4 h-4" />, text: 'Se crearán los 4 documentos oficiales en el expediente digital', color: 'blue' },
            { icon: <Mail className="w-4 h-4" />, text: `Se enviará notificación a ${auditoria.responsableArea.email}`, color: 'green' },
            { icon: <Mail className="w-4 h-4" />, text: 'Se notificará al equipo auditor del inicio formal', color: 'green' },
            { icon: <Calendar className="w-4 h-4" />, text: 'La auditoría pasará a estado "En Planeación"', color: 'purple' },
            { icon: <Shield className="w-4 h-4" />, text: 'Se registrará la acción en el log de auditoría (compliance)', color: 'orange' }
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`p-1.5 rounded bg-${item.color}-100 text-${item.color}-600 flex-shrink-0`}>
                {item.icon}
              </div>
              <p className="text-sm text-gray-700">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <CardSIGL className="p-4 border-l-4 border-l-yellow-500 bg-yellow-50/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-900 font-medium mb-1">
              Importante
            </p>
            <p className="text-sm text-gray-700">
              Una vez confirmado el inicio, no se podrá revertir esta acción. El área auditada recibirá 
              notificación formal y se iniciará el cronograma de la auditoría.
            </p>
          </div>
        </div>
      </CardSIGL>
    </motion.div>
  );
}

// ============ MODAL VISTA PREVIA ============

function ModalVistaPrevia({ 
  documento, 
  onClose 
}: { 
  documento: DocumentoGenerado;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div 
          className="p-4 border-b border-gray-200 flex items-center justify-between"
          style={{ backgroundColor: `${documento.color}10` }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${documento.color}20`, color: documento.color }}
            >
              {documento.icono}
            </div>
            <div>
              <h3 className="text-gray-900 font-medium">{documento.titulo}</h3>
              <p className="text-xs text-gray-600">Vista previa del documento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="bg-white rounded-lg shadow-sm p-8 max-w-3xl mx-auto">
            <pre className="whitespace-pre-wrap text-xs font-mono text-gray-800 leading-relaxed">
              {documento.contenido}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
          <ButtonSIGL
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            onClick={() => toast.success('Descargando documento...')}
          >
            Descargar PDF
          </ButtonSIGL>
          <ButtonSIGL
            variant="primary"
            onClick={onClose}
          >
            Cerrar
          </ButtonSIGL>
        </div>
      </motion.div>
    </div>
  );
}