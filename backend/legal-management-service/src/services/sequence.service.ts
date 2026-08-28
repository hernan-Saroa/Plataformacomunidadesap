import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sequence } from '../entities/sequence.entity';

@Injectable()
export class SequenceService {
    constructor(
        @InjectRepository(Sequence)
        private sequenceRepository: Repository<Sequence>,
    ) { }

    /**
     * Genera un consecutivo único por año para el prefijo indicado.
     * Formato: {PREFIX}-{YYYY}-{consecutivo}
     */
    async generateRadicado(prefix: string, padLength: number = 4): Promise<string> {
        const year = new Date().getFullYear();
        const sequenceName = `${prefix}_${year}`;

        let sequence = await this.sequenceRepository.findOne({ where: { name: sequenceName } });
        if (!sequence) {
            sequence = this.sequenceRepository.create({ name: sequenceName, currentValue: 0 });
        }

        sequence.currentValue++;
        await this.sequenceRepository.save(sequence);

        const paddedNumber = String(sequence.currentValue).padStart(padLength, '0');
        return `${prefix}-${year}-${paddedNumber}`;
    }
}
