/**
 * Duración de un término en días, derivada de sus dos fechas.
 *
 * Se usa tanto al crear el término (`TerminosController.createManual`) como al editarlo
 * (`TerminosService.update`), para que la duración guardada no dependa de por dónde entró
 * el dato: un informe del 1 al 11 de enero dura 10 días, se haya creado o corregido.
 *
 * El redondeo es hacia abajo a propósito. Las fechas que llegan del formulario se anclan al
 * huso de Bogotá con la fecha base al INICIO del día y el vencimiento al FINAL
 * (`parseFechaBogota`), así que la diferencia bruta entre ambas es siempre "N días y 23:59:59".
 * Redondear hacia arriba contaba un día de más (del 1 al 11 daba 11), que es el número que
 * después alimenta la barra de progreso del plazo en el detalle del informe.
 */
export function calcularDiasTermino(fechaBase: Date | string, fechaVencimiento: Date | string): number {
    const base = fechaBase instanceof Date ? fechaBase : new Date(fechaBase);
    const vencimiento = fechaVencimiento instanceof Date ? fechaVencimiento : new Date(fechaVencimiento);
    if (Number.isNaN(base.getTime()) || Number.isNaN(vencimiento.getTime())) return 0;

    const MS_POR_DIA = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.floor(Math.abs(vencimiento.getTime() - base.getTime()) / MS_POR_DIA));
}
