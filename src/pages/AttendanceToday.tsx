import {
    CalendarDays,
    Check,
    Clock3,
    Loader2,
    Save,
    UserCheck,
    Users,
} from 'lucide-react'
import {
    useEffect,
    useMemo,
    useState,
} from 'react'

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
}

interface AttendanceRow {
    id?: string
    check_in: string
    morning_status: AttendanceStatus
    afternoon_status: AttendanceStatus
    is_late: boolean
    note: string
}

type AttendanceMap = Record<
    string,
    AttendanceRow
>

const emptyAttendance = (): AttendanceRow => ({
    check_in: '',
    morning_status: 'pending',
    afternoon_status: 'pending',
    is_late: false,
    note: '',
})

function getVietnamDate() {
    return new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
    })
}

function formatWorkDate(
    value: string,
) {
    const [
        year,
        month,
        day,
    ] = value.split('-')

    return `${day}/${month}/${year}`
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

export default function AttendanceToday() {
    const [employees, setEmployees] = useState<
        Employee[]
    >([])

    const [rows, setRows] =
        useState<AttendanceMap>({})

    const [loading, setLoading] = useState(true)

    const [savingIds, setSavingIds] = useState<
        Set<string>
    >(new Set())

    const [savingAll, setSavingAll] =
        useState(false)

    const [error, setError] =
        useState<string | null>(null)

    const [success, setSuccess] =
        useState<string | null>(null)

    const [
        selectedDate,
        setSelectedDate,
    ] = useState(
        getVietnamDate(),
    )

    const [workSettings, setWorkSettings] =
        useState({
            work_start_time: '07:30',
            late_after_time: '07:35',
            morning_end_time: '12:00',
            afternoon_start_time: '13:30',
            afternoon_end_time: '17:00',
        })

    useEffect(() => {
        const loadWorkSettings = async () => {
            const {
                data,
                error: settingsError,
            } = await supabase
                .from('company_settings')
                .select(
                    `
                        work_start_time,
                        late_after_time,
                        morning_end_time,
                        afternoon_start_time,
                        afternoon_end_time
                    `,
                )
                .eq('id', 1)
                .maybeSingle()

            if (settingsError) {
                console.error(settingsError)
                return
            }

            if (!data) return

            setWorkSettings({
                work_start_time:
                    data.work_start_time?.slice(0, 5) ??
                    '07:30',

                late_after_time:
                    data.late_after_time?.slice(0, 5) ??
                    '07:35',

                morning_end_time:
                    data.morning_end_time?.slice(0, 5) ??
                    '12:00',

                afternoon_start_time:
                    data.afternoon_start_time?.slice(0, 5) ??
                    '13:30',

                afternoon_end_time:
                    data.afternoon_end_time?.slice(0, 5) ??
                    '17:00',
            })
        }

        void loadWorkSettings()
    }, [])

    useEffect(() => {
        const loadAttendance = async () => {
            setLoading(true)
            setError(null)

            try {
                const {data: employeeData, error: employeeError} =
                    await supabase
                        .from('employees')
                        .select(
                            'id, employee_code, full_name',
                        )
                        .eq('is_active', true)
                        .order('employee_code')

                if (employeeError) {
                    throw employeeError
                }

                const employeeList =
                    employeeData ?? []

                setEmployees(employeeList)

                const initialRows: AttendanceMap = {}

                employeeList.forEach((employee) => {
                    initialRows[employee.id] =
                        emptyAttendance()
                })

                if (employeeList.length === 0) {
                    setRows(initialRows)
                    return
                }

                const {data: attendanceData, error: attendanceError} =
                    await supabase
                        .from('attendance')
                        .select(
                            `
                id,
                employee_id,
                check_in,
                morning_status,
                afternoon_status,
                is_late,
                note
              `,
                        )
                        .eq(
                            'work_date',
                            selectedDate,
                        )

                if (attendanceError) {
                    throw attendanceError
                }

                attendanceData?.forEach(
                    (attendance) => {
                        initialRows[
                            attendance.employee_id
                            ] = {
                            id: attendance.id,
                            check_in:
                                attendance.check_in?.slice(
                                    0,
                                    5,
                                ) ?? '',
                            morning_status:
                            attendance.morning_status,
                            afternoon_status:
                            attendance.afternoon_status,
                            is_late:
                                attendance.is_late ??
                                false,
                            note: attendance.note ?? '',
                        }
                    },
                )

                setRows(initialRows)
            } catch (err) {
                console.error(err)

                setError(
                    'Không thể tải danh sách chấm công.',
                )
            } finally {
                setLoading(false)
            }
        }

        void loadAttendance()
    }, [selectedDate])

    const updateRow = (
        employeeId: string,
        patch: Partial<AttendanceRow>,
    ) => {
        setRows((current) => ({
            ...current,
            [employeeId]: {
                ...current[employeeId],
                ...patch,
            },
        }))

        setSuccess(null)
    }

    const setPresentAllDay = (
        employeeId: string,
    ) => {
        updateRow(employeeId, {
            morning_status: 'present',
            afternoon_status: 'present',
        })
    }

    const setLeaveAllDay = (
        employeeId: string,
        status:
            | 'approved_leave'
            | 'unapproved_leave',
    ) => {
        updateRow(employeeId, {
            check_in: '',
            morning_status: status,
            afternoon_status: status,
            is_late: false,
        })
    }

    const validateRow = (
        employee: Employee,
        row: AttendanceRow,
    ) => {
        if (
            row.morning_status === 'present' &&
            !row.check_in
        ) {
            return `${employee.full_name}: đã chọn Có mặt buổi sáng nhưng chưa nhập giờ vào.`
        }

        if (
            row.morning_status === 'present' &&
            !isValid24HourTime(row.check_in)
        ) {
            return `${employee.full_name}: giờ vào phải theo định dạng 24H HH:mm, ví dụ 07:30.`
        }

        return null
    }

    const saveEmployee = async (
        employee: Employee,
    ) => {
        const row = rows[employee.id]

        if (!row) return

        const validationError =
            validateRow(employee, row)

        if (validationError) {
            setError(validationError)
            return
        }

        setError(null)
        setSuccess(null)

        setSavingIds((current) => {
            const next = new Set(current)
            next.add(employee.id)
            return next
        })

        try {
            const checkIn =
                row.morning_status === 'present'
                    ? row.check_in || null
                    : null

            const {
                data,
                error: saveError,
            } = await supabase
                .from('attendance')
                .upsert(
                    {
                        employee_id: employee.id,
                        work_date: selectedDate,
                        check_in: checkIn,
                        morning_status:
                        row.morning_status,
                        afternoon_status:
                        row.afternoon_status,
                        note: row.note.trim() || null,
                    },
                    {
                        onConflict:
                            'employee_id,work_date',
                    },
                )
                .select(
                    `
            id,
            check_in,
            morning_status,
            afternoon_status,
            is_late,
            note
          `,
                )
                .single()

            if (saveError) {
                throw saveError
            }

            updateRow(employee.id, {
                id: data.id,
                check_in:
                    data.check_in?.slice(0, 5) ??
                    '',
                morning_status:
                data.morning_status,
                afternoon_status:
                data.afternoon_status,
                is_late: data.is_late,
                note: data.note ?? '',
            })

            setSuccess(
                `Đã lưu chấm công cho ${employee.full_name}.`,
            )
        } catch (err) {
            console.error(err)

            setError(
                `Không thể lưu chấm công cho ${employee.full_name}.`,
            )
        } finally {
            setSavingIds((current) => {
                const next = new Set(current)
                next.delete(employee.id)
                return next
            })
        }
    }

    const saveAll = async () => {
        setError(null)
        setSuccess(null)

        for (const employee of employees) {
            const row = rows[employee.id]

            if (!row) continue

            const validationError =
                validateRow(employee, row)

            if (validationError) {
                setError(validationError)
                return
            }
        }

        setSavingAll(true)

        try {
            const payload = employees.map(
                (employee) => {
                    const row = rows[employee.id]

                    return {
                        employee_id: employee.id,
                        work_date: selectedDate,

                        check_in:
                            row.morning_status ===
                            'present'
                                ? row.check_in || null
                                : null,

                        morning_status:
                        row.morning_status,

                        afternoon_status:
                        row.afternoon_status,

                        note:
                            row.note.trim() || null,
                    }
                },
            )

            const {
                data,
                error: saveError,
            } = await supabase
                .from('attendance')
                .upsert(payload, {
                    onConflict:
                        'employee_id,work_date',
                })
                .select(
                    `
            id,
            employee_id,
            check_in,
            morning_status,
            afternoon_status,
            is_late,
            note
          `,
                )

            if (saveError) {
                throw saveError
            }

            setRows((current) => {
                const next = {...current}

                data?.forEach((attendance) => {
                    next[
                        attendance.employee_id
                        ] = {
                        id: attendance.id,

                        check_in:
                            attendance.check_in?.slice(
                                0,
                                5,
                            ) ?? '',

                        morning_status:
                        attendance.morning_status,

                        afternoon_status:
                        attendance.afternoon_status,

                        is_late:
                        attendance.is_late,

                        note:
                            attendance.note ?? '',
                    }
                })

                return next
            })

            setSuccess(
                `Đã lưu toàn bộ bảng chấm công ngày ${formatWorkDate(
                    selectedDate,
                )}.`,
            )
        } catch (err) {
            console.error(err)

            setError(
                'Không thể lưu toàn bộ bảng chấm công.',
            )
        } finally {
            setSavingAll(false)
        }
    }

    const summary = useMemo(() => {
        let present = 0
        let late = 0
        let leave = 0

        employees.forEach((employee) => {
            const row = rows[employee.id]

            if (!row) return

            if (
                row.morning_status ===
                'present' ||
                row.afternoon_status ===
                'present'
            ) {
                present += 1
            }

            const latePreview =
                row.check_in !== '' &&
                row.check_in > workSettings.late_after_time

            if (row.is_late || latePreview) {
                late += 1
            }

            const hasLeave =
                row.morning_status ===
                'approved_leave' ||
                row.morning_status ===
                'unapproved_leave' ||
                row.afternoon_status ===
                'approved_leave' ||
                row.afternoon_status ===
                'unapproved_leave'

            if (hasLeave) {
                leave += 1
            }
        })

        return {
            total: employees.length,
            present,
            late,
            leave,
        }
    }, [employees, rows])

    if (loading) {
        return (
            <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
                <div className="text-center">
                    <Loader2 className="mx-auto h-9 w-9 animate-spin text-slate-500"/>

                    <p className="mt-4 text-sm font-medium text-slate-500">
                        Đang tải bảng chấm công ngày {formatWorkDate(selectedDate)}...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        Điểm danh
                    </p>

                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                        Chấm công
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Đang chấm công ngày{' '}
                        <strong className="font-semibold text-slate-700">
                            {formatWorkDate(
                                selectedDate,
                            )}
                        </strong>
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div>
                        <label
                            htmlFor="attendance-date"
                            className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
                        >
                            Ngày chấm công
                        </label>

                        <div className="relative">
                            <CalendarDays
                                size={17}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                id="attendance-date"
                                type="date"
                                value={
                                    selectedDate
                                }
                                onChange={(event) =>
                                    setSelectedDate(
                                        event.target.value,
                                    )
                                }
                                disabled={
                                    savingAll ||
                                    savingIds.size >
                                        0
                                }
                                className="h-11 min-w-[180px] cursor-pointer rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            void saveAll()
                        }
                        disabled={savingAll}
                        className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {savingAll ? (
                            <Loader2
                                size={18}
                                className="animate-spin"
                            />
                        ) : (
                            <Save size={18}/>
                        )}

                        {savingAll
                            ? 'Đang lưu...'
                            : 'Lưu tất cả'}
                    </button>
                </div>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-3">
                        <Users className="text-slate-500"/>

                        <div>
                            <p className="text-xs font-medium text-slate-400">
                                Nhân viên
                            </p>

                            <p className="text-2xl font-bold text-slate-950">
                                {summary.total}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-3">
                        <UserCheck className="text-emerald-600"/>

                        <div>
                            <p className="text-xs font-medium text-slate-400">
                                Có mặt
                            </p>

                            <p className="text-2xl font-bold text-slate-950">
                                {summary.present}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-3">
                        <Clock3 className="text-amber-600"/>

                        <div>
                            <p className="text-xs font-medium text-slate-400">
                                Đi trễ
                            </p>

                            <p className="text-2xl font-bold text-slate-950">
                                {summary.late}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div>
                        <p className="text-xs font-medium text-slate-400">
                            Có nghỉ
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-950">
                            {summary.leave}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <CalendarDays
                        size={19}
                    />
                </div>

                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Bảng chấm công đang mở
                    </p>

                    <p className="mt-1 text-base font-bold text-slate-950">
                        Ngày{' '}
                        {formatWorkDate(
                            selectedDate,
                        )}
                    </p>
                </div>
            </div>

            <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span>
            🌅 Ca sáng:
            <strong className="ml-2">
              {workSettings.work_start_time} - {workSettings.morning_end_time}
            </strong>
          </span>

                    <span>
            ⏰ Đi trễ:
            <strong className="ml-2">
              Sau {workSettings.late_after_time}
            </strong>
          </span>

                    <span>
            🌇 Ca chiều:
            <strong className="ml-2">
              {workSettings.afternoon_start_time} - {workSettings.afternoon_end_time}
            </strong>
          </span>
                </div>
            </div>

            {error && (
                <div
                    className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div
                    className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    <Check size={17}/>

                    {success}
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-[1450px] w-full">
                        <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200">
                            <th className="w-[280px] min-w-[280px] px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                Nhân viên
                            </th>

                            <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                Giờ vào sáng
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
                                Thao tác nhanh
                            </th>

                            <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                Ghi chú
                            </th>

                            <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                                Lưu
                            </th>
                        </tr>
                        </thead>

                        <tbody>
                        {employees.map((employee) => {
                            const row =
                                rows[employee.id] ??
                                emptyAttendance()

                            const isLate =
                                row.is_late ||
                                (row.check_in !== '' &&
                                    row.check_in >
                                    workSettings.late_after_time)

                            const saving =
                                savingIds.has(
                                    employee.id,
                                )

                            return (
                                <tr
                                    key={employee.id}
                                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                                >
                                    <td className="w-[280px] min-w-[280px] px-5 py-4 align-middle">
                                        <p
                                            className="whitespace-nowrap font-semibold text-slate-900"
                                            title={employee.full_name}
                                        >
                                            {employee.full_name}
                                        </p>

                                        <p className="mt-1 whitespace-nowrap text-xs text-slate-400">
                                            {employee.employee_code}
                                        </p>
                                    </td>

                                    <td className="px-5 py-4">
                                        <input
                                            type="text"
                                        inputMode="numeric"
                                        maxLength={5}
                                        placeholder="HH:mm"
                                        pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]"
                                            value={row.check_in}
                                            onChange={(event) =>
                                                updateRow(
                                                    employee.id,
                                                    {
                                                        check_in:
                                                        event.target
                                                            .value,
                                                    },
                                                )
                                            }
                                            className="h-10 w-32 cursor-pointer rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                        />
                                    </td>

                                    <td className="px-5 py-4">
                                        <select
                                            value={
                                                row.morning_status
                                            }
                                            onChange={(event) =>
                                                updateRow(
                                                    employee.id,
                                                    {
                                                        morning_status:
                                                            event.target
                                                                .value as AttendanceStatus,
                                                    },
                                                )
                                            }
                                            className="h-10 w-40 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                                        >
                                            {statusOptions.map(
                                                (option) => (
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
                                                row.afternoon_status
                                            }
                                            onChange={(event) =>
                                                updateRow(
                                                    employee.id,
                                                    {
                                                        afternoon_status:
                                                            event.target
                                                                .value as AttendanceStatus,
                                                    },
                                                )
                                            }
                                            className="h-10 w-40 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                                        >
                                            {statusOptions.map(
                                                (option) => (
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
                                            <span
                                                className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
                          <Clock3 size={13}/>

                          Đi trễ
                        </span>
                                        ) : row.check_in ? (
                                            <span
                                                className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                          Đúng giờ
                        </span>
                                        ) : (
                                            <span
                                                className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                          Chưa xác định
                        </span>
                                        )}
                                    </td>

                                    <td className="px-5 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPresentAllDay(
                                                        employee.id,
                                                    )
                                                }
                                                className="cursor-pointer rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                            >
                                                Có mặt
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setLeaveAllDay(
                                                        employee.id,
                                                        'approved_leave',
                                                    )
                                                }
                                                className="cursor-pointer rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                            >
                                                Nghỉ phép
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setLeaveAllDay(
                                                        employee.id,
                                                        'unapproved_leave',
                                                    )
                                                }
                                                className="cursor-pointer rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                                            >
                                                Không phép
                                            </button>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4">
                                        <input
                                            type="text"
                                            value={row.note}
                                            onChange={(event) =>
                                                updateRow(
                                                    employee.id,
                                                    {
                                                        note:
                                                        event.target
                                                            .value,
                                                    },
                                                )
                                            }
                                            placeholder="Ghi chú..."
                                            className="h-10 w-48 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                        />
                                    </td>

                                    <td className="px-5 py-4 text-right">
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() =>
                                                void saveEmployee(
                                                    employee,
                                                )
                                            }
                                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {saving ? (
                                                <Loader2
                                                    size={14}
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <Save size={14}/>
                                            )}

                                            Lưu
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}