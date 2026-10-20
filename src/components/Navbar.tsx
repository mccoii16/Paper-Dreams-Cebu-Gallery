import React, { useState } from 'react';
import { AppView } from '../types';
import { useAuth } from '../context/AuthContext';
import { Camera, Plus, Menu, X, Eye, LayoutDashboard, UploadCloud, LogIn, LogOut, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  activeEventTitle?: string;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentView, 
  onNavigate, 
  activeEventTitle,
  onOpenAuth 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();

  const handleNav = (view: AppView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-neutral-200/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          
          {/* Zone 1: Single text element wordmark */}
          <button
            onClick={() => handleNav('landing')}
            className="flex items-center gap-2.5 text-left text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-sm"
          >
            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center">
              <Camera className="w-4 h-4 stroke-[1.75]" />
            </div>
            <span className="text-base font-semibold tracking-wider font-serif-display uppercase text-neutral-950 whitespace-nowrap shrink-0">
              Aura Gallery
            </span>
          </button>

          {/* Zone 2: 4 clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <button
              onClick={() => handleNav('landing')}
              className={`hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'landing' ? 'text-neutral-950 font-semibold' : ''
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNav('gallery')}
              className={`hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'gallery' ? 'text-neutral-950 font-semibold' : ''
              }`}
            >
              Guest Gallery
            </button>
            <button
              onClick={() => handleNav('organizer-dashboard')}
              className={`hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'organizer-dashboard' ? 'text-neutral-950 font-semibold' : ''
              }`}
            >
              Organizer Dashboard
            </button>
            <button
              onClick={() => handleNav('upload-media')}
              className={`hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'upload-media' ? 'text-neutral-950 font-semibold' : ''
              }`}
            >
              Upload Queue
            </button>
          </nav>

          {/* Zone 3: 1 primary action & auth */}
          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="hidden sm:flex items-center gap-2 pr-1">
                <span className="text-xs text-neutral-600 truncate max-w-[120px]">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <button
                  onClick={() => logout()}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
                  title="Sign out of organizer account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 rounded-sm transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            <button
              onClick={() => handleNav('create-event')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-neutral-900 hover:bg-neutral-800 transition-colors rounded-sm shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Event</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-neutral-700 hover:text-neutral-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-sm"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-200 bg-[#FAF9F6] px-4 pt-3 pb-5 space-y-2.5 animate-in fade-in duration-150">
          <div className="text-xs uppercase tracking-wider text-neutral-600 px-3 py-1 font-semibold">
            Navigation
          </div>
          <button
            onClick={() => handleNav('landing')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium text-left ${
              currentView === 'landing' ? 'bg-neutral-200/60 text-neutral-950 font-semibold' : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <Camera className="w-4 h-4 text-neutral-500" />
            <span>Home & Platform</span>
          </button>
          <button
            onClick={() => handleNav('gallery')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium text-left ${
              currentView === 'gallery' ? 'bg-neutral-200/60 text-neutral-950 font-semibold' : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <Eye className="w-4 h-4 text-neutral-500" />
            <span>Guest Gallery Demo</span>
          </button>
          <button
            onClick={() => handleNav('organizer-dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium text-left ${
              currentView === 'organizer-dashboard' ? 'bg-neutral-200/60 text-neutral-950 font-semibold' : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-neutral-500" />
            <span>Organizer Dashboard</span>
          </button>
          <button
            onClick={() => handleNav('upload-media')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium text-left ${
              currentView === 'upload-media' ? 'bg-neutral-200/60 text-neutral-950 font-semibold' : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-neutral-500" />
            <span>Upload Media</span>
          </button>

          <div className="pt-2 border-t border-neutral-200">
            {currentUser ? (
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-neutral-600 font-medium">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-rose-600 hover:underline flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-neutral-900 flex items-center gap-2"
              >
                <LogIn className="w-4 h-4 text-neutral-600" />
                <span>Organizer Sign In</span>
              </button>
            )}
          </div>

          {activeEventTitle && (
            <div className="pt-2 border-t border-neutral-200 text-xs text-neutral-600 px-3">
              Active Event: <span className="font-semibold text-neutral-900">{activeEventTitle}</span>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
