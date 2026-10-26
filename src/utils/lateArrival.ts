/**
 * Employee/date-specific lateness schedules.
 *
 * The schedule cache is populated by pages that load attendance data. The
 * fallback threshold remains the company setting for employees/dates that
 * have no override.
 */

export interface EmployeeLateSchedule {
    employee_id: string
    effective_from: string
    effective_to: string | null
    late_after_time: string
}

interface EmployeeLike {
    id: string
    full_name: string
}

const scheduleCache = new Map<string, EmployeeLateSchedule[]>()

function normalizeTime(value: string | null | undefined) {
    return value?.slice(0, 5) ?? ''
}

/**
 * Replace the in-memory schedule cache with schedules loaded from Supabase.
 * The cache is keyed by employee name because the legacy report/export APIs
 * identify employees by name. The underlying schedule records remain keyed by
 * employee_id, so the configuration itself is still employee-specific.
 */
export function setEmployeeLateSchedules(
    schedules: EmployeeLateSchedule[],
    employees: EmployeeLike[],
) {
    scheduleCache.clear()

    const employeeNames = new Map(
        employees.map((employee) => [employee.id, employee.full_name]),
    )

    for (const schedule of schedules) {
        const fullName = employeeNames.get(schedule.employee_id)
        if (!fullName) continue

        const current = scheduleCache.get(fullName) ?? []
        current.push({
            ...schedule,
            late_after_time: normalizeTime(schedule.late_after_time),
        })
        scheduleCache.set(fullName, current)
    }

    for (const schedulesForEmployee of scheduleCache.values()) {
        schedulesForEmployee.sort(
            (a, b) => b.effective_from.localeCompare(a.effective_from),
        )
    }
}

export function getLateThreshold(
    fullName: string | null | undefined,
    workDate: string,
    legacyThreshold = '07:45',
) {
    if (!fullName) return normalizeTime(legacyThreshold) || '07:45'

    const schedules = scheduleCache.get(fullName)
    if (!schedules?.length) {
        return normalizeTime(legacyThreshold) || '07:45'
    }

    const matchingSchedule = schedules.find(
        (schedule) =>
            schedule.effective_from <= workDate &&
            (schedule.effective_to === null || workDate <= schedule.effective_to),
    )

    return matchingSchedule?.late_after_time || normalizeTime(legacyThreshold) || '07:45'
}

export function isLateArrival(
    checkIn: string | null | undefined,
    fullName: string | null | undefined,
    workDate: string,
    legacyThreshold = '07:45',
) {
    if (!checkIn) return false

    return checkIn.slice(0, 5) > getLateThreshold(
        fullName,
        workDate,
        legacyThreshold,
    )
}
