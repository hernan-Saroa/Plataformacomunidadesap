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

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Users, Calendar, CheckCircle, X, ChevronRight, 
  ChevronLeft, Download, Send, Eye, AlertCircle, Sparkles,
  Building2, MapPin, Clock, Target, FileCheck, Mail, Shield, Settings,
  Edit, Upload, Save
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

// Componentes del design system
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';

// Servicios API
import { auditoriasApi } from './services/api';
import * as tablerosKanbanService from '../../../services/tableros-kanban.service';
import { authService } from '../../../services/api/authService';
import { Permissions } from '../../../enums/permissions';
import { API_MODE, MICROSERVICE_URLS } from '../../../config/environment';

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

// ============ FUNCIÓN HELPER PARA GENERAR ACTIVIDADES DINÁMICAS ============

/**
 * Genera el texto de actividades para una fase desde la BD
 */
function generarActividadesDinamicas(nombreFase: string, duracionDias: number, actividadesPorFase: Record<string, any[]>): string {
  const actividades = actividadesPorFase[nombreFase] || [];
  
  // Mapear número de fase
  const numeroFase = nombreFase === 'Planeación' ? 1 : nombreFase === 'Ejecución' ? 2 : 3;
  
  // Si no hay actividades en BD, usar mensaje informativo
  if (actividades.length === 0) {
    return `FASE ${numeroFase}: ${nombreFase.toUpperCase()} (${duracionDias} días)
- (No se han configurado actividades para esta fase en el sistema)`;
  }
  
  // Generar lista de actividades ordenadas por orden
  const actividadesOrdenadas = [...actividades].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const listaActividades = actividadesOrdenadas
    .map(act => `- ${act.nombre || act.titulo}${act.esObligatoria ? ' (*)' : ''}`)
    .join('\n');
  
  return `FASE ${numeroFase}: ${nombreFase.toUpperCase()} (${duracionDias} días)
${listaActividades}
${actividades.some(a => a.esObligatoria) ? '\n(*) Actividades obligatorias' : ''}`;
}

// ============ FUNCIÓN HELPER PARA OBTENER URL BASE DE API ============

/**
 * Obtiene la URL base de la API para hacer requests al servidor
 * Usa la misma lógica que en services/api.ts
 */
const getApiBaseUrl = () => {
  // Si está en modo directo (local), apuntar directamente al microservicio
  if (API_MODE === 'direct') {
    return MICROSERVICE_URLS['control-institucional'] || 'http://localhost:3007';
  }
  
  // Modo gateway: usar la configuración de VITE_API_URL o fallback
  // @ts-ignore - Vite inyecta import.meta.env en build time
  const apiUrl = import.meta.env?.VITE_API_URL;
  
  if (apiUrl) {
    const base = apiUrl;
    // Si ya incluye /auditorias o /esap, usarla tal cual
    if (base.includes('/auditorias') || base.includes('/esap')) {
      return base.replace(/\/esap.*$/, ''); // Remover /esap si existe
    }
    // Si incluye /control-institucional, agregar /api/v1
    if (base.includes('/control-institucional')) {
      return `${base}/api/v1`;
    }
    // Si es solo el gateway base, agregar el prefijo completo
    return `${base}/control-institucional/api/v1`;
  }
  // Fallback: gateway por defecto
  return 'http://localhost:3000/control-institucional/api/v1';
};

// ============ FUNCIÓN HELPER PARA DESCARGAR PDF ============

// Contenido original de la carta de representante para comparación
const CARTA_REPRESENTANTE_ORIGINAL = `Fecha:\t\t(día – mes – año)
Para:\t\tnombre del jefe de la Oficina de Control Interno
Cargo:            Jefe de la Oficina de Control Interno


Asunto: \tCarta de representación de la auditoría interna basada en riesgos al (se menciona unidad auditable)


Cordial saludo

Mediante la presente carta de representación me permito comunicar que, para el desarrollo de la auditoria interna basada en riesgos al (se menciona unidad auditable), que será adelantada por parte de la Oficina de Control Interno - OCI, declaramos lo siguiente:

1.\tSomos responsables de la oportuna preparación, presentación y consistencia de la información que será entregada en el marco de la auditoría a la OCI para su revisión.

2.\tSe hará entrega oficialmente de toda la información relacionada con la gestión del proceso a evaluar, atendiendo los requerimientos hechos por la Oficina de Control Interno y en los plazos que así sean establecidos.

3.\tLa información a suministrar será válida, integral (suficiente y pertinente) y completa para los propósitos del proceso auditor. 



Cordialmente,



(firma)
______________________________________
(nombre del responsable de la unidad a auditar)
Cargo del responsable de la unidad a auditar

Elaboró:
`;

/**
 * Dibuja una tabla en el PDF
 */
function dibujarTabla(doc: any, filas: string[][], x: number, y: number, maxWidth: number) {
  if (filas.length === 0) return 0;
  
  const numColumnas = Math.max(...filas.map(f => f.length));
  const anchoColumna = maxWidth / numColumnas;
  
  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);
  
  let yActual = y;
  
  filas.forEach((fila, indexFila) => {
    const esEncabezado = indexFila === 0;
    
    // Calcular la altura necesaria para esta fila basada en el contenido
    let alturaMaxima = 6; // Altura mínima reducida
    
    fila.forEach((celda, indexColumna) => {
      doc.setFontSize(9);
      const textoProcesado = doc.splitTextToSize(celda.trim(), anchoColumna - 3);
      const alturaTexto = textoProcesado.length * 4 + 2; // Reducido el espaciado entre líneas
      if (alturaTexto > alturaMaxima) {
        alturaMaxima = alturaTexto;
      }
    });
    
    // Dibujar cada celda de la fila
    fila.forEach((celda, indexColumna) => {
      const xCelda = x + (indexColumna * anchoColumna);
      
      // Fondo para encabezados
      if (esEncabezado) {
        doc.setFillColor(240, 240, 240);
        doc.rect(xCelda, yActual, anchoColumna, alturaMaxima, 'F');
      }
      
      // Dibujar borde de celda
      doc.rect(xCelda, yActual, anchoColumna, alturaMaxima);
      
      // Texto
      doc.setFontSize(9);
      doc.setFont('helvetica', esEncabezado ? 'bold' : 'normal');
      doc.setTextColor(0, 0, 0);
      
      const textoProcesado = doc.splitTextToSize(celda.trim(), anchoColumna - 3);
      const yTexto = yActual + 3; // Reducido el padding superior
      
      textoProcesado.forEach((linea: string, idx: number) => {
        doc.text(linea, xCelda + 1.5, yTexto + (idx * 4)); // Reducido padding y espaciado entre líneas
      });
    });
    
    yActual += alturaMaxima;
  });
  
  // Retornar la altura total de la tabla
  return yActual - y;
}

/**
 * Genera y descarga un PDF a partir del contenido de un documento
 */
function descargarDocumentoPDF(documento: DocumentoGenerado): void {
  try {
    // Si es la Carta de Representante Y NO ha sido editada, descargar el PDF específico
    if (documento.tipo === 'carta-representante' && documento.contenido === CARTA_REPRESENTANTE_ORIGINAL) {
      toast.loading('Descargando PDF original...', { id: 'descargar-pdf' });
      
      // Usar endpoint del servidor en lugar de archivo estático
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('esap_auth_token');
      const url = `${apiBaseUrl}/templates/EM-FO-010`;
      
      fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.blob();
        })
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'EM-FO-010FormatocartaderepresentacinOCI_V02.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          toast.success('PDF descargado exitosamente', { 
            id: 'descargar-pdf',
            description: 'EM-FO-010FormatocartaderepresentacinOCI_V02.pdf'
          });
        })
        .catch(error => {
          console.error('Error al descargar PDF:', error);
          toast.error('Error al descargar el PDF', {
            id: 'descargar-pdf',
            description: error.message || 'Error desconocido'
          });
        });
      
      return;
    }
    
    // Si es la Carta de Compromiso Y NO ha sido editada, descargar el PDF específico
    const CARTA_COMPROMISO_ORIGINAL_START = 'Fecha:\t\t(día – mes – año)\nPara:\t\tNombre del responsable de la unidad auditada\nCargo:\n\nAsunto:';
    if (documento.tipo === 'carta-compromiso' && documento.contenido.startsWith(CARTA_COMPROMISO_ORIGINAL_START)) {
      toast.loading('Descargando PDF...', { id: 'descargar-pdf' });
      
      // Usar endpoint del servidor en lugar de archivo estático
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('esap_auth_token');
      const url = `${apiBaseUrl}/templates/EM-FO-009`;
      
      fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.blob();
        })
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'EM-FO-009FormatocartadecompromisoOCI.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          toast.success('PDF descargado exitosamente', { 
            id: 'descargar-pdf',
            description: 'EM-FO-009FormatocartadecompromisoOCI.pdf'
          });
        })
        .catch(error => {
          console.error('Error al descargar PDF:', error);
          toast.error('Error al descargar el PDF', {
            id: 'descargar-pdf',
            description: error.message || 'Error desconocido'
          });
        });
      
      return;
    }
    
    // Para otros documentos o si fue editado, generar PDF dinámicamente
    toast.loading('Generando PDF...', { id: 'generar-pdf' });
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;
    
    // Si es Carta de Representante, Carta de Compromiso, Oficio de Anuncio o Programa Individual, usar formato oficial
    if (documento.tipo === 'carta-representante' || documento.tipo === 'carta-compromiso' || 
        documento.tipo === 'oficio' || documento.tipo === 'programa-individual') {
      const margin = 15;
      const maxWidth = pageWidth - 2 * margin;
      const headerHeight = 25;
      const headerY = 15;
      const footerHeight = 20;
      const contentStartY = headerY + headerHeight + 7;
      const contentEndY = pageHeight - footerHeight;
      
      // Función para dibujar el encabezado
      const dibujarEncabezado = () => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        
        const logoWidth = 35;
        const logoX = margin;
        const tituloWidth = 100;
        const tituloX = logoX + logoWidth;
        const infoWidth = 45;
        const infoX = tituloX + tituloWidth;
        const rowHeight = headerHeight / 3;
        
        // Dibujar celdas del encabezado
        doc.rect(logoX, headerY, logoWidth, headerHeight);
        doc.rect(tituloX, headerY, tituloWidth, headerHeight);
        doc.rect(infoX, headerY, infoWidth, rowHeight);
        doc.rect(infoX, headerY + rowHeight, infoWidth, rowHeight);
        doc.rect(infoX, headerY + (rowHeight * 2), infoWidth, rowHeight);
        
        // Logo
        try {
          const logoImg = new Image();
          logoImg.src = '/ESAP.jpg';
          doc.addImage(logoImg, 'JPEG', logoX + 5, headerY + 3, logoWidth - 10, headerHeight - 6);
        } catch (error) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('LOGO', logoX + (logoWidth / 2), headerY + 12, { align: 'center' });
          doc.text('ESAP', logoX + (logoWidth / 2), headerY + 17, { align: 'center' });
        }
        
        // Título
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('FORMATO', tituloX + (tituloWidth / 2), headerY + 10, { align: 'center' });
        doc.setFontSize(10);
        let tituloTexto = '';
        let codigo = '';
        
        if (documento.tipo === 'carta-representante') {
          tituloTexto = 'CARTA DE REPRESENTACIÓN OCI';
          codigo = 'EM-FO-010';
        } else if (documento.tipo === 'carta-compromiso') {
          tituloTexto = 'CARTA DE COMPROMISO OCI';
          codigo = 'EM-FO-009';
        } else if (documento.tipo === 'oficio') {
          tituloTexto = 'OFICIO DE ANUNCIO';
          codigo = 'EM-FO-XXX'; // Ajustar según corresponda
        } else if (documento.tipo === 'programa-individual') {
          tituloTexto = 'PROGRAMA INDIVIDUAL DE AUDITORÍA';
          codigo = 'EM-FO-XXX'; // Ajustar según corresponda
        }
        
        doc.text(tituloTexto, tituloX + (tituloWidth / 2), headerY + 16, { align: 'center' });
        
        // Info derecha
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('CÓDIGO: ', infoX + 2, headerY + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(codigo, infoX + 18, headerY + 5);
        
        doc.setFont('helvetica', 'bold');
        doc.text('VERSIÓN: ', infoX + 2, headerY + rowHeight + 5);
        doc.setFont('helvetica', 'normal');
        doc.text('02', infoX + 20, headerY + rowHeight + 5);
        
        doc.setFont('helvetica', 'bold');
        doc.text('FECHA: ', infoX + 2, headerY + (rowHeight * 2) + 5);
        doc.setFont('helvetica', 'normal');
        doc.text('24/02/2025', infoX + 16, headerY + (rowHeight * 2) + 5);
      };
      
      // Función para dibujar pie de página
      const dibujarPiePagina = (numeroPagina: number) => {
        const yPie = pageHeight - 15;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        doc.text('Sede Nacional - Bogotá - Calle 44 No. 53 - 37 CAN', margin, yPie);
        doc.text('PBX: (+57 601) 7956110', margin, yPie + 4);
        doc.text('Correo Electrónico: ventanillaunica@esap.edu.co', margin, yPie + 8);
        
        // Número de página a la derecha
        doc.text(`Página ${numeroPagina}`, pageWidth - margin - 20, yPie + 8);
      };
      
      // Dibujar encabezado y pie de la primera página
      dibujarEncabezado();
      dibujarPiePagina(1);
      
      yPos = contentStartY;
      
      // Proceso info
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Proceso: ', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text('Evaluación Control y Mejora', margin + 18, yPos);
      
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Documento de referencia: ', margin, yPos);
      doc.setFont('helvetica', 'normal');
      const refText = 'Procedimiento de Auditorías internas basadas en riesgos EM-PT-004';
      const refLines = doc.splitTextToSize(refText, maxWidth - 48);
      doc.text(refLines, margin + 48, yPos);
      yPos += refLines.length * 4 + 8;
      
      // Contador de páginas
      let numeroPagina = 1;
      
      // Función para agregar nueva página con encabezado y pie
      const agregarNuevaPagina = () => {
        doc.addPage();
        numeroPagina++;
        dibujarEncabezado();
        dibujarPiePagina(numeroPagina);
        yPos = contentStartY;
      };
      
      // Función para dibujar tabla con manejo de saltos de página
      const dibujarTablaConPaginacion = (filas: string[][]) => {
        if (filas.length === 0) return;
        
        const encabezado = filas[0];
        let filasProcesadas = 0;
        
        while (filasProcesadas < filas.length) {
          const espacioDisponible = contentEndY - yPos;
          
          // Calcular cuántas filas caben en el espacio disponible
          let filasPorDibujar = [encabezado];
          let alturaAcumulada = 0;
          
          // Empezar desde la siguiente fila después de las ya procesadas, pero saltando el encabezado
          const inicioFilas = filasProcesadas === 0 ? 1 : filasProcesadas;
          
          for (let i = inicioFilas; i < filas.length; i++) {
            const fila = filas[i];
            if (!fila) break;
            
            // Estimar altura de esta fila
            let alturaFila = 6;
            fila.forEach((celda) => {
              const textoProcesado = doc.splitTextToSize(celda.trim(), (maxWidth / fila.length) - 3);
              const alturaTexto = textoProcesado.length * 4 + 2;
              if (alturaTexto > alturaFila) {
                alturaFila = alturaTexto;
              }
            });
            
            if (alturaAcumulada + alturaFila > espacioDisponible - 10) {
              // No cabe más, dibujar lo que tenemos
              break;
            }
            
            filasPorDibujar.push(fila);
            alturaAcumulada += alturaFila;
            filasProcesadas++;
          }
          
          // Dibujar las filas que caben
          if (filasPorDibujar.length > 1) {
            const alturaTabla = dibujarTabla(doc, filasPorDibujar, margin, yPos, maxWidth);
            yPos += alturaTabla + 3;
          }
          
          // Si quedan filas, ir a la siguiente página
          if (filasProcesadas < filas.length - 1) {
            agregarNuevaPagina();
          } else {
            break;
          }
        }
      };
      
      // Contenido del documento
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lineas = documento.contenido.split('\n');
      
      // Detectar si estamos en una tabla
      let enTabla = false;
      let filasTabla: string[][] = [];
      
      for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];
        
        // Control de salto de página mejorado
        if (yPos > contentEndY - 15) {
          agregarNuevaPagina();
        }
        
        if (linea.trim() === '') {
          // Si estábamos en una tabla, dibujarla
          if (enTabla && filasTabla.length > 0) {
            dibujarTablaConPaginacion(filasTabla);
            filasTabla = [];
            enTabla = false;
          }
          yPos += 3;
          continue;
        }
        
        // Detectar inicio de tabla (línea con al menos un tab y parece encabezado de tabla)
        if (linea.includes('\t') && (linea.startsWith('Actividad') || linea.startsWith('FASE') || enTabla)) {
          enTabla = true;
          const columnas = linea.split('\t').filter(c => c.trim());
          filasTabla.push(columnas);
          continue;
        }
        
        // Si estábamos en tabla pero esta línea no tiene tabs, dibujar la tabla primero
        if (enTabla && !linea.includes('\t')) {
          if (filasTabla.length > 0) {
            dibujarTablaConPaginacion(filasTabla);
            filasTabla = [];
            enTabla = false;
          }
        }
        
        // Detectar campos importantes
        if (linea.startsWith('Fecha:') || linea.startsWith('Para:') || linea.startsWith('Cargo:')) {
          doc.setFont('helvetica', 'bold');
          const partes = linea.split('\t\t');
          if (partes.length >= 2) {
            doc.text(partes[0], margin, yPos);
            doc.setFont('helvetica', 'normal');
            const valorLines = doc.splitTextToSize(partes[1], maxWidth - 30);
            doc.text(valorLines, margin + 28, yPos);
            yPos += valorLines.length * 5 + 1;
          } else {
            doc.text(linea, margin, yPos);
            doc.setFont('helvetica', 'normal');
            yPos += 5;
          }
        } else if (linea.startsWith('Asunto:')) {
          doc.setFont('helvetica', 'bold');
          doc.text('Asunto:', margin, yPos);
          doc.setFont('helvetica', 'normal');
          const textoAsunto = linea.replace('Asunto:', '').replace(/\t/g, ' ').trim();
          const asuntoLines = doc.splitTextToSize(textoAsunto, maxWidth - 28);
          doc.text(asuntoLines, margin + 28, yPos);
          yPos += asuntoLines.length * 5 + 3;
        } else if (linea.match(/^\d+\.\t/)) {
          // Listas numeradas - alineadas al margen
          doc.setFont('helvetica', 'normal');
          const textoLines = doc.splitTextToSize(linea.replace(/\t/g, '  '), maxWidth);
          doc.text(textoLines, margin, yPos);
          yPos += textoLines.length * 5 + 2;
        } else if (linea.includes('______')) {
          // Línea de firma
          doc.line(margin + 10, yPos, margin + 80, yPos);
          yPos += 5;
        } else if (linea.startsWith('Elaboró:') || linea.startsWith('Revisó:') || linea.startsWith('Aprobó:')) {
          // Elaboró/Revisó/Aprobó - darle formato
          if (yPos > contentEndY - 10) {
            agregarNuevaPagina();
          }
          doc.setFont('helvetica', 'bold');
          const textoLines = doc.splitTextToSize(linea, maxWidth);
          doc.text(textoLines, margin, yPos);
          yPos += textoLines.length * 5;
        } else {
          // Detectar texto en negrita (palabras importantes, títulos)
          const esNegrita = linea.match(/^[A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s]+:/) || // "Objetivo:", "Alcance:"
                          (linea.toUpperCase() === linea && linea.length > 5 && linea.length < 80); // Texto en mayúsculas
          
          if (esNegrita) {
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setFont('helvetica', 'normal');
          }
          
          const textoLines = doc.splitTextToSize(linea, maxWidth);
          if (yPos + (textoLines.length * 5) > contentEndY) {
            agregarNuevaPagina();
          }
          doc.text(textoLines, margin, yPos);
          yPos += textoLines.length * 5;
          doc.setFont('helvetica', 'normal'); // Resetear a normal
        }
      }
      
      // Si terminamos y había una tabla pendiente, dibujarla
      if (enTabla && filasTabla.length > 0) {
        dibujarTablaConPaginacion(filasTabla);
      }
      
    } else {
      // Formato genérico para otros documentos
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      
      // Encabezado con color
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const tituloLines = doc.splitTextToSize(documento.titulo, maxWidth);
      doc.text(tituloLines, pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const fechaGeneracion = documento.generadoEn.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Generado el: ${fechaGeneracion}`, pageWidth / 2, 32, { align: 'center' });

      yPos = 50;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Procesar el contenido línea por línea
      const lineas = documento.contenido.split('\n');
      
      for (let i = 0; i < lineas.length; i++) {
        let linea = lineas[i];
        
        // Limpiar caracteres especiales de formato markdown y tablas
        linea = linea
          .replace(/\*\*/g, '') // Eliminar **
          .replace(/═+/g, '') // Eliminar líneas de tabla
          .replace(/╔|╗|╠|╣|╚|╝|║/g, '') // Eliminar bordes de tabla
          .replace(/^[-*•]\s*/, '') // Eliminar viñetas
          .trim();
        
        // Si la línea está vacía, agregar espacio
        if (linea === '') {
          yPos += 5;
          continue;
        }

        // Detectar títulos (líneas que son cortas y están en mayúsculas o tienen formato especial)
        const esTitulo = (linea.length < 60 && /^[A-ZÁÉÍÓÚÑ0-9]/.test(linea) && !linea.includes(':')) ||
                        /^\d+\.\s+[A-Z]/.test(linea) || // Números seguidos de mayúscula
                        linea === linea.toUpperCase() && linea.length < 80;

        if (esTitulo && linea.length > 0) {
          // Si hay poco espacio, crear nueva página
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
          }
          
          // Formatear título
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          const tituloLines = doc.splitTextToSize(linea, maxWidth);
          doc.text(tituloLines, margin, yPos);
          yPos += tituloLines.length * 7 + 3;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
        } else {
          // Texto normal
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = margin;
          }
          
          // Procesar texto normal, manejando listas
          let textoFinal = linea;
          if (linea.startsWith('□')) {
            textoFinal = '☐ ' + linea.substring(1).trim();
          }
          
          const textoLines = doc.splitTextToSize(textoFinal, maxWidth);
          doc.text(textoLines, margin, yPos);
          yPos += textoLines.length * 5 + 2;
        }
      }
    }

    // Pie de página
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Página ${i} de ${totalPages} - ESAP - Oficina de Control Interno`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Generar nombre del archivo
    const nombreArchivo = `${documento.titulo.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Generar blob y descargar manualmente
    const pdfBlob = doc.output('blob');
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('PDF descargado exitosamente', { 
      id: 'generar-pdf',
      description: nombreArchivo
    });
  } catch (error) {
    console.error('Error al generar PDF:', error);
    toast.error('Error al generar el PDF', {
      id: 'generar-pdf',
      description: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

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
  return `Fecha:\t\t(día – mes – año)
Para:\t\tnombre del jefe de la Oficina de Control Interno
Cargo:            Jefe de la Oficina de Control Interno


Asunto: \tCarta de representación de la auditoría interna basada en riesgos al (se menciona unidad auditable)


Cordial saludo

Mediante la presente carta de representación me permito comunicar que, para el desarrollo de la auditoria interna basada en riesgos al (se menciona unidad auditable), que será adelantada por parte de la Oficina de Control Interno - OCI, declaramos lo siguiente:

1.\tSomos responsables de la oportuna preparación, presentación y consistencia de la información que será entregada en el marco de la auditoría a la OCI para su revisión.

2.\tSe hará entrega oficialmente de toda la información relacionada con la gestión del proceso a evaluar, atendiendo los requerimientos hechos por la Oficina de Control Interno y en los plazos que así sean establecidos.

3.\tLa información a suministrar será válida, integral (suficiente y pertinente) y completa para los propósitos del proceso auditor. 



Cordialmente,



(firma)
______________________________________
(nombre del responsable de la unidad a auditar)
Cargo del responsable de la unidad a auditar

Elaboró:
`;
}

function generarCartaCompromiso(auditoria: AuditoriaProgramada): string {
  return `Fecha:\t\t(día – mes – año)
Para:\t\tNombre del responsable de la unidad auditada
Cargo:

Asunto: \tAnuncio de auditoría interna basada en riesgos (unidad auditable) 

Cordial saludo

De acuerdo con el plan anual de auditorías de evaluación y seguimiento de la Oficina de Control Interno de la vigencia 202X, aprobado por el Comité Institucional de Coordinación de Control Interno, comunicamos el inicio del trabajo de auditoría al (Nombre del proceso, plan, programa, proyecto, área funcional, sistema, unidad de negocio, unidad desconcentrada, o temática).

Objetivo: (Debe surgir como resultado de la revisión preliminar de riesgos.)

Alcance: (Periodo de tiempo que se va a evaluar, lugar de trabajo, proceso, área y criterios).

Equipo auditor: (Se comunica quien es el equipo auditor y el líder de la auditoría).

Metodología: Las técnicas de auditoría que se utilizarán durante la auditoría son: Consulta (Entrevistas, encuestas, y cuestionarios), observación (procesos, y procedimientos), inspección (se estudian documentos y registros).

Cronograma: Las actividades y fechas estimadas para el desarrollo de este trabajo son las siguientes: Tener en cuenta cada uno de los plazos establecidos en el procedimiento EM-PT-002, con el fin de cumplir con la fecha de publicación y envío a la DN.

Actividad\tFecha inicio
Anuncio de auditoría (Entrega carta de representación, carta de compromiso, plantilla de presentación por parte del auditado).\t(día – mes – año)
Socialización aspectos claves por parte del auditado. \t(día – mes – año)
Solicitud información.\t(día – mes – año)
Entrega información por parte del auditado. \t(día – mes – año)
Reunión apertura auditoría ejecución. \t(día – mes – año)
Reunión cierre auditoría.\t(día – mes – año)
Envío informe preliminar al auditado. \t(día – mes – año)
Respuesta por parte del responsable de la unidad auditada sobre el informe preliminar de auditoría. \t(día – mes – año)
Envío al auditado del informe final de auditoría. \t(día – mes – año)
Entrega por parte del responsable de la unidad auditada de la suscripción del plan de mejoramiento. \t(día – mes – año)
Verificación del plan de mejoramiento por parte de la OCI. Tener en cuenta que de acuerdo con procedimiento EM-PT-002 la unidad auditada cuenta con tres días hábiles siguientes para realizar los ajustes al plan si el mismo fue devuelto por el grupo auditor. \t(día – mes – año)
Solicitud publicación informe final de auditoría. \t(día – mes – año)
Envío al director nacional del informe ejecutivo y plan de mejora.\t(día – mes – año)

La socialización debe ser llevada a cabo por el auditado (acorde al cronograma establecido) para dar a conocer los aspectos claves del proceso de la unidad a auditar. Se adjunta a esta carta de compromiso la plantilla en PowerPoint, que debe ser diligenciada, en la cual se indica cada uno de los puntos a desarrollar. Igualmente es el auditado quien programa la reunión de socialización a través de la plataforma TEAMS.

Durante la ejecución de la auditoría y antes de la reunión de cierre, se llevarán a cabo por parte del equipo auditor y de los auditados, mesas de trabajo con el fin de aclarar información de ser necesario.

Es importante que el responsable del proceso a auditar conozca claramente los objetivos de la revisión, el alcance definido, y el cronograma de trabajo, así como el cumplimiento del protocolo de comunicaciones, que aseguren la oportunidad y calidad de los resultados.

La información suministrada por el auditado será tratada de conformidad con el formato "Declaración de independencia y confidencialidad OCI".

Agradecemos comunicar cualquier inquietud con respecto al contenido de este documento.

Cordialmente,



(Firma)
______________________________________
(Nombre del jefe de la Oficina de Control Interno)
Jefe Oficina de Control Interno

Elaboró:
Revisó:
Aprobó:
`;
}

function generarProgramaIndividual(auditoria: AuditoriaProgramada, config: ConfiguracionAuditoria, actividadesPorFase: Record<string, any[]> = {}): string {
  const fechaHoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  
  return `
ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP
OFICINA DE CONTROL INTERNO

PROGRAMA INDIVIDUAL DE AUDITORÍA
${auditoria.codigo}

1. INFORMACIÓN GENERAL

Código: ${auditoria.codigo}
Nombre: ${auditoria.nombre}
Tipo: Auditoría ${auditoria.tipo}
Proceso auditado: ${auditoria.procesoNombre}
Fecha de elaboración: ${fechaHoy}

2. OBJETIVO DE LA AUDITORÍA

${config.objetivo}

3. ALCANCE

${config.alcance}

4. CRITERIOS DE AUDITORÍA

${config.criterios}

5. EQUIPO AUDITOR

Auditor Líder: ${auditoria.auditorLider.nombre}
Email: ${auditoria.auditorLider.email}

Equipo de apoyo:
${auditoria.equipoAuditores.map(a => `- ${a.nombre} (${a.email})`).join('\n')}

6. ÁREA AUDITADA

Responsable: ${auditoria.responsableArea.nombre}
Cargo: ${auditoria.responsableArea.cargo}
Email: ${auditoria.responsableArea.email}

7. CRONOGRAMA

FASE	DURACIÓN	ACTIVIDADES
PLANEACIÓN	${auditoria.duracionDias.planeacion} días	${auditoria.duracionDias.planeacion}
EJECUCIÓN	${auditoria.duracionDias.ejecucion} días	${auditoria.duracionDias.ejecucion}
COMUNICACIÓN	${auditoria.duracionDias.comunicacion} días	${auditoria.duracionDias.comunicacion}

8. ACTIVIDADES POR FASE

${generarActividadesDinamicas('Planeación', auditoria.duracionDias.planeacion, actividadesPorFase)}

${generarActividadesDinamicas('Ejecución', auditoria.duracionDias.ejecucion, actividadesPorFase)}

${generarActividadesDinamicas('Comunicación', auditoria.duracionDias.comunicacion, actividadesPorFase)}

/* ACTIVIDADES HARDCODEADAS ORIGINALES (COMENTADAS - AHORA SE USAN LAS DE BD)
FASE 1: PLANEACIÓN
- Revisión de documentación del proceso
- Análisis de riesgos del área auditada
- Solicitud de información preliminar
- Preparación de listas de chequeo
- Reunión de apertura con el área
- Definición de muestras y pruebas

FASE 2: EJECUCIÓN
- Aplicación de listas de chequeo
- Revisión de documentos y registros
- Entrevistas con personal clave
- Observación directa de procesos
- Pruebas de cumplimiento normativo
- Identificación y documentación de hallazgos
- Recopilación de evidencias
- Reunión de cierre con el área

FASE 3: COMUNICACIÓN
- Elaboración de informe preliminar
- Socialización con el área auditada
- Atención de controversias (si aplica)
- Elaboración de informe final
- Generación de informe ejecutivo
- Formalización de plan de mejoramiento
*/

9. RECURSOS NECESARIOS

- Acceso a sistemas de información del proceso
- Documentación de procesos y procedimientos
- Registros y evidencias del período auditado
- Disponibilidad de personal para entrevistas
- Espacio físico para trabajo del equipo auditor

10. RESULTADOS ESPERADOS

- Informe de auditoría con hallazgos identificados
- Plan de mejoramiento con acciones correctivas
- Recomendaciones para fortalecimiento del proceso
- Evaluación del nivel de riesgo del proceso

11. OBSERVACIONES

${config.observaciones || 'N/A'}


APROBACIONES:

____________________________________
Auditor Líder
${auditoria.auditorLider.nombre}
Fecha: _____________________________

____________________________________
Jefe Oficina de Control Interno
Fecha: _____________________________


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
  const [actividadesPorFase, setActividadesPorFase] = useState<Record<string, any[]>>({});

  // Cargar actividades desde la BD al montar el componente
  useEffect(() => {
    const cargarActividades = async () => {
      try {
        // Cargar tableros Kanban
        const tableros = await tablerosKanbanService.cargarTablerosKanban();
        
        // Buscar el tablero de auditorías
        const tableroAuditorias = tableros.find(t => t.tipo === 'auditorias' && t.activo);
        
        if (!tableroAuditorias || !tableroAuditorias.etapas) {
          console.warn('No se encontró configuración de tablero para auditorías');
          return;
        }
        
        // Mapear las actividades por nombre de etapa
        const actividadesCargadas: Record<string, any[]> = {};
        
        for (const etapa of tableroAuditorias.etapas) {
          // Las actividades están en cada etapa
          // Por ahora, generamos un array vacío ya que las actividades se gestionan de otra manera
          // La estructura real depende de cómo se almacenan en la BD
          actividadesCargadas[etapa.nombre] = [];
        }
        
        setActividadesPorFase(actividadesCargadas);
      } catch (error) {
        console.error('Error al cargar actividades:', error);
      }
    };
    
    cargarActividades();
  }, []); // Solo al montar

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
          contenido: generarProgramaIndividual(auditoria, configuracion, actividadesPorFase),
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
    
    try {
      // Convertir objetivo (string) a array
      const objetivosArray = configuracion.objetivo 
        ? [configuracion.objetivo.trim()].filter(o => o.length > 0)
        : [];

      // Convertir criterios (string) a array - separar por líneas o comas
      const criteriosArray = configuracion.criterios
        ? configuracion.criterios
            .split(/[\n,;]/)
            .map(c => c.trim())
            .filter(c => c.length > 0)
        : [];

      // Preparar datos para actualizar
      const updateData: any = {
        alcance: configuracion.alcance || undefined,
        fechaReunionApertura: configuracion.fechaReunionApertura?.toISOString() || undefined,
        observacionesAdicionales: configuracion.observaciones || undefined,
        objetivos: objetivosArray.length > 0 ? objetivosArray : undefined,
        criterios: criteriosArray.length > 0 ? criteriosArray : undefined,
        estadoKanban: 'Planeación' as const, // Cambiar estado a Planeación
      };

      // Llamar a la API para actualizar la auditoría
      const response = await auditoriasApi.update(auditoria.id, updateData);

      if (response.success) {
        toast.success('🎉 Auditoría iniciada exitosamente');
        toast.info('📧 Configuración guardada en la base de datos');
        toast.info('📁 Expediente digital actualizado');
        setLoading(false);
        onComplete(auditoria.id);
      } else {
        throw new Error(response.error || 'Error al guardar la configuración');
      }
    } catch (error) {
      console.error('Error al iniciar auditoría:', error);
      toast.error('Error al guardar la configuración', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
      setLoading(false);
    }
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
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-50" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
        >
          {/* Header */}
          <div className="p-3 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="flex items-start sm:items-center justify-between gap-2">
              <div className="flex items-start sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
                <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex-shrink-0">
                  <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-xl text-white font-bold truncate">
                    Iniciar Auditoría - {auditoria.codigo}
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100 mt-0.5 sm:mt-1 hidden sm:block">
                    RF004 - Generación automática de documentos oficiales
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-1 sm:gap-2 mt-4 sm:mt-6">
              {[1, 2, 3, 4].map((paso) => (
                <div key={paso} className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 rounded-full transition-all ${
                      paso === pasoActual
                        ? 'bg-white text-blue-600 shadow-lg scale-110'
                        : paso < pasoActual
                        ? 'bg-green-500 text-white'
                        : 'bg-white/20 text-white/60'
                    }`}
                  >
                    {paso < pasoActual ? (
                      <CheckCircle className="w-3 h-3 sm:w-5 sm:h-5" />
                    ) : (
                      <span className="text-xs sm:text-sm font-bold">{paso}</span>
                    )}
                  </div>
                  {paso < 4 && (
                    <div
                      className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 rounded transition-all ${
                        paso < pasoActual ? 'bg-green-500' : 'bg-white/20'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
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
                  onUpdateDocumento={(tipo, contenido) => {
                    setDocumentosGenerados(prev => 
                      prev.map(doc => 
                        doc.tipo === tipo 
                          ? { ...doc, contenido, generadoEn: new Date() }
                          : doc
                      )
                    );
                  }}
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
          <div className="p-3 sm:p-6 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <ButtonSIGL
              variant="secondary"
              icon={<ChevronLeft className="w-4 h-4" />}
              onClick={pasoActual === 1 ? onClose : retrocederPaso}
              className="w-full sm:w-auto"
            >
              {pasoActual === 1 ? 'Cancelar' : 'Anterior'}
            </ButtonSIGL>

            <div className="text-xs sm:text-sm text-gray-600 order-first sm:order-none">
              Paso {pasoActual} de 4
            </div>

            {pasoActual < 4 ? (
              <ButtonSIGL
                variant="primary"
                icon={<ChevronRight className="w-4 h-4" />}
                onClick={avanzarPaso}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? 'Generando...' : 'Siguiente'}
              </ButtonSIGL>
            ) : (
              <ButtonSIGL
                variant="primary"
                icon={<Send className="w-4 h-4" />}
                onClick={confirmarInicio}
                disabled={loading}
                className="w-full sm:w-auto"
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
      className="space-y-4 sm:space-y-6"
    >
      <div>
        <h3 className="text-sm sm:text-lg text-gray-900 mb-2 flex items-center gap-2">
          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
          <span>Auditoría Seleccionada</span>
        </h3>
        <p className="text-xs sm:text-sm text-gray-600">
          Revise la información de la auditoría que está a punto de iniciar formalmente.
        </p>
      </div>

      {/* Banner de auditoría seleccionada */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-3 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-blue-600 font-semibold uppercase tracking-wide">Auditoría a Iniciar</p>
              <h4 className="text-sm sm:text-lg text-gray-900 font-bold truncate">{auditoria.codigo}</h4>
            </div>
          </div>
          <BadgeSIGL 
            variant="info" 
            size="sm" 
            className="flex-shrink-0" 
            icon={<CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'white' }} />}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px' }}
          >
            Seleccionada
          </BadgeSIGL>
        </div>
        <p className="text-xs sm:text-sm text-gray-900 font-medium mb-1">{auditoria.nombre}</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-3">
          <BadgeSIGL 
            variant={auditoria.tipo === 'Sede' ? 'info' : 'success'} 
            size="sm" 
            icon={
              auditoria.tipo === 'Sede' ? (
                <Building2 className="w-3.5 h-3.5" style={{ color: 'white' }} />
              ) : (
                <MapPin className="w-3.5 h-3.5" style={{ color: 'white' }} />
              )
            }
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px' }}
          >
            {auditoria.tipo}
          </BadgeSIGL>
          <span className="text-xs text-gray-600 hidden sm:inline">•</span>
          <span className="text-xs text-gray-600">Inicio: {auditoria.fechaInicio.toLocaleDateString('es-CO')}</span>
        </div>
      </div>

      {/* Detalles organizados en grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Proceso y Área */}
        <CardSIGL className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
            </div>
            <h4 className="text-xs sm:text-sm text-gray-900 font-semibold">Proceso Auditado</h4>
          </div>
          <p className="text-xs sm:text-sm text-gray-900 font-medium mb-2">{auditoria.procesoNombre}</p>
          <div className="space-y-1">
            <p className="text-[10px] sm:text-xs text-gray-600">Responsable del Área:</p>
            <p className="text-xs sm:text-sm text-gray-900">{auditoria.responsableArea.nombre}</p>
            <p className="text-[10px] sm:text-xs text-gray-600">{auditoria.responsableArea.cargo}</p>
            <p className="text-[10px] sm:text-xs text-blue-600 truncate">{auditoria.responsableArea.email}</p>
          </div>
        </CardSIGL>

        {/* Equipo Auditor */}
        <CardSIGL className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
            </div>
            <h4 className="text-xs sm:text-sm text-gray-900 font-semibold">Equipo Auditor</h4>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-[10px] sm:text-xs text-green-700 font-semibold mb-1">Auditor Líder</p>
              <p className="text-xs sm:text-sm text-gray-900 font-medium">{auditoria.auditorLider?.nombre || 'Sin asignar'}</p>
              <p className="text-[10px] sm:text-xs text-gray-600 truncate">{auditoria.auditorLider?.email || 'sin.asignar@esap.edu.co'}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Equipo de Apoyo:</p>
              {auditoria.equipoAuditores.map((auditor) => (
                <p key={auditor.id} className="text-xs sm:text-sm text-gray-900">• {auditor.nombre}</p>
              ))}
            </div>
          </div>
        </CardSIGL>

        {/* Cronograma */}
        <CardSIGL className="p-3 sm:p-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
            </div>
            <h4 className="text-xs sm:text-sm text-gray-900 font-semibold">Cronograma Estimado</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-gray-600">Fecha de Inicio:</span>
              <span className="text-xs sm:text-sm text-gray-900 font-medium">
                {auditoria.fechaInicio.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-[10px] sm:text-xs text-gray-600">Fase Planeación:</span>
                <BadgeSIGL variant="info" size="sm">{auditoria.duracionDias.planeacion} días</BadgeSIGL>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-[10px] sm:text-xs text-gray-600">Fase Ejecución:</span>
                <BadgeSIGL variant="warning" size="sm">{auditoria.duracionDias.ejecucion} días</BadgeSIGL>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-[10px] sm:text-xs text-gray-600">Fase Comunicación:</span>
                <BadgeSIGL variant="success" size="sm">{auditoria.duracionDias.comunicacion} días</BadgeSIGL>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-700 font-medium">Duración Total:</span>
                <span className="text-sm text-gray-900 font-bold">
                  {auditoria.duracionDias.planeacion + auditoria.duracionDias.ejecucion + auditoria.duracionDias.comunicacion} días
                </span>
              </div>
            </div>
          </div>
        </CardSIGL>

        {/* Documentos a Generar */}
        <CardSIGL className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileCheck className="w-4 h-4 text-blue-600" />
            </div>
            <h4 className="text-sm text-gray-900 font-semibold">Documentos a Generar</h4>
          </div>
          <div className="space-y-2">
            {[
              { name: 'Oficio de Anuncio', icon: <FileText className="w-3 h-3" /> },
              { name: 'Carta de Representante', icon: <Users className="w-3 h-3" /> },
              { name: 'Carta de Compromiso', icon: <Shield className="w-3 h-3" /> },
              { name: 'Programa Individual', icon: <FileCheck className="w-3 h-3" /> }
            ].map((doc, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{doc.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3 italic">
            Los documentos se generarán automáticamente en el siguiente paso
          </p>
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
      className="space-y-4 sm:space-y-6"
    >
      <div>
        <h3 className="text-sm sm:text-lg text-gray-900 mb-2 flex items-center gap-2">
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
          <span>Configuración de la Auditoría</span>
        </h3>
        <p className="text-xs sm:text-sm text-gray-600">
          Complete la información que se incluirá en los documentos oficiales.
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm text-gray-700 mb-2">
            Objetivo de la Auditoría <span className="text-red-500">*</span>
          </label>
          <textarea
            value={configuracion.objetivo}
            onChange={(e) => onChange({ ...configuracion, objetivo: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describa el objetivo principal de la auditoría..."
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm text-gray-700 mb-2">
            Alcance <span className="text-red-500">*</span>
          </label>
          <textarea
            value={configuracion.alcance}
            onChange={(e) => onChange({ ...configuracion, alcance: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Defina el alcance temporal y temático de la auditoría..."
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm text-gray-700 mb-2">
            Criterios de Auditoría <span className="text-red-500">*</span>
          </label>
          <textarea
            value={configuracion.criterios}
            onChange={(e) => onChange({ ...configuracion, criterios: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
  onPreview,
  onUpdateDocumento
}: { 
  documentos: DocumentoGenerado[];
  loading: boolean;
  onPreview: (doc: DocumentoGenerado) => void;
  onUpdateDocumento: (tipo: TipoDocumento, contenido: string) => void;
}) {
  const [documentoEditar, setDocumentoEditar] = useState<DocumentoGenerado | null>(null);
  const [documentoCargar, setDocumentoCargar] = useState<TipoDocumento | null>(null);
  
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
    <>
      <motion.div
        key="paso3"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-4 sm:space-y-6"
      >
        <div>
          <h3 className="text-sm sm:text-lg text-gray-900 mb-2 flex items-center gap-2">
            <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
            <span>Documentos Generados</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">
            Los siguientes documentos han sido generados automáticamente. Puede editarlos o cargar versiones personalizadas.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {documentos.map((doc, idx) => (
            <motion.div
              key={doc.tipo}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <CardSIGL hoverable className="p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div 
                    className="p-2 sm:p-3 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: `${doc.color}20` }}
                  >
                    <div style={{ color: doc.color }} className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                      {doc.icono}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm text-gray-900 font-medium mb-1">
                      {doc.titulo}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500 mb-2 sm:mb-3">
                      <span>{doc.size}</span>
                      <span>•</span>
                      <span>{doc.generadoEn.toLocaleTimeString('es-CO')}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
                      {/* Botón Ver - Siempre visible (solo lectura) */}
                      <ButtonSIGL
                        variant="secondary"
                        size="sm"
                        icon={<Eye className="w-3 h-3" />}
                        onClick={() => onPreview(doc)}
                        className="w-full sm:w-auto"
                      >
                        Ver
                      </ButtonSIGL>
                      {/* Botón Editar - Requiere permiso de edición */}
                      {authService.hasPermission(Permissions.CONTROL_INTERNO_AUDITORIA_EDIT) && (
                        <ButtonSIGL
                          variant="secondary"
                          size="sm"
                          icon={<Edit className="w-3 h-3" />}
                          onClick={() => setDocumentoEditar(doc)}
                        >
                          Editar
                        </ButtonSIGL>
                      )}
                      {/* Botón Cargar - Requiere permiso de edición */}
                      {authService.hasPermission(Permissions.CONTROL_INTERNO_AUDITORIA_EDIT) && (
                        <ButtonSIGL
                          variant="secondary"
                          size="sm"
                          icon={<Upload className="w-3 h-3" />}
                          onClick={() => setDocumentoCargar(doc.tipo)}
                        >
                          Cargar
                        </ButtonSIGL>
                      )}
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
                Puede editar cualquier documento o cargar una versión personalizada antes de continuar.
              </p>
            </div>
          </div>
        </CardSIGL>
      </motion.div>

      {/* Modal de edición */}
      {documentoEditar && (
        <ModalEditarDocumento
          documento={documentoEditar}
          onClose={() => setDocumentoEditar(null)}
          onSave={(contenido) => {
            onUpdateDocumento(documentoEditar.tipo, contenido);
            toast.success(`✅ ${documentoEditar.titulo} actualizado`);
            setDocumentoEditar(null);
          }}
        />
      )}

      {/* Modal de carga */}
      {documentoCargar && (
        <ModalCargarDocumento
          tipo={documentoCargar}
          onClose={() => setDocumentoCargar(null)}
          onUpload={(contenido) => {
            onUpdateDocumento(documentoCargar, contenido);
            toast.success(`✅ Archivo cargado y documento actualizado`);
            setDocumentoCargar(null);
          }}
        />
      )}
    </>
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
      className="space-y-4 sm:space-y-6"
    >
      <div>
        <h3 className="text-sm sm:text-lg text-gray-900 mb-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
          <span>Confirmar Inicio de Auditoría</span>
        </h3>
        <p className="text-xs sm:text-sm text-gray-600">
          Revise el resumen antes de confirmar. Esta acción iniciará formalmente la auditoría.
        </p>
      </div>

      <CardSIGL className="p-4 sm:p-6 border-2 border-blue-200 bg-blue-50/30">
        <div className="space-y-3 sm:space-y-4">
          <div>
            <h4 className="text-xs sm:text-sm text-gray-600 mb-2">Auditoría:</h4>
            <p className="text-xs sm:text-sm text-gray-900 font-medium">{auditoria.codigo} - {auditoria.nombre}</p>
          </div>

          <div>
            <h4 className="text-xs sm:text-sm text-gray-600 mb-2">Área Auditada:</h4>
            <p className="text-xs sm:text-sm text-gray-900">{auditoria.procesoNombre}</p>
            <p className="text-xs sm:text-sm text-gray-700">{auditoria.responsableArea.nombre}</p>
          </div>

          <div>
            <h4 className="text-xs sm:text-sm text-gray-600 mb-2">Documentos a enviar:</h4>
            <div className="flex flex-wrap gap-2">
              {documentos.map((doc) => (
                <BadgeSIGL key={doc.tipo} variant="info" size="sm" className="text-[10px] sm:text-xs">
                  {doc.titulo}
                </BadgeSIGL>
              ))}
            </div>
          </div>
        </div>
      </CardSIGL>

      <div className="space-y-2 sm:space-y-3">
        <h4 className="text-xs sm:text-sm text-gray-700 font-medium">Al confirmar se realizarán las siguientes acciones:</h4>
        
        <div className="space-y-2">
          {[
            { icon: <FileCheck className="w-3 h-3 sm:w-4 sm:h-4" />, text: 'Se crearán los 4 documentos oficiales en el expediente digital', color: 'blue' },
            { icon: <Mail className="w-3 h-3 sm:w-4 sm:h-4" />, text: `Se enviará notificación a ${auditoria.responsableArea.email}`, color: 'green' },
            { icon: <Mail className="w-3 h-3 sm:w-4 sm:h-4" />, text: 'Se notificará al equipo auditor del inicio formal', color: 'green' },
            { icon: <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />, text: 'La auditoría pasará a estado "En Planeación"', color: 'purple' },
            { icon: <Shield className="w-3 h-3 sm:w-4 sm:h-4" />, text: 'Se registrará la acción en el log de auditoría (compliance)', color: 'orange' }
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className={`p-1 sm:p-1.5 rounded bg-${item.color}-100 text-${item.color}-600 flex-shrink-0`}>
                {item.icon}
              </div>
              <p className="text-xs sm:text-sm text-gray-700">{item.text}</p>
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
            variant="secondary"
            icon={<Download className="w-4 h-4" />}
            onClick={() => descargarDocumentoPDF(documento)}
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

// ============ MODAL EDITAR DOCUMENTO ============

function ModalEditarDocumento({ 
  documento, 
  onClose,
  onSave
}: { 
  documento: DocumentoGenerado;
  onClose: () => void;
  onSave: (contenido: string) => void;
}) {
  const [contenido, setContenido] = useState(documento.contenido);
  
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
              <p className="text-xs text-gray-600">Editar documento</p>
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
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contenido del documento
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Edite el contenido del documento. Los cambios se guardarán cuando presione "Guardar Cambios".
              </p>
            </div>
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono resize-y min-h-[400px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Edite el contenido del documento..."
            />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>{contenido.length} caracteres</span>
              <span>{contenido.split('\n').length} líneas</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
          <ButtonSIGL
            variant="secondary"
            icon={<Download className="w-4 h-4" />}
            onClick={() => descargarDocumentoPDF({ ...documento, contenido })}
          >
            Descargar PDF
          </ButtonSIGL>
          <ButtonSIGL
            variant="primary"
            onClick={() => onSave(contenido)}
          >
            Guardar Cambios
          </ButtonSIGL>
          <ButtonSIGL
            variant="secondary"
            onClick={onClose}
          >
            Cancelar
          </ButtonSIGL>
        </div>
      </motion.div>
    </div>
  );
}

// ============ MODAL CARGAR DOCUMENTO ============

function ModalCargarDocumento({ 
  tipo, 
  onClose,
  onUpload
}: { 
  tipo: TipoDocumento;
  onClose: () => void;
  onUpload: (contenido: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      // Solo leer archivos de texto
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const contenido = await file.text();
        onUpload(contenido);
      } else {
        // Para otros tipos de archivo, mostrar mensaje y permitir edición
        toast.error('Solo se pueden cargar archivos de texto (.txt). Para otros formatos, use la opción de editar.');
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error al leer el archivo:', error);
      toast.error('Error al leer el archivo. Por favor, intente nuevamente.');
      setLoading(false);
    }
  };
  
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
          style={{ backgroundColor: '#3B82F610' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: '#3B82F620', color: '#3B82F6' }}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-gray-900 font-medium">Cargar Documento</h3>
              <p className="text-xs text-gray-600">Subir archivo personalizado</p>
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
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-gray-100">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 font-medium">Archivo seleccionado:</p>
                <p className="text-sm text-gray-700">
                  {file ? file.name : 'Ningún archivo seleccionado'}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar archivo de texto
              </label>
              <input
                type="file"
                accept=".txt,text/plain"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">
                Solo se aceptan archivos de texto (.txt). El contenido del archivo reemplazará el documento actual.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
          <ButtonSIGL
            variant="primary"
            onClick={handleUpload}
            disabled={!file || loading}
          >
            {loading ? 'Cargando...' : 'Cargar Archivo'}
          </ButtonSIGL>
          <ButtonSIGL
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </ButtonSIGL>
        </div>
      </motion.div>
    </div>
  );
}