import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MediaItem } from '../types';
import { downloadMediaFile } from '../utils/download';
import { shareContent } from '../utils/share';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { 
  X, ChevronLeft, ChevronRight, Download, Share2, Info, 
  Play, Pause, Volume2, VolumeX, Check, AlertCircle, RefreshCw, FileText
} from 'lucide-react';

interface FullscreenViewerProps {
  items: MediaItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
  eventTitle: string;
}

export const FullscreenViewer: React.FC<FullscreenViewerProps> = ({
  items,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  eventTitle,
}) => {
  const currentItem = items[currentIndex];
  const [showInfo, setShowInfo] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [statusToast, setStatusToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Video state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);

  // Touch swipe support
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success', duration = 3500) => {
    setStatusToast({ message, type });
    setTimeout(() => {
      setStatusToast(null);
    }, duration);
  };

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else {
      onNavigate(items.length - 1);
    }
  }, [currentIndex, items.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      onNavigate(0);
    }
  }, [currentIndex, items.length, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showInfo) setShowInfo(false);
        else onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'i' || e.key === 'I') {
        setShowInfo((prev) => !prev);
      } else if (e.key === ' ' && currentItem?.type === 'video') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose, showInfo, currentItem]);

  // Reset media & video state when item changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setVideoError(false);
    setMediaLoading(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [currentIndex]);

  if (!isOpen || !currentItem) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Video play error:', err);
        setIsPlaying(false);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Safe filename generation for download
  const mediaFilename = `${eventTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${currentItem.id}.${currentItem.type === 'video' ? 'mp4' : 'jpg'}`;

  // Download handler
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);

    const targetUrl = resolveMediaUrl(
      currentItem.type === 'video' && currentItem.videoSrc
        ? currentItem.videoSrc
        : currentItem.url
    );

    const result = await downloadMediaFile(targetUrl, mediaFilename, (status) => {
      setStatusToast({ message: status, type: 'info' });
    });

    setDownloading(false);
    if (result.success) {
      showToast(result.message, result.isFallback ? 'info' : 'success', 4500);
    } else {
      showToast(result.message, 'error', 5000);
    }
  };

  // Share handler
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/#media=${currentItem.id}`;
    const result = await shareContent({
      title: `${currentItem.title} · ${eventTitle}`,
      text: currentItem.caption || `View "${currentItem.title}" from ${eventTitle}`,
      url: shareUrl,
    });

    if (result.method !== 'cancelled') {
      showToast(result.message, result.success ? 'success' : 'error', 3000);
    }
  };

  // Touch handlers for mobile swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    // Only handle horizontal swipe if horizontal movement is dominant
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#0A0A0A] text-white flex flex-col select-none touch-manipulation overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 bg-black/70 backdrop-blur-md border-b border-white/10 z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-white"
            aria-label="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-xs sm:text-sm text-neutral-300 tabular-nums">
            <span className="font-semibold text-white">{currentIndex + 1}</span>
            <span className="mx-1.5 opacity-40">/</span>
            <span>{items.length}</span>
          </div>
        </div>

        {/* Title or Filename */}
        <div className="truncate px-2 text-center max-w-[40vw] text-xs sm:text-sm font-medium text-neutral-200">
          <span className="truncate">{currentItem.title}</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Share */}
          <button
            onClick={handleShare}
            className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="Share this media item"
            aria-label="Share this media item"
          >
            <Share2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Info toggle */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-md transition-colors ${
              showInfo ? 'bg-white/20 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
            title="Media details & EXIF"
            aria-label="Media details and EXIF"
          >
            <Info className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Download Original Action */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 bg-white text-neutral-900 hover:bg-neutral-200 text-xs font-semibold rounded-sm transition-colors disabled:opacity-50"
            title="Download full quality original"
          >
            {downloading ? (
              <div className="w-3.5 h-3.5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{downloading ? 'Saving...' : 'Download'}</span>
            <span className="text-[11px] font-normal text-neutral-600 hidden md:inline">({currentItem.fileSize})</span>
          </button>
        </div>
      </div>

      {/* Main Media Stage */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        
        {/* Navigation Arrows */}
        <button
          onClick={handlePrev}
          className="absolute left-2 sm:left-6 z-20 p-2 sm:p-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/80 rounded-full transition-all focus:outline-none focus:ring-1 focus:ring-white/50"
          aria-label="Previous item"
        >
          <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>

        <button
          onClick={handleNext}
          className="absolute right-2 sm:right-6 z-20 p-2 sm:p-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/80 rounded-full transition-all focus:outline-none focus:ring-1 focus:ring-white/50"
          aria-label="Next item"
        >
          <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>

        {/* Media Container */}
        <div className="w-full h-full flex items-center justify-center relative">
          
          {/* Loading spinner while media loads */}
          {mediaLoading && !videoError && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {currentItem.type === 'video' ? (
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              {videoError ? (
                <div className="p-8 bg-neutral-900/90 border border-neutral-800 rounded-md text-center max-w-md space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <h4 className="text-sm font-semibold text-white">Video Playback Notice</h4>
                  <p className="text-xs text-neutral-400">
                    The external video stream could not be loaded directly. You can still download the original clip or inspect the details.
                  </p>
                  <button
                    onClick={() => {
                      setVideoError(false);
                      setMediaLoading(true);
                      if (videoRef.current) {
                        videoRef.current.load();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-neutral-900 rounded text-xs font-semibold hover:bg-neutral-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Playback</span>
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={currentItem.videoSrc || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                    poster={resolveMediaUrl(currentItem.url)}
                    className="max-h-[75vh] max-w-full object-contain rounded-xs shadow-2xl"
                    playsInline
                    muted={isMuted}
                    onLoadedData={() => setMediaLoading(false)}
                    onError={() => {
                      setVideoError(true);
                      setMediaLoading(false);
                    }}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    onClick={togglePlay}
                  />

                  {/* Video Play/Pause Center Indicator when paused */}
                  {!isPlaying && !mediaLoading && (
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs hover:scale-105 transition-transform"
                      aria-label="Play video"
                    >
                      <Play className="w-7 h-7 fill-current ml-1" />
                    </button>
                  )}

                  {/* Interactive Video Control Overlay */}
                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 bg-black/80 backdrop-blur-md rounded-md p-2 sm:p-2.5 flex items-center gap-2 sm:gap-3 text-xs z-30">
                    <button
                      onClick={togglePlay}
                      className="p-1 hover:text-amber-300 transition-colors"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>

                    <span className="tabular-nums text-neutral-300 text-[10px] sm:text-[11px] whitespace-nowrap">
                      {formatTime(currentTime)} / {formatTime(duration || 30)}
                    </span>

                    <input
                      type="range"
                      min="0"
                      max={duration || 30}
                      step="0.1"
                      value={currentTime}
                      onChange={handleSeek}
                      className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                    />

                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1 hover:text-white transition-colors"
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <img
              src={resolveMediaUrl(currentItem.url)}
              alt={currentItem.title}
              referrerPolicy="no-referrer"
              onLoad={() => setMediaLoading(false)}
              onError={() => setMediaLoading(false)}
              className="max-h-[82vh] max-w-full object-contain rounded-xs shadow-2xl transition-all duration-200"
            />
          )}
        </div>

        {/* Collapsible Info Drawer */}
        {showInfo && (
          <aside className="absolute right-0 top-0 bottom-0 w-80 max-w-[88vw] bg-[#141414]/95 backdrop-blur-xl border-l border-white/10 p-5 overflow-y-auto z-30 flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white tracking-wide uppercase font-serif-display">Media Details</h3>
                <button
                  onClick={() => setShowInfo(false)}
                  className="p-1 text-white/60 hover:text-white"
                  aria-label="Close details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="text-base font-medium text-white mb-1">{currentItem.title}</h4>
                {currentItem.caption && (
                  <p className="text-xs text-neutral-400 leading-relaxed">{currentItem.caption}</p>
                )}
              </div>

              {/* Technical File Specifications */}
              <div className="space-y-2.5 text-xs text-neutral-300">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  File Properties
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-neutral-400">Filename</span>
                  <span className="font-mono text-[11px] truncate max-w-[150px]">{mediaFilename}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-neutral-400">Type</span>
                  <span className="capitalize">{currentItem.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-neutral-400">Resolution</span>
                  <span>{currentItem.dimensions}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-neutral-400">Original Size</span>
                  <span>{currentItem.fileSize}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-neutral-400">Captured</span>
                  <span>{currentItem.capturedAt}</span>
                </div>
              </div>

              {/* Camera EXIF Data */}
              {currentItem.exif && (
                <div className="space-y-2.5 text-xs text-neutral-300">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Camera & Capture EXIF
                  </div>
                  {currentItem.exif.camera && (
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-neutral-400">Camera</span>
                      <span>{currentItem.exif.camera}</span>
                    </div>
                  )}
                  {currentItem.exif.lens && (
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-neutral-400">Lens</span>
                      <span className="truncate max-w-[150px]">{currentItem.exif.lens}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    {currentItem.exif.aperture && (
                      <div className="bg-white/5 p-2 rounded">
                        <span className="text-neutral-400 block text-[10px]">Aperture</span>
                        <span className="font-mono">{currentItem.exif.aperture}</span>
                      </div>
                    )}
                    {currentItem.exif.shutterSpeed && (
                      <div className="bg-white/5 p-2 rounded">
                        <span className="text-neutral-400 block text-[10px]">Shutter</span>
                        <span className="font-mono">{currentItem.exif.shutterSpeed}</span>
                      </div>
                    )}
                    {currentItem.exif.iso && (
                      <div className="bg-white/5 p-2 rounded">
                        <span className="text-neutral-400 block text-[10px]">ISO</span>
                        <span className="font-mono">{currentItem.exif.iso}</span>
                      </div>
                    )}
                    {currentItem.exif.focalLength && (
                      <div className="bg-white/5 p-2 rounded">
                        <span className="text-neutral-400 block text-[10px]">Focal</span>
                        <span className="font-mono">{currentItem.exif.focalLength}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-neutral-950 font-medium text-xs rounded hover:bg-neutral-200 transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading ? 'Downloading...' : 'Save Original Resolution'}</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Bar on Mobile / Desktop */}
      <div className="px-4 py-2.5 bg-black/70 backdrop-blur-md border-t border-white/10 flex items-center justify-between text-xs text-neutral-400 z-30 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="truncate">{currentItem.caption || currentItem.title}</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{currentItem.capturedAt}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden md:inline text-[11px] text-neutral-500">
            Swipe or use arrow keys
          </span>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="sm:hidden text-white flex items-center gap-1.5 font-medium px-2 py-1 bg-white/10 rounded"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Status Toast Notification */}
      {statusToast && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 text-white border border-neutral-700 px-4 py-2.5 rounded-sm shadow-xl flex items-center gap-2.5 text-xs font-medium max-w-[90vw] animate-in fade-in slide-in-from-bottom-2">
          {statusToast.type === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
          {statusToast.type === 'info' && <RefreshCw className="w-4 h-4 text-sky-400 shrink-0 animate-spin" />}
          {statusToast.type === 'error' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
          <span className="leading-snug">{statusToast.message}</span>
        </div>
      )}
    </div>
  );
};
