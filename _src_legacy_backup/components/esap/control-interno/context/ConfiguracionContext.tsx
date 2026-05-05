/**
 * ============================================
 * CONTEXT: CONFIGURACIÓN PDF
 * ============================================
 * 
 * Context global para la configuración de PDFs
 * Persiste en localStorage
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ConfiguracionPDF {
  // Logo
  logoUrl: string;
  logoAncho: number;
  logoAlto: number;
  
  // Colores corporativos
  colorPrimario: string;
  colorSecundario: string;
  colorAcento: string;
  
  // Datos institucionales
  nombreInstitucion: string;
  nit: string;
  direccion: string;
  telefono: string;
  email: string;
  sitioWeb: string;
  
  // Firmas predeterminadas
  jefeOCINombre: string;
  jefeOCICargo: string;
  jefeOCIEmail: string;
  
  // Configuración del documento
  incluirMarcaAgua: boolean;
  textoMarcaAgua: string;
  incluirIndice: boolean;
  incluirMarcoNormativo: boolean;
  
  // Footer
  textoFooterIzquierdo: string;
  textoFooterDerecho: string;
  mostrarFechaGeneracion: boolean;
  mostrarPaginacion: boolean;
}

const CONFIGURACION_DEFAULT: ConfiguracionPDF = {
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

interface ConfiguracionContextType {
  config: ConfiguracionPDF;
  actualizarConfiguracion: (config: ConfiguracionPDF) => void;
  resetearConfiguracion: () => void;
}

const ConfiguracionContext = createContext<ConfiguracionContextType | undefined>(undefined);

export function ConfiguracionProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConfiguracionPDF>(CONFIGURACION_DEFAULT);

  // Cargar configuración desde localStorage al montar
  useEffect(() => {
    const configGuardada = localStorage.getItem('esap_config_pdf');
    if (configGuardada) {
      try {
        const parsed = JSON.parse(configGuardada);
        setConfig({ ...CONFIGURACION_DEFAULT, ...parsed });
      } catch (error) {
        console.error('Error al cargar configuración:', error);
      }
    }
  }, []);

  const actualizarConfiguracion = (nuevaConfig: ConfiguracionPDF) => {
    setConfig(nuevaConfig);
    localStorage.setItem('esap_config_pdf', JSON.stringify(nuevaConfig));
  };

  const resetearConfiguracion = () => {
    setConfig(CONFIGURACION_DEFAULT);
    localStorage.removeItem('esap_config_pdf');
  };

  return (
    <ConfiguracionContext.Provider
      value={{
        config,
        actualizarConfiguracion,
        resetearConfiguracion
      }}
    >
      {children}
    </ConfiguracionContext.Provider>
  );
}

export function useConfiguracion() {
  const context = useContext(ConfiguracionContext);
  if (!context) {
    throw new Error('useConfiguracion debe usarse dentro de ConfiguracionProvider');
  }
  return context;
}
