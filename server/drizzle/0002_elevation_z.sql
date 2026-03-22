-- Allow Z (elevation) coordinates in route geometry.
-- Existing 2D data is promoted to 3D with Z=0 via ST_Force3D.

ALTER TABLE routes
  ALTER COLUMN geometry TYPE geography(LineStringZ, 4326)
  USING ST_Force3D(geometry::geometry)::geography(LineStringZ, 4326);
