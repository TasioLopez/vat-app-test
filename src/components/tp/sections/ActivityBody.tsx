import { shouldUseLogo } from "@/lib/tp/tp_activities";

interface ActivityBodyProps {
  activityId: string;
  bodyText: string;
  className?: string;
}

export function ActivityBody({ activityId, bodyText, className = "" }: ActivityBodyProps) {
  const useLogo = shouldUseLogo(activityId);
  
  if (!useLogo) {
    return <div className={className}>{bodyText}</div>;
  }
  
  // Split by double newlines to get paragraphs
  const paragraphs = bodyText.split('\n\n').filter(p => p.trim());
  
  return (
    <div className={className}>
      {paragraphs.map((para, idx) => {
        const trimmed = para.trim();
        
        // Check if paragraph starts with "Werknemer"
        if (trimmed.startsWith('Werknemer')) {
          return (
            <div key={idx} className="flex items-start gap-2 mt-2">
              <img 
                src="/val-logo.jpg" 
                alt="" 
                width={14} 
                height={14} 
                className="mt-1 flex-shrink-0"
              />
              <span>{trimmed}</span>
            </div>
          );
        }
        
        // Regular paragraph
        return (
          <p key={idx} className={idx > 0 ? 'mt-2' : ''}>
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

