-- ============================================================================
-- SCALABILITY & PERFORMANCE INDEXES MIGRATION
-- Run this in Supabase SQL Editor to support high concurrency & fast lookups (10,000+ users)
-- ============================================================================

-- 1. Index on raw_attendance_logs for fast date-range and PIN queries
CREATE INDEX IF NOT EXISTS idx_raw_logs_pin_timestamp ON public.raw_attendance_logs (employee_pin, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_raw_logs_timestamp ON public.raw_attendance_logs (timestamp DESC);

-- 2. Index on profiles for PIN, email and active status
CREATE INDEX IF NOT EXISTS idx_profiles_pin ON public.profiles (pin);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles (is_active);

-- 3. Index on leave_requests for fast employee and status queries
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp_dates ON public.leave_requests (employee_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests (status);

-- 4. Index on notifications for fast user notification retrieval
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);

-- 5. Index on complaints for fast employee and status queries
CREATE INDEX IF NOT EXISTS idx_complaints_emp_status ON public.complaints (employee_id, status);

-- 6. Index on employee_loans for fast active loan queries
CREATE INDEX IF NOT EXISTS idx_employee_loans_emp_status ON public.employee_loans (employee_id, status, remaining_balance);
CREATE INDEX IF NOT EXISTS idx_employee_loans_pin ON public.employee_loans (employee_pin);

-- 7. Index on user_push_tokens for fast token dispatch
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.user_push_tokens (user_id);
