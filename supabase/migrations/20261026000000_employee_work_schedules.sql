-- Replace employee-specific hard-coded lateness rules with configurable schedules.
-- A schedule is selected by employee + work date; when no override matches,
-- company_settings remains the fallback.

create extension if not exists btree_gist;

create table public.employee_work_schedules (
    id bigint generated always as identity primary key,
    employee_id text not null,
    effective_from date not null,
    effective_to date,
    work_start_time time not null,
    late_after_time time not null,
    morning_end_time time not null,
    afternoon_start_time time not null,
    afternoon_end_time time not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint employee_work_schedules_date_check
        check (effective_to is null or effective_to >= effective_from),

    constraint employee_work_schedules_time_check
        check (
            work_start_time < morning_end_time
            and late_after_time >= work_start_time
            and late_after_time < morning_end_time
            and morning_end_time <= afternoon_start_time
            and afternoon_start_time < afternoon_end_time
        ),

    constraint employee_work_schedules_no_overlap
        exclude using gist (
            employee_id with =,
            daterange(
                effective_from,
                coalesce(effective_to + 1, date '9999-12-31'),
                '[)'
            ) with &&
        )
);

create index employee_work_schedules_employee_date_idx
    on public.employee_work_schedules (employee_id, effective_from desc);

create or replace function public.set_employee_work_schedule_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
    new.updated_at := now();
    return new;
end;
$function$;

create trigger employee_work_schedules_updated_at
before update on public.employee_work_schedules
for each row execute function public.set_employee_work_schedule_updated_at();

alter table public.employee_work_schedules enable row level security;

revoke all on table public.employee_work_schedules from anon, authenticated;
grant select, insert, update, delete on table public.employee_work_schedules to authenticated;
grant usage, select on sequence public.employee_work_schedules_id_seq to authenticated;

create policy "Authenticated users can view employee work schedules"
on public.employee_work_schedules
for select
to authenticated
using (true);

create policy "Authenticated users can create employee work schedules"
on public.employee_work_schedules
for insert
to authenticated
with check (true);

create policy "Authenticated users can update employee work schedules"
on public.employee_work_schedules
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete employee work schedules"
on public.employee_work_schedules
for delete
to authenticated
using (true);

-- Resolve the schedule that applies to one employee on one work date.
-- The latest matching effective_from wins; company_settings is the fallback.
create or replace function public.get_employee_work_schedule(
    p_employee_id text,
    p_work_date date
)
returns table (
    work_start_time time,
    late_after_time time,
    morning_end_time time,
    afternoon_start_time time,
    afternoon_end_time time
)
language sql
stable
set search_path to ''
as $function$
    select
        coalesce(s.work_start_time, cs.work_start_time),
        coalesce(s.late_after_time, cs.late_after_time),
        coalesce(s.morning_end_time, cs.morning_end_time),
        coalesce(s.afternoon_start_time, cs.afternoon_start_time),
        coalesce(s.afternoon_end_time, cs.afternoon_end_time)
    from public.company_settings as cs
    left join lateral (
        select
            ews.work_start_time,
            ews.late_after_time,
            ews.morning_end_time,
            ews.afternoon_start_time,
            ews.afternoon_end_time
        from public.employee_work_schedules as ews
        where ews.employee_id = p_employee_id
          and ews.effective_from <= p_work_date
          and (ews.effective_to is null or p_work_date <= ews.effective_to)
        order by ews.effective_from desc, ews.id desc
        limit 1
    ) as s on true
    where cs.id = 1;
$function$;

revoke all on function public.get_employee_work_schedule(text, date) from public;
grant execute on function public.get_employee_work_schedule(text, date) to authenticated;

-- Keep the database trigger authoritative. No employee name or date is hard-coded here.
create or replace function public.calculate_late_status()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
    late_cutoff time;
begin
    if new.check_in is null then
        new.is_late := false;
        return new;
    end if;

    select s.late_after_time
      into late_cutoff
      from public.get_employee_work_schedule(
          new.employee_id::text,
          new.work_date
      ) as s;

    if late_cutoff is null then
        late_cutoff := time '07:45';
    end if;

    new.is_late := new.check_in > late_cutoff;
    return new;
end;
$function$;

-- Seed the requested historical/current schedules without embedding the employee
-- identity in application logic. If the employee is absent, the UI can add it later.
insert into public.employee_work_schedules (
    employee_id,
    effective_from,
    effective_to,
    work_start_time,
    late_after_time,
    morning_end_time,
    afternoon_start_time,
    afternoon_end_time
)
select
    e.id::text,
    date '2026-10-01',
    date '2026-10-12',
    time '07:30',
    time '09:00',
    time '12:00',
    time '13:30',
    time '17:00'
from public.employees as e
where trim(e.full_name) = 'Nguyễn Thị Thủy Tiên';

insert into public.employee_work_schedules (
    employee_id,
    effective_from,
    effective_to,
    work_start_time,
    late_after_time,
    morning_end_time,
    afternoon_start_time,
    afternoon_end_time
)
select
    e.id::text,
    date '2026-10-13',
    null,
    time '07:30',
    time '08:15',
    time '12:00',
    time '13:30',
    time '17:00'
from public.employees as e
where trim(e.full_name) = 'Nguyễn Thị Thủy Tiên';

-- Recalculate stored lateness for existing records covered by the new schedules.
update public.attendance as a
set is_late = case
    when a.check_in is null then false
    else a.check_in > s.late_after_time
end
from public.get_employee_work_schedule(
    a.employee_id::text,
    a.work_date
) as s
where a.work_date >= date '2026-10-01'
  and a.employee_id::text in (
      select e.id::text
      from public.employees as e
      where trim(e.full_name) = 'Nguyễn Thị Thủy Tiên'
  );
