import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { TarjetaRundLogEntity } from '../../entities/tarjeta-rund-log.entity';
import { DocenteEntity } from '../../entities/docente.entity';

@Injectable()
export class TarjetaDigitalService {
  constructor(
    @InjectRepository(TarjetaRundLogEntity)
    private readonly tarjetaLogRepo: Repository<TarjetaRundLogEntity>,
    @InjectRepository(DocenteEntity)
    private readonly docenteRepo: Repository<DocenteEntity>,
  ) {}

  async emitirTarjeta(idDocente: string, emitidoPor?: string) {
    const docente = await this.docenteRepo.findOne({
      where: { idDocente },
      relations: ['formaciones'],
    });

    if (!docente) {
      throw new NotFoundException('Docente no encontrado');
    }

    const timestamp = Date.now();
    const codigoVerificacion = `VERIF-RUND-${docente.numeroDocumento}-${timestamp.toString().slice(-6)}`;
    
    // Crear payload de verificación
    const verificationPayload = JSON.stringify({
      rund: docente.numeroTarjetaRund || `RUND-${new Date().getFullYear()}-${docente.numeroDocumento}`,
      docente: `${docente.nombres} ${docente.apellidos}`,
      documento: `${docente.tipoDocumento} ${docente.numeroDocumento}`,
      escalafon: docente.escalafonDocente,
      estado: docente.estadoRund,
      codigoVerificacion,
      url: `https://comunidad.esap.edu.co/verificar-rund/${codigoVerificacion}`,
      emision: new Date().toISOString(),
    });

    const qrDataUrl = await QRCode.toDataURL(verificationPayload, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 250,
      color: {
        dark: '#003DA5',
        light: '#FFFFFF',
      },
    });

    // Guardar log
    const log = this.tarjetaLogRepo.create({
      idDocente,
      codigoVerificacion,
      qrCodePayload: qrDataUrl,
      emitidoPor,
      metadata: {
        docenteNombre: `${docente.nombres} ${docente.apellidos}`,
        numeroDocumento: docente.numeroDocumento,
      },
    });

    await this.tarjetaLogRepo.save(log);

    return {
      docente,
      codigoVerificacion,
      qrCodeDataUrl: qrDataUrl,
      fechaEmision: log.fechaEmision,
    };
  }

  async verificarTarjeta(codigoVerificacion: string) {
    const log = await this.tarjetaLogRepo.findOne({
      where: { codigoVerificacion },
      relations: ['docente'],
    });

    if (!log) {
      throw new NotFoundException('Código de verificación no válido o no encontrado');
    }

    return {
      valido: true,
      log,
      docente: log.docente,
    };
  }
}
