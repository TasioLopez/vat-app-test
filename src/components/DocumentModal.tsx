'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase/client';
import { X } from 'lucide-react';
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

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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
            console.error('❌ Upload failed:', uploadData.error);
            return;
        }

        const uploadedPath = uploadData.path;

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
            console.error('❌ Metadata insert failed:', metadataData.error);
            return;
        }

        onUploaded();
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
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                        onClick={onClose}
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

                    <div
                        className="border border-dashed border-gray-400 rounded p-4 text-center cursor-pointer hover:bg-gray-100"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <p className="text-sm text-gray-700">Click or drop a file here</p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.png,.jpg"
                            onChange={handleFileChange}
                        />
                    </div>

                    <button
                        onClick={handleDelete}
                        className="mt-4 text-sm text-red-600 underline hover:text-red-800"
                        disabled={!existingDoc}
                    >
                        Delete Document
                    </button>
                </div>
            </div>,
            document.body
        )
        : null;
}
