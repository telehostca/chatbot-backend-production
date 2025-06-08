#!/usr/bin/env node

/**
 * 🔧 Script de Fixes Rápidos para Frontend
 * Corrige múltiples problemas encontrados
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Aplicando fixes al frontend...');

// 1. Fix App.jsx - Agregar basename="/admin"
const appPath = path.join(__dirname, 'frontend/src/App.jsx');
let appContent = fs.readFileSync(appPath, 'utf8');

if (!appContent.includes('basename="/admin"')) {
  appContent = appContent.replace(
    '<Router>',
    '<Router basename="/admin">'
  );
  fs.writeFileSync(appPath, appContent);
  console.log('✅ App.jsx: Agregado basename="/admin"');
}

// 2. Fix index.html - Corregir favicon
const indexPath = path.join(__dirname, 'frontend/index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

if (indexContent.includes('href="/vite.svg"')) {
  indexContent = indexContent.replace(
    'href="/vite.svg"',
    'href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>🤖</text></svg>"'
  );
  fs.writeFileSync(indexPath, indexContent);
  console.log('✅ index.html: Corregido favicon');
}

// 3. Fix Sessions.jsx - Manejo seguro de undefined
const sessionsPath = path.join(__dirname, 'frontend/src/pages/Sessions.jsx');
let sessionsContent = fs.readFileSync(sessionsPath, 'utf8');

// Agregar validación para response.meta
if (!sessionsContent.includes('response.meta?.totalPages')) {
  sessionsContent = sessionsContent.replace(
    'setTotalPages(response.meta.totalPages);',
    'setTotalPages(response.meta?.totalPages || 1);'
  );
  sessionsContent = sessionsContent.replace(
    'setTotal(response.meta.total);',
    'setTotal(response.meta?.total || 0);'
  );
  sessionsContent = sessionsContent.replace(
    'Math.min(currentPage * 10, response.meta.total)',
    'Math.min(currentPage * 10, response.meta?.total || 0)'
  );
  
  // Fix para el map de sessions
  if (!sessionsContent.includes('sessions?.length')) {
    sessionsContent = sessionsContent.replace(
      '{sessions.map(',
      '{(sessions || []).map('
    );
  }
  
  fs.writeFileSync(sessionsPath, sessionsContent);
  console.log('✅ Sessions.jsx: Agregado manejo seguro de undefined');
}

// 4. Fix Templates.jsx - Similar fix
const templatesPath = path.join(__dirname, 'frontend/src/pages/Templates.jsx');
if (fs.existsSync(templatesPath)) {
  let templatesContent = fs.readFileSync(templatesPath, 'utf8');
  
  // Cambiar la API que está fallando
  if (templatesContent.includes('/admin/multi-tenant/notifications')) {
    templatesContent = templatesContent.replace(
      '/admin/multi-tenant/notifications',
      '/admin/templates'
    );
    fs.writeFileSync(templatesPath, templatesContent);
    console.log('✅ Templates.jsx: Corregida ruta de API');
  }
}

// 5. Crear archivo de configuración para Vite con base path
const viteConfigPath = path.join(__dirname, 'frontend/vite.config.js');
let viteContent = fs.readFileSync(viteConfigPath, 'utf8');

if (!viteContent.includes('base: \'/admin/\'')) {
  console.log('⚠️ vite.config.js ya tiene base: "/admin/" configurado');
} else {
  console.log('✅ vite.config.js: Base path ya configurado');
}

console.log('\n🎉 Fixes aplicados exitosamente!');
console.log('\n📋 Resumen de cambios:');
console.log('  - App.jsx: basename="/admin" para React Router');
console.log('  - index.html: Favicon corregido (emoji 🤖)');
console.log('  - Sessions.jsx: Manejo seguro de undefined');
console.log('  - Templates.jsx: Ruta de API corregida');
console.log('\n🚀 Ejecuta npm run build para aplicar los cambios'); 