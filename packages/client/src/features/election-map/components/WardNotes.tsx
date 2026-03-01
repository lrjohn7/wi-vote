import { useState, memo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WardNote {
  id: number;
  ward_id: string;
  author_name: string;
  content: string;
  category: string | null;
  created_at: string;
}

interface NoteListResponse {
  notes: WardNote[];
  total: number;
  ward_id: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  local_knowledge: 'Local Knowledge',
  correction: 'Correction',
  context: 'Context',
  historical: 'Historical',
};

function useWardNotes(wardId: string | null) {
  return useQuery<NoteListResponse>({
    queryKey: ['ward-notes', wardId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/ward-notes/${wardId}`);
      if (!res.ok) return { notes: [], total: 0, ward_id: wardId ?? '' };
      return res.json();
    },
    enabled: !!wardId,
    staleTime: 60000, // 1 minute
  });
}

interface WardNotesProps {
  wardId: string;
}

export const WardNotes = memo(function WardNotes({ wardId }: WardNotesProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useWardNotes(wardId);
  const [showForm, setShowForm] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('local_knowledge');

  const submitMutation = useMutation({
    mutationFn: async (body: { ward_id: string; author_name: string; content: string; category: string }) => {
      const res = await fetch('/api/v1/ward-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to submit note');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ward-notes', wardId] });
      setContent('');
      setShowForm(false);
    },
  });

  const handleSubmit = useCallback(() => {
    if (!authorName.trim() || !content.trim()) return;
    submitMutation.mutate({
      ward_id: wardId,
      author_name: authorName.trim(),
      content: content.trim(),
      category,
    });
  }, [wardId, authorName, content, category, submitMutation]);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          Community Notes
          {data && data.total > 0 && (
            <span className="ml-1 rounded-full bg-content2 px-1.5 py-0.5 text-xs">
              {data.total}
            </span>
          )}
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Add Note'}
        </Button>
      </div>

      {/* Submit form */}
      {showForm && (
        <div className="mb-3 space-y-2 rounded-lg border border-border/30 bg-content2/30 p-3">
          <input
            type="text"
            placeholder="Your name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full rounded-md border border-border/30 bg-background px-2.5 py-1.5 text-sm"
            maxLength={100}
            aria-label="Author name"
          />
          <textarea
            placeholder="Share local knowledge about this ward..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full resize-none rounded-md border border-border/30 bg-background px-2.5 py-1.5 text-sm"
            rows={3}
            maxLength={2000}
            aria-label="Note content"
          />
          <div className="flex items-center justify-between">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-border/30 bg-background px-2 py-1 text-xs"
              aria-label="Note category"
            >
              <option value="local_knowledge">Local Knowledge</option>
              <option value="context">Context</option>
              <option value="historical">Historical</option>
              <option value="correction">Correction</option>
            </select>
            <Button
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={handleSubmit}
              disabled={!authorName.trim() || !content.trim() || submitMutation.isPending}
            >
              <Send className="h-3 w-3" aria-hidden="true" />
              {submitMutation.isPending ? 'Sending...' : 'Submit'}
            </Button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {isLoading && (
        <div className="space-y-2">
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        </div>
      )}

      {data && data.notes.length === 0 && !showForm && (
        <p className="text-center text-xs text-muted-foreground">
          No community notes yet. Be the first to share local knowledge about this ward.
        </p>
      )}

      {data && data.notes.length > 0 && (
        <div className="space-y-2">
          {data.notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-border/30 bg-content2/30 p-2.5"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium">{note.author_name}</span>
                <div className="flex items-center gap-1.5">
                  {note.category && (
                    <span className="rounded bg-content2 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {CATEGORY_LABELS[note.category] ?? note.category}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
