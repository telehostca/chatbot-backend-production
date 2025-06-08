import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SimpleSaasController } from './simple-saas.controller';
import { SaasController } from '../users/saas.controller';

@Module({
  imports: [
    // Puedes incluir entidades relacionadas si más adelante agregas lógica de negocio
    TypeOrmModule.forFeature([], 'users'), // DataSource con alias 'users'
  ],
  controllers: [
    SimpleSaasController,
    SaasController,
  ],
  providers: [], // Puedes agregar servicios aquí si se separa lógica del controlador
  exports: []     // Exporta servicios si otros módulos los necesitan
})
export class SaasModule {}
