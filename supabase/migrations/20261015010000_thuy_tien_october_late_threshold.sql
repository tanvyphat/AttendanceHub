-- Correct the historical rule for Nguyễn Thị Thủy Tiên from Oct 1 through Oct 12, 2026.
-- From Oct 13 onward, the current employee-specific policy remains in force.
create or replace function public.calculate_late_status()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
    late_cutoff time;
    employee_name text;
begin
    if new.check_in is null then
        new.is_late := false;
        return new;
    end if;

    select e.full_name
      into employee_name
      from public.employees as e
     where e.id = new.employee_id;

    if new.work_date >= date '2026-10-13' then
        if employee_name = 'Nguyễn Thị Thủy Tiên' then
            late_cutoff := time '08:15';
        else
            late_cutoff := time '07:45';
        end if;
    elsif new.work_date >= date '2026-10-01'
      and new.work_date < date '2026-10-13'
      and employee_name = 'Nguyễn Thị Thủy Tiên' then
        late_cutoff := time '09:00';
    else
        select cs.late_after_time
          into late_cutoff
          from public.company_settings as cs
         where cs.id = 1;

        if late_cutoff is null then
            late_cutoff := time '07:45';
        end if;
    end if;

    new.is_late := new.check_in > late_cutoff;
    return new;
end;
$function$;

-- Recalculate only Thủy Tiên's historical rows for Oct 1–12.
-- Other employees' historical records remain governed by the old company setting.
update public.attendance as a
   set is_late = case
       when a.check_in is null then false
       else a.check_in > time '09:00'
   end
  from public.employees as e
 where a.employee_id = e.id
   and e.full_name = 'Nguyễn Thị Thủy Tiên'
   and a.work_date >= date '2026-10-01'
   and a.work_date < date '2026-10-13';
