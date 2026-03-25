import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as natural from 'natural';
import * as fs from 'fs';
import * as path from 'path';

interface ClassificationResult {
    category: string;
    confidence: number;
    module: string;
    method: 'HEURISTIC' | 'BAYESIAN' | 'DEFAULT';
}

interface EntityExtractionResult {
    procesoId?: string;
    implicado?: string;
    submodulo?: 'DEFENSA_JUDICIAL' | 'JUZGAMIENTO_DISCIPLINARIO';
}

@Injectable()
export class SmartClassificationService implements OnModuleInit {
    private readonly logger = new Logger(SmartClassificationService.name);
    private classifier: natural.BayesClassifier;
    private readonly MODEL_PATH = path.resolve(process.cwd(), 'ml_models', 'classifier.json');

    constructor() {
        this.classifier = new natural.BayesClassifier();
    }

    async onModuleInit() {
        this.loadModel();
    }

    /**
     * Main entry point for classification
     */
    public async classify(subject: string, body: string, hasAttachments: boolean = false): Promise<ClassificationResult> {
        const text = `${subject} ${body}`;

        // LAYER 1: Heuristic (Determinista)
        const heuristic = this.applyHeuristics(subject, body, hasAttachments);
        if (heuristic) {
            this.logger.log(`Heuristic match: ${heuristic.category} for "${subject}"`);
            return { ...heuristic, method: 'HEURISTIC' };
        }

        // LAYER 2: Probabilistic (Bayesian)
        return this.applyBayesian(text, subject, body, hasAttachments);
    }

    /**
     * Layer 1: Heuristic Rules ("Reglas de Oro") — RECALIBRADAS
     * 
     * ORDEN DE EVALUACIÓN:
     * 1. DISCARD (negative lookahead) — fuerza CORREO si hay palabras blandas
     * 2. JUDICIAL — términos de juzgados/tribunales/sentencias
     * 3. OFICIO ESTRICTO — requiere keyword fuerte + remitente institucional
     * 4. null → pasa al Bayesiano
     */
    private applyHeuristics(subject: string, body: string, hasAttachments: boolean): Omit<ClassificationResult, 'method'> | null {
        const content = `${subject} ${body}`.toUpperCase();

        // ═══ PASO 1: DISCARD — Palabras blandas fuerzan categoría CORREO ═══
        const discardKeywords = [
            'INVITACION', 'INVITACIÓN', 'WEBINAR', 'CAPACITACION', 'CAPACITACIÓN',
            'BOLETIN', 'BOLETÍN', 'CIRCULAR INFORMATIVA', 'RECORDATORIO',
            'CUMPLEAÑOS', 'SOCIALIZACION', 'SOCIALIZACIÓN', 'NEWSLETTER',
            'SEMINARIO', 'TALLER', 'CONFERENCIA', 'AGENDA', 'FELIZ',
            'SALUDO', 'FELICITACIONES', 'BIENVENIDO', 'SUSCRIPCION',
            'SUSCRIPCIÓN', 'EVENTO', 'INSCRIPCION', 'INSCRIPCIÓN',
            'FORO', 'DIPLOMADO', 'CURSO', 'CONVOCATORIA ABIERTA'
        ];
        if (discardKeywords.some(kw => content.includes(kw))) {
            return { category: 'CORREO', confidence: 0.95, module: 'Buzón General' };
        }

        // ═══ PASO 2: JUDICIAL — Términos de juzgados ═══
        const judicialKeywords = [
            'FALLO', 'SENTENCIA', 'AUTO ADMISORIO', 'JUZGADO', 'TRIBUNAL',
            'DEMANDA', 'TUTELA', 'NOTIFICACION JUDICIAL', 'NOTIFICACIÓN JUDICIAL',
            'DESPACHO JUDICIAL', 'PROCESO JUDICIAL', 'ACCION POPULAR', 'ACCIÓN POPULAR',
            'ACCION DE GRUPO', 'ACCIÓN DE GRUPO', 'NULIDAD', 'RESTABLECIMIENTO'
        ];
        if (judicialKeywords.some(kw => content.includes(kw))) {
            return { category: 'JUDICIAL', confidence: 1.0, module: 'MOD-01: Defensa Judicial' };
        }

        // ═══ PASO 3: OFICIO — REGLAS ESTRICTAS (debe cumplir keyword + remitente) ═══
        // Keywords fuertes que POR SÍ SOLOS marcan OFICIO
        const strongOficioKeywords = [
            'AUTO INTERLOCUTORIO', 'PLIEGO DE CARGOS', 'FALLO DISCIPLINARIO',
            'ACCION DE REPETICION', 'ACCIÓN DE REPETICIÓN',
        ];

        // Keywords débiles que solo cuentan si ADEMÁS hay remitente institucional
        const weakOficioKeywords = [
            'SOLICITUD DE INFORMACION', 'SOLICITUD DE INFORMACIÓN',
            'PETICION', 'PETICIÓN', 'DERECHO DE PETICION', 'DERECHO DE PETICIÓN',
            'TRASLADO', 'AUTO', 'REQUERIMIENTO', 'TRASLADO PROCESAL',
            'INDAGACION PRELIMINAR', 'INDAGACIÓN PRELIMINAR',
            'INVESTIGACION DISCIPLINARIA', 'INVESTIGACIÓN DISCIPLINARIA', 'OFICIO'
        ];

        // Instituciones clave
        const institutionalSenders = [
            'CONTRALORIA', 'CONTRALORÍA', 'PROCURADURIA', 'PROCURADURÍA',
            'FISCALIA', 'FISCALÍA', 'JUZGADO', 'SUPERINTENDENCIA',
            'COMISION NACIONAL', 'COMISIÓN NACIONAL', 'AUDITORIA', 'AUDITORÍA',
            'PERSONERIA', 'PERSONERÍA', 'DEFENSORIA', 'DEFENSORÍA',
            'MINISTERIO PUBLICO', 'MINISTERIO PÚBLICO',
        ];

        const matchesStrongKeyword = strongOficioKeywords.some(kw => content.includes(kw));
        const matchesWeakKeyword = weakOficioKeywords.some(kw => content.includes(kw));
        const matchesSender = institutionalSenders.some(sender => content.includes(sender));

        // OFICIO = keyword fuerte, OR (keyword débil + remitente institucional)
        // AND MUST HAVE ATTACHMENTS
        if (hasAttachments && (matchesStrongKeyword || (matchesWeakKeyword && matchesSender))) {
            const entities = this.extractEntities(subject, body);
            const suggestedModule = entities.submodulo === 'JUZGAMIENTO_DISCIPLINARIO'
                ? 'MOD-02: Juzgamiento Disciplinario'
                : 'MOD-01: Defensa Judicial';

            return { category: 'OFICIO', confidence: 1.0, module: suggestedModule };
        }

        // Remitente institucional solo, sin keywords → no es suficiente para OFICIO
        // Cae al Bayesiano

        return null;
    }

    /**
     * Layer 2: Bayesian Classification
     */
    private applyBayesian(text: string, subject: string, body: string, hasAttachments: boolean): ClassificationResult {
        // If model is empty (cold start & no training), fallback
        if (this.classifier.docs.length === 0) {
            return { category: 'CORREO', confidence: 0.0, module: 'Buzón General', method: 'DEFAULT' };
        }

        let classification = this.classifier.classify(text);
        const classifications = this.classifier.getClassifications(text);
        const best = classifications[0];
        const confidence = best ? best.value : 0.5;

        // Safety net: Si Bayesiano clasifica como OFICIO pero con baja confianza o sin adjuntos, forzar CORREO
        if (classification === 'OFICIO') {
            if (!hasAttachments || confidence < 0.7) {
                this.logger.warn(`Bayesian classified as OFICIO but missing attachments or confidence (${confidence}) too low — forcing CORREO`);
                classification = 'CORREO';
            }
        }

        // Map categories to Modules
        const moduleMap: Record<string, string> = {
            'JUDICIAL': 'MOD-01: Defensa Judicial',
            'CORREO': 'Buzón General',
            'CONSULTA': 'MOD-03: Asesoría Jurídica'
        };

        let moduleAssigned = moduleMap[classification] || 'Buzón General';

        if (classification === 'OFICIO') {
            const entities = this.extractEntities(subject, body);
            moduleAssigned = entities.submodulo === 'JUZGAMIENTO_DISCIPLINARIO'
                ? 'MOD-02: Juzgamiento Disciplinario'
                : 'MOD-01: Defensa Judicial';
        }

        return {
            category: classification,
            confidence,
            module: moduleAssigned,
            method: 'BAYESIAN'
        };
    }

    /**
     * Analyze urgency based on keywords
     */
    public analyzeUrgency(subject: string, body: string): boolean {
        const urgentKeywords = ['URGENTE', 'INMEDIATO', 'TERMINO PERENTORIO', 'TÉRMINO PERENTORIO', 'HORAS', 'DIAS HABILES', 'DÍAS HÁBILES', 'DESACATO'];
        const content = `${subject} ${body}`.toUpperCase();
        return urgentKeywords.some(kw => content.includes(kw));
    }

    /**
     * NLP Entity Extraction — Regex heurístico
     * Intenta extraer: ID de proceso, nombre del implicado, submódulo destino
     */
    public extractEntities(subject: string, body: string): EntityExtractionResult {
        const content = `${subject} ${body}`;
        const contentUpper = content.toUpperCase();
        const result: EntityExtractionResult = {};

        // ─── Extraer ID de Proceso ───
        // Patrones como PD-2026-00001, DJ-2026-00015, RAD. 12345, Exp. 12345
        const procesoPatterns = [
            /\b(PD-\d{4}-\d{3,6})\b/i,                    // Juzgamiento: PD-YYYY-NNNNN
            /\b(DJ-\d{4}-\d{3,6})\b/i,                    // Defensa Judicial: DJ-YYYY-NNNNN
            /(?:RAD(?:ICADO)?\.?\s*(?:No\.?\s*)?)([\d-]{5,})/i,  // RAD. 12345 or Radicado No. 12345
            /(?:EXP(?:EDIENTE)?\.?\s*(?:No\.?\s*)?)([\d-]{5,})/i, // EXP. 12345
            /\b(\d{5}-\d{2}-\d{2}-\d{3}-\d{4}-\d{5}-\d{2})\b/,  // Radicado judicial 25000-33-10-001-2025-00123-00
        ];

        for (const pattern of procesoPatterns) {
            const match = content.match(pattern);
            if (match) {
                result.procesoId = match[1] || match[0];
                break;
            }
        }

        // ─── Detectar Submódulo ───
        const defensaJudicialIndicators = [
            'DEFENSA JUDICIAL', 'DEMANDA', 'TUTELA', 'ACCION POPULAR',
            'ACCIÓN POPULAR', 'SENTENCIA', 'FALLO', 'JUZGADO', 'TRIBUNAL',
            'PROCESO JUDICIAL', 'NULIDAD', 'RESTABLECIMIENTO',
        ];
        const juzgamientoIndicators = [
            'JUZGAMIENTO DISCIPLINARIO', 'DISCIPLINARIO', 'INVESTIGACION DISCIPLINARIA',
            'INVESTIGACIÓN DISCIPLINARIA', 'INDAGACION PRELIMINAR', 'INDAGACIÓN PRELIMINAR',
            'PLIEGO DE CARGOS', 'FALLO DISCIPLINARIO', 'SANCION DISCIPLINARIA',
            'SANCIÓN DISCIPLINARIA', 'INVESTIGADO', 'QUEJOSO',
        ];

        // Detect by ID prefix first (most reliable)
        if (result.procesoId) {
            if (/^PD-/i.test(result.procesoId)) {
                result.submodulo = 'JUZGAMIENTO_DISCIPLINARIO';
            } else if (/^DJ-/i.test(result.procesoId)) {
                result.submodulo = 'DEFENSA_JUDICIAL';
            }
        }

        // If not detected by ID, use keyword matching
        if (!result.submodulo) {
            const defJudScore = defensaJudicialIndicators.filter(kw => contentUpper.includes(kw)).length;
            const juzgScore = juzgamientoIndicators.filter(kw => contentUpper.includes(kw)).length;

            if (defJudScore > juzgScore && defJudScore > 0) {
                result.submodulo = 'DEFENSA_JUDICIAL';
            } else if (juzgScore > defJudScore && juzgScore > 0) {
                result.submodulo = 'JUZGAMIENTO_DISCIPLINARIO';
            }
        }

        // ─── Extraer Nombre del Implicado ───
        // Buscar después de "contra", "investigado:", "demandado:", "procesado:"
        const implicadoPatterns = [
            /(?:contra|investigado|demandado|procesado|implicado|quejoso)\s*:?\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})/,
            /(?:CONTRA|INVESTIGADO|DEMANDADO|PROCESADO|IMPLICADO|QUEJOSO)\s*:?\s+([\wÁÉÍÓÚÑáéíóúñ]+(?:\s+[\wÁÉÍÓÚÑáéíóúñ]+){1,4})/,
        ];

        for (const pattern of implicadoPatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
                // Filter out common words that are not names
                const candidate = match[1].trim();
                const stopwords = ['de', 'la', 'el', 'los', 'las', 'del', 'en', 'por', 'para', 'con', 'sin'];
                const words = candidate.split(/\s+/);
                if (words.length >= 2 && !stopwords.includes(words[0].toLowerCase())) {
                    result.implicado = candidate;
                    break;
                }
            }
        }

        if (result.procesoId || result.submodulo || result.implicado) {
            this.logger.log(`Entities extracted: ${JSON.stringify(result)}`);
        }

        return result;
    }

    /**
     * Training: Add document and incremental train
     */
    public async train(text: string, category: string) {
        this.classifier.addDocument(text, category);
        this.classifier.train();
        await this.saveModel();
        this.logger.log(`Model retrained with new case: ${category}`);
    }

    private async saveModel() {
        const dir = path.dirname(this.MODEL_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return new Promise<void>((resolve, reject) => {
            this.classifier.save(this.MODEL_PATH, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    private loadModel() {
        if (fs.existsSync(this.MODEL_PATH)) {
            natural.BayesClassifier.load(this.MODEL_PATH, null, (err, classifier) => {
                if (err) {
                    this.logger.error('Error loading model', err);
                } else if (classifier) {
                    this.classifier = classifier;
                    this.logger.log('Bayesian model loaded successfully');
                }
            });
        } else {
            this.logger.warn('No pre-trained model found. Starting fresh.');
        }
    }
}
