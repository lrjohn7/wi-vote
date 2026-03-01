import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface WardSearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function WardSearchBox({
  onSearch,
  placeholder = 'Search wards by name, municipality, or county...',
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
    <div className="relative" role="search" aria-label="Ward search">
      <label htmlFor="ward-search-input" className="sr-only">Search wards</label>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        id="ward-search-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label="Search wards"
        type="search"
        autoComplete="off"
      />
    </div>
  );
}
