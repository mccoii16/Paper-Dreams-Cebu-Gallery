import React, { useState } from 'react';
import { EventGallery, AppView, GalleryTheme } from '../types';
import { useAuth } from '../context/AuthContext';
import { createFirestoreEvent } from '../firebase/eventService';
import { 
  Calendar, MapPin, Lock, Globe, Sparkles, Image as ImageIcon, 
  ArrowLeft, Check, AlertCircle, Eye, ShieldCheck, RefreshCw
} from 'lucide-react';

interface CreateEventProps {
  onEventCreated: (newEvent: EventGallery) => void;
  onNavigate: (view: AppView) => void;
}

const PRESET_COVERS = [
  {
    id: 'cover-wedding',
    label: 'Glass Conservatory Wedding',
    url: '/images/event_cover_wedding_1792116548063.jpg'
  },
  {
    id: 'cover-gala',
    label: 'Grand Beaux-Arts Gala',
    url: '/images/event_cover_gala_1792116550462.jpg'
  },
  {
    id: 'cover-party',
    label: 'Golden Hour Celebration',
    url: '/images/event_media_champagne_1792116549629.jpg'
  }
];

export const CreateEvent: React.FC<CreateEventProps> = ({
  onEventCreated,
  onNavigate,
}) => {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2026-11-14');
  const [time, setTime] = useState('5:00 PM');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState(PRESET_COVERS[0].url);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [allowGuestUploads, setAllowGuestUploads] = useState(true);
  const [theme, setTheme] = useState<GalleryTheme>('warm-white');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!title.trim()) {
      errs.title = 'Event name is required';
    }
    if (!date) {
      errs.date = 'Event date is required';
    }
    if (isPasswordProtected && (!pinCode || pinCode.length < 4)) {
      errs.pinCode = 'Please provide at least a 4-digit PIN code';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const eventId = `evt-${Date.now().toString(36)}`;
    const ownerId = currentUser?.uid || 'guest-organizer';

    setIsSubmitting(true);
    try {
      await createFirestoreEvent({
        title: title.trim(),
        slug: slug || `event-${Date.now()}`,
        date: new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }),
        time: time || 'Evening',
        location: location.trim() || 'Private Venue',
        description: description.trim() || 'Welcome to the gallery! Browse and download high-resolution photos and video highlights.',
        coverImage: coverImage,
        status: 'active',
        isPasswordProtected,
        pinCode: isPasswordProtected ? pinCode : undefined,
        allowGuestUploads,
        allowOriginalDownloads: true,
        theme,
        ownerId,
        organizerName: currentUser?.displayName || 'Elena Vance Studio',
        organizerEmail: currentUser?.email || 'studio@elenavance.photo',
      }, eventId);
    } catch (err) {
      console.warn('Firestore sync note:', err);
    } finally {
      setIsSubmitting(false);
    }

    const newEvent: EventGallery = {
      id: eventId,
      ownerId,
      slug: slug || `event-${Date.now()}`,
      title: title.trim(),
      date: new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
      time: time || 'Evening',
      location: location.trim() || 'Private Venue',
      description: description.trim() || 'Welcome to the gallery! Browse and download high-resolution photos and video highlights.',
      coverImage: coverImage,
      organizer: {
        name: 'Elena Vance Studio',
        company: 'Vance Editorial Photography',
        contactEmail: 'studio@elenavance.photo'
      },
      status: 'active',
      isPasswordProtected,
      pinCode: isPasswordProtected ? pinCode : undefined,
      allowGuestUploads,
      allowOriginalDownloads: true,
      theme,
      stats: {
        totalMedia: 3,
        photosCount: 2,
        videosCount: 1,
        totalSize: '48.2 MB',
        guestVisits: 1,
        downloadCount: 0
      },
      items: [
        {
          id: `med-${Date.now()}-1`,
          url: coverImage,
          thumbnailUrl: coverImage,
          type: 'photo',
          title: 'Opening Welcome Scene',
          caption: 'Arrival at the reception entrance.',
          width: 3840,
          height: 2160,
          aspectRatio: '16:9',
          fileSize: '8.2 MB',
          dimensions: '3840 x 2160',
          capturedAt: 'Just now',
          uploadedAt: 'Just now',
          views: 1,
          downloads: 0
        },
        {
          id: `med-${Date.now()}-2`,
          url: '/images/event_media_portrait_1792116549596.jpg',
          thumbnailUrl: '/images/event_media_portrait_1792116549596.jpg',
          type: 'photo',
          title: 'Portrait in Warm Light',
          caption: 'Candid smiles right before dinner.',
          width: 3000,
          height: 4000,
          aspectRatio: '3:4',
          fileSize: '7.5 MB',
          dimensions: '3000 x 4000',
          capturedAt: 'Just now',
          uploadedAt: 'Just now',
          views: 1,
          downloads: 0
        },
        {
          id: `med-${Date.now()}-3`,
          url: '/images/event_media_dancefloor_1792116549721.jpg',
          thumbnailUrl: '/images/event_media_dancefloor_1792116549721.jpg',
          type: 'video',
          title: 'Evening Atmosphere Reel',
          caption: '4K video moment from the reception celebration.',
          width: 3840,
          height: 2160,
          aspectRatio: '4:3',
          duration: '0:34',
          videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          fileSize: '28.4 MB',
          dimensions: '3840 x 2160',
          capturedAt: 'Just now',
          uploadedAt: 'Just now',
          views: 1,
          downloads: 0
        }
      ]
    };

    onEventCreated(newEvent);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('organizer-dashboard')}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 rounded hover:bg-neutral-100 transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">New Gallery</div>
              <h1 className="text-xl sm:text-2xl font-serif-display font-medium text-neutral-900">
                Create Event Space
              </h1>
            </div>
          </div>

          <button
            onClick={() => onNavigate('organizer-dashboard')}
            className="text-xs text-neutral-600 hover:text-neutral-900 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Form Column */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 border border-neutral-200/90 rounded-sm shadow-xs space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Event Name */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-800 mb-1.5">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Clara & Marcus Wedding, Met Gala Reception..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full p-2.5 text-sm bg-neutral-50 border rounded-sm focus:outline-none transition-colors ${
                    errors.title ? 'border-rose-400 bg-rose-50/30' : 'border-neutral-300 focus:border-neutral-900'
                  }`}
                />
                {errors.title && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.title}</span>
                  </p>
                )}
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-800 mb-1.5">
                    Event Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 text-sm bg-neutral-50 border border-neutral-300 rounded-sm focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-800 mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5:30 PM PDT"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full p-2.5 text-sm bg-neutral-50 border border-neutral-300 rounded-sm focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-800 mb-1.5">
                  Venue / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. The Glasshouse, Napa Valley or San Francisco, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2.5 text-sm bg-neutral-50 border border-neutral-300 rounded-sm focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-800 mb-1.5">
                  Welcome Message for Guests
                </label>
                <textarea
                  rows={3}
                  placeholder="A friendly message greeting guests when they open their private event gallery..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 text-sm bg-neutral-50 border border-neutral-300 rounded-sm focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Cover Image Selector */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-800 mb-2">
                  Choose Cover Photograph
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {PRESET_COVERS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setCoverImage(preset.url)}
                      className={`relative aspect-[16/10] rounded-sm overflow-hidden border-2 text-left transition-all ${
                        coverImage === preset.url
                          ? 'border-neutral-900 ring-2 ring-neutral-900/20'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {coverImage === preset.url && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gallery Theme Selection */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-800 mb-2">
                  Gallery Atmosphere & Theme Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'warm-white', label: 'Warm White', mode: 'Light', bg: 'bg-[#FAF9F6] border-neutral-300' },
                    { id: 'editorial-sand', label: 'Editorial Sand', mode: 'Light', bg: 'bg-[#F4EFEB] border-amber-200' },
                    { id: 'charcoal', label: 'Charcoal', mode: 'Dark', bg: 'bg-[#171717] border-neutral-700 text-white' },
                    { id: 'midnight-slate', label: 'Midnight Slate', mode: 'Dark', bg: 'bg-[#0F172A] border-slate-700 text-white' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id as GalleryTheme)}
                      className={`p-2.5 rounded border text-left flex flex-col justify-between transition-all ${
                        theme === t.id
                          ? 'border-neutral-900 ring-2 ring-neutral-900/20 bg-neutral-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-neutral-900">{t.label}</span>
                        {theme === t.id && <Check className="w-3.5 h-3.5 text-neutral-900" />}
                      </div>
                      <div className={`h-6 rounded border flex items-center justify-center text-[10px] font-bold ${t.bg}`}>
                        Aa
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Security & Access */}
              <div className="pt-4 border-t border-neutral-200 space-y-4">
                <div className="text-xs uppercase tracking-wider font-semibold text-neutral-800">
                  Access & Privacy
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-sm">
                  <input
                    type="checkbox"
                    id="passwordPinCheck"
                    checked={isPasswordProtected}
                    onChange={(e) => setIsPasswordProtected(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <div className="flex-1 text-xs">
                    <label htmlFor="passwordPinCheck" className="font-semibold text-neutral-900 cursor-pointer">
                      Require Guest Security PIN
                    </label>
                    <p className="text-neutral-500 mt-0.5">
                      Guests must enter a numerical PIN before accessing the gallery and downloading media.
                    </p>
                    {isPasswordProtected && (
                      <div className="mt-2.5">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 2026 or table PIN"
                          value={pinCode}
                          onChange={(e) => setPinCode(e.target.value)}
                          className={`w-36 p-1.5 text-xs bg-white border rounded font-mono ${
                            errors.pinCode ? 'border-rose-400' : 'border-neutral-300 focus:border-neutral-900'
                          }`}
                        />
                        {errors.pinCode && (
                          <span className="text-[11px] text-rose-500 block mt-1">{errors.pinCode}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-sm">
                  <input
                    type="checkbox"
                    id="guestUploadsCheck"
                    checked={allowGuestUploads}
                    onChange={(e) => setAllowGuestUploads(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <div className="flex-1 text-xs">
                    <label htmlFor="guestUploadsCheck" className="font-semibold text-neutral-900 cursor-pointer">
                      Allow Guests to Upload Photos & Videos
                    </label>
                    <p className="text-neutral-500 mt-0.5">
                      Guests can contribute their own phone snapshots directly to the community album.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
                <span className="text-xs text-neutral-500">
                  Ready to publish immediately
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Creating in Cloud...' : 'Create & Launch Gallery'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live Mobile Preview Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" />
              <span>Live Guest View Preview</span>
            </div>

            <div className="bg-neutral-900 p-3 rounded-2xl shadow-xl max-w-sm mx-auto">
              <div className="bg-[#FAF9F6] rounded-xl overflow-hidden border border-neutral-800 text-neutral-900 text-xs">
                {/* Mobile Preview Top Status */}
                <div className="h-6 bg-neutral-950 text-white/70 px-4 flex items-center justify-between text-[10px]">
                  <span>9:41</span>
                  <span>5G</span>
                </div>

                {/* Simulated Header */}
                <div className="relative h-44 bg-neutral-900 overflow-hidden">
                  <img
                    src={coverImage}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex flex-col justify-end text-white">
                    <div className="text-[10px] text-neutral-300 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{date || 'Upcoming Date'}</span>
                    </div>
                    <div className="text-base font-serif-display font-medium leading-tight">
                      {title || 'Your Event Title Here'}
                    </div>
                    <div className="text-[10px] text-neutral-300 truncate">
                      {location || 'Venue Location'}
                    </div>
                  </div>
                </div>

                {/* Simulated Gallery Body */}
                <div className="p-3 space-y-2">
                  <div className="flex gap-1 border-b border-neutral-200 pb-2">
                    <span className="px-2 py-0.5 bg-neutral-900 text-white rounded text-[10px] font-medium">All (3)</span>
                    <span className="px-2 py-0.5 text-neutral-600 text-[10px]">Photos</span>
                    <span className="px-2 py-0.5 text-neutral-600 text-[10px]">Videos</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="aspect-square bg-neutral-200 rounded overflow-hidden">
                      <img src={coverImage} alt="sample" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                    <div className="aspect-square bg-neutral-200 rounded overflow-hidden">
                      <img src="/images/event_media_portrait_1792116549596.jpg" alt="sample" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  <div className="pt-2 text-center text-[10px] text-neutral-400">
                    Direct 1-tap original downloads for guests
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
