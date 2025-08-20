import React from 'react';

export type BadgeTone = 'neutral' | 'green' | 'red' | 'amber' | 'blue' | 'gray';

export const Badge: React.FC<{ children: React.ReactNode; tone?: BadgeTone; className?: string }> = ({ 
  children, 
  tone = 'neutral',
  className = ''
}) => {
  const toneMap = {
    neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    red: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
  
  return (
    <span className={`px-2 py-1 rounded-lg text-xs ${toneMap[tone]} ${className}`}>
      {children}
    </span>
  );
};