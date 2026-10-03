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
import {
    useEffect,
    useMemo,
    useState,
} from 'react'

import {supabase} from '../lib/supabase'

import {
    buildMonthlySummaries,
    exportAttendanceExcel,
    getMonthRange,
    type EmployeeMonthlySummary,
    type ReportAttendance,
    type ReportEmployee,
} from '../utils/attendanceReport'

function getVietnamMonth() {
    const parts =
        new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone:
                    'Asia/Ho_Chi_Minh',

                year: 'numeric',
                month: '2-digit',
            },
        ).formatToParts(
            new Date(),
        )

    const year =
        parts.find(
            (item) =>
                item.type === 'year',
        )?.value ?? ''

    const month =
        parts.find(
            (item) =>
                item.type === 'month',
        )?.value ?? ''

    return `${year}-${month}`
}

export default function Reports() {
    const [month, setMonth] =
        useState(
            getVietnamMonth(),
        )

    const [
        employees,
        setEmployees,
    ] = useState<
        ReportEmployee[]
    >([])

    const [
        attendance,
        setAttendance,
    ] = useState<
        ReportAttendance[]
    >([])

    const [loading, setLoading] =
        useState(true)

    const [
        exporting,
        setExporting,
    ] = useState(false)

    const [error, setError] =
        useState<string | null>(
            null,
        )

    useEffect(() => {
        const loadReport =
            async () => {
                setLoading(true)
                setError(null)

                try {
                    const {
                        startDate,
                        endDate,
                    } =
                        getMonthRange(
                            month,
                        )

                    const [
                        employeesResult,
                        attendanceResult,
                    ] =
                        await Promise.all([
                            supabase
                                .from('employees')
                                .select(
                                    `
      id,
      employee_code,
      full_name,
      is_active
    `,
                                )
                                .order(
                                    'employee_code',
                                ),

                            supabase
                                .from(
                                    'attendance',
                                )
                                .select(
                                    `
                    id,
                    employee_id,
                    work_date,
                    check_in,
                    check_out,
                    morning_status,
                    afternoon_status,
                    is_late,
                    note
                  `,
                                )
                                .gte(
                                    'work_date',
                                    startDate,
                                )
                                .lte(
                                    'work_date',
                                    endDate,
                                )
                                .order(
                                    'work_date',
                                ),
                        ])

                    if (
                        employeesResult.error
                    ) {
                        throw employeesResult.error
                    }

                    if (
                        attendanceResult.error
                    ) {
                        throw attendanceResult.error
                    }

                    const allEmployees =
                        (employeesResult.data ??
                            []) as Array<
                            ReportEmployee & {
                            is_active: boolean
                        }
                        >

                    const attendanceData =
                        (attendanceResult.data ??
                            []) as ReportAttendance[]

                    const employeeIdsWithAttendance =
                        new Set(
                            attendanceData.map(
                                (record) =>
                                    record.employee_id,
                            ),
                        )

                    const relevantEmployees =
                        allEmployees.filter(
                            (employee) =>
                                employee.is_active ||
                                employeeIdsWithAttendance.has(
                                    employee.id,
                                ),
                        )

                    setEmployees(
                        relevantEmployees,
                    )

                    setAttendance(
                        attendanceData,
                    )
                } catch (err) {
                    console.error(err)

                    setError(
                        'Không thể tải báo cáo tháng.',
                    )
                } finally {
                    setLoading(false)
                }
            }

        void loadReport()
    }, [month])

    const summaries =
        useMemo<
            EmployeeMonthlySummary[]
        >(
            () =>
                buildMonthlySummaries(
                    employees,
                    attendance,
                ),

            [
                employees,
                attendance,
            ],
        )

    const overall =
        useMemo(() => {
            return summaries.reduce(
                (
                    total,
                    item,
                ) => {
                    total.presentSessions +=
                        item.presentSessions

                    total.workDays +=
                        item.workDays

                    total.approvedLeaveSessions +=
                        item.approvedLeaveSessions

                    total.unapprovedLeaveSessions +=
                        item.unapprovedLeaveSessions

                    total.late +=
                        item.lateCount

                    return total
                },
                {
                    presentSessions: 0,
                    workDays: 0,
                    approvedLeaveSessions: 0,
                    unapprovedLeaveSessions: 0,
                    late: 0,
                },
            )
        }, [summaries])

    const handleExport =
        async () => {
            setExporting(true)
            setError(null)

            try {
                await exportAttendanceExcel(
                    month,
                    employees,
                    attendance,
                )
            } catch (err) {
                console.error(
                    'Excel export error:',
                    err,
                )

                setError(
                    err instanceof Error
                        ? `Không thể tạo file Excel: ${err.message}`
                        : 'Không thể tạo file Excel.',
                )
            } finally {
                setExporting(false)
            }
        }

    const [
        year,
        monthNumber,
    ] = month.split('-')

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        Thống kê
                    </p>

                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                        Báo cáo tháng
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Tổng hợp ngày công,
                        nghỉ phép, nghỉ không
                        phép và đi trễ.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                        type="month"
                        value={month}
                        onChange={(
                            event,
                        ) =>
                            setMonth(
                                event.target.value,
                            )
                        }
                        className="h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <button
                        type="button"
                        onClick={() =>
                            void handleExport()
                        }
                        disabled={
                            loading ||
                            exporting ||
                            employees.length ===
                            0
                        }
                        className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {exporting ? (
                            <Loader2
                                size={18}
                                className="animate-spin"
                            />
                        ) : (
                            <Download
                                size={18}
                            />
                        )}

                        {exporting
                            ? 'Đang tạo Excel...'
                            : 'Xuất Excel'}
                    </button>
                </div>
            </div>

            <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800">
                Báo cáo tháng{' '}
                <strong>
                    {monthNumber}/
                    {year}
                </strong>

                {' — '}

                1 buổi có mặt =
                <strong>
                    {' '}
                    0.5 ngày công
                </strong>
                . Nghỉ có phép được
                thống kê riêng và không
                tự cộng vào ngày công.
            </div>

            {error && (
                <div
                    className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex min-h-80 items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="mx-auto h-9 w-9 animate-spin text-slate-400"/>

                        <p className="mt-4 text-sm font-medium text-slate-500">
                            Đang tổng hợp báo
                            cáo...
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <Users className="mb-4 text-slate-500"/>

                            <p className="text-sm text-slate-500">
                                Nhân viên
                            </p>

                            <p className="mt-1 text-3xl font-bold text-slate-950">
                                {
                                    employees.length
                                }
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <CalendarDays className="mb-4 text-emerald-600"/>

                            <p className="text-sm text-slate-500">
                                Tổng ngày công
                            </p>

                            <p className="mt-1 text-3xl font-bold text-slate-950">
                                {overall.workDays}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <ShieldCheck className="mb-4 text-blue-600"/>

                            <p className="text-sm text-slate-500">
                                Buổi nghỉ phép
                            </p>

                            <p className="mt-1 text-3xl font-bold text-slate-950">
                                {
                                    overall.approvedLeaveSessions
                                }
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <TriangleAlert className="mb-4 text-red-600"/>

                            <p className="text-sm text-slate-500">
                                Buổi không phép
                            </p>

                            <p className="mt-1 text-3xl font-bold text-slate-950">
                                {
                                    overall.unapprovedLeaveSessions
                                }
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <Clock3 className="mb-4 text-amber-600"/>

                            <p className="text-sm text-slate-500">
                                Tổng lần đi trễ
                            </p>

                            <p className="mt-1 text-3xl font-bold text-slate-950">
                                {overall.late}
                            </p>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <div>
                                <h2 className="font-bold text-slate-900">
                                    Tổng hợp nhân viên
                                </h2>

                                <p className="mt-1 text-xs text-slate-400">
                                    Tháng{' '}
                                    {
                                        monthNumber
                                    }
                                    /{year}
                                </p>
                            </div>

                            <FileSpreadsheet className="text-slate-400"/>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1150px]">
                                <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200">
                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                        Nhân viên
                                    </th>

                                    <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                        Buổi có mặt
                                    </th>

                                    <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                        Ngày công
                                    </th>

                                    <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                        Buổi nghỉ phép
                                    </th>

                                    <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                        Ngày nghỉ phép
                                    </th>

                                    <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                        Không phép
                                    </th>

                                    <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                        Đi trễ
                                    </th>
                                </tr>
                                </thead>

                                <tbody>
                                {summaries.map(
                                    (item) => (
                                        <tr
                                            key={
                                                item.employeeId
                                            }
                                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {
                                                        item.fullName
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    {
                                                        item.employeeCode
                                                    }
                                                </p>
                                            </td>

                                            <td className="px-5 py-4 text-center font-semibold text-slate-700">
                                                {
                                                    item.presentSessions
                                                }
                                            </td>

                                            <td className="px-5 py-4 text-center">
                          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700">
                            {
                                item.workDays
                            }
                          </span>
                                            </td>

                                            <td className="px-5 py-4 text-center text-slate-700">
                                                {
                                                    item.approvedLeaveSessions
                                                }
                                            </td>

                                            <td className="px-5 py-4 text-center font-semibold text-blue-700">
                                                {
                                                    item.approvedLeaveDays
                                                }
                                            </td>

                                            <td className="px-5 py-4 text-center font-semibold text-red-600">
                                                {
                                                    item.unapprovedLeaveSessions
                                                }
                                            </td>

                                            <td className="px-5 py-4 text-center">
                                                {item.lateCount >
                                                0 ? (
                                                    <span
                                                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                              <Clock3
                                  size={13}
                              />

                                                        {
                                                            item.lateCount
                                                        }
                            </span>
                                                ) : (
                                                    <span className="text-slate-300">
                              0
                            </span>
                                                )}
                                            </td>
                                        </tr>
                                    ),
                                )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </div>
    )
}