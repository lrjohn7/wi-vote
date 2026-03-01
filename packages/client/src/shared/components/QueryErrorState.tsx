import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { isApiError, isNetworkError as checkNetworkError } from '@/shared/lib/errors';

interface QueryErrorStateProps {
  error: Error;
  onRetry?: () => void;
  compact?: boolean;
}

export function QueryErrorState({ error, onRetry, compact }: QueryErrorStateProps) {
  const isNetworkError = checkNetworkError(error);

  const is404 = isApiError(error) ? error.isNotFound : error.message.includes('404');

  const Icon = isNetworkError ? WifiOff : AlertTriangle;

  const title = isNetworkError
    ? 'Connection Error'
    : is404
      ? 'Data Not Found'
      : 'Failed to Load Data';

  const description = isNetworkError
    ? 'Unable to reach the server. Check your connection and try again.'
    : is404
      ? 'The requested data could not be found.'
      : (error as Error).message;

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
        <Icon className="h-4 w-4 shrink-0 text-destructive" />
        <span className="min-w-0 truncate text-destructive">{title}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto shrink-0 text-xs font-medium text-destructive underline-offset-2 hover:underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/60" />
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg bg-content2 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-content2/80"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
