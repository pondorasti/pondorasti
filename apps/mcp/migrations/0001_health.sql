-- Apple Health data pushed by Health Auto Export (src/health/ingest.ts).
-- Re-pushes upsert on the primary key, so the latest export of a sample wins.

-- start: UTC ISO 8601. day: the phone's local calendar day (sleep: the day you woke up).
-- variant: sleep stage for unaggregated sleep segments, '' otherwise.
-- qty/min/max are normalized (kcal, kg, km); data keeps the point as exported.
CREATE TABLE health_samples (
  metric TEXT NOT NULL,
  start TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT '',
  day TEXT NOT NULL,
  units TEXT,
  qty REAL,
  min REAL,
  max REAL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (metric, start, variant)
) WITHOUT ROWID;

CREATE INDEX health_samples_metric_day ON health_samples (metric, day);

-- id: Health Auto Export's workout id (v2), or "<name>|<start>" for v1 exports.
-- data: the exported workout minus the route and per-minute series.
CREATE TABLE health_workouts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  day TEXT NOT NULL,
  duration_s REAL,
  active_kcal REAL,
  total_kcal REAL,
  avg_hr REAL,
  max_hr REAL,
  distance_km REAL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX health_workouts_day ON health_workouts (day);
