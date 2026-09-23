import { PERMISOS_KEY } from './permisos.decorator';
import { PUEDE_KEY } from './puede.guard';

import { AprobacionController } from '../modules/aprobacion/aprobacion.controller';
import { CausalContratacionController } from '../modules/causal-contratacion/causal-contratacion.controller';
import { AperturaController } from '../modules/cdp/apertura.controller';
import { BandejaCdpController, CdpController } from '../modules/cdp/cdp.controller';
import { ComiteContratacionController } from '../modules/comite-contratacion/comite-contratacion.controller';
import { DocumentosActividadController } from '../modules/documentos-actividad/documentos-actividad.controller';
import { EstudioPrevioController } from '../modules/estudio-previo/estudio-previo.controller';
import { ModalidadProcesoController } from '../modules/modalidad-proceso/modalidad-proceso.controller';
import {
  CandidatosController,
  ParticipacionController,
} from '../modules/participacion/participacion.controller';
import { RegistroActividadController } from '../modules/registro-actividad/registro-actividad.controller';

/**
 * Qué exige cada endpoint de las etapas 3 y 4 (subtarea 2 de la 083).
 *
 * El mapa es la autorización: un numeral mal puesto aquí le da a un rol lo que
 * no tiene o se lo quita a quien sí. Se fija endpoint por endpoint para que
 * cambiarlo sea una decisión que se ve en la revisión y no un efecto de mover
 * un decorador.
 */
const RUTA = { param: 'numeral' };

const ESPERADO: [string, any, string, string, unknown][] = [
  // Etapa 3 · estudio previo. La revisión es la 3.4: la decide el abogado,
  // no quien diligenció la 3.1.
  ['estudio previo', EstudioPrevioController, 'crearProceso', 'editar', '3.1'],
  ['estudio previo', EstudioPrevioController, 'guardar', 'editar', '3.1'],
  ['estudio previo', EstudioPrevioController, 'enviar', 'editar', '3.1'],
  ['estudio previo', EstudioPrevioController, 'aprobar', 'aprobar', '3.4'],
  ['estudio previo', EstudioPrevioController, 'devolver', 'aprobar', '3.4'],
  ['estudio previo', EstudioPrevioController, 'negar', 'aprobar', '3.4'],
  ['estudio previo', EstudioPrevioController, 'adjuntar', 'editar', '3.1'],
  ['estudio previo', EstudioPrevioController, 'retirarAdjunto', 'editar', '3.1'],
  ['estudio previo', EstudioPrevioController, 'reemplazarAdjunto', 'editar', '3.1'],
  ['estudio previo', EstudioPrevioController, 'radicado', 'ver', '3.1'],
  ['estudio previo', EstudioPrevioController, 'anotarRadicado', 'editar', '3.1'],

  ['participación', ParticipacionController, 'estado', 'ver', '3.3'],
  ['participación', ParticipacionController, 'tomar', 'editar', '3.3'],
  // La Financiera toma la solicitud con editar 4.2 y no 4.1: la 4.1 la
  // edita el gestor al solicitar, y con ella podría quedarse con la solicitud.
  ['participación', ParticipacionController, 'tomarFinanciera', 'editar', '4.2'],
  ['candidatos', CandidatosController, 'abogados', 'ver', '3.4'],
  ['candidatos', CandidatosController, 'financieros', 'ver', '4.1'],

  ['modalidad', ModalidadProcesoController, 'estado', 'ver', '3.5'],
  ['modalidad', ModalidadProcesoController, 'proponer', 'editar', '3.5'],
  ['causal', CausalContratacionController, 'estado', 'ver', '3.6'],
  ['comité de contratación', ComiteContratacionController, 'estado', 'ver', '3.7'],

  // Etapa 4 · CDP. Solicitar es del gestor; verificar, expedir y rechazar,
  // de la Financiera; adjuntar al expediente, de los dos.
  ['CDP', CdpController, 'estado', 'ver', '4.1'],
  ['CDP', CdpController, 'solicitar', 'editar', '4.1'],
  ['CDP', CdpController, 'verificar', 'editar', '4.2'],
  ['CDP', CdpController, 'rechazar', 'editar', '4.2'],
  ['CDP', CdpController, 'expedir', 'editar', '4.3'],
  ['CDP', CdpController, 'adjuntar', 'editar', '4.4'],
  ['bandeja de CDP', BandejaCdpController, 'bandeja', 'editar', '4.2'],

  ['riel', AperturaController, 'actividades', 'ver', undefined],
  ['riel', AperturaController, 'iniciarDocumentos', 'editar', '5.1'],

  // Los genéricos: el punto viaja en la ruta.
  ['aprobación', AprobacionController, 'aprobadores', 'ver', RUTA],
  ['aprobación', AprobacionController, 'enviar', 'editar', RUTA],
  ['aprobación', AprobacionController, 'retirar', 'editar', RUTA],
  ['documentos de actividad', DocumentosActividadController, 'estado', 'ver', RUTA],
  ['documentos de actividad', DocumentosActividadController, 'cargar', 'editar', RUTA],
  ['documentos de actividad', DocumentosActividadController, 'anular', 'editar', RUTA],
  ['documentos de actividad', DocumentosActividadController, 'retirar', 'editar', RUTA],
  ['registro de actividad', RegistroActividadController, 'estado', 'ver', RUTA],
  ['registro de actividad', RegistroActividadController, 'registrar', 'editar', RUTA],
  ['registro de actividad', RegistroActividadController, 'anular', 'editar', RUTA],
];

describe('@Puede en las etapas 3 y 4', () => {
  it.each(ESPERADO)('%s · %s.%s exige %s en %p', (_d, Controlador, metodo, accion, destino) => {
    const exigencia = Reflect.getMetadata(PUEDE_KEY, Controlador.prototype[metodo]);
    expect(exigencia).toEqual(expect.objectContaining({ accion, destino }));
  });

  it('ningún endpoint de estos controladores sigue con @Permisos', () => {
    const controladores = [...new Set(ESPERADO.map(([, c]) => c))];
    for (const Controlador of controladores) {
      for (const metodo of Object.getOwnPropertyNames(Controlador.prototype)) {
        const viejo = Reflect.getMetadata(PERMISOS_KEY, Controlador.prototype[metodo]);
        expect([Controlador.name, metodo, viejo]).toEqual([Controlador.name, metodo, undefined]);
      }
    }
  });
});
