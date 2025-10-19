'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase/client';
import { X, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { Database } from '@/types/supabase';

type Document = Database['public']['Tables']['documents']['Row'];

type Props = {
    type: string;
    employeeId: string;
    existingDoc: Document | null;
    onClose: () => void;
    onUploaded: () => void;
    onDeleted: () => void;
};

export default function DocumentModal({
    type,
    employeeId,
    existingDoc,
    onClose,
    onUploaded,
    onDeleted,
}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const processFile = async (file: File) => {
        if (!file) return;

        setUploading(true);
        setError(null);
        setSuccess(false);
        setStatus('Preparing upload...');

        try {
            // If an existing document exists, delete it first
            if (existingDoc) {
                setStatus('Deleting existing document...');
                const deleteRes = await fetch('/api/documents/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: existingDoc.id,
                        url: existingDoc.url,
                    }),
                });

                const deleteResult = await deleteRes.json();

                if (!deleteRes.ok || !deleteResult.success) {
                    throw new Error(`Failed to delete existing document: ${deleteResult.error}`);
                }
            }

            setStatus('Uploading file...');
            const safeName = file.name.replace(/\s+/g, '-');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('employee_id', employeeId);
            formData.append('type', type);
            formData.append('name', file.name);

            // Step 1: Upload file to Supabase Storage
            const uploadRes = await fetch('/api/documents/upload', {
                method: 'POST',
                body: formData,
            });

            const uploadData = await uploadRes.json();

            if (!uploadRes.ok || !uploadData.success) {
                throw new Error(`Upload failed: ${uploadData.error}`);
            }

            const uploadedPath = uploadData.path;

            setStatus('Saving document information...');

            // Step 2: Save metadata in Supabase `documents` table
            const metadataRes = await fetch('/api/documents/metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: employeeId,
                    type,
                    name: file.name,
                    url: uploadedPath,
                }),
            });

            const metadataData = await metadataRes.json();

            if (!metadataRes.ok) {
                throw new Error(`Failed to save document information: ${metadataData.error}`);
            }

            setStatus('Upload completed successfully!');
            setSuccess(true);
            
            // Show success message briefly, then close and refresh
            setTimeout(() => {
                onUploaded();
                onClose();
            }, 1500);

        } catch (err: any) {
            console.error('❌ Upload failed:', err);
            setError(err.message || 'Upload failed. Please try again.');
            setStatus(null);
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await processFile(file);
        }
    };

    // Drag and drop handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDelete = async () => {
        if (!existingDoc?.url || !existingDoc.id) return;

        const res = await fetch('/api/documents/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: existingDoc.id,
                url: existingDoc.url,
            }),
        });

        const result = await res.json();

        if (!res.ok || !result.success) {
            console.error('Failed to delete document:', result.error);
            return;
        }

        onDeleted();
    };


    const getDownloadUrl = () => {
        if (!existingDoc?.url) return null;
        const { data } = supabase.storage.from('documents').getPublicUrl(existingDoc.url);
        return data.publicUrl;
    };

    return typeof window !== 'undefined'
        ? createPortal(
            <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative z-50"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={onClose}
                        disabled={uploading}
                        aria-label="Close"
                    >
                        <X />
                    </button>

                    <h2 className="text-lg font-bold mb-4">{type.toUpperCase()}</h2>

                    {existingDoc ? (
                        <div className="mb-4">
                            <p className="text-sm mb-1 text-gray-700">Current file:</p>
                            <a
                                href={getDownloadUrl() || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 underline break-all"
                            >
                                {existingDoc.name}
                            </a>
                        </div>
                    ) : (
                        <p className="mb-4 text-sm text-gray-600">No file uploaded yet.</p>
                    )}

                    {/* Status Messages */}
                    {status && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600 mr-2" />
                                <p className="text-sm text-blue-800">{status}</p>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                            <div className="flex items-center">
                                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                                <p className="text-sm text-green-800">Upload completed successfully!</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex items-center">
                                <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        </div>
                    )}

                    <div
                        className={`border border-dashed rounded p-6 text-center transition-colors ${
                            dragActive 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-400 hover:bg-gray-50'
                        } ${uploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        {uploading ? (
                            <div className="flex flex-col items-center">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                                <p className="text-sm text-gray-600">Uploading...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-700 mb-1">
                                    {dragActive ? 'Drop file here' : 'Click or drop a file here'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Supports: PDF, DOC, DOCX, PNG, JPG
                                </p>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.png,.jpg"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                    </div>

                    <button
                        onClick={handleDelete}
                        className="mt-4 text-sm text-red-600 underline hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!existingDoc || uploading}
                    >
                        Delete Document
                    </button>
                </div>
            </div>,
            document.body
        )
        : null;
}
