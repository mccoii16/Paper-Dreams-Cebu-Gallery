import React, { useState, useMemo } from 'react';
import { EventGallery, MediaItem, AppView } from '../types';
import { shareContent } from '../utils/share';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { useAuth } from '../context/AuthContext';
import { ShareQRModal } from './ShareQRModal';
import { EventCustomizerModal } from './EventCustomizerModal';
import { MediaManagerModal } from './MediaManagerModal';
import { 
  Plus, Eye, UploadCloud, QrCode, Search, Filter, 
  Calendar, MapPin, HardDrive, MoreVertical, Check, Copy, 
  Settings, Trash2, Edit3, Globe, Lock, ShieldCheck, LogIn, 
  Download, Image as ImageIcon, Video, Layers, ArrowUpDown,
  Sparkles, CheckCircle2, ChevronRight, AlertTriangle, ExternalLink,
  SlidersHorizontal, LayoutDashboard, Share2
} from 'lucide-react';

interface OrganizerDashboardProps {
  events: EventGallery[];
  onNavigate: (view: AppView) => void;
  onSelectEvent: (eventId: string) => void;
  onDeleteEvent?: (eventId: string) => void;
  onTogglePublish?: (eventId: string) => void;
  onOpenAuth?: () => void;
  onUpdateEvent?: (updatedEvent: EventGallery) => Promise<void>;
  onDeleteMedia?: (mediaId: string, storagePath?: string, thumbnailStoragePath?: string) => Promise<void>;
  onBatchDeleteMedia?: (items: { id: string; storagePath?: string; thumbnailStoragePath?: string }[]) => Promise<void>;
  onUpdateMediaMetadata?: (eventId: string, mediaId: string, title: string, caption: string) => Promise<void>;
  onReorderMedia?: (eventId: string, reorderedItems: MediaItem[]) => void;
}

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  events,
  onNavigate,
  onSelectEvent,
  onDeleteEvent,
  onTogglePublish,
  onOpenAuth,
  onUpdateEvent,
  onDeleteMedia,
  onBatchDeleteMedia,
  onUpdateMediaMetadata,
  onReorderMedia,
}) => {
  const { currentUser } = useAuth();

  // Active navigation tab
  const [activeNav, setActiveNav] = useState<'events' | 'media-manager' | 'branding' | 'analytics'>('events');

  // Search & Filter & Sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title' | 'media-count'>('date-desc');

  // Modals state
  const [shareEvent, setShareEvent] = useState<EventGallery | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventGallery | null>(null);
  const [managingMediaEvent, setManagingMediaEvent] = useState<EventGallery | null>(null);
  const [eventToDelete, setEventToDelete] = useState<EventGallery | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Dynamic Metrics Calculation
  const metrics = useMemo(() => {
    let totalPhotos = 0;
    let totalVideos = 0;
    let estimatedStorageBytes = 0;

    events.forEach((evt) => {
      totalPhotos += evt.stats.photosCount || evt.items.filter((m) => m.type === 'photo').length;
      totalVideos += evt.stats.videosCount || evt.items.filter((m) => m.type === 'video').length;

      // Calculate approximate storage usage
      evt.items.forEach((item) => {
        const val = parseFloat(item.fileSize.replace(/[^0-9.]/g, '')) || 5;
        if (item.fileSize.toLowerCase().includes('gb')) {
          estimatedStorageBytes += val * 1024 * 1024 * 1024;
        } else if (item.fileSize.toLowerCase().includes('kb')) {
          estimatedStorageBytes += val * 1024;
        } else {
          // MB default
          estimatedStorageBytes += val * 1024 * 1024;
        }
      });
    });

    const storageInMB = estimatedStorageBytes / (1024 * 1024);
    const storageFormatted =
      storageInMB > 1024
        ? `${(storageInMB / 1024).toFixed(2)} GB`
        : `${Math.round(storageInMB || 48)} MB`;

    return {
      totalEvents: events.length,
      activeEvents: events.filter((e) => e.status === 'active').length,
      draftEvents: events.filter((e) => e.status === 'draft').length,
      totalPhotos,
      totalVideos,
      storageFormatted,
    };
  }, [events]);

  // Filtered & Sorted Events List
  const filteredEvents = useMemo(() => {
    let list = events.filter((e) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.slug.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    list.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'media-count') {
        return (b.stats.totalMedia || b.items.length) - (a.stats.totalMedia || a.items.length);
      }
      return 0;
    });

    return list;
  }, [events, searchTerm, statusFilter, sortBy]);

  const handleCopyLink = async (slug: string, eventTitle: string) => {
    const url = `${window.location.origin}/#event=${slug}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2200);
    } catch (err) {
      console.warn('Copy link error:', err);
    }
  };

  const handleOpenGuestView = (eventId: string) => {
    onSelectEvent(eventId);
    onNavigate('gallery');
  };

  const handleOpenUpload = (eventId: string) => {
    onSelectEvent(eventId);
    onNavigate('upload-media');
  };

  const handleConfirmDelete = () => {
    if (eventToDelete && onDeleteEvent) {
      onDeleteEvent(eventToDelete.id);
      setEventToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-neutral-900 flex flex-col md:flex-row">
      {/* ============================================================== */}
      {/* DESKTOP SIDEBAR + MOBILE NAVIGATION CONTRACT                     */}
      {/* ============================================================== */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-neutral-200/90 flex flex-col shrink-0">
        {/* Studio Brand Header */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-pink-500">
              Paper Dreams Cebu
            </div>
            <h2 className="text-base font-serif-display font-semibold text-neutral-900 tracking-tight">
              Organizer Studio
            </h2>
          </div>
          <button
            onClick={() => onNavigate('create-event')}
            className="md:hidden p-2 bg-neutral-950 text-white rounded-sm text-xs font-semibold"
            title="Create Event"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Organizer Account Status Pill */}
        <div className="px-5 py-3 bg-neutral-50/60 border-b border-neutral-100 flex items-center justify-between text-xs">
          <div className="min-w-0 flex-1 pr-2">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
              Organizer Profile
            </span>
            <div className="font-semibold text-neutral-800 truncate text-xs">
              {currentUser?.displayName || currentUser?.email || 'Elena Vance Studio'}
            </div>
          </div>
          {!currentUser && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-2 py-1 bg-white hover:bg-neutral-100 border border-neutral-200 rounded text-[11px] font-semibold text-neutral-800 whitespace-nowrap"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 flex-1">
          <button
            onClick={() => setActiveNav('events')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-colors ${
              activeNav === 'events'
                ? 'bg-neutral-950 text-white font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
              <span>Events & Galleries</span>
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
              activeNav === 'events' ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-200 text-neutral-700'
            }`}>
              {events.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveNav('media-manager');
              if (events.length > 0 && !managingMediaEvent) {
                setManagingMediaEvent(events[0]);
              }
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-colors ${
              activeNav === 'media-manager'
                ? 'bg-neutral-950 text-white font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Layers className="w-4 h-4" />
              <span>Media Library</span>
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">
              {metrics.totalPhotos + metrics.totalVideos}
            </span>
          </button>

          <button
            onClick={() => setActiveNav('branding')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-colors ${
              activeNav === 'branding'
                ? 'bg-neutral-950 text-white font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Studio Branding</span>
            </span>
          </button>
        </nav>

        {/* Sidebar Footer with Live Storage Meter */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50/70 space-y-3">
          <div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
                <span>Cloud Storage</span>
              </span>
              <span className="font-mono text-neutral-900 font-semibold">{metrics.storageFormatted}</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
              <div className="h-full bg-neutral-900 rounded-full" style={{ width: '12%' }} />
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">
              {metrics.totalPhotos} photos · {metrics.totalVideos} videos
            </div>
          </div>

          <button
            onClick={() => onNavigate('create-event')}
            className="w-full hidden md:inline-flex items-center justify-center gap-2 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Event</span>
          </button>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MAIN DASHBOARD CONTENT AREA                                      */}
      {/* ============================================================== */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Header & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold mb-0.5">
              Executive Overview
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif-display font-medium text-neutral-900">
              Event Management & Galleries
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Curate guest experiences, customize visual themes, and oversee event media.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => onNavigate('create-event')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-950 text-white hover:bg-neutral-850 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Event</span>
            </button>
          </div>
        </div>

        {/* Demo Session Notice if not signed in */}
        {!currentUser && onOpenAuth && (
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Cloud Firestore Ready:</strong> Sign in with Google or Email to link your personal events, secure PINs, and persistent cloud uploads.
              </span>
            </div>
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 bg-amber-900 text-white font-semibold rounded text-[11px] hover:bg-amber-800 shrink-0 self-start sm:self-auto"
            >
              Sign In Organizer
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* KPI METRIC STRIP: Total Events, Photos, Videos, Storage Usage   */}
        {/* ============================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Total Events */}
          <div className="bg-white p-5 border border-neutral-200/90 rounded-sm shadow-2xs">
            <div className="text-[11px] uppercase font-semibold text-neutral-500 tracking-wider">
              Total Events
            </div>
            <div className="text-2xl sm:text-3xl font-serif-display font-semibold text-neutral-900 mt-1.5 tabular-nums">
              {metrics.totalEvents}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{metrics.activeEvents} published · {metrics.draftEvents} draft</span>
            </div>
          </div>

          {/* Total Photos */}
          <div className="bg-white p-5 border border-neutral-200/90 rounded-sm shadow-2xs">
            <div className="text-[11px] uppercase font-semibold text-neutral-500 tracking-wider">
              Total Photos
            </div>
            <div className="text-2xl sm:text-3xl font-serif-display font-semibold text-neutral-900 mt-1.5 tabular-nums flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-neutral-400" />
              <span>{metrics.totalPhotos}</span>
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              High-resolution guest originals
            </div>
          </div>

          {/* Total Videos */}
          <div className="bg-white p-5 border border-neutral-200/90 rounded-sm shadow-2xs">
            <div className="text-[11px] uppercase font-semibold text-neutral-500 tracking-wider">
              Total Videos
            </div>
            <div className="text-2xl sm:text-3xl font-serif-display font-semibold text-neutral-900 mt-1.5 tabular-nums flex items-center gap-2">
              <Video className="w-5 h-5 text-neutral-400" />
              <span>{metrics.totalVideos}</span>
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              4K & 1080p highlights
            </div>
          </div>

          {/* Storage Usage */}
          <div className="bg-white p-5 border border-neutral-200/90 rounded-sm shadow-2xs">
            <div className="text-[11px] uppercase font-semibold text-neutral-500 tracking-wider">
              Storage In Use
            </div>
            <div className="text-2xl sm:text-3xl font-serif-display font-semibold text-neutral-900 mt-1.5 tabular-nums flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-neutral-400" />
              <span>{metrics.storageFormatted}</span>
            </div>
            <div className="text-[11px] text-emerald-700 mt-1 font-medium">
              Firebase Storage Healthy
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* VIEW 1: EVENTS OVERVIEW & MANAGEMENT                             */}
        {/* ============================================================== */}
        {activeNav === 'events' && (
          <div className="space-y-4">
            {/* Filter, Search & Sorting Bar */}
            <div className="bg-white p-3.5 border border-neutral-200/90 rounded-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search events by title, venue, or slug..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Status Filters & Sorting Dropdown */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Segmented Buttons */}
                <div className="flex items-center bg-neutral-100 p-0.5 rounded text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded transition-colors ${
                      statusFilter === 'all'
                        ? 'bg-neutral-900 text-white font-semibold shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    All ({events.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('active')}
                    className={`px-3 py-1 rounded transition-colors ${
                      statusFilter === 'active'
                        ? 'bg-neutral-900 text-white font-semibold shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Published
                  </button>
                  <button
                    onClick={() => setStatusFilter('draft')}
                    className={`px-3 py-1 rounded transition-colors ${
                      statusFilter === 'draft'
                        ? 'bg-neutral-900 text-white font-semibold shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Draft
                  </button>
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded text-neutral-800 text-xs font-medium focus:outline-none focus:border-neutral-900"
                  >
                    <option value="date-desc">Newest Date</option>
                    <option value="date-asc">Oldest Date</option>
                    <option value="title">Title (A-Z)</option>
                    <option value="media-count">Most Media</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Empty State: Zero Search/Filter Results */}
            {filteredEvents.length === 0 && events.length > 0 && (
              <div className="bg-white border border-neutral-200 p-12 text-center rounded-sm space-y-3">
                <Search className="w-8 h-8 text-neutral-300 mx-auto" />
                <h3 className="text-base font-semibold text-neutral-900">
                  No events found
                </h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  No events matched your current search <strong>"{searchTerm}"</strong> or filter selection.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="px-3.5 py-1.5 bg-neutral-900 text-white text-xs font-semibold rounded hover:bg-neutral-800 inline-flex items-center gap-1.5"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Empty State: Zero Events Total */}
            {events.length === 0 && (
              <div className="bg-white border border-neutral-200 p-12 text-center rounded-sm space-y-4">
                <Sparkles className="w-10 h-10 text-neutral-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-serif-display font-medium text-neutral-900">
                    Welcome to Your Gallery Studio
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
                    Create your first event gallery to generate high-resolution guest albums, customizable themes, and QR table signage.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('create-event')}
                  className="px-5 py-2.5 bg-neutral-950 text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-neutral-800 inline-flex items-center gap-2 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Event</span>
                </button>
              </div>
            )}

            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((evt) => {
                const photosCount = evt.stats.photosCount || evt.items.filter((m) => m.type === 'photo').length;
                const videosCount = evt.stats.videosCount || evt.items.filter((m) => m.type === 'video').length;

                return (
                  <div
                    key={evt.id}
                    className="bg-white border border-neutral-200/90 rounded-sm overflow-hidden flex flex-col justify-between hover:border-neutral-400 transition-all shadow-xs group"
                  >
                    <div>
                      {/* Event Cover Image & Status Badges */}
                      <div className="relative aspect-[16/9] bg-neutral-900 overflow-hidden">
                        <img
                          src={resolveMediaUrl(evt.coverImage)}
                          alt={evt.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-xs ${
                            evt.status === 'active'
                              ? 'bg-emerald-700/90 text-white'
                              : 'bg-amber-600/90 text-white'
                          }`}>
                            {evt.status === 'active' ? 'Published' : 'Draft'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {evt.theme && (
                              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white">
                                {evt.theme}
                              </span>
                            )}
                            {evt.isPasswordProtected && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500 text-neutral-950 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                <span>PIN</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Overlay Info */}
                        <div className="absolute bottom-2.5 left-3 right-3 text-white">
                          <div className="text-[11px] uppercase tracking-wider text-white/80 font-semibold truncate flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-white/70" />
                            <span>{evt.date}</span>
                          </div>
                        </div>
                      </div>

                      {/* Event Details Content */}
                      <div className="p-5 space-y-2.5">
                        <h3 className="text-lg font-serif-display font-medium text-neutral-900 line-clamp-1">
                          {evt.title}
                        </h3>

                        <p className="text-xs text-neutral-500 line-clamp-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>{evt.location}</span>
                        </p>

                        {/* Unboxed Metadata Metrics */}
                        <div className="pt-2 text-[11px] text-neutral-500 border-t border-neutral-100 flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-neutral-800">{photosCount} Photos</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-neutral-800">{videosCount} Videos</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{evt.stats.guestVisits} Visits</span>
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Actions Strip */}
                    <div className="p-3 bg-neutral-50/90 border-t border-neutral-100 flex flex-col gap-2">
                      {/* Top primary actions */}
                      <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
                        {/* Edit Event Customization */}
                        <button
                          onClick={() => setEditingEvent(evt)}
                          className="py-1.5 px-2 bg-white hover:bg-neutral-100 border border-neutral-200 rounded text-neutral-800 inline-flex items-center justify-center gap-1 transition-colors shadow-2xs"
                          title="Edit Title, Cover, Theme, and Access"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-neutral-600" />
                          <span>Edit</span>
                        </button>

                        {/* Manage Media Library */}
                        <button
                          onClick={() => setManagingMediaEvent(evt)}
                          className="py-1.5 px-2 bg-white hover:bg-neutral-100 border border-neutral-200 rounded text-neutral-800 inline-flex items-center justify-center gap-1 transition-colors shadow-2xs"
                          title="Batch delete, captions, and ordering"
                        >
                          <Layers className="w-3.5 h-3.5 text-neutral-600" />
                          <span>Media</span>
                        </button>

                        {/* Preview / Guest Gallery */}
                        <button
                          onClick={() => handleOpenGuestView(evt.id)}
                          className="py-1.5 px-2 bg-white hover:bg-neutral-100 border border-neutral-200 rounded text-neutral-800 inline-flex items-center justify-center gap-1 transition-colors shadow-2xs"
                          title="Preview live guest gallery"
                        >
                          <Eye className="w-3.5 h-3.5 text-neutral-600" />
                          <span>Preview</span>
                        </button>
                      </div>

                      {/* Bottom utility icons */}
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-200/50">
                        {/* Toggle Publish */}
                        {onTogglePublish && (
                          <button
                            onClick={() => onTogglePublish(evt.id)}
                            className={`p-1.5 rounded text-xs inline-flex items-center gap-1 font-medium transition-colors ${
                              evt.status === 'active'
                                ? 'text-emerald-700 hover:bg-emerald-50'
                                : 'text-amber-700 hover:bg-amber-50'
                            }`}
                            title={evt.status === 'active' ? 'Unpublish Gallery (make draft)' : 'Publish Gallery to Guests'}
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span className="text-[10px] capitalize font-semibold">{evt.status}</span>
                          </button>
                        )}

                        <div className="flex items-center gap-1">
                          {/* Upload Shortcut */}
                          <button
                            onClick={() => handleOpenUpload(evt.id)}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
                            title="Upload photos & videos"
                          >
                            <UploadCloud className="w-4 h-4" />
                          </button>

                          {/* Share & QR Code */}
                          <button
                            onClick={() => setShareEvent(evt)}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
                            title="Share link & QR code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Quick 1-click Copy Link */}
                          <button
                            onClick={() => handleCopyLink(evt.slug, evt.title)}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded transition-colors"
                            title="Copy direct share link"
                          >
                            {copiedSlug === evt.slug ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Delete Event */}
                          {onDeleteEvent && events.length > 1 && (
                            <button
                              onClick={() => setEventToDelete(evt)}
                              className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: DEDICATED MEDIA MANAGER TAB                              */}
        {/* ============================================================== */}
        {activeNav === 'media-manager' && (
          <div className="bg-white border border-neutral-200 rounded-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-serif-display font-medium text-neutral-900">
                  Event Media Manager
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Select an event below to manage uploads, captions, ordering, and batch removals.
                </p>
              </div>

              {/* Event switcher dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-600 font-medium">Active Event:</span>
                <select
                  value={managingMediaEvent?.id || events[0]?.id}
                  onChange={(e) => {
                    const matched = events.find((evt) => evt.id === e.target.value);
                    if (matched) setManagingMediaEvent(matched);
                  }}
                  className="px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded focus:border-neutral-900 font-semibold text-neutral-800"
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.items.length} files)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {managingMediaEvent && (
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <div className="text-xs text-neutral-600">
                  Ready to manage <strong>{managingMediaEvent.items.length} items</strong> for "{managingMediaEvent.title}".
                </div>
                <button
                  onClick={() => setManagingMediaEvent(managingMediaEvent)}
                  className="px-4 py-2 bg-neutral-950 text-white text-xs font-semibold rounded hover:bg-neutral-800 inline-flex items-center gap-2"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Launch Media Studio Modal</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: STUDIO BRANDING & DEFAULTS                               */}
        {/* ============================================================== */}
        {activeNav === 'branding' && (
          <div className="bg-white border border-neutral-200 p-8 rounded-sm space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-serif-display font-medium text-neutral-900">
                Default Studio Branding & Organizer Profile
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                These defaults automatically brand your newly created events and guest gallery footers.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Studio / Lead Name</label>
                <input
                  type="text"
                  defaultValue="Elena Vance Studio"
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Company / Legal Entity</label>
                <input
                  type="text"
                  defaultValue="Vance Editorial Photography LLC"
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Public Contact Email</label>
                <input
                  type="email"
                  defaultValue="hello@elenavance.photo"
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Direct Phone Contact</label>
                <input
                  type="tel"
                  defaultValue="+1 (415) 890-2144"
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded focus:border-neutral-900"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">Settings active across all event templates</span>
              <button
                onClick={() => setActiveNav('events')}
                className="px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded hover:bg-neutral-800"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: SHARE & QR CODE MODAL                                  */}
      {/* ============================================================== */}
      <ShareQRModal
        event={shareEvent}
        isOpen={Boolean(shareEvent)}
        onClose={() => setShareEvent(null)}
      />

      {/* ============================================================== */}
      {/* MODAL 2: EVENT CUSTOMIZER MODAL                                 */}
      {/* ============================================================== */}
      <EventCustomizerModal
        event={editingEvent}
        isOpen={Boolean(editingEvent)}
        onClose={() => setEditingEvent(null)}
        onSave={async (updatedEvent) => {
          if (onUpdateEvent) {
            await onUpdateEvent(updatedEvent);
          }
        }}
      />

      {/* ============================================================== */}
      {/* MODAL 3: MEDIA MANAGER MODAL                                     */}
      {/* ============================================================== */}
      <MediaManagerModal
        event={managingMediaEvent}
        isOpen={Boolean(managingMediaEvent)}
        onClose={() => setManagingMediaEvent(null)}
        onDeleteMedia={async (mediaId, storagePath, thumbPath) => {
          if (onDeleteMedia) {
            await onDeleteMedia(mediaId, storagePath, thumbPath);
          }
        }}
        onBatchDeleteMedia={async (items) => {
          if (onBatchDeleteMedia) {
            await onBatchDeleteMedia(items);
          }
        }}
        onUpdateMediaMetadata={async (eventId, mediaId, title, caption) => {
          if (onUpdateMediaMetadata) {
            await onUpdateMediaMetadata(eventId, mediaId, title, caption);
          }
        }}
        onReorderMedia={(eventId, items) => {
          if (onReorderMedia) {
            onReorderMedia(eventId, items);
          }
        }}
        onOpenUpload={(eventId) => {
          onSelectEvent(eventId);
          onNavigate('upload-media');
        }}
      />

      {/* ============================================================== */}
      {/* MODAL 4: DELETE EVENT CONFIRMATION DIALOG                        */}
      {/* ============================================================== */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 max-w-sm w-full p-6 rounded-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-semibold text-neutral-900">Delete Event Gallery?</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to delete <strong>"{eventToDelete.title}"</strong>? Guests will no longer be able to access the gallery link or QR codes.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                onClick={() => setEventToDelete(null)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Event</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
