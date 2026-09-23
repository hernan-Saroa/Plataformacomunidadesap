import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

import { PERMISOS_KEY } from './permisos.decorator';
import { PUEDE_KEY } from './puede.guard';

/**
 * Ningún endpoint del módulo queda con los permisos viejos ni sin decidir.
 *
 * Los `puede-etapas-*.spec.ts` fijan qué exige cada endpoint conocido; este
 * recorre todos los controladores para que uno nuevo no pueda entrar con
 * `@Permisos('contratacion.actividad.edit')` —que la 083 retira— ni sin
 * protección por olvido.
 */

/** Los permisos que la 083 conserva con su código: no son de ninguna etapa. */
const TRANSVERSALES = [
  'contratacion.config.manage',
  'contratacion.reporte.view',
  'contratacion.plazo.terminar',
];

/**
 * Los endpoints sin decorador de autorización, cada uno con su porqué. Añadir
 * uno aquí es una decisión: el JWT global sigue exigiendo sesión.
 */
const SIN_DECORADOR: Record<string, string> = {
  // Los decide el service con el alcance: quien decide es el abogado repartido
  // y con `aprobar` en ese punto (quienDecide), o quien tomó el proceso.
  'CausalContratacionController.elegir': 'quienDecide · aprobar 3.6',
  'ComiteContratacionController.registrar': 'quienDecide · aprobar 3.7',
  'ComiteContratacionController.noVa': 'quienDecide · aprobar 3.7',
  'ModalidadProcesoController.decidir': 'quienDecide · aprobar 3.5',
  'ParticipacionController.asignar': 'quien tomó el proceso o proceso.assign',
  'ParticipacionController.reasignar': 'quien tomó el proceso o proceso.assign',
  'ParticipacionController.quitar': 'quien tomó el proceso o proceso.assign',
  // Los aprobadores los nombra la regla EXIGE_APROBACION, que admite personas
  // concretas: un guard por alcance dejaría fuera a quien la regla nombra.
  'AprobacionController.aprobar': 'la regla EXIGE_APROBACION del punto',
  'AprobacionController.devolver': 'la regla EXIGE_APROBACION del punto',
  // La consulta del estudio previo y del proceso filtra por participación en
  // el service. Protegerla por etapa quedó pendiente de decisión (EFDS, 083).
  'EstudioPrevioController.listar': 'participación · pendiente de decidir',
  'EstudioPrevioController.obtenerProceso': 'participación · pendiente de decidir',
  'EstudioPrevioController.obtener': 'participación · pendiente de decidir',
  'EstudioPrevioController.revisiones': 'participación · pendiente de decidir',
  'EstudioPrevioController.expediente': 'participación · pendiente de decidir',
  'EstudioPrevioController.listaChequeo': 'participación · pendiente de decidir',
  // Infraestructura y lo que cada quien pregunta de sí mismo.
  'AlcanceController.mio': 'el alcance de quien pregunta',
  'FilesController.descargar': 'descarga por nombre firmado',
  'HiringController.getStatus': 'estado del servicio',
  'HealthController.checkHealth': 'estado del servicio',
  'HealthController.getHome': 'estado del servicio',
};

function controladores(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return controladores(ruta);
    return nombre.endsWith('.controller.ts') ? [ruta] : [];
  });
}

function endpoints() {
  const lista: { nombre: string; puede: unknown; permisos: string[] | undefined }[] = [];
  for (const archivo of controladores(join(__dirname, '..'))) {
    for (const exportado of Object.values<any>(require(archivo))) {
      if (typeof exportado !== 'function') continue;
      if (Reflect.getMetadata(PATH_METADATA, exportado) === undefined) continue;
      for (const metodo of Object.getOwnPropertyNames(exportado.prototype)) {
        const handler = exportado.prototype[metodo];
        if (metodo === 'constructor' || Reflect.getMetadata(METHOD_METADATA, handler) === undefined) {
          continue;
        }
        lista.push({
          nombre: `${exportado.name}.${metodo}`,
          puede: Reflect.getMetadata(PUEDE_KEY, handler),
          permisos: Reflect.getMetadata(PERMISOS_KEY, handler),
        });
      }
    }
  }
  return lista;
}

describe('la autorización de todo el módulo', () => {
  const todos = endpoints();

  it('encuentra los endpoints', () => {
    // Si el recorrido no encontrara nada, las demás pruebas pasarían vacías.
    expect(todos.length).toBeGreaterThan(200);
  });

  it('solo quedan @Permisos transversales', () => {
    const viejos = todos
      .flatMap((e) => (e.permisos ?? []).map((p) => `${e.nombre} → ${p}`))
      .filter((fila) => !TRANSVERSALES.some((t) => fila.endsWith(t)));
    expect(viejos).toEqual([]);
  });

  it('todo endpoint sin decorador está en la lista, con su porqué', () => {
    const sinDecorador = todos
      .filter((e) => !e.puede && !e.permisos?.length)
      .map((e) => e.nombre)
      .filter((nombre) => !(nombre in SIN_DECORADOR));
    expect(sinDecorador).toEqual([]);
  });

  it('y la lista no guarda endpoints que ya no existen o ya se protegieron', () => {
    const vigentes = new Set(todos.filter((e) => !e.puede && !e.permisos?.length).map((e) => e.nombre));
    const sobran = Object.keys(SIN_DECORADOR).filter((nombre) => !vigentes.has(nombre));
    expect(sobran).toEqual([]);
  });
});
