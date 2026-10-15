-- Effective 2026-10-13: Nguyễn Thị Thủy Tiên may check in through 08:15;
-- all other employees may check in through 07:45. Exact cutoff is on time.
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

    if new.work_date >= date '2026-10-13' then
        select e.full_name
          into employee_name
          from public.employees as e
         where e.id = new.employee_id;

        if employee_name = 'Nguyễn Thị Thủy Tiên' then
            late_cutoff := time '08:15';
        else
            late_cutoff := time '07:45';
        end if;
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

-- Recalculate records since the effective date so historical screens/reports agree.
update public.attendance as a
   set is_late = case
       when a.check_in is null then false
       when e.full_name = 'Nguyễn Thị Thủy Tiên'
           then a.check_in > time '08:15'
       else a.check_in > time '07:45'
   end
  from public.employees as e
 where a.employee_id = e.id
   and a.work_date >= date '2026-10-13';
