import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, IsNull, In, LessThanOrEqual, MoreThan } from 'typeorm';
import { DashboardStatsDto } from '../dto/dashboard-stats.dto';
import { Expediente } from '../entities/expediente.entity';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';
import { Requerimiento } from '../entities/requerimiento.entity';
import { TerminoProcesal } from '../entities/termino-procesal.entity';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Expediente)
        private expedienteRepository: Repository<Expediente>,
        @InjectRepository(ConsultaJuridica)
        private consultaRepository: Repository<ConsultaJuridica>,
        @InjectRepository(Requerimiento)
        private requerimientoRepository: Repository<Requerimiento>,
        @InjectRepository(TerminoProcesal)
        private terminoRepository: Repository<TerminoProcesal>,
    ) { }

    async getStats(): Promise<DashboardStatsDto> {
        const now = new Date();
        // Helper for "Urgente" (e.g. 5 days from now)
        const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

        // Helper to calculate days diff
        const getDiffDays = (d: Date) => Math.ceil((new Date(d).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Helper for Semaforo Logic (matched with TerminosService)
        // Red <= 1 day or Expired
        // Yellow <= 5 days
        // Green > 5 days

        // -------------------------------------------------------------------------
        // 1. DEFENSA JUDICIAL (Expedientes Ordinarios)
        // -------------------------------------------------------------------------
        // "Defensa" = All EXCEPT Disciplinaria variants.
        const juzgamientoMatches = ['DISCIPLINARIA', 'Disciplinaria', 'disciplinaria', 'DISCIPLINARIO', 'Disciplinario'];

        const defensaTotal = await this.expedienteRepository.count({
            where: {
                jurisdiccion: Not(In(juzgamientoMatches))
            }
        });

        // Vencidos: Date < Now AND Not Closed
        const defensaVencidos = await this.expedienteRepository.count({
            where: {
                jurisdiccion: Not(In(juzgamientoMatches)),
                fechaVencimientoTermino: LessThan(now),
                estado: Not(In(['CERRADO', 'TERMINADO', 'ARCHIVADO', 'FALLO']))
            }
        });

        const defensaUrgentes = await this.expedienteRepository.count({
            where: {
                jurisdiccion: Not(In(juzgamientoMatches)),
                fechaVencimientoTermino: LessThan(fiveDaysFromNow),
                estado: Not(In(['CERRADO', 'TERMINADO', 'ARCHIVADO', 'FALLO']))
            }
        });


        // -------------------------------------------------------------------------
        // 2. JUZGAMIENTO (Disciplinarios)
        // -------------------------------------------------------------------------
        const juzgamientoTotal = await this.expedienteRepository.count({
            where: {
                jurisdiccion: In(juzgamientoMatches)
            }
        });

        const juzgamientoVencidos = await this.expedienteRepository.count({
            where: {
                jurisdiccion: In(juzgamientoMatches),
                fechaVencimientoTermino: LessThan(now),
                estado: Not(In(['CERRADO', 'TERMINADO', 'ARCHIVADO', 'FALLO']))
            }
        });

        const juzgamientoCriticos = await this.expedienteRepository.count({
            where: {
                jurisdiccion: In(juzgamientoMatches),
                riesgoPrescripcion: true,
                estado: Not(In(['CERRADO', 'TERMINADO', 'ARCHIVADO', 'FALLO']))
            }
        });


        // -------------------------------------------------------------------------
        // 3. ASESORÍA JURÍDICA
        // -------------------------------------------------------------------------
        const asesoriaTotal = await this.consultaRepository.count();

        const asesoriaVencidas = await this.consultaRepository.count({
            where: {
                fechaMaximaRespuesta: LessThan(now),
                estado: Not(In(['cerrado', 'respondido', 'CERRADO']))
            }
        });

        const asesoriaUrgentes = await this.consultaRepository.count({
            where: {
                fechaMaximaRespuesta: LessThan(fiveDaysFromNow),
                estado: Not(In(['cerrado', 'respondido', 'CERRADO']))
            }
        });


        // -------------------------------------------------------------------------
        // 4. BUZÓN (Requerimientos)
        // -------------------------------------------------------------------------
        const buzonTotal = await this.requerimientoRepository.count();
        const todayStr = now.toISOString().split('T')[0];

        const buzonVencidos = await this.requerimientoRepository.count({
            where: {
                fechaVencimiento: LessThan(todayStr),
                estado: Not('CERRADO')
            }
        });

        const buzonSinRevisar = await this.requerimientoRepository.count({
            where: { estado: 'EN_PREPARACION' }
        });


        // -------------------------------------------------------------------------
        // 5. TÉRMINOS & URGENCY SOURCE OF TRUTH
        // -------------------------------------------------------------------------
        // User requested to use Terminos module logic for Urgency across the board.

        const countUrgentTerms = async (origen: string) => {
            return this.terminoRepository.count({
                where: {
                    origenModulo: origen,
                    fechaVencimiento: LessThan(fiveDaysFromNow),
                    estado: Not(In(['CERRADO', 'CUMPLIDO']))
                }
            });
        };

        // Calculate urgency based on Terminos (Deadlines)
        const urgentesDefensaFromTerms = await countUrgentTerms('DEFENSA');
        const urgentesJuzgamientoFromTerms = await countUrgentTerms('JUZGAMIENTO');
        const urgentesAsesoriaFromTerms = await countUrgentTerms('ASESORIA');

        // TÉRMINOS GENERAL
        const terminosTotal = await this.terminoRepository.count();
        const terminosVencidos = await this.terminoRepository.count({
            where: {
                fechaVencimiento: LessThan(now),
                estado: Not(In(['CERRADO', 'CUMPLIDO']))
            }
        });
        const terminosUrgentes = await this.terminoRepository.count({
            where: {
                fechaVencimiento: LessThan(fiveDaysFromNow),
                estado: Not(In(['CERRADO', 'CUMPLIDO']))
            }
        });


        // -------------------------------------------------------------------------
        // AGGREGATION & TOP URGENTES
        // -------------------------------------------------------------------------

        // PRIMARY SOURCE: TerminoProcesal (Centralized deadliness)
        const topTerminos = await this.terminoRepository.find({
            where: {
                estado: Not(In(['CERRADO', 'CUMPLIDO'])),
                fechaVencimiento: Not(IsNull())
            },
            order: { fechaVencimiento: 'ASC' },
            take: 10 // Take more to filter later
        });

        // We can also fetch Asesoria/Expediente direct info if needed, but Terminos is best for "Top Urgentes"
        // as it unifies dates. We will supplement with direct Asesoria/Buzon if they are not in Terminos.

        let allUrgentes: { id: string; modulo: string; moduleId: string; date: Date; color: string; }[] = [];

        // Map Terminos
        allUrgentes.push(...topTerminos.map(t => {
            let moduloLabel = 'Gestión Legal';
            let moduleId = 'terminos';
            let color = '#4F46E5'; // Default indigo

            if (t.origenModulo === 'DEFENSA') {
                moduloLabel = 'Defensa Judicial';
                moduleId = 'defensa-judicial';
                color = '#10B981';
            } else if (t.origenModulo === 'JUZGAMIENTO') {
                moduloLabel = 'Juzgamiento';
                moduleId = 'juzgamiento';
                color = '#DC2626';
            } else if (t.origenModulo === 'ASESORIA') {
                moduloLabel = 'Asesoría';
                moduleId = 'asesoria';
                color = '#8B5CF6';
            } else if (t.origenModulo === 'ORGANOS_CONTROL') {
                moduloLabel = 'Buzón / O.C.';
                moduleId = 'buzon';
                color = '#2563EB';
            }

            return {
                id: `${t.nombreActuacion} (${t.numeroRadicado})`,
                modulo: moduloLabel,
                moduleId: moduleId,
                date: t.fechaVencimiento,
                color: color
            };
        }));

        // Calculate urgency for each
        const processedUrgentes = allUrgentes.map(item => {
            const dias = getDiffDays(item.date);
            let semaforoColor = 'green';

            if (dias <= 1) semaforoColor = '#DC2626'; // RED
            else if (dias <= 5) semaforoColor = '#F59E0B'; // YELLOW
            else semaforoColor = '#10B981'; // GREEN

            return {
                ...item,
                dias,
                semaforoColor
            };
        });

        // Filter: Include only RED or YELLOW (Urgent) items
        // AND Exclude 'buzon' and 'terminos' specific items from the display if user wants them hidden
        // User asked to remove 'buzon' and 'terminos'.
        const filteredUrgentes = processedUrgentes.filter(i =>
            ['defensa-judicial', 'juzgamiento', 'asesoria'].includes(i.moduleId)
        );

        filteredUrgentes.sort((a, b) => a.dias - b.dias);

        // Take top 5
        const top4 = filteredUrgentes.slice(0, 5).map(item => ({
            id: item.id,
            modulo: item.modulo,
            moduleId: item.moduleId,
            dias: item.dias,
            color: item.semaforoColor,
            isExpired: item.dias < 0
        }));


        return {
            global: {
                // Only sum the active modules: Defensa + Juzgamiento + Asesoría
                total: defensaTotal + juzgamientoTotal + asesoriaTotal,
                // Update: Use Term-based urgency as requested
                urgentes: urgentesDefensaFromTerms + urgentesJuzgamientoFromTerms + urgentesAsesoriaFromTerms,
                vencidos: defensaVencidos + juzgamientoVencidos + asesoriaVencidas,
                terminoPromedio: 0
            },
            modules: {
                defensa: {
                    total: defensaTotal,
                    urgentes: urgentesDefensaFromTerms, // Use term-based
                    vencidos: defensaVencidos
                },
                juzgamiento: {
                    total: juzgamientoTotal,
                    criticos: urgentesJuzgamientoFromTerms, // Use term-based as 'criticos' for consistency? Or keep prescription? User said "expedientes urgentes que haya en terminos". Let's map it here.
                    vencidos: juzgamientoVencidos
                },
                asesoria: {
                    total: asesoriaTotal,
                    urgentes: urgentesAsesoriaFromTerms, // Use term-based 
                    vencidos: asesoriaVencidas
                },
                // Keep these in stats just in case but they are not contributing to Global or UI
                buzon: {
                    total: buzonTotal,
                    sinRevisar: buzonSinRevisar,
                    vencidos: buzonVencidos
                },
                terminos: {
                    total: terminosTotal,
                    urgentes: terminosUrgentes,
                    vencidos: terminosVencidos
                }
            },
            topUrgentes: top4
        } as any;
    }
}

