import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Riesgo } from '../entities/riesgo.entity';
import { RiesgoHistorial } from '../entities/riesgo-historial.entity';
import {
    EvidenciaSeguimiento,
    ResultadoSeguimientoControl,
    RiesgoControlSeguimiento,
} from '../entities/riesgo-control-seguimiento.entity';
import { ConfigurationsService } from './configurations.service';
import { LegalNotificationsService } from './legal-notifications.service';
import {
    CLAVE_CONFIG_EVIDENCIAS,
    CUATRIMESTRES,
    EXTENSIONES_EVIDENCIA_PERMITIDAS,
    MAX_MB_EVIDENCIA_POR_DEFECTO,
    RESULTADO_LABEL,
    claveControl,
    estadoApertura,
    estadoCorte,
    extensionDe,
    hoyColombia,
    rangoCuatrimestre,
    ultimoCuatrimestreCerrado,
    validarEvidencias,
    validarSeguimiento,
    type DatosSeguimiento,
    type EstadoCorte,
} from '../utils/seguimiento-control';

export interface QuienRegistra {
    userId?: string;
    userName?: string;
}

export interface ArchivoSubido {
    originalname: string;
    filename: string;
    size: number;
}

export interface SeguimientoVista extends RiesgoControlSeguimiento {
    editable: boolean;
    cuatrimestreLabel: string;
}

export interface CorteVista {
    cuatrimestre: number;
    label: string;
    inicio: string;
    fin: string;
    estado: EstadoCorte;
    puedeRegistrar: boolean;
    seguimiento: SeguimientoVista | null;
}

export interface ControlSeguimientoVista {
    controlId: string;
    descripcion: string;
    efectividad: number;
    cortes: CorteVista[];
}

export interface RiesgoSeguimientosVista {
    vigencia: number;
    hoy: string;
    config: { maxMb: number; extensiones: string[] };
    controles: ControlSeguimientoVista[];
    historial: SeguimientoVista[];
}

const TIPO_UNICO = '23505';

@Injectable()
export class RiesgoSeguimientosService {
    private readonly logger = new Logger(RiesgoSeguimientosService.name);

    constructor(
        @InjectRepository(Riesgo)
        private readonly riesgoRepo: Repository<Riesgo>,
        @InjectRepository(RiesgoControlSeguimiento)
        private readonly seguimientoRepo: Repository<RiesgoControlSeguimiento>,
        @InjectRepository(RiesgoHistorial)
        private readonly historialRepo: Repository<RiesgoHistorial>,
        private readonly configurationsService: ConfigurationsService,
        private readonly notifications: LegalNotificationsService,
    ) { }

    // ============================================
    // CONSULTA
    // ============================================
    async getConfig(): Promise<{ maxMb: number; extensiones: string[] }> {
        const cfg = await this.configurationsService.findByKey(CLAVE_CONFIG_EVIDENCIAS);
        const valor = Number(cfg?.value?.maxMb);
        return {
            maxMb: Number.isFinite(valor) && valor > 0 ? valor : MAX_MB_EVIDENCIA_POR_DEFECTO,
            extensiones: EXTENSIONES_EVIDENCIA_PERMITIDAS,
        };
    }

    async listar(riesgoId: string, vigenciaParam?: number, ahora: Date = new Date()): Promise<RiesgoSeguimientosVista> {
        const riesgo = await this.findRiesgo(riesgoId);
        const hoy = hoyColombia(ahora);
        const vigencia = vigenciaParam && Number.isInteger(vigenciaParam) ? vigenciaParam : Number(hoy.slice(0, 4));

        const todos = await this.seguimientoRepo.find({
            where: { riesgoId },
            order: { fechaEjecucion: 'DESC', createdAt: 'DESC' },
        });
        const historial = todos.map(s => this.aVista(s, riesgo, hoy));

        const controles = (riesgo.controlesExistentes || []).map((control, idx) => {
            const controlId = claveControl(control, idx);
            const propios = todos.filter(s => s.controlId === controlId);
            const ultimo = propios[0]; // ya viene ordenado: el más reciente primero
            return {
                controlId,
                descripcion: control.descripcion,
                efectividad: ultimo ? ultimo.efectividad : control.efectividad,
                cortes: CUATRIMESTRES.map(c => {
                    const existente = propios.find(s => s.vigencia === vigencia && s.cuatrimestre === c.numero) || null;
                    const rango = rangoCuatrimestre(vigencia, c.numero);
                    return {
                        cuatrimestre: c.numero,
                        label: c.label,
                        inicio: rango.inicio,
                        fin: rango.fin,
                        estado: estadoCorte(vigencia, c.numero, hoy, !!existente),
                        puedeRegistrar: riesgo.estado === 'ACTIVO' && estadoApertura(vigencia, c.numero, hoy) === 'ABIERTO',
                        seguimiento: existente ? this.aVista(existente, riesgo, hoy) : null,
                    };
                }),
            };
        });

        return { vigencia, hoy, config: await this.getConfig(), controles, historial };
    }

    // ============================================
    // ESCRITURA
    // ============================================
    async crear(
        riesgoId: string,
        controlId: string,
        datos: DatosSeguimiento,
        archivos: ArchivoSubido[],
        quien: QuienRegistra,
        ahora: Date = new Date(),
    ): Promise<SeguimientoVista> {
        let persistido = false;
        try {
            const riesgo = await this.findRiesgo(riesgoId);
            const control = this.resolverControl(riesgo, controlId);
            const hoy = hoyColombia(ahora);
            const vigencia = Number(hoy.slice(0, 4));
            const valores = await this.validarEntrada(datos, archivos, vigencia, hoy);
            this.exigirCuatrimestreAbierto(riesgo, vigencia, valores.cuatrimestre, hoy);

            const responsable = this.nombreResponsable(quien);
            const entidad = this.seguimientoRepo.create({
                riesgoId,
                controlId,
                vigencia,
                cuatrimestre: valores.cuatrimestre,
                fechaEjecucion: valores.fechaEjecucion,
                comentarios: valores.comentarios,
                resultado: valores.resultado,
                efectividad: valores.efectividad,
                evidencias: archivos.map(a => this.aEvidencia(a)),
                responsable,
                responsableId: quien.userId ?? null,
            });

            let guardado: RiesgoControlSeguimiento;
            try {
                guardado = await this.seguimientoRepo.save(entidad);
            } catch (err: any) {
                if (err?.code === TIPO_UNICO) {
                    throw new ConflictException('Ya existe un seguimiento de este control en el cuatrimestre; edite el existente');
                }
                throw err;
            }
            persistido = true;

            await this.sincronizarEfectividad(riesgo, controlId);
            await this.registrarTimeline(riesgo, control.descripcion, guardado, 'registrado', responsable);
            return this.aVista(guardado, riesgo, hoy);
        } catch (err) {
            if (!persistido) await this.descartarArchivos(archivos);
            throw err;
        }
    }

    async actualizar(
        riesgoId: string,
        seguimientoId: string,
        datos: DatosSeguimiento,
        archivos: ArchivoSubido[],
        archivosConservar: string[] | null,
        quien: QuienRegistra,
        ahora: Date = new Date(),
    ): Promise<SeguimientoVista> {
        let persistido = false;
        try {
            const riesgo = await this.findRiesgo(riesgoId);
            const existente = await this.seguimientoRepo.findOne({ where: { id: seguimientoId, riesgoId } });
            if (!existente) throw new NotFoundException(`Seguimiento ${seguimientoId} no encontrado`);

            const control = this.resolverControl(riesgo, existente.controlId);
            const hoy = hoyColombia(ahora);
            this.exigirCuatrimestreAbierto(riesgo, existente.vigencia, existente.cuatrimestre, hoy);

            // El cuatrimestre del seguimiento no cambia al editar (un corte = un registro).
            const valores = await this.validarEntrada(
                { ...datos, cuatrimestre: existente.cuatrimestre },
                archivos,
                existente.vigencia,
                hoy,
            );

            const conservar = archivosConservar === null
                ? existente.evidencias
                : existente.evidencias.filter(e => archivosConservar.includes(e.archivo));
            const retiradas = existente.evidencias.filter(e => !conservar.includes(e));

            existente.fechaEjecucion = valores.fechaEjecucion;
            existente.comentarios = valores.comentarios;
            existente.resultado = valores.resultado;
            existente.efectividad = valores.efectividad;
            existente.evidencias = [...conservar, ...archivos.map(a => this.aEvidencia(a))];
            const responsable = this.nombreResponsable(quien);

            const guardado = await this.seguimientoRepo.save(existente);
            persistido = true;
            await this.descartarArchivos(retiradas.map(e => ({ filename: e.archivo })));

            await this.sincronizarEfectividad(riesgo, existente.controlId);
            await this.registrarTimeline(riesgo, control.descripcion, guardado, 'actualizado', responsable);
            return this.aVista(guardado, riesgo, hoy);
        } catch (err) {
            if (!persistido) await this.descartarArchivos(archivos);
            throw err;
        }
    }

    // ============================================
    // VENCIMIENTO: notifica al responsable del riesgo, una sola vez por control y corte
    // ============================================
    @Cron('0 7 * * *', { name: 'verificar-seguimientos-controles-riesgos', timeZone: 'America/Bogota' })
    async verificarVencidos(): Promise<void> {
        try {
            await this.notificarVencidos(new Date());
        } catch (err: any) {
            this.logger.error(`Error verificando seguimientos de controles vencidos: ${err?.message}`);
        }
    }

    async notificarVencidos(ahora: Date): Promise<number> {
        const hoy = hoyColombia(ahora);
        const corte = ultimoCuatrimestreCerrado(hoy);
        if (!corte) return 0;
        const { vigencia, cuatrimestre } = corte;
        const { fin } = rangoCuatrimestre(vigencia, cuatrimestre);
        const label = CUATRIMESTRES[cuatrimestre - 1].label;

        const riesgos = await this.riesgoRepo.find({ where: { estado: 'ACTIVO' } });
        let notificados = 0;

        for (const riesgo of riesgos) {
            // Un riesgo creado después del cierre del corte no podía ser seguido en él.
            if (riesgo.createdAt && riesgo.createdAt.toISOString().slice(0, 10) > fin) continue;

            for (const [idx, control] of (riesgo.controlesExistentes || []).entries()) {
                const controlId = claveControl(control, idx);
                const registrado = await this.seguimientoRepo.count({ where: { riesgoId: riesgo.id, controlId, vigencia, cuatrimestre } });
                if (registrado > 0) continue;

                const marca = `${controlId}|${vigencia}|C${cuatrimestre}`;
                const yaAvisado = await this.historialRepo.count({
                    where: { riesgoId: riesgo.id, tipoEvento: 'SEGUIMIENTO_VENCIDO', campoModificado: marca },
                });
                if (yaAvisado > 0) continue;

                await this.historialRepo.save(this.historialRepo.create({
                    riesgoId: riesgo.id,
                    tipoEvento: 'SEGUIMIENTO_VENCIDO',
                    descripcion: `Seguimiento vencido sin registro: ${label} ${vigencia} — control "${control.descripcion}"`,
                    campoModificado: marca,
                    valorAnterior: null,
                    valorNuevo: null,
                    usuario: 'Sistema',
                }));

                if (riesgo.responsableId) {
                    await this.notifications.notifyRiesgoSeguimientoVencido({
                        riesgoId: riesgo.id,
                        codigo: riesgo.codigo,
                        nombreRiesgo: riesgo.nombre,
                        controlDescripcion: control.descripcion,
                        cuatrimestreLabel: label,
                        vigencia,
                        abogadoId: riesgo.responsableId,
                    });
                    notificados++;
                } else {
                    this.logger.warn(`Riesgo ${riesgo.codigo} sin responsableId: no se notificó el seguimiento vencido`);
                }
            }
        }
        return notificados;
    }

    // ============================================
    // INTERNOS
    // ============================================
    private async findRiesgo(id: string): Promise<Riesgo> {
        const riesgo = await this.riesgoRepo.findOne({ where: { id } });
        if (!riesgo) throw new NotFoundException(`Riesgo ${id} no encontrado`);
        return riesgo;
    }

    private resolverControl(riesgo: Riesgo, controlId: string): { id?: string; descripcion: string; efectividad: number } {
        const lista = riesgo.controlesExistentes || [];
        const idx = lista.findIndex((c, i) => claveControl(c, i) === controlId);
        if (idx < 0) throw new NotFoundException(`El riesgo ${riesgo.codigo} no tiene el control ${controlId}`);
        return lista[idx];
    }

    private async validarEntrada(datos: DatosSeguimiento, archivos: ArchivoSubido[], vigencia: number, hoy: string) {
        const { errores, valores } = validarSeguimiento(datos, vigencia, hoy);
        const { maxMb } = await this.getConfig();
        errores.push(...validarEvidencias(archivos, maxMb));
        if (errores.length > 0 || !valores) throw new BadRequestException(errores);
        return valores;
    }

    private exigirCuatrimestreAbierto(riesgo: Riesgo, vigencia: number, cuatrimestre: number, hoy: string): void {
        if (riesgo.estado !== 'ACTIVO') {
            throw new ForbiddenException('El riesgo no está activo: el seguimiento es de solo lectura');
        }
        const apertura = estadoApertura(vigencia, cuatrimestre, hoy);
        if (apertura === 'CERRADO') {
            throw new ForbiddenException(`El cuatrimestre ${cuatrimestre} de ${vigencia} está cerrado: el seguimiento es de solo lectura`);
        }
        if (apertura === 'FUTURO') {
            throw new BadRequestException(`El cuatrimestre ${cuatrimestre} de ${vigencia} aún no está habilitado`);
        }
    }

    private nombreResponsable(quien: QuienRegistra): string {
        return quien.userName?.trim() || quien.userId?.trim() || 'Sistema';
    }

    private aEvidencia(a: ArchivoSubido): EvidenciaSeguimiento {
        return {
            // multer entrega el nombre original en latin1; se restaura a UTF-8 para conservar tildes y ñ.
            nombre: Buffer.from(a.originalname, 'latin1').toString('utf8'),
            archivo: a.filename,
            url: `files/${a.filename}`,
            tipo: extensionDe(a.originalname),
            tamano: a.size,
        };
    }

    private aVista(s: RiesgoControlSeguimiento, riesgo: Riesgo, hoy: string): SeguimientoVista {
        return {
            ...s,
            cuatrimestreLabel: CUATRIMESTRES[s.cuatrimestre - 1].label,
            editable: riesgo.estado === 'ACTIVO' && estadoApertura(s.vigencia, s.cuatrimestre, hoy) === 'ABIERTO',
        };
    }

    /** La efectividad del control pasa a ser la del último seguimiento registrado. */
    private async sincronizarEfectividad(riesgo: Riesgo, controlId: string): Promise<void> {
        const ultimo = await this.seguimientoRepo.findOne({
            where: { riesgoId: riesgo.id, controlId },
            order: { fechaEjecucion: 'DESC', createdAt: 'DESC' },
        });
        if (!ultimo) return;
        const controles = (riesgo.controlesExistentes || []).map((c, i) =>
            claveControl(c, i) === controlId ? { ...c, efectividad: ultimo.efectividad } : c,
        );
        riesgo.controlesExistentes = controles;
        await this.riesgoRepo.save(riesgo);
    }

    private async registrarTimeline(
        riesgo: Riesgo,
        descripcionControl: string,
        s: RiesgoControlSeguimiento,
        accion: 'registrado' | 'actualizado',
        usuario: string,
    ): Promise<void> {
        await this.historialRepo.save(this.historialRepo.create({
            riesgoId: riesgo.id,
            tipoEvento: 'SEGUIMIENTO_CONTROL',
            descripcion: `Seguimiento ${accion} — ${CUATRIMESTRES[s.cuatrimestre - 1].label} ${s.vigencia}, control "${descripcionControl}": ${RESULTADO_LABEL[s.resultado as ResultadoSeguimientoControl]} (${s.efectividad}% de efectividad), ejecutado el ${s.fechaEjecucion}`,
            campoModificado: null,
            valorAnterior: null,
            valorNuevo: null,
            usuario,
        }));
    }

    private async descartarArchivos(archivos: { filename: string }[]): Promise<void> {
        await Promise.all(archivos.map(a =>
            unlink(join(process.cwd(), 'uploads', a.filename)).catch(() => undefined),
        ));
    }
}
