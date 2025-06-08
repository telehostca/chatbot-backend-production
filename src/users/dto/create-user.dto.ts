import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ 
    description: 'Nombre completo del usuario',
    example: 'Juan Carlos Pérez',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Dirección de correo electrónico del usuario',
    example: 'juan.perez@email.com',
    format: 'email'
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    description: 'Contraseña del usuario (mínimo 8 caracteres)',
    example: 'MiContraseña123!',
    minLength: 8,
    format: 'password'
  })
  @IsString()
  password: string;

  @ApiProperty({ 
    description: 'Número de teléfono del usuario (formato internacional)',
    example: '+584141234567',
    required: false,
    pattern: '^\\+[1-9]\\d{1,14}$'
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ 
    description: 'Código único de cliente para identificación interna',
    example: 'CLI-2024-001',
    required: false,
    maxLength: 20
  })
  @IsString()
  @IsOptional()
  codigoCliente?: string;

  @ApiProperty({ 
    description: 'Estado activo/inactivo del usuario',
    example: true,
    required: false,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ 
    description: 'Saldo disponible del usuario en la moneda del sistema',
    example: 150.75,
    required: false,
    minimum: 0,
    default: 0
  })
  @IsNumber()
  @IsOptional()
  saldo?: number;

  @ApiProperty({ 
    description: 'Dirección física completa del usuario',
    example: 'Av. Principal #123, Urbanización Los Rosales, Caracas, Venezuela',
    required: false,
    maxLength: 500
  })
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiProperty({ 
    description: 'Rol del usuario en el sistema',
    example: 'cliente',
    enum: ['cliente', 'empresa', 'admin'],
    required: false,
    default: 'cliente'
  })
  @IsString()
  @IsOptional()
  role?: string;
} 