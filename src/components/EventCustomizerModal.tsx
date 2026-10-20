import React, { useState } from 'react';
import { EventGallery, GalleryTheme, TypographyPreset } from '../types';
import { 
  X, Eye, Save, Globe, Lock, Palette, Type, Calendar, 
  MapPin, Image as ImageIcon, Sparkles, Building, Mail, 
  Phone, Shield, CheckCircle2, ChevronRight
} from 'lucide-react';

interface EventCustomizerModalProps {
  event: EventGallery | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEvent: EventGallery) => Promise<void>;
}

const PRESET_COVERS = [
  {
    id: 'cover-wedding',
    label: 'Glass Conservatory Wedding',
    url: '/src/assets/images/event_cover_wedding_1792116548063.jpg'
  },
  {
    id: 'cover-gala',
    label: 'Grand Beaux-Arts Gala',
    url: '/src/assets/images/event_cover_gala_1792116550462.jpg'
  },
  {
    id: 'cover-party',
    label: 'Golden Hour Celebration',
    url: '/src/assets/images/event_media_champagne_1792116549629.jpg'
  },
  {
    id: 'cover-architecture',
    label: 'Modernist Pavilion Architecture',
    url: '/src/assets/images/event_media_architecture_1792116549599.jpg'
  }
];

const THEME_OPTIONS: { id: GalleryTheme; label: string; mode: 'light' | 'dark'; description: string; bgClass: string; textClass: string }[] = [
  {
    id: 'warm-white',
    label: 'Warm White',
    mode: 'light',
    description: 'Clean luminous cream, gallery fine-art aesthetic',
    bgClass: 'bg-[#FAF9F6] border-neutral-300',
    textClass: 'text-neutral-900',
  },
  {
    id: 'editorial-sand',
    label: 'Editorial Sand',
    mode: 'light',
    description: 'Warm organic earth tones, linen and natural warmth',
    bgClass: 'bg-[#F4EFEB] border-amber-200',
    textClass: 'text-neutral-900',
  },
  {
    id: 'charcoal',
    label: 'Charcoal Noir',
    mode: 'dark',
    description: 'Velvet dark luxury, high-contrast evening vibe',
    bgClass: 'bg-[#171717] border-neutral-700',
    textClass: 'text-neutral-100',
  },
  {
    id: 'midnight-slate',
    label: 'Midnight Slate',
    mode: 'dark',
    description: 'Deep indigo-slate, moody and cinematic tone',
    bgClass: 'bg-[#0F172A] border-slate-700',
    textClass: 'text-slate-100',
  },
];

const ACCENT_COLORS = [
  { id: '#171717', label: 'Minimalist Onyx', hex: '#171717' },
  { id: '#B45309', label: 'Warm Ochre Gold', hex: '#B45309' },
  { id: '#4D5E43', label: 'Sage Olive', hex: '#4D5E43' },
  { id: '#78350F', label: 'Burnished Bronze', hex: '#78350F' },
  { id: '#334155', label: 'Deep Slate', hex: '#334155' },
  { id: '#881337', label: 'Vintage Bordeaux', hex: '#881337' },
];

const TYPOGRAPHY_PRESETS: { id: TypographyPreset; label: string; family: string; preview: string }[] = [
  {
    id: 'editorial-serif',
    label: 'Editorial Serif',
    family: 'font-serif-display font-medium',
    preview: 'Playfair & Editorial Display',
  },
  {
    id: 'modern-grotesk',
    label: 'Modern Grotesk',
    family: 'font-sans font-semibold tracking-tight',
    preview: 'Clean Contemporary Sans',
  },
  {
    id: 'classic-roman',
    label: 'Classic Roman',
    family: 'font-serif tracking-wide',
    preview: 'Baskerville & Roman Capitals',
  },
];

export const EventCustomizerModal: React.FC<EventCustomizerModalProps> = ({
  event,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !event) return null;

  const [activeTab, setActiveTab] = useState<'details' | 'branding' | 'design' | 'access' | 'preview'>('details');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State initialized from event
  const [title, setTitle] = useState(event.title);
  const [slug, setSlug] = useState(event.slug);
  const [date, setDate] = useState(event.date);
  const [time, setTime] = useState(event.time || '');
  const [location, setLocation] = useState(event.location);
  const [description, setDescription] = useState(event.description);
  const [coverImage, setCoverImage] = useState(event.coverImage);
  const [customCoverUrl, setCustomCoverUrl] = useState('');

  // Branding
  const [organizerName, setOrganizerName] = useState(event.organizer.name);
  const [organizerCompany, setOrganizerCompany] = useState(event.organizer.company || '');
  const [organizerLogoUrl, setOrganizerLogoUrl] = useState(event.organizer.logoUrl || event.organizer.avatar || '');
  const [contactEmail, setContactEmail] = useState(event.organizer.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(event.organizer.phone || '');

  // Design
  const [theme, setTheme] = useState<GalleryTheme>(event.theme || 'warm-white');
  const [accentColor, setAccentColor] = useState(event.accentColor || '#171717');
  const [typographyPreset, setTypographyPreset] = useState<TypographyPreset>(event.typographyPreset || 'editorial-serif');

  // Access & Permissions
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>(event.status);
  const [isPasswordProtected, setIsPasswordProtected] = useState(event.isPasswordProtected);
  const [pinCode, setPinCode] = useState(event.pinCode || '');
  const [allowGuestUploads, setAllowGuestUploads] = useState(event.allowGuestUploads);
  const [allowOriginalDownloads, setAllowOriginalDownloads] = useState(event.allowOriginalDownloads ?? true);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!date.trim()) errs.date = 'Date is required';
    if (!location.trim()) errs.location = 'Location is required';
    if (isPasswordProtected && (!pinCode || pinCode.length < 4)) {
      errs.pinCode = 'PIN must be at least 4 digits';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      setActiveTab(errors.pinCode ? 'access' : 'details');
      return;
    }

    setIsSaving(true);
    try {
      const updated: EventGallery = {
        ...event,
        title: title.trim(),
        slug: slug.trim() || event.slug,
        date: date.trim(),
        time: time.trim(),
        location: location.trim(),
        description: description.trim(),
        coverImage: customCoverUrl.trim() || coverImage,
        theme,
        accentColor,
        typographyPreset,
        status,
        isPasswordProtected,
        pinCode: isPasswordProtected ? pinCode.trim() : undefined,
        allowGuestUploads,
        allowOriginalDownloads,
        organizer: {
          ...event.organizer,
          name: organizerName.trim(),
          company: organizerCompany.trim(),
          logoUrl: organizerLogoUrl.trim() || undefined,
          avatar: organizerLogoUrl.trim() || undefined,
          contactEmail: contactEmail.trim(),
          phone: contactPhone.trim(),
        },
      };

      await onSave(updated);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error('Failed to save event updates:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedThemeObj = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div 
        className="bg-white border border-neutral-200 max-w-4xl w-full rounded-md shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-neutral-500">
              Event Management & Customizer
            </div>
            <h2 className="text-xl font-serif-display font-medium text-neutral-900 line-clamp-1">
              Customize: {title || event.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'preview' ? 'details' : 'preview')}
              className={`px-3 py-1.5 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors border ${
                activeTab === 'preview' 
                  ? 'bg-neutral-900 text-white border-neutral-900' 
                  : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{activeTab === 'preview' ? 'Exit Live Preview' : 'Preview Live'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center px-6 border-b border-neutral-200 bg-white overflow-x-auto text-xs font-medium no-scrollbar">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-3.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-neutral-950 text-neutral-950 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Event Details</span>
          </button>

          <button
            onClick={() => setActiveTab('branding')}
            className={`py-3 px-3.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'branding'
                ? 'border-neutral-950 text-neutral-950 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Studio & Branding</span>
          </button>

          <button
            onClick={() => setActiveTab('design')}
            className={`py-3 px-3.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'design'
                ? 'border-neutral-950 text-neutral-950 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Themes & Typography</span>
          </button>

          <button
            onClick={() => setActiveTab('access')}
            className={`py-3 px-3.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'access'
                ? 'border-neutral-950 text-neutral-950 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Access & Permissions</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-3.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'border-neutral-950 text-neutral-950 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Guest Preview</span>
          </button>
        </div>

        {/* Modal Body / Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div>
                <label className="text-xs font-semibold text-neutral-800 block mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Eleanor & Marcus Wedding"
                  className={`w-full px-3 py-2 text-xs bg-neutral-50 border rounded focus:outline-none focus:border-neutral-900 ${
                    errors.title ? 'border-rose-400 bg-rose-50/30' : 'border-neutral-300'
                  }`}
                />
                {errors.title && <p className="text-[11px] text-rose-600 mt-1">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-800 block mb-1">
                    Event Date *
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="e.g. Saturday, October 10, 2026"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-800 block mb-1">
                    Time / Sub-schedule (Optional)
                  </label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="e.g. 4:30 PM PDT"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-800 block mb-1">
                  Venue / Location *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. The Glasshouse Conservatory · Napa Valley, CA"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-800 block mb-1">
                  Welcome Description & Instructions for Guests
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Welcome message displayed at the top of the guest gallery..."
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Cover Image Selector */}
              <div>
                <label className="text-xs font-semibold text-neutral-800 block mb-2">
                  Gallery Hero Cover Image
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {PRESET_COVERS.map((preset) => {
                    const isSelected = coverImage === preset.url && !customCoverUrl;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setCoverImage(preset.url);
                          setCustomCoverUrl('');
                        }}
                        className={`group relative rounded overflow-hidden aspect-[4/3] border-2 transition-all text-left ${
                          isSelected ? 'border-neutral-950 ring-2 ring-neutral-950/20' : 'border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                          <span className="text-[10px] text-white font-medium line-clamp-1">
                            {preset.label}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 bg-neutral-950 text-white rounded-full p-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="Or enter a custom HTTPS image URL..."
                    value={customCoverUrl}
                    onChange={(e) => setCustomCoverUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                  />
                  {customCoverUrl && (
                    <button
                      type="button"
                      onClick={() => setCustomCoverUrl('')}
                      className="px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 border border-neutral-200 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BRANDING */}
          {activeTab === 'branding' && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-600">
                Organizer & Studio branding appears in the gallery header, guest footer, and on printed QR code signage.
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-800 block mb-1">
                  Organizer / Lead Photographer Name
                </label>
                <input
                  type="text"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  placeholder="e.g. Elena Vance"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-800 block mb-1">
                  Company / Studio Brand
                </label>
                <input
                  type="text"
                  value={organizerCompany}
                  onChange={(e) => setOrganizerCompany(e.target.value)}
                  placeholder="e.g. Vance Editorial Photography LLC"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-800 block mb-1">
                  Studio Logo or Avatar URL (Optional)
                </label>
                <input
                  type="url"
                  value={organizerLogoUrl}
                  onChange={(e) => setOrganizerLogoUrl(e.target.value)}
                  placeholder="https://... logo.png"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Supports square or transparent PNG logos to elevate the gallery's premium feel.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-800 block mb-1">
                    Contact Email for Guests
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="studio@elenavance.photo"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-800 block mb-1">
                    Direct Phone / Studio Contact (Optional)
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 (415) 890-2144"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DESIGN & THEMES */}
          {activeTab === 'design' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Light & Dark Gallery Themes */}
              <div>
                <label className="text-xs font-semibold text-neutral-800 block mb-1">
                  Gallery Atmosphere & Theme Mode
                </label>
                <p className="text-[11px] text-neutral-500 mb-3">
                  Choose between light fine-art or immersive dark palettes for guests.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {THEME_OPTIONS.map((t) => {
                    const isSelected = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        className={`p-3.5 rounded border text-left flex items-start justify-between gap-3 transition-all ${
                          isSelected
                            ? 'border-neutral-950 ring-2 ring-neutral-950/20 bg-neutral-50'
                            : 'border-neutral-200 hover:border-neutral-300 bg-white'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-neutral-900">{t.label}</span>
                            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-neutral-200/70 text-neutral-700">
                              {t.mode}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500">{t.description}</p>
                        </div>
                        <div className={`w-8 h-8 rounded shrink-0 border ${t.bgClass} flex items-center justify-center text-[10px] font-bold ${t.textClass}`}>
                          Aa
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Restrained Accent Colors */}
              <div>
                <label className="text-xs font-semibold text-neutral-800 block mb-1">
                  Restrained Editorial Accent Color
                </label>
                <p className="text-[11px] text-neutral-500 mb-3">
                  Applied to download buttons, active tabs, and primary interactive highlights.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ACCENT_COLORS.map((c) => {
                    const isSelected = accentColor === c.hex;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setAccentColor(c.hex)}
                        className={`p-2.5 rounded border text-left flex items-center gap-2.5 transition-all ${
                          isSelected ? 'border-neutral-950 bg-neutral-50 font-medium' : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-xs text-neutral-800 line-clamp-1">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Typography Presets */}
              <div>
                <label className="text-xs font-semibold text-neutral-800 block mb-1">
                  Typography Preset
                </label>
                <p className="text-[11px] text-neutral-500 mb-3">
                  Tailored font pairing for event titles and header displays.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TYPOGRAPHY_PRESETS.map((p) => {
                    const isSelected = typographyPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setTypographyPreset(p.id)}
                        className={`p-3 rounded border text-left transition-all ${
                          isSelected ? 'border-neutral-950 bg-neutral-50 ring-1 ring-neutral-950/20' : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="text-xs font-semibold text-neutral-900">{p.label}</div>
                        <div className={`text-base text-neutral-800 mt-1 line-clamp-1 ${p.family}`}>
                          Sophia & Julian
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACCESS & PERMISSIONS */}
          {activeTab === 'access' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Publication Status */}
              <div className="p-4 bg-white border border-neutral-200 rounded space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-neutral-900 block">
                      Publication Visibility Status
                    </label>
                    <p className="text-[11px] text-neutral-500">
                      When published, guests can browse this gallery via link or QR code.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-neutral-100 p-0.5 rounded">
                    <button
                      type="button"
                      onClick={() => setStatus('active')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                        status === 'active' ? 'bg-emerald-700 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Active (Published)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('draft')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                        status === 'draft' ? 'bg-amber-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Draft (Unpublished)
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Protection */}
              <div className="p-4 bg-white border border-neutral-200 rounded space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-neutral-600" />
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">
                        PIN Code Password Protection
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        Require guests to enter a security PIN before viewing media.
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPasswordProtected}
                    onChange={(e) => setIsPasswordProtected(e.target.checked)}
                    className="w-4 h-4 text-neutral-900 rounded border-neutral-300"
                  />
                </div>

                {isPasswordProtected && (
                  <div className="pt-3 border-t border-neutral-100">
                    <label className="text-xs font-semibold text-neutral-800 block mb-1">
                      Set 4-Digit Security PIN Code *
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 2026"
                      className="w-36 px-3 py-1.5 text-xs font-mono bg-neutral-50 border border-neutral-300 rounded focus:border-neutral-900 tracking-widest text-center"
                    />
                    {errors.pinCode && (
                      <p className="text-[11px] text-rose-600 mt-1">{errors.pinCode}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Guest Permissions */}
              <div className="p-4 bg-white border border-neutral-200 rounded space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-neutral-900">
                      Allow Full-Resolution Downloads
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Permit guests to download original raw photos and video clips.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowOriginalDownloads}
                    onChange={(e) => setAllowOriginalDownloads(e.target.checked)}
                    className="w-4 h-4 text-neutral-900 rounded border-neutral-300"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <div>
                    <div className="text-xs font-semibold text-neutral-900">
                      Allow Guest Uploads
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Allow invited guests to upload candid moments to this event gallery.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowGuestUploads}
                    onChange={(e) => setAllowGuestUploads(e.target.checked)}
                    className="w-4 h-4 text-neutral-900 rounded border-neutral-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LIVE GUEST PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded text-xs text-amber-900 flex items-center justify-between">
                <span>
                  <strong>Preview Mode:</strong> This simulates how guests will experience the gallery with your selected theme, typography, and cover image.
                </span>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-800">
                  {status}
                </span>
              </div>

              {/* Simulated Guest Gallery Preview Card */}
              <div className={`border rounded overflow-hidden shadow-sm transition-colors ${
                theme === 'charcoal' ? 'bg-[#171717] text-white border-neutral-800' :
                theme === 'midnight-slate' ? 'bg-[#0F172A] text-slate-100 border-slate-800' :
                theme === 'editorial-sand' ? 'bg-[#F4EFEB] text-neutral-900 border-amber-200/60' :
                'bg-[#FAF9F6] text-neutral-900 border-neutral-200'
              }`}>
                {/* Hero section simulation */}
                <div className="relative h-48 sm:h-64 bg-neutral-900 overflow-hidden">
                  <img
                    src={customCoverUrl || coverImage}
                    alt={title}
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="text-[10px] uppercase tracking-widest text-white/80 font-semibold mb-1">
                      {date} · {location}
                    </div>
                    <h1 className={`text-2xl sm:text-3xl font-medium ${
                      typographyPreset === 'modern-grotesk' ? 'font-sans font-bold tracking-tight' :
                      typographyPreset === 'classic-roman' ? 'font-serif tracking-wide' :
                      'font-serif-display'
                    }`}>
                      {title}
                    </h1>
                  </div>

                  {isPasswordProtected && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-neutral-950 text-[10px] font-semibold px-2 py-0.5 rounded shadow-xs">
                      PIN Protected
                    </div>
                  )}
                </div>

                {/* Subheader simulation */}
                <div className="p-4 sm:p-6 space-y-3 border-b border-black/5">
                  <p className="text-xs opacity-80 max-w-xl">
                    {description || 'Welcome to the gallery! Browse and download high-resolution photos.'}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      style={{ backgroundColor: accentColor }}
                      className="px-3 py-1.5 text-white text-xs font-medium rounded shadow-xs"
                    >
                      Download Selected
                    </button>
                    {allowGuestUploads && (
                      <button
                        type="button"
                        className="px-3 py-1.5 border border-current text-xs font-medium rounded opacity-80"
                      >
                        Guest Upload
                      </button>
                    )}
                  </div>
                </div>

                {/* Simulated branding footer */}
                <div className="p-4 text-center text-xs opacity-60">
                  Captured by <strong>{organizerName}</strong> · {organizerCompany || 'Aura Gallery'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            {saveSuccess ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Changes saved to Firestore!</span>
              </span>
            ) : (
              <span>All changes sync with Cloud Firestore.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-neutral-950 hover:bg-neutral-850 text-white text-xs font-semibold uppercase tracking-wider rounded inline-flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save & Publish Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
