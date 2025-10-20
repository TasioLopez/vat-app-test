'use client';

import React from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  id?: string;
}

// Helper function to format bold/italic (copied from Section3)
function formatInlineText(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let currentIdx = 0;
    
    // Regex to match **bold** or *italic*
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        // Add text before match
        if (match.index > currentIdx) {
            parts.push(text.slice(currentIdx, match.index));
        }
        
        const matched = match[0];
        if (matched.startsWith('**') && matched.endsWith('**')) {
            // Bold
            parts.push(<strong key={match.index}>{matched.slice(2, -2)}</strong>);
        } else if (matched.startsWith('*') && matched.endsWith('*')) {
            // Italic
            parts.push(<em key={match.index}>{matched.slice(1, -1)}</em>);
        }
        
        currentIdx = match.index + matched.length;
    }
    
    // Add remaining text
    if (currentIdx < text.length) {
        parts.push(text.slice(currentIdx));
    }
    
    return parts.length > 0 ? parts : text;
}

// Function to render formatted text (copied from Section3)
function renderFormattedText(text: string): React.ReactNode {
    if (!text) return text;
    
    // Split by double newlines to get paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    return paragraphs.map((para, paraIdx) => {
        const lines = para.trim().split('\n');
        
        // Check if this paragraph is a list
        const isBulletList = lines.every(l => l.trim().startsWith('•'));
        const isNumberedList = lines.every(l => /^\d+\./.test(l.trim()));
        
        if (isBulletList || isNumberedList) {
            // Render as list
            const ListTag = isBulletList ? 'ul' : 'ol';
            return (
                <ListTag key={paraIdx} className="ml-4 mb-4 space-y-1">
                    {lines.map((line, idx) => {
                        const content = line.replace(/^[•\d+\.]\s*/, '');
                        return <li key={idx}>{formatInlineText(content)}</li>;
                    })}
                </ListTag>
            );
        }
        
        // Regular paragraph
        return (
            <p key={paraIdx} className={paraIdx > 0 ? "mt-4" : ""}>
                {lines.map((line, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <br/>}
                        {formatInlineText(line)}
                    </React.Fragment>
                ))}
            </p>
        );
    });
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder,
  minHeight = '300px',
  id = 'rich-textarea'
}: RichTextEditorProps) {
  
  const applyFormat = (format: string) => {
    const textarea = document.getElementById(id) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newText = value;
    let newCursorPos = end;
    
    if (selectedText) {
      let formattedText = '';
      
      switch(format) {
        case 'bold':
          formattedText = `**${selectedText}**`;
          newCursorPos = start + formattedText.length;
          break;
        case 'italic':
          formattedText = `*${selectedText}*`;
          newCursorPos = start + formattedText.length;
          break;
        default:
          return;
      }
      
      newText = value.substring(0, start) + formattedText + value.substring(end);
      onChange(newText);
      
      // Restore focus and cursor
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };
  
  const insertList = (type: 'bullet' | 'numbered') => {
    const textarea = document.getElementById(id) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const currentLineStart = value.substring(0, start).lastIndexOf('\n') + 1;
    
    const prefix = type === 'bullet' ? '• ' : '1. ';
    const newText = value.substring(0, currentLineStart) + prefix + value.substring(currentLineStart);
    
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };
  
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b px-3 py-2 flex gap-2">
        <button
          type="button"
          onClick={() => applyFormat('bold')}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-100 font-bold text-sm"
          title="Bold (select text first)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => applyFormat('italic')}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-100 italic text-sm"
          title="Italic (select text first)"
        >
          I
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => insertList('bullet')}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-100 text-sm"
          title="Bullet list"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => insertList('numbered')}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-100 text-sm"
          title="Numbered list"
        >
          1. List
        </button>
      </div>
      
      {/* Split View: Editor + Preview */}
      <div className="flex divide-x">
        {/* Left: Editor */}
        <div className="flex-1">
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-4 text-sm leading-relaxed resize-none focus:outline-none"
            style={{ minHeight }}
          />
        </div>
        
        {/* Right: Live Preview */}
        <div className="flex-1 bg-gray-50 p-4 text-sm leading-relaxed overflow-y-auto" style={{ minHeight }}>
          <div className="text-xs text-gray-500 mb-2 font-semibold">Preview:</div>
          {value ? renderFormattedText(value) : (
            <p className="text-gray-400 italic">Preview verschijnt hier...</p>
          )}
        </div>
      </div>
    </div>
  );
}

