import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

interface DataStats {
  totalWards: number;
  totalElections: number;
  vintages: number[];
  raceTypes: string[];
  yearRange: [number, number];
}

function useDataStats() {
  return useQuery<DataStats>({
    queryKey: ['data-stats'],
    queryFn: async () => {
      // Aggregate stats from elections endpoint
      const elections = await api.getElections();
      const years = elections.map((e: { year: number }) => e.year);
      const raceTypes = [...new Set(elections.map((e: { raceType: string }) => e.raceType))];
      return {
        totalWards: 0, // Would come from wards endpoint
        totalElections: elections.length,
        vintages: [2011, 2017, 2020, 2022],
        raceTypes: raceTypes as string[],
        yearRange: [Math.min(...years), Math.max(...years)] as [number, number],
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

const PIPELINE_STEPS = [
  {
    name: 'Download LTSB Data',
    script: 'download_ltsb.py',
    description: 'Downloads ward boundary shapefiles and election data from LTSB ArcGIS REST API',
  },
  {
    name: 'Process Wards',
    script: 'process_wards.py',
    description: 'Cleans and normalizes ward geometries, assigns district attributes',
  },
  {
    name: 'Load Database',
    script: 'load_database.py',
    description: 'Loads processed data into PostGIS',
  },
  {
    name: 'Download Demographics',
    script: 'download_demographics.py',
    description: 'Downloads Census/ACS demographic data at block group level',
  },
  {
    name: 'Process Demographics',
    script: 'process_demographics.py',
    description: 'Aggregates Census block demographics to ward level',
  },
  {
    name: 'Load Demographics',
    script: 'load_demographics.py',
    description: 'Loads processed demographics into ward_demographics table',
  },
  {
    name: 'Load Spring Elections',
    script: 'load_spring_elections.py',
    description: 'Loads Wisconsin Supreme Court spring election results',
  },
  {
    name: 'Backfill Districts',
    script: 'backfill_districts.py',
    description: 'Backfills congressional/state district assignments on ward records',
  },
  {
    name: 'Compute Aggregations',
    script: 'compute_aggregations.py',
    description: 'Pre-computes county/district/statewide aggregations',
  },
  {
    name: 'Generate Tiles',
    script: 'generate_tiles.sh',
    description: 'Runs Tippecanoe → PMTiles pipeline for ward boundary vector tiles',
  },
  {
    name: 'Fit MRP Models',
    script: 'fit_mrp_models.py',
    description: 'Runs PyMC MRP model fitting (slow, outputs trace files)',
  },
];

export default function DataManager() {
  const { data: stats, isLoading, isError } = useDataStats();

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h2 className="text-2xl font-bold">Data Manager</h2>
      <p className="mt-2 text-muted-foreground">
        Internal tools for data ingestion, validation, and tile generation.
      </p>

      {/* Database Stats */}
      <section className="mt-8">
        <h3 className="mb-4 text-lg font-semibold">Database Status</h3>
        {isLoading && (
          <div className="rounded-lg border bg-content2/30 p-6 text-sm text-muted-foreground">
            Loading database statistics...
          </div>
        )}
        {isError && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-50 p-6 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
            Unable to connect to API. Ensure the backend is running.
          </div>
        )}
        {stats && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border bg-content2/30 p-4">
              <div className="text-2xl font-bold">{stats.totalElections}</div>
              <div className="text-xs text-muted-foreground">Election datasets</div>
            </div>
            <div className="rounded-lg border bg-content2/30 p-4">
              <div className="text-2xl font-bold">{stats.raceTypes.length}</div>
              <div className="text-xs text-muted-foreground">Race types</div>
            </div>
            <div className="rounded-lg border bg-content2/30 p-4">
              <div className="text-2xl font-bold">{stats.vintages.length}</div>
              <div className="text-xs text-muted-foreground">Ward vintages</div>
            </div>
            <div className="rounded-lg border bg-content2/30 p-4">
              <div className="text-2xl font-bold">
                {stats.yearRange[0]}&ndash;{stats.yearRange[1]}
              </div>
              <div className="text-xs text-muted-foreground">Year range</div>
            </div>
          </div>
        )}
      </section>

      {/* Data Pipeline */}
      <section className="mt-8">
        <h3 className="mb-4 text-lg font-semibold">Data Pipeline</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Run these scripts in order from the <code className="rounded bg-content2 px-1.5 py-0.5 text-xs">data/scripts/</code> directory.
        </p>
        <div className="space-y-2">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.script} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-content2 text-xs font-medium">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{step.name}</span>
                  <code className="rounded bg-content2 px-1.5 py-0.5 text-xs text-muted-foreground">
                    {step.script}
                  </code>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Data Sources */}
      <section className="mt-8">
        <h3 className="mb-4 text-lg font-semibold">Data Sources</h3>
        <div className="space-y-2 text-sm">
          <div className="rounded-lg border p-3">
            <div className="font-medium">LTSB ArcGIS Open Data Portal</div>
            <div className="text-xs text-muted-foreground">
              Primary source — ward boundaries with pre-joined election results (1990-2024)
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="font-medium">Wisconsin Elections Commission</div>
            <div className="text-xs text-muted-foreground">
              Official certified results — verification and newest results not yet in LTSB
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="font-medium">US Census / ACS</div>
            <div className="text-xs text-muted-foreground">
              Demographics at block group/tract level for regression models
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
