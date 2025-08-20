import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from './Badge';

interface WaitingItem {
  id: string;
  title: string;
  estimate: number;
  waitingDays: number;
  createdAt: string;
}

interface WaitingItemsListProps {
  items: WaitingItem[];
  getLinearIssueUrl: (id: string, org: string) => string;
  organizationUrlKey: string;
}

export function WaitingItemsList({ items, getLinearIssueUrl, organizationUrlKey }: WaitingItemsListProps) {
  const [showAll, setShowAll] = useState(false);
  const itemsToShow = showAll ? items : items.slice(0, 3);
  const hasMore = items.length > 3;

  return (
    <div className="space-y-1">
      {itemsToShow.map(item => (
        <div key={item.id} className="flex items-center justify-between text-xs p-1 rounded border border-neutral-200 dark:border-neutral-700">
          <a 
            href={getLinearIssueUrl(item.id, organizationUrlKey)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline truncate flex-1 mr-2"
            title={item.title}
          >
            <span className="font-medium">{item.id}</span>
            <span className="text-neutral-600 dark:text-neutral-400 ml-1">
              {item.title.length > 30 ? item.title.substring(0, 30) + '...' : item.title}
            </span>
          </a>
          <Badge tone="amber" className="whitespace-nowrap">
            {item.waitingDays}d waiting
          </Badge>
        </div>
      ))}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-1 w-full justify-center py-1"
        >
          {showAll ? (
            <><ChevronUp className="w-3 h-3" /> Show less</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Show {items.length - 3} more</>
          )}
        </button>
      )}
    </div>
  );
}