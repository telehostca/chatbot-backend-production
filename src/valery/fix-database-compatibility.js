/**
 * Arreglos para compatibilidad entre SQLite y PostgreSQL en las búsquedas
 * 
 * Este script soluciona los problemas de compatibilidad entre SQLite y PostgreSQL,
 * especialmente en las funciones de búsqueda mejoradas.
 */

const { Client } = require('pg');
const sqlite3 = require('sqlite3');

/**
 * Determina el tipo de base de datos y ajusta la consulta SQL en consecuencia
 */
function adaptarConsultaParaDb(consulta, tipoBD = 'sqlite') {
  if (tipoBD === 'postgres' || tipoBD === 'postgresql') {
    // La consulta ya está optimizada para PostgreSQL, devolverla tal cual
    return consulta;
  } else {
    // Adaptar para SQLite
    let consultaAdaptada = consulta;
    
    // Reemplazar ILIKE por un equivalente en SQLite
    consultaAdaptada = consultaAdaptada.replace(/ILIKE/g, 'LIKE');
    
    // Reemplazar SPLIT_PART con una alternativa para SQLite
    consultaAdaptada = consultaAdaptada.replace(/SPLIT_PART\(LOWER\(nombre\), ' ', 1\) = '([^']+)'/g, 
      "LOWER(nombre) LIKE '$1%'");
    
    // Reemplazar SIMILARITY por LIKE con comodines (simplificado)
    if (consultaAdaptada.includes('SIMILARITY')) {
      consultaAdaptada = consultaAdaptada.replace(/SIMILARITY\(LOWER\(nombre\), '([^']+)'\) AS sim_score/g,
        "0 AS sim_score");
      consultaAdaptada = consultaAdaptada.replace(/SIMILARITY\(LOWER\(nombre\), '[^']+'\) > [0-9.]+/g,
        "LOWER(nombre) LIKE '%' || REPLACE(LOWER('$1'), ' ', '%') || '%'");
    }
    
    return consultaAdaptada;
  }
}

/**
 * Detecta mejor los términos de búsqueda múltiples
 */
function detectMultipleSearchTerms(searchTerm) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return [];
  }
  
  // Detectar conjunciones para separar múltiples búsquedas
  const conjunctions = /\s+(y|tambien|también|además|ademas|con)\s+/i;
  
  if (conjunctions.test(searchTerm)) {
    // Convertir a minúsculas para mejor comparación
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    // Dividir por conjunciones
    const parts = [];
    let currentPart = '';
    
    // Separar "y" como conjunción de productos, no como parte de "y una"
    const words = lowerSearchTerm.split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      if ((word === 'y' || word === 'con') && i > 0 && i < words.length - 1) {
        // Verificar si "y" está funcionando como conjunción
        // (no al inicio y seguido de más palabras)
        parts.push(currentPart.trim());
        currentPart = '';
      } else {
        if (currentPart) currentPart += ' ';
        currentPart += word;
      }
    }
    
    if (currentPart) {
      parts.push(currentPart.trim());
    }
    
    return parts.filter(p => p.length > 2);
  }
  
  // Si no hay conjunciones claras, devolver como un solo término
  return [searchTerm];
}

/**
 * Reformatea una consulta con ILIKE para SQLite
 */
function generarConsultaCompatible(queryType, searchTerms, marca, tipoBD = 'sqlite') {
  // Normalizar términos de búsqueda
  const normalizeText = (text) => {
    if (!text) return "";
    return text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[ñç]/g, match => match === 'ñ' ? 'n' : 'c')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const normalizedSearchTerm = normalizeText(Array.isArray(searchTerms) ? searchTerms[0] : searchTerms);
  
  // Extraer palabras significativas
  const searchTermsArray = normalizedSearchTerm
    .split(' ')
    .filter(t => t && t.length > 1)
    .filter(t => !['el', 'la', 'los', 'las', 'un', 'una', 'del', 'de', 'y', 'o'].includes(t));
  
  const normalizedMarca = marca ? normalizeText(marca) : null;
  
  // Operador de comparación según el tipo de base de datos
  const LIKE_OPERATOR = (tipoBD === 'postgres' || tipoBD === 'postgresql') ? 'ILIKE' : 'LIKE';
  
  let sqlQuery = "";
  
  switch (queryType) {
    case 'consulta_inventario_termino_simple':
      sqlQuery = `SELECT * FROM inventario WHERE LOWER(nombre) ${LIKE_OPERATOR} '%${normalizedSearchTerm}%' AND existenciaunidad > 0`;
      if (normalizedMarca) {
        sqlQuery += ` AND LOWER(nombre) ${LIKE_OPERATOR} '%${normalizedMarca}%'`;
      }
      sqlQuery += ` ORDER BY existenciaunidad DESC LIMIT 15`;
      break;
      
    case 'consulta_inventario':
    case 'consulta_inventario_palabras_multiples':
      if (searchTermsArray.length > 0) {
        const conditions = searchTermsArray.map(term => `LOWER(nombre) ${LIKE_OPERATOR} '%${term}%'`).join(' OR ');
        sqlQuery = `SELECT * FROM inventario WHERE (${conditions}) AND existenciaunidad > 0`;
        if (normalizedMarca) {
          sqlQuery += ` AND LOWER(nombre) ${LIKE_OPERATOR} '%${normalizedMarca}%'`;
        }
        
        // Calcular puntuación para ordenamiento (compatible con ambas BD)
        if (tipoBD === 'postgres' || tipoBD === 'postgresql') {
          // PostgreSQL puede usar CASE más complejo
          const scoreCalc = searchTermsArray.map((term, index) => 
            `CASE WHEN LOWER(nombre) ${LIKE_OPERATOR} '%${term}%' THEN ${10 * (searchTermsArray.length - index)} ELSE 0 END`
          ).join(' + ');
          sqlQuery += `, (${scoreCalc}) AS match_score`;
        } else {
          // SQLite no tiene una buena forma de hacer esto, así que ordenamos por existencia
          sqlQuery += `, 0 AS match_score`;
        }
        
        sqlQuery += ` ORDER BY match_score DESC, existenciaunidad DESC LIMIT 15`;
      } else {
        sqlQuery = `SELECT * FROM inventario WHERE existenciaunidad > 0`;
        if (normalizedMarca) {
          sqlQuery += ` AND LOWER(nombre) ${LIKE_OPERATOR} '%${normalizedMarca}%'`;
        }
        sqlQuery += ` ORDER BY existenciaunidad DESC LIMIT 15`;
      }
      break;
      
    case 'consulta_inventario_por_categoria':
      sqlQuery = `SELECT * FROM inventario WHERE (LOWER(nombre) ${LIKE_OPERATOR} '%${normalizedSearchTerm}%') AND existenciaunidad > 0 ORDER BY existenciaunidad DESC LIMIT 20`;
      break;
      
    case 'consulta_inventario_fuzzy':
      // Fuzzy search simplificado compatible con SQLite
      if (tipoBD === 'postgres' || tipoBD === 'postgresql') {
        sqlQuery = `SELECT *, SIMILARITY(LOWER(nombre), '${normalizedSearchTerm}') AS sim_score 
                     FROM inventario 
                     WHERE SIMILARITY(LOWER(nombre), '${normalizedSearchTerm}') > 0.3 
                     AND existenciaunidad > 0 
                     ORDER BY sim_score DESC LIMIT 15`;
      } else {
        // Versión para SQLite usando LIKE con comodines entre palabras
        const fuzzyPattern = normalizedSearchTerm.split(' ').join('%');
        sqlQuery = `SELECT *, 0 AS sim_score 
                     FROM inventario 
                     WHERE LOWER(nombre) LIKE '%${fuzzyPattern}%' 
                     AND existenciaunidad > 0 
                     ORDER BY existenciaunidad DESC LIMIT 15`;
      }
      break;
  }
  
  return sqlQuery;
}

/**
 * Procesa consulta de búsqueda de múltiples productos
 */
function procesarBusquedaMultiProducto(busqueda) {
  // Detectar si hay múltiples productos en la búsqueda
  const terminos = detectMultipleSearchTerms(busqueda);
  
  if (terminos.length > 1) {
    return {
      esMultiple: true,
      terminos: terminos
    };
  }
  
  return {
    esMultiple: false,
    terminos: [busqueda]
  };
}

// Exportar funciones
module.exports = {
  adaptarConsultaParaDb,
  detectMultipleSearchTerms,
  generarConsultaCompatible,
  procesarBusquedaMultiProducto
}; 