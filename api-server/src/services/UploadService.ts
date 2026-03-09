import { supabaseServiceClient } from '../config/supabase';

const BUCKET = 'social-media';

class UploadService {
  /**
   * Upload a file buffer to Supabase Storage.
   * Returns the public URL and storage path.
   */
  async uploadFile(
    buffer: Buffer,
    mimeType: string,
    storagePath: string
  ): Promise<{ url: string; storagePath: string }> {
    if (!supabaseServiceClient) {
      throw new Error('Supabase service client not configured');
    }

    const { error } = await supabaseServiceClient.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = supabaseServiceClient.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    return {
      url: urlData.publicUrl,
      storagePath
    };
  }

  /**
   * Delete a file from Supabase Storage by its storage path.
   */
  async deleteFile(storagePath: string): Promise<void> {
    if (!supabaseServiceClient) {
      throw new Error('Supabase service client not configured');
    }

    const { error } = await supabaseServiceClient.storage
      .from(BUCKET)
      .remove([storagePath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Get the public URL for a storage path without uploading.
   */
  getPublicUrl(storagePath: string): string {
    const { data } = supabaseServiceClient.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);
    return data.publicUrl;
  }
}

export default new UploadService();
