import React, { useState } from 'react';
import { EventGallery } from '../types';
import { downloadEventQRCodePNG } from '../utils/qrcode';
import { shareContent } from '../utils/share';
import { X, Copy, Check, Download, Printer, Share2, ExternalLink, Globe } from 'lucide-react';

interface ShareQRModalProps {
  event: EventGallery | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareQRModal: React.FC<ShareQRModalProps> = ({
  event,
  isOpen,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingSign, setIsGeneratingSign] = useState(false);

  if (!isOpen || !event) return null;

  const eventUrl = `${window.location.origin}/#event=${event.slug}`;
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
    eventUrl
  )}&margin=12`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(eventUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = eventUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  };

  const handleNativeShare = async () => {
    const res = await shareContent({
      title: `${event.title} · Guest Photo & Video Gallery`,
      text: `Access and download high-resolution photos and video highlights from ${event.title}`,
      url: eventUrl,
    });
    if (res.method === 'clipboard') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleDownloadPNG = async () => {
    setIsGeneratingSign(true);
    try {
      await downloadEventQRCodePNG(event.title, event.slug, event.date, eventUrl);
    } catch (err) {
      console.error('Error downloading sign:', err);
    } finally {
      setIsGeneratingSign(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-white border border-neutral-200/90 max-w-md w-full rounded-md shadow-2xl p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">
              <Globe className="w-3.5 h-3.5 text-neutral-400" />
              <span>Guest Sharing & QR</span>
            </div>
            <h3 className="text-xl font-serif-display font-medium text-neutral-900">
              {event.title}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Unique public link and high-resolution table sign
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Card Display */}
        <div className="bg-[#FAF9F6] border border-neutral-200/80 rounded-md p-5 text-center space-y-3">
          <div className="w-48 h-48 bg-white p-2.5 border border-neutral-200 rounded-sm shadow-xs mx-auto flex items-center justify-center">
            <img
              src={qrImageSrc}
              alt={`QR code for ${event.title}`}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Scan with Smartphone Camera
            </div>
            <div className="text-xs text-neutral-800 font-mono mt-1 break-all bg-white px-2 py-1 rounded border border-neutral-200 inline-block max-w-full">
              /#event={event.slug}
            </div>
          </div>
        </div>

        {/* Shareable URL Copy Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-700 block">
            Public Event Gallery URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={eventUrl}
              className="flex-1 px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded text-neutral-700 select-all font-mono focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded inline-flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-neutral-100">
          <button
            onClick={handleDownloadPNG}
            disabled={isGeneratingSign}
            className="w-full py-2.5 px-3 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold rounded inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingSign ? 'Rendering PNG...' : 'Download Table Sign PNG'}</span>
          </button>

          <button
            onClick={handleNativeShare}
            className="w-full py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold rounded inline-flex items-center justify-center gap-2 transition-colors border border-neutral-200"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share via Phone / App</span>
          </button>

          <button
            onClick={() => window.print()}
            className="py-2 px-3 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 border border-neutral-200 rounded text-xs font-medium inline-flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Signage</span>
          </button>

          <a
            href={eventUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-3 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 border border-neutral-200 rounded text-xs font-medium inline-flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in New Tab</span>
          </a>
        </div>
      </div>
    </div>
  );
};
