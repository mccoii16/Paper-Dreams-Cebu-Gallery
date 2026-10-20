import React, { useState, useEffect, useCallback } from 'react';
import { SAMPLE_EVENTS } from './data/sampleEvents';
import { EventGallery, MediaItem, AppView } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { testFirestoreConnection } from './firebase/config';
import { 
  getPublishedEvents, 
  getOrganizerEvents, 
  deleteFirestoreEvent, 
  updateFirestoreEvent,
  getEventMediaList,
  deleteEventMedia,
  updateEventMediaMetadata,
  FirebaseEventRecord,
  FirebaseMediaRecord
} from './firebase/eventService';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { GuestGallery } from './components/GuestGallery';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { CreateEvent } from './components/CreateEvent';
import { UploadScreen } from './components/UploadScreen';
import { FullscreenViewer } from './components/FullscreenViewer';
import { AuthModal } from './components/AuthModal';

function MainApp() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<EventGallery[]>(SAMPLE_EVENTS);
  const [selectedEventId, setSelectedEventId] = useState<string>(SAMPLE_EVENTS[0]?.id || '');
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [cloudLoaded, setCloudLoaded] = useState(false);

  // Lightbox Viewer state
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Active event object (safe when 0 events exist)
  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0] || null;

  // Helper to convert Firestore event record to EventGallery
  const convertFirestoreToGallery = useCallback((record: FirebaseEventRecord, mediaItems: MediaItem[] = []): EventGallery => {
    return {
      id: record.id,
      slug: record.slug,
      title: record.title,
      date: record.date,
      time: record.time,
      location: record.location,
      description: record.description,
      coverImage: record.coverImage,
      status: record.status,
      isPasswordProtected: record.isPasswordProtected,
      pinCode: record.pinCode,
      allowGuestUploads: record.allowGuestUploads,
      allowOriginalDownloads: record.allowOriginalDownloads ?? true,
      theme: record.theme || 'warm-white',
      accentColor: record.accentColor || '#ec4899',
      typographyPreset: record.typographyPreset || 'editorial-serif',
      ownerId: record.ownerId,
      organizer: {
        name: record.organizerName || 'Paper Dreams Cebu',
        company: record.organizerCompany || 'Paper Dreams Studio',
        contactEmail: record.organizerEmail || 'hello@paperdreamscebu.com',
        logoUrl: record.organizerLogoUrl || '/assets/aistudio/logo2_606d60c8.png',
        phone: record.organizerPhone,
      },
      stats: {
        totalMedia: mediaItems.length || record.stats?.totalMedia || 0,
        photosCount: mediaItems.filter(m => m.type === 'photo').length || record.stats?.photosCount || 0,
        videosCount: mediaItems.filter(m => m.type === 'video').length || record.stats?.videosCount || 0,
        totalSize: record.stats?.totalSize || '0 MB',
        guestVisits: record.stats?.guestVisits || 1,
        downloadCount: record.stats?.downloadCount || 0,
      },
      items: mediaItems,
    };
  }, []);

  // Fetch Firestore Events on mount and when currentUser changes
  useEffect(() => {
    let isMounted = true;

    async function loadCloudEvents() {
      await testFirestoreConnection();
      try {
        const publicRecords = await getPublishedEvents();
        let organizerRecords: FirebaseEventRecord[] = [];

        if (currentUser) {
          organizerRecords = await getOrganizerEvents(currentUser.uid);
        }

        // Combine unique records
        const recordMap = new Map<string, FirebaseEventRecord>();
        publicRecords.forEach(r => recordMap.set(r.id, r));
        organizerRecords.forEach(r => recordMap.set(r.id, r));

        if (recordMap.size > 0 && isMounted) {
          const cloudEventsList: EventGallery[] = [];
          
          for (const record of recordMap.values()) {
            // Load real media items from Firestore subcollection
            let mediaItems: MediaItem[] = [];
            try {
              const mediaRes = await getEventMediaList(record.id, 50);
              if (mediaRes && mediaRes.items.length > 0) {
                mediaItems = mediaRes.items.map((m: FirebaseMediaRecord) => ({
                  id: m.id,
                  url: m.url,
                  thumbnailUrl: m.thumbnailUrl || m.url,
                  type: m.type,
                  title: m.title,
                  caption: m.caption,
                  width: m.width || 4032,
                  height: m.height || 3024,
                  aspectRatio: m.type === 'video' ? '16:9' : '4:3',
                  duration: m.duration,
                  fileSize: m.fileSize,
                  dimensions: m.dimensions,
                  capturedAt: m.capturedAt,
                  uploadedAt: m.uploadedAt,
                  views: m.views,
                  downloads: m.downloads,
                  storagePath: m.storagePath,
                  ownerId: m.ownerId,
                  exif: m.exif,
                }));
              }
            } catch (err) {
              console.warn(`Could not load media for event ${record.id}:`, err);
            }

            cloudEventsList.push(convertFirestoreToGallery(record, mediaItems));
          }

          // Merge: Cloud events take precedence, followed by sample events
          const samplePreserved = SAMPLE_EVENTS.filter(
            s => !cloudEventsList.some(c => c.id === s.id || c.slug === s.slug)
          );

          setEvents([...cloudEventsList, ...samplePreserved]);
        }
      } catch (err) {
        console.warn('Note: Operating with local sample events; Firestore fetch note:', err);
      } finally {
        if (isMounted) setCloudLoaded(true);
      }
    }

    loadCloudEvents();
    return () => { isMounted = false; };
  }, [currentUser, convertFirestoreToGallery]);

  // Hash route parsing for demo URLs
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#event=')) {
        const slug = hash.replace('#event=', '');
        const matched = events.find((e) => e.slug === slug);
        if (matched) {
          setSelectedEventId(matched.id);
          setCurrentView('gallery');
        }
      } else if (hash.startsWith('#media=')) {
        const mediaId = hash.replace('#media=', '');
        const itemIndex = currentEvent.items.findIndex((m) => m.id === mediaId);
        if (itemIndex >= 0) {
          setViewerIndex(itemIndex);
          setIsViewerOpen(true);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [events, currentEvent]);

  // Handle Event Creation
  const handleEventCreated = (newEvent: EventGallery) => {
    setEvents((prev) => [newEvent, ...prev]);
    setSelectedEventId(newEvent.id);
    setCurrentView('gallery');
  };

  // Handle Media Uploaded
  const handleMediaUploaded = (eventId: string, newItems: MediaItem[]) => {
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId) return evt;
        const newPhotos = newItems.filter((m) => m.type === 'photo').length;
        const newVideos = newItems.filter((m) => m.type === 'video').length;

        return {
          ...evt,
          items: [...newItems, ...evt.items],
          stats: {
            ...evt.stats,
            totalMedia: evt.stats.totalMedia + newItems.length,
            photosCount: evt.stats.photosCount + newPhotos,
            videosCount: evt.stats.videosCount + newVideos,
          }
        };
      })
    );
  };

  // Handle Delete Media
  const handleDeleteMedia = async (mediaId: string, storagePath?: string, thumbnailStoragePath?: string) => {
    try {
      await deleteEventMedia(currentEvent.id, mediaId, storagePath, thumbnailStoragePath);
    } catch (err) {
      console.warn('Firestore / Storage media deletion note:', err);
    }

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== currentEvent.id) return evt;
        const targetItem = evt.items.find((m) => m.id === mediaId);
        const isVideo = targetItem?.type === 'video';
        const updatedItems = evt.items.filter((m) => m.id !== mediaId);

        return {
          ...evt,
          items: updatedItems,
          stats: {
            ...evt.stats,
            totalMedia: Math.max(0, evt.stats.totalMedia - 1),
            photosCount: !isVideo ? Math.max(0, evt.stats.photosCount - 1) : evt.stats.photosCount,
            videosCount: isVideo ? Math.max(0, evt.stats.videosCount - 1) : evt.stats.videosCount,
          },
        };
      })
    );
  };

  // Handle Delete Event
  const handleDeleteEvent = async (eventId: string) => {
    if (events.length <= 1) return;
    try {
      await deleteFirestoreEvent(eventId);
    } catch (err) {
      console.warn('Firestore delete note:', err);
    }

    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    if (selectedEventId === eventId) {
      const remaining = events.filter((e) => e.id !== eventId);
      setSelectedEventId(remaining[0].id);
    }
  };

  // Handle Toggle Publish/Unpublish
  const handleTogglePublish = async (eventId: string) => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return;

    const newStatus = target.status === 'active' ? 'draft' : 'active';
    try {
      await updateFirestoreEvent(eventId, { status: newStatus });
    } catch (err) {
      console.warn('Firestore publish toggle note:', err);
    }

    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e))
    );
  };

  // Handle Update Event Security & Permissions
  const handleUpdateEventSecurity = async (eventId: string, updates: Partial<EventGallery>) => {
    try {
      await updateFirestoreEvent(eventId, {
        isPasswordProtected: updates.isPasswordProtected,
        pinCode: updates.pinCode,
        allowOriginalDownloads: updates.allowOriginalDownloads,
        allowGuestUploads: updates.allowGuestUploads,
      });
    } catch (err) {
      console.warn('Firestore security update note:', err);
    }

    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, ...updates } : e))
    );
  };

  // Handle Update Event
  const handleUpdateEvent = async (updatedEvent: EventGallery) => {
    try {
      await updateFirestoreEvent(updatedEvent.id, {
        title: updatedEvent.title,
        slug: updatedEvent.slug,
        date: updatedEvent.date,
        time: updatedEvent.time,
        location: updatedEvent.location,
        description: updatedEvent.description,
        coverImage: updatedEvent.coverImage,
        status: updatedEvent.status,
        isPasswordProtected: updatedEvent.isPasswordProtected,
        pinCode: updatedEvent.pinCode,
        allowGuestUploads: updatedEvent.allowGuestUploads,
        allowOriginalDownloads: updatedEvent.allowOriginalDownloads,
        theme: updatedEvent.theme,
        accentColor: updatedEvent.accentColor,
        typographyPreset: updatedEvent.typographyPreset,
        organizerName: updatedEvent.organizer.name,
        organizerCompany: updatedEvent.organizer.company,
        organizerEmail: updatedEvent.organizer.contactEmail,
        organizerLogoUrl: updatedEvent.organizer.logoUrl || updatedEvent.organizer.avatar,
        organizerPhone: updatedEvent.organizer.phone,
      });
    } catch (err) {
      console.warn('Firestore update event note:', err);
    }

    setEvents((prev) =>
      prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
    );
  };

  // Handle Batch Delete Media
  const handleBatchDeleteMedia = async (items: { id: string; storagePath?: string; thumbnailStoragePath?: string }[]) => {
    for (const item of items) {
      try {
        await deleteEventMedia(currentEvent.id, item.id, item.storagePath, item.thumbnailStoragePath);
      } catch (err) {
        console.warn('Batch delete item note:', err);
      }
    }

    const deletedIds = new Set(items.map((i) => i.id));
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== currentEvent.id) return evt;
        const updatedItems = evt.items.filter((m) => !deletedIds.has(m.id));
        const photosCount = updatedItems.filter((m) => m.type === 'photo').length;
        const videosCount = updatedItems.filter((m) => m.type === 'video').length;

        return {
          ...evt,
          items: updatedItems,
          stats: {
            ...evt.stats,
            totalMedia: updatedItems.length,
            photosCount,
            videosCount,
          },
        };
      })
    );
  };

  // Handle Update Media Caption / Title
  const handleUpdateMediaMetadata = async (eventId: string, mediaId: string, title: string, caption: string) => {
    try {
      await updateEventMediaMetadata(eventId, mediaId, { title, caption });
    } catch (err) {
      console.warn('Firestore update media metadata note:', err);
    }

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId) return evt;
        return {
          ...evt,
          items: evt.items.map((item) =>
            item.id === mediaId ? { ...item, title, caption } : item
          ),
        };
      })
    );
  };

  // Handle Reorder Media
  const handleReorderMedia = (eventId: string, reorderedItems: MediaItem[]) => {
    setEvents((prev) =>
      prev.map((evt) => (evt.id === eventId ? { ...evt, items: reorderedItems } : evt))
    );
  };

  // Open Lightbox
  const handleOpenViewer = (index: number) => {
    setViewerIndex(index);
    setIsViewerOpen(true);
  };

  const isUserOrganizer = Boolean(currentUser || currentView === 'organizer-dashboard' || currentView === 'upload-media');

  return (
    <div className="min-h-screen bg-[#FFF5F7] text-neutral-900 flex flex-col font-sans">
      {/* Strict 3-zone Top Bar Contract with Auth Controls */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        activeEventTitle={currentEvent ? currentEvent.title : 'Paper Dreams Cebu'}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Screen Routing */}
      <div className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            onNavigate={(view) => setCurrentView(view)}
            sampleEvents={events}
            onSelectEvent={(id) => {
              setSelectedEventId(id);
              setCurrentView('gallery');
            }}
          />
        )}

        {currentView === 'gallery' && (
          <GuestGallery
            event={currentEvent}
            onOpenViewer={handleOpenViewer}
            onUploadClick={() => setCurrentView('upload-media')}
            onSwitchEvent={(id) => setSelectedEventId(id)}
            allEvents={events}
            onDeleteMedia={handleDeleteMedia}
            onUpdateEventSecurity={handleUpdateEventSecurity}
            onTogglePublish={handleTogglePublish}
            onNavigateHome={() => setCurrentView('landing')}
            isOrganizer={isUserOrganizer}
          />
        )}

        {currentView === 'organizer-dashboard' && (
          <OrganizerDashboard
            events={events}
            onNavigate={(view) => setCurrentView(view)}
            onSelectEvent={(id) => setSelectedEventId(id)}
            onDeleteEvent={handleDeleteEvent}
            onTogglePublish={handleTogglePublish}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onUpdateEvent={handleUpdateEvent}
            onDeleteMedia={handleDeleteMedia}
            onBatchDeleteMedia={handleBatchDeleteMedia}
            onUpdateMediaMetadata={handleUpdateMediaMetadata}
            onReorderMedia={handleReorderMedia}
          />
        )}

        {currentView === 'create-event' && (
          <CreateEvent
            onEventCreated={handleEventCreated}
            onNavigate={(view) => setCurrentView(view)}
          />
        )}

        {currentView === 'upload-media' && (
          <UploadScreen
            event={currentEvent}
            onMediaUploaded={handleMediaUploaded}
            onNavigate={(view) => setCurrentView(view)}
            onDeleteMedia={handleDeleteMedia}
          />
        )}
      </div>

      {/* Fullscreen Media Viewer Lightbox */}
      <FullscreenViewer
        items={currentEvent ? currentEvent.items : []}
        currentIndex={viewerIndex}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        onNavigate={(newIdx) => setViewerIndex(newIdx)}
        eventTitle={currentEvent ? currentEvent.title : 'Paper Dreams Cebu'}
      />

      {/* Organizer Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setCurrentView('organizer-dashboard')}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
