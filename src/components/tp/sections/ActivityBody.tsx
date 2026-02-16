interface ActivityBodyProps {
  bodyMain: string;
  subText?: string | null;
  className?: string;
}

export function ActivityBody({ bodyMain, subText, className = "" }: ActivityBodyProps) {
  const hasSubText = typeof subText === "string" && subText.trim().length > 0;

  return (
    <div className={className}>
      <p className={hasSubText ? "mb-2" : ""}>{bodyMain}</p>
      {hasSubText && (
        <div className="flex items-start gap-2 mt-2">
          <img
            src="/val-logo.jpg"
            alt=""
            width={14}
            height={14}
            className="mt-1 flex-shrink-0"
          />
          <span>{subText!.trim()}</span>
        </div>
      )}
    </div>
  );
}
