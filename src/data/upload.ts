import { isSupabaseConfigured, PARCEL_DOCUMENTS_BUCKET, supabase } from '../lib/supabaseClient';
import type { StageId } from '../domain';

export type UploadedFile = {
  url: string;
  fileType: 'pdf' | 'image';
};

function detectFileType(file: File): 'pdf' | 'image' {
  if (file.type === 'application/pdf') {
    return 'pdf';
  }
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  throw new Error('Only PDF or image files can be uploaded.');
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

/**
 * Uploads a document file for a parcel/stage and returns the URL to store on
 * the document record. Uses Supabase Storage when configured; otherwise
 * falls back to an in-memory object URL so demo mode keeps working without a
 * backend (the URL only survives for the current browser session).
 */
export async function uploadDocumentFile(
  parcelId: string,
  stage: StageId,
  file: File,
): Promise<UploadedFile> {
  const fileType = detectFileType(file);

  if (isSupabaseConfigured && supabase) {
    const path = `${parcelId}/${stage}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error } = await supabase.storage.from(PARCEL_DOCUMENTS_BUCKET).upload(path, file, {
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from(PARCEL_DOCUMENTS_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, fileType };
  }

  return { url: URL.createObjectURL(file), fileType };
}
