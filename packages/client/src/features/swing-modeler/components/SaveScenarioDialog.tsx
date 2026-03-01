import { useState } from 'react';
import { Save, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useModelStore } from '@/stores/modelStore';
import { useSaveScenario } from '../hooks/useScenarios';

export function SaveScenarioDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeModelId = useModelStore((s) => s.activeModelId);
  const parameters = useModelStore((s) => s.parameters);
  const mutation = useSaveScenario();

  const handleSave = () => {
    mutation.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        model_id: activeModelId,
        parameters: { ...parameters },
      },
      {
        onSuccess: (data) => {
          setSavedId(data.id);
        },
      },
    );
  };

  const shareUrl = savedId
    ? `${window.location.origin}/modeler?scenario=${savedId}`
    : null;

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setName('');
      setDescription('');
      setSavedId(null);
      setCopied(false);
      mutation.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-1.5">
          <Save className="h-3.5 w-3.5" />
          Save Current Scenario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Scenario</DialogTitle>
          <DialogDescription>
            Save your current model parameters to share with others.
          </DialogDescription>
        </DialogHeader>

        {!savedId ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scenario-name">Name</Label>
              <Input
                id="scenario-name"
                placeholder="e.g., Milwaukee surge scenario"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scenario-desc">Description (optional)</Label>
              <Input
                id="scenario-desc"
                placeholder="What does this scenario model?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || mutation.isPending}
              className="w-full"
            >
              {mutation.isPending ? 'Saving...' : 'Save Scenario'}
            </Button>
            {mutation.isError && (
              <p className="text-sm text-destructive">
                Failed to save. Please try again.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scenario saved! Share this link:
            </p>
            <div className="flex gap-2">
              <Input value={shareUrl ?? ''} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
