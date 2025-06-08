import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entidades principales
import { User } from './entities/user.entity';

// Servicios
import { UsersService } from './users.service';

// Controladores
import { UsersController } from './users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User], 'users'),
  ],
  controllers: [
    UsersController,
  ],
  providers: [
    UsersService,
  ],
  exports: [
    UsersService,
  ],
})
export class UsersModule {} 