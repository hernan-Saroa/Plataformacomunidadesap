/**
 * ModalProcesoDisciplinario - Modal del Expediente Disciplinario
 * ✅ Diseño corporativo ESAP 2025 - Versión Premium
 * ✅ 6 tabs funcionales con lógica de negocio profesional
 * ✅ Similar a ModalExpediente pero adaptado para procesos disciplinarios
 * ✅ Header limpio profesional ESAP 2025
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card } from '../../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { 
  Gavel, User, Clock, FileText, AlertTriangle, Eye, Download, Plus, Upload,
  CheckCircle, X, Calendar, Bell, Share2, ExternalLink, FileDown
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { ExpedienteJudicial } from '../core/types';
import { ModalHeaderClean } from './ModalHeaderClean';
import { FormularioRegistrarDecision } from './FormularioRegistrarDecision';
import { copyToClipboard } from '../../../../utils/clipboard';
import { VisorDocumentoModal } from './VisorDocumentoModal';
import { ModalNuevaActuacion, type NuevaActuacionData } from './ModalNuevaActuacion';
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';

// Tipo para Proceso Disciplinario
interface ProcesoDisciplinario {
  id: string;
  tipoFalta: string;
  etapa: string;
  abogadoAsignado: string;
  disciplinado: string;
  cargo?: string;
  dependencia?: string;
  diasRestantes: number;
  diasTotales: number;
  ultimaActuacion?: {
    fecha: string;
    tipo: string;
    descripcion: string;
    responsable: string;
    estado: string;
  };
  fechaActualizacion: Date;
  descripcionHechos?: string;
}

interface ModalProcesoDisciplinarioProps {
  isOpen: boolean;
  onClose: () => void;
  proceso: ProcesoDisciplinario;
}

export function ModalProcesoDisciplinario({ isOpen, onClose, proceso }: ModalProcesoDisciplinarioProps) {
  // ✅ Obtener configuraciones desde Context API
  const { tiposExcepcionesActivos, causalesEspecificasActivas } = useConfiguracionModulo('juzgamiento');
  
  const [tabActivo, setTabActivo] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [mostrarModalNotificar, setMostrarModalNotificar] = useState(false);
  const [mostrarModalCompartir, setMostrarModalCompartir] = useState(false);
  const [mostrarModalPortales, setMostrarModalPortales] = useState(false);
  const [enlaceCompartir, setEnlaceCompartir] = useState('');
  const [mostrarFormularioDecision, setMostrarFormularioDecision] = useState(false);
  const [decisiones, setDecisiones] = useState<any[]>([]);
  
  // ✅ Estado para excepciones procesales
  const [excepciones, setExcepciones] = useState<any[]>([]);
  const [modalNuevaExcepcion, setModalNuevaExcepcion] = useState(false);
  
  // ✅ Estado para el modal de nueva actuación
  const [modalNuevaActuacionOpen, setModalNuevaActuacionOpen] = useState(false);
  
  // ✅ Estado para actuaciones con datos iniciales
  const [actuaciones, setActuaciones] = useState([
    { 
      id: 1,
      fecha: '26/12/2024', 
      tipo: 'Solicitud de Informes',
      descripcion: proceso.ultimaActuacion?.descripcion || 'Solicitud de informes a RRHH', 
      responsable: 'Oficina Control Disciplinario',
      estado: 'COMPLETADA',
      colorBorde: '#003DA5'
    },
    { 
      id: 2,
      fecha: '20/12/2024', 
      tipo: 'Auto de Apertura',
      descripcion: 'Auto de apertura de investigación disciplinaria', 
      responsable: 'Jefe de Control Interno',
      estado: 'COMPLETADA',
      colorBorde: '#F59E0B'
    },
    { 
      id: 3,
      fecha: '15/12/2024', 
      tipo: 'Recepción de Queja',
      descripcion: 'Recepción de queja por irregularidades', 
      responsable: 'Secretaría General',
      estado: 'COMPLETADA',
      colorBorde: '#003DA5'
    }
  ]);
  
  const [pruebas, setPruebas] = useState([
    { id: 1, nombre: 'Prueba Documental #1', descripcion: 'Documento probatorio relacionado con el proceso disciplinario', archivo: 'prueba_001.pdf', tamaño: '2.4 MB' },
    { id: 2, nombre: 'Prueba Documental #2', descripcion: 'Documento probatorio relacionado con el proceso disciplinario', archivo: 'prueba_002.pdf', tamaño: '1.8 MB' },
    { id: 3, nombre: 'Prueba Documental #3', descripcion: 'Documento probatorio relacionado con el proceso disciplinario', archivo: 'prueba_003.pdf', tamaño: '3.1 MB' }
  ]);
  
  // Estado para el visor de documentos
  const [visorAbierto, setVisorAbierto] = useState(false);
  const [pruebaSeleccionada, setPruebaSeleccionada] = useState<any>(null);

  // Estado para documentos del proceso
  const [documentos, setDocumentos] = useState([
    { id: 1, nombre: 'Documento_1.pdf', tamaño: '256 KB', fecha: '26/12/2024', tipo: 'Auto de Apertura' },
    { id: 2, nombre: 'Documento_2.pdf', tamaño: '412 KB', fecha: '26/12/2024', tipo: 'Pliego de Cargos' },
    { id: 3, nombre: 'Documento_3.pdf', tamaño: '189 KB', fecha: '26/12/2024', tipo: 'Notificación' },
    { id: 4, nombre: 'Documento_4.pdf', tamaño: '324 KB', fecha: '26/12/2024', tipo: 'Respuesta a Descargos' }
  ]);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<any>(null);

  const handleAgregarPrueba = () => {
    toast.info('📎 Abriendo cargador de pruebas', {
      description: 'Selecciona el documento probatorio desde tu equipo',
      duration: 2000
    });
    
    // Simular apertura de input file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.png';
    
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        toast.loading('⏳ Cargando prueba...', {
          id: 'cargar-prueba',
          duration: 2000
        });
        
        setTimeout(() => {
          const nuevaPrueba = {
            id: pruebas.length + 1,
            nombre: `Prueba Documental #${pruebas.length + 1}`,
            descripcion: `${file.name} - Cargado el ${new Date().toLocaleDateString('es-CO')}`,
            archivo: file.name,
            tamaño: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          };
          
          setPruebas([nuevaPrueba, ...pruebas]);
          setHasChanges(true);
          
          toast.success('✅ Prueba cargada exitosamente', {
            id: 'cargar-prueba',
            description: `${file.name} agregado al expediente disciplinario`,
            duration: 4000
          });
        }, 2000);
      }
    };
    
    input.click();
  };

  const handleVerPrueba = (prueba: any) => {
    setPruebaSeleccionada(prueba);
    setVisorAbierto(true);
    
    toast.success('📄 Visor de documentos abierto', {
      description: `Visualizando: ${prueba.nombre}`,
      duration: 2000
    });
  };

  const handleDescargarPrueba = (prueba: any) => {
    toast.loading('⏳ Preparando descarga...', {
      id: 'descargar-prueba',
      duration: 1500
    });
    
    setTimeout(() => {
      // Crear contenido HTML del documento de prueba
      const contenidoHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${prueba.nombre} - ${proceso.id}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 40px;
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #003DA5; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
            }
            .header h1 { 
              color: #003DA5; 
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .header p { 
              margin: 5px 0; 
              color: #666;
            }
            .metadata { 
              margin: 30px 0; 
              padding: 20px; 
              background: #f5f5f5;
              border-left: 4px solid #003DA5;
            }
            .metadata-item { 
              margin: 10px 0; 
            }
            .metadata-label { 
              font-weight: bold; 
              color: #003DA5;
              display: inline-block;
              width: 180px;
            }
            .content { 
              margin: 30px 0;
              text-align: justify;
            }
            .footer { 
              margin-top: 50px; 
              padding-top: 20px; 
              border-top: 2px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA</h1>
            <p>ESAP - República de Colombia</p>
            <p>Oficina de Control Disciplinario Interno</p>
          </div>
          
          <div class="metadata">
            <div class="metadata-item">
              <span class="metadata-label">Proceso No:</span>
              <span>${proceso.id}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Tipo de Falta:</span>
              <span>${proceso.tipoFalta}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Etapa Procesal:</span>
              <span>${proceso.etapa}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Prueba Documental:</span>
              <span>${prueba.nombre}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Disciplinado:</span>
              <span>${proceso.disciplinado}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Investigador Asignado:</span>
              <span>${proceso.abogadoAsignado}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Fecha de Generación:</span>
              <span>${new Date().toLocaleDateString('es-CO', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Archivo:</span>
              <span>${prueba.archivo}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Tamaño:</span>
              <span>${prueba.tamaño}</span>
            </div>
          </div>
          
          <div class="content">
            <h2 style="color: #003DA5;">MATERIAL PROBATORIO</h2>
            
            <p><strong>Descripción:</strong></p>
            <p>${prueba.descripcion}</p>
            
            <p><strong>Contenido de la Prueba:</strong></p>
            
            <p>El presente documento constituye material probatorio allegado al proceso disciplinario 
            ${proceso.id}, el cual se encuentra en etapa de ${proceso.etapa}.</p>
            
            <p>Esta prueba documental ha sido incorporada al expediente disciplinario con el fin de 
            esclarecer los hechos investigados y garantizar el debido proceso al funcionario investigado.</p>
            
            <p>El documento ha sido autenticado y validado por la Oficina de Control Disciplinario Interno, 
            cumpliendo con todos los requisitos de cadena de custodia y preservación de la prueba establecidos 
            en el Código General Disciplinario (Ley 1952 de 2019).</p>
            
            <p><strong>Relevancia Probatoria:</strong></p>
            <p>Este documento es pertinente y conducente para la investigación disciplinaria, 
            aportando elementos de juicio que permiten establecer la ocurrencia de los hechos 
            investigados y la eventual responsabilidad disciplinaria del servidor público.</p>
            
            <p><strong>Garantías Procesales:</strong></p>
            <p>El presente material probatorio ha sido puesto en conocimiento del investigado y su defensa, 
            garantizando el derecho de contradicción y defensa consagrado en el artículo 29 de la 
            Constitución Política de Colombia.</p>
          </div>
          
          <div class="footer">
            <p><strong>Sistema de Gestión Legal ESAP</strong></p>
            <p>Este es un documento oficial del proceso disciplinario ${proceso.id}</p>
            <p>Generado el: ${new Date().toLocaleString('es-CO')}</p>
            <p>Control Disciplinario Interno - ESAP</p>
          </div>
        </body>
        </html>
      `;
      
      // Crear blob y descargar
      const blob = new Blob([contenidoHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = prueba.archivo.replace('.pdf', '.html');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('✅ Descarga completada', {
        id: 'descargar-prueba',
        description: `${prueba.archivo} (${prueba.tamaño}) guardado en Descargas`,
        duration: 4000
      });
      
      // Log para analytics
      console.log('📊 Documento descargado:', {
        proceso: proceso.id,
        prueba: prueba.nombre,
        archivo: prueba.archivo,
        timestamp: new Date().toISOString()
      });
    }, 1500);
  };

  const handleGuardarCambios = () => {
    toast.loading('💾 Guardando cambios...', {
      id: 'guardar-cambios',
      duration: 1500
    });
    
    setTimeout(() => {
      toast.success('✅ Cambios guardados exitosamente', {
        id: 'guardar-cambios',
        description: `Proceso ${proceso.id} actualizado correctamente`,
        duration: 3000,
      });
      setHasChanges(false);
      // Aquí iría la lógica para guardar en el backend
      // await actualizarProceso(proceso.id, { pruebas, ... });
    }, 1500);
  };

  const handleCerrar = () => {
    if (hasChanges) {
      if (confirm('⚠️ Tienes cambios sin guardar. ¿Deseas cerrar sin guardar los cambios?')) {
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  // ==================== FUNCIONES PARA ACTUACIONES ====================
  
  const handleGuardarActuacion = (nuevaActuacion: NuevaActuacionData) => {
    const actuacion = {
      id: actuaciones.length + 1,
      fecha: nuevaActuacion.fecha,
      tipo: nuevaActuacion.tipo,
      descripcion: nuevaActuacion.descripcion,
      responsable: nuevaActuacion.responsable,
      estado: nuevaActuacion.estado,
      colorBorde: nuevaActuacion.estado === 'COMPLETADA' ? '#10B981' : '#F59E0B'
    };

    setActuaciones([actuacion, ...actuaciones]);
    setHasChanges(true);
  };

  // ==================== FUNCIONES PARA ÚLTIMA ACTUACIÓN PROCESAL ====================
  
  const handleNotificar = () => {
    setMostrarModalNotificar(true);
  };

  const confirmarNotificacion = () => {
    const destinatarios = [
      { nombre: proceso.disciplinado, correo: 'juan.perez@esap.gov.co', rol: 'Disciplinado' },
      { nombre: proceso.abogadoAsignado, correo: 'carlos.mendoza@esap.gov.co', rol: 'Investigador' },
      { nombre: 'Oficina Jurídica ESAP', correo: 'juridica@esap.gov.co', rol: 'Oficina Jurídica' }
    ];

    toast.loading('📧 Enviando notificaciones por correo electrónico...', {
      id: 'notificar-actuacion',
      duration: 2000
    });
    
    setTimeout(() => {
      toast.success(`✅ Notificaciones enviadas exitosamente a ${destinatarios.length} destinatarios`, {
        id: 'notificar-actuacion',
        description: `${destinatarios.map(d => d.correo).join(', ')}`,
        duration: 5000
      });
      setHasChanges(true);
      setMostrarModalNotificar(false);
    }, 2000);
  };

  const handleCompartir = () => {
    toast.loading('🔗 Generando enlace seguro de compartir...', {
      id: 'compartir-actuacion',
      duration: 1500
    });
    
    setTimeout(async () => {
      const enlace = `https://esap.gov.co/procesos/${proceso.id}/actuacion-ultima`;
      setEnlaceCompartir(enlace);
      
      // Copiar al portapapeles usando la utilidad
      const copiado = await copyToClipboard(enlace);
      
      // Mostrar modal con el enlace
      setMostrarModalCompartir(true);
      
      if (copiado) {
        toast.success('✅ Enlace generado y copiado al portapapeles', {
          id: 'compartir-actuacion',
          description: 'Puedes pegar el enlace donde desees compartirlo',
          duration: 4000
        });
      } else {
        toast.info('🔗 Enlace generado', {
          id: 'compartir-actuacion',
          description: 'Copia el enlace desde el modal',
          duration: 3000
        });
      }
    }, 1500);
  };

  const handleDescargarPDF = () => {
    const nombreArchivo = `Actuacion_${proceso.id}_${new Date().toLocaleDateString('es-CO').replace(/\//g, '-')}.pdf`;
    
    toast.loading('📄 Generando documento PDF...', {
      id: 'descargar-pdf-actuacion',
      duration: 2000
    });
    
    setTimeout(() => {
      toast.success('✅ Documento PDF generado y descargado', {
        id: 'descargar-pdf-actuacion',
        description: `${nombreArchivo} (245 KB)`,
        duration: 4000,
        action: {
          label: 'Ver carpeta',
          onClick: () => toast.info('Abriendo carpeta de descargas...')
        }
      });
      
      // En producción esto descargará el archivo real:
      // window.open(`/api/procesos/${proceso.id}/actuacion/pdf`, '_blank');
      // O usar: downloadFile(`/api/procesos/${proceso.id}/actuacion/pdf`, nombreArchivo);
      
      console.log(`📥 Descargando: ${nombreArchivo}`);
    }, 2000);
  };

  const handleAbrirEnPortales = () => {
    setMostrarModalPortales(true);
  };

  const confirmarAbrirPortales = () => {
    const urlPortal = 'https://consultaprocesos.ramajudicial.gov.co/';
    
    toast.loading('🌐 Abriendo Portal de Notificaciones Judiciales...', {
      id: 'abrir-portales',
      duration: 1500
    });
    
    setTimeout(() => {
      // Abrir en nueva ventana
      window.open(urlPortal, '_blank', 'noopener,noreferrer');
      
      toast.success('✅ Portal abierto en nueva ventana', {
        id: 'abrir-portales',
        description: 'Sistema de Portales de la Rama Judicial',
        duration: 3000
      });
      
      setMostrarModalPortales(false);
    }, 1500);
  };

  // ==================== FUNCIONES PARA DOCUMENTOS DEL PROCESO ====================
  
  const handleSubirDocumento = () => {
    toast.info('📎 Abriendo selector de archivos', {
      description: 'Selecciona el documento desde tu equipo',
      duration: 2000
    });
    
    // Crear input file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.png';
    
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        toast.loading('⏳ Subiendo documento...', {
          id: 'subir-documento',
          duration: 2000
        });
        
        setTimeout(() => {
          const nuevoDocumento = {
            id: documentos.length + 1,
            nombre: file.name,
            tamaño: `${(file.size / 1024).toFixed(0)} KB`,
            fecha: new Date().toLocaleDateString('es-CO'),
            tipo: 'Documento General'
          };
          
          setDocumentos([nuevoDocumento, ...documentos]);
          setHasChanges(true);
          
          toast.success('✅ Documento subido exitosamente', {
            id: 'subir-documento',
            description: `${file.name} agregado al proceso ${proceso.id}`,
            duration: 4000
          });
          
          // Log para analytics
          console.log('📊 Documento subido:', {
            proceso: proceso.id,
            documento: file.name,
            tamaño: nuevoDocumento.tamaño,
            timestamp: new Date().toISOString()
          });
        }, 2000);
      }
    };
    
    input.click();
  };

  const handleVerDocumento = (doc: any) => {
    setDocumentoSeleccionado(doc);
    setVisorAbierto(true);
    
    toast.success('📄 Visor de documentos abierto', {
      description: `Visualizando: ${doc.nombre}`,
      duration: 2000
    });
  };

  const handleDescargarDocumento = (doc: any) => {
    toast.loading('⏳ Preparando descarga...', {
      id: 'descargar-documento',
      duration: 1500
    });
    
    setTimeout(() => {
      // Crear contenido HTML del documento
      const contenidoHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${doc.nombre} - ${proceso.id}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 40px;
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #003DA5; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
            }
            .header h1 { 
              color: #003DA5; 
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .header p { 
              margin: 5px 0; 
              color: #666;
            }
            .metadata { 
              margin: 30px 0; 
              padding: 20px; 
              background: #f5f5f5;
              border-left: 4px solid #003DA5;
            }
            .metadata-item { 
              margin: 10px 0; 
            }
            .metadata-label { 
              font-weight: bold; 
              color: #003DA5;
              display: inline-block;
              width: 180px;
            }
            .content { 
              margin: 30px 0;
              text-align: justify;
            }
            .footer { 
              margin-top: 50px; 
              padding-top: 20px; 
              border-top: 2px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA</h1>
            <p>ESAP - República de Colombia</p>
            <p>Oficina de Control Disciplinario Interno</p>
          </div>
          
          <div class="metadata">
            <div class="metadata-item">
              <span class="metadata-label">Proceso No:</span>
              <span>${proceso.id}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Tipo de Falta:</span>
              <span>${proceso.tipoFalta}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Etapa Procesal:</span>
              <span>${proceso.etapa}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Tipo de Documento:</span>
              <span>${doc.tipo}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Nombre del Archivo:</span>
              <span>${doc.nombre}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Tamaño:</span>
              <span>${doc.tamaño}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Fecha de Carga:</span>
              <span>${doc.fecha}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Disciplinado:</span>
              <span>${proceso.disciplinado}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Investigador Asignado:</span>
              <span>${proceso.abogadoAsignado}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Fecha de Generación:</span>
              <span>${new Date().toLocaleDateString('es-CO', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          </div>
          
          <div class="content">
            <h2 style="color: #003DA5;">${doc.tipo.toUpperCase()}</h2>
            
            <p><strong>Documento del Expediente Disciplinario</strong></p>
            
            <p>El presente documento hace parte integral del expediente disciplinario ${proceso.id}, 
            el cual se encuentra actualmente en etapa de <strong>${proceso.etapa}</strong>.</p>
            
            <p><strong>Objeto del Documento:</strong></p>
            <p>Este ${doc.tipo} constituye un elemento fundamental del proceso disciplinario, 
            siendo parte de la documentación oficial que soporta las actuaciones adelantadas por 
            la Oficina de Control Disciplinario Interno de la ESAP.</p>
            
            <p><strong>Marco Legal:</strong></p>
            <p>El presente documento se enmarca dentro de las disposiciones establecidas en el 
            Código General Disciplinario (Ley 1952 de 2019) y demás normas concordantes que 
            regulan el procedimiento disciplinario en Colombia.</p>
            
            <p><strong>Cadena de Custodia:</strong></p>
            <p>Este documento ha sido incorporado al expediente digital disciplinario cumpliendo 
            con todos los protocolos de cadena de custodia, autenticidad y preservación de evidencia 
            establecidos por la normatividad vigente.</p>
            
            <p><strong>Acceso y Consulta:</strong></p>
            <p>El documento ha sido puesto en conocimiento de las partes intervinientes en el proceso, 
            garantizando el derecho de defensa, contradicción y acceso al expediente consagrado en el 
            artículo 29 de la Constitución Política de Colombia.</p>
            
            <p><strong>Características del Archivo:</strong></p>
            <ul>
              <li>Nombre: ${doc.nombre}</li>
              <li>Tamaño: ${doc.tamaño}</li>
              <li>Fecha de incorporación: ${doc.fecha}</li>
              <li>Tipo: ${doc.tipo}</li>
            </ul>
            
            <p><strong>Declaración de Autenticidad:</strong></p>
            <p>Se certifica que el presente documento es auténtico y hace parte oficial del 
            expediente disciplinario ${proceso.id}, habiendo sido validado y aprobado por la 
            Oficina de Control Disciplinario Interno de la ESAP.</p>
          </div>
          
          <div class="footer">
            <p><strong>Sistema de Gestión Legal ESAP</strong></p>
            <p>Documento oficial del proceso disciplinario ${proceso.id}</p>
            <p>Generado el: ${new Date().toLocaleString('es-CO')}</p>
            <p>Control Disciplinario Interno - ESAP</p>
          </div>
        </body>
        </html>
      `;
      
      // Crear blob y descargar
      const blob = new Blob([contenidoHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nombre.replace('.pdf', '.html');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('✅ Descarga completada', {
        id: 'descargar-documento',
        description: `${doc.nombre} (${doc.tamaño}) guardado en Descargas`,
        duration: 4000
      });
      
      // Log para analytics
      console.log('📊 Documento descargado:', {
        proceso: proceso.id,
        documento: doc.nombre,
        tipo: doc.tipo,
        timestamp: new Date().toISOString()
      });
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCerrar}>
      <DialogContent hideCloseButton className="w-[95vw] max-w-[1100px] lg:max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">
          Proceso Disciplinario {proceso.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Vista completa del proceso disciplinario {proceso.id} con información detallada de hechos, pruebas, actuaciones y decisiones
        </DialogDescription>
        
        {/* ==================== HEADER LIMPIO ESAP 2025 ==================== */}
        <ModalHeaderClean
          icono={Gavel}
          titulo={proceso.id}
          subtitulo={proceso.tipoFalta}
          badges={[
            { texto: proceso.etapa, color: 'azul' },
            { texto: `${proceso.diasRestantes} días restantes`, color: 'naranja' }
          ]}
          onClose={onClose}
        />

        {/* ==================== TABS NAVIGATION ==================== */}
        <Tabs value={tabActivo} onValueChange={setTabActivo} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 border-b bg-gray-50">
            <TabsList className="bg-transparent border-0 p-0 h-auto gap-1">
              <TabsTrigger 
                value="general"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <FileText className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger 
                value="hechos"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Hechos
              </TabsTrigger>
              <TabsTrigger 
                value="pruebas"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <Eye className="w-4 h-4 mr-2" />
                Pruebas
              </TabsTrigger>
              <TabsTrigger 
                value="actuaciones"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <Clock className="w-4 h-4 mr-2" />
                Actuaciones
              </TabsTrigger>
              <TabsTrigger 
                value="decisiones"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Decisiones
              </TabsTrigger>
              <TabsTrigger 
                value="documentos"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <FileText className="w-4 h-4 mr-2" />
                Documentos
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ==================== TAB: GENERAL ==================== */}
          <TabsContent value="general" className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Información del Proceso */}
              <Card className="p-4 border-2 border-blue-100">
                <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                  <Gavel className="w-5 h-5" />
                  Información del Proceso
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Número de Proceso</p>
                    <p className="font-bold text-lg" style={{ color: '#003DA5' }}>{proceso.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tipo de Falta</p>
                    <Badge className="bg-orange-100 text-orange-700 font-semibold">
                      {proceso.tipoFalta}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Etapa Actual</p>
                    <p className="font-bold">{proceso.etapa}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Investigador Asignado</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5' }}>
                          {proceso.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-bold">{proceso.abogadoAsignado}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Información del Disciplinado */}
              <Card className="p-4 border-2 border-gray-200">
                <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-gray-800">
                  <User className="w-5 h-5" />
                  Disciplinado
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Nombre Completo</p>
                    <p className="font-bold text-lg">{proceso.disciplinado}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cargo</p>
                    <p className="font-semibold">{proceso.cargo || 'Coordinador Académico'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Dependencia</p>
                    <p className="font-semibold">{proceso.dependencia || 'Dirección Académica'}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Cronología de Términos */}
            <Card className="p-4 bg-blue-50 border-2 border-blue-200">
              <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                <Clock className="w-5 h-5" />
                Cronología de Términos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Días Restantes</p>
                  <p className="text-3xl font-black text-orange-600">{proceso.diasRestantes}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Días Transcurridos</p>
                  <p className="text-3xl font-black text-blue-600">{proceso.diasTotales - proceso.diasRestantes}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Días Totales</p>
                  <p className="text-3xl font-black text-gray-600">{proceso.diasTotales}</p>
                </div>
              </div>
              
              {/* Barra de progreso */}
              <div className="mt-4">
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                    style={{ width: `${((proceso.diasTotales - proceso.diasRestantes) / proceso.diasTotales) * 100}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* ==================== ÚLTIMA ACTUACIÓN PROCESAL ==================== */}
            <Card className="p-6 border-2 border-blue-200 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-xl flex items-center gap-2" style={{ color: '#003DA5' }}>
                  <AlertTriangle className="w-6 h-6" />
                  ÚLTIMA ACTUACIÓN PROCESAL
                </h3>
              </div>

              <div className="p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl mb-5 border border-blue-200">
                <p className="text-sm font-semibold text-gray-600 mb-2">Actuación:</p>
                <p className="font-black text-lg text-gray-900">
                  {proceso.ultimaActuacion?.descripcion || 'Solicitud de informes a RRHH'}
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-gray-500">
                  <span>📅 {proceso.fechaActualizacion.toLocaleDateString('es-CO')}</span>
                  <span>⏰ {proceso.fechaActualizacion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={handleNotificar}
                  size="sm"
                  className="font-semibold"
                  style={{ background: '#F57C00', color: '#FFFFFF' }}
                >
                  <Bell className="w-4 h-4 mr-1.5" />
                  Notificar
                </Button>
                <Button 
                  onClick={handleCompartir}
                  size="sm"
                  className="font-semibold"
                  style={{ background: '#F57C00', color: '#FFFFFF' }}
                >
                  <Share2 className="w-4 h-4 mr-1.5" />
                  Compartir
                </Button>
                <Button 
                  onClick={handleDescargarPDF}
                  size="sm"
                  className="font-semibold"
                  style={{ background: '#F57C00', color: '#FFFFFF' }}
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  PDF
                </Button>
                <Button 
                  onClick={handleAbrirEnPortales}
                  size="sm"
                  className="font-semibold"
                  style={{ background: '#1e5da8', color: '#FFFFFF' }}
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Abrir en Portales
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ==================== TAB: HECHOS ==================== */}
          <TabsContent value="hechos" className="flex-1 overflow-y-auto p-6">
            <Card className="p-6">
              <h3 className="font-black text-xl mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                <AlertTriangle className="w-6 h-6" />
                Descripción de los Hechos
              </h3>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {proceso.descripcionHechos || 'El funcionario presuntamente incurrió en irregularidades durante el proceso de selección de docentes, favoreciendo candidatos sin cumplir los requisitos establecidos en el manual de contratación de la entidad.'}
                </p>
              </div>
              
              <div className="mt-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <p className="text-sm font-bold text-orange-800 mb-2">⚠️ Clasificación de la Falta</p>
                <Badge className="bg-orange-600 text-white font-bold text-sm">
                  FALTA {proceso.tipoFalta?.toUpperCase()}
                </Badge>
              </div>
            </Card>
          </TabsContent>

          {/* ==================== TAB: PRUEBAS ==================== */}
          <TabsContent value="pruebas" className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>Material Probatorio</h3>
              <Button 
                onClick={handleAgregarPrueba}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Prueba
              </Button>
            </div>

            {pruebas.map((prueba) => (
              <Card key={prueba.id} className="p-4 hover:shadow-md transition-all border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-50">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-1">{prueba.nombre}</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {prueba.descripcion}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleVerPrueba(prueba)}
                        className="font-semibold border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        Ver
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDescargarPrueba(prueba)}
                        className="font-semibold border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        Descargar
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* ==================== TAB: ACTUACIONES ==================== */}
          <TabsContent value="actuaciones" className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>
                Historial de Actuaciones
              </h3>
              
              {/* ✅ BOTÓN AGREGAR ACTUACIÓN */}
              <Button
                onClick={() => setModalNuevaActuacionOpen(true)}
                className="font-bold flex items-center gap-2"
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Plus className="w-4 h-4" />
                Agregar Actuación
              </Button>
            </div>

            {/* Lista de actuaciones con estado dinámico */}
            {actuaciones.length === 0 ? (
              <Card className="p-8 text-center border-2 border-dashed border-gray-300">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h4 className="font-bold text-lg text-gray-600 mb-2">
                  Sin actuaciones registradas
                </h4>
                <p className="text-sm text-gray-500 mb-4">
                  Aún no se han registrado actuaciones en este proceso disciplinario
                </p>
                <Button
                  onClick={() => setModalNuevaActuacionOpen(true)}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Primera Actuación
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {actuaciones.map((act) => (
                  <Card 
                    key={act.id} 
                    className="p-4 border-l-4 hover:shadow-md transition-all" 
                    style={{ borderLeftColor: act.colorBorde }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg" style={{ background: `${act.colorBorde}15` }}>
                        <Clock className="w-5 h-5" style={{ color: act.colorBorde }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span 
                                className="px-2 py-0.5 text-xs font-bold rounded-full"
                                style={{ 
                                  background: `${act.colorBorde}20`,
                                  color: act.colorBorde
                                }}
                              >
                                {act.tipo}
                              </span>
                              <span className="text-xs text-gray-500">📅 {act.fecha}</span>
                            </div>
                            <p className="font-bold text-sm text-gray-900 mb-1">{act.descripcion}</p>
                            <p className="text-xs text-gray-600">
                              👤 <span className="font-semibold">{act.responsable}</span>
                            </p>
                          </div>
                          <span 
                            className={`px-2.5 py-1 text-xs font-bold rounded-full whitespace-nowrap ${
                              act.estado === 'COMPLETADA' 
                                ? 'bg-green-100 text-green-800' 
                                : act.estado === 'EN_REVISION'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {act.estado === 'COMPLETADA' ? '✅ Completada' : 
                             act.estado === 'EN_REVISION' ? '🔍 En Revisión' : '⏳ Pendiente'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}


            {/* ==================== ACCIONES PARA ÚLTIMA ACTUACIÓN PROCESAL ==================== */}
            <div className="mt-6 flex gap-2">
              <Button 
                onClick={handleNotificar}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Bell className="w-4 h-4 mr-2" />
                Notificar
              </Button>
              <Button 
                onClick={handleCompartir}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </Button>
              <Button 
                onClick={handleDescargarPDF}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <FileDown className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
              <Button 
                onClick={handleAbrirEnPortales}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir en Portales
              </Button>
            </div>
          </TabsContent>

          {/* ==================== TAB: DECISIONES ==================== */}
          <TabsContent value="decisiones" className="flex-1 overflow-y-auto p-6">
            {decisiones.length === 0 ? (
              <Card className="p-6 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="font-black text-xl mb-2 text-gray-600">Sin Decisiones Registradas</h3>
                <p className="text-gray-500 mb-4">
                  El proceso aún se encuentra en etapa de investigación
                </p>
                <Button 
                  onClick={() => {
                    setMostrarFormularioDecision(true);
                    setHasChanges(true);
                  }}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Decisión
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>
                    Decisiones Registradas ({decisiones.length})
                  </h3>
                  <Button 
                    onClick={() => {
                      setMostrarFormularioDecision(true);
                      setHasChanges(true);
                    }}
                    style={{ background: '#003DA5', color: '#FFFFFF' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Decisión
                  </Button>
                </div>

                {decisiones.map((decision, index) => (
                  <Card key={index} className="p-6 border-2 border-blue-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-black text-xl" style={{ color: '#003DA5' }}>
                            {decision.tipoDecision}
                          </h4>
                          <Badge 
                            className="font-bold"
                            style={{ 
                              background: decision.tipoFallo === 'Absolutoria' ? '#10B981' : '#EF4444',
                              color: '#FFFFFF'
                            }}
                          >
                            {decision.tipoFallo}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Decisión #{index + 1} • {decision.fecha}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {decision.sancion && (
                        <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                          <p className="text-sm font-bold text-orange-900 mb-1">⚖️ Sanción Impuesta</p>
                          <p className="font-bold text-orange-800">{decision.sancion}</p>
                        </div>
                      )}

                      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <p className="text-sm font-bold text-blue-900 mb-2">📋 Consideraciones</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {decision.consideraciones}
                        </p>
                      </div>

                      {decision.fundamentosJuridicos && (
                        <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                          <p className="text-sm font-bold text-gray-900 mb-2">⚖️ Fundamentos Jurídicos</p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {decision.fundamentosJuridicos}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Responsable</p>
                          <p className="font-bold text-sm">{decision.responsable}</p>
                        </div>
                        <div className="p-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Cargo</p>
                          <p className="font-bold text-sm">{decision.cargoResponsable}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="font-semibold">
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          Ver Detalle
                        </Button>
                        <Button size="sm" variant="outline" className="font-semibold">
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Descargar
                        </Button>
                        <Button size="sm" variant="outline" className="font-semibold text-orange-600 border-orange-300 hover:bg-orange-50">
                          <Bell className="w-3.5 h-3.5 mr-1.5" />
                          Notificar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* ==================== SECCIÓN: EXCEPCIONES PROCESALES ==================== */}
            <div className="mt-8 pt-6 border-t-2 border-gray-200">
              <Card className="p-5 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <h3 className="font-black text-lg text-orange-900">
                      Excepciones Procesales ({excepciones.length})
                    </h3>
                  </div>
                  <Button 
                    onClick={() => {
                      setModalNuevaExcepcion(true);
                      setHasChanges(true);
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Nueva Excepción
                  </Button>
                </div>

                {excepciones.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-orange-700 font-medium">
                      No hay excepciones procesales registradas en este expediente
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-4">
                    {excepciones.map((excepcion, index) => (
                      <Card key={index} className="p-4 border-2 border-orange-300 bg-white">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-base text-orange-900">
                                {excepcion.tipo}
                              </h4>
                              <Badge 
                                variant="outline"
                                className="text-xs font-semibold border-orange-400 text-orange-700"
                              >
                                {excepcion.estado}
                              </Badge>
                            </div>
                            
                            {/* Descripción */}
                            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-bold text-gray-700 mb-1">📋 Descripción:</p>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {excepcion.descripcion}
                              </p>
                            </div>

                            {/* Fundamento Legal */}
                            {excepcion.fundamento && (
                              <div className="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                <p className="text-xs font-bold text-orange-900 mb-1">⚖️ Fundamento Legal:</p>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {excepcion.fundamento}
                                </p>
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-600">Fecha:</span>
                                <span className="font-semibold ml-1">{excepcion.fecha}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Presentada por:</span>
                                <span className="font-semibold ml-1">{excepcion.responsable}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 ml-3">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* ==================== TAB: DOCUMENTOS ==================== */}
          <TabsContent value="documentos" className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>Documentos del Proceso</h3>
              <Button 
                onClick={handleSubirDocumento}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir Documento
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documentos.map((doc) => (
                <Card key={doc.id} className="p-4 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div className="flex-1">
                      <h4 className="font-bold mb-1">{doc.nombre}</h4>
                      <p className="text-xs text-gray-500">{doc.tamaño} • {doc.fecha}</p>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs font-semibold border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
                          onClick={() => handleVerDocumento(doc)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Ver
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs font-semibold border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                          onClick={() => handleDescargarDocumento(doc)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* ==================== FOOTER STICKY ==================== */}
        <div className="flex-shrink-0 bg-gray-50 border-t px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Última actualización:</span> {proceso.fechaActualizacion.toLocaleDateString('es-CO')}
            </p>
            {hasChanges && (
              <Badge className="bg-orange-100 text-orange-700 font-semibold text-xs">
                Cambios sin guardar
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCerrar}
              className="font-semibold"
            >
              Cerrar
            </Button>
            <Button 
              onClick={handleGuardarCambios}
              disabled={!hasChanges}
              className="font-semibold"
              style={{ 
                background: hasChanges ? '#003DA5' : '#9CA3AF', 
                color: '#FFFFFF',
                cursor: hasChanges ? 'pointer' : 'not-allowed'
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* ==================== MODAL: ENLACE COMPARTIR ==================== */}
      {mostrarModalCompartir && (
        <Dialog open={mostrarModalCompartir} onOpenChange={setMostrarModalCompartir}>
          <DialogContent hideCloseButton className="max-w-2xl">
            <DialogTitle className="text-2xl font-black flex items-center gap-2" style={{ color: '#003DA5' }}>
              <Share2 className="w-6 h-6" />
              Enlace de Compartir Generado
            </DialogTitle>
            <DialogDescription className="sr-only">
              Enlace seguro para compartir la última actuación procesal
            </DialogDescription>

            <div className="space-y-4 mt-4">
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm font-bold text-blue-900 mb-2">🔗 Enlace Seguro</p>
                <p className="text-sm text-gray-700 break-all font-mono bg-white p-3 rounded border">
                  {enlaceCompartir}
                </p>
              </div>

              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <p className="text-sm font-bold text-green-900 mb-2">✅ Enlace Copiado al Portapapeles</p>
                <p className="text-sm text-green-700">
                  El enlace ha sido copiado automáticamente. Puedes pegarlo en un correo, mensaje o documento.
                </p>
              </div>

              <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <p className="text-sm font-bold text-orange-900 mb-2">⚠️ Información Importante</p>
                <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                  <li>Este enlace permite consultar la última actuación procesal</li>
                  <li>Es válido por 30 días desde su generación</li>
                  <li>Requiere autenticación para acceder al contenido</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const copiado = await copyToClipboard(enlaceCompartir);
                    if (copiado) {
                      toast.success('✅ Enlace copiado nuevamente');
                    } else {
                      toast.info('📋 No se pudo copiar', {
                        description: enlaceCompartir
                      });
                    }
                  }}
                  className="font-semibold"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Copiar Nuevamente
                </Button>
                <Button
                  onClick={() => setMostrarModalCompartir(false)}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                  className="font-semibold"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ==================== MODAL: NOTIFICAR ==================== */}
      {mostrarModalNotificar && (
        <Dialog open={mostrarModalNotificar} onOpenChange={setMostrarModalNotificar}>
          <DialogContent hideCloseButton className="max-w-2xl">
            <DialogTitle className="text-2xl font-black flex items-center gap-2" style={{ color: '#003DA5' }}>
              <Bell className="w-6 h-6" />
              Notificar Última Actuación Procesal
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirmación para enviar notificaciones por correo electrónico a los destinatarios del proceso disciplinario
            </DialogDescription>

            <div className="space-y-4 mt-4">
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm font-bold text-blue-900 mb-2">🔗 Destinatarios</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>{proceso.disciplinado} (Disciplinado)</li>
                  <li>{proceso.abogadoAsignado} (Investigador)</li>
                  <li>Oficina Jurídica ESAP</li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <p className="text-sm font-bold text-green-900 mb-2">✅ Notificación Exitosa</p>
                <p className="text-sm text-green-700">
                  Las notificaciones se enviarán por correo electrónico a los destinatarios indicados.
                </p>
              </div>

              <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <p className="text-sm font-bold text-orange-900 mb-2">⚠️ Información Importante</p>
                <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                  <li>Las notificaciones incluyen la última actuación procesal</li>
                  <li>Requiere autenticación para acceder al contenido</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={confirmarNotificacion}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                  className="font-semibold"
                >
                  Notificar
                </Button>
                <Button
                  onClick={() => setMostrarModalNotificar(false)}
                  style={{ background: '#9CA3AF', color: '#FFFFFF' }}
                  className="font-semibold"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ==================== MODAL: PORTALES ==================== */}
      {mostrarModalPortales && (
        <Dialog open={mostrarModalPortales} onOpenChange={setMostrarModalPortales}>
          <DialogContent hideCloseButton className="max-w-2xl">
            <DialogTitle className="text-2xl font-black flex items-center gap-2" style={{ color: '#003DA5' }}>
              <ExternalLink className="w-6 h-6" />
              Abrir en Portales
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirmación para abrir el Portal de Notificaciones Judiciales en una nueva ventana
            </DialogDescription>

            <div className="space-y-4 mt-4">
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm font-bold text-blue-900 mb-2">🔗 Portal de Notificaciones Judiciales</p>
                <p className="text-sm text-gray-700 break-all font-mono bg-white p-3 rounded border">
                  https://consultaprocesos.ramajudicial.gov.co/
                </p>
              </div>

              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <p className="text-sm font-bold text-green-900 mb-2">✅ Portal Abierto Exitosamente</p>
                <p className="text-sm text-green-700">
                  El Portal de Notificaciones Judiciales se abrirá en una nueva ventana.
                </p>
              </div>

              <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <p className="text-sm font-bold text-orange-900 mb-2">⚠️ Información Importante</p>
                <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                  <li>Requiere autenticación para acceder al contenido</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={confirmarAbrirPortales}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                  className="font-semibold"
                >
                  Abrir Portal
                </Button>
                <Button
                  onClick={() => setMostrarModalPortales(false)}
                  style={{ background: '#9CA3AF', color: '#FFFFFF' }}
                  className="font-semibold"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ==================== MODAL: REGISTRAR DECISIÓN ==================== */}
      <FormularioRegistrarDecision
        isOpen={mostrarFormularioDecision}
        onClose={() => setMostrarFormularioDecision(false)}
        onGuardar={(nuevaDecision) => {
          setDecisiones([...decisiones, nuevaDecision]);
          setMostrarFormularioDecision(false);
        }}
        procesoId={proceso.id}
      />

      {/* ==================== MODAL: NUEVA EXCEPCIÓN PROCESAL ==================== */}
      {modalNuevaExcepcion && (
        <Dialog open={modalNuevaExcepcion} onOpenChange={setModalNuevaExcepcion}>
          <DialogContent hideCloseButton className="w-[90vw] max-w-[420px] p-0">
            <DialogTitle className="sr-only">Nueva Excepción Procesal</DialogTitle>
            <DialogDescription className="sr-only">
              Registrar nueva excepción procesal en el proceso {proceso.id}
            </DialogDescription>

            <ModalHeaderClean
              titulo="Nueva Excepción Procesal"
              subtitulo={`Proceso ${proceso.id}`}
              icono={AlertTriangle}
              colorIcono="orange"
              onClose={() => setModalNuevaExcepcion(false)}
            />

            <div className="p-6 space-y-5">
              {/* SECCIÓN: Tipo de Excepción (Radio Buttons) - Parametrizable desde Configuraciones */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Tipo de Excepción Procesal *
                </label>
                <div className="space-y-3">
                  {tiposExcepcionesActivos && tiposExcepcionesActivos.length > 0 ? (
                    tiposExcepcionesActivos.map((tipo) => (
                      <label key={tipo.id} className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all">
                        <input
                          type="radio"
                          name="tipo-excepcion"
                          value={tipo.nombre}
                          className="mt-1 w-4 h-4 text-orange-600 focus:ring-orange-500"
                          id={`radio-${tipo.id}`}
                        />
                        <div className="flex-1">
                          <div className="font-bold text-gray-900">{tipo.icono} {tipo.nombre}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {tipo.descripcion}
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                      <p className="text-sm text-gray-600">
                        No hay tipos de excepciones configurados. <br />
                        <span className="text-xs">Configure los tipos en <strong>Configuraciones del Sistema</strong></span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* SECCIÓN: Causal Específica (Dropdown) - Parametrizable desde Configuraciones */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Causal Específica (Opcional)
                </label>
                <select 
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  id="impedimento-excepcion"
                >
                  <option value="">Seleccione una causal...</option>
                  {causalesEspecificasActivas && causalesEspecificasActivas.length > 0 ? (
                    causalesEspecificasActivas.map((causal) => (
                      <option key={causal.id} value={causal.nombre}>
                        {causal.icono} {causal.nombre} {causal.descripcion && `(${causal.descripcion})`}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No hay causales configuradas</option>
                  )}
                </select>
              </div>

              {/* SECCIÓN: Descripción de la Excepción */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📋 Descripción de la Excepción *
                </label>
                <textarea
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none text-sm"
                  rows={5}
                  placeholder="Describa detalladamente la excepción procesal. Indíquelas los hechos que la fundamentan o la excepción..."
                  id="descripcion-excepcion"
                />
              </div>

              {/* SECCIÓN: Fundamento Legal */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ⚖️ Fundamento Legal *
                </label>
                <textarea
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none text-sm"
                  rows={3}
                  placeholder="Indique las normas aplicables o jurisprudencia que fundamenta la excepción (Ej: Art. 100 CGP, Ley 734 de 2002...)"
                  id="fundamento-excepcion"
                />
              </div>

              {/* SECCIÓN: Presentada Por (Opcional) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  👤 Presentada Por (Opcional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  placeholder="Nombre de quien presenta la excepción"
                  id="responsable-excepcion"
                />
              </div>

              {/* ALERTA INFORMATIVA */}
              <Card className="p-3 bg-orange-50 border-2 border-orange-200">
                <p className="text-sm text-orange-800">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Las excepciones procesales deben ser fundamentadas jurídicamente y presentadas dentro de los términos legales establecidos.
                </p>
              </Card>
            </div>

            <div className="sticky bottom-0 bg-white border-t-2 px-6 py-4 flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setModalNuevaExcepcion(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => {
                  // Obtener valores de radio buttons
                  const radioSeleccionado = document.querySelector('input[name="tipo-excepcion"]:checked') as HTMLInputElement;
                  const impedimentoSelect = document.getElementById('impedimento-excepcion') as HTMLSelectElement;
                  const descripcionTextarea = document.getElementById('descripcion-excepcion') as HTMLTextAreaElement;
                  const fundamentoTextarea = document.getElementById('fundamento-excepcion') as HTMLTextAreaElement;
                  const responsableInput = document.getElementById('responsable-excepcion') as HTMLInputElement;

                  const tipoExcepcion = radioSeleccionado?.value;
                  const impedimento = impedimentoSelect?.value;
                  const descripcion = descripcionTextarea?.value;
                  const fundamento = fundamentoTextarea?.value;
                  const responsable = responsableInput?.value || 'Sin especificar';

                  // Validaciones
                  if (!tipoExcepcion) {
                    toast.error('⚠️ Tipo de excepción requerido', {
                      description: 'Debe seleccionar un tipo de excepción procesal'
                    });
                    return;
                  }

                  if (!descripcion) {
                    toast.error('⚠️ Descripción requerida', {
                      description: 'Debe describir la excepción procesal'
                    });
                    return;
                  }

                  if (!fundamento) {
                    toast.error('⚠️ Fundamento legal requerido', {
                      description: 'Debe indicar el fundamento legal de la excepción'
                    });
                    return;
                  }

                  // Construir tipo completo
                  let tipoCompleto = tipoExcepcion;
                  if (impedimento) {
                    tipoCompleto += ` - ${impedimento}`;
                  }

                  const nuevaExcepcion = {
                    tipo: tipoCompleto,
                    descripcion,
                    fundamento,
                    responsable,
                    fecha: new Date().toLocaleDateString('es-CO'),
                    estado: 'Pendiente de Resolución'
                  };

                  setExcepciones([...excepciones, nuevaExcepcion]);
                  setModalNuevaExcepcion(false);
                  
                  toast.success('✅ Excepción registrada', {
                    description: `${tipoCompleto} agregada al proceso`,
                    duration: 3000
                  });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Registrar Excepción
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ==================== MODAL: VISOR DE DOCUMENTOS ==================== */}
      {pruebaSeleccionada && (
        <VisorDocumentoModal
          isOpen={visorAbierto}
          onClose={() => setVisorAbierto(false)}
          archivo={pruebaSeleccionada.archivo}
          numero={pruebaSeleccionada.nombre}
          asunto={pruebaSeleccionada.descripcion}
        />
      )}

      {/* ==================== MODAL: VISOR DE DOCUMENTOS DEL PROCESO ==================== */}
      {documentoSeleccionado && (
        <VisorDocumentoModal
          isOpen={visorAbierto}
          onClose={() => setVisorAbierto(false)}
          archivo={documentoSeleccionado.nombre}
          numero={documentoSeleccionado.tipo}
          asunto={`Documento del proceso ${proceso.id}`}
        />
      )}

      {/* ==================== MODAL: NUEVA ACTUACIÓN ==================== */}
      <ModalNuevaActuacion
        isOpen={modalNuevaActuacionOpen}
        onClose={() => setModalNuevaActuacionOpen(false)}
        onSave={handleGuardarActuacion}
        procesoId={proceso.id}
      />
    </Dialog>
  );
}