import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { badRequest } from '../../lib/http';
import { requireStaff } from '../../middleware/auth';

/**
 * Local image storage. The spec asks for Cloudinary; the MVP writes to
 * server/uploads and serves it statically so the flow works with no external
 * account. Swapping in Cloudinary means replacing this single handler.
 */
export const UPLOAD_DIR = path.resolve(__dirname, '..', '..', '..', 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
  ['image/svg+xml', '.svg'],
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      // Never trust the client filename: generate our own.
      const ext = ALLOWED.get(file.mimetype) ?? '.bin';
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(badRequest('Допустимі формати: JPG, PNG, WEBP, AVIF, SVG'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.post('/images', requireStaff, upload.array('files', 8), (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) throw badRequest('Файли не надіслані');
  res.status(201).json({ urls: files.map((file) => `/uploads/${file.filename}`) });
});

export default router;
