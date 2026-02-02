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
    public async classify(subject: string, body: string): Promise<ClassificationResult> {
        const text = `${subject} ${body}`;

        // LAYER 1: Heuristic (Determinista)
        const heuristic = this.applyHeuristics(subject, body);
        if (heuristic) {
            this.logger.log(`Heuristic match: ${heuristic.category} for "${subject}"`);
            return { ...heuristic, method: 'HEURISTIC' };
        }

        // LAYER 2: Probabilistic (Bayesian)
        return this.applyBayesian(text);
    }

    /**
     * Layer 1: Heuristic Rules ("Reglas de Oro")
     */
    private applyHeuristics(subject: string, body: string): Omit<ClassificationResult, 'method'> | null {
        const content = `${subject} ${body}`.toUpperCase();

        // 1. JUDICIAL
        const judicialKeywords = [
            'FALLO', 'SENTENCIA', 'AUTO ADMISORIO', 'JUZGADO', 'TRIBUNAL', 'DEMANDA', 'TUTELA',
            'NOTIFICACION JUDICIAL', 'AUTO', 'DESPACHO JUDICIAL', 'PROCESO JUDICIAL',
            'ACCION POPULAR', 'ACCION DE GRUPO', 'NULIDAD', 'RESTABLECIMIENTO'
        ];
        if (judicialKeywords.some(kw => content.includes(kw))) {
            return { category: 'JUDICIAL', confidence: 1.0, module: 'MOD-01: Defensa Judicial' };
        }

        // 2. DISCARD (Lookahead negativo)
        // Palabras "blandas" que fuerzan categoría CORREO
        const discardKeywords = ['INVITACION', 'WEBINAR', 'CAPACITACION', 'BOLETIN', 'CIRCULAR INFORMATIVA', 'RECORDATORIO', 'CUMPLEAÑOS', 'SOCIALIZACION'];
        if (discardKeywords.some(kw => content.includes(kw))) {
            return { category: 'CORREO', confidence: 0.9, module: 'Buzón General' };
        }

        // 3. OFICIO (Entes de Control) - REGLAS ESTRICTAS
        const oficioKeywords = [
            'TRASLADO', 'REQUERIMIENTO', 'SOLICITUD DE INFORMACION', 'PETICION', 'DERECHO DE PETICION', 'AUTO', 'FALLO'
        ];
        // Instituciones clave
        const institutionalSenders = ['CONTRALORIA', 'PROCURADURIA', 'FISCALIA', 'JUZGADO', 'SUPERINTENDENCIA', 'COMISION NACIONAL', 'AUDITORIA', 'PERSONERIA', 'DEFENSORIA'];

        // Debe contener una palabra clave O provenir de una institución
        const matchesKeyword = oficioKeywords.some(kw => content.includes(kw));
        const matchesSender = institutionalSenders.some(sender =>
            subject.toUpperCase().includes(sender) ||
            (body && body.toUpperCase().includes(sender)) // Remitente usually checked in Subject/From, checking Body as proxy if signature included
        );

        if (matchesKeyword || matchesSender) {
            return { category: 'OFICIO', confidence: 1.0, module: 'MOD-06: Órganos de Control' };
        }

        // 3. URGENTE (Flag handled separately usually, but category can be URGENTE implies priority)
        // Note: Urgency is usually a flag, not a category, but if requested as category:
        // "Urgentes" is a tab, but usually type is Judicial/Oficio. 
        // The requirement says "Urgentes" is a sub-category.
        // We will return the primary type, urgency will be handled in a separate 'analyzeUrgency' method.

        return null;
    }

    /**
     * Layer 2: Bayesian Classification
     */
    private applyBayesian(text: string): ClassificationResult {
        // If model is empty (cold start & no training), fallback
        if (this.classifier.docs.length === 0) {
            return { category: 'CORREO', confidence: 0.0, module: 'Buzón General', method: 'DEFAULT' };
        }

        const classification = this.classifier.classify(text);
        // natural's getClassifications gives probabilities, but strictly classify returns string.
        // Let's get confidence.
        const classifications = this.classifier.getClassifications(text);
        const best = classifications[0]; // Sorted by value usually

        // Map categories to Modules
        const moduleMap: Record<string, string> = {
            'JUDICIAL': 'MOD-01: Defensa Judicial',
            'OFICIO': 'MOD-06: Órganos de Control',
            'CORREO': 'Buzón General',
            'CONSULTA': 'MOD-03: Asesoría Jurídica'
        };

        return {
            category: classification,
            confidence: best ? best.value : 0.5, // Note: Natural returns rough scores, not always 0-1 normalized well without tweaking
            module: moduleMap[classification] || 'Buzón General',
            method: 'BAYESIAN'
        };
    }

    /**
     * Analyze urgency based on keywords
     */
    public analyzeUrgency(subject: string, body: string): boolean {
        const urgentKeywords = ['URGENTE', 'INMEDIATO', 'TERMINO PERENTORIO', 'HORAS', 'DIAS HABILES', 'DESACATO'];
        const content = `${subject} ${body}`.toUpperCase();
        return urgentKeywords.some(kw => content.includes(kw));
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
