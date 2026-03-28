-- Fresh install: payslips with salary components + status (no gross_amount).
CREATE TABLE IF NOT EXISTS payslips (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_name VARCHAR(255) NOT NULL,
  pay_period VARCHAR(7) NOT NULL,
  basic_salary VARCHAR(24) NOT NULL,
  hra VARCHAR(24) NOT NULL DEFAULT '0',
  bonus VARCHAR(24) NOT NULL DEFAULT '0',
  deduction_amount VARCHAR(24) NOT NULL DEFAULT '0',
  net_amount VARCHAR(24) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  notes VARCHAR(500),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, pay_period)
);

CREATE INDEX IF NOT EXISTS idx_payslips_org_period ON payslips(organization_name, pay_period DESC);
