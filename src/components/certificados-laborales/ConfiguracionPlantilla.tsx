/**



 * MÓDULO: Configuración de Plantilla DE CERTIFICADOS LABORALES



 * - Gestiona firma del responsable y logo institucional



 * - Carga datos reales desde la base de datos



 * - Upload de imágenes al servidor



 */







import React, { useState, useEffect, useRef } from 'react';



import { motion } from 'motion/react';



import { certificadosService } from '../../services/api/certificados.service';
import { buildServiceAssetUrl } from '../../config/environment';



import {



  FileText,



  Upload,



  Save,



  Eye,



  CheckCircle,



  AlertCircle,



  History,



  User,



  Edit3,



  Type,



  Palette,



  Image as ImageIcon,



  Calendar,



  Clock,



  Shield,



  RefreshCw,



  Download,



  X,



  PenTool,



  Info,



  CheckSquare,



  QrCode,



  Printer



} from 'lucide-react';



import { toast } from 'sonner@2.0.3';



import { Card } from '../ui/card';



import { Button } from '../ui/button';



import { Input } from '../ui/input';



import { Label } from '../ui/label';



import { Badge } from '../ui/badge';



import {



  Select,



  SelectContent,



  SelectItem,



  SelectTrigger,



  SelectValue,



} from '../ui/select';



import {



  Dialog,



  DialogContent,



  DialogDescription,



  DialogHeader,



  DialogTitle,



  DialogFooter,



} from '../ui/dialog';



import {



  Tabs,



  TabsContent,



  TabsList,



  TabsTrigger,



} from '../ui/tabs';







// Tipos



interface PlantillaConfig {



  id: string;



  version: string;



  estado: 'borrador' | 'en_revision' | 'publicada' | 'archivada';



  firmante: {



    nombre: string;



    documento: string;



    cargo: string;



  };




  grafoFirma: {



    url: string;



    nombre: string;



    tamaño: string;



  } | null;



  logoEntidad: {



    url: string;



    nombre: string;



    tamaño: string;



  } | null;



  tipografia: {



    fuente: string;



    tamaño: number;



    color: string;



  };



  tituloCargo: {



    texto: string; // Ej: "LA DIRECTORA TÉCNICA DE TALENTO HUMANO DE LA\nESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA – ESAP"



  };



  contenidoCertificado: {



    texto: string; // HTML string con formato enriquecido



    estilosPersonalizados: {



      palabrasClave: { texto: string; estilo: { bold?: boolean; italic?: boolean; color?: string } }[];



    };



  };



  fechaCreacion: string;



  fechaModificaciónn: string;



  creadoPor: string;



  modificadoPor: string;



}







interface LogCambio {



  id: string;



  fecha: string;



  usuario: string;



  accion: string;



  cambios: string[];



  versionAnterior: string;



  versionNueva: string;



  plantillaSnapshot?: PlantillaConfig; // Snapshot completo de la plantilla en ese momento



  // Campos adicionales para Visualizaciónn mejorada



  changeType?: string;



  oldValue?: string;



  newValue?: string;



  fieldName?: string;



}







const fuentesDisponibles = [



  { value: 'Arial', label: 'Arial' },



  { value: 'Times New Roman', label: 'Times New Roman' },



  { value: 'Georgia', label: 'Georgia' },



  { value: 'Helvetica', label: 'Helvetica' },



  { value: 'Calibri', label: 'Calibri' },



  { value: 'Roboto', label: 'Roboto' },



  { value: 'Montserrat', label: 'Montserrat' },



  { value: 'Open Sans', label: 'Open Sans' },



  { value: 'Lato', label: 'Lato' },



  { value: 'Poppins', label: 'Poppins' },



];







const coloresDisponibles = [



  { value: '#000000', label: 'Negro' },



  { value: '#FF0000', label: 'Rojo' },



  { value: '#0000FF', label: 'Azul' },



  { value: '#008000', label: 'Verde' },



  { value: '#800080', label: 'Morado' },



  { value: '#FFA500', label: 'Naranja' },



  { value: '#A52A2A', label: 'Café' },



];







// Variables disponibles para insertar en los certificados



const variablesDisponibles = [



  { codigo: '[NOMBRE_EMPLEADO]', descripcion: 'Nombre completo del empleado' },



  { codigo: '[DOCUMENTO]', descripcion: 'Número de documento' },



  { codigo: '[CARGO]', descripcion: 'Cargo del empleado' },



  { codigo: '[DEPENDENCIA]', descripcion: 'Dependencia donde trabaja' },



  { codigo: '[DATO6]', descripcion: 'Ubicación o dato adicional' },



  { codigo: '[FECHA_INICIO]', descripcion: 'Fecha de inicio del contrato' },



  { codigo: '[FECHA_FIN]', descripcion: 'Fecha de finalización' },



  { codigo: '[SALARIO]', descripcion: 'Salario mensual (número)' },



  { codigo: '[SALARIO_LETRAS]', descripcion: 'Salario en letras' },



  { codigo: '[FECHA_EXPEDICION_COMPLETA]', descripcion: 'Fecha completa de expedición (ej: 11 de diciembre de 2025)' },



];







const defaultContenidoCertificado = '<p>Que <b>Ana Marelys López Rodríguez</b> identificado(a) con cédula de ciudadanía No. <b>557554210</b>, se desempeña como <b>Técnica</b> en <b>Vicedirección de Capacitación y Formación - Grupo de Posgrados</b> de la Escuela Superior de Administración Pública – ESAP, mediante contrato de prestación de servicios, desde el <b>02 de enero de 2023</b> hasta la actualidad.</p><p>Que <b>Ana Marelys López Rodríguez</b> percibe mensualmente la suma de <b>$5.000.000</b> (Cinco millones de pesos).</p><p>Se expide en la ciudad de <b>Bogotá D.C.</b>, a los <b>[FECHA_EXPEDICION]</b> días del mes de <b>[MES_EXPEDICION]</b> de <b>[AÑO_EXPEDICION]</b>.</p>';







interface ConfiguracionPlantillaProps {



  canEdit?: boolean;



  currentUserEmail?: string;



}







export function ConfiguracionPlantilla({ canEdit = true, currentUserEmail }: ConfiguracionPlantillaProps) {



  // Estados de carga y datos



  const [isLoading, setIsLoading] = useState(true);



  const [plantilla, setPlantilla] = useState<PlantillaConfig | null>(null);



  const [borrador, setBorrador] = useState<PlantillaConfig | null>(null);



  const [templateType, setTemplateType] = useState<'docente' | 'administrador'>('docente');



  const [hasChanges, setHasChanges] = useState(false);



  const [isSaving, setIsSaving] = useState(false);



  const [isPublishing, setIsPublishing] = useState(false);



  const [isResettingLogo, setIsResettingLogo] = useState(false);



  const [isResettingFirma, setIsResettingFirma] = useState(false);



  const [logCambios, setLogCambios] = useState<LogCambio[]>([]);

  const [activeTab, setActiveTab] = useState<string>(canEdit ? 'Modificaciónn' : 'historial');

  const [editorContent, setEditorContent] = useState<string>('');



  const editorRef = useRef<HTMLDivElement | null>(null);



  const publishingActor = currentUserEmail || 'cerlaboral@esap.edu.co';



  const ensureEditable = () => {



    if (!canEdit) {



      toast.error('No tienes permiso para modificar la plantilla');



      return false;



    }



    return true;



  };

  // Sincronizar el contenido del editor con el borrador cuando carga por primera vez
  useEffect(() => {
    if (borrador?.contenidoCertificado.texto) {
      // Normalizar las variables para que todas tengan el formato compacto
      const contenidoNormalizado = normalizarVariables(borrador.contenidoCertificado.texto);
      setEditorContent(contenidoNormalizado);
    }
  }, [borrador?.contenidoCertificado.texto]);

  // Actualizar el editor cuando cambia el activeTab o editorContent
  useEffect(() => {
    // Solo proceder si estamos en la pestaña de Modificación
    if (activeTab !== 'Modificaciónn') return;

    // Usar un pequeño delay para asegurar que el DOM esté listo después del cambio de tab
    const timer = setTimeout(() => {
      if (!editorRef.current) {
        console.log('Editor ref no disponible');
        return;
      }
      const editor = editorRef.current;

      // No sobrescribir si el usuario está editando activamente
      if (document.activeElement === editor) return;

      // Actualizar el contenido del editor, normalizando las variables
      let currentContent = editorContent || borrador?.contenidoCertificado.texto || '';
      currentContent = normalizarVariables(currentContent);
      console.log('Restaurando contenido del editor:', currentContent.substring(0, 50) + '...');

      if (editor.innerHTML !== currentContent && currentContent) {
        editor.innerHTML = currentContent;
        console.log('Contenido restaurado exitosamente');
      }
    }, 50); // Aumentar el delay a 50ms para dar tiempo al DOM

    return () => clearTimeout(timer);
  }, [activeTab, editorContent, borrador?.contenidoCertificado.texto]);







  /**



   * Función helper para resaltar variables en el texto



   * Convierte [VARIABLE] en <span class="variable-highlight">[VARIABLE]</span>



   */



  const resaltarVariables = (html: string): string => {



    // Patrón para encontrar variables como [NOMBRE_EMPLEADO], [DOCUMENTO], [DATO6], etc.



    const patron = /\[([A-Z0-9_ÁÉÍÓÚÑ]+)\]/g;



    return html.replace(



      patron,



      '<span class="variable-token bg-yellow-200 text-black" style="font-weight: inherit; display: inline; padding: 0px 2px; font-size: inherit; line-height: inherit; border-radius: 2px; margin: 0;" contenteditable="false">[$1]</span>'



    );



  };

  /**
   * Normaliza las variables eliminando TODOS los spans anidados
   */
  const normalizarVariables = (html: string): string => {
    if (!html) return html;

    let resultado = html;

    // Paso 1: Colapsar todos los spans anidados repetidamente (15 veces para asegurar)
    for (let i = 0; i < 15; i++) {
      // Eliminar spans que solo contienen otro span
      resultado = resultado.replace(
        /<span[^>]*>\s*(<span[^>]*>[\s\S]*?<\/span>)\s*<\/span>/g,
        '$1'
      );
    }

    // Paso 2: Normalizar todos los spans con clase variable-token
    resultado = resultado.replace(
      /<span[^>]*class="[^"]*variable-token[^"]*"[^>]*>([^<]*\[([A-Z_]+)\][^<]*)<\/span>/g,
      '<span class="variable-token bg-yellow-200 text-black" style="font-weight: inherit; display: inline; padding: 0px 2px; font-size: inherit; line-height: inherit; border-radius: 2px; margin: 0;" contenteditable="false">[$2]</span>'
    );

    // Paso 3: Envolver variables sueltas que no tienen span
    resultado = resultado.replace(
      /(?<!<span[^>]*>)\[([A-Z_]+)\](?![^<]*<\/span>)/g,
      '<span class="variable-token bg-yellow-200 text-black" style="font-weight: inherit; display: inline; padding: 0px 2px; font-size: inherit; line-height: inherit; border-radius: 2px; margin: 0;" contenteditable="false">[$1]</span>'
    );

    // Paso 4: Limpiar spans vacíos
    resultado = resultado.replace(/<span[^>]*>\s*<\/span>/g, '');

    return resultado;
  };







  /**



   * Calcula diferencias token a token (palabras + espacios/puntuación) usando LCS y resalta solo los modificados.



   * Ignora spans previos de resaltado y no pinta tokens que sean solo espacio.



   */



  const generarDiffResaltado = (oldHtml?: string, newHtml?: string) => {



    const clean = (v?: string) => (v || '').replace(/<\/?span[^>]*>/g, '');



    const tokenize = (text: string) => text.match(/\s+|[^\s]+/g) || [];



    const oldTokens = tokenize(clean(oldHtml || ''));



    const newTokens = tokenize(clean(newHtml || ''));







    // LCS para marcar tokens iguales



    const lcs = () => {



      const m = oldTokens.length;



      const n = newTokens.length;



      const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));



      for (let i = m - 1; i >= 0; i--) {



        for (let j = n - 1; j >= 0; j--) {



          if (oldTokens[i] === newTokens[j]) dp[i][j] = 1 + dp[i + 1][j + 1];



          else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);



        }



      }



      const keepOld = new Set<number>();



      const keepNew = new Set<number>();



      let i = 0, j = 0;



      while (i < m && j < n) {



        if (oldTokens[i] === newTokens[j]) {



          keepOld.add(i);



          keepNew.add(j);



          i++; j++;



        } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;



        else j++;



      }



      return { keepOld, keepNew };



    };







    const { keepOld, keepNew } = lcs();



    const wrap = (tokens: string[], keep: Set<number>) =>



      tokens



        .map((t, idx) => {



          const isSpace = /^\s+$/.test(t);



          if (keep.has(idx) || isSpace) return t;



          return `<span class="variable-token bg-yellow-200 text-black" style="font-weight: inherit; display: inline; padding: 0px 2px; font-size: inherit; line-height: inherit; border-radius: 2px; margin: 0;">${t}</span>`;



        })



        .join('');







    return {



      oldHighlighted: wrap(oldTokens, keepOld),



      newHighlighted: wrap(newTokens, keepNew),



    };



  };







  const limpiarResaltado = (html?: string) => (html || '').replace(/<\/?span[^>]*>/g, '');







  const mapConfigToPlantilla = (config: any, resaltar = false): PlantillaConfig => {



    const contenidoHtml = config.certificateContentHtml || defaultContenidoCertificado;



    const firmaUrl = config.firmante?.firmaUrl || config.firmante?.firmaDigitalUrl;



    const logoConfig = config.logo;







    return {



      id: config.id?.toString() || 'CONFIG-1',



      version: config.version || '1.0.0',



      estado: config.status === 'published' ? 'publicada' : 'borrador',



      firmante: {



        nombre: config.firmante?.nombre || config.firmante?.nombreCompleto || '',



        documento: '',



        cargo: config.firmante?.cargo || ''



      },



      grafoFirma: firmaUrl ? {



        url: buildServiceAssetUrl('certificados', firmaUrl),



        nombre: 'firma.png',



        tamaÇño: ''



      } : null,



      logoEntidad: logoConfig ? {



        url: buildServiceAssetUrl('certificados', logoConfig.url),



        nombre: logoConfig.filename || 'logo.png',



        tamaÇño: logoConfig.size || ''



      } : null,



      tipografia: {



        fuente: 'Arial Narrow, Arial, sans-serif', // Misma fuente que los PDFs generados



        tamaÇño: 12,



        color: '#000000'



      },



      tituloCargo: {



        texto: config.cargoTitle || 'LA DIRECTORA TÉCNICA DE TALENTO HUMANO DE LA ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA – ESAP'



      },



      contenidoCertificado: {



        texto: resaltar ? normalizarVariables(resaltarVariables(contenidoHtml)) : normalizarVariables(contenidoHtml),



        estilosPersonalizados: {



          palabrasClave: []



        }



      },



      fechaCreacion: config.createdAt || new Date().toISOString(),



      fechaModificaciónn: config.updatedAt || new Date().toISOString(),



      creadoPor: 'Sistema',



      modificadoPor: config.updatedBy || 'Sistema'



    };



  };







  /**



   * Función para insertar una variable en la posición del cursor



   */



  const insertarVariable = (codigoVariable: string) => {



    if (!editorRef.current) return;







    const selection = window.getSelection();



    if (!selection || !selection.rangeCount) return;







    const range = selection.getRangeAt(0);



    range.deleteContents();







    // Crear el elemento de variable con estilo



    const span = document.createElement('span');



    span.className = 'variable-token bg-yellow-200 text-black';



    span.style.fontWeight = 'inherit';

    span.style.display = 'inline';

    span.style.padding = '0px 2px';

    span.style.fontSize = 'inherit';

    span.style.lineHeight = 'inherit';

    span.style.borderRadius = '2px';

    span.style.margin = '0';



    span.contentEditable = 'false';



    span.textContent = codigoVariable;







    // Insertar el span y un espacio después



    range.insertNode(span);



    range.collapse(false);







    // Agregar un espacio después de la variable



    const space = document.createTextNode(' ');



    range.insertNode(space);



    range.setStartAfter(space);



    range.collapse(true);







    selection.removeAllRanges();



    selection.addRange(range);







    // Actualizar el contenido del borrador



    if (borrador) {



      setBorrador({



        ...borrador,



        contenidoCertificado: {



          ...borrador.contenidoCertificado,



          texto: editorRef.current.innerHTML



        }



      });



      setHasChanges(true);



    }



  };







  /**



   * Aplica/quita negrita y la refleja en variables dentro de la selección



   */



  const toggleBold = () => {



    const sel = window.getSelection();



    if (!sel || !sel.rangeCount || !editorRef.current || !editorRef.current.contains(sel.anchorNode)) {



      document.execCommand('bold', false, '');



      return;



    }



    const range = sel.getRangeAt(0);



    const tokens = Array.from(editorRef.current.querySelectorAll<HTMLElement>('.variable-token'));



    const intersecting = tokens.filter(token => {



      try {



        return range.intersectsNode(token);



      } catch {



        return false;



      }



    });



    const hasBold = intersecting.some(t => (t.style.fontWeight || '').toLowerCase() === 'bold' || t.classList.contains('font-bold'));



    const nextWeight = hasBold ? 'inherit' : 'bold';



    intersecting.forEach(t => {



      t.style.fontWeight = nextWeight;



      t.classList.toggle('font-bold', nextWeight === 'bold');



    });



    document.execCommand('bold', false, '');



  };







  // Cargar configuración real desde el backend al montar el componente



  useEffect(() => {



    const cargarConfiguracion = async () => {



      try {



        setIsLoading(true);



        const config = await certificadosService.plantilla.obtenerConfiguracion(templateType);







        // Transformar los datos del backend al formato del componente



        const plantillaData = mapConfigToPlantilla(config, true);







        setPlantilla(plantillaData);



        setBorrador(plantillaData);



      } catch (error) {



        console.error('Error al cargar configuración:', error);



        toast.error('Error al cargar configuración', {



          description: 'No se pudo cargar la configuración de la plantilla'



        });



      } finally {



        setIsLoading(false);



      }



    };







    cargarConfiguracion();



  }, [templateType]);







  // Cargar historial de cambios



  useEffect(() => {



    const cargarHistorial = async () => {



      try {



        const historial = await certificadosService.plantilla.obtenerHistorialCambios(templateType);







        // Transformar los datos del backend al formato del componente



        const cambios: LogCambio[] = historial.map((cambio: any) => ({



          id: cambio.id.toString(),



          fecha: cambio.changedAt,



          usuario: cambio.changedBy || 'Usuario',



          accion: getAccionTexto(cambio.changeType),



          cambios: [formatearCambio(cambio)],



          versionAnterior: '1.0.0',



          versionNueva: '1.0.0',



          // Agregar datos raw para Visualizaciónn



          changeType: cambio.changeType,



          oldValue: cambio.oldValue,



          newValue: cambio.newValue,



          fieldName: cambio.fieldName,



        }));







        setLogCambios(cambios);



      } catch (error) {



        console.error('Error al cargar historial:', error);



      }



    };







    cargarHistorial();



  }, [templateType]);







  // Función helper para obtener texto de acción



  const getAccionTexto = (changeType: string): string => {



    const acciones: Record<string, string> = {



      'logo': 'Actualización de Logo Institucional',



      'firma': 'Actualización de Firma Digital',



      'nombre': 'Cambio de Nombre del Firmante',



      'tipografia': 'Cambio de Tipografía',



      'titulo_cargo': 'Actualización del Título del Cargo',



      'contenido': 'Modificaciónn del Contenido del Certificado',



      'multiple': 'Actualización Múltiple',



    };



    return acciones[changeType] || 'Modificaciónn de Plantilla';



  };







  // Función helper para formatear cambio



  const formatearCambio = (cambio: any): string => {



    // Traducir nombres de campos técnicos al español



    const traduccionCampos: Record<string, string> = {



      'entity_logo_url': 'Logo institucional',



      'firma_digital_url': 'Firma digital',



      'nombre_completo': 'Nombre del firmante',



      'typography_font': 'Fuente tipográfica',



      'cargo_title': 'Título del cargo',



      'certificate_content_html': 'Contenido del certificado',



      'typographyFont': 'Fuente tipográfica',



      'cargoTitle': 'Título del cargo',



      'certificateContentHtml': 'Contenido del certificado',



    };







    const nombreCampo = traduccionCampos[cambio.fieldName] || cambio.fieldName.replace(/_/g, ' ');







    // Formatear valores para mejor legibilidad



    const valorAnterior = cambio.oldValue === 'Sin logo' ? 'Sin logo' :



                         cambio.oldValue === 'Sin firma' ? 'Sin firma' :



                         cambio.oldValue?.includes('/uploads/') ? 'Imagen anterior' :



                         cambio.oldValue;







    const valorNuevo = cambio.newValue?.includes('/uploads/') ? 'Nueva imagen cargada' : cambio.newValue;







    return `${nombreCampo}: "${valorAnterior}" ? "${valorNuevo}"`;



  };







  // Evitar errores si plantilla aún no está cargada



  if (isLoading || !plantilla || !borrador) {



    return (



      <div className="flex items-center justify-center min-h-screen">



        <div className="text-center">



          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003DA5] mx-auto mb-4"></div>



          <p className="text-gray-600">Cargando configuración...</p>



        </div>



      </div>



    );



  }







  // Handlers



  const handleFirmanteChange = (field: string, value: string) => {



    setBorrador({



      ...borrador,



      firmante: {



        ...borrador.firmante,



        [field]: value



      }



    });



    setHasChanges(true);



  };







  const handleTipografiaChange = (field: string, value: string | number) => {



    setBorrador({



      ...borrador,



      tipografia: {



        ...borrador.tipografia,



        [field]: value



      }



    });



    setHasChanges(true);



  };







  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {



    const file = event.target.files?.[0];



    if (!file) return;







    // Validar tipo de archivo



    if (!file.type.startsWith('image/')) {



      toast.error('Archivo inválido', {



        description: 'Por favor selecciona una imagen válida (PNG, JPG, etc.)'



      });



      return;



    }







    // Validar tamaño (máximo 2MB)



    if (file.size > 2 * 1024 * 1024) {



      toast.error('Archivo muy grande', {



        description: 'La imagen no debe superar los 2MB'



      });



      return;



    }







    try {



      toast.loading('Subiendo firma...', { id: 'upload-signature' });







      // Subir archivo al servidor



      await certificadosService.plantilla.subirFirma(file, 'Admin', templateType);







      // Recargar TODA la configuración desde el servidor para obtener datos frescos



      const config = await certificadosService.plantilla.obtenerConfiguracion(templateType);







      const plantillaActualizada = mapConfigToPlantilla(config, true);







      setBorrador(plantillaActualizada);



      setPlantilla(plantillaActualizada);



      setHasChanges(false);







      // Recargar historial después de subir firma



      await recargarHistorial();







      toast.success('Firma actualizada', {



        id: 'upload-signature',



        description: 'La imagen de la firma se subió correctamente'



      });



    } catch (error) {



      console.error('Error al subir firma:', error);



      toast.error('Error al subir firma', {



        id: 'upload-signature',



        description: error instanceof Error ? error.message : 'No se pudo subir la imagen'



      });



    }



  };







  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {



    const file = event.target.files?.[0];



    if (!file) return;







    // Validar tipo de archivo



    if (!file.type.startsWith('image/')) {



      toast.error('Archivo inválido', {



        description: 'Por favor selecciona una imagen válida (PNG, JPG, etc.)'



      });



      return;



    }







    // Validar tamaño (máximo 2MB)



    if (file.size > 2 * 1024 * 1024) {



      toast.error('Archivo muy grande', {



        description: 'La imagen no debe superar los 2MB'



      });



      return;



    }







    try {



      toast.loading('Subiendo logo...', { id: 'upload-logo' });







      // Subir archivo al servidor



      await certificadosService.plantilla.subirLogo(file, 'Admin', templateType);







      // Recargar TODA la configuración desde el servidor para obtener datos frescos



      const config = await certificadosService.plantilla.obtenerConfiguracion(templateType);







      const plantillaActualizada = mapConfigToPlantilla(config, true);







      setBorrador(plantillaActualizada);



      setPlantilla(plantillaActualizada);



      setHasChanges(false);







      // Recargar historial después de subir logo



      await recargarHistorial();







      toast.success('Logo actualizado', {



        id: 'upload-logo',



        description: 'El logo de la entidad se subió correctamente'



      });



    } catch (error) {



      console.error('Error al subir logo:', error);



      toast.error('Error al subir logo', {



        id: 'upload-logo',



        description: error instanceof Error ? error.message : 'No se pudo subir la imagen'



      });



    }



  };







  const handleResetLogo = async () => {



    if (!ensureEditable()) return;



    try {



      setIsResettingLogo(true);



      toast.loading('Restableciendo logo...', { id: 'reset-logo' });



      const config = await certificadosService.plantilla.resetLogo(publishingActor, templateType);



      const plantillaActualizada = mapConfigToPlantilla(config, true);



      setBorrador(plantillaActualizada);



      setPlantilla(plantillaActualizada);



      setHasChanges(false);



      await recargarHistorial();



      toast.success('Logo restablecido', {



        id: 'reset-logo',



        description: 'Se volvió al logo oficial de la ESAP'



      });



    } catch (error) {



      console.error('Error al restablecer logo:', error);



      toast.error('Error al restablecer logo', {



        id: 'reset-logo',



        description: error instanceof Error ? error.message : 'Intenta nuevamente'



      });



    } finally {



      setIsResettingLogo(false);



    }



  };







  const handleResetFirma = async () => {



    if (!ensureEditable()) return;



    try {



      setIsResettingFirma(true);



      toast.loading('Quitando firma...', { id: 'reset-firma' });



      const config = await certificadosService.plantilla.resetFirma(publishingActor, templateType);



      const plantillaActualizada = mapConfigToPlantilla(config, true);



      setBorrador(plantillaActualizada);



      setPlantilla(plantillaActualizada);



      setHasChanges(false);



      await recargarHistorial();



      toast.success('Firma eliminada', {



        id: 'reset-firma',



        description: 'La plantilla quedó sin firma cargada'



      });



    } catch (error) {



      console.error('Error al quitar firma:', error);



      toast.error('No se pudo quitar la firma', {



        id: 'reset-firma',



        description: error instanceof Error ? error.message : 'Intenta nuevamente'



      });



    } finally {



      setIsResettingFirma(false);



    }



  };







  // Función helper para recargar historial



  const recargarHistorial = async () => {



    try {



      const historial = await certificadosService.plantilla.obtenerHistorialCambios(templateType);



      const cambios: LogCambio[] = historial.map((cambio: any) => ({



        id: cambio.id.toString(),



        fecha: cambio.changedAt,



        usuario: cambio.changedBy || 'Usuario',



        accion: getAccionTexto(cambio.changeType),



        cambios: [formatearCambio(cambio)],



        versionAnterior: '1.0.0',



        versionNueva: '1.0.0',



        // Agregar datos raw para Visualizaciónn mejorada



        changeType: cambio.changeType,



        oldValue: cambio.oldValue,



        newValue: cambio.newValue,



        fieldName: cambio.fieldName,



      }));



      setLogCambios(cambios);



    } catch (error) {



      console.error('Error al recargar historial:', error);



    }



  };







  const handleGuardarBorrador = async () => {



    if (!ensureEditable()) return;



    if (!borrador || !plantilla) return;



    if (!hasChanges) {



      toast.info('Sin cambios', {



        description: 'No hay cambios pendientes para guardar'



      });



      return;



    }







    try {



      setIsSaving(true);



      toast.loading('Guardando cambios...', { id: 'save-draft' });







      let cambiosGuardados = [];







      // Guardar el nombre del firmante si cambió



      if (borrador.firmante.nombre !== plantilla.firmante.nombre) {



        await certificadosService.plantilla.actualizarNombreFirmante(
          borrador.firmante.nombre,
          publishingActor,
          templateType
        );



        cambiosGuardados.push('nombre del firmante');



      }







      // Guardar tipografía, título del cargo y contenido HTML si cambiaron



      const contentChanges: any = {};



      let hasContentChanges = false;







      if (borrador.tipografia.fuente !== plantilla.tipografia.fuente) {



        contentChanges.typographyFont = borrador.tipografia.fuente;



        cambiosGuardados.push('tipografía');



        hasContentChanges = true;



      }







      if (borrador.tituloCargo.texto !== plantilla.tituloCargo.texto) {



        contentChanges.cargoTitle = borrador.tituloCargo.texto;



        cambiosGuardados.push('título del cargo');



        hasContentChanges = true;



      }







      if (borrador.contenidoCertificado.texto !== plantilla.contenidoCertificado.texto) {

        // Normalizar el contenido antes de guardar para limpiar spans anidados
        const contenidoNormalizado = normalizarVariables(borrador.contenidoCertificado.texto);



        contentChanges.certificateContentHtml = contenidoNormalizado;



        cambiosGuardados.push('contenido del certificado');



        hasContentChanges = true;



      }







      if (hasContentChanges) {



        contentChanges.updatedBy = publishingActor;



        await certificadosService.plantilla.actualizarContenidoPlantilla(contentChanges, templateType);



      }







      setPlantilla(borrador);



      setHasChanges(false);







      // Recargar historial después de guardar



      await recargarHistorial();







      toast.success('Cambios guardados', {



        id: 'save-draft',



        description: `Se guardaron los cambios: ${cambiosGuardados.join(', ')}`,



        duration: 5000



      });



    } catch (error) {



      console.error('Error al guardar:', error);



      toast.error('Error al guardar', {



        id: 'save-draft',



        description: error instanceof Error ? error.message : 'No se pudo guardar los cambios'



      });



    } finally {



      setIsSaving(false);



    }



  };







  const handleVistaPrevia = () => {



    if (hasChanges) {



      toast.info('Vista previa', {



        description: 'Mostrando cómo se verá el certificado con los cambios'



      });



    }



    setIsPreviewOpen(true);



  };







  const handleGuardarYVerPlantilla = async () => {
    if (!ensureEditable()) return;

    if (!borrador || !plantilla) return;

    // Guardar el contenido actual del editor antes de navegar
    if (editorRef.current) {
      const currentContent = editorRef.current.innerHTML;
      setEditorContent(currentContent);
    }

    // Si hay cambios, guardar primero
    if (hasChanges) {
      await handleGuardarBorrador();
    }

    // Navegar a la pestaña de Visualización usando el estado
    setActiveTab('Visualizaciónn');
  };

  const handleAutorizarPlantilla = async () => {



    if (!ensureEditable()) return;



    if (!borrador || !plantilla) return;







    try {



      setIsPublishing(true);



      toast.loading('Autorizando plantilla...', { id: 'publish-template' });







      if (borrador.firmante.nombre !== plantilla.firmante.nombre) {



        await certificadosService.plantilla.actualizarNombreFirmante(



          borrador.firmante.nombre,



          publishingActor,



          templateType



        );



      }







      const contentChanges: any = {



        typographyFont: borrador.tipografia.fuente,



        cargoTitle: borrador.tituloCargo.texto,



        certificateContentHtml: borrador.contenidoCertificado.texto,



        updatedBy: publishingActor,



        status: 'published'



      };







      await certificadosService.plantilla.actualizarContenidoPlantilla(contentChanges, templateType);







      const nuevaVersion = incrementVersion(borrador.version);



      const publishedAt = new Date().toISOString();



      setPlantilla({



        ...borrador,



        version: nuevaVersion,



        estado: 'publicada',



        fechaModificaciónn: publishedAt,



        modificadoPor: publishingActor



      });



      setHasChanges(false);







      localStorage.setItem('cert-template-last-published', publishedAt);







      await recargarHistorial();







      toast.success('Plantilla autorizada', {



        id: 'publish-template',



        description: 'La plantilla se activó para todos los certificados.'



      });



    } catch (error) {



      console.error('Error al autorizar plantilla:', error);



      toast.error('No se pudo autorizar la plantilla', {



        id: 'publish-template',



        description: error instanceof Error ? error.message : 'Intenta nuevamente'



      });



    } finally {



      setIsPublishing(false);



    }



  };







  const handleDescartarCambios = () => {



    if (!ensureEditable()) return;



    setBorrador({...plantilla});



    setHasChanges(false);



    setSelectedFile(null);



    toast.info('Cambios descartados', {



      description: 'Se restauró la plantilla publicada'



    });



  };







  const handleAbrirRestaurar = (log: LogCambio) => {



    if (!log.plantillaSnapshot) {



      toast.error('Error', {



        description: 'Esta versión no tiene datos disponibles para restaurar'



      });



      return;



    }



    setVersionARestaurar(log);



    setIsRestaurarOpen(true);



  };







  const handleRestaurarVersion = () => {



    if (!versionARestaurar?.plantillaSnapshot) return;







    toast.loading('Restaurando versión...', { id: 'restaurar' });



    



    setTimeout(() => {



      // Crear un nuevo log de cambio para registrar la restauración



      const nuevoLog: LogCambio = {



        id: `LOG-${Date.now()}`,



        fecha: new Date().toISOString(),



        usuario: 'Admin Sistema',



        accion: `Restauración a versión ${versionARestaurar.versionNueva}`,



        cambios: [



          `Versión restaurada: ${versionARestaurar.versionNueva}`,



          `Fecha de la versión: ${new Date(versionARestaurar.fecha).toLocaleDateString('es-CO')}`,



          `Firmante restaurado: ${versionARestaurar.plantillaSnapshot.firmante.nombre}`,



          `Tipografía: ${versionARestaurar.plantillaSnapshot.tipografia.fuente} ${versionARestaurar.plantillaSnapshot.tipografia.tamaño}pt`



        ],



        versionAnterior: plantilla.version,



        versionNueva: incrementVersion(plantilla.version),



        plantillaSnapshot: {



          ...versionARestaurar.plantillaSnapshot,



          version: incrementVersion(plantilla.version),



          fechaModificaciónn: new Date().toISOString(),



          modificadoPor: 'Admin Sistema'



        }



      };







      // Actualizar log de cambios (mantener solo últimas 5)



      setLogCambios([nuevoLog, ...logCambios.slice(0, 4)]);







      // Actualizar plantilla y borrador



      const plantillaRestaurada = {



        ...versionARestaurar.plantillaSnapshot,



        version: incrementVersion(plantilla.version),



        fechaModificaciónn: new Date().toISOString(),



        modificadoPor: 'Admin Sistema'



      };







      setPlantilla(plantillaRestaurada);



      setBorrador(plantillaRestaurada);



      setHasChanges(false);



      setIsRestaurarOpen(false);



      setVersionARestaurar(null);



      



      toast.success('¡Versión restaurada!', {



        id: 'restaurar',



        description: `La plantilla ahora usa la configuración de la versión ${versionARestaurar.versionNueva}`



      });



    }, 2000);



  };







  const incrementVersion = (version: string): string => {



    const parts = version.split('.');



    parts[2] = String(Number(parts[2]) + 1);



    return parts.join('.');



  };







  const getEstadoBadge = (estado: string) => {



    const estilos = {



      borrador: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Edit3, label: 'Borrador' },



      en_revision: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'En Revisión' },



      publicada: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Publicada' },



      archivada: { bg: 'bg-red-100', text: 'text-red-800', icon: X, label: 'Archivada' }



    };



    const estilo = estilos[estado as keyof typeof estilos] || estilos.borrador;



    const Icon = estilo.icon;



    return (



      <Badge className={`${estilo.bg} ${estilo.text} border-0 px-3 py-1 flex items-center gap-1.5 w-fit`}>



        <Icon className="w-4 h-4" />



        {estilo.label}



      </Badge>



    );



  };







  return (



    <div className="space-y-6">



      <style>{`
        .variable-token {
          font-weight: inherit !important;
          display: inline !important;
          font-size: inherit !important;
          line-height: inherit !important;
          padding: 0px 2px !important;
          margin: 0 !important;
          border-radius: 2px !important;
          vertical-align: baseline !important;
        }
        .variable-token * {
          padding: 0 !important;
          margin: 0 !important;
        }
      `}</style>



      {/* Header */}



      <motion.div



        initial={{ opacity: 0, y: -10 }}



        animate={{ opacity: 1, y: 0 }}



        transition={{ duration: 0.3 }}



      >



        <div className="flex items-center justify-between">



          <div>



            <div className="flex items-center gap-3 mb-2">



              <div 



                className="w-12 h-12 rounded-xl flex items-center justify-center"



                style={{



                  background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',



                  boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'



                }}



              >



                <FileText className="w-6 h-6 text-white" strokeWidth={2.5} />



              </div>



              <div>



                <h1 



                  className="font-bold tracking-tight"



                  style={{



                    fontSize: '32px',



                    lineHeight: '40px',



                    letterSpacing: '-0.25px',



                    color: '#1F2937'



                  }}



                >



                  Configuración de Plantilla



                </h1>



              </div>



            </div>



            <p



              className="font-normal"



              style={{



                fontSize: '14px',



                lineHeight: '20px',



                color: '#6B7280'



              }}



            >



              Configura los elementos visuales de los certificados laborales: firma del responsable y logo institucional.



            </p>



          </div>







          <div className="flex items-center gap-3">



            {getEstadoBadge(plantilla.estado)}



            <Badge variant="outline" className="px-3 py-1 text-sm">



              Versión {plantilla.version}



            </Badge>



          </div>



        </div>



      </motion.div>







      {/* Banner de Advertencia si hay cambios sin guardar */}



      {hasChanges && (



        <motion.div



          initial={{ opacity: 0, y: -10 }}



          animate={{ opacity: 1, y: 0 }}



          className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4"



        >



          <div className="flex items-start gap-3">



            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />



            <div className="flex-1">



              <h3 className="font-semibold text-yellow-900 mb-1">



                Cambios sin guardar



              </h3>



              <p className="text-sm text-yellow-800">



                Has realizado cambios en la plantilla. Recuerda guardarlos y solicitar autorización antes de cerrar.



              </p>



            </div>



            <Button



              variant="ghost"



              size="sm"



              onClick={handleDescartarCambios}



              className="text-yellow-700 hover:text-yellow-900"



            >



              Descartar



            </Button>



          </div>



        </motion.div>



      )}







      {/* Tabs de Navegación */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-600">Tipo de plantilla:</p>
        <div className="flex gap-2">
          <Button
            variant={templateType === 'docente' ? 'default' : 'outline'}
            className={templateType === 'docente' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
            onClick={() => setTemplateType('docente')}
          >
            Docente
          </Button>
          <Button
            variant={templateType === 'administrador' ? 'default' : 'outline'}
            className={templateType === 'administrador' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
            onClick={() => setTemplateType('administrador')}
          >
            Administrador
          </Button>
        </div>
      </div>



      <Tabs
        value={activeTab}
        onValueChange={(newTab: string) => {
          // Guardar el contenido del editor antes de cambiar de pestaña
          if (activeTab === 'Modificaciónn' && editorRef.current) {
            const currentContent = editorRef.current.innerHTML;
            console.log('Guardando contenido antes de cambiar de pestaña:', currentContent.substring(0, 50) + '...');
            setEditorContent(currentContent);
          }
          // Cambiar la pestaña
          setActiveTab(newTab);
        }}
        className="mt-6"
      >



        <TabsList className={`grid w-full ${canEdit ? 'grid-cols-3' : 'grid-cols-1'}`}>



          {canEdit && (



            <TabsTrigger value="Modificaciónn" className="flex items-center gap-2">



              <Edit3 className="w-4 h-4" /> Modificaciónn



            </TabsTrigger>



          )}



          {canEdit && (



            <TabsTrigger value="Visualizaciónn" className="flex items-center gap-2">



              <Eye className="w-4 h-4" /> Visualizaciónn



            </TabsTrigger>



          )}



          <TabsTrigger value="historial" className="flex items-center gap-2">



            <History className="w-4 h-4" />



            Historial



          </TabsTrigger>



        </TabsList>







        {/* TAB 1: Modificaciónn */}



        {canEdit && (



        <TabsContent value="Modificaciónn" className="space-y-6 mt-6">



          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">



            {/* Datos del Firmante */}



            <Card className="p-6">



              <h3 className="flex items-center gap-2 mb-5 text-lg font-semibold text-gray-900">



                <User className="w-5 h-5 text-[#003DA5]" />



                Datos del Firmante



              </h3>



              



              <div className="space-y-4">



                <div>



                  <Label htmlFor="firmante-nombre">Nombre Completo del Firmante *</Label>



                  <Input



                    id="firmante-nombre"



                    value={borrador.firmante.nombre}



                    onChange={(e) => handleFirmanteChange('nombre', e.target.value)}



                    placeholder="Ej: Dra. María Elena Bernal Torres"



                    className="mt-2"



                  />



                </div>



              </div>







              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">



                <p className="text-sm text-blue-800 flex items-start gap-2">



                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />



                  <span>



                    Este es el nombre que aparecerá en la firma de los certificados. Solo modifica el nombre, sin cambiar el diseño de la plantilla.



                  </span>



                </p>



              </div>



            </Card>







            {/* Grafo de Firma */}



            <Card className="p-6">



              <h3 className="flex items-center gap-2 mb-5 text-lg font-semibold text-gray-900">



                <PenTool className="w-5 h-5 text-[#003DA5]" />



                Grafo / Imagen de Firma



              </h3>







              <div className="space-y-4">



                {/* Vista previa de la firma actual */}



                {borrador.grafoFirma && (



                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">



                    <div className="flex items-center justify-center mb-3">



                      <img



                        src={borrador.grafoFirma.url}



                        alt="Firma actual"



                        className="max-h-32 object-contain"



                      />



                    </div>



                    <div className="text-center">



                      <p className="text-sm text-gray-700 font-medium">



                        {borrador.grafoFirma.nombre}



                      </p>



                      <p className="text-xs text-gray-500 mt-1">



                        {borrador.grafoFirma.tamaño}



                      </p>



                    </div>



                  </div>



                )}







                {/* Botón de carga */}



                <div>



                  <Label htmlFor="firma-upload" className="mb-2 block">



                    Cargar nueva firma



                  </Label>



                  <input



                    id="firma-upload"



                    type="file"



                    accept="image/*"



                    onChange={handleFileUpload}



                    className="hidden"



                  />



                  <label



                    htmlFor="firma-upload"



                    className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#003DA5] hover:bg-blue-50 transition-all cursor-pointer"



                  >



                    <Upload className="w-5 h-5 text-gray-600" />



                    <span className="text-sm text-gray-700">



                      Seleccionar imagen



                    </span>



                  </label>



                </div>







                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">



                  <p className="text-xs text-gray-600">



                    <strong>Requisitos:</strong>



                  </p>



                  <ul className="text-xs text-gray-600 mt-2 space-y-1">



                    <li>• Formato: PNG, JPG o JPEG</li>



                    <li>• Tamaño máximo: 2 MB</li>



                    <li>• Fondo transparente recomendado</li>



                    <li>• Resolución mínima: 300 DPI</li>


                    <li>• Tamaño recomendado: 400px de ancho x 120px de alto para que quede nítida al mostrarse a 48px</li>



                  </ul>



                </div>







                <Button



                  variant="outline"



                  onClick={handleResetFirma}



                  disabled={isResettingFirma || !canEdit}



                  className="w-full justify-center"



                >



                  <RefreshCw className="w-4 h-4 mr-2" />



                  {isResettingFirma ? 'Restableciendo...' : 'Quitar firma (dejar vacía)'}



                </Button>



              </div>



            </Card>



          </div>







          {/* Logo de la Entidad */}



          <Card className="p-6">



            <h3 className="flex items-center gap-2 mb-5 text-lg font-semibold text-gray-900">



              <ImageIcon className="w-5 h-5 text-[#003DA5]" />



              Logo de la Entidad (ESAP)



            </h3>







            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">



              {/* Vista previa del logo actual */}



              <div className="space-y-3">



                <Label className="block">Logo actual</Label>



                {borrador.logoEntidad ? (



                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">



                    <div className="flex items-center justify-center mb-3">



                      <img



                        src={borrador.logoEntidad.url}



                        alt="Logo ESAP actual"



                        className="max-h-32 object-contain"



                      />



                    </div>



                    <div className="text-center">



                      <p className="text-sm text-gray-700 font-medium">



                        {borrador.logoEntidad.nombre}



                      </p>



                      <p className="text-xs text-gray-500 mt-1">



                        {borrador.logoEntidad.tamaño}



                      </p>



                    </div>



                  </div>



                ) : (



                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">



                    <div className="flex items-center justify-center h-32">



                      <p className="text-sm text-gray-500 text-center">



                        No hay logo configurado



                      </p>



                    </div>



                  </div>



                )}



              </div>







              {/* Cargar nuevo logo */}



              <div className="space-y-3">



                <Label htmlFor="logo-upload" className="block">



                  Cargar nuevo logo



                </Label>



                <input



                  id="logo-upload"



                  type="file"



                  accept="image/*"



                  onChange={handleLogoUpload}



                  className="hidden"



                />



                <label



                  htmlFor="logo-upload"



                  className="flex items-center justify-center px-4 py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#003DA5] hover:bg-blue-50 transition-all cursor-pointer block"



                >



                  <div className="text-center">



                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />



                    <p className="text-sm font-medium text-gray-700 mb-1">



                      Seleccionar imagen



                    </p>



                    <p className="text-xs text-gray-500">



                      Arrastra o haz clic para cargar



                    </p>



                  </div>



                </label>







                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">



                  <p className="text-xs text-gray-600 font-semibold mb-2">



                    Requisitos del logo:



                  </p>



                  <ul className="text-xs text-gray-600 space-y-1">



                    <li>• Formato: PNG, JPG o JPEG</li>



                    <li>• Tamaño máximo: 2 MB</li>



                    <li>• Fondo transparente recomendado</li>



                    <li>• Resolución mínima: 300 DPI</li>
                    <li>? Tama?o recomendado: 500px de ancho x 150px de alto para que se vea n?tido al mostrarse a ~100px de alto</li>



                  </ul>



                </div>



              </div>



            </div>







            <div className="mt-4 flex justify-end">



              <Button



                variant="outline"



                onClick={handleResetLogo}



                disabled={isResettingLogo || !canEdit}



              >



                <RefreshCw className="w-4 h-4 mr-2" />



                {isResettingLogo ? 'Restableciendo...' : 'Volver al logo oficial ESAP'}



              </Button>



            </div>







            <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">



              <p className="text-sm text-blue-800 flex items-start gap-2">



                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />



                <span>



                  Este logo aparecerá en el encabezado de todos los certificados laborales. 



                  Se recomienda usar el logo oficial de la ESAP con fondo transparente para mejor presentación.



                </span>



              </p>



            </div>



          </Card>







          {/* Tipografía y Contenido del Certificado */}



          <Card className="p-6">



            <div className="space-y-6">



              <div>



                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">



                  <Type className="w-5 h-5 text-[#003DA5]" />



                  Tipografía y Contenido del Certificado



                </h3>



                <p className="text-sm text-gray-600 mb-6">



                  Configura la tipografía general y el contenido del certificado con formato enriquecido



                </p>



              </div>







              {/* Tipografía General - Solo Fuente */}



              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">



                <Label htmlFor="fuente" className="text-sm font-medium text-gray-700">



                  Fuente Tipográfica



                </Label>



                <Select



                  value={borrador.tipografia.fuente}



                  onValueChange={(value) => {



                    setBorrador({



                      ...borrador,



                      tipografia: { ...borrador.tipografia, fuente: value }



                    });



                    setHasChanges(true);



                  }}



                >



                  <SelectTrigger className="mt-1">



                    <SelectValue />



                  </SelectTrigger>



                  <SelectContent>



                    {fuentesDisponibles.map((fuente) => (



                      <SelectItem key={fuente.value} value={fuente.value}>



                        {fuente.label}



                      </SelectItem>



                    ))}



                  </SelectContent>



                </Select>



              </div>







              {/* Editor de Título del Cargo */}



              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">



                <Label className="text-sm font-medium text-gray-700">



                  Título del Cargo (encabezado del certificado)



                </Label>



                <div className="flex justify-center">



                  <textarea



                    value={borrador.tituloCargo.texto}



                    onChange={(e) => {



                      setBorrador({



                        ...borrador,



                        tituloCargo: {



                          texto: e.target.value



                        }



                      });



                      setHasChanges(true);



                    }}



                    placeholder="Ej: LA DIRECTORA TÉCNICA DE TALENTO HUMANO DE LA&#10;ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA – ESAP"



                    className="p-3 border border-blue-300 rounded-md font-bold text-center resize-none uppercase whitespace-pre-line"



                    style={{



                      fontFamily: borrador.tipografia.fuente,



                      fontSize: `${borrador.tipografia.tamaño}pt`,



                      lineHeight: '1.2',



                      width: '600px',



                      maxWidth: '100%'



                    }}



                    rows={3}



                  />



                </div>



                <p className="text-xs text-blue-700">



                  Este texto aparecerá en la parte superior del certificado, antes de "HACE CONSTAR". Usa Enter para crear saltos de línea.



                </p>



              </div>







              {/* Editor de Contenido con Formato Enriquecido */}



              <div className="space-y-3">



                <Label className="text-sm font-medium text-gray-700">



                  Contenido del Certificado



                </Label>







                {/* Barra de herramientas de formato */}



                <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-gray-300 rounded-t-lg">



                  <div className="flex items-center gap-1 border-r border-gray-300 pr-2">



                      <button



                        type="button"



                        className="p-2 hover:bg-gray-100 rounded transition-colors"



                        title="Negrita"



                        onClick={toggleBold}



                      >



                        <span className="font-bold text-sm">B</span>



                      </button>



                    <button



                      type="button"



                      className="p-2 hover:bg-gray-100 rounded transition-colors"



                      title="Cursiva"



                      onClick={() => {



                        document.execCommand('italic', false, '');



                      }}



                    >



                      <span className="italic text-sm">I</span>



                    </button>



                    <button



                      type="button"



                      className="p-2 hover:bg-gray-100 rounded transition-colors"



                      title="Subrayado"



                      onClick={() => {



                        document.execCommand('underline', false, '');



                      }}



                    >



                      <span className="underline text-sm">U</span>



                    </button>



                  </div>







                  <div className="flex items-center gap-2 border-r border-gray-300 pr-2">



                    <span className="text-xs text-gray-600">Color:</span>



                    {coloresDisponibles.map((color) => (



                      <button



                        key={color.value}



                        type="button"



                        className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"



                        style={{ backgroundColor: color.value }}



                        title={color.label}



                        onClick={() => {



                          document.execCommand('foreColor', false, color.value);



                        }}



                      />



                    ))}



                  </div>







                  {/* Menú desplegable de variables */}



                  <div className="flex items-center gap-2">



                    <span className="text-xs text-gray-600 font-medium">Insertar Variable:</span>



                    <select



                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white hover:bg-gray-50 cursor-pointer"



                      onChange={(e) => {



                        if (e.target.value) {



                          insertarVariable(e.target.value);



                          e.target.value = ''; // Reset



                        }



                      }}



                      defaultValue=""



                    >



                      <option value="" disabled>Selecciona una variable...</option>



                      {variablesDisponibles.map((variable) => (



                        <option key={variable.codigo} value={variable.codigo}>



                          {variable.codigo} - {variable.descripcion}



                        </option>



                      ))}



                    </select>



                  </div>



                </div>







                {/* Editor de texto */}



                <div



                  ref={editorRef}



                  contentEditable={canEdit}



                  suppressContentEditableWarning



                  className="min-h-[200px] p-4 border border-t-0 border-gray-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-blue-500"



                  style={{



                    fontFamily: borrador.tipografia.fuente,



                    fontSize: `${borrador.tipografia.tamaño}pt`,



                    color: borrador.tipografia.color,



                    lineHeight: '1.8'



                  }}






                  onInput={(e) => {
                    let newContent = e.currentTarget.innerHTML;

                    // Normalizar el contenido para limpiar spans anidados
                    newContent = normalizarVariables(newContent);

                    // Actualizar el estado local del editor
                    setEditorContent(newContent);

                    // Actualizar el borrador
                    setBorrador({



                      ...borrador,



                      contenidoCertificado: {



                        ...borrador.contenidoCertificado,



                        texto: newContent



                      }



                    });



                    setHasChanges(true);



                  }}



                />







                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-300">



                  <p className="text-sm text-yellow-900 flex items-start gap-2">



                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />



                    <span>



                      <strong>Variables disponibles:</strong> Usa el menú desplegable "Insertar Variable" para agregar campos dinámicos como



                      <span className="px-2 py-0.5 bg-yellow-200 text-black font-semibold rounded mx-1">[NOMBRE_EMPLEADO]</span>,



                      <span className="px-2 py-0.5 bg-yellow-200 text-black font-semibold rounded mx-1">[DOCUMENTO]</span>,



                      <span className="px-2 py-0.5 bg-yellow-200 text-black font-semibold rounded mx-1">[CARGO]</span>, etc.



                      Las variables se mostrarán resaltadas en amarillo y serán reemplazadas automáticamente al generar cada certificado.



                      Selecciona texto para aplicar negrita, cursiva o cambiar el color.



                    </span>



                  </p>



                </div>



              </div>



            </div>



          </Card>







          {!canEdit && (



            <div className="p-3 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-700 flex items-center gap-2">



              <Shield className="w-4 h-4" />



              Solo la cuenta cerlaboral@esap.edu.co puede modificar y autorizar esta plantilla.



            </div>



          )}







          {/* Botones de Acción */}



          <div className="flex items-center justify-between gap-4 pt-4">



            <div className="flex gap-3">



              <Button



                variant="outline"



                onClick={handleDescartarCambios}



                disabled={!hasChanges || !canEdit}



              >



                <X className="w-4 h-4 mr-2" />



                Descartar Cambios



              </Button>



            </div>







            <div className="flex gap-3">



              <Button



                variant="outline"



                onClick={handleGuardarBorrador}



                disabled={!hasChanges || !canEdit || isSaving}



              >



                <Save className="w-4 h-4 mr-2" />



                Guardar Borrador



              </Button>



              <Button



                variant="outline"



                onClick={handleGuardarYVerPlantilla}



                disabled={!canEdit || isSaving}



                className="border-blue-600 text-blue-600 hover:bg-blue-50"



              >



                <Eye className="w-4 h-4 mr-2" />



                Ver Plantilla



              </Button>



              <Button



                onClick={handleAutorizarPlantilla}



                disabled={isPublishing || !canEdit}



                className="bg-blue-600 hover:bg-blue-700 text-white"



              >



                <CheckSquare className="w-4 h-4 mr-2" />



                Autorizar Plantilla



              </Button>



            </div>



          </div>



        </TabsContent>



        )}







        {/* TAB 2: Visualizaciónn */}



        {canEdit && (



        <TabsContent value="Visualizaciónn" className="space-y-6 mt-6">



          <Card className="p-8">



            <div className="mb-6 text-center">



              <h3 className="text-xl font-bold text-gray-900 mb-2">



                Vista Previa del Certificado Laboral



              </h3>



              <p className="text-sm text-gray-600">



                Así se verá el certificado con la configuración actual



              </p>



            </div>







            {/* Simulación de certificado - EXACTA A LA PLANTILLA REAL */}



            <div



              className="border-2 border-gray-300 rounded-lg bg-white shadow-lg max-w-[800px] mx-auto"



              style={{ padding: '60px 80px', position: 'relative' }}



            >



              {/* Logo ESAP - Arriba a la izquierda */}



              <div style={{ position: 'relative', height: '120px', marginBottom: '24px' }}>



                {borrador.logoEntidad ? (



                  <img



                    src={borrador.logoEntidad.url}



                    alt="Logo ESAP"



                    crossOrigin="anonymous"



                    style={{



                      position: 'absolute',



                      top: '20px',



                      left: '-10px',



                      width: 'auto',



                      height: 'auto',



                      maxHeight: '100px',



                      objectFit: 'contain'



                    }}



                  />



                ) : (



                  <div className="text-xs text-gray-400">Logo ESAP</div>



                )}



              </div>







              {/* Número de certificado */}



              <div className="mb-8">



                <p



                  style={{



                    fontFamily: borrador.tipografia.fuente,



                    fontSize: `${borrador.tipografia.tamaño}pt`,



                    color: borrador.tipografia.color



                  }}



                >



                  12_620_700_20_CD 004



                </p>



              </div>







              {/* Título del cargo - editable */}



              <div className="text-center mb-12 flex justify-center">



                <p



                  className="font-bold whitespace-pre-wrap"



                  style={{



                    fontFamily: borrador.tipografia.fuente,



                    fontSize: `${borrador.tipografia.tamaño}pt`,



                    color: borrador.tipografia.color,



                    lineHeight: '1.2',



                    wordBreak: 'keep-all',



                    overflowWrap: 'normal',



                    width: '600px',



                    maxWidth: '100%'



                  }}



                >



                  {borrador.tituloCargo.texto}



                </p>



              </div>







              {/* HACE CONSTAR - fijo, no editable */}



              <div className="text-center mb-8">



                <p



                  className="font-bold"



                  style={{



                    fontFamily: borrador.tipografia.fuente,



                    fontSize: `${borrador.tipografia.tamaño}pt`,



                    color: borrador.tipografia.color



                  }}



                >



                  HACE CONSTAR



                </p>



              </div>







              {/* Contenido del certificado con formato enriquecido */}



              <div



                className="space-y-2.5 text-justify"



                style={{



                  fontFamily: borrador.tipografia.fuente,



                  fontSize: `${borrador.tipografia.tamaño}pt`,



                  color: borrador.tipografia.color,



                  lineHeight: '1.8'



                }}



                dangerouslySetInnerHTML={{ __html: borrador.contenidoCertificado.texto }}



              />







              {/* Espacio para firma (si hay imagen de firma, se muestra aquí) */}



              <div className="mt-12 mb-3 flex justify-center items-center" style={{ height: '48px' }}>



                {borrador.grafoFirma && (



                  <img



                    src={borrador.grafoFirma.url}



                    alt="Firma"



                    className="w-auto object-contain"



                    style={{ maxHeight: '48px', height: '48px', maxWidth: '200px' }}



                  />



                )}



              </div>







              {/* Nombre del firmante - Centrado en negrita */}



              <div className="text-center mb-10">



                <p className="text-[11px] font-bold text-gray-900">{borrador.firmante.nombre}</p>



              </div>







              {/* Pie de página */}



              <div className="mt-6 pt-2 border-t border-gray-400 text-[8.5px] text-gray-700 leading-tight">



                <div className="grid grid-cols-2 gap-8">



                  <div className="space-y-0.5">



                    <p>Sede principal</p>



                    <p>Calle #12 - 37, CAN, Bogotá D.C.</p>



                    <p>Conmutador: (571) 2202790</p>



                    <p>Línea centralizada PBX: 018000-422713</p>



                    <p>Línea nacional gratuita (USA): 018000-422713</p>



                  </div>



                  <div className="text-right flex items-end justify-end">



                    <p className="text-[#003DA5] font-semibold text-[10px]">www.esap.edu.co</p>



                  </div>



                </div>



              </div>



            </div>







            {/* Información adicional */}



            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">



              <p className="text-sm text-blue-800 flex items-start gap-2">



                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />



                <span>



                  Esta es una vista previa de cómo se verá el certificado. Los datos del funcionario



                  se reemplazarán automáticamente al generar cada certificado individual.



                </span>



              </p>



            </div>



          </Card>



        </TabsContent>



        )}







        {/* TAB 3: HISTORIAL */}



        <TabsContent value="historial" className="space-y-6 mt-6">



          <Card className="p-6">



            <div className="mb-6">



              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">



                <History className="w-5 h-5 text-[#003DA5]" />



                Historial de Cambios en la Plantilla



              </h3>



              <p className="text-sm text-gray-600">



                Registro completo de todas las Modificaciónnes realizadas a la plantilla de certificados



              </p>



            </div>







            {logCambios.length === 0 ? (



              <div className="text-center py-12 text-gray-500">



                <History className="w-12 h-12 mx-auto mb-4 text-gray-400" />



                <p className="text-lg font-medium">No hay cambios registrados</p>



                <p className="text-sm mt-2">



                  Los cambios que realices aparecerán aquí para su seguimiento



                </p>



              </div>



            ) : (



              <div className="space-y-3">



                {logCambios.map((log) => {



                  // Determinar icono y color según el tipo de cambio



                  const getChangeIcon = (tipo: string) => {



                    switch (tipo) {



                      case 'logo':



                        return { icon: ImageIcon, color: 'bg-blue-50 text-blue-600 border-blue-200' };



                      case 'firma':



                        return { icon: PenTool, color: 'bg-purple-50 text-purple-600 border-purple-200' };



                      case 'nombre':



                        return { icon: User, color: 'bg-green-50 text-green-600 border-green-200' };



                      default:



                        return { icon: Edit3, color: 'bg-gray-50 text-gray-600 border-gray-200' };



                    }



                  };







                  const changeConfig = getChangeIcon(log.accion.toLowerCase().includes('logo') ? 'logo' :



                                                     log.accion.toLowerCase().includes('firma') ? 'firma' : 'nombre');



                  const IconComponent = changeConfig.icon;







                  return (



                    <div



                      key={log.id}



                      className="border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 overflow-hidden"



                    >



                      {/* Barra de color superior según tipo de cambio */}



                      <div className={`h-1 ${changeConfig.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>







                      <div className="p-4">



                        <div className="flex items-start gap-3">



                          {/* Icono distintivo según el tipo de cambio */}



                          {log.changeType === 'logo' && (



                            <div className="relative">



                              <div className="p-3 rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm">



                                <ImageIcon className="w-6 h-6 text-blue-600" strokeWidth={2.5} />



                              </div>



                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">



                                <span className="text-[8px] font-bold text-white">L</span>



                              </div>



                            </div>



                          )}







                          {log.changeType === 'firma' && (



                            <div className="relative">



                              <div className="p-3 rounded-xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100 shadow-sm">



                                <PenTool className="w-6 h-6 text-purple-600" strokeWidth={2.5} />



                              </div>



                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">



                                <span className="text-[8px] font-bold text-white">F</span>



                              </div>



                            </div>



                          )}







                          {log.changeType === 'nombre' && (



                            <div className="relative">



                              <div className="p-3 rounded-xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-green-100 shadow-sm">



                                <User className="w-6 h-6 text-green-600" strokeWidth={2.5} />



                              </div>



                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">



                                <span className="text-[8px] font-bold text-white">N</span>



                              </div>



                            </div>



                          )}







                          {log.changeType === 'tipografia' && (



                            <div className="relative">



                              <div className="p-3 rounded-xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100 shadow-sm">



                                <Type className="w-6 h-6 text-orange-600" strokeWidth={2.5} />



                              </div>



                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">



                                <span className="text-[8px] font-bold text-white">T</span>



                              </div>



                            </div>



                          )}







                          {log.changeType === 'contenido' && (



                            <div className="relative">



                              <div className="p-3 rounded-xl border-2 border-teal-300 bg-gradient-to-br from-teal-50 to-teal-100 shadow-sm">



                                <FileText className="w-6 h-6 text-teal-600" strokeWidth={2.5} />



                              </div>



                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center">



                                <span className="text-[8px] font-bold text-white">C</span>



                              </div>



                            </div>



                          )}







                          {!log.changeType && (



                            <div className="p-3 rounded-xl border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm">



                              <Edit3 className="w-6 h-6 text-gray-600" strokeWidth={2.5} />



                            </div>



                          )}







                          {/* Contenido principal */}



                          <div className="flex-1">



                            <div className="flex items-start justify-between mb-2">



                              <div>



                                <h4 className="font-semibold text-gray-900 text-sm">{log.accion}</h4>



                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">



                                  <span className="flex items-center gap-1">



                                    <User className="w-3 h-3" />



                                    {log.usuario}



                                  </span>



                                  <span className="flex items-center gap-1">



                                    <Calendar className="w-3 h-3" />



                                    {new Date(log.fecha).toLocaleDateString('es-CO', {



                                      day: '2-digit',



                                      month: 'short',



                                      year: 'numeric'



                                    })}



                                  </span>



                                  <span className="flex items-center gap-1">



                                    <Clock className="w-3 h-3" />



                                    {new Date(log.fecha).toLocaleTimeString('es-CO', {



                                      hour: '2-digit',



                                      minute: '2-digit'



                                    })}



                                  </span>



                                </div>



                              </div>



                            </div>







                            {/* Detalle de cambios con Visualizaciónnes */}



                            <div className="mt-3 bg-gray-50 rounded-md p-3 border border-gray-100">



                              {/* Visualizaciónn según el tipo de cambio */}



                              {log.changeType === 'logo' && log.newValue && log.newValue.includes('/uploads/') && (



                                <div className="mb-3 flex items-center gap-4 p-3 bg-white rounded-md border border-blue-100">



                                  <div className="flex flex-col items-center gap-2">



                                    <span className="text-xs font-medium text-gray-600">Anterior</span>



                                    {log.oldValue && log.oldValue.includes('/uploads/') ? (



                                      <div className="w-20 h-20 border-2 border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-white p-2">



                                        <img



                                          src={buildServiceAssetUrl('certificados', log.oldValue || '')}



                                          alt="Logo anterior"



                                          className="w-full h-full object-contain"



                                        />



                                      </div>



                                    ) : (



                                      <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">



                                        <ImageIcon className="w-8 h-8 text-gray-400" />



                                      </div>



                                    )}



                                  </div>



                                  <div className="flex items-center">



                                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">



                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />



                                    </svg>



                                  </div>



                                  <div className="flex flex-col items-center gap-2">



                                    <span className="text-xs font-medium text-blue-600">Nuevo</span>



                                    <div className="w-20 h-20 border-2 border-blue-400 rounded-lg overflow-hidden flex items-center justify-center bg-white p-2 shadow-sm">



                                      <img



                                        src={buildServiceAssetUrl('certificados', log.newValue || '')}



                                        alt="Logo nuevo"



                                        className="w-full h-full object-contain"



                                      />



                                    </div>



                                  </div>



                                </div>



                              )}







                              {log.changeType === 'firma' && log.newValue && log.newValue.includes('/uploads/') && (



                                <div className="mb-3 flex items-center gap-4 p-3 bg-white rounded-md border border-purple-100">



                                  <div className="flex flex-col items-center gap-2">



                                    <span className="text-xs font-medium text-gray-600">Anterior</span>



                                    {log.oldValue && log.oldValue.includes('/uploads/') ? (



                                      <div className="w-32 h-16 border-2 border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-white p-2">



                                        <img



                                          src={buildServiceAssetUrl('certificados', log.oldValue || '')}



                                          alt="Firma anterior"



                                          className="w-full h-full object-contain"



                                        />



                                      </div>



                                    ) : (



                                      <div className="w-32 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">



                                        <PenTool className="w-6 h-6 text-gray-400" />



                                      </div>



                                    )}



                                  </div>



                                  <div className="flex items-center">



                                    <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">



                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />



                                    </svg>



                                  </div>



                                  <div className="flex flex-col items-center gap-2">



                                    <span className="text-xs font-medium text-purple-600">Nueva</span>



                                    <div className="w-32 h-16 border-2 border-purple-400 rounded-lg overflow-hidden flex items-center justify-center bg-white p-2 shadow-sm">



                                      <img



                                        src={buildServiceAssetUrl('certificados', log.newValue || '')}



                                        alt="Firma nueva"



                                        className="w-full h-full object-contain"



                                      />



                                    </div>



                                  </div>



                                </div>



                              )}







                              {log.changeType === 'nombre' && log.oldValue && log.newValue && (



                                <div className="mb-3 p-3 bg-white rounded-md border border-green-100">



                                  <div className="flex items-center gap-3 justify-center">



                                    <div className="flex flex-col items-center gap-1 flex-1">



                                      <span className="text-xs font-medium text-gray-600">Anterior</span>



                                      <div className="w-full p-3 bg-gray-50 rounded-md border border-gray-200 text-center">



                                        <p className="text-sm font-semibold text-gray-700">{log.oldValue}</p>



                                      </div>



                                    </div>



                                    <div className="flex items-center pt-6">



                                      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">



                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />



                                      </svg>



                                    </div>



                                    <div className="flex flex-col items-center gap-1 flex-1">



                                      <span className="text-xs font-medium text-green-600">Nuevo</span>



                                      <div className="w-full p-3 bg-green-50 rounded-md border border-green-300 text-center shadow-sm">



                                        <p className="text-sm font-bold text-green-800">{log.newValue}</p>



                                      </div>



                                    </div>



                                  </div>



                                </div>



                              )}







                              {log.changeType === 'tipografia' && log.oldValue && log.newValue && (



                                <div className="mb-3 p-3 bg-white rounded-md border border-orange-100">



                                  <div className="flex items-center gap-3 justify-center">



                                    <div className="flex flex-col items-center gap-1 flex-1">



                                      <span className="text-xs font-medium text-gray-600">Anterior</span>



                                      <div className="w-full p-3 bg-gray-50 rounded-md border border-gray-200 text-center">



                                        <p className="text-sm font-semibold text-gray-700">



                                          Aa



                                        </p>



                                        <p className="text-xs text-gray-600 mt-1">{log.oldValue}</p>



                                      </div>



                                    </div>



                                    <div className="flex items-center pt-6">



                                      <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">



                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />



                                      </svg>



                                    </div>



                                    <div className="flex flex-col items-center gap-1 flex-1">



                                      <span className="text-xs font-medium text-orange-600">Nueva</span>



                                      <div className="w-full p-3 bg-orange-50 rounded-md border border-orange-300 text-center shadow-sm">



                                        <p className="text-sm font-bold text-orange-800" style={{ fontFamily: log.newValue }}>



                                          Aa



                                        </p>



                                        <p className="text-xs text-orange-700 mt-1">{log.newValue}</p>



                                      </div>



                                    </div>



                                  </div>



                                </div>



                              )}







                              {log.changeType === 'contenido' && (



                                <div className="mb-3 p-3 bg-white rounded-md border border-teal-100">



                                  <div className="flex flex-col gap-3">



                                    <div className="flex items-center justify-between">



                                      <span className="text-xs font-medium text-gray-600">Cambios en el contenido:</span>



                                      <span className="text-xs text-teal-600 font-medium">Contenido actualizado</span>



                                    </div>







                                    {/* Mostrar versión anterior */}



                                      {log.oldValue && (



                                      (() => {



                                        const { oldHighlighted, newHighlighted } = generarDiffResaltado(log.oldValue, log.newValue);



                                        return (



                                          <div className="space-y-2">



                                            <div className="flex items-center gap-2">



                                              <div className="w-20 text-xs font-semibold text-gray-600">Anterior:</div>



                                              <div className="flex-1 p-3 bg-red-50 rounded-md border border-red-200 max-h-32 overflow-y-auto">



                                                <div



                                                  className="text-xs text-red-900 whitespace-pre-wrap"



                                                  dangerouslySetInnerHTML={{ __html: oldHighlighted }}



                                                  style={{



                                                    wordBreak: 'break-word',



                                                    lineHeight: '1.6'



                                                  }}



                                                />



                                              </div>



                                            </div>







                                            <div className="flex items-center justify-center">



                                              <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">



                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />



                                              </svg>



                                            </div>







                                            <div className="flex items-center gap-2">



                                              <div className="w-20 text-xs font-semibold text-teal-700">Nuevo:</div>



                                              <div className="flex-1 p-3 bg-teal-50 rounded-md border border-teal-200 max-h-32 overflow-y-auto">



                                                <div



                                                  className="text-xs text-teal-900 whitespace-pre-wrap"



                                                  dangerouslySetInnerHTML={{ __html: newHighlighted }}



                                                  style={{



                                                    wordBreak: 'break-word',



                                                    lineHeight: '1.6'



                                                  }}



                                                />



                                              </div>



                                            </div>



                                          </div>



                                        );



                                      })()



                                    )}







                                    {/* Si no hay valor anterior, solo mostrar el nuevo */}



                                    {!log.oldValue && log.newValue && (



                                      <div className="p-3 bg-teal-50 rounded-md border border-teal-200 max-h-40 overflow-y-auto">



                                        <p className="text-xs font-medium text-teal-700 mb-2">Contenido nuevo:</p>



                                        <div



                                          className="text-xs text-teal-900 whitespace-pre-wrap"



                                          dangerouslySetInnerHTML={{ __html: log.newValue }}



                                          style={{



                                            wordBreak: 'break-word',



                                            lineHeight: '1.6'



                                          }}



                                        />



                                      </div>



                                    )}



                                  </div>



                                </div>



                              )}







                              {/* Texto descriptivo del cambio - Solo mostrar para cambios que NO sean de contenido */}



                              {log.changeType !== 'contenido' && (



                                <div className="space-y-1.5">



                                  {log.cambios.map((cambio, idx) => (



                                    <div key={idx} className="text-xs text-gray-700 font-mono">



                                      {cambio}



                                    </div>



                                  ))}



                                </div>



                              )}



                            </div>



                          </div>



                        </div>



                      </div>



                    </div>



                  );



                })}



              </div>



            )}



          </Card>



        </TabsContent>



      </Tabs>







    </div>



  );



}










