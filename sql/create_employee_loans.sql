-- Create employee_loans table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.employee_loans (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    employee_id TEXT NOT NULL,
    employee_pin TEXT,
    employee_name TEXT,
    employee_contact TEXT,
    loan_name TEXT NOT NULL,
    loan_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    monthly_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    months_duration INT DEFAULT 1,
    total_repaid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    remaining_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Pending',
    notes TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    months_skipped INT DEFAULT 0,
    last_payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If table already exists, add the new columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_loans' AND column_name = 'start_date') THEN
        ALTER TABLE public.employee_loans ADD COLUMN start_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_loans' AND column_name = 'end_date') THEN
        ALTER TABLE public.employee_loans ADD COLUMN end_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_loans' AND column_name = 'months_skipped') THEN
        ALTER TABLE public.employee_loans ADD COLUMN months_skipped INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_loans' AND column_name = 'last_payment_date') THEN
        ALTER TABLE public.employee_loans ADD COLUMN last_payment_date TIMESTAMPTZ;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.employee_loans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all for authenticated users on employee_loans" ON public.employee_loans;
DROP POLICY IF EXISTS "Allow anon read/write on employee_loans" ON public.employee_loans;

-- Create policies for anon and authenticated users
CREATE POLICY "Allow all for authenticated users on employee_loans" 
ON public.employee_loans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read/write on employee_loans" 
ON public.employee_loans FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add to Realtime publication (ignore error if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_loans;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
