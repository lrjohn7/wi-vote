import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface WardSearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  'aria-activedescendant'?: string;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}

export function WardSearchBox({
  onSearch,
  placeholder = 'Search wards by name, municipality, or county...',
  onKeyDown,
  ...ariaProps
}: WardSearchBoxProps) {
  const [value, setValue] = useState('');

  // Debounce search by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <div className="relative">
      <label htmlFor="ward-search-input" className="sr-only">Search wards by name</label>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="ward-search-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        role="combobox"
        autoComplete="off"
        onKeyDown={onKeyDown}
        aria-activedescendant={ariaProps['aria-activedescendant']}
        aria-expanded={ariaProps['aria-expanded']}
        aria-controls={ariaProps['aria-controls']}
      />
    </div>
  );
}
