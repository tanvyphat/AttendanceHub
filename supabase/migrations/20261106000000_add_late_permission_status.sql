-- Classification of late arrivals, independent of the existing free-form note.
-- Historical records remain NULL ("Chưa phân loại") until explicitly classified.
ALTER TABLE public.attendance
    ADD COLUMN IF NOT EXISTS late_permission_status text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.attendance'::regclass
          AND conname = 'attendance_late_permission_status_check'
    ) THEN
        ALTER TABLE public.attendance
            ADD CONSTRAINT attendance_late_permission_status_check
            CHECK (
                late_permission_status IS NULL OR
                late_permission_status IN ('permitted', 'unpermitted')
            );
    END IF;
END
$$;

COMMENT ON COLUMN public.attendance.late_permission_status IS
    'permitted = Trễ có phép; unpermitted = Trễ không phép; NULL = chưa phân loại. Independent from note.';
