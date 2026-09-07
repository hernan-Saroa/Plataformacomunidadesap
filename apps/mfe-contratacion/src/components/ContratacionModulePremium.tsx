import React, { useState } from 'react';
import { Briefcase, FileSignature, ClipboardCheck } from 'lucide-react';

import { ModuleLayout, MenuGroup } from '../shared/ModuleLayout';
import { VistaProcesos } from './procesos/VistaProcesos';
import { DetalleProceso } from './proceso/DetalleProceso';

type Seccion = 'estudios-previos' | 'revision';

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
  ];

  // Dos niveles: lista de procesos y detalle. El formulario ya no es una
  // pantalla aparte — se despliega dentro de su actividad en el detalle.
  const contenido = () => {
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
    </ModuleLayout>
  );
}
