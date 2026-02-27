import type { FeatureCollection, Feature, Geometry } from 'geojson';

export interface WardMeta {
  county: string;
  municipality: string;
  congressionalDistrict: string;
  stateSenateDistrict: string;
  assemblyDistrict: string;
}

export function extractWardMetadata(
  boundaries: FeatureCollection<Geometry> | undefined,
): Record<string, WardMeta> {
  if (!boundaries) return {};

  const metadata: Record<string, WardMeta> = {};

  for (const feature of boundaries.features) {
    const props = feature.properties;
    if (!props) continue;

    const wardId = String(props.ward_id ?? feature.id ?? '');
    if (!wardId) continue;

    metadata[wardId] = {
      county: String(props.county ?? ''),
      municipality: String(props.municipality ?? ''),
      congressionalDistrict: String(props.congressional_district ?? props.cd ?? ''),
      stateSenateDistrict: String(props.state_senate_district ?? props.sd ?? ''),
      assemblyDistrict: String(props.assembly_district ?? props.ad ?? ''),
    };
  }

  return metadata;
}
