import { Controller, Get, Param } from '@nestjs/common';

import { DocentesContratoService } from './docentes-contrato.service';

/**
 * Contrato PROG↔PTA v1 — docentes.
 *
 * ⚠️ RN-09: el RUND es de SOLO LECTURA para las decanaturas. Este controlador
 * declara UNICAMENTE métodos GET, y esa es la garantía: si no hay ruta de
 * escritura, no hay nada que vigilar. Un test lo verifica estructuralmente, del
 * mismo modo que en EFDS-1650 para el catálogo del SNIES.
 *
 * NO agregar aquí rutas que modifiquen el RUND. Si en algún momento se necesita
 * escribir, va en el módulo dueño del dato, no en este contrato.
 */
@Controller('contrato-programacion/v1/docentes')
export class DocentesContratoController {
  constructor(private readonly docentes: DocentesContratoService) {}

  /** GET /contrato-programacion/v1/docentes/:documento — consulta por cédula (AC-01). */
  @Get(':documento')
  async porDocumento(@Param('documento') documento: string) {
    return { success: true, data: await this.docentes.buscarPorDocumento(documento) };
  }
}
