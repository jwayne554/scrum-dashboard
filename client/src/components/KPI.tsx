import React from 'react';
import { Card, CardContent } from './Card';

export const KPI: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}> = ({ icon, label, value, sub }) => (
  <Card>
    <CardContent>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500">{label}</p>
          <div className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {value}
          </div>
          {sub && <div className="mt-1 text-xs text-neutral-500">{sub}</div>}
        </div>
        <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);