/**
 * Los perfiles por defecto (EFDS-1183).
 *
 * Catorce roles confunden a quien configura, y la Dirección los resumió en
 * perfiles. Desde la 137 los encarnan los roles que Juan armó en la pantalla
 * de roles, que son los que trae el módulo. Partir de un perfil copia el
 * alcance vigente de ese rol, así que si la Dirección cambia lo que hace el
 * abogado, el perfil cambia con él sin tocar el código.
 *
 * `queHace` es la frase corta (botones y títulos); `funciones` es la guía que
 * se lee en «Roles y personas». Lo que de verdad puede hacer cada rol lo dice
 * la matriz de permisos, no este texto.
 */
export interface PerfilPorDefecto {
  nombre: string;
  rol: string;
  queHace: string;
  funciones: string[];
}

export const PERFILES: PerfilPorDefecto[] = [
  {
    nombre: 'Área solicitante',
    rol: 'AREA_RADICADORA',
    queHace: 'Diligencia el estudio previo (3.1) y el CDP (4.2) y los corrige si se los devuelven; después solo consulta.',
    funciones: [
      'Crea el proceso desde su línea del Plan Anual de Adquisiciones y diligencia el estudio previo (3.1).',
      'Adjunta los documentos que pide la lista de chequeo y carga el CDP cuando la modalidad lo exige (3.1 o 4.2).',
      'Corrige y reenvía lo que le devuelvan en la revisión.',
      'Después de radicar, consulta y comenta el avance de sus procesos.',
    ],
  },
  {
    nombre: 'Contratación',
    rol: 'SECRETARIO_DE_CONTRATACION',
    queHace: 'Ve todos los procesos, los recibe en la 3.3 y asigna los puestos.',
    funciones: [
      'Ve todos los procesos del módulo.',
      'Recibe los procesos radicados en la bandeja y los toma en la 3.3.',
      'Asigna y releva los puestos del proceso: abogado estructurador, abogado revisor y demás.',
    ],
  },
  {
    nombre: 'Abogado estructurador',
    rol: 'ABOGADO_ESTRUCTURADOR',
    queHace: 'Lleva el caso: aprueba el estudio previo y hace las etapas 5 a 8 y lo jurídico de la 9 y la 10.',
    funciones: [
      'Lleva el proceso una vez se le asigna.',
      'Aprueba el estudio previo y el CDP en su escalón de la cadena.',
      'Diligencia las etapas 5 a 8: pliegos, cronograma, apertura, evaluación, adjudicación y contrato.',
      'Atiende lo jurídico de la ejecución (etapa 9) y de la liquidación (etapa 10).',
    ],
  },
  {
    nombre: 'Abogado revisor',
    rol: 'ABOGADO_REVISOR',
    queHace: 'Aprueba el estudio previo, el CDP, el proyecto de pliego y el pliego definitivo.',
    funciones: [
      'Revisa y aprueba el estudio previo y el CDP.',
      'Revisa y aprueba el proyecto de pliego y el pliego definitivo.',
      'Puede devolver lo que revisa para que se corrija.',
    ],
  },
  {
    nombre: 'Experto en sector y mercado',
    rol: 'EXPERTO_EN_ANALISIS_DEL_SECTOR_Y_DEL_MERCADO',
    queHace: 'Aprueba el estudio previo y el CDP en lo del análisis del sector y del mercado.',
    funciones: [
      'Revisa el análisis del sector y del mercado del estudio previo.',
      'Aprueba el estudio previo y el CDP en su escalón de la cadena.',
    ],
  },
  {
    nombre: 'Archivo y supervisión',
    rol: 'GESTOR_DE_ARCHIVO_Y_SUPERVISION',
    queHace:
      'Registra la ejecución por el supervisor (reunión de inicio, soportes, presunto incumplimiento, pagos, informe final) y archiva el expediente.',
    funciones: [
      'Registra en nombre del supervisor, que no entra a la aplicación: reunión de inicio, soportes, presunto incumplimiento, pagos e informe final.',
      'Organiza y archiva el expediente del proceso.',
    ],
  },
  {
    // Sesión de QA del 04/11 (138): quien apoya al abogado en la reasignación.
    nombre: 'Estructurador de apoyo',
    rol: 'ESTRUCTURADOR_DE_APOYO',
    queHace: 'Registra la reasignación de supervisor (9.3) y la notifica por correo; del resto, solo consulta.',
    funciones: [
      'Registra la reasignación de supervisor (9.3) y la notifica por correo.',
      'En el resto del proceso, solo consulta.',
    ],
  },
  {
    nombre: 'Dirección',
    rol: 'DIRECTORA_DE_CONTRATACION',
    queHace: 'Lo puede todo en el módulo: aprueba al final de las cadenas, reparte y configura.',
    funciones: [
      'Tiene todos los permisos del módulo.',
      'Aprueba al final de las cadenas de aprobación.',
      'Reparte procesos y configura el módulo: actividades, flujo, cadenas, permisos y PAA.',
    ],
  },
  {
    nombre: 'Consulta',
    rol: 'ENTE_DE_CONTROL',
    queHace: 'Consulta todo el proceso sin modificar nada.',
    funciones: ['Consulta cualquier proceso, sus documentos y su historial.', 'No puede modificar nada.'],
  },
];
