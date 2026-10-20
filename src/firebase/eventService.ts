import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  deleteDoc, query, where, orderBy, limit, startAfter, 
  QueryDocumentSnapshot, DocumentData, serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, uploadBytesResumable, getDownloadURL, deleteObject 
} from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';
import { db, storage, auth } from './config';
import { handleFirestoreError, OperationType } from './error';
import { EventGallery, MediaItem } from '../types';

export interface FirebaseEventRecord {
  id: string;
  slug: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  description: string;
  coverImage: string;
  status: 'active' | 'draft' | 'archived';
  isPasswordProtected: boolean;
  pinCode?: string;
  allowGuestUploads: boolean;
  allowOriginalDownloads: boolean;
  theme: 'warm-white' | 'charcoal' | 'editorial-sand' | 'midnight-slate';
  accentColor?: string;
  typographyPreset?: 'editorial-serif' | 'modern-grotesk' | 'classic-roman';
  ownerId: string;
  organizerName?: string;
  organizerEmail?: string;
  organizerCompany?: string;
  organizerLogoUrl?: string;
  organizerPhone?: string;
  createdAt: string;
  updatedAt: string;
  stats?: {
    totalMedia: number;
    photosCount: number;
    videosCount: number;
    totalSize: string;
    guestVisits: number;
    downloadCount: number;
  };
}

export interface FirebaseMediaRecord {
  id: string;
  eventId: string;
  ownerId?: string;
  url: string;
  storagePath?: string;
  thumbnailUrl?: string;
  thumbnailStoragePath?: string;
  type: 'photo' | 'video';
  title: string;
  caption?: string;
  fileSize: string;
  dimensions: string;
  width?: number;
  height?: number;
  duration?: string;
  capturedAt: string;
  uploadedAt: string;
  views: number;
  downloads: number;
  exif?: {
    camera?: string;
    lens?: string;
    aperture?: string;
    shutterSpeed?: string;
    iso?: string;
    focalLength?: string;
  };
}

// -------------------------------------------------------------
// EVENT OPERATIONS
// -------------------------------------------------------------

export async function createFirestoreEvent(
  eventData: Omit<FirebaseEventRecord, 'id' | 'createdAt' | 'updatedAt'>,
  customId?: string
): Promise<string> {
  const eventId = customId || `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  const path = `events/${eventId}`;

  try {
    const payload = {
      ...eventData,
      id: eventId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: eventData.stats || {
        totalMedia: 0,
        photosCount: 0,
        videosCount: 0,
        totalSize: '0 MB',
        guestVisits: 1,
        downloadCount: 0,
      },
    };

    await setDoc(doc(db, 'events', eventId), payload);
    return eventId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFirestoreEvent(
  eventId: string,
  updates: Partial<FirebaseEventRecord>
): Promise<void> {
  const path = `events/${eventId}`;
  try {
    await updateDoc(doc(db, 'events', eventId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFirestoreEvent(eventId: string): Promise<void> {
  const path = `events/${eventId}`;
  try {
    // Delete event document
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getFirestoreEventById(eventId: string): Promise<FirebaseEventRecord | null> {
  const path = `events/${eventId}`;
  try {
    const snap = await getDoc(doc(db, 'events', eventId));
    if (!snap.exists()) return null;
    return snap.data() as FirebaseEventRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getFirestoreEventBySlug(slug: string): Promise<FirebaseEventRecord | null> {
  const path = 'events';
  try {
    const q = query(collection(db, 'events'), where('slug', '==', slug), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return querySnapshot.docs[0].data() as FirebaseEventRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getOrganizerEvents(ownerId: string): Promise<FirebaseEventRecord[]> {
  const path = 'events';
  try {
    const q = query(
      collection(db, 'events'),
      where('ownerId', '==', ownerId)
    );
    const snap = await getDocs(q);
    const list: FirebaseEventRecord[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as FirebaseEventRecord);
    });
    // Sort client-side to avoid compound index requirements
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getPublishedEvents(): Promise<FirebaseEventRecord[]> {
  const path = 'events';
  try {
    const q = query(
      collection(db, 'events'),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    const list: FirebaseEventRecord[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as FirebaseEventRecord);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// -------------------------------------------------------------
// MEDIA OPERATIONS & FIREBASE STORAGE UPLOAD
// -------------------------------------------------------------

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  onTaskCreated?: (task: any) => void;
  title?: string;
  caption?: string;
  thumbnailBlob?: Blob | null;
  width?: number;
  height?: number;
  duration?: string;
  event?: EventGallery;
}

/**
 * Direct file upload helper via backend endpoint /api/upload.
 * Used when direct Firebase Storage write fails or yields storage/unauthorized.
 */
async function uploadViaServer(
  eventId: string,
  mediaId: string,
  file: File,
  thumbnailBlob: Blob | null | undefined,
  onProgress?: (percent: number) => void
): Promise<{
  url: string;
  storagePath: string;
  thumbnailUrl: string;
  thumbnailStoragePath?: string;
}> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('eventId', eventId);
    formData.append('mediaId', mediaId);
    if (thumbnailBlob) {
      formData.append('thumbnail', thumbnailBlob, `${mediaId}_thumb.jpg`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res);
        } catch {
          reject(new Error('Invalid JSON response from server upload.'));
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          reject(new Error(res.error || `Upload failed with HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during file upload. Please verify your connection.'));
    };

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
}

export async function uploadMediaToEvent(
  eventId: string,
  file: File,
  options: UploadOptions = {}
): Promise<FirebaseMediaRecord> {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
  const mediaId = `med-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // 0. Ensure user has a valid Firebase auth state if unauthenticated
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch {
      // Anonymous auth may not be enabled in Firebase console, proceed with fallback
    }
  }

  // 1. Ensure parent event exists in Firestore if provided (e.g., initial sample events)
  if (options.event) {
    try {
      const parentRef = doc(db, 'events', eventId);
      const parentSnap = await getDoc(parentRef);
      if (!parentSnap.exists()) {
        await setDoc(parentRef, {
          title: options.event.title,
          slug: options.event.slug,
          date: options.event.date,
          time: options.event.time || '',
          location: options.event.location,
          description: options.event.description,
          coverImage: options.event.coverImage,
          status: options.event.status || 'active',
          isPasswordProtected: options.event.isPasswordProtected || false,
          pinCode: options.event.pinCode || null,
          allowGuestUploads: options.event.allowGuestUploads ?? true,
          allowOriginalDownloads: options.event.allowOriginalDownloads ?? true,
          theme: options.event.theme || 'warm-white',
          ownerId: auth.currentUser?.uid || options.event.ownerId || 'organizer',
          organizerName: options.event.organizer?.name || 'Aura Event Studio',
          organizerEmail: options.event.organizer?.contactEmail || 'studio@auragallery.app',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (parentErr) {
      console.warn('Note verifying parent event existence in Firestore:', parentErr);
    }
  }

  // Paths separating original files from generated web previews
  const originalStoragePath = `events/${eventId}/originals/${mediaId}_${cleanFileName}`;
  const thumbStoragePath = `events/${eventId}/thumbnails/${mediaId}_thumb.jpg`;

  let originalDownloadUrl = '';
  let finalOriginalStoragePath = originalStoragePath;
  let thumbnailDownloadUrl = '';
  let finalThumbnailPath: string | undefined = undefined;

  // Try direct Firebase Cloud Storage first
  try {
    const originalRef = ref(storage, originalStoragePath);
    const uploadTask = uploadBytesResumable(originalRef, file, {
      contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
      customMetadata: {
        eventId,
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    options.onTaskCreated?.(uploadTask);

    originalDownloadUrl = await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            options.onProgress?.(Math.round(progress));
          }
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });

    finalOriginalStoragePath = originalStoragePath;

    // Upload generated thumbnail preview to Storage
    if (options.thumbnailBlob) {
      try {
        const thumbRef = ref(storage, thumbStoragePath);
        const thumbUpload = await uploadBytesResumable(thumbRef, options.thumbnailBlob, {
          contentType: 'image/jpeg',
        });
        thumbnailDownloadUrl = await getDownloadURL(thumbUpload.ref);
        finalThumbnailPath = thumbStoragePath;
      } catch {
        thumbnailDownloadUrl = originalDownloadUrl;
      }
    } else {
      thumbnailDownloadUrl = originalDownloadUrl;
    }
  } catch (storageErr) {
    console.warn(
      'Firebase Cloud Storage direct upload unavailable (e.g. storage/unauthorized); falling back to trusted server storage:',
      storageErr
    );

    // Resilient fallback: Server-side upload handler
    const serverResult = await uploadViaServer(
      eventId,
      mediaId,
      file,
      options.thumbnailBlob,
      options.onProgress
    );

    originalDownloadUrl = serverResult.url;
    finalOriginalStoragePath = serverResult.storagePath;
    thumbnailDownloadUrl = serverResult.thumbnailUrl;
    finalThumbnailPath = serverResult.thumbnailStoragePath;
  }

  // Prepare metadata record (keeping binary out of Firestore)
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
  const width = options.width || (isVideo ? 1920 : 4032);
  const height = options.height || (isVideo ? 1080 : 3024);

  const mediaRecord: FirebaseMediaRecord = {
    id: mediaId,
    eventId,
    ownerId: auth.currentUser?.uid || 'guest-upload',
    url: originalDownloadUrl,
    storagePath: finalOriginalStoragePath,
    thumbnailUrl: thumbnailDownloadUrl,
    thumbnailStoragePath: finalThumbnailPath,
    type: isVideo ? 'video' : 'photo',
    title: options.title || file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
    caption: options.caption || '',
    fileSize: sizeMB,
    dimensions: `${width} x ${height}${isVideo ? ' (HD)' : ''}`,
    width,
    height,
    duration: options.duration,
    capturedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    uploadedAt: new Date().toISOString(),
    views: 0,
    downloads: 0,
  };

  // Write metadata to Firestore subcollection
  const path = `events/${eventId}/media/${mediaId}`;
  try {
    await setDoc(doc(db, 'events', eventId, 'media', mediaId), mediaRecord);
  } catch (error) {
    console.warn('Note saving media record to Firestore:', error);
  }

  // Update parent event stats
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (eventSnap.exists()) {
      const currentStats = eventSnap.data().stats || { totalMedia: 0, photosCount: 0, videosCount: 0 };
      await updateDoc(eventRef, {
        'stats.totalMedia': (currentStats.totalMedia || 0) + 1,
        'stats.photosCount': (currentStats.photosCount || 0) + (isVideo ? 0 : 1),
        'stats.videosCount': (currentStats.videosCount || 0) + (isVideo ? 1 : 0),
      });
    }
  } catch (e) {
    console.warn('Could not increment event media counter:', e);
  }

  return mediaRecord;
}

export async function getEventMediaList(
  eventId: string,
  pageSize = 24,
  lastVisibleSnapshot?: QueryDocumentSnapshot<DocumentData>
): Promise<{ items: FirebaseMediaRecord[]; lastVisible?: QueryDocumentSnapshot<DocumentData> }> {
  const path = `events/${eventId}/media`;
  try {
    let q = query(
      collection(db, 'events', eventId, 'media'),
      limit(pageSize)
    );

    if (lastVisibleSnapshot) {
      q = query(q, startAfter(lastVisibleSnapshot));
    }

    const snap = await getDocs(q);
    const items: FirebaseMediaRecord[] = [];
    snap.forEach((docSnap) => {
      items.push(docSnap.data() as FirebaseMediaRecord);
    });

    const lastVisible = snap.docs[snap.docs.length - 1];
    return { items, lastVisible };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteEventMedia(
  eventId: string, 
  mediaId: string, 
  storagePath?: string,
  thumbnailStoragePath?: string
): Promise<void> {
  const path = `events/${eventId}/media/${mediaId}`;
  try {
    // 1. Delete document from Firestore
    await deleteDoc(doc(db, 'events', eventId, 'media', mediaId)).catch((e) =>
      console.warn('Firestore doc delete note:', e)
    );

    // 2. Delete original file from Storage or Server
    if (storagePath) {
      if (storagePath.startsWith('uploads/')) {
        try {
          await fetch('/api/media', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storagePath, thumbnailStoragePath }),
          });
        } catch (e) {
          console.warn('Server media delete note:', e);
        }
      } else {
        const storageReference = ref(storage, storagePath);
        await deleteObject(storageReference).catch((e) => console.warn('Original storage deletion note:', e));
      }
    }

    // 3. Delete thumbnail preview file from Storage if not on server
    if (thumbnailStoragePath && !thumbnailStoragePath.startsWith('uploads/')) {
      const thumbRef = ref(storage, thumbnailStoragePath);
      await deleteObject(thumbRef).catch((e) => console.warn('Thumbnail storage deletion note:', e));
    }

    // 4. Decrement event totalMedia count
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (eventSnap.exists()) {
      const currentStats = eventSnap.data().stats || { totalMedia: 1, photosCount: 1, videosCount: 0 };
      await updateDoc(eventRef, {
        'stats.totalMedia': Math.max(0, (currentStats.totalMedia || 1) - 1),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateEventMediaMetadata(
  eventId: string,
  mediaId: string,
  updates: { title?: string; caption?: string }
): Promise<void> {
  const path = `events/${eventId}/media/${mediaId}`;
  try {
    await updateDoc(doc(db, 'events', eventId, 'media', mediaId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
