// import { supabase } from "../../lib/supabase.js";

import supabase from "../../core/supabase.js";

class FileModelSupabase {
  constructor(bucketName = "IMMACULEARN") {
    this.supabase = supabase;
    this.bucket = bucketName;
  }

  // Upload file
  async uploadFile(fileBuffer, destinationPath, mimetype) {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(destinationPath, fileBuffer, {
        contentType: mimetype,
        upsert: false,
      });

    if (error) throw error;

    return data.path;
  }

  // Get public URL (if bucket is public)
  getPublicUrl(filePath) {
    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  // Delete file
  async deleteFile(filePath) {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([filePath]);

    if (error) throw error;

    return true;
  }

  async listFiles(prefix = "RESOURCES") {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .list(prefix);

    if (error) throw error;

    // Filter out the placeholder
    const files = data.filter(
      (file) => file.name !== ".emptyFolderPlaceholder",
    );

    // Add public URLs
    return files.map((file) => {
      const { data: urlData } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(`${prefix}/${file.name}`);

      return {
        ...file,
        url: urlData.publicUrl,
      };
    });
  }

  async deleteFileByName(fileName, folder = "RESOURCES") {
    const filePath = `${folder}/${fileName}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([filePath]);

    if (error) throw error;

    return true;
  }
}

export default FileModelSupabase;
