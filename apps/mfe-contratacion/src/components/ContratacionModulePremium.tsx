import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  BellRing,
  Handshake,
  Coins,
  FolderOpen,
  CalendarClock,
  FileSignature,
  ClipboardCheck,
  Landmark,
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
import { VistaBandejaCdp } from './cdp/VistaBandejaCdp';
import { VistaEstadisticas } from './estadisticas/VistaEstadisticas';
import { PERMISOS } from '../auth/permisos';
import { esSoloPresupuesto, useAlcance } from '../auth/alcance';

type Seccion =
  | 'estudios-previos'
  | 'revision'
  | 'alertas'
  | 'bandeja-cdp'
  | 'expedientes'
  | 'estadisticas'
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
/** Las que exigen `config.manage`: escriben parámetros, no trabajan un proceso. */
const SECCIONES_DE_CONFIGURACION: Seccion[] = [
  'umbrales',
  'plazos',
  'mipyme',
  'plantillas',
  'configuracion',
];

/**
 * Por dónde se entra al módulo.
 *
 * «Procesos» para casi todo el mundo, porque casi todo el mundo trabaja un
 * expediente. La excepción es quien solo mueve presupuesto: la Dirección
 * Financiera no radica ni diligencia nada, así que una lista de procesos no le
 * dice qué hacer hoy —su trabajo es la cola de solicitudes de CDP—. Entrar por
 * ahí le ahorra un clic que iba a dar siempre.
 *
 * Se decide por lo que *no* tiene, y no por el rol: alguien que gestione
 * presupuesto y además diligencie procesos sigue entrando por «Procesos»,
 * porque entonces la lista sí es su trabajo. La regla vive en `esSoloPresupuesto`,
 * que responde que no mientras el alcance no ha llegado: ante la duda se entra
 * por «Procesos», como siempre.
 */
function seccionDeEntrada(): Seccion {
  return esSoloPresupuesto() ? 'bandeja-cdp' : 'estudios-previos';
}

export default function ContratacionModulePremium() {
  // Solo el valor inicial: a partir de ahí manda el menú, y recalcularlo en
  // cada render devolvería al usuario a la bandeja cada vez que algo refresca.
  const [seccion, setSeccionElegida] = useState<Seccion>(seccionDeEntrada);
  const { cargado, puede, tiene } = useAlcance();

  /**
   * La sección de entrada se decide otra vez cuando llega el alcance.
   *
   * Al montar todavía no se sabe qué puede hacer quien entra —el alcance viene
   * del servicio— y sin esto la Financiera nunca aterrizaría en su bandeja. Solo
   * si no ha navegado: sacarlo de donde ya eligió ir sería peor que el clic.
   */
  const navego = useRef(false);
  const setSeccion = (nueva: Seccion) => {
    navego.current = true;
    setSeccionElegida(nueva);
  };
  useEffect(() => {
    if (cargado && !navego.current) setSeccionElegida(seccionDeEntrada());
  }, [cargado]);
  const [procesoId, setProcesoId] = useState<string | null>(null);
  const [actividad, setActividad] = useState<string | null>(null);

  const puedeConfigurar = tiene(PERMISOS.configurar);
  /**
   * Quien mueve el presupuesto de la entidad: la Dirección Financiera.
   *
   * Su trabajo en el módulo no es un proceso sino una cola —las solicitudes de
   * CDP que esperan—, así que tiene sección propia. Nadie más la ve: para el
   * resto no hay nada que recoger en ella.
   */
  const gestionaPresupuesto = puede('editar', '4.2');
  const puedeVerReportes = tiene(PERMISOS.reporteVer);
  /*
   * El expediente lo consulta quien ve alguna parte del proceso: el servicio
   * le enseña de cada expediente lo que su alcance cubre.
   */
  const puedeVerExpedientes = puede('ver');

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
        /* Alertas estaba dentro de Configuración, que exige `config.manage`:
           el gestor tenía «ver alertas de vencimiento» y aun así nunca veía la
           entrada, aunque ahí es donde le llegan sus aprobaciones pendientes.
           Va con el trabajo diario y se rige por su propio permiso. */
        ...(!puede('ver')
          ? []
          : [
              {
                id: 'alertas' as Seccion,
                label: 'Alertas',
                subtitle: 'Vencimientos y aprobaciones',
                icon: <BellRing className="w-5 h-5" />,
                color: '#DC2626',
              },
            ]),
        /* La cola de la Financiera, junto a Alertas y por lo mismo: las dos
           dicen qué reclama atención hoy. Aparte de «Procesos» porque no se
           navega igual —no se busca un expediente, se recoge lo que llegó—, y
           porque a quien solo gestiona presupuesto la lista de procesos no le
           dice qué hacer. */
        ...(!gestionaPresupuesto
          ? []
          : [
              {
                id: 'bandeja-cdp' as Seccion,
                label: 'Solicitudes de CDP',
                subtitle: 'Bandeja de la Financiera',
                icon: <Landmark className="w-5 h-5" />,
                // El mismo cian con el que las alertas ya marcan el CDP y el RP.
                color: '#0891B2',
              },
            ]),
        ...(!puedeVerExpedientes
          ? []
          : [
              {
                // Tab propio y no un botón dentro del detalle: el expediente se
                // consulta sin estar trabajando un proceso —es lo que abre un
                // organismo de control—, y llegar a él pasando por lista y
                // detalle lo escondía. Mismo sitio y mismo cian que en control
                // interno y gestión legal.
                id: 'expedientes' as Seccion,
                label: 'Expedientes',
                subtitle: 'Consulta y auditoría',
                icon: <FolderOpen className="w-5 h-5" />,
                color: '#0891B2',
              },
            ]),
        // Con Expedientes y no en Configuración: las dos se consultan sin estar
        // trabajando un proceso, y los indicadores no son un parámetro del
        // flujo sino su resultado. Quien no pueda generarlos no ve el tab.
        ...(!puedeVerReportes
          ? []
          : [
              {
                id: 'estadisticas' as Seccion,
                label: 'Estadísticas',
                subtitle: 'Indicadores de gestión',
                icon: <BarChart3 className="w-5 h-5" />,
                color: '#0E7490',
              },
            ]),
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
    // Se comprueban aunque el menú ya las esconda: la sección sobrevive en el
    // estado, y quien tenía la pantalla abierta cuando le retiraron el permiso
    // seguiría dentro de ella.
    if (seccion === 'alertas' && !puede('ver')) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-12 text-center">
          <p className="text-[13px] font-bold text-slate-700 m-0">No tienes acceso a las alertas</p>
          <p className="text-[11.5px] text-slate-500 m-0 mt-1">
            Las consultan quienes trabajan los procesos y quienes los aprueban.
          </p>
        </div>
      );
    }

    if (seccion === 'expedientes' && !puedeVerExpedientes) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-12 text-center">
          <p className="text-[13px] font-bold text-slate-700 m-0">
            No tienes acceso al expediente
          </p>
          <p className="text-[11.5px] text-slate-500 m-0 mt-1">
            Lo consultan la Dirección de Contratación, el Archivo de Gestión y los organismos de
            control.
          </p>
        </div>
      );
    }

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

    // Se comprueba aunque el menú ya lo esconda, por lo mismo que arriba: la
    // sección sobrevive en el estado si le retiran el permiso con la pantalla
    // abierta.
    if (seccion === 'estadisticas') {
      return puedeVerReportes ? (
        // Una fila del listado lleva a su proceso: del «hay tres vencidos» se
        // pasa a atenderlos sin buscarlos.
        <VistaEstadisticas
          onAbrir={(id) => {
            setSeccion('estudios-previos');
            setProcesoId(id);
            setActividad(null);
          }}
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-12 text-center">
          <p className="text-[13px] font-bold text-slate-700 m-0">
            No tienes acceso a los reportes de gestión
          </p>
          <p className="text-[11.5px] text-slate-500 m-0 mt-1">
            Los consultan la Dirección de Contratación, el administrador del módulo y el
            apoyo a la supervisión.
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
    /* Se comprueba aunque el menú ya la esconda, por lo mismo que las demás:
       la sección sobrevive en el estado si le retiran el permiso con la
       pantalla abierta. */
    if (seccion === 'bandeja-cdp') {
      return gestionaPresupuesto ? (
        // Lleva al proceso y a la actividad que toca atender —verificar o
        // expedir—: quien recoge una solicitud quiere resolverla, no buscarla.
        <VistaBandejaCdp
          onAbrir={(id, numeral) => {
            setSeccion('estudios-previos');
            setProcesoId(id);
            setActividad(numeral ?? null);
          }}
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-12 text-center">
          <p className="text-[13px] font-bold text-slate-700 m-0">
            No tienes acceso a las solicitudes de CDP
          </p>
          <p className="text-[11.5px] text-slate-500 m-0 mt-1">
            Las atiende la Dirección Financiera, que es quien compromete el presupuesto de la
            entidad.
          </p>
        </div>
      );
    }

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
          /**
           * Sin forzar actividad: la abre el detalle (EFDS-1183).
           *
           * Antes entraba siempre por el estudio previo, que era cierto cuando
           * la etapa 3 era una sola pantalla. Desde que el proceso cambia de
           * manos, el punto depende de quién entra: al área le toca la 3.1, a
           * la Dirección recibirlo en la 3.3, y al abogado decidir. Forzar la
           * 3.1 le ponía delante a media Dirección un formulario bloqueado.
           */
          setActividad(null);
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
