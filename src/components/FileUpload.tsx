import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onUploadComplete: (filePath: string, fileUrl: string) => void;
  onError: (error: string) => void;
  acceptedFileTypes?: string;
  maxSizeMB?: number;
  bucketName?: string;
  label: string;
  required?: boolean;
  storagePath?: string;
  existingFileUrl?: string;
}

export function FileUpload({
  onUploadComplete,
  onError,
  acceptedFileTypes = "application/pdf,image/jpeg,image/png",
  maxSizeMB = 5,
  bucketName = 'documents',
  label,
  required = false,
  storagePath = 'blood-group-documents',
  existingFileUrl,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(existingFileUrl || null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!acceptedFileTypes.includes(file.type)) {
      setUploadError(`Invalid file type. Accepted types: ${acceptedFileTypes.replace(/,/g, ', ')}`);
      onError(`Invalid file type. Accepted types: ${acceptedFileTypes.replace(/,/g, ', ')}`);
      return;
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadError(`File size too large. Maximum size: ${maxSizeMB}MB`);
      onError(`File size too large. Maximum size: ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setFileName(file.name);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Create a unique file name to avoid collisions
      const fileExt = file.name.split('.').pop();
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${storagePath}/${uniqueFileName}`;

      // Upload the file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get the public URL for the file
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      
      setFileUrl(publicUrl);
      setUploadSuccess(true);
      onUploadComplete(filePath, publicUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError('Failed to upload file. Please try again.');
      onError('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  const handleRemoveFile = async () => {
    if (!fileUrl) return;

    try {
      // Extract the path from the URL
      const urlParts = fileUrl.split('/');
      const pathParts = urlParts.slice(urlParts.indexOf(bucketName) + 1);
      const filePath = pathParts.join('/');

      // Delete the file from Supabase Storage
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) throw error;

      setFileUrl(null);
      setFileName(null);
      setUploadSuccess(false);
      onUploadComplete('', '');
    } catch (error) {
      console.error('Error removing file:', error);
      setUploadError('Failed to remove file. Please try again.');
      onError('Failed to remove file. Please try again.');
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {!fileUrl ? (
        <div className={`border-2 border-dashed rounded-lg p-6 
          ${isUploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-red-500'}
          transition-colors duration-200 text-center cursor-pointer`}
        >
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            accept={acceptedFileTypes}
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
            <Upload className="h-8 w-8 text-gray-500 mb-2" />
            <span className="text-sm text-gray-600">
              {isUploading
                ? `Uploading ${fileName}... ${uploadProgress}%`
                : `Click to upload a ${label.toLowerCase()} (max ${maxSizeMB}MB)`}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              {acceptedFileTypes.split(',').map(type => type.split('/')[1]).join(', ')} files
            </span>
          </label>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm font-medium text-gray-700 truncate max-w-xs">
                {fileName || 'File uploaded successfully'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="text-gray-500 hover:text-red-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-red-500 hover:text-red-600 underline"
            >
              View uploaded file
            </a>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="mt-2 flex items-center text-red-500">
          <AlertCircle className="h-4 w-4 mr-1" />
          <span className="text-sm">{uploadError}</span>
        </div>
      )}
    </div>
  );
} 