export interface PublicGalleryData {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  event_date?: string | null;
  location?: string | null;
  cover_photo_url?: string | null;
  access_type: 'PUBLIC' | 'UNLISTED' | 'PASSWORD_PROTECTED' | 'PRIVATE';
  is_password_protected?: boolean;
  is_expired?: boolean;
  is_unlisted?: boolean;
  expires_at?: string | null;
  enable_ai_face_search: boolean;
  face_match_sensitivity: number;
  downloads_enabled: boolean;
  download_originals_enabled: boolean;
  bulk_download_enabled: boolean;
  watermark_mode: 'NONE' | 'THUMBNAIL_ONLY' | 'ALL';
  total_photos: number;
  studio: {
    id: string;
    name: string;
    slug?: string | null;
    logo_url?: string | null;
    website?: string | null;
  };
}

export interface PublicPhotoItem {
  id: string;
  original_filename?: string | null;
  original_url: string;
  thumbnail_url: string;
  sm_url?: string | null;
  md_url?: string | null;
  lg_url?: string | null;
  width?: number | null;
  height?: number | null;
  file_size?: number;
  created_at?: string;
  is_favorited?: boolean;
  is_selected?: boolean;
  similarity_score?: number;
  confidence?: number;
}

export interface ClientGallerySession {
  token: string;
  expiresAt: string;
  permissions: {
    canDownload: boolean;
    canDownloadOriginals: boolean;
    canBulkDownload: boolean;
  };
}

export interface AiMatchItem {
  photo_id: string;
  similarity_score: number;
  confidence?: number;
  thumbnail_url?: string;
  photo?: PublicPhotoItem;
}

export interface PublicSmartAlbumItem {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  photo_count?: number;
}

export type ViewFilter = 'ALL' | 'FAVORITES' | 'SELECTED' | 'AI_MATCHES' | 'SMART_ALBUM' | 'PERSONALIZED_HOME' | 'SEARCH';
export type GridDensity = 'COMPACT' | 'COMFORTABLE' | 'LARGE';

export interface PublicChapterItem {
  id: string;
  title: string;
  category: string;
  photo_count: number;
  cover_photo_url?: string | null;
}

