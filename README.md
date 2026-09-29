<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# SimCo Restaurant Stats API

<p align="center">
  Una API RESTful construida con NestJS para analizar estadísticas de restaurantes y oficinas de ventas corporativas del juego SimCompanies. 
  Esta aplicación permite sincronizar tus datos desde la API oficial de SimCompanies y realizar análisis detallados de mercado y rendimiento.
</p>

<p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://nodejs.org" target="_blank"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node Version" /></a>
<a href="https://www.postgresql.org/" target="_blank"><img src="https://img.shields.io/badge/PostgreSQL-15+-blue.svg" alt="PostgreSQL" /></a>
<a href="https://typeorm.io/" target="_blank"><img src="https://img.shields.io/badge/TypeORM-0.3.x-orange.svg" alt="TypeORM" /></a>
</p>

## 📋 Descripción

**SimCo Restaurant Stats API** es una aplicación backend diseñada para jugadores de [SimCompanies](https://www.simcompanies.com) que desean analizar el rendimiento de sus restaurantes y el comportamiento del mercado de órdenes de venta.

### 🎯 Principales funcionalidades:

- **Sincronización de datos**: Obtiene automáticamente datos de restaurantes y órdenes de venta desde la API oficial de SimCompanies
- **Análisis de restaurantes**: Rastrea métricas como rating, ocupancy, revenue, costs y reviews de restaurantes
- **Análisis de mercado**: Monitorea precios, demanda y tendencias de recursos en el mercado
- **Gestión de edificios**: Administra información de oficinas de ventas y restaurantes
- **APIs de análisis**: Proporciona endpoints especializados para obtener estadísticas y tendencias

### 🏢 Casos de uso:

- **Optimización de restaurantes**: Analiza el rendimiento histórico para mejorar la rentabilidad
- **Investigación de mercado**: Estudia tendencias de precios y demanda de recursos
- **Toma de decisiones**: Obtén insights basados en datos para estrategias comerciales
- **Monitoreo automatizado**: Seguimiento continuo del rendimiento de múltiples edificios

## 🛠️ Tecnologías

### Backend Framework

- **[NestJS](https://nestjs.com/)** - Framework de Node.js progresivo para aplicaciones escalables
- **[TypeScript](https://www.typescriptlang.org/)** - Superset tipado de JavaScript
- **[Node.js](https://nodejs.org/)** v18+ - Runtime de JavaScript

### Base de datos

- **[PostgreSQL](https://www.postgresql.org/)** - Base de datos relacional robusta
- **[TypeORM](https://typeorm.io/)** - ORM para TypeScript y JavaScript

### Gestión de dependencias

- **[pnpm](https://pnpm.io/)** - Gestor de paquetes eficiente y rápido

### Librerías principales

- **[@nestjs/axios](https://www.npmjs.com/package/@nestjs/axios)** - Cliente HTTP para integraciones con APIs externas
- **[@nestjs/config](https://www.npmjs.com/package/@nestjs/config)** - Gestión de configuración y variables de entorno
- **[joi](https://joi.dev/)** - Validación de esquemas de datos
- **[rxjs](https://rxjs.dev/)** - Programación reactiva con observables

### Desarrollo y calidad de código

- **[ESLint](https://eslint.org/)** - Linter para identificar y arreglar problemas en el código
- **[Prettier](https://prettier.io/)** - Formateador de código automático
- **[Jest](https://jestjs.io/)** - Framework de testing

## 🏗️ Arquitectura del proyecto

```
src/
├── auth/                    # Módulo de autenticación
│   ├── controllers/         # Controladores de auth
│   ├── entities/           # Entidades de tokens
│   └── services/           # Servicios de autenticación
├── database/               # Configuración de base de datos
│   ├── migrations/         # Migraciones de TypeORM
│   └── typeorm.config.ts   # Configuración de TypeORM
├── health/                 # Health checks de la API
├── restaurant-stats/       # Módulo de estadísticas de restaurantes
│   ├── controllers/        # Endpoints de restaurantes
│   ├── entities/          # Entidades de restaurantes y edificios
│   └── services/          # Lógica de negocio de restaurantes
├── sales-orders-stats/     # Módulo de órdenes de venta
│   ├── controllers/        # Endpoints de órdenes de venta
│   ├── entities/          # Entidades de órdenes de venta
│   ├── interfaces/        # Interfaces de análisis
│   └── services/          # Lógica de negocio de órdenes
├── app.module.ts          # Módulo principal
├── config.ts              # Configuraciones globales
├── enviroments.ts         # Configuración de entornos
└── main.ts               # Punto de entrada de la aplicación
```

## 🚀 Configuración del proyecto

### Prerrequisitos

- Node.js v18 o superior
- PostgreSQL 15 o superior
- pnpm (recomendado) o npm
- Cuenta activa en SimCompanies

### Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Base de datos
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/simco_restaurant_stats

# Credenciales de SimCompanies
SIMCOMPANIES_EMAIL=tu_email@ejemplo.com
SIMCOMPANIES_PASSWORD=tu_contraseña
SIMCOMPANIES_TIMEZONE_OFFSET=0
# Clave base64 de 32 bytes, por ejemplo: openssl rand -base64 32
SIMCOMPANIES_SESSION_ENCRYPTION_KEY=una_clave_base64_de_32_bytes

# Configuración opcional
NODE_ENV=dev

# Bot privado de Telegram (opcional)
TELEGRAM_BOT_ENABLED=false
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_USER_IDS=
```

### Bot privado de Telegram

El bot consulta las estadísticas que ya están sincronizadas en la base de
datos; no solicita datos a SimCompanies cuando respondes un mensaje.

1. Abre `@BotFather` en Telegram, ejecuta `/newbot` y conserva el token que
   entrega en privado.
2. Obtén tu ID numérico de Telegram y configura las variables en `.env.dev`:

   ```bash
   TELEGRAM_BOT_ENABLED=true
   TELEGRAM_BOT_TOKEN=token_entregado_por_botfather
   TELEGRAM_ALLOWED_USER_IDS=tu_id_numerico
   ```

3. Asegúrate de sincronizar primero edificios y estadísticas con los endpoints
   de la API. Después inicia una conversación con el bot y envía
   `/restaurantes`.

El bot usa _long polling_, por lo que no necesita una URL pública ni HTTPS,
pero solo una instancia de la API puede usar el mismo token a la vez.

### Instalación

```bash
# Clonar el repositorio
$ git clone <url-del-repositorio>
$ cd simco-stats-api

# Instalar dependencias
$ pnpm install

# Ejecutar migraciones de base de datos
$ pnpm run migration:run
```

### Compilar y ejecutar el proyecto

```bash
# Desarrollo
$ pnpm run start

# Modo watch (recompilación automática)
$ pnpm run start:dev

# Modo producción
$ pnpm run start:prod
```

### Migraciones de base de datos

```bash
# Generar nueva migración
$ pnpm run migration:gen --name=nombre-de-la-migracion

# Ejecutar migraciones pendientes
$ pnpm run migration:run

# Sincronizar permisos, rol y usuario SUPER_ADMIN
$ pnpm run seed:dev

# Revertir última migración
$ pnpm run migration:revert

# Mostrar estado de migraciones
$ pnpm run migration:show
```

## 📊 API Endpoints

### Autenticación

- `POST /auth/login` - Iniciar sesión en SimCompanies

### Health Check

- `GET /health` - Estado de la aplicación

### Restaurantes

- `GET /restaurant-stats` - Últimas estadísticas agrupadas por restaurante
- `GET /restaurant-stats/:id` - Estadísticas de un restaurante específico
- `POST /restaurant-stats/sync/:buildingId` - Sincronizar un restaurante
- `POST /restaurant-stats/sync-all` - Sincronizar todos los restaurantes

### Edificios

- `GET /buildings` - Lista de todos los edificios
- `GET /buildings/:id` - Información de un edificio específico
- `POST /buildings/sync` - Sincronizar edificios desde SimCompanies

### Órdenes de venta

- `GET /sale-orders` - Lista de órdenes de venta
- `GET /sale-orders/:id` - Orden específica por ID
- `GET /sale-orders/status/resolved` - Órdenes resueltas
- `GET /sale-orders/status/pending` - Órdenes pendientes
- `GET /sale-orders/building/:buildingId` - Órdenes por edificio
- `POST /sale-orders/sync/:buildingId` - Sincronizar órdenes de un edificio
- `POST /sale-orders/sync-all` - Sincronizar todas las órdenes

### Análisis de mercado

- `GET /sale-orders/analytics/prices/:date` - Precios promedio por fecha
- `GET /sale-orders/analytics/demand/:date` - Demanda total por fecha
- `GET /sale-orders/analytics/market-summary/:date` - Resumen completo del mercado
- `GET /sale-orders/analytics/market-data/:startDate/:endDate` - Datos históricos
- `GET /sale-orders/analytics/top-demand/:date` - Recursos más demandados
- `GET /sale-orders/analytics/stats` - Estadísticas generales

## 📈 Ejemplos de uso

### Obtener precios promedio del día

```bash
curl http://localhost:3000/sale-orders/analytics/prices/2025-06-17
```

Respuesta:

```json
{
  "date": "2025-06-17",
  "total_sale_orders_analyzed": 45,
  "resources": [
    {
      "resource_kind": 91,
      "average_price": "125000.00",
      "average_quality_bonus": "2.2816",
      "total_orders": 15,
      "total_amount": 45,
      "min_price": "120000",
      "max_price": "130000"
    }
  ]
}
```

### Sincronizar datos de restaurante

```bash
curl -X POST http://localhost:3000/restaurant-stats/sync/12345678
```

### Obtener demanda de recursos

```bash
curl http://localhost:3000/sale-orders/analytics/demand/2025-06-17
```

## 🧪 Tests

```bash
# Tests unitarios
$ pnpm run test

# Tests e2e
$ pnpm run test:e2e

# Cobertura de tests
$ pnpm run test:cov
```

## 📝 Desarrollo

### Linting y formateo

```bash
# Ejecutar linter
$ pnpm run lint

# Formatear código
$ pnpm run format
```

### Estructura de commits

Se recomienda usar commits descriptivos siguiendo el formato:

```
tipo(scope): descripción

feat(auth): añadir autenticación con SimCompanies
fix(database): corregir migración de sale_orders
docs(readme): actualizar documentación de API
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para preguntas, problemas o sugerencias:

- Abre un [issue](../../issues) en GitHub
- Contacta al equipo de desarrollo

## 🔄 Changelog

### v1.0.0

- ✨ Sincronización inicial de datos de restaurantes
- ✨ Análisis de órdenes de venta
- ✨ APIs de análisis de mercado
- ✨ Gestión de edificios y oficinas de ventas
- ✨ Sistema de autenticación con SimCompanies
