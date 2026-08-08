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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Add to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_loans;
