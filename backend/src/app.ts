import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// --- NOVAS IMPORTAÇÕES ---
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger';
// -------------------------

import { signerRoutes } from './api/routes/SignerRoutes';
import { converterRoutes } from './api/routes/ConverterRoutes';
import { errorMiddleware } from './api/middlewares/ErrorMiddleware';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/', (req, res) => {
  res.json({ status: 'Online', message: 'API Assinador Digital v1.0' });
});

// --- ROTA DE DOCUMENTAÇÃO SWAGGER ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
console.log('📄 Swagger disponível em http://localhost:3000/api-docs');
console.log('📄 Swagger disponível em http://192.168.1.140:3000/api-docs');
// -------------------------------------

// Rotas da API
app.use('/api/v1/sign', signerRoutes);
app.use('/api/v1/convert', converterRoutes);

// Middleware de tratamento de erros (SEMPRE POR ÚLTIMO)
app.use(errorMiddleware);

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Acessível na rede via: http://192.168.1.140:${PORT}`);
});