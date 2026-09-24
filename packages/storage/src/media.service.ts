import crypto from 'crypto';
import path from 'path';
import sharp from 'sharp';

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
  orientation?: number;
}

export interface GeneratedThumbnails {
  metadata: ImageMetadata;
  sm: Buffer;
  md: Buffer;
  lg: Buffer;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename: string;
  extension: string;
  mimeType: string;
}

export class MediaService {
  private static readonly ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.tif', '.tiff']);
  private static readonly ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/pjpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/tiff',
  ]);
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly MAX_DIMENSION = 15000; // 15,000px max width/height
  private static readonly MAX_TOTAL_PIXELS = 100_000_000; // 100 Megapixels max (decompression bomb protection)

  /**
   * Generates a deterministic SHA-256 hash of a file buffer for duplicate detection.
   */
  static computeSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Sanitizes a filename to prevent path traversal and remove illegal filesystem characters.
   */
  static sanitizeFilename(filename: string): string {
    const parsed = path.parse(filename);
    const safeBase = parsed.name
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 100);
    const safeExt = parsed.ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
    return `${safeBase || 'photo'}${safeExt}`;
  }

  /**
   * Validates file size, extension, MIME type, and binary header.
   */
  static validateImage(buffer: Buffer, originalFilename: string, declaredMimeType: string): ValidationResult {
    if (!buffer || buffer.length === 0) {
      return {
        valid: false,
        error: 'Uploaded file is empty',
        sanitizedFilename: '',
        extension: '',
        mimeType: declaredMimeType,
      };
    }

    if (buffer.length > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 50MB`,
        sanitizedFilename: '',
        extension: '',
        mimeType: declaredMimeType,
      };
    }

    const sanitizedFilename = this.sanitizeFilename(originalFilename);
    const ext = path.extname(sanitizedFilename).toLowerCase();

    if (!this.ALLOWED_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        error: `File extension '${ext}' is not supported. Allowed formats: JPEG, PNG, WebP, HEIC, TIFF`,
        sanitizedFilename,
        extension: ext,
        mimeType: declaredMimeType,
      };
    }

    const normalizedMime = (declaredMimeType || '').toLowerCase();
    if (normalizedMime && !this.ALLOWED_MIME_TYPES.has(normalizedMime) && !normalizedMime.startsWith('image/')) {
      return {
        valid: false,
        error: `MIME type '${declaredMimeType}' is not allowed`,
        sanitizedFilename,
        extension: ext,
        mimeType: declaredMimeType,
      };
    }

    // Binary magic bytes validation
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isWebp = buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP';
    const isTiff =
      (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
      (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a);

    if (!isJpeg && !isPng && !isWebp && !isTiff && ext !== '.heic') {
      return {
        valid: false,
        error: 'Invalid image format: file headers do not match a valid image specification',
        sanitizedFilename,
        extension: ext,
        mimeType: declaredMimeType,
      };
    }

    return {
      valid: true,
      sanitizedFilename,
      extension: ext,
      mimeType: normalizedMime || 'image/jpeg',
    };
  }

  /**
   * Sharp Image Processing: Auto-rotates using EXIF orientation, extracts dimensions,
   * enforces decompression bomb limits, and renders SM (320px), MD (1200px), and LG (2400px) WebP thumbnails without upscaling.
   */
  static async extractMetadataAndThumbnails(buffer: Buffer): Promise<GeneratedThumbnails> {
    const baseSharp = sharp(buffer, { failOn: 'none', limitInputPixels: this.MAX_TOTAL_PIXELS }).rotate();
    const meta = await baseSharp.metadata();

    const width = meta.width || 1920;
    const height = meta.height || 1080;
    const format = meta.format || 'jpeg';
    const orientation = meta.orientation;

    // Decompression bomb & extreme dimensions guard
    if (width > this.MAX_DIMENSION || height > this.MAX_DIMENSION) {
      throw new Error(`Image dimensions (${width}x${height}) exceed maximum allowed dimension limit of ${this.MAX_DIMENSION}px`);
    }

    if (width * height > this.MAX_TOTAL_PIXELS) {
      throw new Error(`Total image pixels (${width * height}) exceed decompression safety limit`);
    }

    // 1. SM Thumbnail: 320px max dimension, WebP quality 80
    const sm = await sharp(buffer, { failOn: 'none', limitInputPixels: this.MAX_TOTAL_PIXELS })
      .rotate()
      .resize({
        width: 320,
        height: 320,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    // 2. MD Thumbnail: 1200px max dimension, WebP quality 85
    const md = await sharp(buffer, { failOn: 'none', limitInputPixels: this.MAX_TOTAL_PIXELS })
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();

    // 3. LG Thumbnail: 2400px max dimension, WebP quality 88
    const lg = await sharp(buffer, { failOn: 'none', limitInputPixels: this.MAX_TOTAL_PIXELS })
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer();

    return {
      metadata: {
        width,
        height,
        format,
        sizeBytes: buffer.length,
        orientation,
      },
      sm,
      md,
      lg,
    };
  }

  /**
   * Constructs strict tenant-isolated relative storage paths.
   */
  static buildRelativePath(
    studioId: string,
    galleryId: string,
    category: 'originals' | 'thumbnails/sm' | 'thumbnails/md' | 'thumbnails/lg',
    filename: string
  ): string {
    const cleanStudio = studioId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanGallery = galleryId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanFile = this.sanitizeFilename(filename);

    return path.join('studios', cleanStudio, 'galleries', cleanGallery, category, cleanFile).replace(/\\/g, '/');
  }
}
