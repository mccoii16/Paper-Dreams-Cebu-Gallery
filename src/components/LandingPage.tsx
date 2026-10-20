import React, { useState } from 'react';
import { EventGallery, AppView } from '../types';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { 
  ArrowRight, ShieldCheck, Download, Smartphone, QrCode, 
  Sparkles, CheckCircle2, ChevronRight, Play, Eye, Plus
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: AppView) => void;
  sampleEvents: EventGallery[];
  onSelectEvent: (eventId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  sampleEvents,
  onSelectEvent,
}) => {
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const featuredEvent = sampleEvents[activePreviewIndex] || sampleEvents[0] || null;

  const handleOpenDemo = (eventId: string) => {
    onSelectEvent(eventId);
    onNavigate('gallery');
  };

  return (
    <div className="bg-[#FFF5F7] text-neutral-900 selection:bg-pink-200 selection:text-pink-900 min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-pink-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Split Hero Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Typographic Hierarchy */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Brand Kicker with Logo Badge */}
              <div className="flex items-center gap-2.5 text-xs font-semibold tracking-wider text-pink-700 uppercase">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-pink-100/80 rounded-full border border-pink-200 text-pink-800">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                  Paper Dreams Cebu
                </span>
                <span aria-hidden="true" className="text-pink-300">·</span>
                <span className="text-neutral-500">Private Event Galleries</span>
                <span aria-hidden="true" className="text-pink-300">·</span>
                <span className="text-neutral-500">Zero App Installs</span>
              </div>

              {/* Refined Display Headline */}
              <h1 className="text-4xl sm:text-6xl font-normal font-serif-display tracking-tight text-neutral-950 leading-[1.14] text-balance">
                Timeless event photo & video sharing for your celebrations.
              </h1>

              {/* Lead Copy */}
              <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-2xl font-normal">
                Share high-resolution event photography and 4K video clips directly with guests through a single link or QR code. Beautiful baby pink aesthetics, seamless guest uploads, and instant full-resolution downloads.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  onClick={() => onNavigate('create-event')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold uppercase tracking-wider rounded-sm shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your Event Gallery</span>
                </button>

                {featuredEvent ? (
                  <button
                    onClick={() => handleOpenDemo(featuredEvent.id)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-pink-200 text-neutral-900 hover:bg-pink-50 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors"
                  >
                    <Eye className="w-4 h-4 text-pink-600" />
                    <span>View Guest Gallery</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate('organizer-dashboard')}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-pink-200 text-neutral-900 hover:bg-pink-50 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors"
                  >
                    <span>Organizer Studio</span>
                    <ArrowRight className="w-4 h-4 text-pink-500" />
                  </button>
                )}
              </div>

              {/* Proof Marker adjacent to CTA */}
              <div className="pt-4 flex items-center gap-3 text-xs text-neutral-500">
                <ShieldCheck className="w-4 h-4 text-pink-600 shrink-0" />
                <span>Original camera sensor resolution preserved. Direct cloud downloads with zero compression.</span>
              </div>
            </div>

            {/* Right Column: Hero Visual Showcase */}
            <div className="lg:col-span-5 relative">
              {featuredEvent ? (
                <div className="relative rounded-sm overflow-hidden border border-pink-200/80 shadow-xl bg-neutral-900 group">
                  <img
                    src={resolveMediaUrl(featuredEvent.coverImage)}
                    alt={featuredEvent.title}
                    referrerPolicy="no-referrer"
                    className="w-full aspect-[4/5] object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                  />
                  
                  {/* Visual Glass Overlay Badge */}
                  <div className="absolute inset-x-4 bottom-4 bg-black/75 backdrop-blur-md p-4 rounded-sm border border-white/10 text-white space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-pink-200">
                      <span className="font-semibold uppercase tracking-wider text-pink-300">Live Event Gallery</span>
                      <span>{featuredEvent.stats.photosCount} Photos · {featuredEvent.stats.videosCount} Videos</span>
                    </div>
                    <h3 className="text-lg font-serif-display text-white">{featuredEvent.title}</h3>
                    <p className="text-xs text-neutral-300 truncate">{featuredEvent.location}</p>
                    
                    <div className="pt-2 flex items-center justify-between border-t border-white/15">
                      <button
                        onClick={() => handleOpenDemo(featuredEvent.id)}
                        className="text-xs text-pink-300 font-medium hover:underline flex items-center gap-1"
                      >
                        <span>View Live Gallery</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] text-neutral-400 font-mono">{featuredEvent.stats.totalSize}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty state showcase featuring Paper Dreams Cebu branding */
                <div className="relative rounded-2xl overflow-hidden border border-pink-200 bg-white/80 p-8 sm:p-10 text-center shadow-lg backdrop-blur-xs space-y-5">
                  <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-2 border-pink-300 shadow-md bg-pink-100 flex items-center justify-center">
                    <img 
                      src="/assets/aistudio/logo2_606d60c8.png" 
                      alt="Paper Dreams Cebu" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[11px] uppercase tracking-widest font-semibold text-pink-600 bg-pink-50 px-3 py-1 rounded-full border border-pink-200">
                      Cebu, Philippines
                    </span>
                    <h3 className="text-2xl font-serif-display font-medium text-neutral-900">
                      Paper Dreams Cebu
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-sm mx-auto">
                      Your event gallery is ready. Create your first wedding, birthday, christening, or debut gallery and invite guests with table QR codes.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => onNavigate('create-event')}
                      className="w-full py-3 px-4 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors shadow-xs inline-flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create First Event</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Quantitative Proof Strip */}
          <div className="mt-16 pt-10 border-t border-pink-200/70 grid grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left">
            <div>
              <div className="text-2xl sm:text-3xl font-semibold font-serif-display text-pink-600 tabular-nums">0s</div>
              <div className="text-xs text-neutral-500 mt-1">Guest friction (no app required)</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-semibold font-serif-display text-pink-600 tabular-nums">100%</div>
              <div className="text-xs text-neutral-500 mt-1">Original sensor resolution preserved</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-semibold font-serif-display text-pink-600 tabular-nums">4K 60fps</div>
              <div className="text-xs text-neutral-500 mt-1">High framerate video clips</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-semibold font-serif-display text-pink-600 tabular-nums">1-Click</div>
              <div className="text-xs text-neutral-500 mt-1">Single item or full album download</div>
            </div>
          </div>

        </div>
      </section>

      {/* Events Showcase Section */}
      {sampleEvents.length > 0 && (
        <section className="py-20 bg-white border-b border-pink-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <p className="text-xs uppercase tracking-wider text-pink-600 font-semibold mb-2">
                  Event Galleries
                </p>
                <h2 className="text-3xl sm:text-4xl font-normal font-serif-display text-neutral-950">
                  Crafted for celebrations & unforgettable moments.
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-md">
                Browse through your created event galleries below to view photos, play video clips, and download high-resolution files.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {sampleEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => handleOpenDemo(evt.id)}
                  className="group cursor-pointer bg-[#FFF5F7] border border-pink-200/90 rounded-sm overflow-hidden flex flex-col justify-between hover:border-pink-400 hover:shadow-lg transition-all duration-200"
                >
                  <div>
                    <div className="relative aspect-[16/10] overflow-hidden bg-neutral-900">
                      <img
                        src={resolveMediaUrl(evt.coverImage)}
                        alt={evt.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white text-[11px] px-2 py-0.5 rounded font-mono">
                        {evt.stats.photosCount} Photos · {evt.stats.videosCount} Videos
                      </div>
                    </div>

                    <div className="p-5 space-y-2">
                      <div className="text-[11px] text-pink-700 flex items-center gap-1.5 font-medium">
                        <span>{evt.date}</span>
                      </div>
                      <h3 className="text-lg font-serif-display font-medium text-neutral-950 group-hover:text-pink-600 transition-colors">
                        {evt.title}
                      </h3>
                      <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-pink-100 flex items-center justify-between text-xs font-semibold text-neutral-900">
                    <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-pink-600">
                      <span>Open Guest View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[11px] font-normal text-neutral-500">{evt.organizer.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      <section className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <p className="text-xs uppercase tracking-wider text-pink-600 font-semibold">
            Seamless Guest Workflow
          </p>
          <h2 className="text-3xl sm:text-4xl font-normal font-serif-display text-neutral-950">
            How Paper Dreams Cebu delivers memories without friction.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600">
            Designed for professional photographers and event hosts who cherish thoughtful presentation and heartfelt celebrations.
          </p>
        </div>

        {/* 3 Step Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-4 bg-white/70 p-6 rounded-xl border border-pink-100 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-serif-display text-sm font-semibold border border-pink-200">
              01
            </div>
            <h3 className="text-lg font-serif-display font-medium text-neutral-900">
              Create & Curate Space
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Set up your event in seconds. Upload high-res photos and video highlights with drag-and-drop ease. Customize privacy with optional PIN protection.
            </p>
          </div>

          <div className="space-y-4 bg-white/70 p-6 rounded-xl border border-pink-100 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-serif-display text-sm font-semibold border border-pink-200">
              02
            </div>
            <h3 className="text-lg font-serif-display font-medium text-neutral-900">
              Instant QR & Table Sharing
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Print a clean QR code on table cards or send guests a direct link. Guests tap on their mobile browser to view moments without installing an app or registering.
            </p>
          </div>

          <div className="space-y-4 bg-white/70 p-6 rounded-xl border border-pink-100 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-serif-display text-sm font-semibold border border-pink-200">
              03
            </div>
            <h3 className="text-lg font-serif-display font-medium text-neutral-900">
              Original Fidelity Downloads
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Guests can view photos in cinematic full-screen and download full-resolution captures with original EXIF data intact, ready for professional framing.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Callout */}
      <section className="bg-neutral-900 text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-pink-400 mx-auto bg-pink-100">
              <img src="/assets/aistudio/logo2_606d60c8.png" alt="Paper Dreams Cebu" className="w-full h-full object-cover" />
            </div>
            <p className="text-xs uppercase tracking-wider text-pink-300 font-semibold">
              Paper Dreams Cebu
            </p>
            <h2 className="text-3xl sm:text-4xl font-normal font-serif-display">
              Why event hosts prefer Paper Dreams Cebu over generic cloud folders.
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              No bloated logins, no compression artifacts, no messy file structures. Just an editorial gallery designed to celebrate human milestones.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('create-event')}
                className="w-full sm:w-auto px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs uppercase tracking-wider rounded-sm transition-colors shadow-xs"
              >
                Create Event Gallery
              </button>
              <button
                onClick={() => onNavigate('organizer-dashboard')}
                className="w-full sm:w-auto px-6 py-3 border border-pink-300/40 text-pink-100 font-semibold text-xs uppercase tracking-wider rounded-sm hover:bg-white/10 transition-colors"
              >
                Organizer Studio
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="border-t border-pink-200 py-10 text-xs text-neutral-500 bg-[#FFF5F7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-pink-200">
              <img src="/assets/aistudio/logo2_606d60c8.png" alt="Paper Dreams Cebu" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif-display font-semibold text-neutral-900">Paper Dreams Cebu</span>
            <span aria-hidden="true" className="text-pink-300">·</span>
            <span>Private Event Media Sharing Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('gallery')} className="hover:text-pink-700 transition-colors">Guest Gallery</button>
            <button onClick={() => onNavigate('organizer-dashboard')} className="hover:text-pink-700 transition-colors">Dashboard</button>
            <button onClick={() => onNavigate('upload-media')} className="hover:text-pink-700 transition-colors">Upload</button>
            <span>© 2026 Paper Dreams Cebu</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
