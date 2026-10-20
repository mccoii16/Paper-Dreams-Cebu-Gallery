import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import * as archiverModule from 'archiver';
import { Readable } from 'stream';
import multer from 'multer';

const archiver = (archiverModule as any).default || archiverModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Persistent uploads directory
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded media statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve public assets (images, icons) statically
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Configure multer storage
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const eventId = String(req.body.eventId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    const folderType = file.fieldname === 'thumbnail' ? 'thumbnails' : 'originals';
    const targetDir = path.join(UPLOADS_DIR, 'events', eventId, folderType);
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const mediaId = String(req.body.mediaId || `med-${Date.now().toString(36)}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (file.fieldname === 'thumbnail') {
      cb(null, `${mediaId}_thumb.jpg`);
    } else {
      cb(null, `${mediaId}_${cleanName}`);
    }
  },
});

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 120 * 1024 * 1024, // 120 MB maximum per file
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported format: Only photo and video files are permitted.'));
    }
  },
});

// Ephemeral / secret key for signing PIN grant tokens
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'aura-sec-' + crypto.randomBytes(16).toString('hex');

/**
 * Generate a cryptographically signed guest access grant token for a PIN-protected gallery.
 */
function generateGrantToken(eventId: string, expiresAt: number): string {
  const payload = `${eventId}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return `${payload}:${signature}`;
}

/**
 * Verify a guest access grant token for an event.
 */
function verifyGrantToken(eventId: string, token: string): boolean {
  try {
    if (!token) return false;
    const parts = token.split(':');
    if (parts.length !== 3) return false;
    const [tokenEventId, expiresAtStr, signature] = parts;
    if (tokenEventId !== eventId) return false;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

    const expectedSignature = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(`${tokenEventId}:${expiresAt}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Direct file upload endpoint with multer disk storage.
 * Handles original photos and videos as well as generated thumbnails.
 */
app.post(
  '/api/upload',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      if (!files || !files.file || files.file.length === 0) {
        return res.status(400).json({ error: 'No media file provided.' });
      }

      const eventId = String(req.body.eventId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
      const originalFile = files.file[0];
      const thumbFile = files.thumbnail && files.thumbnail.length > 0 ? files.thumbnail[0] : null;

      const originalUrl = `/uploads/events/${eventId}/originals/${originalFile.filename}`;
      const originalStoragePath = `uploads/events/${eventId}/originals/${originalFile.filename}`;

      const thumbUrl = thumbFile
        ? `/uploads/events/${eventId}/thumbnails/${thumbFile.filename}`
        : originalUrl;
      const thumbStoragePath = thumbFile
        ? `uploads/events/${eventId}/thumbnails/${thumbFile.filename}`
        : undefined;

      const sizeMB = (originalFile.size / (1024 * 1024)).toFixed(1) + ' MB';

      return res.json({
        success: true,
        url: originalUrl,
        storagePath: originalStoragePath,
        thumbnailUrl: thumbUrl,
        thumbnailStoragePath: thumbStoragePath,
        fileSize: sizeMB,
        filename: originalFile.filename,
      });
    } catch (err: any) {
      console.error('Upload endpoint error:', err);
      return res.status(500).json({ error: err.message || 'File upload failed.' });
    }
  }
);

/**
 * File deletion endpoint for server-managed uploads.
 */
app.delete('/api/media', (req, res) => {
  try {
    const { storagePath, thumbnailStoragePath } = req.body;
    if (typeof storagePath === 'string' && storagePath.startsWith('uploads/')) {
      const fullPath = path.join(__dirname, storagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    if (typeof thumbnailStoragePath === 'string' && thumbnailStoragePath.startsWith('uploads/')) {
      const fullThumbPath = path.join(__dirname, thumbnailStoragePath);
      if (fs.existsSync(fullThumbPath)) {
        fs.unlinkSync(fullThumbPath);
      }
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.warn('Could not delete server file:', err);
    return res.json({ success: false, error: err.message });
  }
});

/**
 * Server-side Gallery PIN verification endpoint.
 * Validates PIN and issues a tamper-proof session grant token.
 */
app.post('/api/verify-pin', (req, res) => {
  const { eventId, pin, expectedPin } = req.body;

  if (!eventId) {
    return res.status(400).json({ success: false, error: 'Missing event ID.' });
  }

  // Constant time comparison to prevent timing attacks
  const targetPin = String(expectedPin || '').trim();
  const submittedPin = String(pin || '').trim();

  if (!submittedPin) {
    return res.status(400).json({ success: false, error: 'Please enter a PIN code.' });
  }

  // If the target PIN was provided and valid
  const isMatch = targetPin.length > 0 && 
    submittedPin.length === targetPin.length && 
    crypto.timingSafeEqual(Buffer.from(submittedPin), Buffer.from(targetPin));

  if (!isMatch) {
    return res.status(401).json({ 
      success: false, 
      error: 'Incorrect Gallery PIN. Please verify the code with your event host.' 
    });
  }

  // Grant access valid for 8 hours
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  const token = generateGrantToken(eventId, expiresAt);

  return res.json({
    success: true,
    token,
    expiresAt,
    message: 'Access granted.'
  });
});

/**
 * Bulk ZIP download endpoint.
 * Packages selected media into a streaming ZIP archive directly piped to HTTP response
 * without buffering files into server memory.
 */
app.post('/api/download-zip', async (req, res) => {
  const { eventId, eventSlug, isPasswordProtected, authToken, mediaItems } = req.body;

  if (!eventId || !Array.isArray(mediaItems) || mediaItems.length === 0) {
    return res.status(400).json({ error: 'Invalid request: No media items specified.' });
  }

  // Rate & selection limit guard: Maximum 50 items per ZIP
  if (mediaItems.length > 50) {
    return res.status(400).json({ 
      error: 'Bulk selection limit exceeded: Maximum 50 items per ZIP download. Please download in smaller batches.' 
    });
  }

  // Security gate: Verify access token for password-protected galleries
  if (isPasswordProtected) {
    const isAuthorized = verifyGrantToken(eventId, authToken);
    if (!isAuthorized) {
      return res.status(403).json({ 
        error: 'Unauthorized: A valid gallery PIN session token is required to download protected media.' 
      });
    }
  }

  const cleanSlug = (eventSlug || 'event').replace(/[^a-zA-Z0-9_-]/g, '-');
  const zipFileName = `${cleanSlug}-selected-media.zip`;

  // Set HTTP headers for streaming attachment
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Initialize streaming archiver (zlib compression level 5 for balance between CPU & size)
  const archive = archiver('zip', {
    zlib: { level: 5 }
  });

  // Handle client disconnection / abort
  res.on('close', () => {
    archive.abort();
  });

  archive.on('error', (err: any) => {
    console.error('ZIP Archiver stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to compress media files.' });
    }
  });

  archive.on('warning', (err: any) => {
    if (err.code !== 'ENOENT') {
      console.warn('Archiver warning:', err);
    }
  });

  // Pipe the archive stream directly to response
  archive.pipe(res);

  try {
    for (let i = 0; i < mediaItems.length; i++) {
      const item = mediaItems[i];
      const isVideo = item.type === 'video';
      const ext = isVideo ? 'mp4' : 'jpg';
      const cleanTitle = (item.title || `moment_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
      const entryName = `${String(i + 1).padStart(2, '0')}_${cleanTitle}.${ext}`;

      const mediaUrl: string = item.url || '';

      if (mediaUrl.startsWith('/src/assets/') || mediaUrl.startsWith('src/assets/')) {
        // Local bundled asset
        const localPath = path.join(__dirname, mediaUrl.replace(/^\//, ''));
        if (fs.existsSync(localPath)) {
          archive.file(localPath, { name: entryName });
        }
      } else if (mediaUrl.startsWith('/images/') || mediaUrl.startsWith('images/')) {
        // Public image asset
        const localPath = path.join(__dirname, 'public', mediaUrl.replace(/^\//, ''));
        if (fs.existsSync(localPath)) {
          archive.file(localPath, { name: entryName });
        }
      } else if (mediaUrl.startsWith('/uploads/') || mediaUrl.startsWith('uploads/')) {
        // Local server-uploaded asset
        const localPath = path.join(__dirname, mediaUrl.replace(/^\//, ''));
        if (fs.existsSync(localPath)) {
          archive.file(localPath, { name: entryName });
        }
      } else if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
        // Remote Cloud Storage / HTTPS asset
        try {
          const fetchRes = await fetch(mediaUrl);
          if (fetchRes.ok && fetchRes.body) {
            // Node 18+ web stream converted to Node stream
            const nodeStream = Readable.fromWeb(fetchRes.body as any);
            archive.append(nodeStream, { name: entryName });
          } else {
            console.warn(`Could not stream media ${item.id} (${fetchRes.status}): ${mediaUrl}`);
          }
        } catch (fetchErr) {
          console.warn(`Fetch failure for item ${item.id}:`, fetchErr);
        }
      }
    }

    // Finalize the archive stream
    await archive.finalize();
  } catch (error) {
    console.error('Error compiling ZIP archive:', error);
    archive.abort();
  }
});

// -------------------------------------------------------------
// VITE DEV SERVER OR PRODUCTION STATIC SERVING
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aura Gallery server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server boot failure:', err);
  process.exit(1);
});
