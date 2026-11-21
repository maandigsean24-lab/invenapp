import { decode } from 'base64-arraybuffer';
import { supabase, supabaseErrorMessage, supabaseRequest } from '../supabase/client';

const BUCKET = 'item-photos';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function uploadItemPhoto(userId, photo) {
  const extension = EXTENSIONS[photo.mimeType];
  if (!extension) throw new Error('Choose a JPG, PNG, or WebP image.');
  if (!photo.base64) throw new Error('The selected photo could not be read. Please choose it again.');

  const imageData = decode(photo.base64);
  if (imageData.byteLength > MAX_IMAGE_BYTES) {
    throw new Error('Choose an image smaller than 5 MB.');
  }

  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const { error } = await supabaseRequest(() => supabase.storage
    .from(BUCKET)
    .upload(path, imageData, { contentType: photo.mimeType, upsert: false }));

  if (error) throw new Error(`Unable to upload item photo: ${supabaseErrorMessage(error)}`);
  return path;
}

export async function getItemPhotoUrl(path) {
  if (!path) return null;
  const { data, error } = await supabaseRequest(() => supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60));

  if (error) throw new Error(`Unable to load item photo: ${supabaseErrorMessage(error)}`);
  return data.signedUrl;
}

export async function deleteItemPhoto(path) {
  if (!path) return;
  const { error } = await supabaseRequest(() => supabase.storage
    .from(BUCKET)
    .remove([path]));

  if (error) throw new Error(`Unable to remove the previous item photo: ${supabaseErrorMessage(error)}`);
}
