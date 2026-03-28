-- Run once if you already have payslips with gross_amount (legacy).
-- Safe to re-run: uses IF EXISTS / IF NOT EXISTS patterns where possible.

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS basic_salary VARCHAR(24);
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS hra VARCHAR(24) DEFAULT '0';
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS bonus VARCHAR(24) DEFAULT '0';
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'unpaid';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payslips' AND column_name = 'gross_amount'
  ) THEN
    UPDATE payslips SET basic_salary = gross_amount WHERE basic_salary IS NULL;
  END IF;
END $$;

UPDATE payslips SET basic_salary = '0' WHERE basic_salary IS NULL OR basic_salary = '';
UPDATE payslips SET hra = '0' WHERE hra IS NULL OR hra = '';
UPDATE payslips SET bonus = '0' WHERE bonus IS NULL OR bonus = '';
UPDATE payslips SET status = 'unpaid' WHERE status IS NULL OR status NOT IN ('paid', 'unpaid');

ALTER TABLE payslips ALTER COLUMN basic_salary SET NOT NULL;
ALTER TABLE payslips ALTER COLUMN hra SET NOT NULL;
ALTER TABLE payslips ALTER COLUMN bonus SET NOT NULL;
ALTER TABLE payslips ALTER COLUMN status SET NOT NULL;

ALTER TABLE payslips DROP COLUMN IF EXISTS gross_amount;

CREATE INDEX IF NOT EXISTS idx_payslips_org_status ON payslips(organization_name, status);
