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
  
  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerHTML;
    // Convert HTML back to markdown for storage
    const markdown = htmlToMarkdown(content);
    onChange(markdown);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Enter key for proper paragraph breaks
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertHTML', false, '<br><br>');
    }
  };

  const htmlToMarkdown = (html: string): string => {
    return html
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<p><\/p>/g, '\n\n')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<ul>(.*?)<\/ul>/gs, (match, content) => {
        return content.replace(/<li>(.*?)<\/li>/g, '• $1\n') + '\n';
      })
      .replace(/<ol>(.*?)<\/ol>/gs, (match, content) => {
        let counter = 1;
        return content.replace(/<li>(.*?)<\/li>/g, () => `${counter++}. $1\n`) + '\n';
      })
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .replace(/\n{3,}/g, '\n\n') // Clean up excessive newlines
      .trim();
  };

  const markdownToHtml = (markdown: string): string => {
    if (!markdown) return '';
    
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n+/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      .replace(/• (.*?)(?=\n|$)/g, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\d+\. (.*?)(?=\n|$)/g, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>')
      .replace(/\n/g, '<br>');
  };

  // Use a ref to avoid cursor jumping
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize content only once
  React.useEffect(() => {
    if (editorRef.current && !isInitialized && value) {
      editorRef.current.innerHTML = markdownToHtml(value);
      setIsInitialized(true);
    }
  }, [value, isInitialized]);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b px-3 py-2 flex gap-2">
        <button
          type="button"
          onClick={() => document.execCommand('bold')}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-100 font-bold text-sm"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => document.execCommand('italic')}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-100 italic text-sm"
          title="Italic"
        >
          I
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => document.execCommand('insertUnorderedList')}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-100 text-sm"
          title="Bullet list"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => document.execCommand('insertOrderedList')}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-100 text-sm"
          title="Numbered list"
        >
          1. List
        </button>
      </div>
      
      {/* WYSIWYG Editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          onKeyDown={handleKeyDown}
          className="w-full p-4 text-sm leading-relaxed focus:outline-none"
          style={{ minHeight }}
        />
        {!value && placeholder && (
          <div className="absolute top-4 left-4 text-gray-400 pointer-events-none text-sm">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

