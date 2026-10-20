import React, { useState } from 'react';
import { EventGallery, AppView } from '../types';
import { 
  ArrowRight, ShieldCheck, Download, Smartphone, QrCode, 
  Sparkles, CheckCircle2, ChevronRight, Play, Eye
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
  const featuredEvent = sampleEvents[activePreviewIndex] || sampleEvents[0];

  const handleOpenDemo = (eventId: string) => {
    onSelectEvent(eventId);
    onNavigate('gallery');
  };

  return (
    <div className="bg-[#FAF9F6] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Split Hero Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Typographic Hierarchy */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Unboxed Kicker */}
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                <span>Private Event Galleries</span>
                <span aria-hidden="true">·</span>
                <span>Mobile-First Fidelity</span>
                <span aria-hidden="true">·</span>
                <span>Zero App Installs</span>
              </div>

              {/* Refined Display Headline */}
              <h1 className="text-4xl sm:text-6xl font-normal font-serif-display tracking-tight text-neutral-950 leading-[1.12] text-balance">
                A private, timeless gallery for your unforgettable events.
              </h1>

              {/* Lead Copy */}
              <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-2xl font-normal">
                Share high-resolution event photography and 4K video clips directly with guests through a single link or QR code. No app downloads, no compression, and no guest account signups required.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  onClick={() => handleOpenDemo(featuredEvent.id)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold uppercase tracking-wider rounded-sm shadow-sm transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Explore Guest Demo</span>
                </button>

                <button
                  onClick={() => onNavigate('create-event')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-neutral-300 text-neutral-900 hover:bg-neutral-100 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors"
                >
                  <span>Create Your Event</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Proof Marker adjacent to CTA */}
              <div className="pt-4 flex items-center gap-3 text-xs text-neutral-500">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>48,000+ guest captures delivered with full EXIF data and native sensor resolution.</span>
              </div>
            </div>

            {/* Right Column: Hero Visual Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-sm overflow-hidden border border-neutral-300/80 shadow-xl bg-neutral-900 group">
                <img
                  src={featuredEvent.coverImage}
                  alt={featuredEvent.title}
                  referrerPolicy="no-referrer"
                  className="w-full aspect-[4/5] object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                />
                
                {/* Visual Glass Overlay Badge */}
                <div className="absolute inset-x-4 bottom-4 bg-black/75 backdrop-blur-md p-4 rounded-sm border border-white/10 text-white space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-300">
                    <span className="font-semibold uppercase tracking-wider text-amber-300">Featured Sample Gallery</span>
                    <span>{featuredEvent.stats.photosCount} Photos · {featuredEvent.stats.videosCount} Videos</span>
                  </div>
                  <h3 className="text-lg font-serif-display text-white">{featuredEvent.title}</h3>
                  <p className="text-xs text-neutral-300 truncate">{featuredEvent.location}</p>
                  
                  <div className="pt-2 flex items-center justify-between border-t border-white/15">
                    <button
                      onClick={() => handleOpenDemo(featuredEvent.id)}
                      className="text-xs text-white font-medium hover:underline flex items-center gap-1"
                    >
                      <span>View Live Gallery</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] text-neutral-400 font-mono">{featuredEvent.stats.totalSize}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Quantitative Proof Strip */}
          <div className="mt-16 pt-10 border-t border-neutral-200 grid grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left">
            <div>
              <div className="text-2xl sm:text-3xl font-semibold font-serif-display text-neutral-900 tabular-nums">0s</div>
              <div className="text-xs text-neutral-500 mt-1">Guest friction (no app required)</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-semibold font-serif-display text-neutral-900 tabular-nums">100%</div>
              <div className="text-xs text-neutral-500 mt-1">Original sensor resolution preserved</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-semibold font-serif-display text-neutral-900 tabular-nums">4K 60fps</div>
              <div className="text-xs text-neutral-500 mt-1">High framerate video clips</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-semibold font-serif-display text-neutral-900 tabular-nums">1-Click</div>
              <div className="text-xs text-neutral-500 mt-1">Full album or single item download</div>
            </div>
          </div>

        </div>
      </section>

      {/* Interactive Sample Gallery Showcase */}
      <section className="py-20 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-2">
                Curated Demo Events
              </p>
              <h2 className="text-3xl sm:text-4xl font-normal font-serif-display text-neutral-950">
                Crafted for weddings, galas, and design summits.
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-md">
              Switch between sample events below to see how guest galleries present different styles, color palettes, and privacy settings.
            </p>
          </div>

          {/* 3-in-a-row sample event cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {sampleEvents.map((evt, idx) => (
              <div
                key={evt.id}
                onClick={() => handleOpenDemo(evt.id)}
                className="group cursor-pointer bg-[#FAF9F6] border border-neutral-200/90 rounded-sm overflow-hidden flex flex-col justify-between hover:border-neutral-400 hover:shadow-lg transition-all duration-200"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-neutral-900">
                    <img
                      src={evt.coverImage}
                      alt={evt.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white text-[11px] px-2 py-0.5 rounded font-mono">
                      {evt.stats.photosCount} Photos · {evt.stats.videosCount} Videos
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                      <span>{evt.date}</span>
                    </div>
                    <h3 className="text-lg font-serif-display font-medium text-neutral-950 group-hover:text-neutral-700 transition-colors">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-900">
                  <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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

      {/* How It Works Editorial Section */}
      <section className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
            Seamless Guest Workflow
          </p>
          <h2 className="text-3xl sm:text-4xl font-normal font-serif-display text-neutral-950">
            How Aura Gallery delivers memories without friction.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600">
            Designed for professional photographers and event hosts who value presentation over cluttered social feeds.
          </p>
        </div>

        {/* 3 Step Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-sm bg-neutral-900 text-white flex items-center justify-center font-serif-display text-sm font-semibold">
              01
            </div>
            <h3 className="text-lg font-serif-display font-medium text-neutral-900">
              Create & Curate Space
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Set up your event in seconds. Upload high-res photos and video highlights with drag-and-drop ease. Customize privacy with optional PIN protection.
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-10 h-10 rounded-sm bg-neutral-900 text-white flex items-center justify-center font-serif-display text-sm font-semibold">
              02
            </div>
            <h3 className="text-lg font-serif-display font-medium text-neutral-900">
              Instant QR & Table Sharing
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Print a clean QR code on table cards or send guests a direct link. Guests tap on their mobile browser to view moments without installing an app or registering.
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-10 h-10 rounded-sm bg-neutral-900 text-white flex items-center justify-center font-serif-display text-sm font-semibold">
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
            <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
              Built Different
            </p>
            <h2 className="text-3xl sm:text-4xl font-normal font-serif-display">
              Why event hosts prefer Aura over generic cloud folders and photo booth portals.
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              No bloated logins, no compression artifacts, no messy file structures. Just an editorial gallery designed to celebrate human milestones.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('create-event')}
                className="w-full sm:w-auto px-6 py-3 bg-white text-neutral-950 font-semibold text-xs uppercase tracking-wider rounded-sm hover:bg-neutral-200 transition-colors"
              >
                Create Event Gallery
              </button>
              <button
                onClick={() => onNavigate('organizer-dashboard')}
                className="w-full sm:w-auto px-6 py-3 border border-white/20 text-white font-semibold text-xs uppercase tracking-wider rounded-sm hover:bg-white/10 transition-colors"
              >
                Organizer Studio
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="border-t border-neutral-200 py-10 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif-display font-semibold text-neutral-900 uppercase">Aura Gallery</span>
            <span aria-hidden="true">·</span>
            <span>Private Event Media Sharing Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('gallery')} className="hover:text-neutral-900 transition-colors">Demo</button>
            <button onClick={() => onNavigate('organizer-dashboard')} className="hover:text-neutral-900 transition-colors">Dashboard</button>
            <button onClick={() => onNavigate('upload-media')} className="hover:text-neutral-900 transition-colors">Upload</button>
            <span>© 2026 Aura Systems</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
