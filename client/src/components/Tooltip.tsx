import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  className?: string;
}

export function Tooltip({ content, className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          e.preventDefault();
          setIsVisible(!isVisible);
        }}
        className={`text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 ${className}`}
        aria-label="Help"
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      
      {isVisible && (
        <div className="absolute z-50 w-64 p-2 text-xs bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 rounded-lg shadow-lg -top-2 left-6 transform">
          <div className="relative">
            {content}
            <div className="absolute w-2 h-2 bg-neutral-900 dark:bg-neutral-100 transform rotate-45 -left-3 top-2" />
          </div>
        </div>
      )}
    </div>
  );
}