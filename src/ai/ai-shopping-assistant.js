/**
 * AI Shopping Assistant
 * 
 * Asistente de compras con IA para mejorar la búsqueda de productos
 * y la gestión del carrito en chatbots de tipo Valery y eCommerce.
 */

class AIShoppingAssistant {
  constructor(dbService) {
    this.dbService = dbService;
    this.productContext = []; // Mantiene contexto de productos recientes
    this.maxContextSize = 20; // Máximo número de productos en contexto
  }

  /**
   * Analiza una consulta de búsqueda para extraer entidades relevantes
   */
  async analyzeSearchQuery(query) {
    console.log(`🔍 Analizando consulta: "${query}"`);
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // Extraer términos relevantes eliminando palabras comunes
    const stopwords = ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 
                       'quiero', 'dame', 'busca', 'buscar', 'por', 'para'];
    
    let searchTerms = normalizedQuery
      .split(/\s+/)
      .filter(word => !stopwords.includes(word) && word.length > 1);
    
    if (searchTerms.length === 0) {
      searchTerms = [normalizedQuery]; // Si no quedaron términos, usar la consulta completa
    }
    
    // Extraer posibles categorías
    const categories = this.extractCategories(normalizedQuery);
    
    // Extraer posibles marcas
    const brands = this.extractBrands(normalizedQuery);

    return {
      originalQuery: query,
      normalizedQuery,
      searchTerms,
      hasMultipleTerms: searchTerms.length > 1,
      intent: 'search',
      entities: {
        categories,
        brands,
        attributes: {},
        quantities: this.extractQuantities(normalizedQuery)
      }
    };
  }
  
  /**
   * Extrae posibles categorías de productos de la consulta
   */
  extractCategories(query) {
    const categories = [];
    
    const commonCategories = [
      'alimentos', 'bebidas', 'lácteos', 'limpieza', 'higiene',
      'frutas', 'verduras', 'carnes', 'pescados', 'congelados',
      'snacks', 'dulces', 'pastas', 'cereales', 'enlatados'
    ];
    
    commonCategories.forEach(category => {
      if (query.includes(category)) {
        categories.push(category);
      }
    });
    
    return categories;
  }
  
  /**
   * Extrae posibles marcas de la consulta
   */
  extractBrands(query) {
    const brands = [];
    
    const commonBrands = [
      'coca cola', 'pepsi', 'nestlé', 'bimbo', 'lala',
      'colgate', 'dove', 'knorr', 'maggi', 'barilla'
    ];
    
    commonBrands.forEach(brand => {
      if (query.includes(brand)) {
        brands.push(brand);
      }
    });
    
    return brands;
  }
  
  /**
   * Extrae cantidades mencionadas en la consulta
   */
  extractQuantities(query) {
    const quantityMatch = query.match(/(\d+)\s*(unidades|paquetes?|cajas?|botellas?|latas?)/i);
    
    if (quantityMatch) {
      return {
        value: parseInt(quantityMatch[1]),
        unit: quantityMatch[2]
      };
    }
    
    return null;
  }

  /**
   * Genera una consulta SQL mejorada basada en el análisis
   */
  generateEnhancedQuery(analysis, dbType = 'sqlite') {
    console.log('🔧 Generando consulta mejorada para tipo DB:', dbType);
    
    const conditions = [];
    const params = [];
    
    // Si hay términos múltiples, crear una condición para cada uno
    if (analysis.searchTerms && analysis.searchTerms.length > 0) {
      analysis.searchTerms.forEach(term => {
        if (dbType === 'sqlite') {
          conditions.push(`LOWER(nombre) LIKE ? COLLATE NOCASE`);
        } else {
          conditions.push(`LOWER(nombre) ILIKE ?`);
        }
        params.push(`%${term}%`);
      });
    } else {
      // Si no hay términos específicos, usar la consulta completa
      if (dbType === 'sqlite') {
        conditions.push(`LOWER(nombre) LIKE ? COLLATE NOCASE`);
      } else {
        conditions.push(`LOWER(nombre) ILIKE ?`);
      }
      params.push(`%${analysis.normalizedQuery}%`);
    }
    
    // Construir consulta SQL
    const query = `
      SELECT
        codigo,
        nombre,
        preciounidad,
        alicuotaiva,
        existenciaunidad,
        (SELECT factorcambio FROM monedas WHERE codmoneda = '02' LIMIT 1) AS tasa_actual
      FROM inventario
      WHERE ${conditions.join(' AND ')}
        AND existenciaunidad > 0
      ORDER BY nombre ASC
      LIMIT 10
    `;
    
    return { query, params };
  }

  /**
   * Actualiza el contexto de productos con resultados de búsqueda
   */
  updateProductContext(results, query) {
    if (!results || results.length === 0) return;
    
    // Añadir productos al contexto con la consulta que los generó
    const productsWithContext = results.map(product => ({
      ...product,
      searchQuery: query,
      timestamp: Date.now()
    }));
    
    this.productContext = [...productsWithContext, ...this.productContext]
      .slice(0, this.maxContextSize);
    
    console.log(`✅ Contexto de productos actualizado con ${results.length} productos`);
  }

  /**
   * Analiza una acción de carrito para identificar producto y cantidad
   */
  async analyzeCartAction(action) {
    const normalizedAction = action.toLowerCase();
    
    // Determinar tipo de acción
    let actionType = 'unknown';
    if (normalizedAction.includes('agregar') || normalizedAction.includes('añadir')) {
      actionType = 'agregar';
    } else if (normalizedAction.includes('quitar') || normalizedAction.includes('eliminar')) {
      actionType = 'eliminar';
    }
    
    // Extraer cantidad
    let quantity = 1;
    const quantityMatch = normalizedAction.match(/(\d+)/);
    if (quantityMatch) {
      quantity = parseInt(quantityMatch[1]);
    }
    
    console.log(`🛒 Acción de carrito analizada: ${actionType}, cantidad: ${quantity}`);
    
    return {
      action: actionType,
      quantity,
      originalText: action
    };
  }
}

module.exports = AIShoppingAssistant;
