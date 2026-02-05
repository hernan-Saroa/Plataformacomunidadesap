/**



 * MODULO: Configuracion de Plantilla DE CERTIFICADOS LABORALES



 * - Gestiona firma del responsable y logo institucional



 * - Carga datos reales desde la base de datos



 * - Upload de imAgenes al servidor



 */







import React, { useState, useEffect, useMemo, useRef } from 'react';



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



import { QRCodeCanvas } from 'qrcode.react';

import { toast } from 'sonner';



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



    tamano: string;



  } | null;



  logoEntidad: {



    url: string;



    nombre: string;



    tamano: string;



  } | null;



  tipografia: {



    fuente: string;



    tamano: number;



    color: string;



  };



  tituloCargo: {



    texto: string; // Ej: "LA DIRECTORA TACNICA DE TALENTO HUMANO DE LA\nESCUELA SUPERIOR DE ADMINISTRACIAN PABLICA a ESAP"



  };



  contenidoCertificado: {



    texto: string; // HTML string con formato enriquecido



    estilosPersonalizados: {



      palabrasClave: { texto: string; estilo: { bold: boolean; italic: boolean; color: string } }[];



    };



  };



  fechaCreacion: string;



  fechaModificacion: string;



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



  plantillaSnapshot: PlantillaConfig; // Snapshot completo de la plantilla en ese momento



  // Campos adicionales para Visualizacion mejorada



  changeType: string;



  oldValue: string;



  newValue: string;



  fieldName: string;



  metadata?: Record<string, any>;



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



  { value: '#A52eA', label: 'Cafe' },



];







// Variables disponibles para insertar en los certificados



const descripcionVariables: Record<string, string> = {
  '[NOMBRE_EMPLEADO]': 'Nombre completo del empleado',
  '[DOCUMENTO]': 'Numero de documento',
  '[CARGO]': 'Cargo calculado (categoria + codigo + grado)',
  '[TIPO_DATO]': 'Tipo de vinculación',
  '[DEPENDENCIA]': 'Dependencia donde trabaja',
  '[DATO1]': 'Dato 1 (nombre empleado)',
  '[DATO2]': 'Dato 2 (documento)',
  '[DATO4]': 'Dato 4 (fecha de inicio)',
  '[DATO5]': 'Cargo del empleado',
  '[DATO6]': 'Dato 6 (dato adicional)',
  '[UBICACIÓN]': 'Ubicacion',
  '[DATO8]': 'Dato 8 (salario en letras)',
  '[FECHA_INICIO]': 'Fecha de inicio del contrato',
  '[FECHA_FIN]': 'Fecha de finalizacion',
  '[SALARIO]': 'Salario mensual (numero)',
  '[SALARIO_LETRAS]': 'Salario en letras',
  '[FECHA_EXPEDICION_COMPLETA]': 'Fecha completa de expedicion (ej: 11 de diciembre de 2025)',
  '[CIUDAD_EXPEDICION]': 'Ciudad de expedicion',
};







const defaultContenidoCertificado = '<p>Que<b>&nbsp;</b>[NOMBRE_EMPLEADO] identificado(a) con c\u00E9dula de ciudadan\u00EDa No. [DOCUMENTO], se encuentra vinculado(a) con la Escuela Superior de Administraci\u00F3n P\u00FAblica \u2013 ESAP, mediante nombramiento Docente [TIPO_DATO] desde el [FECHA_INICIO], en la categor\u00EDa [CARGO] ubicado en [UBICACIÓN].</p><p>Que [NOMBRE_EMPLEADO] percibe mensualmente una asignaci\u00F3n salarial de [SALARIO] [SALARIO_LETRAS] pesos m/cte.</p><p>Se expide en la ciudad de Bogot\u00E1 D.C., a solicitud del interesado(a) a los&nbsp;[FECHA_EXPEDICION_COMPLETA].</p>';







interface ConfiguracionPlantillaProps {



  canEdit: boolean;



  currentUserEmail: string;



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

  const [isResettingFirmante, setIsResettingFirmante] = useState(false);

  const [isResettingTituloCargo, setIsResettingTituloCargo] = useState(false);

  const [isResettingContenido, setIsResettingContenido] = useState(false);



  const [logCambios, setLogCambios] = useState<LogCambio[]>([]);
  const [historialTotal, setHistorialTotal] = useState(0);
  const [isLoadingHistorial, setIsLoadingHistorial] = useState(false);
  const [historialPage, setHistorialPage] = useState(1);
  const [revertingChangeId, setRevertingChangeId] = useState<string | null>(null);
  const [historialDirty, setHistorialDirty] = useState(false);

  const [activeTab, setActiveTab] = useState<string>(canEdit ? 'Modificacion' : 'historial');

  const [editorContent, setEditorContent] = useState<string>('');

  const variablesDisponibles = useMemo(() => {
    const contenidoBase = editorContent || borrador?.contenidoCertificado.texto || defaultContenidoCertificado;
    const tokens = contenidoBase.match(/\[[A-Z0-9_ÁÉÍÓÚÑÜ]+(?: [A-Z0-9_ÁÉÍÓÚÑÜ]+)*\]/g) || [];
    const vistos = new Set<string>();
    const ordenados: string[] = [];
    for (const token of tokens) {
      if (!vistos.has(token)) {
        vistos.add(token);
        ordenados.push(token);
      }
    }
    return ordenados.map((codigo) => ({
      codigo,
      descripcion: descripcionVariables[codigo] || 'Variable usada en la plantilla'
    }));
  }, [editorContent, borrador?.contenidoCertificado.texto]);



  const editorRef = useRef<HTMLDivElement | null>(null);



  const publishingActor = currentUserEmail || 'cerlaboral@esap.edu.co';
  const HISTORIAL_POR_PAGINA = 10;



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
    // Solo proceder si estamos en la pestana de Modificacion
    if (activeTab !== 'Modificacion') return;

    // Usar un pequeAo delay para asegurar que el DOM esta listo despuAs del cambio de tab
    const timer = setTimeout(() => {
      if (!editorRef.current) {
        console.log('Editor ref no disponible');
        return;
      }
      const editor = editorRef.current;

      // No sobrescribir si el usuario esta editando activamente
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



   * Funcion helper para resaltar variables en el texto



   * Convierte [VARIABLE] en <span class="variable-highlight">[VARIABLE]</span>



   */



  const resaltarVariables = (html: string): string => {



    // Patron para encontrar variables como [NOMBRE_EMPLEADO], [DOCUMENTO], [CARGO], etc.



    const patron = /\[([A-Z0-9_ÁÉÍÓÚÑÜ]+(?: [A-Z0-9_ÁÉÍÓÚÑÜ]+)*)\]/g;



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
        /<span[^>]*>\s*(<span[^>]*>[\s\S]*-<\/span>)\s*<\/span>/g,
        '$1'
      );
    }

    // Paso 2: Normalizar todos los spans con clase variable-token
    resultado = resultado.replace(
      /<span[^>]*class="[^"]*variable-token[^"]*"[^>]*>([^<]*\[([A-Z0-9_ÁÉÍÓÚÑÜ]+(?: [A-Z0-9_ÁÉÍÓÚÑÜ]+)*)\][^<]*)<\/span>/g,
      '<span class="variable-token bg-yellow-200 text-black" style="font-weight: inherit; display: inline; padding: 0px 2px; font-size: inherit; line-height: inherit; border-radius: 2px; margin: 0;" contenteditable="false">[$2]</span>'
    );

    // Paso 3: Envolver variables sueltas que no tienen span
    resultado = resultado.replace(
      /(-<!<span[^>]*>)\[([A-Z0-9_ÁÉÍÓÚÑÜ]+(?: [A-Z0-9_ÁÉÍÓÚÑÜ]+)*)\](-![^<]*<\/span>)/g,
      '<span class="variable-token bg-yellow-200 text-black" style="font-weight: inherit; display: inline; padding: 0px 2px; font-size: inherit; line-height: inherit; border-radius: 2px; margin: 0;" contenteditable="false">[$1]</span>'
    );

    // Paso 4: Limpiar spans vacAos
    resultado = resultado.replace(/<span[^>]*>\s*<\/span>/g, '');

    return resultado;
  };







  /**



   * Calcula diferencias token a token (palabras + espacios/puntuacion) usando LCS y resalta solo los modificados.



   * Ignora spans previos de resaltado y no pinta tokens que sean solo espacio.



   */



  const convertirHtmlATextoPlano = (html: string) => {
    if (!html) return '';
    const normalized = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n');
    if (typeof document === 'undefined') {
      return normalized.replace(/<[^>]+>/g, '').replace(/\u00a0/g, ' ');
    }
    const container = document.createElement('div');
    container.innerHTML = normalized;
    return (container.textContent || container.innerText || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\r\n/g, '\n');
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const generarDiffResaltado = (oldHtml: string, newHtml: string) => {



    const clean = (v: string) => convertirHtmlATextoPlano(v || '');



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



          const safeToken = escapeHtml(t);



          if (keep.has(idx) || isSpace) return safeToken;



          return `<span class="variable-token bg-yellow-200 text-black" style="font-weight: inherit; display: inline; padding: 0px 2px; font-size: inherit; line-height: inherit; border-radius: 2px; margin: 0;">${safeToken}</span>`;



        })



        .join('');







    return {



      oldHighlighted: wrap(oldTokens, keepOld),



      newHighlighted: wrap(newTokens, keepNew),



    };



  };







  const limpiarResaltado = (html: string) => (html || '').replace(/<\/?span[^>]*>/g, '');







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



        tamano: ''



      } : null,



      logoEntidad: logoConfig ? {



        url: buildServiceAssetUrl('certificados', logoConfig.url),



        nombre: logoConfig.filename || 'logo.png',



        tamano: logoConfig.size || ''



      } : null,



      tipografia: {



        fuente: 'Arial Narrow, Arial, sans-serif', // Misma fuente que los PDFs generados



        tamano: 12,



        color: '#000000'



      },



      tituloCargo: {



        texto: config.cargoTitle || 'LA DIRECTORA T\u00C9CNICA DE TALENTO HUMANO DE LA\nESCUELA SUPERIOR DE ADMINISTRACI\u00D3N P\u00DABLICA - ESAP'



      },



      contenidoCertificado: {



        texto: resaltar ? normalizarVariables(resaltarVariables(contenidoHtml)) : normalizarVariables(contenidoHtml),



        estilosPersonalizados: {



          palabrasClave: []



        }



      },



      fechaCreacion: config.createdAt || new Date().toISOString(),



      fechaModificacion: config.updatedAt || new Date().toISOString(),



      creadoPor: 'Sistema',



      modificadoPor: config.updatedBy || 'Sistema'



    };



  };







  /**



   * Funcion para insertar una variable en la posicion del cursor



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







    // Insertar el span y un espacio despuAs



    range.insertNode(span);



    range.collapse(false);







    // Agregar un espacio despuAs de la variable



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



   * Aplica/quita negrita y la refleja en variables dentro de la seleccion



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







  // Cargar configuracion real desde el backend al montar el componente



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



        console.error('Error al cargar configuracion:', error);



        toast.error('Error al cargar configuracion', {



          description: 'No se pudo cargar la configuracion de la plantilla'



        });



      } finally {



        setIsLoading(false);



      }



    };







    cargarConfiguracion();



  }, [templateType]);







  // Cargar historial de cambios

  const mapearHistorial = (historial: any[]): LogCambio[] =>
    historial.map((cambio: any) => ({
      id: cambio.id.toString(),
      fecha: cambio.changedAt,
      usuario: cambio.changedBy || 'Usuario',
      accion: getAccionTexto(cambio.changeType, cambio.metadata),
      cambios: [formatearCambio(cambio)],
      versionAnterior: '1.0.0',
      versionNueva: '1.0.0',
      // Agregar datos raw para Visualizacion
      changeType: cambio.changeType,
      oldValue: cambio.oldValue,
      newValue: cambio.newValue,
      fieldName: cambio.fieldName,
      metadata: cambio.metadata,
    }));

  const fallbackImageData =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='80'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='12'>No disponible</text></svg>";

  const handleHistorialImageError = (
    event: React.SyntheticEvent<HTMLImageElement>
  ) => {
    event.currentTarget.src = fallbackImageData;
    event.currentTarget.alt = 'Imagen no disponible';
  };

  const cargarHistorial = async (page: number, force = false) => {
    try {
      if (!force && activeTab !== 'historial') return;
      setIsLoadingHistorial(true);
      const safePage = Math.max(1, page);
      const offset = (safePage - 1) * HISTORIAL_POR_PAGINA;
      const response = await certificadosService.plantilla.obtenerHistorialCambios(
        templateType,
        HISTORIAL_POR_PAGINA,
        offset
      );
      const cambios = mapearHistorial(response.items || []);
      setLogCambios(cambios);
      setHistorialTotal(response.total || 0);
      setHistorialPage(safePage);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      setIsLoadingHistorial(false);
    }
  };

  useEffect(() => {
    setHistorialTotal(0);
    setHistorialPage(1);
    setLogCambios([]);
    if (activeTab === 'historial') {
      cargarHistorial(1);
    }
  }, [templateType]);

  useEffect(() => {
    if (activeTab !== 'historial') return;
    if (isLoadingHistorial) return;
    if (historialDirty || (logCambios.length === 0 && historialTotal === 0)) {
      cargarHistorial(historialPage);
    }
  }, [activeTab, historialDirty]);







  // Funcion helper para obtener texto de accion



  const getAccionTexto = (changeType: string, metadata?: Record<string, any>): string => {



    const acciones: Record<string, string> = {



      'logo': 'Actualizacion de Logo Institucional',



      'firma': 'Actualizacion de Firma Digital',



      'nombre': metadata?.reset
        ? 'Restablecimiento del Nombre del Firmante'
        : 'Cambio de Nombre del Firmante',



      'tipografia': 'Cambio de TipografAa',



      'titulo_cargo': 'Actualizacion del Titulo del Cargo',



      'contenido': 'Modificacion del Contenido del Certificado',



      'multiple': 'Actualizacion Multiple',



    };



    return acciones[changeType] || 'Modificacion de Plantilla';



  };







  // Funcion helper para formatear cambio



  const formatearCambio = (cambio: any): string => {



    // Traducir nombres de campos tAcnicos al espaAol



    const traduccionCampos: Record<string, string> = {



      'entity_logo_url': 'Logo institucional',



      'firma_digital_url': 'Firma digital',
      'signature_url': 'Firma digital',
      'signatureUrl': 'Firma digital',



      'nombre_completo': 'Nombre del firmante',



      'typography_font': 'Fuente tipogrAfica',



      'cargo_title': 'Titulo del cargo',



      'certificate_content_html': 'Contenido del certificado',



      'typographyFont': 'Fuente tipogrAfica',



      'cargoTitle': 'Titulo del cargo',



      'certificateContentHtml': 'Contenido del certificado',



    };







    const nombreCampo = traduccionCampos[cambio.fieldName] || cambio.fieldName.replace(/_/g, ' ');







    // Formatear valores para mejor legibilidad



    const valorAnterior = cambio.oldValue === 'Sin logo' ? 'Sin logo' :



                         cambio.oldValue === 'Sin firma' ? 'Sin firma' :



                         cambio.oldValue?.includes('/uploads/') ? 'Imagen anterior' :



                         cambio.oldValue;







    const valorNuevo = cambio.newValue?.includes('/uploads/') ? 'Nueva imagen cargada' : cambio.newValue;







    if (cambio.changeType === 'logo') {
      const teniaLogo = Boolean(cambio.oldValue && cambio.oldValue !== 'Sin logo');
      const tieneLogo = Boolean(cambio.newValue && cambio.newValue !== 'Sin logo');

      if (!teniaLogo && tieneLogo) {
        return 'Logo institucional: se cargo un nuevo logo';
      }

      if (teniaLogo && !tieneLogo) {
        return 'Logo institucional: se elimino el logo';
      }

      return 'Logo institucional: se actualizo el logo';
    }

    if (cambio.changeType === 'firma') {
      const teniaFirma = Boolean(cambio.oldValue && cambio.oldValue !== 'Sin firma');
      const tieneFirma = Boolean(cambio.newValue && cambio.newValue !== 'Sin firma');

      if (!teniaFirma && tieneFirma) {
        return 'Firma digital: se cargo una nueva firma';
      }

      if (teniaFirma && !tieneFirma) {
        return 'Firma digital: se elimino la firma';
      }

      return 'Firma digital: se actualizo la firma';
    }

    return `${nombreCampo}: "${valorAnterior}" - "${valorNuevo}"`;



  };







  // Evitar errores si plantilla aun no esta cargada



  if (isLoading || !plantilla || !borrador) {



    return (



      <div className="flex items-center justify-center min-h-screen">



        <div className="text-center">



          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003DA5] mx-auto mb-4"></div>



          <p className="text-gray-600">Cargando configuracion...</p>



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



      toast.error('Archivo invAlido', {



        description: 'Por favor selecciona una imagen vAlida (PNG, JPG, etc.)'



      });



      return;



    }







    // Validar tamaAo (mAximo 2MB)



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







      // Recargar TODA la configuracion desde el servidor para obtener datos frescos



      const config = await certificadosService.plantilla.obtenerConfiguracion(templateType);







      const plantillaActualizada = mapConfigToPlantilla(config, true);







      setBorrador(plantillaActualizada);



      setPlantilla(plantillaActualizada);



      setHasChanges(false);







      // Recargar historial despuAs de subir firma



      setHistorialDirty(true);




      await recargarHistorial(true);







      toast.success('Firma actualizada', {



        id: 'upload-signature',



        description: 'La imagen de la firma se subio correctamente'



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



      toast.error('Archivo invAlido', {



        description: 'Por favor selecciona una imagen vAlida (PNG, JPG, etc.)'



      });



      return;



    }







    // Validar tamaAo (mAximo 2MB)



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







      // Recargar TODA la configuracion desde el servidor para obtener datos frescos



      const config = await certificadosService.plantilla.obtenerConfiguracion(templateType);







      const plantillaActualizada = mapConfigToPlantilla(config, true);







      setBorrador(plantillaActualizada);



      setPlantilla(plantillaActualizada);



      setHasChanges(false);







      // Recargar historial despuAs de subir logo



      setHistorialDirty(true);




      await recargarHistorial(true);







      toast.success('Logo actualizado', {



        id: 'upload-logo',



        description: 'El logo de la entidad se subio correctamente'



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



        description: 'Se volvio al logo oficial de la ESAP'



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



        description: 'La plantilla quedo sin firma cargada'



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


  const handleResetFirmante = async () => {
    if (!ensureEditable()) return;

    try {
      setIsResettingFirmante(true);
      toast.loading('Restableciendo firmante...', { id: 'reset-firmante' });

      const config = await certificadosService.plantilla.resetNombreFirmante(publishingActor, templateType);
      const plantillaActualizada = mapConfigToPlantilla(config, true);

      setBorrador(plantillaActualizada);
      setPlantilla(plantillaActualizada);
      setEditorContent(plantillaActualizada.contenidoCertificado.texto);
      setHasChanges(false);
      await recargarHistorial();

      toast.success('Firmante restablecido', {
        id: 'reset-firmante',
        description: 'Se volvio al nombre predeterminado del firmante'
      });
    } catch (error) {
      console.error('Error al restablecer firmante:', error);
      toast.error('Error al restablecer firmante', {
        id: 'reset-firmante',
        description: error instanceof Error ? error.message : 'Intenta nuevamente'
      });
    } finally {
      setIsResettingFirmante(false);
    }
  };

  const handleResetTituloCargo = async () => {
    if (!ensureEditable()) return;

    try {
      setIsResettingTituloCargo(true);
      toast.loading('Restableciendo titulo del cargo...', { id: 'reset-titulo' });

      const config = await certificadosService.plantilla.resetTituloCargo(publishingActor, templateType);
      const plantillaActualizada = mapConfigToPlantilla(config, true);

      setBorrador(plantillaActualizada);
      setPlantilla(plantillaActualizada);
      setEditorContent(plantillaActualizada.contenidoCertificado.texto);
      setHasChanges(false);
      await recargarHistorial();

      toast.success('Titulo del cargo restablecido', {
        id: 'reset-titulo',
        description: 'Se volvio al encabezado predeterminado'
      });
    } catch (error) {
      console.error('Error al restablecer titulo del cargo:', error);
      toast.error('Error al restablecer titulo del cargo', {
        id: 'reset-titulo',
        description: error instanceof Error ? error.message : 'Intenta nuevamente'
      });
    } finally {
      setIsResettingTituloCargo(false);
    }
  };

  const handleResetContenido = async () => {
    if (!ensureEditable()) return;

    try {
      setIsResettingContenido(true);
      toast.loading('Restableciendo contenido...', { id: 'reset-contenido' });

      const config = await certificadosService.plantilla.resetContenido(publishingActor, templateType);
      const plantillaActualizada = mapConfigToPlantilla(config, true);

      setBorrador(plantillaActualizada);
      setPlantilla(plantillaActualizada);
      setEditorContent(plantillaActualizada.contenidoCertificado.texto);
      setHasChanges(false);
      await recargarHistorial();

      toast.success('Contenido restablecido', {
        id: 'reset-contenido',
        description: 'Se volvio al contenido predeterminado'
      });
    } catch (error) {
      console.error('Error al restablecer contenido:', error);
      toast.error('Error al restablecer contenido', {
        id: 'reset-contenido',
        description: error instanceof Error ? error.message : 'Intenta nuevamente'
      });
    } finally {
      setIsResettingContenido(false);
    }
  };






  // Funcion helper para recargar historial



  const recargarHistorial = async (force = false) => {
    try {
      if (!force && activeTab !== 'historial') return;
      await cargarHistorial(historialPage, force);
      setHistorialDirty(false);
    } catch (error) {
      console.error('Error al recargar historial:', error);
    }
  };

  const handleRevertirCambio = async (log: LogCambio) => {
    if (!ensureEditable()) return;
    setRevertingChangeId(log.id);
    try {
      const response = await certificadosService.plantilla.revertirCambio(
        Number(log.id),
        publishingActor,
        templateType,
      );
      const plantillaActualizada = mapConfigToPlantilla(response, true);
      setPlantilla(plantillaActualizada);
      setBorrador(plantillaActualizada);
      setHasChanges(false);
      await recargarHistorial();
      toast.success('Cambio revertido', {
        description: `Se restauro: ${log.accion}`,
      });
    } catch (error) {
      console.error('Error al revertir cambio:', error);
      toast.error('No se pudo revertir el cambio', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente',
      });
    } finally {
      setRevertingChangeId(null);
    }
  };

  const totalPages = Math.ceil(historialTotal / HISTORIAL_POR_PAGINA);

  const getVisiblePages = (): Array<number | '...'> => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages: Array<number | '...'> = [1];
    const start = Math.max(2, historialPage - 1);
    const end = Math.min(totalPages - 1, historialPage + 1);

    if (start > 2) {
      pages.push('...');
    }

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    if (end < totalPages - 1) {
      pages.push('...');
    }

    pages.push(totalPages);
    return pages;
  };

  const handlePageChange = (page: number) => {
    if (isLoadingHistorial) return;
    if (activeTab !== 'historial') return;
    if (page === historialPage) return;
    if (page < 1 || page > totalPages) return;
    cargarHistorial(page);
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







      // Guardar el nombre del firmante si cambio



      if (borrador.firmante.nombre !== plantilla.firmante.nombre) {



        await certificadosService.plantilla.actualizarNombreFirmante(
          borrador.firmante.nombre,
          publishingActor,
          templateType
        );



        cambiosGuardados.push('nombre del firmante');



      }







      // Guardar tipografAa, tAtulo del cargo y contenido HTML si cambiaron



      const contentChanges: any = {};



      let hasContentChanges = false;







      if (borrador.tipografia.fuente !== plantilla.tipografia.fuente) {



        contentChanges.typographyFont = borrador.tipografia.fuente;



        cambiosGuardados.push('tipografAa');



        hasContentChanges = true;



      }







      if (borrador.tituloCargo.texto !== plantilla.tituloCargo.texto) {



        contentChanges.cargoTitle = borrador.tituloCargo.texto;



        cambiosGuardados.push('tAtulo del cargo');



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







      // Recargar historial despuAs de guardar



      setHistorialDirty(true);



      await recargarHistorial(true);







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



        description: 'Mostrando como se vera el certificado con los cambios'



      });



    }



    // setIsPreviewOpen(true);



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

    // Navegar a la pestana de Visualizacion usando el estado
    setActiveTab('Visualizacion');
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







      const contentChanges: any = {};



      let hasContentChanges = false;



      if (borrador.tipografia.fuente !== plantilla.tipografia.fuente) {



        contentChanges.typographyFont = borrador.tipografia.fuente;



        hasContentChanges = true;



      }



      if (borrador.tituloCargo.texto !== plantilla.tituloCargo.texto) {



        contentChanges.cargoTitle = borrador.tituloCargo.texto;



        hasContentChanges = true;



      }



      const contenidoNormalizado = normalizarVariables(borrador.contenidoCertificado.texto || '');



      const contenidoActualNormalizado = normalizarVariables(plantilla.contenidoCertificado.texto || '');



      if (contenidoNormalizado !== contenidoActualNormalizado) {



        contentChanges.certificateContentHtml = contenidoNormalizado;



        hasContentChanges = true;



      }



      if (hasContentChanges) {



        contentChanges.updatedBy = publishingActor;



        await certificadosService.plantilla.actualizarContenidoPlantilla(contentChanges, templateType);



      }







      const nuevaVersion = incrementVersion(borrador.version);



      const publishedAt = new Date().toISOString();



      setPlantilla({



        ...borrador,



        version: nuevaVersion,



        estado: 'publicada',



        fechaModificacion: publishedAt,



        modificadoPor: publishingActor



      });



      setHasChanges(false);







      localStorage.setItem('cert-template-last-published', publishedAt);







      setHistorialDirty(true);




      await recargarHistorial(true);







      toast.success('Plantilla autorizada', {



        id: 'publish-template',



        description: 'La plantilla se activo para todos los certificados.'



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



    // setSelectedFile(null);



    toast.info('Cambios descartados', {



      description: 'Se restauro la plantilla publicada'



    });



  };







  const handleAbrirRestaurar = (log: LogCambio) => {



    if (!log.plantillaSnapshot) {



      toast.error('Error', {



        description: 'Esta version no tiene datos disponibles para restaurar'



      });



      return;



    }



    // setVersionARestaurar(log);



    // setIsRestaurarOpen(true);



  };







  const handleRestaurarVersion = () => {



    if (!versionARestaurar?.plantillaSnapshot) return;







    toast.loading('Restaurando version...', { id: 'restaurar' });



    



    setTimeout(() => {



      // Crear un nuevo log de cambio para registrar la restauracion



      const nuevoLog: LogCambio = {



        id: `LOG-${Date.now()}`,



        fecha: new Date().toISOString(),



        usuario: 'Admin Sistema',



        accion: `Restauracion a version ${versionARestaurar.versionNueva}`,



        cambios: [



          `Version restaurada: ${versionARestaurar.versionNueva}`,



          `Fecha de la version: ${new Date(versionARestaurar.fecha).toLocaleDateString('es-CO')}`,



          `Firmante restaurado: ${versionARestaurar.plantillaSnapshot.firmante.nombre}`,



          `TipografAa: ${versionARestaurar.plantillaSnapshot.tipografia.fuente} ${versionARestaurar.plantillaSnapshot.tipografia.tamano}pt`



        ],



        versionAnterior: plantilla.version,



        versionNueva: incrementVersion(plantilla.version),



        plantillaSnapshot: {



          ...versionARestaurar.plantillaSnapshot,



          version: incrementVersion(plantilla.version),



          fechaModificacion: new Date().toISOString(),



          modificadoPor: 'Admin Sistema'



        }



      };







      // Actualizar log de cambios (mantener solo Aoltimas 5)



      setLogCambios([nuevoLog, ...logCambios.slice(0, 4)]);







      // Actualizar plantilla y borrador



      const plantillaRestaurada = {



        ...versionARestaurar.plantillaSnapshot,



        version: incrementVersion(plantilla.version),



        fechaModificacion: new Date().toISOString(),



        modificadoPor: 'Admin Sistema'



      };







      setPlantilla(plantillaRestaurada);



      setBorrador(plantillaRestaurada);



      setHasChanges(false);



      // setIsRestaurarOpen(false);



      // setVersionARestaurar(null);



      



      toast.success('Version restaurada!', {



        id: 'restaurar',



        description: `La plantilla ahora usa la configuracion de la version ${versionARestaurar.versionNueva}`



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



      en_revision: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'En Revision' },



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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}



      <motion.div



        initial={{ opacity: 0, y: -10 }}



        animate={{ opacity: 1, y: 0 }}



        transition={{ duration: 0.3 }}



      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                style={{



                  background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',



                  boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'



                }}



              >
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 truncate">
                  Configuración de Plantilla
                </h1>



              </div>



            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              Gestiona la plantilla base de certificados laborales. Los cambios se aplican a todos los certificados futuros.
            </p>



          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {getEstadoBadge(plantilla.estado)}
            <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap">
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
          className="bg-yellow-50 border-2 border-yellow-300 rounded-lg sm:rounded-xl p-3 sm:p-4"
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-yellow-900 mb-1 text-sm sm:text-base">
                Cambios sin guardar



              </h3>
              <p className="text-xs sm:text-sm text-yellow-800">
                Has realizado cambios en la plantilla. Recuerda guardarlos y solicitar autorización antes de cerrar.
              </p>



            </div>



            <Button



              variant="ghost"



              size="sm"



              onClick={handleDescartarCambios}
              className="text-yellow-700 hover:text-yellow-900 min-h-[44px] sm:min-h-[36px]"
            >



              Descartar



            </Button>



          </div>



        </motion.div>



      )}

      {/* Tabs de Navegacion */}
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

      {/* Tabs */}
      <Tabs 
        value={activeTab}
        onValueChange={(newTab: string) => {
          // Guardar el contenido del editor antes de cambiar de pestana
          if (activeTab === 'Modificacion' && editorRef.current) {
            const currentContent = editorRef.current.innerHTML;
            console.log('Guardando contenido antes de cambiar de pestana:', currentContent.substring(0, 50) + '...');
            setEditorContent(currentContent);
          }
          // Cambiar la pestana
          setActiveTab(newTab);
        }}
        className="mt-6"
      >
        <TabsList className={`grid w-full ${canEdit ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {canEdit && (
            <TabsTrigger value="Modificacion" className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Modificación
            </TabsTrigger>
          )}
          {canEdit && (
            <TabsTrigger value="Visualizacion" className="flex items-center gap-2">
              <Eye className="w-4 h-4" /> Visualización
            </TabsTrigger>
          )}
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Historial
          </TabsTrigger>
        </TabsList>







        {/* TAB 1: Modificacion */}



        {canEdit && (



        <TabsContent value="Modificacion" className="space-y-6 mt-6">



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



                    placeholder="Ej: Dra. MarAa Elena Bernal Torres"



                    className="mt-2"



                  />



                </div>



              </div>







              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Este es el nombre que aparecera en la firma de los certificados. Solo modifica el nombre, sin cambiar el diseno de la plantilla.
                  </span>
                </p>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetFirmante}
                  disabled={isResettingFirmante || !canEdit}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {isResettingFirmante ? 'Restableciendo...' : 'Restablecer nombre'}
                </Button>
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



                        {borrador.grafoFirma.tamaAo}



                      </p>



                    </div>



                  </div>



                )}







                {/* Boton de carga */}



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



                    <li>a Formato: PNG, JPG o JPEG</li>



                    <li>a TamaAo mAximo: 2 MB</li>



                    <li>a Fondo transparente recomendado</li>



                    <li>a Resolucion mAnima: 300 DPI</li>


                    <li>a TamaAo recomendado: 400px de ancho x 120px de alto para que quede nAtida al mostrarse a 48px</li>



                  </ul>



                </div>







                <Button



                  variant="outline"



                  onClick={handleResetFirma}



                  disabled={isResettingFirma || !canEdit}



                  className="w-full justify-center"



                >



                  <RefreshCw className="w-4 h-4 mr-2" />



                  {isResettingFirma ? 'Restableciendo...' : 'Quitar firma (dejar vacAa)'}



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



                        {borrador.logoEntidad.tamaAo}



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



                    <li>a Formato: PNG, JPG o JPEG</li>



                    <li>a TamaAo mAximo: 2 MB</li>



                    <li>a Fondo transparente recomendado</li>



                    <li>a Resolucion mAnima: 300 DPI</li>
                    <li>- Tama-o recomendado: 500px de ancho x 150px de alto para que se vea n-tido al mostrarse a ~100px de alto</li>



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



                  Este logo aparecerA en el encabezado de todos los certificados laborales. 



                  Se recomienda usar el logo oficial de la ESAP con fondo transparente para mejor presentacion.



                </span>



              </p>



            </div>



          </Card>







          {/* TipografAa y Contenido del Certificado */}



          <Card className="p-6">



            <div className="space-y-6">



              <div>



                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">



                  <Type className="w-5 h-5 text-[#003DA5]" />



                  TipografAa y Contenido del Certificado



                </h3>



                <p className="text-sm text-gray-600 mb-6">



                  Configura la tipografAa general y el contenido del certificado con formato enriquecido



                </p>



              </div>







              {/* TipografAa General - Solo Fuente */}



              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">



                <Label htmlFor="fuente" className="text-sm font-medium text-gray-700">



                  Fuente TipogrAfica



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

              {/* Editor de Titulo del Cargo */}
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">
                    Titulo del Cargo (encabezado del certificado)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetTituloCargo}
                    disabled={isResettingTituloCargo || !canEdit}
                  >
                    <RefreshCw className="w-3 h-3 mr-2" />
                    {isResettingTituloCargo ? 'Restableciendo...' : 'Restablecer'}
                  </Button>
                </div>
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
                    placeholder="Ej: LA DIRECTORA TECNICA DE TALENTO HUMANO DE LA&#10;ESCUELA SUPERIOR DE ADMINISTRACION PUBLICA - ESAP"
                    className="p-3 border border-blue-300 rounded-md font-bold text-center resize-none uppercase whitespace-pre-line"
                    style={{
                      fontFamily: borrador.tipografia.fuente,
                      fontSize: `${borrador.tipografia.tamano}pt`,
                      lineHeight: '1.2',
                      width: '600px',
                      maxWidth: '100%'
                    }}
                    rows={3}
                  />
                </div>
                <p className="text-xs text-blue-700">
                  Este texto aparecera en la parte superior del certificado, antes de "HACE CONSTAR". Usa Enter para crear saltos de linea.
                </p>
              </div>

              {/* Editor de Contenido con Formato Enriquecido */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">
                    Contenido del Certificado
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetContenido}
                    disabled={isResettingContenido || !canEdit}
                  >
                    <RefreshCw className="w-3 h-3 mr-2" />
                    {isResettingContenido ? 'Restableciendo...' : 'Restablecer'}
                  </Button>
                </div>

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







                  {/* MenAo desplegable de variables */}



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



                    fontSize: `${borrador.tipografia.tamano}pt`,



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



                      <strong>Variables disponibles:</strong> Usa el menAo desplegable "Insertar Variable" para agregar campos dinAmicos como



                      <span className="px-2 py-0.5 bg-yellow-200 text-black font-semibold rounded mx-1">[NOMBRE_EMPLEADO]</span>,



                      <span className="px-2 py-0.5 bg-yellow-200 text-black font-semibold rounded mx-1">[DOCUMENTO]</span>,



                      <span className="px-2 py-0.5 bg-yellow-200 text-black font-semibold rounded mx-1">[CARGO]</span>, etc.



                      Las variables se mostrarAn resaltadas en amarillo y serAn reemplazadas automAticamente al generar cada certificado.



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







          {/* Botones de Accion */}



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

        {/* TAB 2: Visualizacion */}



        {canEdit && (



        <TabsContent value="Visualizacion" className="space-y-6 mt-6">



          <Card className="p-8">



            <div className="mb-6 text-center">



              <h3 className="text-xl font-bold text-gray-900 mb-2">



                Vista Previa del Certificado Laboral



              </h3>



              <p className="text-sm text-gray-600">



                Asi se vera el certificado con la configuracion actual



              </p>



            </div>







            {/* Simulacion de certificado - EXACTA A LA PLANTILLA REAL */}



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







              {/* NAomero de certificado */}



              <div className="mb-8">



                <p



                  style={{



                    fontFamily: borrador.tipografia.fuente,



                    fontSize: `${borrador.tipografia.tamano}pt`,



                    color: borrador.tipografia.color



                  }}



                >



                  12_620_700_20_CD 004



                </p>



              </div>







              {/* Titulo del cargo - editable */}



              <div className="text-center mb-12 flex justify-center">



                <p



                  className="font-bold whitespace-pre-wrap"



                  style={{



                    fontFamily: borrador.tipografia.fuente,



                    fontSize: `${borrador.tipografia.tamano}pt`,



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



                    fontSize: `${borrador.tipografia.tamano}pt`,



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



                  fontSize: `${borrador.tipografia.tamano}pt`,



                  color: borrador.tipografia.color,



                  lineHeight: '1.8'



                }}



                dangerouslySetInnerHTML={{ __html: borrador.contenidoCertificado.texto }}



              />







              {/* Espacio para firma (si hay imagen de firma, se muestra aquA) */}



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







              {/* Pie de pAgina */}



              <div className="mt-6 pt-2 border-t border-gray-400 text-[8.5px] text-gray-700 leading-tight">



                <div className="grid grid-cols-2 gap-8">



                  <div className="space-y-0.5">



                    <p>Sede principal</p>



                    <p>Calle #12 - 37, CAN, Bogota D.C.</p>



                    <p>Conmutador: (571) 2202790</p>



                    <p>LAnea centralizada PBX: 018000-422713</p>



                    <p>LAnea nacional gratuita (USA): 018000-422713</p>



                  </div>



                  <div className="text-right flex flex-col items-end justify-end gap-1">
                    <div className="bg-white border border-gray-300 rounded p-1 shadow-sm">
                      <QRCodeCanvas
                        value="https://esap.edu.co/verificar-certificado/QR-DEMO"
                        size={64}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        includeMargin={false}
                      />
                    </div>
                    <p className="text-[#003DA5] font-semibold text-[10px]">www.esap.edu.co</p>
                  </div>



                </div>



              </div>



            </div>







            {/* Informacion adicional */}



            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">



              <p className="text-sm text-blue-800 flex items-start gap-2">



                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />



                <span>



                  Esta es una vista previa de como se vera el certificado. Los datos del funcionario



                  se reemplazarAn automAticamente al generar cada certificado individual.



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



                Registro completo de todas las Modificaciones realizadas a la plantilla de certificados



              </p>



            </div>







            {logCambios.length === 0 ? (



              <div className="text-center py-12 text-gray-500">



                <History className="w-12 h-12 mx-auto mb-4 text-gray-400" />



                <p className="text-lg font-medium">No hay cambios registrados</p>



                <p className="text-sm mt-2">



                  Los cambios que realices aparecerAn aquA para su seguimiento



                </p>



              </div>



            ) : (



              <div className="space-y-3">



                {logCambios.map((log) => {



                  // Determinar icono y color segun el tipo de cambio



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



                      {/* Barra de color superior segun tipo de cambio */}



                      <div className={`h-1 ${changeConfig.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>







                      <div className="p-4">



                        <div className="flex items-start gap-3">



                          {/* Icono distintivo segun el tipo de cambio */}



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







                          {log.changeType === 'titulo_cargo' && (

                            <div className="relative">

                              <div className="p-3 rounded-xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 to-sky-100 shadow-sm">

                                <Type className="w-6 h-6 text-sky-600" strokeWidth={2.5} />

                              </div>

                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center">

                                <span className="text-[8px] font-bold text-white">TC</span>

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



                            <div className="flex items-start justify-between gap-3 mb-2">



                              <div className="flex-1 min-w-0 pr-3">



                                <h4 className="font-semibold text-gray-900 text-sm">{log.accion}</h4>



                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">



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

                              {canEdit && (
                                <div className="flex-shrink-0 w-28 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleRevertirCambio(log)}
                                    disabled={revertingChangeId === log.id}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${revertingChangeId === log.id
                                      ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                                      : 'border-gray-200 text-gray-600 hover:text-[#003DA5] hover:border-[#003DA5]/40'
                                    }`}
                                    title="Revertir cambio"
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${revertingChangeId === log.id ? 'animate-spin' : ''}`} />
                                    {revertingChangeId === log.id ? 'Revirtiendo' : 'Revertir'}
                                  </button>
                                </div>
                              )}




                            </div>







                            {/* Detalle de cambios con Visualizaciones */}



                            <div className="mt-3 bg-gray-50 rounded-md p-3 border border-gray-100">



                              {/* Visualizacion segun el tipo de cambio */}



                              {log.changeType === 'logo' && log.newValue && log.newValue.includes('/uploads/') && (



                                <div className="mb-3 flex items-center gap-4 p-3 bg-white rounded-md border border-blue-100">



                                  <div className="flex flex-col items-center gap-2">



                                    <span className="text-xs font-medium text-gray-600">Anterior</span>



                                    {log.oldValue && log.oldValue.includes('/uploads/') ? (



                                      <div className="w-20 h-20 border-2 border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-white p-2">



                                        <img



                                          src={buildServiceAssetUrl('certificados', log.oldValue || '')}



                                          alt="Logo anterior"

                                          onError={handleHistorialImageError}



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

                                        onError={handleHistorialImageError}



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

                                          onError={handleHistorialImageError}



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

                                        onError={handleHistorialImageError}



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







                              {log.changeType === 'titulo_cargo' && log.oldValue && log.newValue && (

                                <div className="mb-3 p-3 bg-white rounded-md border border-sky-100">

                                  <div className="flex flex-col gap-3">

                                    <div className="flex items-center gap-2">

                                      <div className="w-20 text-xs font-semibold text-gray-600">Anterior:</div>

                                      <div className="flex-1 p-3 bg-gray-50 rounded-md border border-gray-200">

                                        <p className="text-xs text-gray-800 whitespace-pre-wrap leading-6">

                                          {log.oldValue}

                                        </p>

                                      </div>

                                    </div>

                                    <div className="flex items-center justify-center">

                                      <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />

                                      </svg>

                                    </div>

                                    <div className="flex items-center gap-2">

                                      <div className="w-20 text-xs font-semibold text-sky-700">Nuevo:</div>

                                      <div className="flex-1 p-3 bg-sky-50 rounded-md border border-sky-200">

                                        <p className="text-xs text-sky-900 whitespace-pre-wrap leading-6">

                                          {log.newValue}

                                        </p>

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







                                    {/* Mostrar version anterior */}



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
                                          style={{
                                            wordBreak: 'break-word',
                                            lineHeight: '1.6'
                                          }}
                                        >
                                          {convertirHtmlATextoPlano(log.newValue)}
                                        </div>



                                      </div>



                                    )}



                                  </div>



                                </div>



                              )}







                              {/* Texto descriptivo del cambio - Solo mostrar para cambios que NO sean de contenido */}



                              {log.changeType !== 'contenido' && log.changeType !== 'titulo_cargo' && log.changeType !== 'nombre' && (



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

                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePageChange(historialPage - 1)}
                      disabled={isLoadingHistorial || historialPage === 1}
                    >
                      Anterior
                    </Button>

                    {getVisiblePages().map((page, index) =>
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-sm text-gray-500">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={`page-${page}`}
                          type="button"
                          variant={page === historialPage ? 'default' : 'outline'}
                          onClick={() => handlePageChange(page)}
                          disabled={isLoadingHistorial}
                        >
                          {page}
                        </Button>
                      )
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePageChange(historialPage + 1)}
                      disabled={isLoadingHistorial || historialPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                )}

              </div>



            )}



          </Card>



        </TabsContent>
        
      </Tabs>

    </div>
  );
}
