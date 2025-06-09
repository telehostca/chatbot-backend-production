import { Controller, Get, Post, Body, Query, Logger } from '@nestjs/common';
import { ContactsService, ContactFilter, ContactInfo } from '../services/contacts.service';

@Controller('notifications/contacts')
export class ContactsController {
  private readonly logger = new Logger(ContactsController.name);

  constructor(private readonly contactsService: ContactsService) {}

  /**
   * Obtener estadísticas de contactos
   */
  @Get('stats')
  async getContactStats() {
    try {
      const stats = await this.contactsService.getContactStats();
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      this.logger.error('Error obteniendo estadísticas de contactos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener filtros de audiencia predefinidos
   */
  @Get('audience-filters')
  getAudienceFilters() {
    try {
      const filters = this.contactsService.getAudienceFilters();
      return {
        success: true,
        data: filters
      };
    } catch (error) {
      this.logger.error('Error obteniendo filtros de audiencia:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar contactos con filtros
   */
  @Post('search')
  async searchContacts(@Body() filters: ContactFilter) {
    try {
      const contacts = await this.contactsService.getFilteredContacts(filters);
      return {
        success: true,
        data: contacts,
        total: contacts.length
      };
    } catch (error) {
      this.logger.error('Error buscando contactos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener contactos por audiencia predefinida
   */
  @Get('by-audience')
  async getContactsByAudience(
    @Query('audience') audience: string,
    @Query('chatbotIds') chatbotIds?: string
  ) {
    try {
      const chatbotIdArray = chatbotIds ? chatbotIds.split(',') : undefined;
      const contacts = await this.contactsService.getContactsByAudience(audience, chatbotIdArray);
      
      return {
        success: true,
        data: contacts,
        total: contacts.length,
        audience
      };
    } catch (error) {
      this.logger.error('Error obteniendo contactos por audiencia:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validar números de teléfono
   */
  @Post('validate-phones')
  async validatePhoneNumbers(@Body() { phoneNumbers }: { phoneNumbers: string[] }) {
    try {
      const validation = this.contactsService.validatePhoneNumbers(phoneNumbers);
      return {
        success: true,
        data: validation
      };
    } catch (error) {
      this.logger.error('Error validando números de teléfono:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener contactos por lista de teléfonos
   */
  @Post('by-phones')
  async getContactsByPhones(@Body() { phoneNumbers }: { phoneNumbers: string[] }) {
    try {
      const contacts = await this.contactsService.getContactsByPhoneNumbers(phoneNumbers);
      return {
        success: true,
        data: contacts,
        total: contacts.length
      };
    } catch (error) {
      this.logger.error('Error obteniendo contactos por teléfonos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Vista previa de contactos para una notificación
   */
  @Post('preview')
  async previewNotificationContacts(@Body() payload: {
    audience: string;
    chatbotIds?: string[];
    customFilters?: ContactFilter;
    phoneNumbers?: string[];
  }) {
    try {
      let contacts: ContactInfo[] = [];

      if (payload.phoneNumbers && payload.phoneNumbers.length > 0) {
        // Lista específica de teléfonos
        contacts = await this.contactsService.getContactsByPhoneNumbers(payload.phoneNumbers);
      } else if (payload.customFilters) {
        // Filtros personalizados
        contacts = await this.contactsService.getFilteredContacts(payload.customFilters);
      } else {
        // Audiencia predefinida
        contacts = await this.contactsService.getContactsByAudience(payload.audience, payload.chatbotIds);
      }

      // Estadísticas de la vista previa
      const stats = {
        total: contacts.length,
        authenticated: contacts.filter(c => c.isAuthenticated).length,
        newClients: contacts.filter(c => c.isNewClient).length,
        recentActivity: contacts.filter(c => {
          if (!c.lastActivity) return false;
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return c.lastActivity >= weekAgo;
        }).length
      };

      return {
        success: true,
        data: {
          contacts: contacts.slice(0, 50), // Solo mostrar primeros 50 para preview
          stats,
          hasMore: contacts.length > 50
        }
      };
    } catch (error) {
      this.logger.error('Error generando vista previa de contactos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
} 