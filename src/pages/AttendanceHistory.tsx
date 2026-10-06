import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    Edit3,
    Loader2,
    Save,
    Timer,
    X,
} from 'lucide-react'
import {
    useEffect,
    useMemo,
    useState,
} from 'react'

import TimeInput from '../components/ui/TimeInput'
import Toast from '../components/ui/Toast'
import {supabase} from '../lib/supabase'
import {isValid24HourTime} from '../utils/time24'

type AttendanceStatus =
    | 'pending'
    | 'present'
    | 'approved_leave'
    | 'unapproved_leave'

interface Employee {
    id: string
    employee_code: string
    full_name: string
    is_active: boolean
}

interface AttendanceRecord {
    id: string
    employee_id: string
    work_date: string
    check_in: string | null
    check_out: string | null
    morning_status: AttendanceStatus
    afternoon_status: AttendanceStatus
    is_late: boolean
    note: string | null
    employees: {
        employee_code: string
        full_name: string
    } | null
}

interface EditRow {
    employee: Employee
    attendanceId?: string
    checkIn: string
    checkOut: string
    morningStatus: AttendanceStatus
    afternoonStatus: AttendanceStatus
    isLate: boolean
    note: string
}

interface OvertimeRecord {
    id: string
    employee_id: string
    overtime_date: string
    overtime_end_time: string
    overtime_minutes: number
    note: string | null
}

interface DailySheet {
    workDate: string
    records: AttendanceRecord[]
    workingCount: number
    overtimePeople: {
        employeeId: string
        employeeName: string
        employeeCode: string
        minutes: number
        endTime: string
    }[]
    leavePeople: {
        employeeId: string
        employeeName: string
        employeeCode: string
        label: string
        tone:
            | 'approved'
            | 'unapproved'
    }[]
}

const statusOptions: {
    value: AttendanceStatus
    label: string
}[] = [
    {
        value: 'pending',
        label: 'Chưa chấm',
    },
    {
        value: 'present',
        label: 'Có mặt',
    },
    {
        value: 'approved_leave',
        label: 'Nghỉ có phép',
    },
    {
        value: 'unapproved_leave',
        label: 'Nghỉ không phép',
    },
]

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
        )?.value

    const month =
        parts.find(
            (item) =>
                item.type === 'month',
        )?.value

    return `${year}-${month}`
}

function getMonthRange(
    monthValue: string,
) {
    const [year, month] =
        monthValue
            .split('-')
            .map(Number)

    const lastDay =
        new Date(
            year,
            month,
            0,
        ).getDate()

    return {
        startDate:
            `${monthValue}-01`,

        endDate:
            `${monthValue}-${String(
                lastDay,
            ).padStart(2, '0')}`,
    }
}

function formatDate(
    date: string,
) {
    const [
        year,
        month,
        day,
    ] = date.split('-')

    return `${day}/${month}/${year}`
}

function getLeaveLabel(
    record: AttendanceRecord,
) {
    const morning =
        record.morning_status

    const afternoon =
        record.afternoon_status

    if (
        morning ===
            'approved_leave' &&
        afternoon ===
            'approved_leave'
    ) {
        return {
            label:
                'Nghỉ cả ngày có phép',
            tone:
                'approved' as const,
        }
    }

    if (
        morning ===
            'unapproved_leave' &&
        afternoon ===
            'unapproved_leave'
    ) {
        return {
            label:
                'Nghỉ cả ngày không phép',
            tone:
                'unapproved' as const,
        }
    }

    if (
        morning ===
        'approved_leave'
    ) {
        return {
            label:
                'Nghỉ sáng có phép',
            tone:
                'approved' as const,
        }
    }

    if (
        morning ===
        'unapproved_leave'
    ) {
        return {
            label:
                'Nghỉ sáng không phép',
            tone:
                'unapproved' as const,
        }
    }

    if (
        afternoon ===
        'approved_leave'
    ) {
        return {
            label:
                'Nghỉ chiều có phép',
            tone:
                'approved' as const,
        }
    }

    if (
        afternoon ===
        'unapproved_leave'
    ) {
        return {
            label:
                'Nghỉ chiều không phép',
            tone:
                'unapproved' as const,
        }
    }

    return null
}

export default function AttendanceHistory() {
    const [month, setMonth] =
        useState(
            getVietnamMonth(),
        )

    const [
        specificDate,
        setSpecificDate,
    ] = useState('')

    const [records, setRecords] = useState<AttendanceRecord[]>([])
    
    const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([])

    const [
        employees,
        setEmployees,
    ] = useState<Employee[]>([])

    const [
        lateAfterTime,
        setLateAfterTime,
    ] = useState('07:35')

    const [
        loading,
        setLoading,
    ] = useState(true)

    const [
        loadingEdit,
        setLoadingEdit,
    ] = useState(false)

    const [
        saving,
        setSaving,
    ] = useState(false)

    const [
        editDate,
        setEditDate,
    ] = useState<string | null>(
        null,
    )

    const [
        editRows,
        setEditRows,
    ] = useState<EditRow[]>([])

    const [
        error,
        setError,
    ] = useState<string | null>(
        null,
    )

    const [
        success,
        setSuccess,
    ] = useState<string | null>(
        null,
    )

    useEffect(() => {
        setSpecificDate('')
    }, [month])

    const loadHistory =
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
                    historyResult,
                    employeeResult,
                    settingsResult,
                    overtimeResult,
                ] =
                    await Promise.all([
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
                                    note,
                                    employees (
                                        employee_code,
                                        full_name
                                    )
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
                                {
                                    ascending:
                                        false,
                                },
                            ),

                        supabase
                            .from(
                                'employees',
                            )
                            .select(
                                'id, employee_code, full_name, is_active',
                            )
                            .order(
                                'employee_code',
                            ),

                        supabase
                            .from(
                                'company_settings',
                            )
                            .select(
                                'late_after_time',
                            )
                            .eq(
                                'id',
                                1,
                            )
                            .maybeSingle(),

                        supabase
                            .from('overtime_records')
                            .select('id, employee_id, overtime_date, overtime_end_time, overtime_minutes, note')
                            .gte('overtime_date', startDate)
                            .lte('overtime_date', endDate)
                            .order('overtime_date'),
                    ])

                if (
                    historyResult.error
                ) {
                    throw historyResult.error
                }

                if (
                    employeeResult.error
                ) {
                    throw employeeResult.error
                }

                if (settingsResult.error) {
                    throw settingsResult.error
                }

                if (overtimeResult.error) {
                    throw overtimeResult.error
                }

                setRecords(
                    (historyResult.data ??
                        []) as unknown as AttendanceRecord[],
                )

                setEmployees(
                    (employeeResult.data ?? []) as Employee[],
                )

                setOvertimeRecords(
                    (overtimeResult.data ?? []) as OvertimeRecord[],
                )

                if (
                    settingsResult.data
                        ?.late_after_time
                ) {
                    setLateAfterTime(
                        settingsResult.data
                            .late_after_time
                            .slice(
                                0,
                                5,
                            ),
                    )
                }
            } catch (err) {
                console.error(err)

                setError(
                    'Không thể tải lịch sử chấm công.',
                )
            } finally {
                setLoading(false)
            }
        }

    useEffect(() => {
        void loadHistory()
    }, [month])

    const dailySheets =
        useMemo(() => {
            const grouped =
                new Map<
                    string,
                    AttendanceRecord[]
                >()

            records.forEach(
                (record) => {
                    if (
                        specificDate &&
                        record.work_date !==
                            specificDate
                    ) {
                        return
                    }

                    const current =
                        grouped.get(
                            record.work_date,
                        ) ?? []

                    current.push(
                        record,
                    )

                    grouped.set(
                        record.work_date,
                        current,
                    )
                },
            )

            return Array.from(
                grouped.entries(),
            )
                .map(
                    ([
                        workDate,
                        dayRecords,
                    ]): DailySheet => {
                        const workingCount =
                            dayRecords.filter(
                                (record) =>
                                    record.morning_status ===
                                        'present' ||
                                    record.afternoon_status ===
                                        'present',
                            ).length

                        const leavePeople =
                            dayRecords.flatMap(
                                (record) => {
                                    const leave =
                                        getLeaveLabel(
                                            record,
                                        )

                                    if (
                                        !leave
                                    ) {
                                        return []
                                    }

                                    return [
                                        {
                                            employeeId:
                                                record.employee_id,

                                            employeeName:
                                                record
                                                    .employees
                                                    ?.full_name ??
                                                'Không xác định',

                                            employeeCode:
                                                record
                                                    .employees
                                                    ?.employee_code ??
                                                '---',

                                            ...leave,
                                        },
                                    ]
                                },
                            )

                        const overtimePeople =
                            overtimeRecords
                                .filter((record) => record.overtime_date === workDate)
                                .map((record) => {
                                    const employee = employees.find(
                                        (item) => item.id === record.employee_id,
                                    )

                                    return {
                                        employeeId: record.employee_id,
                                        employeeName: employee?.full_name ?? 'Không xác định',
                                        employeeCode: employee?.employee_code ?? '---',
                                        minutes: record.overtime_minutes,
                                        endTime: record.overtime_end_time.slice(0, 5),
                                    }
                                })
                                .sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'vi'))

                        return {
                            workDate,
                            records: dayRecords,
                            workingCount,
                            overtimePeople,
                            leavePeople,
                        }
                    },
                )
                .sort(
                    (a, b) =>
                        b.workDate.localeCompare(
                            a.workDate,
                        ),
                )
        }, [
            records,
            overtimeRecords,
            employees,
            specificDate,
        ])

    const monthSummary = useMemo(
        () => ({
            sheets: dailySheets.length,
        }),
        [dailySheets],
    )

    const openEditSheet =
        async (
            workDate: string,
        ) => {
            setEditDate(workDate)
            setLoadingEdit(true)
            setError(null)
            setSuccess(null)

            try {
                const {
                    data,
                    error:
                        attendanceError,
                } = await supabase
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
                    .eq(
                        'work_date',
                        workDate,
                    )

                if (
                    attendanceError
                ) {
                    throw attendanceError
                }

                const byEmployee =
                    new Map(
                        (
                            data ??
                            []
                        ).map(
                            (
                                attendance,
                            ) => [
                                attendance.employee_id,
                                attendance,
                            ],
                        ),
                    )

                setEditRows(
                    employees.map(
                        (employee) => {
                            const attendance =
                                byEmployee.get(
                                    employee.id,
                                )

                            return {
                                employee,

                                attendanceId:
                                    attendance?.id,

                                checkIn:
                                    attendance
                                        ?.check_in
                                        ?.slice(
                                            0,
                                            5,
                                        ) ??
                                    '',

                                checkOut:
                                    attendance
                                        ?.check_out
                                        ?.slice(
                                            0,
                                            5,
                                        ) ??
                                    '',

                                morningStatus:
                                    (attendance
                                        ?.morning_status ??
                                        'pending') as AttendanceStatus,

                                afternoonStatus:
                                    (attendance
                                        ?.afternoon_status ??
                                        'pending') as AttendanceStatus,

                                isLate:
                                    attendance
                                        ?.is_late ??
                                    false,

                                note:
                                    attendance
                                        ?.note ??
                                    '',
                            }
                        },
                    ),
                )
            } catch (err) {
                console.error(err)

                setError(
                    'Không thể mở phiếu chấm công.',
                )

                setEditDate(
                    null,
                )
            } finally {
                setLoadingEdit(
                    false,
                )
            }
        }

    const updateEditRow = (
        employeeId: string,
        patch:
            Partial<
                Omit<
                    EditRow,
                    'employee'
                >
            >,
    ) => {
        setEditRows(
            (current) =>
                current.map(
                    (row) =>
                        row.employee.id ===
                        employeeId
                            ? {
                                  ...row,
                                  ...patch,
                              }
                            : row,
                ),
        )
    }

    const saveSheet =
        async () => {
            if (!editDate) {
                return
            }

            for (
                const row of editRows
            ) {
                if (
                    row.morningStatus ===
                        'present' &&
                    !row.checkIn
                ) {
                    setError(
                        `${row.employee.full_name}: đã chọn Có mặt buổi sáng nhưng chưa nhập giờ vào.`,
                    )
                    return
                }

                if (
                    row.morningStatus ===
                        'present' &&
                    !isValid24HourTime(
                        row.checkIn,
                    )
                ) {
                    setError(
                        `${row.employee.full_name}: giờ vào phải theo định dạng 24H HH:mm, ví dụ 07:30.`,
                    )
                    return
                }

                if (
                    row.checkOut &&
                    !isValid24HourTime(
                        row.checkOut,
                    )
                ) {
                    setError(
                        `${row.employee.full_name}: giờ về phải theo định dạng 24H HH:mm, ví dụ 17:00.`,
                    )
                    return
                }
            }

            setSaving(true)
            setError(null)

            try {
                const payload =
                    editRows.map(
                        (row) => ({
                            employee_id:
                                row.employee
                                    .id,

                            work_date:
                                editDate,

                            check_in:
                                row.morningStatus ===
                                'present'
                                    ? row.checkIn ||
                                      null
                                    : null,

                            check_out:
                                row.morningStatus ===
                                    'present' ||
                                row.afternoonStatus ===
                                    'present'
                                    ? row.checkOut ||
                                      null
                                    : null,

                            morning_status:
                                row.morningStatus,

                            afternoon_status:
                                row.afternoonStatus,

                            note:
                                row.note
                                    .trim() ||
                                null,
                        }),
                    )

                const {
                    error:
                        saveError,
                } = await supabase
                    .from(
                        'attendance',
                    )
                    .upsert(
                        payload,
                        {
                            onConflict:
                                'employee_id,work_date',
                        },
                    )

                if (saveError) {
                    throw saveError
                }

                const savedDate =
                    editDate

                setEditDate(null)
                setEditRows([])

                setSuccess(
                    `Đã cập nhật phiếu chấm công ngày ${formatDate(
                        savedDate,
                    )}.`,
                )

                await loadHistory()
            } catch (err) {
                console.error(err)

                setError(
                    'Không thể lưu phiếu chấm công.',
                )
            } finally {
                setSaving(false)
            }
        }

    return (
        <div className="p-6 lg:p-8">
            <Toast
                message={success}
                duration={3000}
                onClose={() =>
                    setSuccess(null)
                }
            />

            <div className="mb-8">
                <p className="text-sm font-medium text-slate-500">
                    Chấm công
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                    Lịch sử chấm công
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    Mỗi ngày được hiển thị thành một phiếu tóm tắt.
                </p>
            </div>

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Tháng
                        </label>

                        <input
                            type="month"
                            value={month}
                            onChange={(event) =>
                                setMonth(
                                    event.target.value,
                                )
                            }
                            className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Ngày cụ thể
                        </label>

                        <input
                            type="date"
                            value={
                                specificDate
                            }
                            min={`${month}-01`}
                            max={
                                getMonthRange(
                                    month,
                                ).endDate
                            }
                            onChange={(event) =>
                                setSpecificDate(
                                    event.target.value,
                                )
                            }
                            className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                    </div>
                </div>

                {specificDate && (
                    <button
                        type="button"
                        onClick={() =>
                            setSpecificDate(
                                '',
                            )
                        }
                        className="mt-4 cursor-pointer text-xs font-semibold text-slate-500 transition hover:text-slate-900"
                    >
                        Xóa lọc ngày cụ thể
                    </button>
                )}
            </section>

            <section className="mb-6">
                <div className="w-full rounded-2xl border border-slate-200 bg-white p-5">
                    <CalendarDays className="mb-4 text-slate-500"/>
                    <p className="text-sm text-slate-500">Số phiếu</p>
                    <p className="mt-1 text-3xl font-bold text-slate-950">
                        {monthSummary.sheets}
                    </p>
                </div>
            </section>

            {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                    <div className="text-center">
                        <Loader2 className="mx-auto h-9 w-9 animate-spin text-slate-400"/>

                        <p className="mt-4 text-sm font-medium text-slate-500">
                            Đang tải lịch sử chấm công...
                        </p>
                    </div>
                </div>
            ) : dailySheets.length ===
              0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center">
                    <CalendarDays
                        size={44}
                        className="mx-auto text-slate-300"
                    />

                    <p className="mt-4 font-semibold text-slate-700">
                        Chưa có phiếu chấm công
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                        Những ngày đã lưu ở trang Chấm công sẽ xuất hiện tại đây.
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    {dailySheets.map(
                        (sheet) => (
                            <article
                                key={
                                    sheet.workDate
                                }
                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                            >
                                <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                                            <CalendarDays
                                                size={22}
                                            />
                                        </div>

                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                                Phiếu chấm công
                                            </p>

                                            <h2 className="mt-1 text-xl font-bold text-slate-950">
                                                {formatDate(
                                                    sheet.workDate,
                                                )}
                                            </h2>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            void openEditSheet(
                                                sheet.workDate,
                                            )
                                        }
                                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                                    >
                                        <Edit3
                                            size={16}
                                        />
                                        Chỉnh sửa phiếu
                                    </button>
                                </div>

                                <div className="grid gap-5 p-6 lg:grid-cols-[220px_1fr]">
                                    <div className="rounded-2xl bg-emerald-50 p-5">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 className="text-emerald-600"/>

                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                                                    Có đi làm
                                                </p>

                                                <p className="mt-1 text-3xl font-bold text-emerald-800">
                                                    {sheet.workingCount}
                                                </p>

                                                <p className="text-xs text-emerald-700">
                                                    người
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-5 rounded-2xl border border-red-100 bg-red-50/50 p-5">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <Timer size={17} className="text-red-600"/>
                                                <h3 className="text-sm font-bold text-red-700">Nhân viên tăng ca</h3>
                                            </div>
                                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
                                                {sheet.overtimePeople.length} người
                                            </span>
                                        </div>
                                        {sheet.overtimePeople.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-red-200 bg-white px-4 py-4 text-sm text-slate-400">
                                                Không có nhân viên tăng ca trong ngày này.
                                            </div>
                                        ) : (
                                            <div className="grid gap-2 md:grid-cols-2">
                                                {sheet.overtimePeople.map((person) => {
                                                    const hours = Math.floor(person.minutes / 60)
                                                    const minutes = person.minutes % 60
                                                    const duration = hours > 0
                                                        ? minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`
                                                        : `${minutes} phút`
                                                    return (
                                                        <div key={person.employeeId} className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-white px-4 py-3">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold text-slate-900">{person.employeeName}</p>
                                                                <p className="mt-0.5 text-xs text-slate-400">{person.employeeCode}</p>
                                                            </div>
                                                            <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">
                                                                +{duration} · về {person.endTime}
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <h3 className="text-sm font-bold text-slate-800">
                                                Nhân viên nghỉ
                                            </h3>

                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                                                {sheet.leavePeople.length} người
                                            </span>
                                        </div>

                                        {sheet.leavePeople.length ===
                                        0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-400">
                                                Không có nhân viên nghỉ trong phiếu này.
                                            </div>
                                        ) : (
                                            <div className="grid gap-2 md:grid-cols-2">
                                                {sheet.leavePeople.map(
                                                    (
                                                        person,
                                                    ) => (
                                                        <div
                                                            key={
                                                                person.employeeId
                                                            }
                                                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold text-slate-900">
                                                                    {person.employeeName}
                                                                </p>

                                                                <p className="mt-0.5 text-xs text-slate-400">
                                                                    {person.employeeCode}
                                                                </p>
                                                            </div>

                                                            <span
                                                                className={
                                                                    person.tone ===
                                                                    'approved'
                                                                        ? 'shrink-0 whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700'
                                                                        : 'shrink-0 whitespace-nowrap rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600'
                                                                }
                                                            >
                                                                {person.label}
                                                            </span>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ),
                    )}
                </div>
            )}

            {editDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Chỉnh sửa phiếu chấm công
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-950">
                                    Ngày {formatDate(
                                        editDate,
                                    )}
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Hiển thị toàn bộ danh sách nhân viên đã thiết lập.
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={
                                    saving
                                }
                                onClick={() => {
                                    if (
                                        !saving
                                    ) {
                                        setEditDate(
                                            null,
                                        )
                                        setEditRows(
                                            [],
                                        )
                                    }
                                }}
                                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed"
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        {loadingEdit ? (
                            <div className="flex min-h-96 items-center justify-center">
                                <Loader2 className="h-9 w-9 animate-spin text-slate-400"/>
                            </div>
                        ) : (
                            <div className="overflow-auto">
                                <table className="w-full min-w-[1280px]">
                                    <thead className="sticky top-0 z-10 bg-slate-50">
                                        <tr className="border-b border-slate-200">
                                            <th className="w-[250px] min-w-[250px] px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                Nhân viên
                                            </th>

                                            <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                Giờ vào
                                            </th>

                                            <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                Giờ về
                                            </th>

                                            <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                Ca sáng
                                            </th>

                                            <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                Ca chiều
                                            </th>

                                            <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                Trạng thái
                                            </th>

                                            <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                Ghi chú
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {editRows.map(
                                            (row) => {
                                                const isLate =
                                                    row.checkIn !==
                                                        '' &&
                                                    row.checkIn >
                                                        lateAfterTime

                                                return (
                                                    <tr
                                                        key={
                                                            row.employee.id
                                                        }
                                                        className="border-b border-slate-100 last:border-b-0"
                                                    >
                                                        <td className="w-[250px] min-w-[250px] px-5 py-4">
                                                            <p className="whitespace-nowrap font-semibold text-slate-900">
                                                                {row.employee.full_name}
                                                            </p>

                                                            <div className="mt-1 flex items-center gap-2">
                                                                <span className="text-xs text-slate-400">
                                                                    {row.employee.employee_code}
                                                                </span>

                                                                {!row.employee.is_active && (
                                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                                                        Đã ngưng
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <TimeInput
                                                                value={
                                                                    row.checkIn
                                                                }
                                                                onChange={(value) =>
                                                                    updateEditRow(
                                                                        row.employee.id,
                                                                        {
                                                                            checkIn:
                                                                                value,
                                                                        },
                                                                    )
                                                                }
                                                                aria-label={`Giờ vào của ${row.employee.full_name}`}
                                                                className="h-10 w-28 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                                            />
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <TimeInput
                                                                value={
                                                                    row.checkOut
                                                                }
                                                                onChange={(value) =>
                                                                    updateEditRow(
                                                                        row.employee.id,
                                                                        {
                                                                            checkOut:
                                                                                value,
                                                                        },
                                                                    )
                                                                }
                                                                aria-label={`Giờ về của ${row.employee.full_name}`}
                                                                className="h-10 w-28 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                                            />
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <select
                                                                value={
                                                                    row.morningStatus
                                                                }
                                                                onChange={(event) =>
                                                                    updateEditRow(
                                                                        row.employee.id,
                                                                        {
                                                                            morningStatus:
                                                                                event.target.value as AttendanceStatus,
                                                                        },
                                                                    )
                                                                }
                                                                className="h-10 w-40 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                                                            >
                                                                {statusOptions.map(
                                                                    (
                                                                        option,
                                                                    ) => (
                                                                        <option
                                                                            key={
                                                                                option.value
                                                                            }
                                                                            value={
                                                                                option.value
                                                                            }
                                                                        >
                                                                            {option.label}
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <select
                                                                value={
                                                                    row.afternoonStatus
                                                                }
                                                                onChange={(event) =>
                                                                    updateEditRow(
                                                                        row.employee.id,
                                                                        {
                                                                            afternoonStatus:
                                                                                event.target.value as AttendanceStatus,
                                                                        },
                                                                    )
                                                                }
                                                                className="h-10 w-40 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                                                            >
                                                                {statusOptions.map(
                                                                    (
                                                                        option,
                                                                    ) => (
                                                                        <option
                                                                            key={
                                                                                option.value
                                                                            }
                                                                            value={
                                                                                option.value
                                                                            }
                                                                        >
                                                                            {option.label}
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            {isLate ? (
                                                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
                                                                    <Clock3 size={13}/>
                                                                    Đi trễ
                                                                </span>
                                                            ) : row.checkIn ? (
                                                                <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                                                    Đúng giờ
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                                                                    Chưa xác định
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <input
                                                                type="text"
                                                                value={
                                                                    row.note
                                                                }
                                                                onChange={(event) =>
                                                                    updateEditRow(
                                                                        row.employee.id,
                                                                        {
                                                                            note:
                                                                                event.target.value,
                                                                        },
                                                                    )
                                                                }
                                                                placeholder="Ghi chú..."
                                                                className="h-10 w-56 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                                            />
                                                        </td>
                                                    </tr>
                                                )
                                            },
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                            <button
                                type="button"
                                disabled={
                                    saving
                                }
                                onClick={() => {
                                    if (
                                        !saving
                                    ) {
                                        setEditDate(
                                            null,
                                        )
                                        setEditRows(
                                            [],
                                        )
                                    }
                                }}
                                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed"
                            >
                                Hủy
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    void saveSheet()
                                }
                                disabled={
                                    saving ||
                                    loadingEdit
                                }
                                className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {saving ? (
                                    <Loader2
                                        size={17}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Save size={17}/>
                                )}

                                {saving
                                    ? 'Đang lưu...'
                                    : 'Lưu toàn bộ phiếu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
