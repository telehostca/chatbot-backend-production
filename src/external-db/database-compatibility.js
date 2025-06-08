/**
 * Database Compatibility Layer
 * 
 * Clase para manejar la compatibilidad entre diferentes tipos de bases de datos
 * (SQLite, PostgreSQL, etc.) y procesar términos de búsqueda múltiples.
 */

class DatabaseCompatibility {
  /**
   * Detecta el tipo de base de datos basado en la configuración
   */
  static detectDbType(dbConfig) {
    console.log('🔍 Detectando tipo de base de datos:', dbConfig);
    
    if (!dbConfig) return 'sqlite'; // Por defecto
    
    // Si es un string, verificar si contiene pistas del tipo de BD
    if (typeof dbConfig === 'string') {
      const configStr = dbConfig.toLowerCase();
      
      if (configStr.includes('postgres')) return 'postgres';
      if (configStr.includes('mysql')) return 'mysql';
      if (configStr.includes('sqlite')) return 'sqlite';
      
      // Si no hay pistas claras, asumir SQLite
      return 'sqlite';
    }
    
    // Si es un objeto, buscar en sus propiedades
    if (typeof dbConfig === 'object') {
      const type = dbConfig.type || dbConfig.dialect;
      
      if (type) {
        const typeStr = type.toLowerCase();
        if (typeStr.includes('postgres')) return 'postgres';
        if (typeStr.includes('mysql')) return 'mysql';
        if (typeStr.includes('sqlite')) return 'sqlite';
      }
    }
    
    // Por defecto, asumir SQLite
    return 'sqlite';
  }
  
  /**
   * Procesa términos de búsqueda múltiples separados por conjunciones
   */
  static processSearchTerms(searchTerm) {
    if (!searchTerm) {
      return { isMultiTerm: false, terms: [] };
    }
    
    // Normalizar el término de búsqueda
    const normalizedTerm = searchTerm.toLowerCase().trim();
    
    // Detectar conjunciones comunes
    const conjunctions = ['y', 'con', 'and'];
    let terms = [];
    let isMultiTerm = false;
    
    // Verificar si hay alguna conjunción y dividir por ella
    for (const conjunction of conjunctions) {
      if (normalizedTerm.includes(` ${conjunction} `)) {
        terms = normalizedTerm
          .split(` ${conjunction} `)
          .map(term => term.trim())
          .filter(term => term.length > 0);
        
        isMultiTerm = true;
        break;
      }
    }
    
    // Si no se encontraron conjunciones, tratar como un solo término
    if (!isMultiTerm) {
      terms = [normalizedTerm];
    }
    
    console.log(`🔍 Términos procesados: ${terms.join(', ')}`);
    
    return {
      isMultiTerm,
      terms
    };
  }
  
  /**
   * Adapta una consulta SQL al tipo de base de datos especificado
   */
  static adaptQuery(query, targetDbType) {
    if (!query) return query;
    
    let adaptedQuery = query;
    
    switch (targetDbType) {
      case 'sqlite':
        // Reemplazar ILIKE por LIKE ... COLLATE NOCASE
        adaptedQuery = adaptedQuery.replace(/ILIKE\s+/gi, 'LIKE ');
        break;
        
      case 'postgres':
        // Reemplazar LIKE ... COLLATE NOCASE por ILIKE
        adaptedQuery = adaptedQuery.replace(/LIKE\s+(.*?)\s+COLLATE\s+NOCASE/gi, 'ILIKE $1');
        break;
    }
    
    return adaptedQuery;
  }
  
  /**
   * Genera una consulta SQL compatible para buscar productos
   */
  static generateProductSearchQuery(searchTerm, dbType = 'sqlite') {
    console.log(`🔧 Generando consulta de búsqueda para "${searchTerm}" en ${dbType}`);
    
    // Procesar términos múltiples
    const searchInfo = this.processSearchTerms(searchTerm);
    
    // Generar consulta SQL
    let query, params;
    
    if (searchInfo.isMultiTerm && searchInfo.terms.length > 0) {
      // Consulta para múltiples términos
      const conditions = searchInfo.terms.map(() => {
        return dbType === 'sqlite' ? 
          'LOWER(nombre) LIKE ? COLLATE NOCASE' : 
          'LOWER(nombre) ILIKE ?';
      });
      
      params = searchInfo.terms.map(term => `%${term}%`);
      
      query = `
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
        ORDER BY
          nombre ASC
        LIMIT 10
      `;
    } else {
      // Consulta para un solo término
      query = `
        SELECT
          codigo,
          nombre,
          preciounidad,
          alicuotaiva,
          existenciaunidad,
          (SELECT factorcambio FROM monedas WHERE codmoneda = '02' LIMIT 1) AS tasa_actual
        FROM inventario
        WHERE ${dbType === 'sqlite' ? 'LOWER(nombre) LIKE ? COLLATE NOCASE' : 'LOWER(nombre) ILIKE ?'}
          AND existenciaunidad > 0
        ORDER BY
          nombre ASC
        LIMIT 10
      `;
      params = [`%${searchTerm}%`];
    }
    
    return { query, params };
  }
}

module.exports = DatabaseCompatibility;
