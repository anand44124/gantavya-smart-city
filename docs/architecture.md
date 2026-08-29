# CivicPulse Day 1 Architecture

The prototype separates a citizen **report** from the physical civic **issue** it may reference. Reports can be created independently and later assigned to the same issue by clustering or duplicate detection services.

## Extension points

- `services/`: evidence validation, classification, clustering, routing, SLA, and verification services will live here.
- PostGIS geometry columns support GPS capture and ward geofencing.
- `evidence_url` is storage-provider agnostic and can point to Supabase Storage.
- Mock role switching is a frontend-only development seam; authentication will replace it later.
