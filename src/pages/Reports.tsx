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
    type ReportOvertime,
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

type ReportRangeMode =
    | 'month'
    | 'weeks'

interface ReportWeek {
    index: number
    startDate: string
    endDate: string
    dates: string[]
    label: string
}

function formatShortDate(
    value: string,
) {
    const [, month, day] =
        value.split('-')

    return `${day}/${month}`
}

function getMonthWeeks(
    monthValue: string,
): ReportWeek[] {
    const {
        daysInMonth,
    } = getMonthRange(
        monthValue,
    )

    const [year, month] =
        monthValue
            .split('-')
            .map(Number)

    const groups: string[][] = []

    for (
        let day = 1;
        day <= daysInMonth;
        day += 1
    ) {
        const date =
            `${monthValue}-${String(
                day,
            ).padStart(2, '0')}`

        const dayOfWeek =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day,
                ),
            ).getUTCDay()

        if (
            groups.length === 0 ||
            dayOfWeek === 1
        ) {
            groups.push([])
        }

        groups[
            groups.length - 1
        ].push(date)
    }

    return groups.map(
        (dates, index) => ({
            index,
            startDate: dates[0],
            endDate:
                dates[
                    dates.length - 1
                ],
            dates,
            label:
                `Tuần ${index + 1}: ${formatShortDate(
                    dates[0],
                )} - ${formatShortDate(
                    dates[
                        dates.length - 1
                    ],
                )}`,
        }),
    )
}

export default function Reports() {
    const [month, setMonth] =
        useState(
            getVietnamMonth(),
        )

    const [
        rangeMode,
        setRangeMode,
    ] = useState<ReportRangeMode>(
        'month',
    )

    const [
        selectedWeekIndexes,
        setSelectedWeekIndexes,
    ] = useState<number[]>([0])

    const [
        employees,
        setEmployees,
    ] = useState<
        ReportEmployee[]
    >([])

    const [attendance, setAttendance] = useState<ReportAttendance[]>([])

    const [overtime, setOvertime] = useState<ReportOvertime[]>([])

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

    const monthWeeks =
        useMemo(
            () =>
                getMonthWeeks(
                    month,
                ),
            [month],
        )

    useEffect(() => {
        setSelectedWeekIndexes([0])
    }, [month])

    const selectedDates =
        useMemo(() => {
            if (
                rangeMode ===
                'month'
            ) {
                return monthWeeks.flatMap(
                    (week) =>
                        week.dates,
                )
            }

            const selectedSet =
                new Set(
                    selectedWeekIndexes,
                )

            return monthWeeks
                .filter(
                    (week) =>
                        selectedSet.has(
                            week.index,
                        ),
                )
                .flatMap(
                    (week) =>
                        week.dates,
                )
        }, [
            monthWeeks,
            rangeMode,
            selectedWeekIndexes,
        ])

    const filteredAttendance =
        useMemo(() => {
            const dateSet =
                new Set(
                    selectedDates,
                )

            return attendance.filter(
                (record) =>
                    dateSet.has(
                        record.work_date,
                    ),
            )
        }, [
            attendance,
            selectedDates,
        ])

    const periodLabel =
        useMemo(() => {
            const [
                periodYear,
                periodMonth,
            ] = month.split('-')

            if (
                rangeMode ===
                'month'
            ) {
                return `Tháng ${periodMonth}/${periodYear}`
            }

            const selectedSet =
                new Set(
                    selectedWeekIndexes,
                )

            const labels =
                monthWeeks
                    .filter(
                        (week) =>
                            selectedSet.has(
                                week.index,
                            ),
                    )
                    .map(
                        (week) =>
                            `Tuần ${week.index + 1}`,
                    )

            if (labels.length === 0) {
                return `Chưa chọn tuần · Tháng ${periodMonth}/${periodYear}`
            }

            return `${labels.join(
                ', ',
            )} · Tháng ${periodMonth}/${periodYear}`
        }, [
            month,
            monthWeeks,
            rangeMode,
            selectedWeekIndexes,
        ])

    const toggleWeek = (
        weekIndex: number,
    ) => {
        setSelectedWeekIndexes(
            (current) =>
                current.includes(
                    weekIndex,
                )
                    ? current.filter(
                        (item) =>
                            item !==
                            weekIndex,
                    )
                    : [
                        ...current,
                        weekIndex,
                    ].sort(
                        (a, b) =>
                            a - b,
                    ),
        )
    }

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
                        overtimeResult,
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

                            supabase
                                .from('overtime_records')
                                .select('id, employee_id, overtime_date, overtime_end_time, overtime_base_time, overtime_minutes, note')
                                .gte('overtime_date', startDate)
                                .lte('overtime_date', endDate)
                                .order('overtime_date'),
                        ])

                    if (
                        employeesResult.error
                    ) {
                        throw employeesResult.error
                    }

                    if (attendanceResult.error) {
                        throw attendanceResult.error
                    }

                    if (overtimeResult.error) {
                        throw overtimeResult.error
                    }

                    const allEmployees =
                        (employeesResult.data ??
                            []) as Array<
                            ReportEmployee & {
                            is_active: boolean
                        }
                        >

                    const attendanceData =
                        (attendanceResult.data ?? []) as ReportAttendance[]

                    const overtimeData =
                        (overtimeResult.data ?? []) as ReportOvertime[]

                    setEmployees(allEmployees)
                    setAttendance(attendanceData)
                    setOvertime(overtimeData)
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
                    filteredAttendance,
                ),

            [
                employees,
                filteredAttendance,
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
                const {
                    data: settingsData,
                    error: settingsError,
                } = await supabase
                    .from('company_settings')
                    .select('late_after_time')
                    .eq('id', 1)
                    .maybeSingle()

                if (settingsError) {
                    throw settingsError
                }

                const lateAfterTime =
                    settingsData
                        ?.late_after_time
                        ?.slice(0, 5) ??
                    '07:35'

                await exportAttendanceExcel(
                    month,
                    employees,
                    attendance,
                    lateAfterTime,
                    rangeMode ===
                    'weeks'
                        ? selectedDates
                        : undefined,
                    periodLabel,
                    overtime,
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

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        Thống kê
                    </p>

                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                        Báo cáo chấm công
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Lọc theo tháng hoặc
                        chọn một hay nhiều tuần
                        trước khi xuất Excel.
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
                            0 ||
                            (
                                rangeMode ===
                                'weeks' &&
                                selectedDates.length ===
                                0
                            )
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
                            : rangeMode ===
                              'month'
                              ? 'Xuất Excel tháng'
                              : 'Xuất Excel đã lọc'}
                    </button>
                </div>
            </div>

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-900">
                            Phạm vi báo cáo
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Chọn cả tháng hoặc một / nhiều tuần trong tháng.
                        </p>
                    </div>

                    <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() =>
                                setRangeMode(
                                    'month',
                                )
                            }
                            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                rangeMode ===
                                'month'
                                    ? 'bg-white text-slate-950 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Cả tháng
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setRangeMode(
                                    'weeks',
                                )
                            }
                            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                rangeMode ===
                                'weeks'
                                    ? 'bg-white text-slate-950 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Theo tuần
                        </button>
                    </div>
                </div>

                {rangeMode ===
                    'weeks' && (
                    <div className="mt-5 border-t border-slate-100 pt-5">
                        <div className="flex flex-wrap gap-2">
                            {monthWeeks.map(
                                (week) => {
                                    const selected =
                                        selectedWeekIndexes.includes(
                                            week.index,
                                        )

                                    return (
                                        <button
                                            key={
                                                week.index
                                            }
                                            type="button"
                                            onClick={() =>
                                                toggleWeek(
                                                    week.index,
                                                )
                                            }
                                            className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition ${
                                                selected
                                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span className="block text-sm font-bold">
                                                Tuần{' '}
                                                {
                                                    week.index +
                                                    1
                                                }
                                            </span>

                                            <span className="mt-0.5 block text-xs">
                                                {formatShortDate(
                                                    week.startDate,
                                                )}
                                                {' → '}
                                                {formatShortDate(
                                                    week.endDate,
                                                )}
                                            </span>
                                        </button>
                                    )
                                },
                            )}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedWeekIndexes(
                                        monthWeeks.map(
                                            (
                                                week,
                                            ) =>
                                                week.index,
                                        ),
                                    )
                                }
                                className="cursor-pointer font-bold text-emerald-700 hover:text-emerald-800"
                            >
                                Chọn tất cả tuần
                            </button>

                            <span className="text-slate-300">
                                |
                            </span>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedWeekIndexes(
                                        [],
                                    )
                                }
                                className="cursor-pointer font-bold text-slate-500 hover:text-slate-700"
                            >
                                Bỏ chọn
                            </button>
                        </div>
                    </div>
                )}
            </section>

            <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800">
                Đang xem:{' '}
                <strong>
                    {periodLabel}
                </strong>

                {' — '}

                {selectedDates.length}{' '}
                ngày trong phạm vi báo cáo.
                {' '}

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
                                    {
                                        periodLabel
                                    }
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