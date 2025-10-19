'use client';

import RichTextEditor from './RichTextEditor';

interface SectionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onAutofill?: () => void;
  onRewrite?: () => void;
  isAutofilling?: boolean;
  isRewriting?: boolean;
  placeholder?: string;
  extraFields?: Array<{
    label: string;
    value: string;
    onChange: (value: string) => void;
  }>;
}

export default function SectionEditorModal({
  isOpen,
  onClose,
  title,
  value,
  onChange,
  onAutofill,
  onRewrite,
  isAutofilling,
  isRewriting,
  placeholder,
  extraFields
}: SectionEditorModalProps) {
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-2xl w-[90vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-50 border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        {/* Actions */}
        <div className="border-b px-6 py-3 bg-white flex gap-3">
          {onAutofill && (
            <button
              onClick={onAutofill}
              disabled={isAutofilling}
              className={`px-4 py-2 rounded text-sm font-medium transition ${
                isAutofilling 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isAutofilling ? '⏳ Aan het verwerken...' : 'Automatisch invullen met AI'}
            </button>
          )}
          {onRewrite && value && value.trim().length > 0 && (
            <button
              onClick={onRewrite}
              disabled={isRewriting}
              className={`px-4 py-2 rounded text-sm font-medium transition ${
                isRewriting 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isRewriting ? '⏳ Herschrijven...' : 'Mijn Stijl'}
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <RichTextEditor
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            minHeight="400px"
            id={`editor-${title.replace(/\s+/g, '-').toLowerCase()}`}
          />
          
          {/* Extra fields (for sections with multiple fields like Sociale + Visie) */}
          {extraFields && extraFields.map((field, idx) => (
            <div key={idx} className="mt-4">
              <label className="block text-sm font-semibold mb-2">{field.label}</label>
              <RichTextEditor
                value={field.value}
                onChange={field.onChange}
                minHeight="200px"
                id={`editor-${title.replace(/\s+/g, '-').toLowerCase()}-${idx}`}
              />
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-medium"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}

