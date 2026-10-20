export type MediaType = 'photo' | 'video';

export interface CameraExif {
  camera?: string;
  lens?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  focalLength?: string;
}

export interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: MediaType;
  title: string;
  caption?: string;
  width: number;
  height: number;
  aspectRatio?: string;
  duration?: string; // For videos, e.g. "0:24"
  videoSrc?: string; // For real HTML5 video playback
  fileSize: string; // e.g. "6.4 MB"
  dimensions: string; // e.g. "4032 x 3024"
  capturedAt: string;
  uploadedAt: string;
  views: number;
  downloads: number;
  storagePath?: string;
  thumbnailStoragePath?: string;
  ownerId?: string;
  exif?: CameraExif;
}

export interface OrganizerInfo {
  name: string;
  company?: string;
  avatar?: string;
  logoUrl?: string;
  contactEmail?: string;
  phone?: string;
}

export type GalleryTheme = 'warm-white' | 'editorial-sand' | 'charcoal' | 'midnight-slate';
export type TypographyPreset = 'editorial-serif' | 'modern-grotesk' | 'classic-roman';

export interface EventGallery {
  id: string;
  slug: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  description: string;
  coverImage: string;
  organizer: OrganizerInfo;
  status: 'active' | 'draft' | 'archived';
  isPasswordProtected: boolean;
  pinCode?: string;
  allowGuestUploads: boolean;
  allowOriginalDownloads: boolean;
  theme: GalleryTheme;
  accentColor?: string;
  typographyPreset?: TypographyPreset;
  ownerId?: string;
  createdAt?: string;
  stats: {
    totalMedia: number;
    photosCount: number;
    videosCount: number;
    totalSize: string;
    guestVisits: number;
    downloadCount: number;
  };
  items: MediaItem[];
}

export type AppView = 
  | 'landing'
  | 'gallery'
  | 'organizer-dashboard'
  | 'create-event'
  | 'upload-media';
