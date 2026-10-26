import {
    CalendarDays,
    Clock3,
    Download,
    FileSpreadsheet,
    Loader2,
    ShieldCheck,
    TriangleAlert,
    Users,
} from 'lucide-react'
import {useEffect, useMemo, useState} from 'react'

import {supabase} from '../lib/supabase'
import {
    isLateArrival,
    setEmployeeLateSchedules,
    type EmployeeLateSchedule,
} from '../utils/lateArrival'
import {
    buildMonthlySummaries,
    exportAttendanceExcel,
    getMonthRange,
    type EmployeeMonthlySummary,
    type ReportAttendance,
    type ReportEmployee,
    type ReportOvertime,
} from '../utils/attendanceReport'

type ReportRangeMode = 'month' | 'weeks'

interface ReportWeek {
    index: number
    startDate: string
    endDate: string
    dates: string[]
}

function getVietnamMonth() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
    }).formatToParts(new Date())

    return `${parts.find((item) => item.type === 'year')?.value ?? ''}-${parts.find((item) => item.type === 'month')?.value ?? ''}`
}

function formatShortDate(value: string) {
    const [, month, day] = value.split('-')
    return `${day}/${month}`
}

function getMonthWeeks(monthValue: string): ReportWeek[] {
    const {daysInMonth} = getMonthRange(monthValue)
    const [year, month] = monthValue.split('-').map(Number)
    const groups: string[][] = []

    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = `${monthValue}-${String(day).padStart(2, '0')}`
        const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
        if (groups.length === 0 || dayOfWeek === 1) groups.push([])
        groups[groups.length - 1].push(date)
    }

    return groups.map((dates, index) => ({
        index,
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        dates,
    }))
}

export default function Reports() {
    const [month, setMonth] = useState(getVietnamMonth())
    const [rangeMode, setRangeMode] = useState<ReportRangeMode>('month')
    const [selectedWeekIndexes, setSelectedWeekIndexes] = useState<number[]>([0])
    const [employees, setEmployees] = useState<ReportEmployee[]>([])
    const [attendance, setAttendance] = useState<ReportAttendance[]>([])
    const [overtime, setOvertime] = useState<ReportOvertime[]>([])
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const monthWeeks = useMemo(() => getMonthWeeks(month), [month])

    useEffect(() => {
        setSelectedWeekIndexes([0])
    }, [month])

    const selectedDates = useMemo(() => {
        if (rangeMode === 'month') return monthWeeks.flatMap((week) => week.dates)
        const selected = new Set(selectedWeekIndexes)
        return monthWeeks.filter((week) => selected.has(week.index)).flatMap((week) => week.dates)
    }, [monthWeeks, rangeMode, selectedWeekIndexes])

    const filteredAttendance = useMemo(() => {
        const dateSet = new Set(selectedDates)
        return attendance.filter((record) => dateSet.has(record.work_date))
    }, [attendance, selectedDates])

    const periodLabel = useMemo(() => {
        const [year, monthNumber] = month.split('-')
        if (rangeMode === 'month') return `Tháng ${monthNumber}/${year}`
        const selected = new Set(selectedWeekIndexes)
        const labels = monthWeeks.filter((week) => selected.has(week.index)).map((week) => `Tuần ${week.index + 1}`)
        return labels.length ? `${labels.join(', ')} · Tháng ${monthNumber}/${year}` : `Chưa chọn tuần · Tháng ${monthNumber}/${year}`
    }, [month, monthWeeks, rangeMode, selectedWeekIndexes])

    const toggleWeek = (weekIndex: number) => {
        setSelectedWeekIndexes((current) =>
            current.includes(weekIndex)
                ? current.filter((item) => item !== weekIndex)
                : [...current, weekIndex].sort((a, b) => a - b),
        )
    }

    useEffect(() => {
        const loadReport = async () => {
            setLoading(true)
            setError(null)

            try {
                const {startDate, endDate} = getMonthRange(month)

                const [employeesResult, attendanceResult, overtimeResult, schedulesResult, settingsResult] = await Promise.all([
                    supabase
                        .from('employees')
                        .select('id, employee_code, full_name, is_active')
                        .order('employee_code'),
                    supabase
                        .from('attendance')
                        .select('id, employee_id, work_date, check_in, check_out, morning_status, afternoon_status, is_late, note')
                        .gte('work_date', startDate)
                        .lte('work_date', endDate)
                        .order('work_date'),
                    supabase
                        .from('overtime_records')
                        .select('id, employee_id, overtime_date, overtime_end_time, overtime_base_time, overtime_minutes, note')
                        .gte('overtime_date', startDate)
                        .lte('overtime_date', endDate)
                        .order('overtime_date'),
                    supabase
                        .from('employee_work_schedules')
                        .select('employee_id, effective_from, effective_to, late_after_time')
                        .lte('effective_from', endDate)
                        .or(`effective_to.is.null,effective_to.gte.${startDate}`)
                        .order('effective_from', {ascending: false}),
                    supabase
                        .from('company_settings')
                        .select('late_after_time')
                        .eq('id', 1)
                        .maybeSingle(),
                ])

                if (employeesResult.error) throw employeesResult.error
                if (attendanceResult.error) throw attendanceResult.error
                if (overtimeResult.error) throw overtimeResult.error
                if (schedulesResult.error) throw schedulesResult.error
                if (settingsResult.error) throw settingsResult.error

                const allEmployees = (employeesResult.data ?? []) as Array<ReportEmployee & {is_active: boolean}>
                const schedules = (schedulesResult.data ?? []) as EmployeeLateSchedule[]
                const fallbackThreshold = settingsResult.data?.late_after_time?.slice(0, 5) ?? '07:45'

                // Populate the shared resolver before summaries or export are calculated.
                setEmployeeLateSchedules(schedules, allEmployees)

                const attendanceData = ((attendanceResult.data ?? []) as ReportAttendance[]).map((record) => ({
                    ...record,
                    is_late: isLateArrival(
                        record.check_in,
                        allEmployees.find((employee) => employee.id === record.employee_id)?.full_name,
                        record.work_date,
                        fallbackThreshold,
                    ),
                }))

                setEmployees(allEmployees)
                setAttendance(attendanceData)
                setOvertime((overtimeResult.data ?? []) as ReportOvertime[])
            } catch (err) {
                console.error(err)
                setError('Không thể tải báo cáo tháng.')
            } finally {
                setLoading(false)
            }
        }

        void loadReport()
    }, [month])

    const summaries = useMemo<EmployeeMonthlySummary[]>(
        () => buildMonthlySummaries(employees, filteredAttendance),
        [employees, filteredAttendance],
    )

    const overall = useMemo(() => summaries.reduce(
        (total, item) => ({
            presentSessions: total.presentSessions + item.presentSessions,
            workDays: total.workDays + item.workDays,
            approvedLeaveSessions: total.approvedLeaveSessions + item.approvedLeaveSessions,
            unapprovedLeaveSessions: total.unapprovedLeaveSessions + item.unapprovedLeaveSessions,
            late: total.late + item.lateCount,
        }),
        {presentSessions: 0, workDays: 0, approvedLeaveSessions: 0, unapprovedLeaveSessions: 0, late: 0},
    ), [summaries])

    const handleExport = async () => {
        if (rangeMode === 'weeks' && selectedDates.length === 0) return
        setExporting(true)
        setError(null)

        try {
            const {data, error: settingsError} = await supabase
                .from('company_settings')
                .select('late_after_time')
                .eq('id', 1)
                .maybeSingle()

            if (settingsError) throw settingsError

            await exportAttendanceExcel(
                month,
                employees,
                attendance,
                data?.late_after_time?.slice(0, 5) ?? '07:45',
                rangeMode === 'weeks' ? selectedDates : undefined,
                periodLabel,
                overtime,
            )
        } catch (err) {
            console.error('Excel export error:', err)
            setError(err instanceof Error ? `Không thể tạo file Excel: ${err.message}` : 'Không thể tạo file Excel.')
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">Thống kê</p>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Báo cáo chấm công</h1>
                    <p className="mt-2 text-sm text-slate-500">Lọc theo tháng hoặc một hay nhiều tuần trước khi xuất Excel.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
                    <button type="button" onClick={() => void handleExport()} disabled={loading || exporting || employees.length === 0 || (rangeMode === 'weeks' && selectedDates.length === 0)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                        {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        {exporting ? 'Đang tạo Excel...' : rangeMode === 'month' ? 'Xuất Excel tháng' : 'Xuất Excel đã lọc'}
                    </button>
                </div>
            </div>

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div><p className="text-sm font-bold text-slate-900">Phạm vi báo cáo</p><p className="mt-1 text-xs text-slate-500">Chọn cả tháng hoặc một / nhiều tuần.</p></div>
                    <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1">
                        <button type="button" onClick={() => setRangeMode('month')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${rangeMode === 'month' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Cả tháng</button>
                        <button type="button" onClick={() => setRangeMode('weeks')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${rangeMode === 'weeks' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Theo tuần</button>
                    </div>
                </div>
                {rangeMode === 'weeks' && <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                    {monthWeeks.map((week) => {
                        const selected = selectedWeekIndexes.includes(week.index)
                        return <button key={week.index} type="button" onClick={() => toggleWeek(week.index)} className={`rounded-xl border px-4 py-3 text-left ${selected ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}><span className="block text-sm font-bold">Tuần {week.index + 1}</span><span className="mt-0.5 block text-xs">{formatShortDate(week.startDate)} → {formatShortDate(week.endDate)}</span></button>
                    })}
                    <div className="basis-full mt-2 flex gap-4 text-xs"><button type="button" onClick={() => setSelectedWeekIndexes(monthWeeks.map((week) => week.index))} className="font-bold text-emerald-700">Chọn tất cả tuần</button><button type="button" onClick={() => setSelectedWeekIndexes([])} className="font-bold text-slate-500">Bỏ chọn</button></div>
                </div>}
            </section>

            <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800">Đang xem: <strong>{periodLabel}</strong> — {selectedDates.length} ngày. 1 buổi có mặt = <strong>0.5 ngày công</strong>.</div>
            {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

            {loading ? (
                <div className="flex min-h-80 items-center justify-center"><div className="text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin text-slate-400" /><p className="mt-4 text-sm font-medium text-slate-500">Đang tổng hợp báo cáo...</p></div></div>
            ) : (
                <>
                    <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        {[
                            [Users, 'Nhân viên', employees.length],
                            [CalendarDays, 'Tổng ngày công', overall.workDays],
                            [ShieldCheck, 'Buổi nghỉ phép', overall.approvedLeaveSessions],
                            [TriangleAlert, 'Buổi không phép', overall.unapprovedLeaveSessions],
                            [Clock3, 'Tổng lần đi trễ', overall.late],
                        ].map(([Icon, label, value]) => { const Component = Icon as typeof Users; return <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5"><Component className="mb-4 text-slate-500" /><p className="text-sm text-slate-500">{String(label)}</p><p className="mt-1 text-3xl font-bold text-slate-950">{String(value)}</p></div> })}
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-slate-900">Tổng hợp nhân viên</h2><p className="mt-1 text-xs text-slate-400">{periodLabel}</p></div><FileSpreadsheet className="text-slate-400" /></div>
                        <div className="overflow-x-auto"><table className="w-full min-w-[1000px]"><thead className="bg-slate-50"><tr className="border-b border-slate-200"><th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">Nhân viên</th><th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">Buổi có mặt</th><th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">Ngày công</th><th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">Nghỉ phép</th><th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">Không phép</th><th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">Đi trễ</th></tr></thead><tbody>
                            {summaries.map((item) => <tr key={item.employeeId} className="border-b border-slate-100 hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-semibold text-slate-900">{item.fullName}</p><p className="mt-1 text-xs text-slate-400">{item.employeeCode}</p></td><td className="px-5 py-4 text-center font-semibold text-slate-700">{item.presentSessions}</td><td className="px-5 py-4 text-center"><span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700">{item.workDays}</span></td><td className="px-5 py-4 text-center text-blue-700">{item.approvedLeaveSessions}</td><td className="px-5 py-4 text-center font-semibold text-red-600">{item.unapprovedLeaveSessions}</td><td className="px-5 py-4 text-center">{item.lateCount > 0 ? <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"><Clock3 size={13} />{item.lateCount}</span> : <span className="text-slate-300">0</span>}</td></tr>)}
                        </tbody></table></div>
                    </section>
                </>
            )}
        </div>
    )
}
