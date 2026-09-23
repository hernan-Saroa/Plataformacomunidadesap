import { PERMISOS_KEY } from './permisos.decorator';
import { PUEDE_KEY } from './puede.guard';

import { ActoAdjudicacionController } from '../modules/adjudicacion/acto-adjudicacion.controller';
import { AudienciaController } from '../modules/adjudicacion/audiencia.controller';
import { DeclaratoriaDesiertaController } from '../modules/adjudicacion/declaratoria-desierta.controller';
import { InformeDefinitivoController } from '../modules/adjudicacion/informe-definitivo.controller';
import { AdendasController } from '../modules/adendas/adendas.controller';
import { AperturaProcesoController } from '../modules/apertura/apertura-proceso.controller';
import { ComiteController } from '../modules/comite/comite.controller';
import { DocumentosController } from '../modules/documentos/documentos.controller';
import { EvaluacionController } from '../modules/evaluacion/evaluacion.controller';
import { CondicionesMipymeController } from '../modules/mipyme/condiciones.controller';
import { MipymeController } from '../modules/mipyme/mipyme.controller';
import { ObservacionesController } from '../modules/observaciones/observaciones.controller';
import { OfertasController } from '../modules/ofertas/ofertas.controller';
import { PlazosController } from '../modules/publicacion/plazos.controller';
import { PublicacionController } from '../modules/publicacion/publicacion.controller';
import { RiesgosController } from '../modules/riesgos/riesgos.controller';
import { SubsanacionesController } from '../modules/traslado/subsanaciones.controller';
import { TrasladoController } from '../modules/traslado/traslado.controller';

/**
 * Qué exige cada endpoint de las etapas 5 a 7 (subtarea 3 de la 083).
 *
 * Igual que el de las etapas 3 y 4: el mapa es la autorización, y se fija
 * endpoint por endpoint para que moverlo sea una decisión visible.
 */
const CONFIGURAR = { oPermiso: 'contratacion.config.manage' };

const ESPERADO: [string, any, string, string, unknown, unknown?][] = [
  // Etapa 5 · elaboración y publicación.
  ['documentos', DocumentosController, 'estado', 'ver', '5.1'],
  ['documentos', DocumentosController, 'cargar', 'editar', '5.1'],
  ['documentos', DocumentosController, 'anular', 'editar', '5.1'],
  ['publicación', PublicacionController, 'estado', 'ver', '5.2'],
  ['publicación', PublicacionController, 'registrar', 'editar', '5.2'],
  ['publicación', PublicacionController, 'anular', 'editar', '5.2'],
  // Datos de referencia: los lee quien trabaja procesos y quien los configura.
  ['plazos', PlazosController, 'vigentes', 'ver', undefined, CONFIGURAR],
  ['observaciones', ObservacionesController, 'listar', 'ver', '5.3'],
  ['observaciones', ObservacionesController, 'registrar', 'editar', '5.3'],
  ['observaciones', ObservacionesController, 'responder', 'editar', '5.3'],
  ['observaciones', ObservacionesController, 'cerrar', 'editar', '5.3'],
  ['MIPYME', MipymeController, 'estado', 'ver', '5.4'],
  ['MIPYME', MipymeController, 'registrarManifestacion', 'editar', '5.4'],
  ['MIPYME', MipymeController, 'decidir', 'editar', '5.4'],
  ['condiciones MIPYME', CondicionesMipymeController, 'vigentes', 'ver', undefined, CONFIGURAR],
  ['riesgos', RiesgosController, 'estado', 'ver', '5.5'],
  ['riesgos', RiesgosController, 'registrar', 'editar', '5.5'],
  ['riesgos', RiesgosController, 'anular', 'editar', '5.5'],
  ['adendas', AdendasController, 'estado', 'ver', '5.6'],
  ['adendas', AdendasController, 'emitir', 'editar', '5.6'],
  ['adendas', AdendasController, 'publicar', 'editar', '5.6'],
  ['adendas', AdendasController, 'anular', 'editar', '5.6'],
  ['apertura', AperturaProcesoController, 'estado', 'ver', '5.7'],
  ['apertura', AperturaProcesoController, 'registrar', 'editar', '5.7'],

  // Etapa 6 · ofertas y evaluación. Designar el comité compromete a la
  // entidad: es decidir, no editar.
  ['ofertas', OfertasController, 'estado', 'ver', '6.1'],
  ['ofertas', OfertasController, 'fijarPlazo', 'editar', '6.1'],
  ['ofertas', OfertasController, 'registrar', 'editar', '6.1'],
  ['ofertas', OfertasController, 'cerrar', 'editar', '6.1'],
  ['ofertas', OfertasController, 'retirar', 'editar', '6.1'],
  ['comité evaluador', ComiteController, 'estado', 'ver', '6.2'],
  ['comité evaluador', ComiteController, 'designar', 'decidir', '6.2'],
  ['comité evaluador', ComiteController, 'revocar', 'decidir', '6.2'],
  ['evaluación', EvaluacionController, 'estado', 'ver', '6.3'],
  ['evaluación', EvaluacionController, 'registrar', 'editar', '6.3'],
  ['evaluación', EvaluacionController, 'rectificar', 'editar', '6.3'],
  ['evaluación', EvaluacionController, 'cargarEvidencia', 'editar', '6.3'],
  ['traslado', TrasladoController, 'estado', 'ver', '6.4'],
  ['traslado', TrasladoController, 'generar', 'editar', '6.4'],
  ['traslado', TrasladoController, 'trasladar', 'editar', '6.4'],
  ['traslado', TrasladoController, 'anular', 'editar', '6.4'],
  ['subsanaciones', SubsanacionesController, 'listar', 'ver', '6.5'],
  ['subsanaciones', SubsanacionesController, 'registrar', 'editar', '6.5'],
  ['subsanaciones', SubsanacionesController, 'responder', 'editar', '6.5'],
  ['subsanaciones', SubsanacionesController, 'cerrar', 'editar', '6.5'],

  // Etapa 7 · adjudicación. El sobre económico es su propio punto (7.2), y
  // adjudicar es del Ordenador; declarar desierto lo proyecta el gestor.
  ['audiencia', AudienciaController, 'estado', 'ver', '7.1'],
  ['audiencia', AudienciaController, 'celebrar', 'editar', '7.1'],
  ['audiencia', AudienciaController, 'cargarPieza', 'editar', '7.1'],
  ['audiencia', AudienciaController, 'abrirSobre', 'editar', '7.2'],
  ['audiencia', AudienciaController, 'anular', 'editar', '7.1'],
  ['informe definitivo', InformeDefinitivoController, 'estado', 'ver', '7.3'],
  ['informe definitivo', InformeDefinitivoController, 'generar', 'editar', '7.3'],
  ['informe definitivo', InformeDefinitivoController, 'publicar', 'editar', '7.3'],
  ['informe definitivo', InformeDefinitivoController, 'anular', 'editar', '7.3'],
  ['acto de adjudicación', ActoAdjudicacionController, 'estado', 'ver', '7.4'],
  ['acto de adjudicación', ActoAdjudicacionController, 'adjudicar', 'decidir', '7.4'],
  ['acto de adjudicación', ActoAdjudicacionController, 'publicar', 'decidir', '7.4'],
  ['acto de adjudicación', ActoAdjudicacionController, 'revocar', 'decidir', '7.4'],
  ['declaratoria de desierto', DeclaratoriaDesiertaController, 'estado', 'ver', '7.4'],
  ['declaratoria de desierto', DeclaratoriaDesiertaController, 'declarar', 'editar', '7.4'],
  ['declaratoria de desierto', DeclaratoriaDesiertaController, 'publicar', 'editar', '7.4'],
  ['declaratoria de desierto', DeclaratoriaDesiertaController, 'revocar', 'editar', '7.4'],
];

/**
 * Los únicos `@Permisos` que pueden quedar en estos controladores: los
 * transversales que la 083 conserva con su código. Configurar no es de ninguna
 * etapa, y terminar un plazo es una llave de pruebas.
 */
const TRANSVERSALES = ['contratacion.config.manage', 'contratacion.plazo.terminar'];

describe('@Puede en las etapas 5 a 7', () => {
  // Parámetros rest y no nombrados: si el callback declara más parámetros que
  // columnas trae la fila, Jest le pasa `done` en el que sobra.
  it.each(ESPERADO)('%s · %s.%s exige %s en %p', (...fila: any[]) => {
    const [, Controlador, metodo, accion, destino, opciones] = fila;
    const exigencia = Reflect.getMetadata(PUEDE_KEY, Controlador.prototype[metodo]);
    expect(exigencia).toEqual({ accion, destino, opciones });
  });

  it('solo quedan @Permisos transversales', () => {
    const controladores = [...new Set(ESPERADO.map(([, c]) => c))];
    for (const Controlador of controladores) {
      for (const metodo of Object.getOwnPropertyNames(Controlador.prototype)) {
        const viejos: string[] = Reflect.getMetadata(PERMISOS_KEY, Controlador.prototype[metodo]) ?? [];
        for (const permiso of viejos) {
          expect([Controlador.name, metodo, TRANSVERSALES.includes(permiso)]).toEqual([
            Controlador.name,
            metodo,
            true,
          ]);
        }
      }
    }
  });
});
