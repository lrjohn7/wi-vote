import { WisconsinMap } from '@/shared/components/WisconsinMap';

export default function ElectionMap() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b px-4 py-2">
        <h2 className="text-lg font-semibold">Election Map</h2>
        <p className="text-sm text-muted-foreground">
          Select an election to view ward-level results across Wisconsin.
        </p>
      </div>
      <div className="relative flex-1">
        <WisconsinMap />
      </div>
    </div>
  );
}
