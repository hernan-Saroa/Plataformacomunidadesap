import React, { useState } from 'react';
import { Briefcase, FileSignature, ClipboardCheck, Scale } from 'lucide-react';
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

type Seccion = 'estudios-previos' | 'revision' | 'umbrales';

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
      ],
    },
    {
      // Aparte del trabajo diario: no se administra un umbral mientras se
      // diligencia un proceso.
      title: 'Configuración',
      items: [
        {
          id: 'umbrales',
          label: 'Umbrales',
          subtitle: 'Cuantías por modalidad',
          icon: <Scale className="w-5 h-5" />,
          color: '#7C3AED',
        },
      ],
    },
  ];

  // Dos niveles: lista de procesos y detalle. El formulario ya no es una
  // pantalla aparte — se despliega dentro de su actividad en el detalle.
  const contenido = () => {
    if (seccion === 'umbrales') return <VistaUmbrales />;
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
