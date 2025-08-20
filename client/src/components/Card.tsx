import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = "" 
}) => (
  <div className={`bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 ${className}`}>
    {children}
  </div>
);

export const CardHeader: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, subtitle, icon, action }) => (
  <div className="flex items-start justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
    <div className="flex items-center gap-3">
      {icon && <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800">{icon}</div>}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
        {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = "" 
}) => (
  <div className={`p-4 ${className}`}>{children}</div>
);