import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person } from '../users/person.entity';
import { User } from '../users/user.entity';

@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Obtiene el perfil real de una persona por su id_person (UUID).
   * Combina datos de `personas` + `auth.user` + relaciones (seccional, sede).
   */
  async getPerfilByPersonId(personId: string): Promise<any> {
    const persona = await this.personRepo.findOne({
      where: { id: personId },
      relations: ['seccional', 'sede', 'user'],
    });

    if (!persona) {
      throw new NotFoundException(`Persona con id ${personId} no encontrada`);
    }

    return {
      id: persona.id,
      nombre: persona.full_name,
      primerNombre: persona.first_name,
      apellido: persona.last_name,
      email: persona.email,
      telefono: persona.phone || null,
      tipoIdentificacion: persona.identification_type,
      identificacion: persona.identification_number,
      genero: persona.gender,
      territorial: persona.seccional?.nomSeccional || null,
      sede: persona.sede?.nomSede || null,
      // Configuración básica de privacidad (en futuro puede venir de tabla propia)
      privacidad: {
        email: 'Privado',
        telefono: 'Privado',
        direccion: 'Privado',
        documento: 'Privado',
      },
    };
  }

  /**
   * Actualiza campos editables del perfil (solo los no sensibles).
   * Por ahora solo permite editar: telefono, dirección.
   */
  async updatePerfil(personId: string, data: Record<string, any>): Promise<any> {
    const persona = await this.personRepo.findOne({ where: { id: personId } });
    if (!persona) throw new NotFoundException(`Persona ${personId} no encontrada`);

    // Solo permitir campos editables por el usuario
    const EDITABLE_FIELDS: Record<string, keyof Person> = {
      telefono: 'phone',
    };

    const updates: Partial<Person> = {};
    for (const [key, dbField] of Object.entries(EDITABLE_FIELDS)) {
      if (data[key] !== undefined) {
        (updates as any)[dbField] = data[key];
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.personRepo.update({ id: personId }, updates);
    }

    return { userId: personId, ...data };
  }
}
