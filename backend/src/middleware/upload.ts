import multer from 'multer';
import { AppError } from '../utils/app-error';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(AppError.badRequest('Only JPEG, PNG, WEBP, or PDF files are allowed'));
      return;
    }
    callback(null, true);
  },
}).single('file');
