import type {LatePermissionStatus} from './lateArrival'

/**
 * Reference-only policy calculations. Vietnamese Labour Code Article 127
 * prohibits financial penalties / docking salary as disciplinary action.
 * NEVER apply these amounts or extra days as payroll deductions.
 */
export interface PolicyEmployee {
    id: string
    employee_code: string
    full_name: string
}

export interface PolicyAttendance {
    employee_id: string
    work_date: string
    check_in: string | null
    is_late: boolean
    late_permission_status: LatePermissionStatus | null
    morning_status: string
    afternoon_status: string
    note: string | null
}

export interface PolicyIncident {
    employeeId: string
    employeeCode: string
    fullName: string
    workDate: string
    type: 'late' | 'unapproved_leave'
    checkIn: string | null
    permission: LatePermissionStatus | null
    referenceAmount: number
    unpaidAbsenceDays: number
    extraPolicyDays: number
    note: string | null
}

export interface PolicySummary {
    employeeId: string
    employeeCode: string
    fullName: string
    late30kCount: number
    late50kCount: number
    lateUnclassifiedCount: number
    referenceAmount: number
    unpaidAbsenceDays: number
    extraPolicyDays: number
}

const SPECIAL_EMPLOYEE_CODE = 'NV003' // Nguyễn Thị Thủy Tiên
const THUY_TIEN_HIGHER_TIER = '08:30'

/**
 * Every late occurrence receives at most one reference amount:
 * - Other employees: 30k only if classified "Trễ không phép".
 * - NV003: >08:30 is 50k, otherwise (if late) 30k.
 * The NV003 exception follows the requested rule independent of permission.
 */
export function getLateReferenceAmount(
    employee: PolicyEmployee,
    record: PolicyAttendance,
): number {
    if (!record.is_late || !record.check_in || record.morning_status !== 'present') return 0

    if (employee.employee_code === SPECIAL_EMPLOYEE_CODE) {
        return record.check_in.slice(0, 5) > THUY_TIEN_HIGHER_TIER ? 50000 : 30000
    }

    return record.late_permission_status === 'unpermitted' ? 30000 : 0
}

/**
 * Full-day unapproved absence: one unpaid day plus one EXTRA policy day
 * (report only; the extra day must not be docked from employee wages).
 * A half-day absence is 0.5 unpaid day and no extra policy day.
 */
export function buildAttendancePolicyReport(
    employees: PolicyEmployee[],
    attendance: PolicyAttendance[],
) {
    const employeeMap = new Map(employees.map((employee) => [employee.id, employee]))
    const incidents: PolicyIncident[] = []
    const summaries = new Map<string, PolicySummary>(
        employees.map((employee) => [employee.id, {
            employeeId: employee.id,
            employeeCode: employee.employee_code,
            fullName: employee.full_name,
            late30kCount: 0,
            late50kCount: 0,
            lateUnclassifiedCount: 0,
            referenceAmount: 0,
            unpaidAbsenceDays: 0,
            extraPolicyDays: 0,
        }]),
    )

    for (const record of attendance) {
        const employee = employeeMap.get(record.employee_id)
        const summary = summaries.get(record.employee_id)
        if (!employee || !summary) continue

        if (record.is_late && record.check_in && record.morning_status === 'present') {
            const amount = getLateReferenceAmount(employee, record)
            if (amount === 30000) summary.late30kCount += 1
            if (amount === 50000) summary.late50kCount += 1
            if (!amount && record.late_permission_status === null &&
                employee.employee_code !== SPECIAL_EMPLOYEE_CODE) {
                summary.lateUnclassifiedCount += 1
            }
            summary.referenceAmount += amount
            incidents.push({
                employeeId: employee.id,
                employeeCode: employee.employee_code,
                fullName: employee.full_name,
                workDate: record.work_date,
                type: 'late',
                checkIn: record.check_in,
                permission: record.late_permission_status,
                referenceAmount: amount,
                unpaidAbsenceDays: 0,
                extraPolicyDays: 0,
                note: record.note,
            })
        }

        const absenceSessions = Number(record.morning_status === 'unapproved_leave') +
            Number(record.afternoon_status === 'unapproved_leave')
        if (absenceSessions > 0) {
            const unpaidDays = absenceSessions / 2
            const extraDays = absenceSessions === 2 ? 1 : 0
            summary.unpaidAbsenceDays += unpaidDays
            summary.extraPolicyDays += extraDays
            incidents.push({
                employeeId: employee.id,
                employeeCode: employee.employee_code,
                fullName: employee.full_name,
                workDate: record.work_date,
                type: 'unapproved_leave',
                checkIn: record.check_in,
                permission: null,
                referenceAmount: 0,
                unpaidAbsenceDays: unpaidDays,
                extraPolicyDays: extraDays,
                note: record.note,
            })
        }
    }

    incidents.sort((a, b) => a.workDate.localeCompare(b.workDate) ||
        a.employeeCode.localeCompare(b.employeeCode) || a.type.localeCompare(b.type))

    const employeeSummaries = Array.from(summaries.values())
    const totals = employeeSummaries.reduce((total, item) => ({
        late30kCount: total.late30kCount + item.late30kCount,
        late50kCount: total.late50kCount + item.late50kCount,
        lateUnclassifiedCount: total.lateUnclassifiedCount + item.lateUnclassifiedCount,
        referenceAmount: total.referenceAmount + item.referenceAmount,
        unpaidAbsenceDays: total.unpaidAbsenceDays + item.unpaidAbsenceDays,
        extraPolicyDays: total.extraPolicyDays + item.extraPolicyDays,
    }), {
        late30kCount: 0,
        late50kCount: 0,
        lateUnclassifiedCount: 0,
        referenceAmount: 0,
        unpaidAbsenceDays: 0,
        extraPolicyDays: 0,
    })

    return {incidents, employeeSummaries, totals}
}
