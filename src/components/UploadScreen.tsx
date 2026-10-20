import React, { useState, useRef, useMemo } from 'react';
import { EventGallery, MediaItem, AppView } from '../types';
import { uploadMediaToEvent, FirebaseMediaRecord } from '../firebase/eventService';
import { 
  validateMediaHeader, 
  generatePhotoThumbnail, 
  generateVideoThumbnail 
} from '../utils/thumbnailGenerator';
import { useAuth } from '../context/AuthContext';
import { 
  UploadCloud, ArrowLeft, CheckCircle2, Film, Image as ImageIcon, 
  X, AlertCircle, RefreshCw, Eye, Sparkles, Plus, StopCircle, Check,
  Settings2, Sliders, Trash2, Camera, ShieldCheck, Play, ArrowRight,
  Filter, Layers, Info
} from 'lucide-react';

interface UploadScreenProps {
  event: EventGallery;
  onMediaUploaded: (eventId: string, newItems: MediaItem[]) => void;
  onNavigate: (view: AppView) => void;
  onDeleteMedia?: (mediaId: string, storagePath?: string, thumbnailStoragePath?: string) => Promise<void>;
}

export interface QueuedItem {
  id: string;
  mediaId: string;
  file?: File;
  previewUrl: string;
  name: string;
  customTitle?: string;
  caption?: string;
  type: 'photo' | 'video';
  sizeFormatted: string;
  sizeBytes: number;
  progress: number;
  status: 'pending' | 'processing-thumb' | 'uploading' | 'completed' | 'cancelled' | 'error';
  errorMessage?: string;
  errorCode?: string;
  uploadTaskRef?: any;
  uploadedRecord?: FirebaseMediaRecord;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  event,
  onMediaUploaded,
  onNavigate,
  onDeleteMedia,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const { currentUser } = useAuth();
  
  // Navigation tabs between batch upload and managing existing gallery media
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');

  // Configurable upload limits state (in megabytes)
  const [maxPhotoMB, setMaxPhotoMB] = useState<number>(35);
  const [maxVideoMB, setMaxVideoMB] = useState<number>(100);
  const [autoStartUpload, setAutoStartUpload] = useState<boolean>(false);
  const [generateThumbnails, setGenerateThumbnails] = useState<boolean>(true);
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);

  const [isDragging, setIsDragging] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Queue state
  const [queue, setQueue] = useState<QueuedItem[]>([]);

  // Existing media management state
  const [manageFilter, setManageFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [itemToDelete, setItemToDelete] = useState<MediaItem | null>(null);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success', duration = 3500) => {
    setStatusToast({ message, type });
    setTimeout(() => {
      setStatusToast(null);
    }, duration);
  };

  // Computed queue statistics
  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const uploadingCount = queue.filter((q) => q.status === 'uploading' || q.status === 'processing-thumb').length;
  const pendingCount = queue.filter((q) => q.status === 'pending').length;
  const failedCount = queue.filter((q) => q.status === 'error').length;
  const hasItems = queue.length > 0;

  const overallProgress = useMemo(() => {
    if (queue.length === 0) return 0;
    const totalProgress = queue.reduce((acc, item) => acc + item.progress, 0);
    return Math.round(totalProgress / queue.length);
  }, [queue]);

  // Upload a single queued item
  const startUpload = async (item: QueuedItem) => {
    if (!item.file) return;

    try {
      // Step 1: Magic byte verification (prevent extension spoofing)
      const headerCheck = await validateMediaHeader(item.file);
      if (!headerCheck.isValid) {
        throw new Error(headerCheck.error || 'Corrupted or unsupported file format signature.');
      }

      // Step 2: Generate client-side lightweight thumbnail without loading entire file to RAM
      let thumbnailBlob: Blob | null = null;
      let width: number | undefined;
      let height: number | undefined;
      let duration: string | undefined;

      if (generateThumbnails) {
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'processing-thumb', progress: 8 } : q))
        );

        try {
          if (item.type === 'photo') {
            const thumbResult = await generatePhotoThumbnail(item.file);
            thumbnailBlob = thumbResult.thumbnailBlob;
            width = thumbResult.width;
            height = thumbResult.height;
          } else if (item.type === 'video') {
            const videoThumbResult = await generateVideoThumbnail(item.file);
            thumbnailBlob = videoThumbResult.thumbnailBlob;
            width = videoThumbResult.width;
            height = videoThumbResult.height;
            duration = videoThumbResult.duration;
          }
        } catch (thumbErr) {
          console.warn('Thumbnail generation note; proceeding with original file preview:', thumbErr);
        }
      }

      // Step 3: Resumable upload directly to Firebase Storage
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 0, errorMessage: undefined, errorCode: undefined } : q))
      );

      const titleToUse = item.customTitle?.trim() || item.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

      const record = await uploadMediaToEvent(event.id, item.file, {
        mediaId: item.mediaId,
        title: titleToUse,
        caption: item.caption,
        thumbnailBlob,
        width,
        height,
        duration,
        event,
        onTaskCreated: (task) => {
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, uploadTaskRef: task } : q))
          );
        },
        onProgress: (percent) => {
          // Requirement 5: Update the progress bar using the actual Firebase upload progress (0 - 100%)
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    progress: percent,
                    status: 'uploading',
                  }
                : q
            )
          );
        },
      });

      // Step 4: Confirmed complete state
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                previewUrl: record.thumbnailUrl || record.url,
                progress: 100,
                status: 'completed',
                uploadedRecord: record,
              }
            : q
        )
      );
    } catch (err: any) {
      const fbCode = err?.code || (err?.name === 'FirebaseError' ? 'storage/unknown' : undefined);
      const fbMessage = err?.message || 'Firebase Storage upload failed. Please try again.';

      // Requirement 8: Log actual Firebase error code and message for failed uploads
      console.error('[UploadScreen] Firebase Storage upload error:', {
        itemId: item.id,
        mediaId: item.mediaId,
        fileName: item.name,
        code: fbCode,
        message: fbMessage,
        name: err?.name,
        serverResponse: err?.serverResponse,
        rawError: err,
      });

      if (fbCode === 'storage/canceled' || item.status === 'cancelled') {
        // Upload was intentionally cancelled
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: 'cancelled',
                  errorCode: 'storage/canceled',
                  errorMessage: 'Upload was paused or cancelled.',
                }
              : q
          )
        );
        return;
      }

      // Format helpful error description showing the underlying Firebase error code
      let formattedMsg = fbCode ? `[${fbCode}] ${fbMessage}` : fbMessage;
      if (fbCode === 'storage/unauthorized') {
        formattedMsg = `[storage/unauthorized] Permission denied. Please verify Firebase Storage security rules for events/${event.id}/originals.`;
      } else if (fbCode === 'storage/bucket-not-found') {
        formattedMsg = `[storage/bucket-not-found] Storage bucket not found. Please verify VITE_FIREBASE_STORAGE_BUCKET.`;
      } else if (fbCode === 'storage/quota-exceeded') {
        formattedMsg = `[storage/quota-exceeded] Project storage quota exceeded.`;
      } else if (fbCode === 'storage/retry-limit-exceeded') {
        formattedMsg = `[storage/retry-limit-exceeded] Upload timed out. Please check your internet connection and retry.`;
      }

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                status: 'error',
                errorCode: fbCode,
                errorMessage: formattedMsg,
              }
            : q
        )
      );
    }
  };

  // Add files to queue with duplicate prevention & validation against configurable limits
  const processFiles = (fileList: FileList) => {
    setGeneralError(null);
    const newItems: QueuedItem[] = [];
    const maxPhotoBytes = maxPhotoMB * 1024 * 1024;
    const maxVideoBytes = maxVideoMB * 1024 * 1024;

    Array.from(fileList).forEach((file, idx) => {
      // 1. Duplicate check in queue
      const isDuplicateInQueue = queue.some(
        (existing) => existing.name === file.name && existing.sizeBytes === file.size
      );
      if (isDuplicateInQueue) {
        setGeneralError(`Skipped duplicate: "${file.name}" is already in the upload queue.`);
        return;
      }

      // 2. Duplicate check against existing event media
      const isDuplicateInEvent = event.items.some(
        (existing) => existing.title.toLowerCase() === file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').toLowerCase()
      );
      if (isDuplicateInEvent) {
        setGeneralError(`Notice: "${file.name}" appears to match an existing item in this event.`);
      }

      // 3. Validate allowed types
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
      const isPhoto = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic|heif|gif)$/i.test(file.name);

      if (!isPhoto && !isVideo) {
        setGeneralError(`"${file.name}" is not an accepted format. Only images and videos are supported.`);
        return;
      }

      // 4. Configurable size limit validation
      if (isPhoto && file.size > maxPhotoBytes) {
        setGeneralError(`Photo "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds current ${maxPhotoMB}MB limit.`);
        return;
      }

      if (isVideo && file.size > maxVideoBytes) {
        setGeneralError(`Video "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds current ${maxVideoMB}MB limit.`);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      const mediaId = `med-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).substring(2, 6)}`;

      const queuedItem: QueuedItem = {
        id: `upl-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        mediaId,
        file,
        previewUrl,
        name: file.name,
        customTitle: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        type: isVideo ? 'video' : 'photo',
        sizeFormatted: sizeMB,
        sizeBytes: file.size,
        progress: 0,
        status: 'pending',
      };

      newItems.push(queuedItem);
    });

    if (newItems.length === 0) return;

    setQueue((prev) => [...prev, ...newItems]);

    // If auto-start is enabled, immediately trigger uploads; otherwise remain in pending for review
    if (autoStartUpload) {
      newItems.forEach((item) => {
        startUpload(item);
      });
    }
  };

  // Start uploading all pending items
  const handleUploadAllPending = () => {
    const pendingItems = queue.filter((item) => item.status === 'pending');
    if (pendingItems.length === 0) return;
    pendingItems.forEach((item) => {
      startUpload(item);
    });
  };

  // Retry all failed or cancelled items
  const handleRetryAllFailed = () => {
    const failedItems = queue.filter((item) => item.status === 'error' || item.status === 'cancelled');
    failedItems.forEach((item) => {
      startUpload(item);
    });
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Cancel an active upload
  const handleCancelUpload = (item: QueuedItem) => {
    if (item.uploadTaskRef && typeof item.uploadTaskRef.cancel === 'function') {
      try {
        item.uploadTaskRef.cancel();
      } catch (e) {
        console.warn('Cancel call note:', e);
      }
    }
    setQueue((prev) =>
      prev.map((q) =>
        q.id === item.id
          ? {
              ...q,
              status: 'cancelled',
              errorMessage: 'Upload paused by user.',
            }
          : q
      )
    );
  };

  // Remove queued file before or after uploading
  const handleRemoveQueueItem = (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (item && item.status === 'uploading') {
      handleCancelUpload(item);
    }
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all pending items
  const handleClearPending = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'pending'));
  };

  // Retry single failed upload without creating duplicate records
  const handleRetry = (item: QueuedItem) => {
    if (!item.file) return;
    const retryItem: QueuedItem = {
      ...item,
      status: 'pending',
      progress: 0,
      errorMessage: undefined,
      errorCode: undefined,
    };
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? retryItem : q))
    );
    startUpload(retryItem);
  };

  // Update item title or caption in queue
  const handleUpdateItemMeta = (id: string, updates: { customTitle?: string; caption?: string }) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  // Add realistic high-res sample photos for immediate testing
  const handleAddSamplePhotos = () => {
    const sampleItems: QueuedItem[] = [
      {
        id: `sample-${Date.now()}-1`,
        mediaId: `med-sample-${Date.now()}-1`,
        name: 'RAW_8421_Evening_Portrait.jpg',
        customTitle: 'Golden Hour Couple Portrait',
        caption: 'Captured with 85mm f/1.4 lens at sundown.',
        previewUrl: '/images/event_media_portrait_1792116549596.jpg',
        type: 'photo',
        sizeFormatted: '9.4 MB',
        sizeBytes: 9.4 * 1024 * 1024,
        progress: 100,
        status: 'completed',
      },
      {
        id: `sample-${Date.now()}-2`,
        mediaId: `med-sample-${Date.now()}-2`,
        name: 'CLIP_042_Dance_Floor_Live.mp4',
        customTitle: 'Celebration Dance Floor Dynamic',
        caption: 'High-energy celebration recorded in 4K 60fps.',
        previewUrl: '/images/event_media_dancefloor_1792116549721.jpg',
        type: 'video',
        sizeFormatted: '26.8 MB',
        sizeBytes: 26.8 * 1024 * 1024,
        progress: 100,
        status: 'completed',
      },
      {
        id: `sample-${Date.now()}-3`,
        mediaId: `med-sample-${Date.now()}-3`,
        name: 'TOAST_091_Crystal_Flutes.jpg',
        customTitle: 'Opening Toast & Welcome Speeches',
        caption: 'Crystal champagne flutes during evening toast.',
        previewUrl: '/images/event_media_champagne_1792116549629.jpg',
        type: 'photo',
        sizeFormatted: '8.1 MB',
        sizeBytes: 8.1 * 1024 * 1024,
        progress: 100,
        status: 'completed',
      },
    ];
    setQueue((prev) => [...prev, ...sampleItems]);
    showToast(`Added 3 sample media files to the queue.`, 'info');
  };

  // Finish batch and update event gallery immediately without duplicate records
  const handleFinishAndSave = () => {
    const completedItems = queue.filter((q) => q.status === 'completed');
    if (completedItems.length === 0) return;

    // Requirement 7: Deduplicate by ID to guarantee no duplicate gallery records
    const existingIds = new Set(event.items.map((item) => item.id));
    const newMediaItems: MediaItem[] = [];

    completedItems.forEach((item, idx) => {
      if (item.uploadedRecord) {
        if (!existingIds.has(item.uploadedRecord.id)) {
          existingIds.add(item.uploadedRecord.id);
          newMediaItems.push({
            id: item.uploadedRecord.id,
            url: item.uploadedRecord.url,
            thumbnailUrl: item.uploadedRecord.thumbnailUrl || item.uploadedRecord.url,
            type: item.uploadedRecord.type,
            title: item.uploadedRecord.title,
            caption: item.uploadedRecord.caption || '',
            width: item.uploadedRecord.width || 4032,
            height: item.uploadedRecord.height || 3024,
            aspectRatio: item.uploadedRecord.type === 'video' ? '16:9' : '4:3',
            duration: item.uploadedRecord.duration,
            fileSize: item.uploadedRecord.fileSize,
            dimensions: item.uploadedRecord.dimensions,
            capturedAt: item.uploadedRecord.capturedAt,
            uploadedAt: item.uploadedRecord.uploadedAt,
            views: 0,
            downloads: 0,
            storagePath: item.uploadedRecord.storagePath,
            thumbnailStoragePath: item.uploadedRecord.thumbnailStoragePath,
            ownerId: item.uploadedRecord.ownerId,
          });
        }
      } else {
        const fallbackId = item.mediaId || item.id;
        if (!existingIds.has(fallbackId)) {
          existingIds.add(fallbackId);
          newMediaItems.push({
            id: fallbackId,
            url: item.previewUrl,
            thumbnailUrl: item.previewUrl,
            type: item.type,
            title: item.customTitle || item.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
            caption: item.caption || 'Captured during the evening celebration.',
            width: item.type === 'video' ? 3840 : 4032,
            height: item.type === 'video' ? 2160 : 3024,
            aspectRatio: item.type === 'video' ? '16:9' : '4:3',
            duration: item.type === 'video' ? '0:28' : undefined,
            videoSrc: item.type === 'video' ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' : undefined,
            fileSize: item.sizeFormatted,
            dimensions: item.type === 'video' ? '3840 x 2160 (4K)' : '4032 x 3024 (12MP)',
            capturedAt: 'Just now',
            uploadedAt: new Date().toISOString(),
            views: 0,
            downloads: 0,
          });
        }
      }
    });

    if (newMediaItems.length > 0) {
      onMediaUploaded(event.id, newMediaItems);
      showToast(`Successfully published ${newMediaItems.length} media items to ${event.title}!`, 'success');
    }
    
    // Clear completed items from queue
    setQueue((prev) => prev.filter((q) => q.status !== 'completed'));

    setTimeout(() => {
      onNavigate('gallery');
    }, 1100);
  };

  // Filtered list of existing items for the management tab
  const filteredExistingMedia = useMemo(() => {
    if (manageFilter === 'all') return event.items;
    return event.items.filter((item) => item.type === manageFilter);
  }, [event.items, manageFilter]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24">
      {/* Top Bar */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('organizer-dashboard')}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 rounded hover:bg-neutral-100 transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold flex items-center gap-1.5">
                <span>Event Studio</span>
                <span aria-hidden="true">·</span>
                <span className="text-neutral-900 font-medium">{event.title}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-serif-display font-medium text-neutral-900">
                Media & Upload Manager
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('gallery')}
              className="text-xs text-neutral-600 hover:text-neutral-900 px-3 py-2 border border-neutral-200 rounded-sm hover:bg-neutral-50"
            >
              View Guest Gallery
            </button>
            
            {activeTab === 'upload' && (
              <button
                onClick={handleFinishAndSave}
                disabled={completedCount === 0 || uploadingCount > 0}
                className="px-4 py-2 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Finish & Add to Gallery ({completedCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Studio Sub-Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 text-xs font-medium border-t border-neutral-100 pt-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 transition-colors flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-b-2 border-neutral-950 text-neutral-950 font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Batch Upload Queue</span>
            {queue.length > 0 && (
              <span className="bg-neutral-900 text-white text-[10px] px-1.5 py-0.2 rounded-full tabular-nums">
                {queue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`pb-3 transition-colors flex items-center gap-1.5 ${
              activeTab === 'manage'
                ? 'border-b-2 border-neutral-950 text-neutral-950 font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Manage Published Media</span>
            <span className="bg-neutral-100 text-neutral-600 text-[10px] px-1.5 py-0.2 rounded-full tabular-nums">
              {event.items.length}
            </span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: BATCH UPLOAD QUEUE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            
            {/* Configurable Limits & Settings Bar */}
            <div className="bg-white border border-neutral-200/90 rounded-sm p-4 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Upload Guardrails:</span>
                  </span>
                  <span className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded text-[11px]">
                    Photos ≤ {maxPhotoMB} MB
                  </span>
                  <span className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded text-[11px]">
                    Videos ≤ {maxVideoMB} MB
                  </span>
                  <span className="text-neutral-500 text-[11px]">
                    JPG, PNG, WebP, HEIC, MP4, MOV, WebM
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConfigPanel((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-neutral-700 hover:text-neutral-950 font-semibold text-xs transition-colors self-start sm:self-auto"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>{showConfigPanel ? 'Hide Settings' : 'Configure Limits & Modes'}</span>
                </button>
              </div>

              {/* Expandable Configuration Controls */}
              {showConfigPanel && (
                <div className="pt-3 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs animate-in fade-in duration-200">
                  {/* Photo limit */}
                  <div className="space-y-1">
                    <label className="text-neutral-600 font-medium block">Max Photo Size</label>
                    <select
                      value={maxPhotoMB}
                      onChange={(e) => setMaxPhotoMB(Number(e.target.value))}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 rounded p-1.5 text-xs focus:outline-none focus:border-neutral-900"
                    >
                      <option value={15}>15 MB (Fast mobile)</option>
                      <option value={25}>25 MB (High res)</option>
                      <option value={35}>35 MB (Default)</option>
                      <option value={50}>50 MB (Pro RAW/JPEG)</option>
                      <option value={100}>100 MB (Ultra RAW)</option>
                    </select>
                  </div>

                  {/* Video limit */}
                  <div className="space-y-1">
                    <label className="text-neutral-600 font-medium block">Max Video Size</label>
                    <select
                      value={maxVideoMB}
                      onChange={(e) => setMaxVideoMB(Number(e.target.value))}
                      className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 rounded p-1.5 text-xs focus:outline-none focus:border-neutral-900"
                    >
                      <option value={50}>50 MB (Short clips)</option>
                      <option value={100}>100 MB (Default HD)</option>
                      <option value={250}>250 MB (Extended 4K)</option>
                      <option value={500}>500 MB (Feature clips)</option>
                    </select>
                  </div>

                  {/* Auto-start upload mode */}
                  <div className="space-y-1">
                    <label className="text-neutral-600 font-medium block">Upload Start Behavior</label>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="autoStartToggle"
                        checked={autoStartUpload}
                        onChange={(e) => setAutoStartUpload(e.target.checked)}
                        className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                      />
                      <label htmlFor="autoStartToggle" className="text-neutral-700 cursor-pointer">
                        Start upload immediately
                      </label>
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      When unchecked, files wait in queue so you can review and remove items before uploading.
                    </p>
                  </div>

                  {/* Web Preview Generation */}
                  <div className="space-y-1">
                    <label className="text-neutral-600 font-medium block">Thumbnail Processing</label>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="thumbnailToggle"
                        checked={generateThumbnails}
                        onChange={(e) => setGenerateThumbnails(e.target.checked)}
                        className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                      />
                      <label htmlFor="thumbnailToggle" className="text-neutral-700 cursor-pointer">
                        Generate fast web previews
                      </label>
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      Extracts video frame snapshots & lightweight thumbnails while preserving lossless original files for downloads.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* General Error Alert */}
            {generalError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-sm flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{generalError}</span>
                </div>
                <button 
                  onClick={() => setGeneralError(null)} 
                  className="p-1 hover:text-rose-900"
                  aria-label="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-sm p-8 sm:p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-neutral-900 bg-neutral-100/90 scale-[1.002]'
                  : 'border-neutral-300 bg-white hover:border-neutral-400'
              }`}
            >
              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleInputChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleInputChange}
                className="hidden"
              />

              <div className="w-14 h-14 mx-auto rounded-full bg-neutral-100 text-neutral-900 flex items-center justify-center mb-4">
                <UploadCloud className="w-7 h-7 stroke-[1.5]" />
              </div>

              <h3 className="text-base sm:text-lg font-serif-display font-medium text-neutral-900 mb-1">
                Drag and drop photos and videos, or select from device
              </h3>
              <p className="text-xs text-neutral-500 max-w-lg mx-auto mb-4">
                Original media is uploaded directly to Firebase Storage with byte-level verification. Smaller previews are automatically created for fast mobile gallery browsing.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  className="px-4 py-2 bg-neutral-900 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-neutral-800 pointer-events-none"
                >
                  Browse Media Files
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  className="px-4 py-2 bg-white border border-neutral-300 text-neutral-800 text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-neutral-50 flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Take Photo (Mobile)</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddSamplePhotos();
                  }}
                  className="px-4 py-2 bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-neutral-200 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Add High-Res Samples</span>
                </button>
              </div>
            </div>

            {/* Overall Batch Progress Header */}
            {hasItems && (
              <div className="bg-white p-4 border border-neutral-200/90 rounded-sm space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-neutral-900">
                      Overall Progress: {completedCount} of {queue.length} completed
                    </span>
                    {uploadingCount > 0 && (
                      <span className="text-neutral-500 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>{uploadingCount} uploading</span>
                      </span>
                    )}
                    {pendingCount > 0 && (
                      <span className="text-amber-700 font-medium">
                        ({pendingCount} pending review)
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-neutral-700 font-semibold tabular-nums">{overallProgress}%</span>
                </div>

                {/* Overall progress bar */}
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Queue Card List */}
            <div className="bg-white border border-neutral-200/90 rounded-sm p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-200 gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                    <span>Batch Queue</span>
                    <span className="text-neutral-500 font-normal">({queue.length} items)</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {completedCount} published · {uploadingCount} active · {pendingCount} queued · {failedCount} failed
                  </p>
                </div>

                {/* Batch Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {pendingCount > 0 && (
                    <>
                      <button
                        onClick={handleUploadAllPending}
                        disabled={uploadingCount > 0}
                        className="px-3.5 py-1.5 bg-neutral-900 text-white text-xs font-semibold rounded-sm hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Start Uploading All ({pendingCount})</span>
                      </button>
                      <button
                        onClick={handleClearPending}
                        className="text-xs text-neutral-500 hover:text-neutral-900 px-2 py-1"
                      >
                        Clear Pending
                      </button>
                    </>
                  )}

                  {failedCount > 0 && (
                    <button
                      onClick={handleRetryAllFailed}
                      className="px-3 py-1.5 bg-rose-50 border border-rose-300 text-rose-700 text-xs font-semibold rounded-sm hover:bg-rose-100 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry All Failed ({failedCount})</span>
                    </button>
                  )}

                  {queue.length > 0 && uploadingCount === 0 && (
                    <button
                      onClick={() => setQueue([])}
                      className="text-xs text-neutral-500 hover:text-neutral-900 px-2 py-1"
                    >
                      Clear Queue
                    </button>
                  )}
                </div>
              </div>

              {queue.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  Upload queue is currently empty. Drag photos & videos above to begin.
                </div>
              ) : (
                <div className="space-y-3">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 border rounded-sm transition-all ${
                        item.status === 'completed'
                          ? 'bg-neutral-50/70 border-neutral-200'
                          : item.status === 'error'
                          ? 'bg-rose-50/40 border-rose-200'
                          : item.status === 'cancelled'
                          ? 'bg-neutral-100/50 border-neutral-200'
                          : item.status === 'uploading'
                          ? 'bg-neutral-50 border-neutral-400'
                          : 'bg-white border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Thumbnail / Preview with Media Type indicator */}
                        <div className="w-16 h-16 bg-neutral-900 rounded overflow-hidden shrink-0 relative">
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          {item.type === 'video' && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                              <Film className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        {/* Middle: Details, Custom Title, and Progress Bar */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                            {/* Inline custom title input for pending items */}
                            {item.status === 'pending' ? (
                              <input
                                type="text"
                                value={item.customTitle || ''}
                                onChange={(e) => handleUpdateItemMeta(item.id, { customTitle: e.target.value })}
                                placeholder="Media Title / Caption"
                                className="font-medium text-neutral-900 bg-neutral-100/60 px-2 py-0.5 rounded border border-neutral-200 text-xs w-full max-w-sm focus:outline-none focus:border-neutral-900"
                              />
                            ) : (
                              <span className="font-medium text-neutral-900 truncate max-w-md">
                                {item.customTitle || item.name}
                              </span>
                            )}

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-neutral-500 font-mono text-[11px]">
                                {item.sizeFormatted}
                              </span>
                              <span className="uppercase font-mono text-[10px] bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">
                                {item.type}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-200 ${
                                item.status === 'completed'
                                  ? 'bg-emerald-600'
                                  : item.status === 'error'
                                  ? 'bg-rose-500'
                                  : item.status === 'cancelled'
                                  ? 'bg-neutral-400'
                                  : 'bg-neutral-900'
                              }`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>

                          {/* Status Description */}
                          <div className="flex items-center justify-between text-[11px]">
                            <div>
                              {item.status === 'pending' && (
                                <span className="text-neutral-500 font-medium">
                                  Queued · Ready to upload
                                </span>
                              )}
                              {item.status === 'processing-thumb' && (
                                <span className="text-amber-600 font-medium flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Generating fast web preview...</span>
                                </span>
                              )}
                              {item.status === 'uploading' && (
                                <span className="text-neutral-700 font-medium flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Uploading original directly to Storage... {item.progress}%</span>
                                </span>
                              )}
                              {item.status === 'completed' && (
                                <span className="text-emerald-700 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Original preserved in Storage & metadata synced</span>
                                </span>
                              )}
                              {item.status === 'cancelled' && (
                                <span className="text-neutral-500">Upload paused by user</span>
                              )}
                              {item.status === 'error' && (
                                <span className="text-rose-600 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{item.errorMessage || 'Storage upload interrupted'}</span>
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] text-neutral-400 truncate max-w-[200px] hidden sm:inline">
                              {item.name}
                            </span>
                          </div>
                        </div>

                        {/* Actions per item */}
                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          {/* Pending: Single Upload Button */}
                          {item.status === 'pending' && (
                            <button
                              onClick={() => startUpload(item)}
                              className="px-2.5 py-1 bg-neutral-900 text-white rounded text-[11px] font-semibold hover:bg-neutral-800"
                              title="Start upload for this file"
                            >
                              Upload
                            </button>
                          )}

                          {/* Uploading: Cancel Button */}
                          {item.status === 'uploading' && (
                            <button
                              onClick={() => handleCancelUpload(item)}
                              className="p-1.5 text-neutral-500 hover:text-rose-600 rounded hover:bg-neutral-200 transition-colors"
                              title="Cancel or pause upload"
                              aria-label="Cancel upload"
                            >
                              <StopCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Error or Cancelled: Retry Button */}
                          {(item.status === 'error' || item.status === 'cancelled') && item.file && (
                            <button
                              onClick={() => handleRetry(item)}
                              className="px-2 py-1 text-neutral-700 hover:text-neutral-950 bg-white border border-neutral-300 rounded text-[11px] font-semibold flex items-center gap-1"
                              title="Retry upload"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Retry</span>
                            </button>
                          )}

                          {/* Remove from queue button */}
                          <button
                            onClick={() => handleRemoveQueueItem(item.id)}
                            className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                            aria-label="Remove from queue"
                            title="Remove from queue"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>Media is organized in Firebase Storage (`events/{event.id}/originals/*`). Original quality is strictly preserved.</span>
                </div>

                <button
                  onClick={handleFinishAndSave}
                  disabled={completedCount === 0 || uploadingCount > 0}
                  className="px-5 py-2.5 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Publish {completedCount} Media to Gallery</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: MANAGE PUBLISHED EVENT MEDIA */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'manage' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Filter & Summary Header */}
            <div className="bg-white p-4 border border-neutral-200/90 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                  Published Gallery Media ({event.items.length})
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Manage, preview, and permanently remove photos and videos from Cloud Storage & Firestore.
                </p>
              </div>

              {/* Type Filter Buttons */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setManageFilter('all')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    manageFilter === 'all'
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  All ({event.items.length})
                </button>
                <button
                  onClick={() => setManageFilter('photo')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    manageFilter === 'photo'
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Photos ({event.items.filter((i) => i.type === 'photo').length})
                </button>
                <button
                  onClick={() => setManageFilter('video')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    manageFilter === 'video'
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Videos ({event.items.filter((i) => i.type === 'video').length})
                </button>
              </div>
            </div>

            {/* Media Items Table / Grid */}
            {filteredExistingMedia.length === 0 ? (
              <div className="bg-white border border-neutral-200 p-12 text-center rounded-sm space-y-3">
                <ImageIcon className="w-10 h-10 text-neutral-300 mx-auto" />
                <h4 className="text-sm font-medium text-neutral-700">No media found in this filter</h4>
                <p className="text-xs text-neutral-400">Switch to the Batch Upload tab to add new photos and videos.</p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-sm hover:bg-neutral-800"
                >
                  Go to Upload Queue
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredExistingMedia.map((media) => (
                  <div
                    key={media.id}
                    className="bg-white border border-neutral-200/90 rounded-sm overflow-hidden flex flex-col justify-between shadow-xs hover:border-neutral-400 transition-all"
                  >
                    <div>
                      {/* Media Image / Video Thumbnail */}
                      <div className="relative aspect-[4/3] bg-neutral-900 overflow-hidden">
                        <img
                          src={media.thumbnailUrl || media.url}
                          alt={media.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        {media.type === 'video' && (
                          <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                            <Film className="w-3 h-3 text-amber-300" />
                            <span>{media.duration || 'Video'}</span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded">
                          {media.fileSize}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-3.5 space-y-1">
                        <h4 className="text-xs font-semibold text-neutral-900 line-clamp-1">{media.title}</h4>
                        <p className="text-[11px] text-neutral-500 line-clamp-1">{media.caption || 'No caption'}</p>
                        <div className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-100 flex items-center justify-between">
                          <span>{media.dimensions}</span>
                          <span>{media.capturedAt}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: View in Gallery / Delete Media */}
                    <div className="p-2.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
                      <a
                        href={media.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-neutral-600 hover:text-neutral-950 font-medium flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Original</span>
                      </a>

                      <button
                        onClick={() => setItemToDelete(media)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete this media"
                        aria-label={`Delete ${media.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 max-w-sm w-full p-6 rounded-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-rose-600 font-semibold text-sm">
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Permanently Delete Media?</span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-neutral-900 font-semibold">"{itemToDelete.title}"</strong>? 
              This will remove the original file and thumbnail from Firebase Storage and update gallery records. This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                onClick={() => setItemToDelete(null)}
                disabled={isDeletingMedia}
                className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-300 rounded hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!itemToDelete || !onDeleteMedia) return;
                  setIsDeletingMedia(true);
                  try {
                    await onDeleteMedia(
                      itemToDelete.id, 
                      itemToDelete.storagePath, 
                      itemToDelete.thumbnailStoragePath
                    );
                    showToast(`Deleted "${itemToDelete.title}" from gallery.`, 'success');
                  } catch (err: unknown) {
                    showToast(err instanceof Error ? err.message : 'Deletion failed.', 'error');
                  } finally {
                    setIsDeletingMedia(false);
                    setItemToDelete(null);
                  }
                }}
                disabled={isDeletingMedia}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingMedia && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>{isDeletingMedia ? 'Deleting...' : 'Delete Media'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Toast Notification */}
      {statusToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-5 py-3 rounded-sm shadow-xl flex items-center gap-2.5 text-xs font-medium max-w-[90vw] animate-in fade-in slide-in-from-bottom-2">
          {statusToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {statusToast.type === 'info' && <RefreshCw className="w-4 h-4 text-sky-400 shrink-0 animate-spin" />}
          {statusToast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span className="leading-snug">{statusToast.message}</span>
        </div>
      )}
    </div>
  );
};
