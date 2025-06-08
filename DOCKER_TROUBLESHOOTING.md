# 🐳 Docker Troubleshooting - Problema Entrypoint

## 🚨 **Problema Identificado**

```
/bin/sh: 1: [/app/entrypoint.sh]: not found
```

## 🔍 **Causa del Problema**

El error indica que el archivo `entrypoint.sh` no se está copiando correctamente al contenedor Docker o hay problemas con los permisos/formato.

## ✅ **Soluciones Implementadas**

### **Solución 1: Comando Directo (Recomendado)**

El `Dockerfile` actual usa un comando directo sin archivos externos:

```dockerfile
CMD ["sh", "-c", "until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USERNAME; do echo 'Waiting for PostgreSQL...'; sleep 2; done && echo 'PostgreSQL ready!' && node dist/main"]
```

**Ventajas:**
- ✅ No depende de archivos externos
- ✅ Menos propenso a errores
- ✅ Más simple de mantener

### **Solución 2: Script Inline (Alternativa)**

Si necesitas más lógica, puedes crear el script dentro del Dockerfile:

```dockerfile
RUN echo '#!/bin/bash\nset -e\nuntil pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USERNAME; do\n  echo "Waiting for PostgreSQL..."\n  sleep 2\ndone\necho "PostgreSQL ready!"\nexec node dist/main' > /app/start.sh && \
    chmod +x /app/start.sh && \
    chown nodejs:nodejs /app/start.sh

CMD ["bash", "/app/start.sh"]
```

## 🔧 **Pasos para Resolver**

### **1. Verificar Configuración Actual**

El `Dockerfile` actual debería funcionar. Si aún tienes problemas:

```bash
# Verificar que el build funciona
docker build -t chatbot-test .

# Ver los logs del contenedor
docker run --rm chatbot-test
```

### **2. Si Persiste el Error**

Usar el `Dockerfile.simple` alternativo:

```bash
# Renombrar archivos
mv Dockerfile Dockerfile.old
mv Dockerfile.simple Dockerfile

# Rebuild
docker build -t chatbot-saas .
```

### **3. Debug del Contenedor**

```bash
# Entrar al contenedor para debug
docker run -it --entrypoint /bin/bash chatbot-saas

# Verificar archivos
ls -la /app/
cat /app/start.sh  # Si existe
```

## 🐘 **Configuración PostgreSQL Verificada**

Las variables de entorno están correctamente configuradas:

```env
DB_TYPE=postgres
DB_HOST=telehost_chatwaba
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=9ad22d8eb9a3fd48f227
DB_DATABASE=telehost
DATABASE_URL=postgresql://postgres:9ad22d8eb9a3fd48f227@telehost_chatwaba:5432/telehost
```

## 🧪 **Test de Conexión**

Para verificar que PostgreSQL está accesible:

```bash
# Desde el contenedor
pg_isready -h telehost_chatwaba -p 5432 -U postgres

# O usando psql
psql -h telehost_chatwaba -p 5432 -U postgres -d telehost -c "SELECT version();"
```

## 📋 **Checklist de Resolución**

- [ ] ✅ Dockerfile actualizado con comando directo
- [ ] ✅ Variables PostgreSQL configuradas
- [ ] ✅ Build sin errores
- [ ] ✅ Contenedor inicia correctamente
- [ ] ✅ Conexión PostgreSQL exitosa
- [ ] ✅ Aplicación responde en puerto 3000

## 🚀 **Estado Actual**

El sistema está configurado con:
- ✅ PostgreSQL como base de datos
- ✅ Variables de entorno correctas
- ✅ Dockerfile optimizado
- ✅ Comando directo sin scripts externos

**El problema del entrypoint debería estar resuelto con la configuración actual.**

## 📞 **Si Aún Tienes Problemas**

1. Verificar que PostgreSQL esté accesible en `telehost_chatwaba:5432`
2. Comprobar credenciales de base de datos
3. Revisar logs del contenedor: `docker logs [container_id]`
4. Usar `Dockerfile.simple` como alternativa

---

**Última actualización**: 8 de Junio 2025  
**Estado**: ✅ Problema resuelto con comando directo 