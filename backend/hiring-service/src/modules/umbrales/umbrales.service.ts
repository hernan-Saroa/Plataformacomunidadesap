import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';

import { UmbralModalidad } from '../../entities/umbral-modalidad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Smmlv } from '../../entities/smmlv.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { CrearUmbralDto } from './dto/umbral.dto';

/**
 * Un límite ya convertido a pesos, listo para comparar contra el valor estimado
 * de un proceso. `null` significa que ese extremo no tiene tope.
 */
export interface LimitesEnPesos {
  inferior: number | null;
  superior: number | null;
}

/**
 * Convierte los límites de un umbral a pesos.
 *
 * Los expresados en SMMLV se multiplican por el salario del año; los que ya
 * están en pesos se devuelven tal cual. Es una función pura y exportada porque
 * es el punto donde la regla de EFDS-1325 puede equivocarse en silencio: un
 * factor mal aplicado no falla, solo sugiere la modalidad equivocada.
 */
export function convertirAPesos(
  umbral: Pick<UmbralModalidad, 'limiteInferior' | 'limiteSuperior' | 'unidad'>,
  valorSmmlv: number | null,
): LimitesEnPesos {
  if (umbral.unidad === 'PESOS') {
    return { inferior: umbral.limiteInferior, superior: umbral.limiteSuperior };
  }

  // Sin el salario del año no se puede convertir, y devolver el número de
  // salarios como si fueran pesos daría un umbral ~1.600.000 veces más bajo:
  // todo proceso superaría el tope y todo se volvería licitación pública.
  if (valorSmmlv === null || !Number.isFinite(valorSmmlv) || valorSmmlv <= 0) {
    throw new BadRequestException(
      'No hay SMMLV registrado para el año del umbral; no se puede convertir a pesos',
    );
  }

  return {
    inferior: umbral.limiteInferior === null ? null : umbral.limiteInferior * valorSmmlv,
    superior: umbral.limiteSuperior === null ? null : umbral.limiteSuperior * valorSmmlv,
  };
}

/**
 * Modalidad cuya asignación es forzosa al superar su umbral (RF-EST-03).
 *
 * No es un parámetro configurable a propósito: que la licitación pública sea
 * obligatoria por encima de la menor cuantía es la regla del art. 2 de la Ley
 * 1150 de 2007, no una política de la entidad. Lo que sí se configura es la
 * cifra del umbral; que superarla obligue, no.
 */
export const MODALIDAD_FORZOSA = 'LICITACION_PUBLICA';

/** Pesos colombianos sin decimales, para los mensajes de error. */
export function formatoPesos(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return 'sin valor';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

/** Un tramo listo para comparar: límites ya en pesos. */
export interface TramoResoluble {
  modalidad: string;
  inferior: number | null;
  superior: number | null;
}

export interface SugerenciaModalidad {
  /** Código de la modalidad sugerida, o null si ningún tramo cubre el valor. */
  modalidad: string | null;
  /** El tramo que decidió, para poder explicar la sugerencia. */
  tramo: TramoResoluble | null;
  /**
   * True solo cuando la cuantía obliga a licitación pública. En los demás casos
   * la sugerencia orienta pero no ata: el gestor puede apartarse de ella.
   */
  forzosa: boolean;
  /** Por qué no hay sugerencia, o qué tiene de raro la que hay. */
  advertencia: string | null;
}

/**
 * Resuelve qué modalidad corresponde a una cuantía.
 *
 * Los tramos son semiabiertos `[inferior, superior)`: un valor igual al límite
 * superior pertenece al tramo siguiente, no a los dos. Ese es el borde que más
 * se equivoca —el valor exactamente igual al umbral— y por eso la comparación
 * es `>= inferior` y `< superior`, sin excepciones.
 *
 * Función pura: recibe los tramos ya convertidos a pesos y no toca la base de
 * datos, para que la regla se pueda probar entera sin montar el servicio.
 */
export function resolverModalidad(
  valorEstimado: number | null | undefined,
  tramos: TramoResoluble[],
): SugerenciaModalidad {
  const sinSugerencia = (advertencia: string): SugerenciaModalidad => ({
    modalidad: null,
    tramo: null,
    forzosa: false,
    advertencia,
  });

  if (valorEstimado === null || valorEstimado === undefined || !Number.isFinite(valorEstimado)) {
    return sinSugerencia('El proceso no tiene valor estimado registrado');
  }
  if (valorEstimado < 0) {
    return sinSugerencia('El valor estimado no puede ser negativo');
  }

  const cubren = tramos.filter(
    (t) =>
      (t.inferior === null || valorEstimado >= t.inferior) &&
      (t.superior === null || valorEstimado < t.superior),
  );

  if (cubren.length === 0) {
    return sinSugerencia(
      'Ningún umbral vigente cubre esa cuantía; falta configurar los tramos',
    );
  }

  // Con los tramos bien configurados solo uno cubre el valor. Si varios lo
  // hacen, la configuración está solapada: se elige el de piso más alto, que es
  // la modalidad más exigente, porque equivocarse hacia más garantías es menos
  // grave que hacia menos. La ambigüedad se reporta para que se corrija.
  const elegido = cubren.reduce((a, b) => ((b.inferior ?? -1) > (a.inferior ?? -1) ? b : a));

  return {
    modalidad: elegido.modalidad,
    tramo: elegido,
    forzosa: elegido.modalidad === MODALIDAD_FORZOSA,
    advertencia:
      cubren.length > 1
        ? `Hay ${cubren.length} umbrales solapados para esa cuantía; se aplicó el más exigente`
        : null,
  };
}

/** Año que gobierna la conversión de un umbral vigente. */
export function anioDeVigencia(vigenciaDesde: string, hoy = new Date()): number {
  const inicio = Number(vigenciaDesde.slice(0, 4));
  // El umbral se lee con el salario del año en curso, no con el del año en que
  // se creó: un umbral abierto en 2025 y aún vigente en 2026 vale 1.000 SMMLV
  // de 2026. Solo se cae al año de apertura si aún no llegó.
  return Math.max(inicio, hoy.getFullYear()) === hoy.getFullYear()
    ? hoy.getFullYear()
    : inicio;
}

@Injectable()
export class UmbralesService {
  constructor(private readonly dataSource: DataSource) {}

  /** SMMLV por año, indexado, para no consultar uno por uno. */
  private async salarios(): Promise<Map<number, Smmlv>> {
    const filas = await this.dataSource.getRepository(Smmlv).find();
    return new Map(filas.map((s) => [s.anio, s]));
  }

  /**
   * Umbrales vigentes con sus límites ya en pesos.
   *
   * Devuelve también la modalidad completa para que quien consuma sepa cuáles
   * no se deciden por cuantía sin tener que cruzar dos endpoints.
   */
  async vigentes() {
    const [umbrales, modalidades, smmlv] = await Promise.all([
      this.dataSource.getRepository(UmbralModalidad).find({
        where: { vigenciaHasta: IsNull() },
      }),
      this.dataSource.getRepository(Modalidad).find({ order: { orden: 'ASC' } }),
      this.salarios(),
    ]);

    const porModalidad = new Map(umbrales.map((u) => [u.modalidad, u]));

    return modalidades.map((m) => {
      const umbral = porModalidad.get(m.codigo);
      return {
        modalidad: m.codigo,
        nombre: m.nombre,
        orden: m.orden,
        determinadaPorCuantia: m.determinadaPorCuantia,
        umbral: umbral ? this.aVista(umbral, smmlv) : null,
      };
    });
  }

  /**
   * Modalidad que corresponde a una cuantía, según los umbrales vigentes.
   *
   * Solo participan las modalidades determinadas por cuantía: contratación
   * directa, régimen especial 092 de 2017 y enajenación por subasta se eligen
   * por la causal, así que ningún monto puede sugerirlas ni descartarlas.
   */
  async sugerir(valorEstimado: number | null): Promise<SugerenciaModalidad> {
    const [umbrales, modalidades, smmlv] = await Promise.all([
      this.dataSource.getRepository(UmbralModalidad).find({
        where: { vigenciaHasta: IsNull() },
      }),
      this.dataSource.getRepository(Modalidad).find(),
      this.salarios(),
    ]);

    const porCuantia = new Set(
      modalidades.filter((m) => m.determinadaPorCuantia && m.activa).map((m) => m.codigo),
    );

    const tramos: TramoResoluble[] = [];
    for (const umbral of umbrales) {
      if (!porCuantia.has(umbral.modalidad)) continue;

      const salario = smmlv.get(anioDeVigencia(umbral.vigenciaDesde))?.valor ?? null;
      try {
        const pesos = convertirAPesos(umbral, salario);
        tramos.push({
          modalidad: umbral.modalidad,
          inferior: pesos.inferior,
          superior: pesos.superior,
        });
      } catch {
        // Falta el SMMLV de ese año. Se omite el tramo en vez de tumbar toda la
        // sugerencia: los demás siguen sirviendo, y si el hueco deja al valor
        // sin cubrir, resolverModalidad lo reporta como configuración faltante.
        continue;
      }
    }

    return resolverModalidad(valorEstimado, tramos);
  }

  /**
   * Rechaza una modalidad de menor cuantía cuando el valor obliga a licitación
   * pública (RF-EST-03, segundo criterio de EFDS-1147).
   *
   * Vive en el backend y no solo en el formulario a propósito: es una regla de
   * negocio, no una ayuda de interfaz. Quien llame la API saltándose la
   * pantalla debe encontrarse con el mismo rechazo.
   */
  async exigirModalidadPermitida(valorEstimado: number | null, modalidad: Modalidad) {
    // Contratación directa, régimen especial 092 y enajenación por subasta se
    // eligen por la causal: proceden cualquiera sea el monto, y bloquearlas
    // aquí impediría contrataciones que la ley permite.
    if (!modalidad.determinadaPorCuantia) return;

    // La modalidad forzosa es ella misma: no puede rechazarse a sí misma.
    if (modalidad.codigo === MODALIDAD_FORZOSA) return;

    const sugerencia = await this.sugerir(valorEstimado);
    if (!sugerencia.forzosa) return;

    const piso = sugerencia.tramo?.inferior;
    throw new BadRequestException(
      `El valor estimado (${formatoPesos(valorEstimado)}) supera el umbral de licitación pública` +
        (piso !== null && piso !== undefined ? ` (${formatoPesos(piso)})` : '') +
        `: el proceso debe adelantarse por Licitación Pública y no admite ${modalidad.nombre}`,
    );
  }

  /** Historial completo de una modalidad, del más reciente al más antiguo. */
  async historial(modalidad: string) {
    await this.exigirModalidad(modalidad);
    const [umbrales, smmlv] = await Promise.all([
      this.dataSource.getRepository(UmbralModalidad).find({
        where: { modalidad },
        order: { vigenciaDesde: 'DESC', createdAt: 'DESC' },
      }),
      this.salarios(),
    ]);
    return umbrales.map((u) => this.aVista(u, smmlv));
  }

  /**
   * Abre un umbral nuevo y cierra el anterior de esa modalidad.
   *
   * No se edita el vigente: un proceso creado ayer debe poder explicarse con
   * las reglas de ayer. Por eso el cambio es cerrar y abrir, no un UPDATE.
   */
  async reemplazar(modalidad: string, dto: CrearUmbralDto, acceso: HiringAccess) {
    const catalogo = await this.exigirModalidad(modalidad);

    if (!catalogo.determinadaPorCuantia) {
      throw new BadRequestException(
        `${catalogo.nombre} se elige por causal y no por monto: no admite umbral de cuantía`,
      );
    }
    if (dto.limiteInferior === null && dto.limiteSuperior === null) {
      throw new BadRequestException('El umbral necesita al menos un límite');
    }
    if (
      dto.limiteInferior !== null &&
      dto.limiteSuperior !== null &&
      dto.limiteInferior >= dto.limiteSuperior
    ) {
      throw new BadRequestException(
        'El límite inferior debe ser menor que el superior',
      );
    }

    return this.dataSource.transaction(async (em) => {
      const desde = dto.vigenciaDesde ?? new Date().toISOString().slice(0, 10);

      const vigente = await em.findOne(UmbralModalidad, {
        where: { modalidad, vigenciaHasta: IsNull() },
      });

      if (vigente) {
        if (desde <= vigente.vigenciaDesde) {
          throw new BadRequestException(
            `El umbral vigente empezó el ${vigente.vigenciaDesde}; el nuevo debe empezar después`,
          );
        }
        // Se cierra el día antes de que arranque el nuevo, para que no haya un
        // día con dos umbrales abiertos ni un día sin ninguno.
        const cierre = new Date(`${desde}T00:00:00Z`);
        cierre.setUTCDate(cierre.getUTCDate() - 1);
        vigente.vigenciaHasta = cierre.toISOString().slice(0, 10);
        vigente.updatedAt = new Date();
        await em.save(vigente);
      }

      const creado = await em.save(
        em.create(UmbralModalidad, {
          modalidad,
          limiteInferior: dto.limiteInferior,
          limiteSuperior: dto.limiteSuperior,
          unidad: dto.unidad,
          vigenciaDesde: desde,
          vigenciaHasta: null,
          // Lo que carga un administrador por la API sí es un dato confirmado;
          // el `false` está reservado para los valores provisionales del seed.
          confirmado: true,
          createdBy: acceso.userName,
        }),
      );

      return this.aVista(creado, await this.salarios());
    });
  }

  /** Salarios mínimos registrados, del más reciente al más antiguo. */
  smmlv() {
    return this.dataSource.getRepository(Smmlv).find({ order: { anio: 'DESC' } });
  }

  async guardarSmmlv(anio: number, valor: number) {
    if (valor <= 0) {
      throw new BadRequestException('El salario mínimo debe ser mayor que cero');
    }
    const repo = this.dataSource.getRepository(Smmlv);
    const existente = await repo.findOne({ where: { anio } });
    return repo.save({ ...(existente ?? {}), anio, valor, confirmado: true });
  }

  private async exigirModalidad(codigo: string) {
    const modalidad = await this.dataSource
      .getRepository(Modalidad)
      .findOne({ where: { codigo } });
    if (!modalidad) {
      throw new NotFoundException(`La modalidad ${codigo} no existe en el catálogo`);
    }
    return modalidad;
  }

  /**
   * Forma en que se expone un umbral: los límites tal como se configuraron y su
   * equivalente en pesos, para que quien lo consuma no repita la conversión y
   * pueda además mostrar el origen de la cifra.
   */
  private aVista(umbral: UmbralModalidad, smmlv: Map<number, Smmlv>) {
    const anio = anioDeVigencia(umbral.vigenciaDesde);
    const salario = smmlv.get(anio) ?? null;

    let pesos: LimitesEnPesos | null = null;
    let advertencia: string | null = null;
    try {
      pesos = convertirAPesos(umbral, salario?.valor ?? null);
    } catch {
      // Falta el SMMLV del año. No se lanza: la consulta debe poder listar el
      // umbral y decir por qué no tiene equivalente en pesos, que es
      // justamente lo que el administrador necesita ver para arreglarlo.
      advertencia = `No hay SMMLV registrado para ${anio}`;
    }

    return {
      id: umbral.id,
      modalidad: umbral.modalidad,
      limiteInferior: umbral.limiteInferior,
      limiteSuperior: umbral.limiteSuperior,
      unidad: umbral.unidad,
      enPesos: pesos,
      smmlvAplicado: salario ? { anio, valor: salario.valor, confirmado: salario.confirmado } : null,
      vigenciaDesde: umbral.vigenciaDesde,
      vigenciaHasta: umbral.vigenciaHasta,
      vigente: umbral.vigenciaHasta === null,
      confirmado: umbral.confirmado,
      advertencia,
    };
  }
}
