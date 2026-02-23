import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { ExpedienteCompartido, TipoCompartido, EstadoCompartido } from '../entities/expediente-compartido.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { CrearCompartidoDto, AccederCompartidoDto } from '../dtos/compartir-expediente.dto';

@Injectable()
export class CompartirExpedienteService {
  constructor(
    @InjectRepository(ExpedienteCompartido)
    private compartidoRepository: Repository<ExpedienteCompartido>,
    @InjectRepository(DisciplinaryProcess)
    private procesoRepository: Repository<DisciplinaryProcess>,
  ) {}

  /**
   * Crear un nuevo enlace compartido para un expediente
   */
  async crearCompartido(
    procesoId: string,
    dto: CrearCompartidoDto,
    usuarioId?: string,
  ): Promise<ExpedienteCompartido> {
    // Verificar que el proceso existe
    const proceso = await this.procesoRepository.findOne({ 
      where: { id: procesoId } 
    });
    if (!proceso) {
      throw new NotFoundException(`Proceso disciplinario con ID ${procesoId} no encontrado`);
    }

    // Generar token único
    const token = randomBytes(32).toString('hex');

    // Calcular fecha de expiración si aplica
    let fechaExpiracion: Date | null = null;
    if (dto.tiempoExpiracionHoras && dto.tiempoExpiracionHoras > 0) {
      fechaExpiracion = new Date();
      const horas = dto.tiempoExpiracionHoras;
      fechaExpiracion.setHours(fechaExpiracion.getHours() + horas);
    }

    // Hash de la clave si se requiere
    let claveHash: string | null = null;
    if (dto.requiereClave && dto.clave) {
      claveHash = await bcrypt.hash(dto.clave, 10);
    }

    // Crear el registro
    const compartido = this.compartidoRepository.create({
      tokenAcceso: token,
      procesoId: procesoId,
      tipoCompartido: dto.tipoCompartido || TipoCompartido.LINK,
      estado: EstadoCompartido.ACTIVO,
      requiereClave: dto.requiereClave || false,
      claveHash: claveHash,
      tiempoExpiracionHoras: dto.tiempoExpiracionHoras || null,
      fechaExpiracion: fechaExpiracion,
      emailDestinatario: dto.emailDestinatario || null,
      mensajeAdicional: dto.mensajeAdicional || null,
      creadoPor: usuarioId || null,
      esPublico: dto.esPublico || false,
    });

    return this.compartidoRepository.save(compartido);
  }

  /**
   * Obtener un enlace compartido por su token
   */
  async obtenerPorToken(token: string): Promise<ExpedienteCompartido | null> {
    return this.compartidoRepository.findOne({
      where: { tokenAcceso: token },
      relations: ['proceso'],
    });
  }

  /**
   * Verificar acceso a un expediente compartido
   */
  async verificarAcceso(
    dto: AccederCompartidoDto,
    ip?: string,
  ): Promise<{
    tieneAcceso: boolean;
    requiereClave: boolean;
    expediente?: {
      id: string;
      radicado: string;
      etapa?: string;
      estado?: string;
    };
    mensaje?: string;
  }> {
    const compartido = await this.obtenerPorToken(dto.token);

    if (!compartido) {
      return {
        tieneAcceso: false,
        requiereClave: false,
        mensaje: 'Enlace no encontrado o expirado',
      };
    }

    // Verificar si está activo
    if (compartido.estado !== EstadoCompartido.ACTIVO) {
      return {
        tieneAcceso: false,
        requiereClave: compartido.requiereClave,
        mensaje: 'Este enlace ha sido desactivado o expirado',
      };
    }

    // Verificar fecha de expiración
    if (compartido.fechaExpiracion && new Date() > compartido.fechaExpiracion) {
      // Actualizar estado a expirado
      await this.compartidoRepository.update(compartido.id, {
        estado: EstadoCompartido.EXPIRADO,
      });
      return {
        tieneAcceso: false,
        requiereClave: compartido.requiereClave,
        mensaje: 'Este enlace ha expirado',
      };
    }

    // Verificar clave si se requiere
    if (compartido.requiereClave) {
      if (!dto.clave) {
        return {
          tieneAcceso: false,
          requiereClave: true,
          mensaje: 'Se requiere clave de acceso',
        };
      }

      const claveValida = await bcrypt.compare(dto.clave, compartido.claveHash!);
      if (!claveValida) {
        return {
          tieneAcceso: false,
          requiereClave: true,
          mensaje: 'Clave de acceso incorrecta',
        };
      }
    }

    // Actualizar contador de accesos
    await this.compartidoRepository.update(compartido.id, {
      contadorAccesos: compartido.contadorAccesos + 1,
      ultimoAcceso: new Date(),
      ipUltimoAcceso: ip || null,
    });

    // Obtener datos del proceso para retornar
    const proceso = await this.procesoRepository.findOne({
      where: { id: compartido.procesoId },
    });

    return {
      tieneAcceso: true,
      requiereClave: false,
      expediente: proceso ? {
        id: proceso.id,
        radicado: proceso.radicadoProceso,
        etapa: proceso.etapaActual,
        estado: proceso.estado,
      } : undefined,
    };
  }

  /**
   * Obtener datos completos del proceso compartido (sin información sensible)
   */
  async obtenerExpedientePublico(token: string): Promise<{
    token: string;
    requiereClave: boolean;
    proceso: {
      id: string;
      radicado: string;
      etapaActual: string;
      estado: string;
      fechaVencimientoEtapa: Date;
    };
  }> {
    const compartido = await this.obtenerPorToken(token);

    if (!compartido) {
      throw new NotFoundException('Enlace no encontrado');
    }

    if (compartido.estado !== EstadoCompartido.ACTIVO) {
      throw new ForbiddenException('Este enlace ya no está activo');
    }

    if (compartido.fechaExpiracion && new Date() > compartido.fechaExpiracion) {
      throw new ForbiddenException('Este enlace ha expirado');
    }

    const proceso = await this.procesoRepository.findOne({
      where: { id: compartido.procesoId },
    });

    if (!proceso) {
      throw new NotFoundException('Proceso no encontrado');
    }

    // Retornar información pública del proceso
    return {
      token: compartido.tokenAcceso,
      requiereClave: compartido.requiereClave,
      proceso: {
        id: proceso.id,
        radicado: proceso.radicadoProceso,
        etapaActual: proceso.etapaActual,
        estado: proceso.estado,
        fechaVencimientoEtapa: proceso.fechaVencimientoEtapa,
      },
    };
  }

  /**
   * Listar todos los enlaces compartidos de un proceso
   */
  async listarPorProceso(procesoId: string): Promise<ExpedienteCompartido[]> {
    return this.compartidoRepository.find({
      where: { procesoId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Desactivar un enlace compartido
   */
  async desactivar(id: string): Promise<ExpedienteCompartido> {
    const compartido = await this.compartidoRepository.findOne({ 
      where: { id } 
    });
    if (!compartido) {
      throw new NotFoundException('Enlace compartido no encontrado');
    }

    compartido.estado = EstadoCompartido.INACTIVO;
    return this.compartidoRepository.save(compartido);
  }

  /**
   * Generar URL pública para acceder al expediente
   */
  generarUrlPublica(token: string): string {
    // Ajustar según la URL pública de la aplicación
    const baseUrl = process.env.PUBLIC_APP_URL || 'https://esap.edu.co';
    return `${baseUrl}/expediente-compartido/${token}`;
  }

  /**
   * Generar código QR (retorna la URL que debe codificarse)
   */
  generarUrlQR(token: string): string {
    return this.generarUrlPublica(token);
  }
}
