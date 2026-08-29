import React, { useState } from 'react';
import {
  Briefcase,
  Coins,
  FolderOpen,
  CalendarClock,
  FileSignature,
  ClipboardCheck,
  FileText,
  Store,
  Settings,
} from 'lucide-react';
import { Toaster } from '@esap-mfe/shared-ui/sonner';

// Maquetación propia del módulo. Va aquí, en el componente expuesto por Module
// Federation, para que entre en el bundle del microfrontend: la plataforma
// genera Tailwind escaneando solo el shell, así que los valores arbitrarios
// que el shell no use no existen. Ver el encabezado de layout.css.
import '../styles/layout.css';

import { ModuleLayout, MenuGroup } from '../shared/ModuleLayout';
import { VistaProcesos } from './procesos/VistaProcesos';
import { DetalleProceso } from './proceso/DetalleProceso';
import { VistaUmbrales } from './umbrales/VistaUmbrales';
import { VistaConfiguracion } from './configuracion/VistaConfiguracion';
import { VistaPlantillas } from './plantillas/VistaPlantillas';
import { VistaPlazosPublicacion } from './plazos/VistaPlazosPublicacion';
import { VistaCondicionesMipyme } from './mipyme/VistaCondicionesMipyme';
import { VistaExpedientes } from './expedientes/VistaExpedientes';

type Seccion =
  | 'estudios-previos'
  | 'revision'
  | 'expedientes'
  | 'umbrales'
  | 'plazos'
  | 'mipyme'
  | 'plantillas'
  | 'configuracion';

/**
 * Módulo de Gestión de Contratación — HU EFDS-1146.
 *
 * Navegación en tres niveles:
 *   lista de procesos → detalle del proceso (actividades de la etapa)
 *   → formulario de la actividad
 *
 * Implementado: etapa 3, numeral 3.1 (estudio previo). Las demás actividades
 * se muestran en el detalle para dejar visible el flujo, sin simular datos.
 */
export default function ContratacionModulePremium() {
  const [seccion, setSeccion] = useState<Seccion>('estudios-previos');
  const [procesoId, setProcesoId] = useState<string | null>(null);
  const [actividad, setActividad] = useState<string | null>(null);

  const grupos: MenuGroup[] = [
    {
      items: [
        {
          id: 'estudios-previos',
          label: 'Procesos',
          subtitle: 'Procesos contractuales',
          icon: <FileSignature className="w-5 h-5" />,
          color: '#003DA5',
        },
        {
          id: 'revision',
          label: 'Revisión',
          subtitle: 'Aprobación de documentos',
          icon: <ClipboardCheck className="w-5 h-5" />,
          color: '#10B981',
          disabled: true,
          tag: 'Próx.',
        },
        {
          // Tab propio y no un botón dentro del detalle: el expediente se
          // consulta sin estar trabajando un proceso —es lo que abre un
          // organismo de control—, y llegar a él pasando por lista y detalle
          // lo escondía. Mismo sitio y mismo cian que en control interno y
          // gestión legal.
          id: 'expedientes',
          label: 'Expedientes',
          subtitle: 'Consulta y auditoría',
          icon: <FolderOpen className="w-5 h-5" />,
          color: '#0891B2',
        },
      ],
    },
    {
      // Aparte del trabajo diario: no se administra un umbral mientras se
      // diligencia un proceso.
      title: 'Configuración',
      items: [
        // Un color por tab y no uno para el grupo: los tres primeros
        // configuran cosas distintas —dinero, tiempo y quién puede
        // participar— y con el mismo morado había que leer la etiqueta para
        // distinguirlos.
        {
          id: 'umbrales',
          label: 'Umbrales',
          subtitle: 'Cuantías por modalidad',
          // La balanza es de justicia; aquí lo que se configura son pesos.
          icon: <Coins className="w-5 h-5" />,
          color: '#7C3AED',
        },
        {
          id: 'plazos',
          label: 'Plazos',
          subtitle: 'Publicidad del pliego',
          icon: <CalendarClock className="w-5 h-5" />,
          color: '#D97706',
        },
        {
          id: 'mipyme',
          label: 'MIPYME',
          subtitle: 'Condiciones de limitación',
          // Un edificio no dice «pequeña empresa»; la tienda sí.
          icon: <Store className="w-5 h-5" />,
          color: '#059669',
        },
        {
          // Los formatos del SIG son un catálogo propio: un mismo formato
          // sirve en varias actividades, así que no cuelga de ninguna.
          id: 'plantillas',
          label: 'Plantillas',
          subtitle: 'Formatos del SIG',
          icon: <FileText className="w-5 h-5" />,
          // Rosa y no cian: el cian ya identifica a Expedientes, y dos tabs
          // del mismo color obligan a leer la etiqueta para distinguirlos.
          color: '#DB2777',
        },
        {
          id: 'configuracion',
          label: 'Configuración',
          subtitle: 'Etapas y reglas',
          icon: <Settings className="w-5 h-5" />,
          color: '#64748B',
        },
      ],
    },
  ];

  // Dos niveles: lista de procesos y detalle. El formulario ya no es una
  // pantalla aparte — se despliega dentro de su actividad en el detalle.
  const contenido = () => {
    if (seccion === 'expedientes') return <VistaExpedientes />;
    if (seccion === 'umbrales') return <VistaUmbrales />;
    if (seccion === 'plazos') return <VistaPlazosPublicacion />;
    if (seccion === 'mipyme') return <VistaCondicionesMipyme />;
    if (seccion === 'plantillas') return <VistaPlantillas />;
    if (seccion === 'configuracion') return <VistaConfiguracion />;
    if (procesoId) {
      return (
        <DetalleProceso
          procesoId={procesoId}
          onVolver={() => {
            setProcesoId(null);
            setActividad(null);
          }}
          actividadInicial={actividad}
        />
      );
    }
    return (
      <VistaProcesos
        onAbrir={(id) => {
          setProcesoId(id);
          setActividad('3.1'); // abre el proceso con el estudio previo desplegado
        }}
        onVerEtapa={(id) => {
          setProcesoId(id);
          setActividad(null);
        }}
      />
    );
  };

  return (
    <ModuleLayout
      moduleName="CONTRATACIÓN"
      moduleDescription="Gestión Contractual · Fase 1"
      moduleIcon={<Briefcase className="w-6 h-6" />}
      moduleColor="#003DA5"
      groups={grupos}
      activeSection={seccion}
      onSectionChange={(s) => {
        setSeccion(s as Seccion);
        setProcesoId(null);
        setActividad(null);
      }}
    >
      {contenido()}
      {/* Misma configuración que gestión legal y control interno, para que las
          notificaciones se comporten igual en toda la plataforma. */}
      <Toaster position="bottom-right" richColors closeButton duration={4000} />
    </ModuleLayout>
  );
}
