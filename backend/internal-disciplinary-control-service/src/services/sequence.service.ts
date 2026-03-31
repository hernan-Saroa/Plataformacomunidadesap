import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sequence } from '../entities/sequence.entity';

@Injectable()
export class SequenceService {
  constructor(
    @InjectRepository(Sequence)
    private sequenceRepository: Repository<Sequence>,
  ) {}

  /**
   * Genera un consecutivo único para Noticias Disciplinarias
   * Formato: ND-{YYYY}-{consecutivo}
   */
  async generateNewsRadicado(): Promise<string> {
    const year = new Date().getFullYear();
    const sequenceName = `DISCIPLINARY_NEWS_${year}`;

    let sequence = await this.sequenceRepository.findOne({
      where: { name: sequenceName },
    });

    if (!sequence) {
      sequence = this.sequenceRepository.create({
        name: sequenceName,
        currentValue: 0,
      });
    }

    sequence.currentValue++;
    await this.sequenceRepository.save(sequence);

    const paddedNumber = String(sequence.currentValue).padStart(3, '0');
    return `ND-${year}-${paddedNumber}`;
  }

  /**
   * Genera un consecutivo único para Procesos Disciplinarios
   * Formato: P-{consecutivo}-{YYYY}
   */
  async generateProcessRadicado(): Promise<string> {
    const year = new Date().getFullYear();
    const sequenceName = `DISCIPLINARY_PROCESS_${year}`;

    let sequence = await this.sequenceRepository.findOne({
      where: { name: sequenceName },
    });

    if (!sequence) {
      sequence = this.sequenceRepository.create({
        name: sequenceName,
        currentValue: 0,
      });
    }

    sequence.currentValue++;
    await this.sequenceRepository.save(sequence);

    const paddedNumber = String(sequence.currentValue).padStart(3, '0');
    return `P-${paddedNumber}-${year}`;
  }

  /**
   * Genera un consecutivo único para Actas Disciplinarias
   * Formato: ACT-{consecutivo}-{YYYY}
   */
  async generateActaConsecutivo(): Promise<string> {
    const year = new Date().getFullYear();
    const sequenceName = `DISCIPLINARY_ACTA_${year}`;

    let sequence = await this.sequenceRepository.findOne({
      where: { name: sequenceName },
    });

    if (!sequence) {
      sequence = this.sequenceRepository.create({
        name: sequenceName,
        currentValue: 0,
      });
    }

    sequence.currentValue++;
    await this.sequenceRepository.save(sequence);

    const paddedNumber = String(sequence.currentValue).padStart(3, '0');
    return `ACT-${paddedNumber}-${year}`;
  }

  /**
   * Genera un consecutivo único para Autos Disciplinarios al momento de su aprobación
   * Formato: AUTO-{consecutivo}-{YYYY}
   */
  async generateAutoConsecutivo(): Promise<string> {
    const year = new Date().getFullYear();
    const sequenceName = `DISCIPLINARY_AUTO_${year}`;

    let sequence = await this.sequenceRepository.findOne({
      where: { name: sequenceName },
    });

    if (!sequence) {
      sequence = this.sequenceRepository.create({
        name: sequenceName,
        currentValue: 0,
      });
    }

    sequence.currentValue++;
    await this.sequenceRepository.save(sequence);

    const paddedNumber = String(sequence.currentValue).padStart(3, '0');
    return `AUTO-${paddedNumber}-${year}`;
  }

  /**
   * Obtiene el próximo consecutivo para Actas Disciplinarias SIN incrementarlo
   * Formato: ACT-{consecutivo}-{YYYY}
   * Útil para previsualización antes de crear el documento
   */
  async getPreviewActaConsecutivo(): Promise<string> {
    const year = new Date().getFullYear();
    const sequenceName = `DISCIPLINARY_ACTA_${year}`;

    let sequence = await this.sequenceRepository.findOne({
      where: { name: sequenceName },
    });

    if (!sequence) {
      sequence = this.sequenceRepository.create({
        name: sequenceName,
        currentValue: 0,
      });
    }

    // Solo retornamos el siguiente valor sin guardar
    const nextValue = sequence.currentValue + 1;
    const paddedNumber = String(nextValue).padStart(3, '0');
    return `ACT-${paddedNumber}-${year}`;
  }
}
