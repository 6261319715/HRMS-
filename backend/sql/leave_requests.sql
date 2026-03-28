-- Run in Supabase SQL editor if drizzle push is not used yet.
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_name VARCHAR(255) NOT NULL,
  leave_type VARCHAR(50) NOT NULL,
  start_date VARCHAR(10) NOT NULL,
  end_date VARCHAR(10) NOT NULL,
  reason VARCHAR(2000),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_org ON leave_requests(organization_name);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id);
