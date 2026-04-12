
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";

interface ProfilePhotoProps {
  url: string | null;
  onUpload: (url: string) => void;
}

export function ProfilePhoto({ url, onUpload }: ProfilePhotoProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      
      // Validation
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        throw new Error("Format file harus JPEG atau PNG.");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran file maksimal 5MB.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await (supabase
        .from('drivers') as any)
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      onUpload(publicUrl);
      toast.success("Foto profil berhasil diperbarui");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <Avatar className="w-32 h-32 border-4 border-emerald-100 shadow-lg">
          <AvatarImage src={url || ""} />
          <AvatarFallback className="bg-emerald-50 text-emerald-600">
            <User size={48} />
          </AvatarFallback>
        </Avatar>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2.5 rounded-full shadow-lg hover:bg-emerald-700 transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-white"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Camera className="w-5 h-5" />
          )}
        </button>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/png, image/jpeg"
        className="hidden"
      />
      
      <p className="text-xs text-slate-400 font-medium">
        JPG atau PNG, Maksimal 5MB
      </p>
    </div>
  );
}
