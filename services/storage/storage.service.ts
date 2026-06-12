import { supabaseAdmin } from "@/lib/supabase/admin";

export class StorageService {
  static async downloadFile(path: string) {
    const { data, error } = await supabaseAdmin.storage
      .from("cfsb-storage")
      .download(path);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
