import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, Check, X, RefreshCw } from 'lucide-react';
import api from '../services/api';

interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
  profilePicture?: string | null;
}

interface ProfileEditorProps {
  user: User;
  onAvatarUpdated?: (newPath: string) => void;
}

/**
 * Helper function to return user avatar or fallback to initials-based ui-avatars.com
 */
export function getAvatarUrl(user?: { fullName?: string; profilePicture?: string | null }) {
  if (user && user.profilePicture) {
    return user.profilePicture;
  }
  const name = user?.fullName || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=150&bold=true`;
}

export default function ProfileEditor({ user, onAvatarUpdated }: ProfileEditorProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be under 2MB.');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image (.png, .jpg, .jpeg, or .webp).');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCancelPreview = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveAvatar = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('avatar', selectedFile);

      const res = await api.put('/users/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newPath = res.data.profilePicture;
      
      // Update local storage user object
      const localUserStr = localStorage.getItem('college_payment_user');
      if (localUserStr) {
        try {
          const localUser = JSON.parse(localUserStr);
          localUser.profilePicture = newPath;
          localStorage.setItem('college_payment_user', JSON.stringify(localUser));
        } catch (e) {
          console.error('Error updating localStorage user profilePicture:', e);
        }
      }

      setSuccess('Profile picture updated successfully!');
      
      // Callback to notify parent
      if (onAvatarUpdated) {
        onAvatarUpdated(newPath);
      }

      // Reset preview state
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to upload profile picture.');
    } finally {
      setUploading(false);
    }
  };

  const currentDisplayUrl = previewUrl || getAvatarUrl(user);

  return (
    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6 max-w-sm w-full mx-auto" id="profile-editor-container">
      <div className="text-center">
        <h4 className="text-base font-bold text-white">Institutional Profile Picture</h4>
        <p className="text-xs text-slate-400 mt-1">Change your portal avatar. Accepts PNG, JPG, or WEBP up to 2MB.</p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        {/* Avatar Display Frame */}
        <div className="relative group w-32 h-32 rounded-full overflow-hidden border-2 border-indigo-500/30 hover:border-indigo-500 transition-all duration-300 shadow-xl shadow-black/40">
          <img
            src={currentDisplayUrl}
            alt={user.fullName}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            id="user-avatar-image"
          />
          {/* Edit Overlay */}
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={uploading}
            className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer text-white disabled:opacity-40"
            title="Upload new photo"
          >
            <Camera size={20} className="text-indigo-400 animate-bounce" />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Change</span>
          </button>
        </div>

        {/* Hidden Input File */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/jpg, image/webp"
          className="hidden"
          id="avatar-file-input"
        />

        {/* Action Controls & Feedback */}
        {previewUrl ? (
          <div className="space-y-3 w-full" id="preview-controls">
            <p className="text-[10px] font-bold text-amber-400 text-center uppercase tracking-wider animate-pulse flex items-center justify-center gap-1">
              <span>⚠️</span> Previewing unsaved changes
            </p>
            <div className="flex gap-2 w-full justify-center">
              <button
                type="button"
                onClick={handleSaveAvatar}
                disabled={uploading}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {uploading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Save Photo
              </button>
              <button
                type="button"
                onClick={handleCancelPreview}
                disabled={uploading}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 rounded-xl px-4 py-2 transition"
            id="upload-photo-btn"
          >
            <UploadCloud size={14} />
            Upload New Photo
          </button>
        )}

        {/* Alert Notifications */}
        {error && (
          <div className="text-red-400 text-[11px] font-semibold text-center bg-red-950/20 border border-red-500/10 px-3 py-1.5 rounded-lg w-full">
            {error}
          </div>
        )}

        {success && (
          <div className="text-emerald-400 text-[11px] font-semibold text-center bg-emerald-950/20 border border-emerald-500/10 px-3 py-1.5 rounded-lg w-full">
            {success}
          </div>
        )}
      </div>
    </div>
  );
}
