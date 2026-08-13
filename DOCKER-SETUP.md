# Docker Setup para MariaDB

## Setup Súper Simple

### 1. Configurar variables de entorno

```bash
npm run setup
```

### 2. Levantar MariaDB

```bash
npm run docker:up
```

### 3. Crear las tablas

```bash
npm run db:generate
npm run db:migrate
```

### 4. (Opcional) Poblar con datos de ejemplo

```bash
npm run db:seed
```

### 5. Probar que funciona

```bash
npm run db:test
```

## Comandos Útiles

```bash
# Levantar MariaDB
npm run docker:up

# Parar MariaDB
npm run docker:down

# Ver logs
docker logs vl-survey-db

# Conectar directamente a MariaDB
docker exec -it vl-survey-db mysql -u root -p
# Password: password

# Conectar con DBeaver u otros clientes
# Host: localhost
# Puerto: 3310
# Usuario: root
# Password: password
# Base de datos: vl_survey
```

## Configuración Docker

-   **Puerto**: 3310 (mapeado desde 3306 interno)
-   **Usuario**: root
-   **Password**: password
-   **Base de datos**: vl_survey
-   **Datos persistentes**: Sí (volume Docker)

## Troubleshooting

**¿Puerto 3310 ocupado?**

```bash
# Ver qué usa el puerto
lsof -i :3310

# Cambiar puerto en docker-compose.yml
ports:
  - "3311:3306"  # Usar 3311 en su lugar
```

**¿Problemas de conexión?**

```bash
# Verificar que el contenedor esté corriendo
docker ps

# Ver logs del contenedor
docker logs vl-survey-db
```

## Conectar con DBeaver

### Configuración de conexión:

-   **Driver**: MariaDB o MySQL
-   **Host**: `localhost`
-   **Puerto**: `3310`
-   **Usuario**: `root`
-   **Password**: `password`
-   **Base de datos**: `vl_survey`

### Si aparece "Public Key Retrieval is not allowed":

1. **En la pestaña "Driver properties"** de DBeaver:

    - Buscar `allowPublicKeyRetrieval`
    - Cambiar a `true`

2. **O añadir a la URL**:

    ```
    jdbc:mysql://localhost:3310/vl_survey?allowPublicKeyRetrieval=true&useSSL=false
    ```

3. **Si sigue fallando**, reiniciar el contenedor:
    ```bash
    npm run docker:down
    npm run docker:up
    ```

¡Eso es todo! Con 3 comandos tienes MariaDB funcionando.
