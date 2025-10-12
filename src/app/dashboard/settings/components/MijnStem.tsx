"use client";

import { useState, useEffect } from "react";
import { FaUpload, FaFileAlt, FaTrash, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import { createBrowserClient } from "@supabase/ssr";

interface Document {
    id: string;
    filename: string;
    file_size: number;
    file_type: string;
    status: 'uploaded' | 'processing' | 'analyzed' | 'error';
    created_at: string;
    analyzed_at?: string;
    error_message?: string;
    writing_style?: any;
}

export default function MijnStem() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [masterStyle, setMasterStyle] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                await fetchDocuments(user.id);
                await fetchMasterStyle(user.id);
            }
            setLoading(false);
        };

        fetchUser();
    }, [supabase]);

    const fetchDocuments = async (userId: string) => {
        try {
            const response = await fetch(`/api/mijn-stem/upload?userId=${userId}`);
            const data = await response.json();
            
            if (data.success) {
                setDocuments(data.documents);
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    const fetchMasterStyle = async (userId: string) => {
        try {
            const response = await fetch(`/api/mijn-stem/style?userId=${userId}`);
            const data = await response.json();
            
            if (data.success && data.hasStyle) {
                setMasterStyle(data.masterStyle);
            }
        } catch (error) {
            console.error('Error fetching master style:', error);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !userId) return;

        setIsUploading(true);
        
        try {
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('userId', userId);

                const response = await fetch('/api/mijn-stem/upload', {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();
                
                if (data.success) {
                    // Add to local state immediately
                    const newDoc: Document = {
                        id: data.document.id,
                        filename: data.document.filename,
                        file_size: data.document.file_size,
                        file_type: data.document.file_type,
                        status: 'uploaded',
                        created_at: data.document.created_at
                    };
                    
                    setDocuments(prev => [newDoc, ...prev]);
                    
                    // Start analysis
                    analyzeDocument(data.document.id);
                } else {
                    console.error('Upload failed:', data.error);
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const analyzeDocument = async (documentId: string) => {
        try {
            // Update status to processing
            setDocuments(prev => 
                prev.map(doc => 
                    doc.id === documentId 
                        ? { ...doc, status: 'processing' }
                        : doc
                )
            );

            const response = await fetch('/api/mijn-stem/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ documentId }),
            });

            const data = await response.json();
            
            if (data.success) {
                // Update document status and refresh list
                await fetchDocuments(userId!);
                await fetchMasterStyle(userId!);
            } else {
                // Update status to error
                setDocuments(prev => 
                    prev.map(doc => 
                        doc.id === documentId 
                            ? { ...doc, status: 'error', error_message: data.error }
                            : doc
                    )
                );
            }
        } catch (error) {
            console.error('Analysis error:', error);
            setDocuments(prev => 
                prev.map(doc => 
                    doc.id === documentId 
                        ? { ...doc, status: 'error', error_message: 'Analysis failed' }
                        : doc
                )
            );
        }
    };

    const removeFile = async (documentId: string) => {
        if (!userId) return;

        try {
            const response = await fetch(`/api/mijn-stem/delete?documentId=${documentId}&userId=${userId}`, {
                method: 'DELETE',
            });

            const data = await response.json();
            
            if (data.success) {
                setDocuments(prev => prev.filter(doc => doc.id !== documentId));
                await fetchMasterStyle(userId);
            } else {
                console.error('Delete failed:', data.error);
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
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
                return <FaExclamationTriangle className="text-red-500" />;
            default:
                return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />;
        }
    };

    const getStatusText = (status: string, errorMessage?: string) => {
        switch (status) {
            case 'uploaded':
                return 'Geüpload';
            case 'processing':
                return 'Wordt geanalyseerd...';
            case 'analyzed':
                return 'Geanalyseerd';
            case 'error':
                return errorMessage || 'Fout bij analyseren';
            default:
                return '';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">Laden...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Mijn Stem</h2>
                <p className="text-gray-600">
                    Upload uw eerdere TP documenten zodat de AI uw schrijfstijl kan leren en deze kan repliceren bij het schrijven van nieuwe rapporten.
                </p>
            </div>

            {/* Master Style Summary */}
            {masterStyle && (
                <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-lg font-medium text-green-900 mb-3">Uw Schrijfstijl Profiel</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-medium text-green-800">Tonaliteit:</span>
                            <span className="ml-2 text-green-700">{masterStyle.tone}</span>
                        </div>
                        <div>
                            <span className="font-medium text-green-800">Structuur:</span>
                            <span className="ml-2 text-green-700">{masterStyle.structure}</span>
                        </div>
                        <div>
                            <span className="font-medium text-green-800">Formaliteit:</span>
                            <span className="ml-2 text-green-700">{masterStyle.formality}</span>
                        </div>
                        <div>
                            <span className="font-medium text-green-800">Documenten geanalyseerd:</span>
                            <span className="ml-2 text-green-700">{masterStyle.combined_from}</span>
                        </div>
                    </div>
                    <p className="text-green-800 mt-3 text-sm">
                        ✅ De AI kan nu uw schrijfstijl repliceren in nieuwe TP rapporten.
                    </p>
                </div>
            )}

            {/* Upload Section */}
            <div className="mb-8">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                    <FaUpload className="mx-auto text-gray-400 text-4xl mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Upload uw TP documenten
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Ondersteunde formaten: PDF, TXT (DOC/DOCX binnenkort beschikbaar)
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                        Upload eerdere TP rapporten die u heeft geschreven om uw schrijfstijl te leren.
                    </p>
                    <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                        <FaUpload className="mr-2" />
                        {isUploading ? 'Uploaden...' : 'Bestanden selecteren'}
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.txt"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={isUploading}
                        />
                    </label>
                </div>
            </div>

            {/* Uploaded Files List */}
            {documents.length > 0 && (
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Geüploade documenten</h3>
                    <div className="space-y-3">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                            >
                                <div className="flex items-center space-x-3">
                                    <FaFileAlt className="text-gray-400 text-xl" />
                                    <div>
                                        <p className="font-medium text-gray-900">{doc.filename}</p>
                                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                                            <span>{formatFileSize(doc.file_size)}</span>
                                            <span>•</span>
                                            <span>{new Date(doc.created_at).toLocaleDateString('nl-NL')}</span>
                                            <span>•</span>
                                            <div className="flex items-center space-x-1">
                                                {getStatusIcon(doc.status)}
                                                <span>{getStatusText(doc.status, doc.error_message)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(doc.id)}
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
            {documents.filter(d => d.status === 'analyzed').length > 0 && (
                <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Analyse Status</h3>
                    <p className="text-blue-800">
                        De AI heeft {documents.filter(d => d.status === 'analyzed').length} document(en) geanalyseerd 
                        en kan nu uw schrijfstijl repliceren in nieuwe TP rapporten.
                    </p>
                </div>
            )}

            {/* Instructions */}
            <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Hoe werkt dit?</h3>
                <ul className="text-gray-600 space-y-2">
                    <li>• Upload TP documenten die u eerder heeft geschreven</li>
                    <li>• De AI analyseert uw taalgebruik, structuur, toon en schrijfstijl</li>
                    <li>• Bij het autofillen van nieuwe TP rapporten wordt uw stijl automatisch gerepliceerd</li>
                    <li>• Hoe meer documenten u upload, hoe beter de AI uw stijl kan nabootsen</li>
                    <li>• U kunt documenten verwijderen als ze niet meer relevant zijn</li>
                </ul>
            </div>
        </div>
    );
}
