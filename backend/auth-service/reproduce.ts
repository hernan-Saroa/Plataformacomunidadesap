import { DataSource } from 'typeorm';
import { User } from './src/users/user.entity';
import { Person } from './src/users/person.entity';
import { Role } from './src/users/role.entity';
import { Permission } from './src/users/permission.entity';
import { Module } from './src/users/module.entity';
import { Geopolitica } from './src/users/geopolitica.entity';
import { Sede } from './src/users/sede.entity';
import { Seccional } from './src/users/seccional.entity';

async function run() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'esap_db',
    schema: 'auth',
    logging: true,
    entities: [
      User,
      Person,
      Role,
      Permission,
      Module,
      Geopolitica,
      Sede,
      Seccional
    ]
  });

  await dataSource.initialize();
  console.log("Connected!");
  try {
    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { username: 'superuser@esap.edu.co' },
      relations: ['person', 'roles', 'roles.permissions']
    });
    console.log("Found user:", user);
  } catch (err) {
    console.error("ERROR REPRODUCED:", err);
  } finally {
    await dataSource.destroy();
  }
}

run();
