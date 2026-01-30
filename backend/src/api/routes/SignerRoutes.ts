import { Router } from 'express';
import { SignerController } from '../controllers/SignerController';
import { uploadMiddleware } from '../middlewares/UploadMiddleware';

const signerRoutes = Router();
const signerController = new SignerController();

// Definição da rota POST /sign
// uploadMiddleware.fields configura que esperamos 2 arquivos com nomes específicos: 'pdf' e 'certificate'
signerRoutes.post(
  '/',
  uploadMiddleware.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'certificate', maxCount: 1 }
  ]),
  (req, res, next) => signerController.sign(req, res, next)
);

// 2. Rota de Preview (Gera imagem da página)
signerRoutes.post(
  '/preview',
  uploadMiddleware.fields([
    { name: 'pdf', maxCount: 1 } // Só precisa do PDF, sem certificado
  ]),
  (req, res, next) => signerController.preview(req, res, next)
);

// 3. Rota de Assinatura em Lote (Batch)
signerRoutes.post(
  '/batch',
  uploadMiddleware.fields([
    { name: 'pdfs', maxCount: 20 }, // Aceita até 20 PDFs de uma vez
    { name: 'certificate', maxCount: 1 }
  ]),
  (req, res, next) => signerController.signBatch(req, res, next)
);

export { signerRoutes };