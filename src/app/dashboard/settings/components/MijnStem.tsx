"use client";

import { useState } from "react";
import { FaUpload, FaFileAlt, FaTrash, FaCheck } from "react-icons/fa";

export default function MijnStem() {
    const [uploadedFiles, setUploadedFiles] = useState<Array<{
        id: string;
        name: string;
        size: number;
        uploadedAt: Date;
        status: 'processing' | 'analyzed' | 'error';
    }>>([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        
        // Simulate file upload and analysis
        for (const file of Array.from(files)) {
            const newFile = {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                size: file.size,
                uploadedAt: new Date(),
                status: 'processing' as const
            };
            
            setUploadedFiles(prev => [...prev, newFile]);
            
            // Simulate processing delay
            setTimeout(() => {
                setUploadedFiles(prev => 
                    prev.map(f => 
                        f.id === newFile.id 
                            ? { ...f, status: 'analyzed' as const }
                            : f
                    )
                );
            }, 2000);
        }
        
        setIsUploading(false);
    };

    const removeFile = (fileId: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'processing':
                return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
            case 'analyzed':
                return <FaCheck className="text-green-500" />;
            case 'error':
                return <div className="w-4 h-4 bg-red-500 rounded-full" />;
            default:
                return null;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'processing':
                return 'Wordt geanalyseerd...';
            case 'analyzed':
                return 'Geanalyseerd';
            case 'error':
                return 'Fout bij analyseren';
            default:
                return '';
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Mijn Stem</h2>
                <p className="text-gray-600">
                    Upload uw eerdere documenten zodat de AI uw schrijfstijl kan leren en deze kan repliceren bij het schrijven van rapporten.
                </p>
            </div>

            {/* Upload Section */}
            <div className="mb-8">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                    <FaUpload className="mx-auto text-gray-400 text-4xl mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Upload uw documenten
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Ondersteunde formaten: PDF, DOC, DOCX, TXT
                    </p>
                    <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                        <FaUpload className="mr-2" />
                        {isUploading ? 'Uploaden...' : 'Bestanden selecteren'}
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={isUploading}
                        />
                    </label>
                </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Geüploade documenten</h3>
                    <div className="space-y-3">
                        {uploadedFiles.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                            >
                                <div className="flex items-center space-x-3">
                                    <FaFileAlt className="text-gray-400 text-xl" />
                                    <div>
                                        <p className="font-medium text-gray-900">{file.name}</p>
                                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                                            <span>{formatFileSize(file.size)}</span>
                                            <span>•</span>
                                            <span>{file.uploadedAt.toLocaleDateString('nl-NL')}</span>
                                            <span>•</span>
                                            <div className="flex items-center space-x-1">
                                                {getStatusIcon(file.status)}
                                                <span>{getStatusText(file.status)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(file.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Verwijder bestand"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Analysis Summary */}
            {uploadedFiles.filter(f => f.status === 'analyzed').length > 0 && (
                <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Analyse Status</h3>
                    <p className="text-blue-800">
                        De AI heeft {uploadedFiles.filter(f => f.status === 'analyzed').length} document(en) geanalyseerd 
                        en kan nu uw schrijfstijl repliceren in nieuwe rapporten.
                    </p>
                </div>
            )}

            {/* Instructions */}
            <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Hoe werkt dit?</h3>
                <ul className="text-gray-600 space-y-2">
                    <li>• Upload documenten die representatief zijn voor uw schrijfstijl</li>
                    <li>• De AI analyseert uw taalgebruik, structuur en toon</li>
                    <li>• Bij het genereren van nieuwe rapporten wordt uw stijl gerepliceerd</li>
                    <li>• U kunt documenten verwijderen als ze niet meer relevant zijn</li>
                </ul>
            </div>
        </div>
    );
}
