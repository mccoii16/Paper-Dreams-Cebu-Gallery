import React, { useState, useMemo } from 'react';
import { EventGallery, MediaItem } from '../types';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { 
  X, Trash2, Edit2, Check, ArrowUpDown, ArrowUp, ArrowDown, 
  UploadCloud, Search, CheckSquare, Square, Filter, 
  AlertTriangle, FileText, Calendar, HardDrive, Play, RefreshCw
} from 'lucide-react';

interface MediaManagerModalProps {
  event: EventGallery | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteMedia: (mediaId: string, storagePath?: string, thumbnailStoragePath?: string) => Promise<void>;
  onBatchDeleteMedia: (items: { id: string; storagePath?: string; thumbnailStoragePath?: string }[]) => Promise<void>;
  onUpdateMediaMetadata: (eventId: string, mediaId: string, title: string, caption: string) => Promise<void>;
  onReorderMedia?: (eventId: string, reorderedItems: MediaItem[]) => void;
  onOpenUpload: (eventId: string) => void;
}

export const MediaManagerModal: React.FC<MediaManagerModalProps> = ({
  event,
  isOpen,
  onClose,
  onDeleteMedia,
  onBatchDeleteMedia,
  onUpdateMediaMetadata,
  onReorderMedia,
  onOpenUpload,
}) => {
  if (!isOpen || !event) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title' | 'size'>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Edit Caption & Title modal/state
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Destructive confirmation state
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter items
  const filteredItems = useMemo(() => {
    let list = [...event.items];
    if (typeFilter !== 'all') {
      list = list.filter((m) => m.type === typeFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.caption && m.caption.toLowerCase().includes(q))
      );
    }

    if (sortOrder === 'newest') {
      list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    } else if (sortOrder === 'oldest') {
      list.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
    } else if (sortOrder === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOrder === 'size') {
      const parseMb = (sz: string) => parseFloat(sz.replace(/[^0-9.]/g, '')) || 0;
      list.sort((a, b) => parseMb(b.fileSize) - parseMb(a.fileSize));
    }

    return list;
  }, [event.items, typeFilter, searchTerm, sortOrder]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((m) => m.id)));
    }
  };

  const startEdit = (item: MediaItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditCaption(item.caption || '');
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);
    try {
      await onUpdateMediaMetadata(event.id, editingItem.id, editTitle.trim() || editingItem.title, editCaption.trim());
      setEditingItem(null);
    } catch (err) {
      console.error('Failed to update media caption:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteMedia(itemToDelete.id, itemToDelete.storagePath, itemToDelete.thumbnailStoragePath);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(itemToDelete.id);
        return next;
      });
      setItemToDelete(null);
    } catch (err) {
      console.error('Failed to delete media:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const itemsToDelete = event.items
        .filter((m) => selectedIds.has(m.id))
        .map((m) => ({
          id: m.id,
          storagePath: m.storagePath,
          thumbnailStoragePath: m.thumbnailStoragePath,
        }));
      await onBatchDeleteMedia(itemsToDelete);
      setSelectedIds(new Set());
      setConfirmDeleteBatch(false);
    } catch (err) {
      console.error('Failed to batch delete media:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveItem = (item: MediaItem, direction: 'up' | 'down') => {
    if (!onReorderMedia) return;
    const masterIndex = event.items.findIndex((m) => m.id === item.id);
    if (masterIndex === -1) return;
    const targetIndex = direction === 'up' ? masterIndex - 1 : masterIndex + 1;
    if (targetIndex < 0 || targetIndex >= event.items.length) return;

    const newOrder = [...event.items];
    const temp = newOrder[masterIndex];
    newOrder[masterIndex] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    onReorderMedia(event.id, newOrder);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div 
        className="bg-white border border-neutral-200 max-w-5xl w-full rounded-md shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-neutral-500">
              Media Management Studio
            </div>
            <h2 className="text-xl font-serif-display font-medium text-neutral-900">
              {event.title} · Media Library
            </h2>
            <div className="text-xs text-neutral-500 flex items-center gap-3 mt-0.5">
              <span>{event.items.length} Total Files</span>
              <span>·</span>
              <span>{event.stats.photosCount} Photos</span>
              <span>·</span>
              <span>{event.stats.videosCount} Videos</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenUpload(event.id);
              }}
              className="px-3.5 py-1.5 bg-neutral-950 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-neutral-800 transition-colors shadow-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload More Media</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Filters, Ordering, and Multi-Select Actions */}
        <div className="px-6 py-3 border-b border-neutral-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          {/* Search & Type filter */}
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search captions or filenames..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded text-neutral-700 focus:outline-none focus:border-neutral-900"
            >
              <option value="all">All Types</option>
              <option value="photo">Photos Only</option>
              <option value="video">Videos Only</option>
            </select>
          </div>

          {/* Sort order selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-neutral-600">
              <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
              <span>Order:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded text-neutral-800 font-medium focus:outline-none focus:border-neutral-900"
              >
                <option value="newest">Newest Upload</option>
                <option value="oldest">Oldest Upload</option>
                <option value="title">Title (A-Z)</option>
                <option value="size">File Size (Largest)</option>
              </select>
            </div>

            {/* Select All Toggle */}
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200 rounded font-medium inline-flex items-center gap-1.5"
            >
              {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-neutral-900" />
              ) : (
                <Square className="w-3.5 h-3.5 text-neutral-400" />
              )}
              <span>Select All</span>
            </button>

            {/* Batch Delete action */}
            {selectedIds.size > 0 && (
              <button
                onClick={() => setConfirmDeleteBatch(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded inline-flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Media Items Table / Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-neutral-500">
              <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-medium">No media matches the current filter</p>
              <p className="text-xs text-neutral-400 mt-1">Try clearing your search term or upload new photos.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredItems.map((item, index) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-neutral-950 bg-neutral-50/80 ring-1 ring-neutral-950/20'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleSelect(item.id)}
                        className="text-neutral-500 hover:text-neutral-900 p-0.5"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-neutral-900" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-400" />
                        )}
                      </button>

                      {/* Thumbnail Preview */}
                      <div className="relative w-14 h-14 bg-neutral-900 rounded overflow-hidden shrink-0 border border-neutral-200">
                        <img
                          src={resolveMediaUrl(item.thumbnailUrl || item.url)}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        {item.type === 'video' && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Play className="w-3 h-3 text-white fill-white" />
                          </div>
                        )}
                      </div>

                      {/* Title & Metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-neutral-900 truncate">
                            {item.title}
                          </h4>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            item.type === 'video' ? 'bg-amber-100 text-amber-900' : 'bg-neutral-100 text-neutral-700'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                        {item.caption && (
                          <p className="text-[11px] text-neutral-500 truncate max-w-md mt-0.5">
                            "{item.caption}"
                          </p>
                        )}
                        <div className="text-[10px] text-neutral-400 flex items-center gap-2 mt-1 flex-wrap">
                          <span>{item.fileSize}</span>
                          <span>·</span>
                          <span>{item.dimensions}</span>
                          <span>·</span>
                          <span>Uploaded: {item.uploadedAt}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Reorder, Edit Caption, Delete */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      {onReorderMedia && (
                        <div className="flex items-center gap-0.5 bg-neutral-100 p-0.5 rounded">
                          <button
                            onClick={() => handleMoveItem(item, 'up')}
                            disabled={index === 0}
                            className="p-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-30 rounded hover:bg-neutral-200"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMoveItem(item, 'down')}
                            disabled={index === filteredItems.length - 1}
                            className="p-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-30 rounded hover:bg-neutral-200"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => startEdit(item)}
                        className="px-2.5 py-1 text-xs text-neutral-700 hover:text-neutral-900 border border-neutral-200 hover:bg-neutral-100 rounded inline-flex items-center gap-1"
                        title="Edit title & caption"
                      >
                        <Edit2 className="w-3 h-3 text-neutral-500" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => setItemToDelete(item)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete this media"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Caption Modal Dialog */}
        {editingItem && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white border border-neutral-200 max-w-md w-full p-6 rounded-md shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">Edit Media Details</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Customize title and display caption for this file</p>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1 text-neutral-400 hover:text-neutral-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Caption / Story</label>
                  <textarea
                    rows={3}
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    placeholder="Short description or memorable moment..."
                    className="w-full px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded focus:border-neutral-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="px-3.5 py-1.5 bg-neutral-900 text-white text-xs font-semibold rounded hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingEdit ? 'Saving...' : 'Save Details'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Single File Delete Confirmation Modal */}
        {itemToDelete && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white border border-neutral-200 max-w-sm w-full p-6 rounded-md shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-semibold text-neutral-900">Delete Media File?</h3>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Are you sure you want to delete <strong>"{itemToDelete.title}"</strong>? This will permanently delete both the original file and its generated web thumbnails from Cloud Storage.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  onClick={() => setItemToDelete(null)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSingleDelete}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Batch Delete Confirmation Modal */}
        {confirmDeleteBatch && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white border border-neutral-200 max-w-md w-full p-6 rounded-md shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-semibold text-neutral-900">
                  Delete {selectedIds.size} Selected Files?
                </h3>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                This action cannot be undone. All {selectedIds.size} selected originals and preview thumbnails will be permanently deleted from Firebase Storage and Firestore.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  onClick={() => setConfirmDeleteBatch(false)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBatchDelete}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting Selected...' : `Delete All ${selectedIds.size} Files`}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs text-neutral-500">
          <div>
            {selectedIds.size > 0 ? (
              <span><strong>{selectedIds.size}</strong> of {filteredItems.length} files selected</span>
            ) : (
              <span>Select files to delete in batch or edit titles and captions</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 text-white font-medium rounded hover:bg-neutral-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
