import React, { useState } from 'react';
import {
  BellRing,
  Handshake,
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
import { VistaAlertas } from './alertas/VistaAlertas';

type Seccion =
  | 'estudios-previos'
  | 'revision'
  | 'alertas'
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
/**
 * Si el usuario tiene un permiso, leyéndolo de la sesión que dejó el shell.
 *
 * El menú se filtra con esto porque ofrecer una pantalla que la API va a
 * rechazar con 403 no es seguridad —el guard ya la protege—, es una puerta
 * pintada: el usuario la abre, se estrella y no entiende por qué.
 *
 * Se lee del almacenamiento y no de un servicio del shell para no acoplar el
 * microfrontend a su host; si mañana la sesión deja de estar ahí, el menú se
 * muestra completo y el backend sigue negando lo que corresponda.
 */
function tienePermiso(codigo: string): boolean {
  try {
    const crudo =
      localStorage.getItem('user') ??
      localStorage.getItem('esap_user') ??
      sessionStorage.getItem('user');
    if (!crudo) return true;

    const usuario = JSON.parse(crudo);
    const roles: any[] = Array.isArray(usuario?.roles) ? usuario.roles : [];
    const esSuperAdmin = roles.some((rol) =>
      typeof rol === 'string' ? rol === 'SUPER_ADMIN' : rol?.code === 'SUPER_ADMIN',
    );
    if (esSuperAdmin) return true;

    const permisos: string[] = Array.isArray(usuario?.permissions)
      ? usuario.permissions.map((p: any) => (typeof p === 'string' ? p : p?.code)).filter(Boolean)
      : [];

    // Sin permisos en la sesión no se esconde nada: es más probable que la
    // sesión venga incompleta a que el usuario no tenga ninguno.
    if (permisos.length === 0) return true;

    return permisos.includes(codigo);
  } catch {
    return true;
  }
}

/** Administrar umbrales, plazos, MIPYME, plantillas y la matriz de etapas. */
const PERMISO_CONFIGURAR = 'contratacion.config.manage';

/** Las que exigen `config.manage`: escriben parámetros, no trabajan un proceso. */
const SECCIONES_DE_CONFIGURACION: Seccion[] = [
  'umbrales',
  'plazos',
  'mipyme',
  'plantillas',
  'configuracion',
];

export default function ContratacionModulePremium() {
  const [seccion, setSeccion] = useState<Seccion>('estudios-previos');
  const [procesoId, setProcesoId] = useState<string | null>(null);
  const [actividad, setActividad] = useState<string | null>(null);

  const puedeConfigurar = tienePermiso(PERMISO_CONFIGURAR);

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
        /*
         * Aquí había una sección «Revisión · Aprobación de documentos» marcada
         * como «Próx.». Se creó con la UI de aprobar y devolver del estudio
         * previo (EFDS-1202/1246) pensada como bandeja del revisor, y nunca se
         * construyó: entonces la 3.1 era la única actividad aprobable y se
         * resolvió dentro del riel.
         *
         * Era esta misma necesidad. Las aprobaciones pendientes se ven ahora en
         * Alertas, junto a los vencimientos —son las dos cosas que le reclaman
         * atención al usuario, y separarlas lo obligaría a mirar en dos
         * sitios—, así que la entrada se retira en vez de quedarse prometiendo
         * algo que ya está en otro lado.
         */
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
      //
      // El grupo entero exige `config.manage`: sus seis pantallas escriben
      // parámetros que gobiernan todos los procesos futuros, y sin el permiso
      // la API las rechaza. Quien no lo tenga no ve la sección.
      title: 'Configuración',
      items: !puedeConfigurar ? [] : [
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
          color: '#B45309',
        },
        {
          // En Configuración por pedido del área: se revisa junto a los demás
          // parámetros del flujo, no en el trabajo diario.
          id: 'alertas',
          label: 'Alertas',
          subtitle: 'Vencimientos y aprobaciones',
          icon: <BellRing className="w-5 h-5" />,
          color: '#DC2626',
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
    // Las de configuración se comprueban aunque el menú ya las esconda: la
    // sección sobrevive en el estado, y quien tenía la pantalla abierta cuando
    // le retiraron el permiso seguiría dentro de ella.
    const esDeConfiguracion = SECCIONES_DE_CONFIGURACION.includes(seccion);
    if (esDeConfiguracion && !puedeConfigurar) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-12 text-center">
          <p className="text-[13px] font-bold text-slate-700 m-0">
            No tienes acceso a esta configuración
          </p>
          <p className="text-[11.5px] text-slate-500 m-0 mt-1">
            La administran la Dirección de Contratación y el administrador del módulo.
          </p>
        </div>
      );
    }

    if (seccion === 'alertas')
      return (
        // La alerta lleva al proceso y, si es una aprobación, a la actividad
        // concreta: quien recibe el aviso quiere resolverlo, no buscarlo.
        <VistaAlertas
          onAbrir={(id, numeral) => {
            setSeccion('estudios-previos');
            setProcesoId(id);
            setActividad(numeral ?? null);
          }}
        />
      );
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
      moduleIcon={<Handshake className="w-5 h-5" />}
      moduleColor="#003DA5"
      groups={grupos.filter((g) => g.items.length > 0)}
      activeSection={seccion}
      onSectionChange={(s) => {
        setSeccion(s as Seccion);
        setProcesoId(null);
        setActividad(null);
      }}
    >
      {/* La clave reinicia la animación al cambiar de sección: sin ella React
          reutiliza el nodo y el cambio es un corte seco. */}
      <div key={`${seccion}-${procesoId ?? ''}`} className="anima-seccion">
        {contenido()}
      </div>
      {/* Misma configuración que gestión legal y control interno, para que las
          notificaciones se comporten igual en toda la plataforma. */}
      <Toaster position="bottom-right" richColors closeButton duration={4000} />
    </ModuleLayout>
  );
}
