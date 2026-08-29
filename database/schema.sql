CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE user_role AS ENUM ('citizen', 'admin', 'worker');
CREATE TYPE issue_status AS ENUM ('reported', 'acknowledged', 'assigned', 'in_progress', 'completed', 'verified', 'resolved', 'rejected');

CREATE TABLE wards (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  boundary GEOMETRY(MULTIPOLYGON, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE departments (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  category VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'citizen',
  ward_id BIGINT REFERENCES wards(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE issues (
  id BIGSERIAL PRIMARY KEY,
  category VARCHAR(80) NOT NULL DEFAULT 'road_damage',
  title VARCHAR(240) NOT NULL,
  description TEXT,
  status issue_status NOT NULL DEFAULT 'reported',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  location GEOMETRY(POINT, 4326),
  ward_id BIGINT REFERENCES wards(id),
  department_id BIGINT REFERENCES departments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A report is a citizen signal; many reports may point to one physical issue.
CREATE TABLE reports (
  id BIGSERIAL PRIMARY KEY,
  reference_code VARCHAR(32) NOT NULL UNIQUE,
  reporter_id BIGINT NOT NULL REFERENCES users(id),
  issue_id BIGINT REFERENCES issues(id),
  title VARCHAR(240) NOT NULL,
  description TEXT,
  evidence_url TEXT,
  location GEOMETRY(POINT, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workers (
  user_id BIGINT PRIMARY KEY REFERENCES users(id),
  employee_code VARCHAR(40) NOT NULL UNIQUE,
  department_id BIGINT REFERENCES departments(id),
  is_available BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE routing_rules (
  id BIGSERIAL PRIMARY KEY,
  category VARCHAR(80) NOT NULL,
  ward_id BIGINT REFERENCES wards(id),
  department_id BIGINT NOT NULL REFERENCES departments(id),
  priority_floor VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE status_events (
  id BIGSERIAL PRIMARY KEY,
  issue_id BIGINT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  from_status issue_status,
  to_status issue_status NOT NULL,
  changed_by BIGINT REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX issues_location_idx ON issues USING GIST(location);
CREATE INDEX reports_location_idx ON reports USING GIST(location);
CREATE INDEX wards_boundary_idx ON wards USING GIST(boundary);
