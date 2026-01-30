import multer from 'multer';

// Configuração de armazenamento em Memória (RAM)
// Mais seguro para certificados, pois não escreve a chave privada no disco
const storage = multer.memoryStorage();

// Filtro de arquivos (opcional, mas recomendado)
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  if (file.fieldname === 'pdf' && file.mimetype !== 'application/pdf') {
    return cb(new Error('O arquivo deve ser um PDF.'), false);
  }
  if (file.fieldname === 'certificate' && !file.originalname.endsWith('.pfx') && !file.originalname.endsWith('.p12')) {
    return cb(new Error('O certificado deve ser do tipo .pfx ou .p12'), false);
  }
  cb(null, true);
};

export const uploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10MB por arquivo (ajuste conforme necessário)
  },
  fileFilter: fileFilter
});