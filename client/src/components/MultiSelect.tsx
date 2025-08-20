import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface Option {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({ 
  options, 
  selectedIds, 
  onChange, 
  placeholder = "Select...",
  className = "",
  disabled = false 
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionId: string) => {
    if (selectedIds.includes(optionId)) {
      onChange(selectedIds.filter(id => id !== optionId));
    } else {
      onChange([...selectedIds, optionId]);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedOptions = options.filter(opt => selectedIds.includes(opt.id));
  const displayText = selectedOptions.length === 0 
    ? placeholder 
    : selectedOptions.length === 1 
    ? selectedOptions[0].name
    : `${selectedOptions.length} selected`;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 text-left rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <span className="truncate pr-2">{displayText}</span>
        <div className="flex items-center gap-1">
          {selectedIds.length > 0 && !disabled && (
            <button
              onClick={clearSelection}
              className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg">
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm border-b border-neutral-200 dark:border-neutral-700"
          >
            All Team Members
          </button>
          {options.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option.id)}
              className="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                {option.avatarUrl && (
                  <img 
                    src={option.avatarUrl} 
                    alt={option.name}
                    className="w-5 h-5 rounded-full"
                  />
                )}
                <span className="truncate">{option.name}</span>
              </div>
              {selectedIds.includes(option.id) && (
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}