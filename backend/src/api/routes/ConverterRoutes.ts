import { Router } from 'express';
import { ConverterController } from '../controllers/ConverterController';
import { uploadMiddleware } from '../middlewares/UploadMiddleware';

const converterRoutes = Router();
const converterController = new ConverterController();

converterRoutes.post(
  '/pdfa',
  uploadMiddleware.fields([
    { name: 'pdf', maxCount: 1 }
  ]),
  (req, res, next) => converterController.convertToPdfA(req, res, next)
);

export { converterRoutes };