import {
    CalendarDays,
    Clock3,
    Loader2,
    UserRoundCheck,
    UserRoundX,
    Users,
} from 'lucide-react'
import {
    useEffect,
    useMemo,
    useState,
} from 'react'
import {useNavigate} from 'react-router-dom'

import {supabase} from '../lib/supabase'

type AttendanceStatus =
    | 'pending'
    | 'present'
    | 'approved_leave'
    | 'unapproved_leave'

interface DashboardStats {
    employees: number
    present: number
    late: number
    absent: number
}

interface Employee {
    id: string
    full_name: string
    is_active: boolean
}

interface AttendanceRecord {
    employee_id: string
    work_date: string
    morning_status: AttendanceStatus
    afternoon_status: AttendanceStatus
    is_late: boolean
}

interface AbsentPerson {
    employeeId: string
    name: string
    label: string
}

interface DaySummary {
    present: number
    late: number
    absent: number
    absentPeople: AbsentPerson[]
}

function getVietnamDate() {
    return new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
    })
}

function getMonthInfo() {
    const today = getVietnamDate()
    const [year, month] = today
        .split('-')
        .map(Number)

    const lastDay = new Date(
        year,
        month,
        0,
    ).getDate()

    return {
        year,
        month,
        today,
        startDate:
            String(year) +
            '-' +
            String(month).padStart(2, '0') +
            '-01',
        endDate:
            String(year) +
            '-' +
            String(month).padStart(2, '0') +
            '-' +
            String(lastDay).padStart(2, '0'),
        lastDay,
    }
}

function isLeave(status: AttendanceStatus) {
    return (
        status === 'approved_leave' ||
        status === 'unapproved_leave'
    )
}

function getLeaveLabel(
    morningStatus: AttendanceStatus,
    afternoonStatus: AttendanceStatus,
) {
    const morningLeave = isLeave(
        morningStatus,
    )
    const afternoonLeave = isLeave(
        afternoonStatus,
    )

    if (morningLeave && afternoonLeave) {
        return 'Nghỉ cả ngày'
    }

    if (morningLeave) {
        return 'Nghỉ buổi sáng'
    }

    return 'Nghỉ buổi chiều'
}

function getDateKey(
    year: number,
    month: number,
    day: number,
) {
    return (
        String(year) +
        '-' +
        String(month).padStart(2, '0') +
        '-' +
        String(day).padStart(2, '0')
    )
}

function formatDate(date: string) {
    const [year, month, day] =
        date.split('-')

    return day + '/' + month + '/' + year
}

const weekDays = [
    'Thứ 2',
    'Thứ 3',
    'Thứ 4',
    'Thứ 5',
    'Thứ 6',
    'Thứ 7',
    'CN',
]

const emptyDaySummary: DaySummary = {
    present: 0,
    late: 0,
    absent: 0,
    absentPeople: [],
}

export default function Dashboard() {
    const navigate = useNavigate()

    const monthInfo = useMemo(
        () => getMonthInfo(),
        [],
    )

    const [stats, setStats] =
        useState<DashboardStats>({
            employees: 0,
            present: 0,
            late: 0,
            absent: 0,
        })

    const [daySummaries, setDaySummaries] =
        useState<Record<string, DaySummary>>(
            {},
        )

    const [loading, setLoading] =
        useState(true)

    const [error, setError] =
        useState<string | null>(null)

    useEffect(() => {
        const loadDashboard = async () => {
            setLoading(true)
            setError(null)

            try {
                const [
                    employeesResult,
                    attendanceResult,
                ] = await Promise.all([
                    supabase
                        .from('employees')
                        .select(
                            'id, full_name, is_active',
                        ),

                    supabase
                        .from('attendance')
                        .select(
                            [
                                'employee_id',
                                'work_date',
                                'morning_status',
                                'afternoon_status',
                                'is_late',
                            ].join(','),
                        )
                        .gte(
                            'work_date',
                            monthInfo.startDate,
                        )
                        .lte(
                            'work_date',
                            monthInfo.endDate,
                        ),
                ])

                if (employeesResult.error) {
                    throw employeesResult.error
                }

                if (attendanceResult.error) {
                    throw attendanceResult.error
                }

                const employees =
                    (employeesResult.data ??
                        []) as Employee[]

                const attendance =
                    (attendanceResult.data ??
                        []) as AttendanceRecord[]

                const employeeNames =
                    new Map(
                        employees.map(
                            (employee) => [
                                employee.id,
                                employee.full_name,
                            ],
                        ),
                    )

                const grouped: Record<
                    string,
                    {
                        presentIds: Set<string>
                        lateIds: Set<string>
                        absentPeople: Map<
                            string,
                            AbsentPerson
                        >
                    }
                > = {}

                attendance.forEach((record) => {
                    if (!grouped[record.work_date]) {
                        grouped[record.work_date] = {
                            presentIds:
                                new Set<string>(),
                            lateIds:
                                new Set<string>(),
                            absentPeople:
                                new Map<
                                    string,
                                    AbsentPerson
                                >(),
                        }
                    }

                    const day =
                        grouped[record.work_date]

                    if (
                        record.morning_status ===
                            'present' ||
                        record.afternoon_status ===
                            'present'
                    ) {
                        day.presentIds.add(
                            record.employee_id,
                        )
                    }

                    if (record.is_late) {
                        day.lateIds.add(
                            record.employee_id,
                        )
                    }

                    if (
                        isLeave(
                            record.morning_status,
                        ) ||
                        isLeave(
                            record.afternoon_status,
                        )
                    ) {
                        day.absentPeople.set(
                            record.employee_id,
                            {
                                employeeId:
                                    record.employee_id,
                                name:
                                    employeeNames.get(
                                        record.employee_id,
                                    ) ??
                                    'Nhân viên',
                                label: getLeaveLabel(
                                    record.morning_status,
                                    record.afternoon_status,
                                ),
                            },
                        )
                    }
                })

                const summaries =
                    Object.fromEntries(
                        Object.entries(
                            grouped,
                        ).map(
                            ([date, day]) => [
                                date,
                                {
                                    present:
                                        day.presentIds
                                            .size,
                                    late:
                                        day.lateIds
                                            .size,
                                    absent:
                                        day
                                            .absentPeople
                                            .size,
                                    absentPeople:
                                        Array.from(
                                            day.absentPeople.values(),
                                        ).sort(
                                            (a, b) =>
                                                a.name.localeCompare(
                                                    b.name,
                                                    'vi',
                                                ),
                                        ),
                                } satisfies DaySummary,
                            ],
                        ),
                    )

                setDaySummaries(summaries)

                const todaySummary =
                    summaries[
                        monthInfo.today
                    ] ?? emptyDaySummary

                setStats({
                    employees:
                        employees.filter(
                            (employee) =>
                                employee.is_active,
                        ).length,
                    present:
                        todaySummary.present,
                    late:
                        todaySummary.late,
                    absent:
                        todaySummary.absent,
                })
            } catch (err) {
                console.error(err)

                setError(
                    'Không thể tải dữ liệu Dashboard.',
                )
            } finally {
                setLoading(false)
            }
        }

        void loadDashboard()
    }, [monthInfo])

    const cards = [
        {
            title: 'Tổng nhân viên',
            value: stats.employees,
            icon: Users,
        },
        {
            title: 'Có mặt hôm nay',
            value: stats.present,
            icon: UserRoundCheck,
        },
        {
            title: 'Đi trễ',
            value: stats.late,
            icon: Clock3,
        },
        {
            title: 'Nghỉ hôm nay',
            value: stats.absent,
            icon: UserRoundX,
        },
    ]

    const firstDayOffset =
        (
            new Date(
                Date.UTC(
                    monthInfo.year,
                    monthInfo.month - 1,
                    1,
                ),
            ).getUTCDay() +
            6
        ) %
        7

    const calendarCells = [
        ...Array.from(
            {length: firstDayOffset},
            () => null,
        ),
        ...Array.from(
            {length: monthInfo.lastDay},
            (_, index) => index + 1,
        ),
    ]

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <p className="text-sm font-medium text-slate-500">
                    Tổng quan
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                    Dashboard
                </h1>
            </div>

            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex min-h-72 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400"/>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {cards.map((item) => {
                            const Icon = item.icon

                            return (
                                <div
                                    key={item.title}
                                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-500">
                                                {item.title}
                                            </p>

                                            <p className="mt-3 text-3xl font-bold text-slate-950">
                                                {item.value}
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                                            <Icon size={22}/>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <CalendarDays
                                        size={20}
                                        className="text-slate-500"
                                    />

                                    <h2 className="text-lg font-bold text-slate-950">
                                        Lịch chấm công tháng {String(monthInfo.month).padStart(2, '0')}/{monthInfo.year}
                                    </h2>
                                </div>

                                <p className="mt-1 text-sm text-slate-500">
                                    Di chuột vào ngày để xem nhanh. Click vào ngày để mở bảng chấm công chi tiết.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500"/>
                                    Đi làm
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-amber-500"/>
                                    Tới trễ
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-rose-500"/>
                                    Vắng
                                </span>
                            </div>
                        </div>

                        <div className="min-w-[760px]">
                            <div className="grid grid-cols-7 border-l border-t border-slate-200 bg-slate-50">
                                {weekDays.map((day) => (
                                    <div
                                        key={day}
                                        className="border-b border-r border-slate-200 px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 border-l border-slate-200">
                                {calendarCells.map(
                                    (
                                        day,
                                        cellIndex,
                                    ) => {
                                        if (day === null) {
                                            return (
                                                <div
                                                    key={'empty-' + cellIndex}
                                                    className="min-h-32 border-b border-r border-slate-200 bg-slate-50/50"
                                                />
                                            )
                                        }

                                        const date =
                                            getDateKey(
                                                monthInfo.year,
                                                monthInfo.month,
                                                day,
                                            )

                                        const summary =
                                            daySummaries[
                                                date
                                            ] ??
                                            emptyDaySummary

                                        const isToday =
                                            date ===
                                            monthInfo.today

                                        const column =
                                            cellIndex % 7

                                        const tooltipPosition =
                                            column === 0
                                                ? 'left-2'
                                                : column ===
                                                    6
                                                  ? 'right-2'
                                                  : 'left-1/2 -translate-x-1/2'

                                        return (
                                            <button
                                                key={date}
                                                type="button"
                                                onClick={() =>
                                                    navigate(
                                                        '/attendance?date=' +
                                                            date,
                                                    )
                                                }
                                                className={
                                                    'group relative min-h-32 cursor-pointer border-b border-r border-slate-200 p-3 text-left transition hover:z-30 hover:bg-slate-50 focus:z-30 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400 ' +
                                                    (isToday
                                                        ? 'bg-blue-50/60'
                                                        : 'bg-white')
                                                }
                                                aria-label={
                                                    'Mở chấm công ngày ' +
                                                    formatDate(
                                                        date,
                                                    )
                                                }
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span
                                                        className={
                                                            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ' +
                                                            (isToday
                                                                ? 'bg-slate-950 text-white'
                                                                : 'text-slate-800')
                                                        }
                                                    >
                                                        {day}
                                                    </span>

                                                    {isToday && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                                                            Hôm nay
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-3 space-y-1.5">
                                                    <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                                        <span>Đi làm</span>
                                                        <span>{summary.present}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                                                        <span>Tới trễ</span>
                                                        <span>{summary.late}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                                                        <span>Vắng</span>
                                                        <span>{summary.absent}</span>
                                                    </div>
                                                </div>

                                                <div
                                                    className={
                                                        'pointer-events-none invisible absolute top-[calc(100%-8px)] z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 opacity-0 shadow-2xl transition-all duration-150 group-hover:visible group-hover:translate-y-2 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-y-2 group-focus-visible:opacity-100 ' +
                                                        tooltipPosition
                                                    }
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                                Chi tiết ngày
                                                            </p>
                                                            <p className="mt-0.5 text-base font-bold text-slate-950">
                                                                {formatDate(
                                                                    date,
                                                                )}
                                                            </p>
                                                        </div>

                                                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                                                            Click để mở
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                                        <div className="rounded-xl bg-emerald-50 p-2 text-center">
                                                            <p className="text-[10px] font-semibold text-emerald-600">
                                                                Đi làm
                                                            </p>
                                                            <p className="mt-0.5 text-lg font-bold text-emerald-700">
                                                                {summary.present}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-xl bg-amber-50 p-2 text-center">
                                                            <p className="text-[10px] font-semibold text-amber-600">
                                                                Tới trễ
                                                            </p>
                                                            <p className="mt-0.5 text-lg font-bold text-amber-700">
                                                                {summary.late}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-xl bg-rose-50 p-2 text-center">
                                                            <p className="text-[10px] font-semibold text-rose-600">
                                                                Vắng
                                                            </p>
                                                            <p className="mt-0.5 text-lg font-bold text-rose-700">
                                                                {summary.absent}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 border-t border-slate-100 pt-3">
                                                        <p className="text-xs font-bold text-slate-700">
                                                            Nhân viên vắng
                                                        </p>

                                                        {summary.absentPeople.length > 0 ? (
                                                            <div className="mt-2 space-y-1.5">
                                                                {summary.absentPeople.map(
                                                                    (
                                                                        person,
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                person.employeeId
                                                                            }
                                                                            className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-2"
                                                                        >
                                                                            <span className="text-xs font-semibold text-slate-700">
                                                                                {
                                                                                    person.name
                                                                                }
                                                                            </span>

                                                                            <span className="shrink-0 text-[10px] font-medium text-slate-400">
                                                                                {
                                                                                    person.label
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="mt-2 text-xs text-slate-400">
                                                                Không có nhân viên vắng được ghi nhận.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    },
                                )}
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    )
}
