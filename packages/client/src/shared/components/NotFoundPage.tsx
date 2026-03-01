import { Link } from 'react-router';
import { MapPin, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="mx-auto max-w-md space-y-4 text-center">
        <MapPin className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/map"
          className="inline-flex items-center gap-2 rounded-lg bg-content2 px-4 py-2 text-sm font-medium transition-colors hover:bg-content2/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Election Map
        </Link>
      </div>
    </div>
  );
}
