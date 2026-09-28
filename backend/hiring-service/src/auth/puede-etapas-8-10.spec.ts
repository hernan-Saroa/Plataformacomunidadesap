import { PUEDE_KEY } from './puede.guard';

import { ActaInicioController } from '../modules/acta-inicio/acta-inicio.controller';
import { ArchivoExpedienteController } from '../modules/archivo-expediente/archivo-expediente.controller';
import { CierreDefinitivoController } from '../modules/cierre-definitivo/cierre-definitivo.controller';
import { CierreFinancieroController } from '../modules/cierre-financiero/cierre-financiero.controller';
import { ContratosController } from '../modules/contratos/contratos.controller';
import { AuditoriaController } from '../modules/documentos/auditoria.controller';
import { IncumplimientoController } from '../modules/incumplimiento/incumplimiento.controller';
import { SancionatorioController } from '../modules/incumplimiento/sancionatorio.controller';
import { InformeFinalController } from '../modules/informe-final/informe-final.controller';
import { LegalizacionController } from '../modules/legalizacion/legalizacion.controller';
import { LiquidacionController } from '../modules/liquidacion/liquidacion.controller';
import { ModificacionesController } from '../modules/modificaciones/modificaciones.controller';
import { PagosController } from '../modules/pagos/pagos.controller';
import { PublicacionContratoController } from '../modules/publicacion-contrato/publicacion-contrato.controller';
import { RegistroPresupuestalController } from '../modules/registro-presupuestal/registro-presupuestal.controller';
import { SeguimientoController } from '../modules/seguimiento/seguimiento.controller';
import { SupervisionController } from '../modules/supervision/supervision.controller';

/**
 * Qué exige cada endpoint de las etapas 8 a 10 y del incumplimiento
 * (subtarea 4 de la 083).
 *
 * Aquí están los puntos con tres actores en fila, que son la razón de que
 * aprobar y decidir sean acciones distintas: en la 9.4 radica el gestor, avala
 * el supervisor y paga la Financiera; en la 9.5 solicita el gestor, da el
 * respaldo la Financiera y concede el Ordenador.
 */
const ESPERADO: [string, any, string, unknown, unknown][] = [
  // Etapa 8 · el contrato. Firmar lo usan dos actores: el gestor registra la
  // firma del contratista (editar) y el Ordenador la de la entidad (decidir).
  ['contrato', ContratosController, 'estado', 'ver', '8.1'],
  ['contrato', ContratosController, 'generar', 'editar', '8.1'],
  ['contrato', ContratosController, 'aceptar', 'editar', '8.1'],
  ['contrato', ContratosController, 'firmar', ['editar', 'decidir'], '8.1'],
  ['contrato', ContratosController, 'rechazar', 'editar', '8.1'],
  ['supervisión', SupervisionController, 'estado', 'ver', '8.2'],
  ['supervisión', SupervisionController, 'designar', 'decidir', '8.2'],
  ['supervisión', SupervisionController, 'relevar', 'decidir', '8.2'],
  ['supervisión', SupervisionController, 'registrarAviso', 'decidir', '8.2'],
  ['supervisión', SupervisionController, 'reasignar', 'decidir', '9.3'],
  ['RP', RegistroPresupuestalController, 'estado', 'ver', '8.3'],
  ['RP', RegistroPresupuestalController, 'solicitar', 'editar', '8.3'],
  ['RP', RegistroPresupuestalController, 'verificar', 'decidir', '8.3'],
  ['RP', RegistroPresupuestalController, 'expedir', 'decidir', '8.3'],
  ['RP', RegistroPresupuestalController, 'rechazar', 'decidir', '8.3'],
  ['legalización', LegalizacionController, 'estado', 'ver', '8.4'],
  ['legalización', LegalizacionController, 'cargarGarantia', 'editar', '8.4'],
  ['legalización', LegalizacionController, 'aprobar', 'aprobar', '8.4'],
  ['legalización', LegalizacionController, 'rechazar', 'aprobar', '8.4'],
  ['legalización', LegalizacionController, 'registrarArl', 'editar', '8.5'],
  ['publicación del contrato', PublicacionContratoController, 'estado', 'ver', '8.8'],
  ['publicación del contrato', PublicacionContratoController, 'publicar', 'editar', '8.8'],

  // Etapa 9 · ejecución.
  ['acta de inicio', ActaInicioController, 'estado', 'ver', '9.1'],
  ['acta de inicio', ActaInicioController, 'suscribir', 'editar', '9.1'],
  ['seguimiento', SeguimientoController, 'estado', 'ver', '9.2'],
  ['seguimiento', SeguimientoController, 'cargar', 'editar', '9.2'],
  ['pagos', PagosController, 'estado', 'ver', '9.4'],
  ['pagos', PagosController, 'radicar', 'editar', '9.4'],
  ['pagos', PagosController, 'cargarSoporte', 'editar', '9.4'],
  ['pagos', PagosController, 'anular', 'editar', '9.4'],
  ['pagos', PagosController, 'avalar', 'aprobar', '9.4'],
  ['pagos', PagosController, 'devolver', 'aprobar', '9.4'],
  ['pagos', PagosController, 'tramitar', 'decidir', '9.4'],
  ['modificaciones', ModificacionesController, 'estado', 'ver', '9.5'],
  ['modificaciones', ModificacionesController, 'solicitarAdicion', 'editar', '9.5'],
  ['modificaciones', ModificacionesController, 'solicitarProrroga', 'editar', '9.5'],
  ['modificaciones', ModificacionesController, 'solicitarCesion', 'editar', '9.5'],
  ['modificaciones', ModificacionesController, 'solicitarAclaratorio', 'editar', '9.5'],
  ['modificaciones', ModificacionesController, 'solicitarSuspension', 'editar', '9.5'],
  ['modificaciones', ModificacionesController, 'solicitarReanudacion', 'editar', '9.5'],
  ['modificaciones', ModificacionesController, 'solicitarTerminacion', 'editar', '9.5'],
  ['modificaciones', ModificacionesController, 'solicitarRespaldo', 'aprobar', '9.5'],
  ['modificaciones', ModificacionesController, 'verificarRespaldo', 'aprobar', '9.5'],
  ['modificaciones', ModificacionesController, 'expedirRespaldo', 'aprobar', '9.5'],
  ['modificaciones', ModificacionesController, 'rechazarRespaldo', 'aprobar', '9.5'],
  // Antes exigían `modificacion.solicitar`: quien pedía la prórroga se la
  // concedía. Conceder, negar y revocar son de quien decide la 9.5.
  ['modificaciones', ModificacionesController, 'aprobar', 'decidir', '9.5'],
  ['modificaciones', ModificacionesController, 'rechazar', 'decidir', '9.5'],
  ['modificaciones', ModificacionesController, 'revocar', 'decidir', '9.5'],
  ['modificaciones', ModificacionesController, 'publicar', 'editar', '9.5'],

  // Etapa 10 · cierre. En la 10.3 la Financiera cierra lo financiero (editar)
  // y la Dirección declara cerrado el contrato (decidir).
  ['informe final', InformeFinalController, 'estado', 'ver', '10.1'],
  ['informe final', InformeFinalController, 'elaborar', 'editar', '10.1'],
  ['informe final', InformeFinalController, 'agregarEntregable', 'editar', '10.1'],
  ['informe final', InformeFinalController, 'anular', 'editar', '10.1'],
  ['liquidación', LiquidacionController, 'estado', 'ver', '10.2'],
  ['liquidación', LiquidacionController, 'liquidar', 'editar', '10.2'],
  ['liquidación', LiquidacionController, 'anular', 'editar', '10.2'],
  ['cierre financiero', CierreFinancieroController, 'estado', 'ver', '10.3'],
  ['cierre financiero', CierreFinancieroController, 'cerrar', 'editar', '10.3'],
  ['cierre financiero', CierreFinancieroController, 'revertir', 'editar', '10.3'],
  ['cierre definitivo', CierreDefinitivoController, 'estado', 'ver', '10.3'],
  ['cierre definitivo', CierreDefinitivoController, 'cerrar', 'decidir', '10.3'],
  ['cierre definitivo', CierreDefinitivoController, 'revertir', 'decidir', '10.3'],
  ['archivo', ArchivoExpedienteController, 'estado', 'ver', '10.4'],
  ['archivo', ArchivoExpedienteController, 'publicar', 'editar', '10.4'],
  ['archivo', ArchivoExpedienteController, 'archivar', 'decidir', '10.4'],
  ['archivo', ArchivoExpedienteController, 'reabrir', 'decidir', '10.4'],

  // Incumplimiento: reportar (INC.1) no es instruir ni decidir (INC.2).
  ['incumplimiento', IncumplimientoController, 'estado', 'ver', 'INC.1'],
  ['incumplimiento', IncumplimientoController, 'reportar', 'editar', 'INC.1'],
  ['sancionatorio', SancionatorioController, 'abrir', 'editar', 'INC.2'],
  ['sancionatorio', SancionatorioController, 'citar', 'editar', 'INC.2'],
  ['sancionatorio', SancionatorioController, 'celebrar', 'editar', 'INC.2'],
  ['sancionatorio', SancionatorioController, 'suspender', 'editar', 'INC.2'],
  ['sancionatorio', SancionatorioController, 'cancelar', 'editar', 'INC.2'],
  ['sancionatorio', SancionatorioController, 'notificar', 'editar', 'INC.2'],
  ['sancionatorio', SancionatorioController, 'decidir', 'decidir', 'INC.2'],
  ['sancionatorio', SancionatorioController, 'revocar', 'decidir', 'INC.2'],

  // La auditoría es ver todo el módulo.
  ['auditoría', AuditoriaController, 'consultar', 'ver', 'TODO'],
];

describe('@Puede en las etapas 8 a 10 y el incumplimiento', () => {
  it.each(ESPERADO)('%s · %s.%s exige %p en %p', (...fila: any[]) => {
    const [, Controlador, metodo, accion, destino] = fila;
    const exigencia = Reflect.getMetadata(PUEDE_KEY, Controlador.prototype[metodo]);
    expect(exigencia).toEqual({ accion, destino, opciones: undefined });
  });
});
