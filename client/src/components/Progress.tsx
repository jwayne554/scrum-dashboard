
export const Progress = ({ value }: { value: number }) => (
  <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
    <div 
      className="h-2 bg-emerald-500 transition-all duration-300" 
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }} 
    />
  </div>
);