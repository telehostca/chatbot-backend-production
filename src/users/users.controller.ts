import { Controller, Get, Post, Body, Param, Put, Delete, Logger, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    @InjectDataSource('users') private readonly dataSource: DataSource
  ) {}

  @Post()
  @ApiOperation({ 
    summary: 'Crear nuevo usuario',
    description: 'Registra un nuevo usuario en el sistema con toda la información requerida. Soporta diferentes tipos de usuarios: clientes, empresas y administradores.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Usuario creado exitosamente',
    content: {
      'application/json': {
        examples: {
          "usuario-cliente-basico": {
            summary: "Cliente básico creado",
            value: {
              success: true,
              message: "Usuario creado exitosamente",
              data: {
                id: "550e8400-e29b-41d4-a716-446655440000",
                name: "María González",
                email: "maria.gonzalez@gmail.com",
                phone: "+58412-7654321",
                codigoCliente: "CLI-2024-001",
                isActive: true,
                saldo: 0.00,
                direccion: "Av. Principal #123, Los Rosales",
                role: "cliente",
                status: "activo",
                createdAt: "2024-06-08T10:30:00.000Z",
                updatedAt: "2024-06-08T10:30:00.000Z"
              }
            }
          },
          "usuario-empresa-completo": {
            summary: "Usuario empresa con información completa",
            value: {
              success: true,
              message: "Usuario empresa creado exitosamente",
              data: {
                id: "660f9511-f3ac-52e5-b827-557766551001",
                name: "Distribuidora Los Andes C.A.",
                email: "ventas@losandes.com.ve",
                phone: "+58212-9876543",
                codigoCliente: "EMP-2024-015",
                isActive: true,
                saldo: 2500.75,
                direccion: "Zona Industrial La Urbina, Galpón 45-B",
                role: "empresa",
                status: "activo",
                rif: "J-40123456-7",
                nombre: "Distribuidora Los Andes C.A.",
                direccion1: "Zona Industrial La Urbina",
                direccion2: "Galpón 45-B, Sector Norte",
                telefono1: "+58212-9876543",
                telefono2: "+58414-5551234",
                tieneCredito: 1,
                diasCredito: 30,
                createdAt: "2024-06-08T10:30:00.000Z",
                updatedAt: "2024-06-08T10:30:00.000Z"
              }
            }
          },
          "usuario-admin": {
            summary: "Usuario administrador del sistema",
            value: {
              success: true,
              message: "Administrador creado exitosamente",
              data: {
                id: "770g0622-g4bd-63f6-c938-668877662002",
                name: "Carlos Mendoza",
                email: "admin@sistema.com",
                phone: "+58424-1112233",
                codigoCliente: "ADM-2024-001",
                isActive: true,
                saldo: 0.00,
                direccion: "Oficina Central - Caracas",
                role: "admin",
                status: "activo",
                createdAt: "2024-06-08T10:30:00.000Z",
                updatedAt: "2024-06-08T10:30:00.000Z"
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Datos de entrada inválidos',
    content: {
      'application/json': {
        examples: {
          "email-duplicado": {
            summary: "Email ya registrado",
            value: {
              success: false,
              message: "El email ya está registrado en el sistema",
              error: "DUPLICATE_EMAIL",
              statusCode: 400
            }
          },
          "datos-invalidos": {
            summary: "Datos de validación incorrectos",
            value: {
              success: false,
              message: "Datos de entrada inválidos",
              errors: [
                "El email debe tener un formato válido",
                "La contraseña debe tener al menos 8 caracteres",
                "El teléfono debe tener formato internacional"
              ],
              statusCode: 400
            }
          }
        }
      }
    }
  })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      "cliente-personal": {
        summary: "Cliente personal básico",
        value: {
          name: "Ana Rodríguez",
          email: "ana.rodriguez@hotmail.com",
          phone: "+58414-9876543",
          password: "MiClaveSegura123!",
          direccion: "Urbanización Los Rosales, Casa 45-B",
          role: "cliente"
        }
      },
      "cliente-completo": {
        summary: "Cliente con información completa",
        value: {
          name: "Carlos Mendoza",
          email: "carlos.mendoza@empresa.com.ve",
          phone: "+58424-5678901",
          password: "PasswordSeguro456!",
          direccion: "Zona Industrial La Urbina",
          role: "cliente",
          codigoCliente: "CLI-2024-025",
          saldo: 150.50
        }
      },
      "empresa-distribuidor": {
        summary: "Usuario empresa/distribuidor",
        value: {
          name: "Comercializadora El Éxito C.A.",
          email: "gerencia@elexito.com.ve",
          phone: "+58212-7890123",
          password: "EmpresaSegura789!",
          direccion: "Centro Comercial Los Próceres, Local 234",
          role: "empresa",
          codigoCliente: "EMP-2024-008",
          saldo: 5000.00
        }
      },
      "admin-sistema": {
        summary: "Administrador del sistema",
        value: {
          name: "Luis Administrador",
          email: "admin@miempresa.com",
          phone: "+58426-1234567",
          password: "AdminSecure2024!",
          direccion: "Oficina Principal",
          role: "admin"
        }
      },
      "cliente-internacional": {
        summary: "Cliente con datos internacionales",
        value: {
          name: "Roberto Silva",
          email: "roberto.silva@international.com",
          phone: "+1-305-5551234",
          password: "International123!",
          direccion: "Miami, FL - USA",
          role: "cliente",
          codigoCliente: "INT-2024-001"
        }
      }
    }
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Obtener todos los usuarios',
    description: 'Retorna una lista completa de todos los usuarios registrados en el sistema, incluyendo clientes, empresas y administradores. Útil para administración y reportes.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de usuarios obtenida exitosamente',
    content: {
      'application/json': {
        examples: {
          "lista-usuarios-mixta": {
            summary: "Lista con diferentes tipos de usuarios",
            value: [
              {
                id: "550e8400-e29b-41d4-a716-446655440000",
                name: "María González",
                email: "maria.gonzalez@gmail.com",
                phone: "+58412-7654321",
                codigoCliente: "CLI-2024-001",
                isActive: true,
                saldo: 125.50,
                direccion: "Av. Principal #123, Los Rosales",
                role: "cliente",
                status: "activo",
                createdAt: "2024-06-08T10:30:00.000Z",
                updatedAt: "2024-06-08T10:30:00.000Z"
              },
              {
                id: "660f9511-f3ac-52e5-b827-557766551001",
                name: "Distribuidora Los Andes C.A.",
                email: "ventas@losandes.com.ve",
                phone: "+58212-9876543",
                codigoCliente: "EMP-2024-015",
                isActive: true,
                saldo: 2500.75,
                direccion: "Zona Industrial La Urbina, Galpón 45-B",
                role: "empresa",
                status: "activo",
                rif: "J-40123456-7",
                nombre: "Distribuidora Los Andes C.A.",
                tieneCredito: 1,
                diasCredito: 30,
                createdAt: "2024-06-08T09:15:00.000Z",
                updatedAt: "2024-06-08T11:20:00.000Z"
              },
              {
                id: "770g0622-g4bd-63f6-c938-668877662002",
                name: "Carlos Mendoza",
                email: "admin@sistema.com",
                phone: "+58424-1112233",
                codigoCliente: "ADM-2024-001",
                isActive: true,
                saldo: 0.00,
                direccion: "Oficina Central - Caracas",
                role: "admin",
                status: "activo",
                createdAt: "2024-06-08T08:00:00.000Z",
                updatedAt: "2024-06-08T08:00:00.000Z"
              }
            ]
          },
          "lista-solo-clientes": {
            summary: "Lista filtrada solo clientes",
            value: [
              {
                id: "111a1111-a11a-11a1-a111-111111111111",
                name: "Ana Rodríguez",
                email: "ana.rodriguez@hotmail.com",
                phone: "+58414-9876543",
                codigoCliente: "CLI-2024-002",
                isActive: true,
                saldo: 75.25,
                direccion: "Urbanización Los Rosales, Casa 45-B",
                role: "cliente",
                status: "activo",
                createdAt: "2024-06-07T14:30:00.000Z",
                updatedAt: "2024-06-08T09:45:00.000Z"
              },
              {
                id: "222b2222-b22b-22b2-b222-222222222222",
                name: "Roberto Silva",
                email: "roberto.silva@international.com",
                phone: "+1-305-5551234",
                codigoCliente: "INT-2024-001",
                isActive: true,
                saldo: 0.00,
                direccion: "Miami, FL - USA",
                role: "cliente",
                status: "activo",
                createdAt: "2024-06-06T16:20:00.000Z",
                updatedAt: "2024-06-06T16:20:00.000Z"
              }
            ]
          },
          "lista-vacia": {
            summary: "Sistema sin usuarios registrados",
            value: []
          },
          "lista-usuarios-inactivos": {
            summary: "Incluye usuarios activos e inactivos",
            value: [
              {
                id: "333c3333-c33c-33c3-c333-333333333333",
                name: "Usuario Activo",
                email: "activo@test.com",
                phone: "+58412-1111111",
                codigoCliente: "CLI-2024-003",
                isActive: true,
                saldo: 200.00,
                direccion: "Dirección Usuario Activo",
                role: "cliente",
                status: "activo",
                createdAt: "2024-06-08T12:00:00.000Z",
                updatedAt: "2024-06-08T12:00:00.000Z"
              },
              {
                id: "444d4444-d44d-44d4-d444-444444444444",
                name: "Usuario Suspendido",
                email: "suspendido@test.com",
                phone: "+58412-2222222",
                codigoCliente: "CLI-2024-004",
                isActive: false,
                saldo: 0.00,
                direccion: "Dirección Usuario Suspendido",
                role: "cliente",
                status: "suspendido",
                createdAt: "2024-06-05T10:00:00.000Z",
                updatedAt: "2024-06-07T15:30:00.000Z"
              }
            ]
          }
        }
      }
    }
  })
  async findAll() {
    return await this.usersService.findAll();
  }

  @Get('test-db')
  @ApiOperation({ 
    summary: 'Probar conexión a PostgreSQL',
    description: 'Endpoint de prueba para verificar que la aplicación se conecte correctamente a PostgreSQL y mostrar usuarios'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Conexión a PostgreSQL exitosa',
    content: {
      'application/json': {
        examples: {
          "conexion-exitosa": {
            summary: "PostgreSQL funcionando correctamente",
            value: {
              success: true,
              message: "Conexión a PostgreSQL exitosa",
              database: "chatbot_backend",
              type: "postgres",
              timestamp: "2024-06-08T10:30:00.000Z",
              userCount: 5
            }
          }
        }
      }
    }
  })
  async testDatabaseConnection() {
    try {
      const users = await this.usersService.findAll();
      return {
        success: true,
        message: "Conexión a PostgreSQL exitosa",
        database: "chatbot_backend",
        type: "postgres",
        timestamp: new Date().toISOString(),
        userCount: users.length,
        users: users
      };
    } catch (error) {
      return {
        success: false,
        message: "Error de conexión a base de datos",
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener usuario por ID',
    description: 'Retorna la información completa de un usuario específico por su ID único'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID único del usuario (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuario encontrado',
    content: {
      'application/json': {
        examples: {
          "cliente-detallado": {
            summary: "Cliente con información completa",
            value: {
              success: true,
              message: "Usuario encontrado",
              data: {
                id: "550e8400-e29b-41d4-a716-446655440000",
                name: "María Alejandra González",
                email: "maria.gonzalez@empresa.com",
                phone: "+58412-7654321",
                codigoCliente: "CLI-2024-001",
                isActive: true,
                saldo: 150.75,
                direccion: "Av. Principal, Centro Comercial Plaza",
                role: "cliente",
                status: "activo",
                nombre: "María Alejandra González Pérez",
                rif: "V-12345678-9",
                direccion1: "Av. Francisco de Miranda",
                direccion2: "Torre Parque Central, Piso 8, Oficina 801",
                idpais: "VE",
                idestado: "DC",
                idciudad: "CCS",
                telefono1: "+58412-7654321",
                telefono2: "+58212-9876543",
                tienecredito: true,
                diascredito: 30,
                pagos: "contado_credito",
                fechaultimaventa: "2024-06-01T15:30:00Z",
                fechacreacion: "2024-01-15T09:00:00Z",
                redsocial1: "@mariagonzalez",
                redsocial2: "maria.gonzalez.linkedin",
                coordenadas: "10.5000,-66.9000",
                createdAt: "2024-01-15T09:00:00Z",
                updatedAt: "2024-06-08T10:00:00Z"
              }
            }
          },
          "empresa-corporativa": {
            summary: "Empresa con información fiscal completa",
            value: {
              success: true,
              message: "Empresa encontrada",
              data: {
                id: "789e0123-e45f-67g8-h901-234567890123",
                name: "CORPORACIÓN TECNOLÓGICA CA",
                email: "contacto@corptech.com.ve",
                phone: "+58212-5551234",
                codigoCliente: "EMP-2024-001",
                isActive: true,
                saldo: 5000.00,
                role: "empresa",
                status: "activo",
                nombre: "CORPORACIÓN TECNOLÓGICA VENEZOLANA CA",
                rif: "J-40123456-7",
                direccion1: "Centro Empresarial Miranda",
                direccion2: "Torre Norte, Piso 15, Oficina 1502",
                telefono1: "+58212-5551234",
                telefono2: "+58212-5555678",
                tienecredito: true,
                diascredito: 60,
                pagos: "credito_cheque_transferencia",
                esagentederetencion: true,
                esexento: false,
                createdAt: "2024-02-01T14:30:00Z",
                updatedAt: "2024-06-08T10:30:00Z"
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Usuario no encontrado',
    content: {
      'application/json': {
        examples: {
          "no-encontrado": {
            value: {
              success: false,
              message: "Usuario no encontrado",
              error: "No se encontró ningún usuario con el ID proporcionado"
            }
          }
        }
      }
    }
  })
  async findOne(@Param('id') id: string) {
    return await this.usersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Actualizar un usuario',
    description: 'Actualiza la información de un usuario existente'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del usuario a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'Datos del usuario a actualizar (campos opcionales)',
    examples: {
      'actualizar-saldo': {
        summary: 'Actualizar solo el saldo',
        value: {
          saldo: 500.00
        }
      },
      'actualizar-contacto': {
        summary: 'Actualizar información de contacto',
        value: {
          phone: '+584149876543',
          direccion: 'Nueva dirección actualizada'
        }
      },
      'desactivar-usuario': {
        summary: 'Desactivar usuario',
        value: {
          isActive: false
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuario actualizado exitosamente',
    content: {
      'application/json': {
        example: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'María González',
          email: 'maria.gonzalez@email.com',
          phone: '+584149876543',
          saldo: 500.00,
          updatedAt: '2024-06-08T11:45:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Usuario no encontrado' 
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return await this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Eliminar usuario',
    description: 'Elimina un usuario del sistema de forma permanente (usar con precaución)'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID único del usuario a eliminar',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuario eliminado exitosamente',
    content: {
      'application/json': {
        examples: {
          "eliminacion-exitosa": {
            value: {
              success: true,
              message: "Usuario eliminado exitosamente",
              data: {
                id: "550e8400-e29b-41d4-a716-446655440000",
                eliminadoEn: "2024-06-08T16:30:00Z"
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Usuario no encontrado',
    content: {
      'application/json': {
        examples: {
          "no-encontrado": {
            value: {
              success: false,
              message: "No se puede eliminar",
              error: "Usuario no encontrado o ya fue eliminado"
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Conflicto - Usuario tiene dependencias',
    content: {
      'application/json': {
        examples: {
          "tiene-pedidos": {
            value: {
              success: false,
              message: "No se puede eliminar usuario",
              error: "El usuario tiene pedidos activos asociados",
              dependencias: {
                pedidos: 5,
                facturas: 12,
                ultimaActividad: "2024-06-08T14:00:00Z"
              }
            }
          }
        }
      }
    }
  })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'Usuario eliminado exitosamente', deletedId: id };
  }

  // ============================================================================
  // ENDPOINTS ESPECÍFICOS
  // ============================================================================

  @Get('cliente/:id')
  @ApiOperation({ 
    summary: 'Obtener información de cliente',
    description: 'Retorna información específica de un cliente incluyendo estadísticas'
  })
  @ApiParam({
    name: 'id',
    description: 'ID del cliente',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Información de cliente obtenida exitosamente',
    content: {
      'application/json': {
        example: {
          cliente: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'María González',
            email: 'maria.gonzalez@email.com',
            codigoCliente: 'CLI-2024-002',
            saldo: 250.50
          },
          estadisticas: {
            totalCompras: 15,
            montoTotalGastado: 1250.75,
            ultimaCompra: '2024-06-05T14:30:00.000Z',
            promedioCompra: 83.38
          }
        }
      }
    }
  })
  async getClienteInfo(@Param('id') id: string) {
    return await this.usersService.getClienteInfo(id);
  }

  @Get('validate/:email/:codigoCliente')
  @ApiOperation({ 
    summary: 'Validar usuario por email y código de cliente',
    description: 'Valida que un usuario existe con el email y código de cliente proporcionados'
  })
  @ApiParam({
    name: 'email',
    description: 'Email del usuario',
    example: 'maria.gonzalez@email.com'
  })
  @ApiParam({
    name: 'codigoCliente',
    description: 'Código de cliente',
    example: 'CLI-2024-002'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Validación completada',
    content: {
      'application/json': {
        examples: {
          'usuario-valido': {
            summary: 'Usuario válido',
            value: {
              valid: true,
              user: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'María González',
                email: 'maria.gonzalez@email.com',
                codigoCliente: 'CLI-2024-002'
              }
            }
          },
          'usuario-invalido': {
            summary: 'Usuario inválido',
            value: {
              valid: false,
              message: 'Usuario no encontrado o código incorrecto'
            }
          }
        }
      }
    }
  })
  async validateUser(
    @Param('email') email: string,
    @Param('codigoCliente') codigoCliente: string
  ) {
    return await this.usersService.validateUser(email, codigoCliente);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-email/:email')
  @ApiOperation({ 
    summary: 'Buscar usuario por email',
    description: 'Busca un usuario específico por su dirección de email'
  })
  @ApiParam({
    name: 'email',
    description: 'Email del usuario a buscar',
    example: 'maria.gonzalez@email.com'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Búsqueda completada',
    content: {
      'application/json': {
        examples: {
          'usuario-encontrado': {
            summary: 'Usuario encontrado',
            value: {
              found: true,
              user: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'María González',
                email: 'maria.gonzalez@email.com',
                saldo: 250.50
              }
            }
          },
          'usuario-no-encontrado': {
            summary: 'Usuario no encontrado',
            value: {
              found: false,
              message: 'Cliente no encontrado'
            }
          }
        }
      }
    }
  })
  async findByEmail(@Param('email') email: string) {
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        return { found: false, message: 'Cliente no encontrado' };
      }
      return { found: true, user };
    } catch (error) {
      this.logger.error(`Error finding user by email: ${error.message}`);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-codigo/:codigoCliente')
  @ApiOperation({ 
    summary: 'Buscar usuario por código de cliente',
    description: 'Busca un usuario específico por su código de cliente'
  })
  @ApiParam({
    name: 'codigoCliente',
    description: 'Código de cliente a buscar',
    example: 'CLI-2024-002'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Búsqueda completada',
    content: {
      'application/json': {
        examples: {
          'usuario-encontrado': {
            summary: 'Usuario encontrado',
            value: {
              found: true,
              user: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'María González',
                codigoCliente: 'CLI-2024-002',
                saldo: 250.50
              }
            }
          },
          'usuario-no-encontrado': {
            summary: 'Usuario no encontrado',
            value: {
              found: false,
              message: 'Cliente no encontrado'
            }
          }
        }
      }
    }
  })
  async findByCodigoCliente(@Param('codigoCliente') codigoCliente: string) {
    try {
      const user = await this.usersService.findByCodigoCliente(codigoCliente);
      if (!user) {
        return { found: false, message: 'Cliente no encontrado' };
      }
      return { found: true, user };
    } catch (error) {
      this.logger.error(`Error finding user by codigoCliente: ${error.message}`);
      throw error;
    }
  }

  @Get('test-saas')
  @ApiOperation({ 
    summary: 'Test del sistema SaaS',
    description: 'Endpoint de prueba para verificar que el sistema SaaS funciona'
  })
  async testSaas() {
    return {
      message: '🚀 Sistema SaaS funcionando correctamente',
      database: 'PostgreSQL',
      timestamp: new Date().toISOString(),
      features: ['Plans', 'Subscriptions', 'Payments', 'Analytics']
    };
  }

  @Get('diagnostico')
  @ApiOperation({ 
    summary: 'Diagnóstico de conexión a base de datos',
    description: 'Verifica la conexión a PostgreSQL y muestra información del sistema'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Información de diagnóstico',
    schema: {
      type: 'object',
      properties: {
        database: {
          type: 'object',
          properties: {
            connected: { type: 'boolean' },
            type: { type: 'string' },
            host: { type: 'string' },
            port: { type: 'number' },
            database: { type: 'string' }
          }
        },
        tables: {
          type: 'object',
          properties: {
            users: { type: 'number' }
          }
        },
        timestamp: { type: 'string' }
      }
    }
  })
  async diagnostico() {
    try {
      // Verificar conexión a base de datos
      const isConnected = this.dataSource.isConnected;
      const dbOptions = this.dataSource.options;
      
      // Contar usuarios en la tabla
      let userCount = 0;
      let tablesInfo = {};
      
      try {
        const result = await this.dataSource.query('SELECT COUNT(*) as count FROM users');
        userCount = parseInt(result[0]?.count || 0);
        
        // Obtener información de tablas
        const tables = await this.dataSource.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);
        
        tablesInfo = {
          total_tables: tables.length,
          users_count: userCount,
          tables_list: tables.map(t => t.table_name)
        };
      } catch (dbError) {
        tablesInfo = { error: dbError.message };
      }
      
      return {
        status: 'success',
        database: {
          connected: isConnected,
          type: dbOptions.type,
          host: (dbOptions as any).host,
          port: (dbOptions as any).port,
          database: (dbOptions as any).database,
          username: (dbOptions as any).username
        },
        tables: tablesInfo,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      };
      
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
} 