"use client";

import { useState, useEffect } from "react";
import { FaUpload, FaFileAlt, FaTrash, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import { createBrowserClient } from "@supabase/ssr";
import { Card } from '@/components/ui/card';

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
    const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
    const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);

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

    const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };


    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !userId) return;

        setIsUploading(true);
        showMessage('info', `${files.length} bestand(en) worden geüpload...`);
        
        try {
            let successCount = 0;
            let errorCount = 0;

            for (const file of Array.from(files)) {
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('userId', userId);

                    // Set upload progress
                    setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

                    console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);

                    const response = await fetch('/api/mijn-stem/upload', {
                        method: 'POST',
                        body: formData,
                    });

                    console.log('Upload response status:', response.status);

                    const data = await response.json();
                    console.log('Upload response data:', data);
                    
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
                        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
                        
                        // Start analysis
                        analyzeDocument(data.document.id);
                        successCount++;
                    } else {
                        console.error('Upload failed:', data.error, data);
                        errorCount++;
                        
                        const errorMsg = data.details || data.error || 'Onbekende fout';
                        showMessage('error', `Upload mislukt: ${errorMsg}`);
                        console.error('Full error details:', data);
                    }
                } catch (fileError) {
                    console.error('File upload error:', fileError);
                    errorCount++;
                    showMessage('error', `Upload mislukt voor ${file.name}`);
                }
            }

            // Show summary message
            if (successCount > 0) {
                showMessage('success', `${successCount} bestand(en) succesvol geüpload en worden geanalyseerd!`);
            }
            if (errorCount > 0) {
                // Don't overwrite specific error messages with generic summary
                if (errorCount === 1) {
                    // Keep the specific error message already shown
                    console.log('Upload failed for 1 file, keeping specific error message');
                } else {
                    showMessage('error', `${errorCount} bestand(en) konden niet worden geüpload.`);
                }
            }

        } catch (error) {
            console.error('Upload error:', error);
            showMessage('error', 'Er is een fout opgetreden tijdens het uploaden.');
        } finally {
            setIsUploading(false);
            setUploadProgress({});
            // Clear file input
            event.target.value = '';
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
                showMessage('success', 'Document geanalyseerd! Schrijfstijl is bijgewerkt.');
            } else {
                // Update status to error
                setDocuments(prev => 
                    prev.map(doc => 
                        doc.id === documentId 
                            ? { ...doc, status: 'error', error_message: data.error }
                            : doc
                    )
                );
                showMessage('error', `Analyse mislukt: ${data.error}`);
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
            showMessage('error', 'Er is een fout opgetreden tijdens de analyse.');
        }
    };

    const removeFile = async (documentId: string, filename: string) => {
        if (!userId) return;

        if (!confirm(`Weet u zeker dat u "${filename}" wilt verwijderen?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/mijn-stem/delete?documentId=${documentId}&userId=${userId}`, {
                method: 'DELETE',
            });

            const data = await response.json();
            
            if (data.success) {
                setDocuments(prev => prev.filter(doc => doc.id !== documentId));
                await fetchMasterStyle(userId);
                showMessage('success', `"${filename}" succesvol verwijderd.`);
            } else {
                console.error('Delete failed:', data.error);
                showMessage('error', `Verwijderen mislukt: ${data.error}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            showMessage('error', 'Er is een fout opgetreden tijdens het verwijderen.');
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
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Mijn Stem</h2>
                <p className="text-lg text-gray-600">
                    Upload uw eerdere TP documenten zodat de AI uw schrijfstijl kan leren en deze kan repliceren bij het schrijven van nieuwe rapporten.
                </p>
            </div>

            {/* Message Feedback */}
            {message && (
                <div className={`p-4 rounded-xl border-2 shadow-md ${
                    message.type === 'success' 
                        ? 'bg-green-50 text-green-800 border-green-300' 
                        : message.type === 'error'
                        ? 'bg-red-50 text-red-800 border-red-300'
                        : 'bg-blue-50 text-blue-800 border-blue-300'
                }`}>
                    {message.text}
                </div>
            )}


            {/* Master Style Summary */}
            {masterStyle && (
                <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100/50 border-green-300">
                    <h3 className="text-xl font-bold text-green-900 mb-4">Uw Schrijfstijl Profiel</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                            <span className="font-semibold text-green-800">Tonaliteit:</span>
                            <span className="ml-2 text-green-700">{masterStyle.tone}</span>
                        </div>
                        <div>
                            <span className="font-semibold text-green-800">Structuur:</span>
                            <span className="ml-2 text-green-700">{masterStyle.structure}</span>
                        </div>
                        <div>
                            <span className="font-semibold text-green-800">Formaliteit:</span>
                            <span className="ml-2 text-green-700">{masterStyle.formality}</span>
                        </div>
                        <div>
                            <span className="font-semibold text-green-800">Documenten geanalyseerd:</span>
                            <span className="ml-2 text-green-700">{masterStyle.combined_from}</span>
                        </div>
                    </div>
                    <p className="text-green-800 mt-4 font-medium">
                        ✅ De AI kan nu uw schrijfstijl repliceren in nieuwe TP rapporten.
                    </p>
                </Card>
            )}

            {/* Upload Section */}
            <Card className="p-8">
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    isUploading 
                        ? 'border-purple-500 bg-purple-50/50' 
                        : 'border-purple-300 hover:border-purple-400 hover:bg-purple-50/30'
                }`}>
                    <FaUpload className={`mx-auto text-5xl mb-4 ${
                        isUploading ? 'text-purple-600' : 'text-purple-400'
                    }`} />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {isUploading ? 'Uploaden...' : 'Upload uw TP documenten'}
                    </h3>
                    <p className="text-gray-600 mb-2">
                        Ondersteunde formaten: PDF, TXT (DOC/DOCX binnenkort beschikbaar)
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        Upload eerdere TP rapporten die u heeft geschreven om uw schrijfstijl te leren.
                    </p>
                    
                    {/* Upload Progress */}
                    {Object.keys(uploadProgress).length > 0 && (
                        <div className="mb-6 space-y-3">
                            {Object.entries(uploadProgress).map(([filename, progress]) => (
                                <div key={filename} className="text-sm">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-900 font-medium truncate">{filename}</span>
                                        <span className="text-purple-600 font-semibold">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div 
                                            className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <label className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold">
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
            </Card>

            {/* Uploaded Files List */}
            <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Geüploade documenten ({documents.length})
                </h3>
                
                {documents.length === 0 ? (
                    <Card className="p-12 text-center">
                        <FaFileAlt className="mx-auto text-gray-400 text-5xl mb-4" />
                        <p className="text-gray-600 mb-2 font-medium">Nog geen documenten geüpload</p>
                        <p className="text-sm text-gray-500">
                            Upload uw eerste TP documenten om uw schrijfstijl te leren
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {documents.map((doc) => (
                            <Card
                                key={doc.id}
                                className="p-5 hover:shadow-lg transition-all duration-200"
                                hover
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                                            <FaFileAlt className="text-purple-600 text-xl" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{doc.filename}</p>
                                            <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                                                <span>{formatFileSize(doc.file_size)}</span>
                                                <span>•</span>
                                                <span>{new Date(doc.created_at).toLocaleDateString('nl-NL')}</span>
                                                <span>•</span>
                                                <div className="flex items-center space-x-2">
                                                    {getStatusIcon(doc.status)}
                                                    <span className="font-medium">{getStatusText(doc.status, doc.error_message)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFile(doc.id, doc.filename)}
                                        className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                        title="Verwijder bestand"
                                    >
                                        <FaTrash className="text-lg" />
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Analysis Summary */}
            {documents.filter(d => d.status === 'analyzed').length > 0 && (
                <div className="mt-8 p-6 bg-info-50 border border-info-500 rounded-lg">
                    <h3 className="text-lg font-medium text-info-900 mb-2">Analyse Status</h3>
                    <p className="text-info-800">
                        De AI heeft {documents.filter(d => d.status === 'analyzed').length} document(en) geanalyseerd 
                        en kan nu uw schrijfstijl repliceren in nieuwe TP rapporten.
                    </p>
                </div>
            )}

            {/* Instructions */}
            <div className="mt-8 p-6 bg-muted/30 border border-border rounded-lg">
                <h3 className="text-lg font-medium text-foreground mb-2">Hoe werkt dit?</h3>
                <ul className="text-muted-foreground space-y-2">
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
