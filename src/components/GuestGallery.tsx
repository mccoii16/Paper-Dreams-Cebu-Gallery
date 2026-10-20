import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { EventGallery, MediaItem } from '../types';
import { 
  downloadMediaFile, 
  downloadSelectedMediaZip, 
  verifyGalleryPinServer, 
  getSavedGrantToken 
} from '../utils/download';
import { shareContent } from '../utils/share';
import { downloadEventQRCodePNG } from '../utils/qrcode';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { 
  Download, Play, Film, Image as ImageIcon, QrCode, Share2, 
  Info, Sparkles, Check, ExternalLink, Calendar, MapPin, 
  ShieldCheck, ArrowDown, Lock, KeyRound, AlertCircle, RefreshCw, Trash2,
  CheckSquare, Square, X, Printer, Settings, EyeOff, Globe, Eye
} from 'lucide-react';

interface GuestGalleryProps {
  event: EventGallery;
  onOpenViewer: (index: number) => void;
  onUploadClick?: () => void;
  onSwitchEvent?: (eventId: string) => void;
  allEvents?: EventGallery[];
  onDeleteMedia?: (mediaId: string, storagePath?: string, thumbnailStoragePath?: string) => Promise<void>;
  onUpdateEventSecurity?: (eventId: string, updates: Partial<EventGallery>) => Promise<void>;
  onTogglePublish?: (eventId: string) => void;
  onNavigateHome?: () => void;
  isOrganizer?: boolean;
}

export const GuestGallery: React.FC<GuestGalleryProps> = ({
  event,
  onOpenViewer,
  onUploadClick,
  onSwitchEvent,
  allEvents = [],
  onDeleteMedia,
  onUpdateEventSecurity,
  onTogglePublish,
  onNavigateHome,
  isOrganizer = false,
}) => {
  // Gallery display states
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [layoutMode, setLayoutMode] = useState<'masonry' | 'grid'>('masonry');
  const [showEventInfoModal, setShowEventInfoModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [statusToast, setStatusToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Multi-select & Bulk download state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPackagingZip, setIsPackagingZip] = useState(false);
  const [zipProgressMsg, setZipProgressMsg] = useState<string | null>(null);

  // Individual download tracking
  const [downloadingItemId, setDownloadingItemId] = useState<string | null>(null);

  // Media deletion confirmation state
  const [mediaToDelete, setMediaToDelete] = useState<MediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination
  const [visibleCount, setVisibleCount] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Security PIN gate & session tokens
  const [authToken, setAuthToken] = useState<string | null>(() => getSavedGrantToken(event.id));
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (!event.isPasswordProtected) return true;
    return Boolean(getSavedGrantToken(event.id) || isOrganizer);
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Organizer security settings form state
  const [secPasswordProtected, setSecPasswordProtected] = useState(event.isPasswordProtected);
  const [secPinCode, setSecPinCode] = useState(event.pinCode || '');
  const [secAllowOriginalDownloads, setSecAllowOriginalDownloads] = useState(event.allowOriginalDownloads ?? true);
  const [secAllowGuestUploads, setSecAllowGuestUploads] = useState(event.allowGuestUploads ?? false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  // Image load state tracking
  const [loadedImageIds, setLoadedImageIds] = useState<{ [id: string]: boolean }>({});

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success', duration = 3800) => {
    setStatusToast({ message, type });
    setTimeout(() => {
      setStatusToast(null);
    }, duration);
  }, []);

  // Sync unlock state if event or organizer status changes
  useEffect(() => {
    if (!event.isPasswordProtected || isOrganizer) {
      setIsUnlocked(true);
    } else {
      const saved = getSavedGrantToken(event.id);
      setIsUnlocked(Boolean(saved));
      if (saved) setAuthToken(saved);
    }
    // Reset selection when event changes
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, [event.id, event.isPasswordProtected, isOrganizer]);

  // Accurate media counts
  const actualPhotoCount = useMemo(() => {
    return event.items.filter((item) => item.type === 'photo').length;
  }, [event.items]);

  const actualVideoCount = useMemo(() => {
    return event.items.filter((item) => item.type === 'video').length;
  }, [event.items]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (filter === 'all') return event.items;
    return event.items.filter((item) => item.type === filter);
  }, [event.items, filter]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  const hasMore = visibleCount < filteredItems.length;

  const themeClass = useMemo(() => {
    switch (event.theme) {
      case 'charcoal':
        return 'bg-[#171717] text-neutral-100';
      case 'midnight-slate':
        return 'bg-[#0F172A] text-slate-100';
      case 'editorial-sand':
        return 'bg-[#F4EFEB] text-neutral-900';
      case 'warm-white':
      default:
        return 'bg-[#FAF9F6] text-neutral-900';
    }
  }, [event.theme]);

  const headingFontClass = useMemo(() => {
    switch (event.typographyPreset) {
      case 'modern-grotesk':
        return 'font-sans font-bold tracking-tight';
      case 'classic-roman':
        return 'font-serif tracking-wide';
      case 'editorial-serif':
      default:
        return 'font-serif-display font-medium tracking-tight';
    }
  }, [event.typographyPreset]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + 8);
      setIsLoadingMore(false);
    }, 250);
  };

  // Toggle multi-select mode
  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setIsSelectionMode(true);
    }
  };

  // Select / Deselect individual item
  const toggleItemSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select All in current filter
  const handleSelectAll = () => {
    const allFilteredIds = filteredItems.map((item) => item.id);
    setSelectedIds(new Set(allFilteredIds));
  };

  // Clear selection
  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Individual media download in lossless original quality
  const handleDownloadSingle = async (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    if (downloadingItemId) return;

    if (!event.allowOriginalDownloads && !isOrganizer) {
      showToast('The host has disabled direct file downloads for this gallery.', 'error');
      return;
    }

    setDownloadingItemId(item.id);
    const ext = item.type === 'video' ? 'mp4' : 'jpg';
    const filename = `${event.slug}-${item.id}.${ext}`;
    const targetUrl = resolveMediaUrl(item.type === 'video' && item.videoSrc ? item.videoSrc : item.url);

    const result = await downloadMediaFile(targetUrl, filename, (status) => {
      setStatusToast({ message: status, type: 'info' });
    });

    setDownloadingItemId(null);
    if (result.success) {
      showToast(result.message, result.isFallback ? 'info' : 'success', 4500);
    } else {
      showToast(result.message, 'error', 5000);
    }
  };

  // Bulk ZIP Download using secure backend streaming process
  const handleDownloadSelectedZip = async () => {
    if (selectedIds.size === 0 || isPackagingZip) return;

    if (!event.allowOriginalDownloads && !isOrganizer) {
      showToast('The host has disabled original downloads for this gallery.', 'error');
      return;
    }

    const itemsToDownload = event.items.filter((item) => selectedIds.has(item.id));

    if (itemsToDownload.length > 50) {
      showToast('Please select up to 50 items per ZIP archive for reliable streaming.', 'error');
      return;
    }

    setIsPackagingZip(true);
    setZipProgressMsg(`Packaging ${itemsToDownload.length} files on server...`);

    const result = await downloadSelectedMediaZip({
      eventId: event.id,
      eventSlug: event.slug,
      mediaItems: itemsToDownload,
      isPasswordProtected: event.isPasswordProtected,
      authToken,
      onProgress: (msg) => {
        setZipProgressMsg(msg);
      },
    });

    setIsPackagingZip(false);
    setZipProgressMsg(null);

    if (result.success) {
      showToast(result.message, 'success', 5000);
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    } else {
      showToast(result.message, 'error', 5500);
    }
  };

  // Server-side Gallery PIN verification
  const handleUnlockGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setPinError('Please enter the 4-digit event PIN code.');
      return;
    }

    setIsVerifyingPin(true);
    setPinError(null);

    const result = await verifyGalleryPinServer(event.id, pinInput, event.pinCode);
    setIsVerifyingPin(false);

    if (result.success && result.token) {
      setAuthToken(result.token);
      setIsUnlocked(true);
      showToast('Gallery unlocked. Welcome to the event!', 'success');
    } else {
      setPinError(result.error || 'Incorrect Gallery PIN. Please verify with the event host.');
    }
  };

  // Organizer: Save Access & Security updates
  const handleSaveSecuritySettings = async () => {
    if (!onUpdateEventSecurity) return;
    setIsSavingSecurity(true);
    try {
      await onUpdateEventSecurity(event.id, {
        isPasswordProtected: secPasswordProtected,
        pinCode: secPasswordProtected ? secPinCode.trim() : undefined,
        allowOriginalDownloads: secAllowOriginalDownloads,
        allowGuestUploads: secAllowGuestUploads,
      });
      showToast('Gallery security and permissions updated.', 'success');
      setShowSecurityModal(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not save security settings.', 'error');
    } finally {
      setIsSavingSecurity(false);
    }
  };

  // Printable table card QR PNG download
  const handleDownloadTableCard = async () => {
    const fullUrl = `${window.location.origin}/#event=${event.slug}`;
    showToast('Generating high-resolution table signage...', 'info', 1800);
    await downloadEventQRCodePNG(event.title, event.slug, event.date, fullUrl);
    showToast('Downloaded printable Table Card PNG!', 'success');
  };

  const eventPublicUrl = `${window.location.origin}/#event=${event.slug}`;

  // -------------------------------------------------------------
  // GUARD: UNPUBLISHED / DRAFT EVENT PROTECTION
  // -------------------------------------------------------------
  const isDraftOrUnpublished = event.status !== 'active';
  if (isDraftOrUnpublished && !isOrganizer) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-neutral-200/90 rounded-sm p-8 text-center space-y-5 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800">
            <EyeOff className="w-6 h-6 stroke-[1.5]" />
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
              Private Event
            </div>
            <h2 className="text-xl font-serif-display font-medium text-neutral-900">
              {event.title}
            </h2>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
              This gallery has not yet been published by the event organizer. If you are an invited guest, please check back after the celebration has concluded.
            </p>
          </div>

          <div className="pt-2 border-t border-neutral-100 flex flex-col gap-2">
            <button
              onClick={() => onNavigateHome ? onNavigateHome() : window.location.assign('/')}
              className="px-4 py-2 bg-neutral-900 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-neutral-800 transition-colors"
            >
              Return to Paper Dreams Cebu
            </button>
            <div className="text-[11px] text-neutral-400">
              Host: {event.organizer.name} ({event.organizer.company})
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 transition-colors ${themeClass}`}>
      
      {/* Organizer Draft Status Warning Bar */}
      {isDraftOrUnpublished && isOrganizer && (
        <div className="bg-amber-500 text-neutral-950 px-4 py-2.5 text-xs font-medium flex items-center justify-between border-b border-amber-600/20">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <span className="flex items-center gap-1.5 font-semibold">
              <EyeOff className="w-4 h-4" />
              <span>Organizer Preview · This gallery is currently in <strong>Draft</strong> mode and hidden from public guests.</span>
            </span>
            {onTogglePublish && (
              <button
                onClick={() => onTogglePublish(event.id)}
                className="px-3 py-1 bg-neutral-950 text-white text-[11px] font-semibold uppercase tracking-wider rounded hover:bg-neutral-850 transition-colors"
              >
                Publish Gallery
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hero Cover Image Section */}
      <section className="relative w-full h-[40vh] sm:h-[52vh] lg:h-[60vh] bg-neutral-900 overflow-hidden">
        <img
          src={resolveMediaUrl(event.coverImage)}
          alt={event.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-90 transition-transform duration-700 ease-out hover:scale-102"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/30" />

        {/* Top Controls Overlay */}
        <div className="absolute top-6 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between z-10">
          {/* All events quick switcher */}
          {allEvents.length > 1 && onSwitchEvent ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-white/70 font-medium hidden sm:inline">
                Event:
              </span>
              <select
                value={event.id}
                onChange={(e) => onSwitchEvent(e.target.value)}
                className="bg-black/50 backdrop-blur-md text-white text-xs border border-white/20 rounded px-2.5 py-1.5 focus:outline-none focus:border-white/60 cursor-pointer"
              >
                {allEvents.map((evt) => (
                  <option key={evt.id} value={evt.id} className="bg-neutral-900 text-white">
                    {evt.title} ({evt.stats.photosCount + evt.stats.videosCount})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div />
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Organizer Access Settings */}
            {isOrganizer && onUpdateEventSecurity && (
              <button
                onClick={() => setShowSecurityModal(true)}
                className="p-2 sm:px-3 sm:py-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-md text-white rounded text-xs font-medium border border-white/20 transition-all flex items-center gap-1.5"
                title="Configure Access & Passwords"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Access & Security</span>
              </button>
            )}

            <button
              onClick={() => setShowQRModal(true)}
              className="p-2 sm:px-3 sm:py-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-md text-white rounded text-xs font-medium border border-white/20 transition-all flex items-center gap-1.5"
              title="View & Download Table QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">QR Code</span>
            </button>

            <button
              onClick={async () => {
                const res = await shareContent({
                  title: `${event.title} · Event Gallery`,
                  text: `Browse unforgettable photos & videos from ${event.title}`,
                  url: eventPublicUrl,
                });
                if (res.method === 'clipboard') {
                  showToast('Gallery share link copied to clipboard!', 'success');
                }
              }}
              className="p-2 sm:px-3 sm:py-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-md text-white rounded text-xs font-medium border border-white/20 transition-all flex items-center gap-1.5"
              title="Share Gallery Link"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        {/* Hero Title and Meta Info */}
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 text-white">
          <div className="flex items-center gap-2 mb-2 flex-wrap text-white/80">
            <span className="text-xs uppercase tracking-widest font-semibold">Private Event Gallery</span>
            <span aria-hidden="true">·</span>
            <span className="text-xs flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{event.date}</span>
            </span>
            {event.isPasswordProtected && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-xs bg-amber-500/90 text-neutral-950 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>PIN Protected</span>
                </span>
              </>
            )}
          </div>

          <h1 className={`text-3xl sm:text-5xl lg:text-6xl text-white mb-3 ${headingFontClass}`}>
            {event.title}
          </h1>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <p className="text-xs sm:text-sm text-neutral-200/90 max-w-2xl leading-relaxed">
              {event.description}
            </p>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowEventInfoModal(true)}
                className="text-xs text-white/90 hover:text-white underline underline-offset-4 flex items-center gap-1"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Venue & Host Info</span>
              </button>

              {event.allowGuestUploads && onUploadClick && (
                <button
                  onClick={onUploadClick}
                  className="px-4 py-2 bg-white text-neutral-900 text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-neutral-100 transition-colors shadow-xs"
                >
                  + Add Photos
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* PIN UNLOCK GATE (IF PASSWORD PROTECTED AND NOT UNLOCKED) */}
      {/* ------------------------------------------------------------- */}
      {!isUnlocked && (
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900">
            <KeyRound className="w-8 h-8 stroke-[1.5]" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-serif-display font-medium text-neutral-900">
              Private Event Gallery
            </h2>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
              This gallery is protected by the host. Please enter the 4-digit PIN provided on your event invitation or table place card to view and download photos.
            </p>
          </div>

          <form onSubmit={handleUnlockGallery} className="space-y-4 max-w-xs mx-auto">
            <div>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(null);
                }}
                placeholder="Enter Gallery PIN"
                className="w-full text-center text-lg tracking-widest font-mono py-2.5 px-4 bg-white border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-rose-600 mt-2 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{pinError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifyingPin}
              className="w-full py-2.5 bg-neutral-950 text-white text-xs font-semibold uppercase tracking-wider rounded hover:bg-neutral-850 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isVerifyingPin && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isVerifyingPin ? 'Verifying with Server...' : 'Unlock Gallery'}</span>
            </button>
          </form>

          <p className="text-[11px] text-neutral-400">
            Protected with server-side authorization tokens. Never shared publicly.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* UNLOCKED GALLERY MAIN CONTENT */}
      {/* ------------------------------------------------------------- */}
      {isUnlocked && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          
          {/* Controls Bar: Filters, Multi-Select Toggle, Layout, and Counts */}
          <div className="bg-white border border-neutral-200/90 rounded-sm p-4 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  filter === 'all'
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                All Moments ({event.items.length})
              </button>
              <button
                onClick={() => setFilter('photo')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  filter === 'photo'
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Photos ({actualPhotoCount})
              </button>
              <button
                onClick={() => setFilter('video')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  filter === 'video'
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Videos ({actualVideoCount})
              </button>
            </div>

            {/* Selection & Download Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Multi-Select Toggle */}
              {event.allowOriginalDownloads && (
                <button
                  onClick={toggleSelectionMode}
                  className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 border ${
                    isSelectionMode
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{isSelectionMode ? 'Cancel Selection' : 'Select Photos'}</span>
                </button>
              )}

              {/* Layout Mode Toggle */}
              <div className="flex items-center border border-neutral-200 rounded p-0.5 text-xs">
                <button
                  onClick={() => setLayoutMode('masonry')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    layoutMode === 'masonry' ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-600'
                  }`}
                >
                  Masonry
                </button>
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    layoutMode === 'grid' ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-600'
                  }`}
                >
                  Square Grid
                </button>
              </div>
            </div>
          </div>

          {/* Multi-Selection Control Header (When active) */}
          {isSelectionMode && (
            <div className="mb-6 p-4 bg-neutral-900 text-white rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  Select Mode:
                </span>
                <span className="text-xs font-bold text-white tabular-nums">
                  {selectedIds.size} of {filteredItems.length} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors"
                >
                  Select All ({filteredItems.length})
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors"
                >
                  Deselect
                </button>
                <button
                  onClick={handleDownloadSelectedZip}
                  disabled={selectedIds.size === 0 || isPackagingZip}
                  className="px-4 py-1.5 bg-white text-neutral-950 hover:bg-neutral-100 text-xs font-semibold uppercase tracking-wider rounded transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
                >
                  {isPackagingZip ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download Selected ({selectedIds.size}) · ZIP</span>
                </button>
              </div>
            </div>
          )}

          {/* Empty Gallery State */}
          {displayedItems.length === 0 ? (
            <div className="bg-white border border-neutral-200/90 rounded-sm p-16 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-serif-display font-medium text-neutral-900">
                No moments found in this view
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                No media has been uploaded matching the current filter.
              </p>
            </div>
          ) : (
            /* Media Grid */
            <div
              className={
                layoutMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6'
                  : 'columns-2 sm:columns-3 lg:columns-4 gap-4 sm:gap-6 space-y-4 sm:space-y-6'
              }
            >
              {displayedItems.map((item, idx) => {
                const isSelected = selectedIds.has(item.id);
                const isDownloadingThis = downloadingItemId === item.id;
                const isLoaded = loadedImageIds[item.id];

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleItemSelection(item.id);
                      } else {
                        onOpenViewer(idx);
                      }
                    }}
                    className={`group relative bg-neutral-900 rounded-sm overflow-hidden cursor-pointer transition-all duration-300 break-inside-avoid ${
                      layoutMode === 'grid' ? 'aspect-square' : ''
                    } ${
                      isSelected
                        ? 'ring-4 ring-neutral-950 scale-[0.98] shadow-md'
                        : 'hover:shadow-md'
                    }`}
                  >
                    {/* Multi-Select Checkbox Overlay */}
                    {isSelectionMode && (
                      <div 
                        onClick={(e) => toggleItemSelection(item.id, e)}
                        className="absolute top-3 left-3 z-30 p-1.5 rounded-full bg-black/60 backdrop-blur-xs text-white hover:bg-black/90 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 fill-current" />
                        ) : (
                          <Square className="w-4 h-4 text-white/80" />
                        )}
                      </div>
                    )}

                    {/* Image Loading Skeleton */}
                    {!isLoaded && (
                      <div className="absolute inset-0 bg-neutral-200 animate-pulse" />
                    )}

                    {/* Media Thumbnail */}
                    <img
                      src={resolveMediaUrl(item.thumbnailUrl || item.url)}
                      alt={item.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onLoad={() => setLoadedImageIds((prev) => ({ ...prev, [item.id]: true }))}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-103 ${
                        layoutMode === 'grid' ? 'aspect-square' : ''
                      } ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    />

                    {/* Video Duration Badge */}
                    {item.type === 'video' && (
                      <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 z-10">
                        <Play className="w-3 h-3 fill-current text-amber-300" />
                        <span>{item.duration || '0:30'}</span>
                      </div>
                    )}

                    {/* Resolution & Size Pill */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/65 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded font-mono z-10 hidden sm:block">
                      {item.fileSize}
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4 text-white">
                      <p className="text-xs font-semibold truncate text-white">{item.title}</p>
                      
                      <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-300">
                        <span>{item.capturedAt}</span>

                        <div className="flex items-center gap-1.5">
                          {/* Organizer Delete Button */}
                          {isOrganizer && onDeleteMedia && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMediaToDelete(item);
                              }}
                              className="p-1.5 bg-black/50 hover:bg-rose-600 text-white rounded transition-colors"
                              title="Delete media from event"
                              aria-label={`Delete ${item.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Individual Download Button */}
                          {event.allowOriginalDownloads && (
                            <button
                              onClick={(e) => handleDownloadSingle(e, item)}
                              disabled={isDownloadingThis}
                              className="p-1.5 bg-white/20 hover:bg-white text-white hover:text-neutral-900 rounded transition-colors disabled:opacity-50"
                              title="Download original file"
                              aria-label={`Download ${item.title}`}
                            >
                              {isDownloadingThis ? (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination & Load More */}
          {hasMore && (
            <div className="mt-12 text-center space-y-2">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-neutral-300 text-neutral-900 hover:bg-neutral-50 text-xs font-semibold rounded-sm transition-colors shadow-xs disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                    <span>Loading Moments...</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Load More Media ({filteredItems.length - displayedItems.length} remaining)</span>
                  </>
                )}
              </button>
              <div className="text-[11px] text-neutral-500 tabular-nums">
                Showing {displayedItems.length} of {filteredItems.length} media items
              </div>
            </div>
          )}

          {/* Host / Organizer Brand Signature */}
          <section className="mt-20 pt-10 border-t border-neutral-200/60 text-center max-w-xl mx-auto space-y-3">
            {(event.organizer.logoUrl || event.organizer.avatar) && (
              <div className="w-12 h-12 mx-auto rounded-full overflow-hidden border border-neutral-300 shadow-2xs mb-1">
                <img
                  src={resolveMediaUrl(event.organizer.logoUrl || event.organizer.avatar)}
                  alt={event.organizer.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <p className="text-xs uppercase tracking-wider opacity-60 font-semibold">
              Gallery Curated By
            </p>
            <h2 className="text-xl font-serif-display">{event.organizer.name}</h2>
            <p className="text-xs opacity-70 leading-relaxed">
              Professional high-resolution event captures preserved at native sensor quality. Original RAW footage and print licensing available upon request.
            </p>
            <div className="text-xs opacity-80 flex items-center justify-center gap-2 pt-1">
              <span>{event.organizer.contactEmail}</span>
              {event.organizer.company && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{event.organizer.company}</span>
                </>
              )}
            </div>
          </section>
        </main>
      )}

      {/* ------------------------------------------------------------- */}
      {/* FLOATING SELECTION TOOLBAR (FIXED BOTTOM ON MOBILE & DESKTOP) */}
      {/* ------------------------------------------------------------- */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-neutral-950 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-4 max-w-[94vw] border border-white/20 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold tabular-nums">
              {selectedIds.size} Selected
            </span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          <button
            onClick={handleDownloadSelectedZip}
            disabled={isPackagingZip}
            className="px-4 py-1.5 bg-white text-neutral-950 hover:bg-neutral-100 text-xs font-semibold uppercase tracking-wider rounded-full transition-colors flex items-center gap-1.5"
          >
            {isPackagingZip ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isPackagingZip ? 'Creating ZIP...' : 'Download ZIP'}</span>
          </button>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-neutral-400 hover:text-white p-1"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ZIP STREAMING PROGRESS MODAL */}
      {/* ------------------------------------------------------------- */}
      {isPackagingZip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 max-w-sm w-full p-6 rounded-md shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900">
              <RefreshCw className="w-6 h-6 animate-spin stroke-[1.5]" />
            </div>

            <div>
              <h3 className="text-base font-serif-display font-medium text-neutral-900">
                Packaging Original Media
              </h3>
              <p className="text-xs text-neutral-600 mt-1.5">
                {zipProgressMsg || 'Streaming original media files into ZIP package...'}
              </p>
            </div>

            <p className="text-[11px] text-neutral-400">
              The archive streams directly from Cloud Storage to your browser without quality loss.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TABLE QR CODE & PRINTABLE SIGNAGE MODAL */}
      {/* ------------------------------------------------------------- */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 max-w-md w-full p-6 rounded-sm shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Guest Sharing</span>
                <h3 className="text-lg font-serif-display font-medium text-neutral-900">Event QR Code & Link</h3>
              </div>
              <button 
                onClick={() => setShowQRModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-900 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code Container */}
            <div className="p-6 bg-neutral-50 border border-neutral-200 rounded-sm text-center space-y-3">
              <div className="w-56 h-56 mx-auto bg-white p-3 border border-neutral-200 rounded shadow-xs">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(eventPublicUrl)}&margin=10`}
                  alt={`QR code for ${event.title}`}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="text-xs text-neutral-600">
                <strong className="text-neutral-900 block font-semibold">{event.title}</strong>
                <p className="text-[11px] text-neutral-500 mt-0.5">{eventPublicUrl}</p>
              </div>
            </div>

            {/* Actions: Download PNG, Print Table Card, Copy Link */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={handleDownloadTableCard}
                className="px-3 py-2 bg-neutral-950 text-white font-semibold rounded hover:bg-neutral-850 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Table PNG</span>
              </button>

              <button
                onClick={() => {
                  window.print();
                }}
                className="px-3 py-2 bg-neutral-100 border border-neutral-300 text-neutral-800 font-semibold rounded hover:bg-neutral-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Table Card</span>
              </button>

              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(eventPublicUrl);
                  showToast('Event link copied to clipboard!', 'success');
                }}
                className="col-span-2 px-3 py-2 border border-neutral-300 text-neutral-800 font-medium rounded hover:bg-neutral-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Copy Shareable URL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ORGANIZER ACCESS & SECURITY SETTINGS MODAL */}
      {/* ------------------------------------------------------------- */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 max-w-md w-full p-6 rounded-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Access Control</span>
                <h3 className="text-lg font-serif-display font-medium text-neutral-900">Gallery Security & PIN</h3>
              </div>
              <button onClick={() => setShowSecurityModal(false)} className="p-1 text-neutral-400 hover:text-neutral-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Password Protection Toggle */}
              <div className="flex items-start justify-between gap-3 p-3 bg-neutral-50 rounded border border-neutral-200">
                <div>
                  <span className="font-semibold text-neutral-900 block">Require Gallery PIN</span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Guests must enter a secret PIN code to unlock photos and download media.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={secPasswordProtected}
                  onChange={(e) => setSecPasswordProtected(e.target.checked)}
                  className="rounded text-neutral-900 mt-1 cursor-pointer"
                />
              </div>

              {/* PIN Code Field */}
              {secPasswordProtected && (
                <div className="space-y-1">
                  <label className="text-neutral-700 font-semibold block">Gallery PIN Code</label>
                  <input
                    type="text"
                    maxLength={8}
                    value={secPinCode}
                    onChange={(e) => setSecPinCode(e.target.value)}
                    placeholder="e.g. 2026"
                    className="w-full font-mono text-xs px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                  />
                  <p className="text-[10px] text-neutral-400">Share this code with invited guests on invitations or place cards.</p>
                </div>
              )}

              {/* Allow Downloads Toggle */}
              <div className="flex items-start justify-between gap-3 p-3 bg-neutral-50 rounded border border-neutral-200">
                <div>
                  <span className="font-semibold text-neutral-900 block">Allow Original Downloads</span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    When enabled, guests can download individual files and bulk ZIP packages.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={secAllowOriginalDownloads}
                  onChange={(e) => setSecAllowOriginalDownloads(e.target.checked)}
                  className="rounded text-neutral-900 mt-1 cursor-pointer"
                />
              </div>

              {/* Allow Guest Uploads Toggle */}
              <div className="flex items-start justify-between gap-3 p-3 bg-neutral-50 rounded border border-neutral-200">
                <div>
                  <span className="font-semibold text-neutral-900 block">Allow Guest Uploads</span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Invited guests can contribute photos and live videos directly to this gallery.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={secAllowGuestUploads}
                  onChange={(e) => setSecAllowGuestUploads(e.target.checked)}
                  className="rounded text-neutral-900 mt-1 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                onClick={() => setShowSecurityModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSecuritySettings}
                disabled={isSavingSecurity}
                className="px-4 py-2 bg-neutral-950 text-white text-xs font-semibold uppercase tracking-wider rounded hover:bg-neutral-850 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingSecurity && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Permissions</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VENUE & HOST INFO MODAL */}
      {/* ------------------------------------------------------------- */}
      {showEventInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 max-w-md w-full p-6 rounded-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="border-b border-neutral-200 pb-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Event Information</div>
                <h3 className="text-xl font-serif-display font-medium text-neutral-900 mt-0.5">{event.title}</h3>
              </div>
              <button onClick={() => setShowEventInfoModal(false)} className="p-1 text-neutral-400 hover:text-neutral-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-600">
              <div>
                <span className="font-semibold text-neutral-800 block">Date & Venue</span>
                <p>{event.date} · {event.time || 'All Day'}</p>
                <p className="text-neutral-700 mt-0.5">{event.location}</p>
              </div>

              <div>
                <span className="font-semibold text-neutral-800 block">Host Welcome Message</span>
                <p className="leading-relaxed mt-0.5">{event.description}</p>
              </div>

              <div>
                <span className="font-semibold text-neutral-800 block">Download Policy</span>
                <p className="leading-relaxed mt-0.5">
                  {event.allowOriginalDownloads
                    ? 'All guests are invited to save original high-resolution captures for personal printing, framing, and sharing. Watermarks are never applied.'
                    : 'File downloads are restricted by the event organizer.'}
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-100">
                <span className="font-semibold text-neutral-800 block">Organizer Contact</span>
                <p>{event.organizer.name} ({event.organizer.company})</p>
                <p>{event.organizer.contactEmail}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowEventInfoModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-neutral-900 text-white rounded hover:bg-neutral-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MEDIA DELETION CONFIRMATION MODAL */}
      {/* ------------------------------------------------------------- */}
      {mediaToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 max-w-sm w-full p-6 rounded-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-rose-600 font-semibold text-sm">
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Permanently Delete Media?</span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-neutral-900 font-semibold">"{mediaToDelete.title}"</strong>? This will permanently remove the original high-resolution file and preview thumbnail from Cloud Storage.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                onClick={() => setMediaToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-300 rounded hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!mediaToDelete || !onDeleteMedia) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteMedia(
                      mediaToDelete.id, 
                      mediaToDelete.storagePath, 
                      (mediaToDelete as any).thumbnailStoragePath
                    );
                    showToast(`Deleted "${mediaToDelete.title}" from gallery.`, 'success');
                  } catch (err: unknown) {
                    showToast(err instanceof Error ? err.message : 'Deletion failed.', 'error');
                  } finally {
                    setIsDeleting(false);
                    setMediaToDelete(null);
                  }
                }}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Media'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Toast Notification */}
      {statusToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-5 py-3 rounded-sm shadow-xl flex items-center gap-2.5 text-xs font-medium max-w-[90vw] animate-in fade-in slide-in-from-bottom-2">
          {statusToast.type === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
          {statusToast.type === 'info' && <RefreshCw className="w-4 h-4 text-sky-400 shrink-0 animate-spin" />}
          {statusToast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span className="leading-snug">{statusToast.message}</span>
        </div>
      )}
    </div>
  );
};
