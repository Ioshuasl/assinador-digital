import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { signerRoutes } from './api/routes/SignerRoutes'; // <--- Importou a rota
import { errorMiddleware } from './api/middlewares/ErrorMiddleware'; // <--- Importou o erro
import { converterRoutes } from './api/routes/ConverterRoutes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Para ler forms normais se precisar

// Health Check
app.get('/', (req, res) => {
  res.json({ status: 'Online', message: 'API Assinador Digital v1.0' });
});

// Rotas da API
app.use('/api/v1/sign', signerRoutes); // <--- A rota final será POST http://localhost:3000/api/v1/sign
app.use('/api/v1/convert', converterRoutes); // <--- Adicione esta linha

// Middleware de tratamento de erros (SEMPRE POR ÚLTIMO)
app.use(errorMiddleware); 

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});