import 'reflect-metadata';

process.env.API_PORT ??= '3000';
process.env.API_VERSION ??= '1';
process.env.SWAGGER_ENABLE ??= 'false';
process.env.DATABASE_URL ??= 'mongodb://localhost:27017/t-extension-test';
process.env.HEALTH_TOKEN ??= 'health-token';
process.env.ACCESS_SECRET ??= 'access-secret';
process.env.REFRESH_SECRET ??= 'refresh-secret';
process.env.REDIS_HOST ??= 'localhost';
process.env.REDIS_PORT ??= '6379';
process.env.REDIS_TLS ??= '0';
