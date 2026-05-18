import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';

import { Expediente } from '../entities/expediente.entity';
import { CorreoJuridico } from '../entities/correo-juridico.entity';
import { TerminoProcesal } from '../entities/termino-procesal.entity';
import { RequerimientoOC } from '../entities/requerimiento-oc.entity';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';

@Injectable()
export class ReportesService {
    constructor(
        @InjectRepository(Expediente)
        private readonly expedienteRepo: Repository<Expediente>,
        @InjectRepository(CorreoJuridico)
        private readonly correoRepo: Repository<CorreoJuridico>,
        @InjectRepository(TerminoProcesal)
        private readonly terminoRepo: Repository<TerminoProcesal>,
        @InjectRepository(RequerimientoOC)
        private readonly requerimientoRepo: Repository<RequerimientoOC>,
        @InjectRepository(ConsultaJuridica)
        private readonly consultaRepo: Repository<ConsultaJuridica>
    ) { }

    /**
     * Retorna las estadísticas (conteo) para los reportes de Gestión Legal
     */
    async getStats() {
        const [
            judicialCount,
            comunicacionesCount,
            terminosCount,
            disciplinarioCount,
            organosControlCount,
            consultasCount
        ] = await Promise.all([
            this.expedienteRepo.createQueryBuilder('e')
                .where('e.jurisdiccion != :juris', { juris: 'DISCIPLINARIO' })
                .orWhere('e.jurisdiccion IS NULL')
                .getCount(),
            this.correoRepo.count(),
            this.terminoRepo.count(),
            this.expedienteRepo.count({ where: { jurisdiccion: 'DISCIPLINARIO' } }),
            this.requerimientoRepo.count(),
            this.consultaRepo.count()
        ]);

        return [
            {
                id: 'GL-001',
                registros: judicialCount,
                tamanoEstimado: `${(judicialCount * 3.5).toFixed(0)} KB` // Estimación simulada de tamaño base
            },
            {
                id: 'GL-002',
                registros: comunicacionesCount,
                tamanoEstimado: `${(comunicacionesCount * 2.1).toFixed(0)} KB`
            },
            {
                id: 'GL-003',
                registros: terminosCount,
                tamanoEstimado: `${(terminosCount * 1.5).toFixed(0)} KB`
            },
            {
                id: 'GL-004',
                registros: disciplinarioCount,
                tamanoEstimado: `${(disciplinarioCount * 3.8).toFixed(0)} KB`
            },
            {
                id: 'GL-005',
                registros: organosControlCount,
                tamanoEstimado: `${(organosControlCount * 2.5).toFixed(0)} KB`
            },
            {
                id: 'GL-006',
                registros: consultasCount,
                tamanoEstimado: `${(consultasCount * 2.2).toFixed(0)} KB`
            }
        ];
    }

    /**
     * Obtiene los datos crudos mapeados a los campos esperados por el frontend
     * para exportarlos (CSV, Excel, PDF)
     */
    async getReportData(reportId: string) {
        switch (reportId) {
            case 'GL-001': return this.getProcesosJudicialesData();
            case 'GL-002': return this.getComunicacionesData();
            case 'GL-003': return this.getTerminosData();
            case 'GL-004': return this.getDisciplinariosData();
            case 'GL-005': return this.getOrganosControlData();
            case 'GL-006': return this.getConsultasData();
            default: return [];
        }
    }

    private async getProcesosJudicialesData() {
        // 'Radicado', 'Tipo Proceso', 'Demandante', 'Despacho', 'Etapa Actual', 'Fecha Inicio', 'Próximo Término', 'Abogado', 'Estado'
        const data = await this.expedienteRepo.createQueryBuilder('e')
            .where('e.jurisdiccion != :juris', { juris: 'DISCIPLINARIO' })
            .orWhere('e.jurisdiccion IS NULL')
            .getMany();
        
        return data.map(d => ({
            'Radicado': d.radicado,
            'Tipo Proceso': d.tipoProceso,
            'Demandante': d.demandante,
            'Despacho': d.juzgadoConocimiento || 'No asignado',
            'Etapa Actual': d.etapaProcesal,
            'Fecha Inicio': d.fechaRadicacion ? new Date(d.fechaRadicacion).toLocaleDateString() : '',
            'Próximo Término': d.fechaVencimientoTermino ? new Date(d.fechaVencimientoTermino).toLocaleDateString() : 'N/A',
            'Abogado': d.abogadoSustanciador || 'Sin asignar',
            'Estado': d.estado
        }));
    }

    private async getComunicacionesData() {
        // 'ID Correo', 'Tipo', 'Remitente', 'Asunto', 'Fecha Recepción', 'Clasificación IA', 'Módulo Sugerido', 'Estado', 'Respondido', 'Reenviado', 'Expediente Vinculado'
        const data = await this.correoRepo.find();
        return data.map(d => ({
            'ID Correo': d.id,
            'Tipo': d.tipo || 'ENTRANTE',
            'Remitente': d.remitenteNombre ? `${d.remitenteNombre} <${d.remitenteEmail}>` : d.remitenteEmail,
            'Asunto': d.asunto,
            'Fecha Recepción': d.fechaRecepcion ? new Date(d.fechaRecepcion).toLocaleDateString() : '',
            'Clasificación IA': d.aiSuggestedCategory || 'Pendiente',
            'Módulo Sugerido': d.moduloSugerido || 'N/A',
            'Estado': d.archivado ? 'Archivado' : d.leido ? 'Leído' : 'No Leído',
            'Respondido': d.isReplied ? 'Sí' : 'No',
            'Reenviado': d.isForwarded ? 'Sí' : 'No',
            'Expediente Vinculado': d.expedienteId || 'Ninguno'
        }));
    }

    private async getTerminosData() {
        // 'Número Radicado', 'Tipo Actuación', 'Expediente', 'Fecha Inicio', 'Fecha Vencimiento', 'Días Restantes', 'Estado', 'Responsable'
        const data = await this.terminoRepo.find();
        return data.map(d => ({
            'Número Radicado': d.numeroRadicado || 'N/A',
            'Tipo Actuación': d.nombreActuacion || 'N/A',
            'Expediente': d.referenciaId || 'Sin vincular',
            'Fecha Inicio': d.fechaBase ? new Date(d.fechaBase).toLocaleDateString() : '',
            'Fecha Vencimiento': d.fechaVencimiento ? new Date(d.fechaVencimiento).toLocaleDateString() : '',
            'Días Restantes': this.calcularDias(d.fechaVencimiento),
            'Estado': d.estado,
            'Responsable': d.responsableNombre || 'Sin asignar'
        }));
    }

    private async getDisciplinariosData() {
        // 'Número Proceso', 'Investigado', 'Cargo', 'Tipo Falta', 'Etapa', 'Quejoso', 'Fecha Apertura', 'Abogado', 'Estado'
        const data = await this.expedienteRepo.find({
            where: { jurisdiccion: 'DISCIPLINARIO' }
        });
        
        return data.map(d => ({
            'Número Proceso': d.radicado,
            'Investigado': d.demandado, // Para disciplinario se usa demandado como investigado
            'Cargo': d.cargoInvestigado || 'N/A',
            'Tipo Falta': d.tipoFalta || 'N/A',
            'Etapa': d.etapa || 'AVOCAMIENTO',
            'Quejoso': d.demandante || 'De Oficio',
            'Fecha Apertura': d.fechaRadicacion ? new Date(d.fechaRadicacion).toLocaleDateString() : '',
            'Abogado': d.abogadoSustanciador || 'Sin asignar',
            'Estado': d.estado
        }));
    }

    private async getOrganosControlData() {
        // 'ID Requerimiento', 'Organismo', 'Tipo', 'Fecha Recepción', 'Fecha Límite Respuesta', 'Responsable', 'Estado', 'Respuesta Enviada'
        const data = await this.requerimientoRepo.find();
        return data.map(d => ({
            'ID Requerimiento': d.radicadoInterno || d.radicadoExterno || d.id,
            'Organismo': d.organismoId || 'Desconocido',
            'Tipo': d.tipoRequerimiento,
            'Fecha Recepción': d.fechaRecepcion ? new Date(d.fechaRecepcion).toLocaleDateString() : '',
            'Fecha Límite Respuesta': d.fechaVencimiento ? new Date(d.fechaVencimiento).toLocaleDateString() : '',
            'Responsable': d.areaResponsable || d.funcionarioResponsable || 'Sin asignar',
            'Estado': d.estado,
            'Respuesta Enviada': d.estado === 'ENVIADO' || d.estado === 'CERRADO' ? 'Sí' : 'No'
        }));
    }

    private async getConsultasData() {
        // 'ID Consulta', 'Área Solicitante', 'Tema', 'Fecha Solicitud', 'Abogado Asignado', 'Fecha Respuesta', 'Días de Atención', 'Estado'
        const data = await this.consultaRepo.find();
        return data.map(d => ({
            'ID Consulta': d.numeroRadicado || d.id,
            'Área Solicitante': d.dependenciaSolicitante || d.cargoSolicitante || 'N/A',
            'Tema': d.materiaJuridica || d.tipoSolicitud || 'Sin tema',
            'Fecha Solicitud': d.fechaRecepcion ? new Date(d.fechaRecepcion).toLocaleDateString() : '',
            'Abogado Asignado': d.abogadoAsignadoId || 'Sin asignar', // Podría hacerse join a users si hay info disponible
            'Fecha Respuesta': d.fechaRespuesta ? new Date(d.fechaRespuesta).toLocaleDateString() : 'Pendiente',
            'Días de Atención': this.calcularDiasDiff(d.fechaRecepcion, d.fechaRespuesta) || 'En curso',
            'Estado': d.estado
        }));
    }

    private calcularDias(fecha: Date | string | null): number {
        if (!fecha) return 0;
        const diff = new Date(fecha).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    }

    private calcularDiasDiff(start: Date | string | null, end: Date | string | null): number | null {
        if (!start || !end) return null;
        const diff = new Date(end).getTime() - new Date(start).getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    }
}
