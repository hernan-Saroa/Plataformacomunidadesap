/**
 * MODAL DE VISUALIZACIÓN Y GENERACIÓN DE DOCUMENTOS OCI
 * Muestra y genera documentos oficiales según formatos estándar
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  Clock,
  Send,
  X,
  Mail,
  FileSignature,
  Printer
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';
import { PlanIndividualAuditoria, DocumentoOCI } from './PlanIndividualAuditoria';

interface ModalVisualizarDocumentosOCIProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PlanIndividualAuditoria | null;
}

export function ModalVisualizarDocumentosOCI({
  isOpen,
  onClose,
  plan
}: ModalVisualizarDocumentosOCIProps) {
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<DocumentoOCI | null>(null);
  const [vistaPreliminar, setVistaPreliminar] = useState(false);

  if (!plan) return null;

  const generarContenidoAnuncio = (): string => {
    const fecha = new Date().toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP
OFICINA DE CONTROL INTERNO

${plan.documentosOCI.find(d => d.tipo === 'anuncio')?.numero || 'OCI-AN-XXX-2025'}

Bogotá D.C., ${fecha}

Señor(a)
${plan.responsableArea}
Responsable - ${plan.procesoAuditable}
ESAP

ASUNTO: Anuncio de Auditoría de Gestión

Cordial saludo,

De conformidad con el Programa Anual de Auditorías 2025 aprobado por la Dirección Nacional, y en cumplimiento de las funciones asignadas a la Oficina de Control Interno mediante la Ley 87 de 1993, me permito informarle que se llevará a cabo una auditoría al proceso "${plan.procesoAuditable}".

INFORMACIÓN DE LA AUDITORÍA:

Código del Plan: ${plan.codigo}
Tipo de Proceso: ${plan.tipoProceso}
Nivel de Riesgo: ${plan.nivelRiesgo}
Alcance: ${plan.alcance.substring(0, 200)}...

EQUIPO AUDITOR:

Auditor Líder: ${plan.auditorLider}
Equipo de Apoyo:
${plan.equipoAuditor.map(m => `• ${m.nombre} - ${m.rol}`).join('\n')}

CRONOGRAMA PREVISTO:

Etapa de Planeación: ${new Date(plan.fechas.planeacion.inicio).toLocaleDateString('es-CO')} al ${new Date(plan.fechas.planeacion.fin).toLocaleDateString('es-CO')}
Etapa de Ejecución: ${new Date(plan.fechas.ejecucion.inicio).toLocaleDateString('es-CO')} al ${new Date(plan.fechas.ejecucion.fin).toLocaleDateString('es-CO')}
Etapa de Comunicación: ${new Date(plan.fechas.comunicacion.inicio).toLocaleDateString('es-CO')} al ${new Date(plan.fechas.comunicacion.fin).toLocaleDateString('es-CO')}

OBJETIVOS DE LA AUDITORÍA:

${plan.objetivos.map((obj, idx) => `${idx + 1}. ${obj}`).join('\n')}

CRITERIOS DE AUDITORÍA:

${plan.criteriosAuditoria.slice(0, 3).map((crit, idx) => `${idx + 1}. ${crit.descripcion} (${crit.normativaBase})`).join('\n')}

DOCUMENTACIÓN REQUERIDA:

Durante la etapa de planeación, requeriremos su colaboración para suministrar la información y documentación que el equipo auditor solicite mediante comunicaciones oficiales.

Se adjunta Carta de Representación para su diligenciamiento y devolución en un plazo de 5 días hábiles.

Agradecemos de antemano su colaboración y disposición para el desarrollo exitoso de esta auditoría.

Cordialmente,

_________________________________
${plan.auditorLider}
Jefe de Oficina de Control Interno
ESAP

Anexo: Carta de Representación

Copia: Dirección Nacional, Archivo de Control Interno
`;
  };

  const generarContenidoCartaRepresentacion = (): string => {
    const fecha = new Date().toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP
OFICINA DE CONTROL INTERNO

CARTA DE REPRESENTACIÓN

${plan.documentosOCI.find(d => d.tipo === 'carta_representacion')?.numero || 'OCI-CR-XXX-2025'}

Bogotá D.C., ${fecha}

Señor(a)
${plan.auditorLider}
Jefe de Oficina de Control Interno
ESAP

En relación con la auditoría al proceso "${plan.procesoAuditable}" correspondiente al Plan Individual de Auditoría ${plan.codigo}, en mi calidad de responsable del proceso, mediante la presente manifiesto:

DECLARACIONES SOBRE LA INFORMACIÓN SUMINISTRADA:

1. COMPLETITUD DE LA INFORMACIÓN
   ☐ Confirmo que toda la información solicitada por el equipo auditor ha sido suministrada de manera completa y oportuna.
   ☐ He puesto a disposición del equipo auditor todos los registros, documentos y archivos relacionados con el proceso auditado.

2. EXACTITUD Y VERACIDAD
   ☐ La información suministrada es exacta, veraz y corresponde fielmente a la realidad de las operaciones del proceso.
   ☐ No existen operaciones, transacciones o eventos significativos que no hayan sido informados al equipo auditor.

3. CUMPLIMIENTO NORMATIVO
   ☐ El proceso se encuentra operando en cumplimiento de la normatividad aplicable:
${plan.criteriosAuditoria.map(c => `     • ${c.normativaBase}`).join('\n')}

4. CONTROLES INTERNOS
   ☐ Los controles internos establecidos en el proceso se encuentran funcionando adecuadamente.
   ☐ He informado sobre cualquier debilidad o deficiencia identificada en el sistema de control interno.

5. RIESGOS IDENTIFICADOS
   ☐ He comunicado al equipo auditor los siguientes riesgos asociados al proceso:
${plan.riesgos.map(r => `     • ${r}`).join('\n')}

6. HALLAZGOS PREVIOS
   ☐ Se han implementado las acciones correctivas de auditorías anteriores (si aplica).
   ☐ No existen hallazgos pendientes de subsanar de auditorías previas.

7. COMPROMISO DE COLABORACIÓN
   ☐ Me comprometo a facilitar el acceso a las instalaciones, sistemas y personal necesario para el desarrollo de la auditoría.
   ☐ Atenderé oportunamente los requerimientos adicionales de información que formule el equipo auditor.

8. DECLARACIÓN FINAL
   Declaro bajo la gravedad del juramento que la información anterior es verdadera y completa, y que no he omitido ningún hecho o circunstancia significativa que deba ser comunicada a la Oficina de Control Interno.

Cualquier situación que modifique las declaraciones aquí consignadas será comunicada inmediatamente al equipo auditor.

Atentamente,

_________________________________        _________________________________
${plan.responsableArea}                  Fecha: __________________
Responsable del Proceso
${plan.procesoAuditable}

Recibido por:

_________________________________        _________________________________
${plan.auditorLider}                     Fecha: __________________
Jefe de Oficina de Control Interno
`;
  };

  const generarContenidoProgramaIndividual = (): string => {
    const fecha = new Date().toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP
OFICINA DE CONTROL INTERNO

PROGRAMA INDIVIDUAL DE AUDITORÍA

${plan.documentosOCI.find(d => d.tipo === 'programa_individual')?.numero || 'OCI-PI-XXX-2025'}

═══════════════════════════════════════════════════════════════

1. INFORMACIÓN GENERAL

Código del Plan: ${plan.codigo}
Proceso Auditado: ${plan.procesoAuditable}
Tipo de Proceso: ${plan.tipoProceso}
Sede/Territorial: ${plan.tipoSede}${plan.territorial ? ` - ${plan.territorial}` : ''}
Nivel de Riesgo: ${plan.nivelRiesgo}
Fecha de Elaboración: ${fecha}

═══════════════════════════════════════════════════════════════

2. EQUIPO AUDITOR

Auditor Líder:
• ${plan.auditorLider}

Equipo de Auditoría:
${plan.equipoAuditor.map(m => `• ${m.nombre} - ${m.rol} (${m.cargaTrabajo}% dedicación)`).join('\n')}

═══════════════════════════════════════════════════════════════

3. ALCANCE DE LA AUDITORÍA

${plan.alcance}

═══════════════════════════════════════════════════════════════

4. OBJETIVOS DE LA AUDITORÍA

${plan.objetivos.map((obj, idx) => `${idx + 1}. ${obj}`).join('\n\n')}

═══════════════════════════════════════════════════════════════

5. RIESGOS IDENTIFICADOS

${plan.riesgos.map((riesgo, idx) => `${idx + 1}. ${riesgo}`).join('\n\n')}

═══════════════════════════════════════════════════════════════

6. CRITERIOS DE AUDITORÍA

${plan.criteriosAuditoria.map((crit, idx) => `
${idx + 1}. ${crit.descripcion}
   Normativa Base: ${crit.normativaBase}
   Metodología: ${crit.metodologia}
   ${crit.obligatorio ? '⚠ CRITERIO OBLIGATORIO' : ''}
`).join('\n')}

═══════════════════════════════════════════════════════════════

7. NORMATIVIDAD APLICABLE

${plan.normativaAplicable.map((norma, idx) => `${idx + 1}. ${norma}`).join('\n')}

═══════════════════════════════════════════════════════════════

8. CRONOGRAMA DE EJECUCIÓN

ETAPA 1: PLANEACIÓN
Inicio: ${new Date(plan.fechas.planeacion.inicio).toLocaleDateString('es-CO')}
Fin: ${new Date(plan.fechas.planeacion.fin).toLocaleDateString('es-CO')}

Actividades:
• Reunión de apertura con el área auditada
• Levantamiento de información preliminar
• Análisis de documentación
• Identificación de procesos críticos
• Definición de pruebas de auditoría
• Elaboración de programas de trabajo

ETAPA 2: EJECUCIÓN
Inicio: ${new Date(plan.fechas.ejecucion.inicio).toLocaleDateString('es-CO')}
Fin: ${new Date(plan.fechas.ejecucion.fin).toLocaleDateString('es-CO')}

Actividades:
• Aplicación de pruebas de cumplimiento
• Entrevistas al personal del proceso
• Revisión analítica de información
• Evaluación de controles internos
• Documentación de hallazgos
• Desarrollo de papeles de trabajo

ETAPA 3: COMUNICACIÓN DE RESULTADOS
Inicio: ${new Date(plan.fechas.comunicacion.inicio).toLocaleDateString('es-CO')}
Fin: ${new Date(plan.fechas.comunicacion.fin).toLocaleDateString('es-CO')}

Actividades:
• Consolidación de hallazgos
• Mesa de trabajo con área auditada
• Elaboración de informe borrador
• Revisión y ajustes al informe
• Presentación de informe final
• Seguimiento a plan de mejoramiento

═══════════════════════════════════════════════════════════════

9. METODOLOGÍA

La auditoría se desarrollará aplicando las siguientes técnicas:

• Revisión documental de registros y archivos
• Entrevistas estructuradas al personal responsable
• Observación directa de procesos y procedimientos
• Pruebas de cumplimiento normativo
• Análisis de indicadores y métricas del proceso
• Verificación de controles internos implementados

═══════════════════════════════════════════════════════════════

10. PRODUCTOS ESPERADOS

1. Papeles de trabajo documentados
2. Matriz de hallazgos identificados
3. Informe de auditoría con recomendaciones
4. Plan de mejoramiento (si aplica)
5. Presentación de resultados a la Dirección

═══════════════════════════════════════════════════════════════

11. APROBACIONES

Elaborado por:                          Revisado por:

_______________________                 _______________________
${plan.auditorLider}                    Director Nacional
Jefe Control Interno                    ESAP

Fecha: ${fecha}                         Fecha: _______________

═══════════════════════════════════════════════════════════════

Este documento es propiedad de la Oficina de Control Interno de la ESAP
y tiene carácter confidencial.
`;
  };

  const handleVerDocumento = (documento: DocumentoOCI) => {
    setDocumentoSeleccionado(documento);
    setVistaPreliminar(true);
  };

  const handleDescargarDocumento = (documento: DocumentoOCI) => {
    let contenido = '';
    
    switch (documento.tipo) {
      case 'anuncio':
        contenido = generarContenidoAnuncio();
        break;
      case 'carta_representacion':
        contenido = generarContenidoCartaRepresentacion();
        break;
      case 'programa_individual':
        contenido = generarContenidoProgramaIndividual();
        break;
      default:
        contenido = 'Documento en construcción';
    }

    // Crear y descargar archivo de texto
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documento.numero}_${documento.tipo}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Documento ${documento.numero} descargado`);
  };

  const handleDescargarTodos = () => {
    plan.documentosOCI.forEach(doc => {
      setTimeout(() => handleDescargarDocumento(doc), 300);
    });
    toast.success('Descargando todos los documentos...');
  };

  const handleEnviarCorreo = () => {
    toast.success(`Documentos enviados a ${plan.emailResponsable}`);
  };

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'anuncio':
        return <Mail className="w-5 h-5" />;
      case 'carta_representacion':
        return <FileSignature className="w-5 h-5" />;
      case 'programa_individual':
        return <FileText className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTituloTipo = (tipo: string) => {
    switch (tipo) {
      case 'anuncio':
        return 'Oficio de Anuncio';
      case 'carta_representacion':
        return 'Carta de Representación';
      case 'programa_individual':
        return 'Programa Individual';
      case 'solicitud_info':
        return 'Solicitud de Información';
      default:
        return 'Documento';
    }
  };

  return (
    <>
      <ResponsiveModal
        isOpen={isOpen && !vistaPreliminar}
        onClose={onClose}
        title="Documentos OCI Generados"
        subtitle={`Plan ${plan.codigo} - ${plan.procesoAuditable}`}
        icon={<FileText className="w-6 h-6" style={{ color: '#003DA5' }} />}
        maxWidth="3xl"
        footer={
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
            <Button variant="outline" onClick={onClose} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Cerrar
            </Button>
            <Button
              onClick={handleDescargarTodos}
              className="flex-1"
              style={{ backgroundColor: '#003DA5', color: '#FFFFFF' }}
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar Todos
            </Button>
            <Button
              onClick={handleEnviarCorreo}
              className="flex-1"
              style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar por Correo
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Información del plan */}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#EFF6FF', borderLeft: '4px solid #003DA5' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-bold" style={{ color: '#1E40AF' }}>Responsable del Área:</span>
                <br />
                {plan.responsableArea}
              </div>
              <div>
                <span className="font-bold" style={{ color: '#1E40AF' }}>Email:</span>
                <br />
                {plan.emailResponsable}
              </div>
              <div>
                <span className="font-bold" style={{ color: '#1E40AF' }}>Auditor Líder:</span>
                <br />
                {plan.auditorLider}
              </div>
              <div>
                <span className="font-bold" style={{ color: '#1E40AF' }}>Fecha de Creación:</span>
                <br />
                {new Date(plan.fechaCreacion).toLocaleDateString('es-CO')}
              </div>
            </div>
          </div>

          {/* Lista de documentos */}
          <div className="space-y-3">
            {plan.documentosOCI.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
                <p style={{ color: '#6B7280' }}>No hay documentos generados</p>
              </div>
            ) : (
              plan.documentosOCI.map((documento) => (
                <motion.div
                  key={documento.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl border-2 hover:shadow-md transition-shadow"
                  style={{ borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#EFF6FF', color: '#003DA5' }}
                    >
                      {getIconoTipo(documento.tipo)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h4 className="font-bold" style={{ color: '#1F2937' }}>
                            {getTituloTipo(documento.tipo)}
                          </h4>
                          <p className="text-sm" style={{ color: '#6B7280' }}>
                            {documento.numero}
                          </p>
                        </div>

                        <Badge
                          className={
                            documento.firmado
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }
                        >
                          {documento.firmado ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Firmado
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 mr-1" />
                              Pendiente Firma
                            </>
                          )}
                        </Badge>
                      </div>

                      <div className="text-xs mb-3" style={{ color: '#6B7280' }}>
                        Fecha: {new Date(documento.fecha).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        {documento.firmado && documento.fechaFirma && (
                          <span className="ml-3">
                            Firmado: {new Date(documento.fechaFirma).toLocaleDateString('es-CO')}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerDocumento(documento)}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDescargarDocumento(documento)}
                          className="gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Descargar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toast.info('Función de impresión en desarrollo')}
                          className="gap-2"
                        >
                          <Printer className="w-4 h-4" />
                          Imprimir
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Información adicional */}
          {plan.documentosOCI.length > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FEF3C7', borderLeft: '4px solid #F59E0B' }}>
              <p className="text-sm" style={{ color: '#92400E' }}>
                ℹ️ <strong>Importante:</strong> Todos los documentos deben ser firmados por el Jefe de Control Interno antes de su envío oficial al área auditada.
              </p>
            </div>
          )}
        </div>
      </ResponsiveModal>

      {/* Modal de Vista Preliminar */}
      <ResponsiveModal
        isOpen={vistaPreliminar}
        onClose={() => {
          setVistaPreliminar(false);
          setDocumentoSeleccionado(null);
        }}
        title={documentoSeleccionado ? getTituloTipo(documentoSeleccionado.tipo) : ''}
        subtitle={documentoSeleccionado?.numero || ''}
        maxWidth="5xl"
        footer={
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => {
                setVistaPreliminar(false);
                setDocumentoSeleccionado(null);
              }}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cerrar
            </Button>
            <Button
              onClick={() => documentoSeleccionado && handleDescargarDocumento(documentoSeleccionado)}
              className="flex-1"
              style={{ backgroundColor: '#003DA5', color: '#FFFFFF' }}
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
          </div>
        }
      >
        <div
          className="bg-white p-8 rounded-lg border-2 overflow-auto"
          style={{ maxHeight: '600px', fontFamily: 'Courier New, monospace', fontSize: '12px', whiteSpace: 'pre-wrap' }}
        >
          {documentoSeleccionado?.tipo === 'anuncio' && generarContenidoAnuncio()}
          {documentoSeleccionado?.tipo === 'carta_representacion' && generarContenidoCartaRepresentacion()}
          {documentoSeleccionado?.tipo === 'programa_individual' && generarContenidoProgramaIndividual()}
        </div>
      </ResponsiveModal>
    </>
  );
}
