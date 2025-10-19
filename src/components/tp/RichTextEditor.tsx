'use client';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  id?: string;
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
      
      {/* Text Area */}
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-4 text-sm leading-relaxed resize-none focus:outline-none"
        style={{ minHeight }}
      />
    </div>
  );
}

