/**
 * ============================================
 * HELPER: CONFIGURACIÓN PDF
 * ============================================
 * 
 * Funciones auxiliares para cargar y aplicar configuración de PDF
 */

import type { ConfiguracionPDF } from '../context/ConfiguracionContext';

/**
 * Cargar configuración desde localStorage
 * Retorna configuración guardada o default
 */
export function cargarConfiguracionPDF(): ConfiguracionPDF {
  try {
    const configGuardada = localStorage.getItem('esap_config_pdf');
    
    if (configGuardada) {
      const parsed = JSON.parse(configGuardada);
      return { ...getConfiguracionDefault(), ...parsed };
    }
  } catch (error) {
    console.error('Error al cargar configuración PDF:', error);
  }
  
  return getConfiguracionDefault();
}

/**
 * Obtener configuración por defecto
 */
export function getConfiguracionDefault(): ConfiguracionPDF {
  return {
    logoUrl: '',
    logoAncho: 60,
    logoAlto: 30,
    
    colorPrimario: '#003DA5',
    colorSecundario: '#2962FF',
    colorAcento: '#F57C00',
    
    nombreInstitucion: 'Escuela Superior de Administración Pública - ESAP',
    nit: '899.999.061-6',
    direccion: 'Calle 44 No. 53-37, Bogotá D.C.',
    telefono: '+57 (1) 220 2790',
    email: 'oci@esap.edu.co',
    sitioWeb: 'www.esap.edu.co',
    
    jefeOCINombre: 'Fernando Ávila García',
    jefeOCICargo: 'Jefe de la Oficina de Control Interno',
    jefeOCIEmail: 'fernando.avila@esap.edu.co',
    
    incluirMarcaAgua: false,
    textoMarcaAgua: 'BORRADOR',
    incluirIndice: false,
    incluirMarcoNormativo: true,
    
    textoFooterIzquierdo: 'Oficina de Control Interno - ESAP',
    textoFooterDerecho: 'Documento Oficial',
    mostrarFechaGeneracion: true,
    mostrarPaginacion: true
  };
}
