const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'NOVA BaaS API Engine',
    description: 'Backend-as-a-Service API Documentation with Auth, Dynamic CRUD, Storage, and API Keys',
  },
  host: 'localhost:5000',
  schemes: ['http'],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: 'Enter your Bearer token: Bearer <JWT_TOKEN>'
    },
    apiKeyAuth: {
      type: 'apiKey',
      name: 'x-api-key',
      in: 'header',
      description: 'Enter your persistent NOVA API key'
    }
  }
};

const outputFile = './swagger-output.json';
// Added storageRouter.js so file upload endpoints are auto-documented:
const endpointsFiles = [
  './server.js', 
  './recordRouter.js', 
  './apiKeyRouter.js', 
  './storageRouter.js'
];

swaggerAutogen(outputFile, endpointsFiles, doc);