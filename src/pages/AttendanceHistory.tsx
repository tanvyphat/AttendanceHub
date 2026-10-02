import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    Edit3,
    Loader2,
    Save,
    Search,
    ShieldCheck,
    TriangleAlert,
    X,
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

type FilterType =
    | 'all'
    | 'late'
    | 'approved_leave'
    | 'unapproved_leave'

interface EmployeeRelation {
    employee_code: string
    full_name: string
}

interface AttendanceRecord {
    id: string
    employee_id: string
    work_date: string
    check_in: string | null
    morning_status: AttendanceStatus
    afternoon_status: AttendanceStatus
    is_late: boolean
    note: string | null
    employees: EmployeeRelation | null
}

interface EditForm {
    id: string
    employeeName: string
    workDate: string
    checkIn: string
    morningStatus: AttendanceStatus
    afternoonStatus: AttendanceStatus
    note: string
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

const filterOptions: {
    value: FilterType
    label: string
}[] = [
    {
        value: 'all',
        label: 'Tất cả',
    },
    {
        value: 'late',
        label: 'Đi trễ',
    },
    {
        value: 'approved_leave',
        label: 'Nghỉ có phép',
    },
    {
        value: 'unapproved_leave',
        label: 'Không phép',
    },
]

function getVietnamMonth() {
    const parts = new Intl.DateTimeFormat(
        'en-CA',
        {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
        },
    ).formatToParts(new Date())

    const year = parts.find(
        (item) => item.type === 'year',
    )?.value

    const month = parts.find(
        (item) => item.type === 'month',
    )?.value

    return `${year}-${month}`
}

function getMonthRange(monthValue: string) {
    const [year, month] = monthValue
        .split('-')
        .map(Number)

    const lastDay = new Date(
        year,
        month,
        0,
    ).getDate()

    return {
        startDate: `${monthValue}-01`,
        endDate: `${monthValue}-${String(
            lastDay,
        ).padStart(2, '0')}`,
    }
}

function formatDate(date: string) {
    const [year, month, day] =
        date.split('-')

    return `${day}/${month}/${year}`
}

function statusLabel(
    status: AttendanceStatus,
) {
    switch (status) {
        case 'present':
            return 'Có mặt'

        case 'approved_leave':
            return 'Nghỉ có phép'

        case 'unapproved_leave':
            return 'Nghỉ không phép'

        default:
            return 'Chưa chấm'
    }
}

function statusClass(
    status: AttendanceStatus,
) {
    switch (status) {
        case 'present':
            return 'bg-emerald-50 text-emerald-700'

        case 'approved_leave':
            return 'bg-blue-50 text-blue-700'

        case 'unapproved_leave':
            return 'bg-red-50 text-red-600'

        default:
            return 'bg-slate-100 text-slate-500'
    }
}

export default function AttendanceHistory() {
    const [month, setMonth] = useState(
        getVietnamMonth(),
    )

    const [specificDate, setSpecificDate] =
        useState('')

    const [search, setSearch] =
        useState('')

    const [filter, setFilter] =
        useState<FilterType>('all')

    const [records, setRecords] = useState<
        AttendanceRecord[]
    >([])

    const [loading, setLoading] =
        useState(true)

    const [error, setError] =
        useState<string | null>(null)

    const [success, setSuccess] =
        useState<string | null>(null)

    const [lateAfterTime, setLateAfterTime] =
        useState('07:35')

    const [editForm, setEditForm] =
        useState<EditForm | null>(null)

    const [saving, setSaving] =
        useState(false)

    useEffect(() => {
        setSpecificDate('')
    }, [month])

    useEffect(() => {
        const loadSettings = async () => {
            const {
                data,
                error: settingsError,
            } = await supabase
                .from('company_settings')
                .select('late_after_time')
                .eq('id', 1)
                .maybeSingle()

            if (settingsError) {
                console.error(settingsError)
                return
            }

            if (data?.late_after_time) {
                setLateAfterTime(
                    data.late_after_time.slice(0, 5),
                )
            }
        }

        void loadSettings()
    }, [])

    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true)
            setError(null)

            try {
                const {
                    startDate,
                    endDate,
                } = getMonthRange(month)

                const {
                    data,
                    error: historyError,
                } = await supabase
                    .from('attendance')
                    .select(`
            id,
            employee_id,
            work_date,
            check_in,
            morning_status,
            afternoon_status,
            is_late,
            note,
            employees (
              employee_code,
              full_name
            )
          `)
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
                            ascending: false,
                        },
                    )

                if (historyError) {
                    throw historyError
                }

                setRecords(
                    (data ?? []) as unknown as AttendanceRecord[],
                )
            } catch (err) {
                console.error(err)

                setError(
                    'Không thể tải lịch sử chấm công.',
                )
            } finally {
                setLoading(false)
            }
        }

        void loadHistory()
    }, [month])

    const filteredRecords =
        useMemo(() => {
            const keyword = search
                .trim()
                .toLocaleLowerCase('vi-VN')

            return records.filter(
                (record) => {
                    if (
                        specificDate &&
                        record.work_date !==
                        specificDate
                    ) {
                        return false
                    }

                    if (keyword) {
                        const name =
                            record.employees
                                ?.full_name ??
                            ''

                        const code =
                            record.employees
                                ?.employee_code ??
                            ''

                        const searchable =
                            `${name} ${code}`.toLocaleLowerCase(
                                'vi-VN',
                            )

                        if (
                            !searchable.includes(
                                keyword,
                            )
                        ) {
                            return false
                        }
                    }

                    if (
                        filter === 'late' &&
                        !record.is_late
                    ) {
                        return false
                    }

                    if (
                        filter ===
                        'approved_leave' &&
                        record.morning_status !==
                        'approved_leave' &&
                        record.afternoon_status !==
                        'approved_leave'
                    ) {
                        return false
                    }

                    if (
                        filter ===
                        'unapproved_leave' &&
                        record.morning_status !==
                        'unapproved_leave' &&
                        record.afternoon_status !==
                        'unapproved_leave'
                    ) {
                        return false
                    }

                    return true
                },
            )
        }, [
            records,
            specificDate,
            search,
            filter,
        ])

    const summary = useMemo(() => {
        let late = 0
        let approvedSessions = 0
        let unapprovedSessions = 0

        filteredRecords.forEach(
            (record) => {
                if (record.is_late) {
                    late += 1
                }

                if (
                    record.morning_status ===
                    'approved_leave'
                ) {
                    approvedSessions += 1
                }

                if (
                    record.afternoon_status ===
                    'approved_leave'
                ) {
                    approvedSessions += 1
                }

                if (
                    record.morning_status ===
                    'unapproved_leave'
                ) {
                    unapprovedSessions += 1
                }

                if (
                    record.afternoon_status ===
                    'unapproved_leave'
                ) {
                    unapprovedSessions += 1
                }
            },
        )

        return {
            records:
            filteredRecords.length,
            late,
            approvedSessions,
            unapprovedSessions,
        }
    }, [filteredRecords])

    const openEdit = (
        record: AttendanceRecord,
    ) => {
        setError(null)
        setSuccess(null)

        setEditForm({
            id: record.id,

            employeeName:
                record.employees
                    ?.full_name ??
                'Không xác định',

            workDate:
            record.work_date,

            checkIn:
                record.check_in?.slice(
                    0,
                    5,
                ) ?? '',

            morningStatus:
            record.morning_status,

            afternoonStatus:
            record.afternoon_status,

            note:
                record.note ?? '',
        })
    }

    const closeEdit = () => {
        if (saving) return

        setEditForm(null)
    }

    const saveEdit = async () => {
        if (!editForm) return

        if (
            editForm.morningStatus ===
            'present' &&
            !editForm.checkIn
        ) {
            setError(
                'Nhân viên có mặt buổi sáng nhưng chưa nhập giờ vào.',
            )

            return
        }

        if (
            editForm.morningStatus ===
            'present' &&
            !isValid24HourTime(
                editForm.checkIn,
            )
        ) {
            setError(
                'Giờ vào phải theo định dạng 24H HH:mm, ví dụ 07:30.',
            )

            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const checkIn =
                editForm.morningStatus ===
                'present'
                    ? editForm.checkIn || null
                    : null

            const {
                data,
                error: updateError,
            } = await supabase
                .from('attendance')
                .update({
                    check_in: checkIn,

                    morning_status:
                    editForm.morningStatus,

                    afternoon_status:
                    editForm.afternoonStatus,

                    note:
                        editForm.note.trim() ||
                        null,
                })
                .eq(
                    'id',
                    editForm.id,
                )
                .select(`
          id,
          employee_id,
          work_date,
          check_in,
          morning_status,
          afternoon_status,
          is_late,
          note,
          employees (
            employee_code,
            full_name
          )
        `)
                .single()

            if (updateError) {
                throw updateError
            }

            const updated =
                data as unknown as AttendanceRecord

            setRecords((current) =>
                current.map((record) =>
                    record.id === updated.id
                        ? updated
                        : record,
                ),
            )

            setEditForm(null)

            setSuccess(
                `Đã cập nhật chấm công của ${editForm.employeeName}.`,
            )
        } catch (err) {
            console.error(err)

            setError(
                'Không thể cập nhật bản ghi chấm công.',
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <p className="text-sm font-medium text-slate-500">
                    Chấm công
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                    Lịch sử chấm công
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    Tra cứu và chỉnh sửa dữ
                    liệu chấm công đã lưu.
                </p>
            </div>

            {/* FILTERS */}

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-4">
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
                            value={specificDate}
                            min={`${month}-01`}
                            max={
                                getMonthRange(month)
                                    .endDate
                            }
                            onChange={(event) =>
                                setSpecificDate(
                                    event.target.value,
                                )
                            }
                            className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Tìm nhân viên
                        </label>

                        <div className="relative">
                            <Search
                                size={17}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value,
                                    )
                                }
                                placeholder="Tên hoặc mã NV..."
                                className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Trạng thái
                        </label>

                        <select
                            value={filter}
                            onChange={(event) =>
                                setFilter(
                                    event.target
                                        .value as FilterType,
                                )
                            }
                            className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            {filterOptions.map(
                                (option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>
                </div>

                {specificDate && (
                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={() =>
                                setSpecificDate('')
                            }
                            className="cursor-pointer text-xs font-semibold text-slate-500 transition hover:text-slate-950"
                        >
                            × Bỏ lọc theo ngày
                        </button>
                    </div>
                )}
            </section>

            {/* SUMMARY */}

            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <CalendarDays className="mb-4 text-slate-500"/>

                    <p className="text-sm text-slate-500">
                        Bản ghi
                    </p>

                    <p className="mt-1 text-3xl font-bold text-slate-950">
                        {summary.records}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <Clock3 className="mb-4 text-amber-600"/>

                    <p className="text-sm text-slate-500">
                        Đi trễ
                    </p>

                    <p className="mt-1 text-3xl font-bold text-slate-950">
                        {summary.late}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <ShieldCheck className="mb-4 text-blue-600"/>

                    <p className="text-sm text-slate-500">
                        Buổi nghỉ có phép
                    </p>

                    <p className="mt-1 text-3xl font-bold text-slate-950">
                        {summary.approvedSessions}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <TriangleAlert className="mb-4 text-red-600"/>

                    <p className="text-sm text-slate-500">
                        Buổi nghỉ không phép
                    </p>

                    <p className="mt-1 text-3xl font-bold text-slate-950">
                        {summary.unapprovedSessions}
                    </p>
                </div>
            </section>

            {error && (
                <div
                    className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div
                    className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 size={17}/>

                    {success}
                </div>
            )}

            {/* TABLE */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex min-h-80 items-center justify-center">
                        <div className="text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400"/>

                            <p className="mt-4 text-sm font-medium text-slate-500">
                                Đang tải lịch sử...
                            </p>
                        </div>
                    </div>
                ) : filteredRecords.length ===
                0 ? (
                    <div className="px-6 py-20 text-center">
                        <CalendarDays
                            size={42}
                            className="mx-auto text-slate-300"
                        />

                        <p className="mt-4 font-semibold text-slate-700">
                            Không có dữ liệu
                        </p>

                        <p className="mt-2 text-sm text-slate-400">
                            Không tìm thấy bản ghi
                            phù hợp với bộ lọc hiện
                            tại.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px]">
                            <thead className="bg-slate-50">
                            <tr className="border-b border-slate-200">
                                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Ngày
                                </th>

                                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Nhân viên
                                </th>

                                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Giờ vào
                                </th>

                                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Ca sáng
                                </th>

                                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Ca chiều
                                </th>

                                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Đi trễ
                                </th>

                                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Ghi chú
                                </th>

                                <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Thao tác
                                </th>
                            </tr>
                            </thead>

                            <tbody>
                            {filteredRecords.map(
                                (record) => (
                                    <tr
                                        key={record.id}
                                        className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/70"
                                    >
                                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">
                                            {formatDate(
                                                record.work_date,
                                            )}
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-slate-900">
                                                {record.employees
                                                        ?.full_name ??
                                                    'Không xác định'}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                {record.employees
                                                        ?.employee_code ??
                                                    '---'}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4">
                                            {record.check_in ? (
                                                <span
                                                    className={
                                                        record.is_late
                                                            ? 'font-bold text-red-600'
                                                            : 'font-semibold text-slate-700'
                                                    }
                                                >
                            {record.check_in.slice(
                                0,
                                5,
                            )}
                          </span>
                                            ) : (
                                                <span className="text-slate-300">
                            —
                          </span>
                                            )}
                                        </td>

                                        <td className="px-5 py-4">
                        <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(
                                record.morning_status,
                            )}`}
                        >
                          {statusLabel(
                              record.morning_status,
                          )}
                        </span>
                                        </td>

                                        <td className="px-5 py-4">
                        <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(
                                record.afternoon_status,
                            )}`}
                        >
                          {statusLabel(
                              record.afternoon_status,
                          )}
                        </span>
                                        </td>

                                        <td className="px-5 py-4">
                                            {record.is_late ? (
                                                <span
                                                    className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
                            <Clock3
                                size={13}
                            />

                            Đi trễ
                          </span>
                                            ) : record.check_in ? (
                                                <span
                                                    className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            Đúng giờ
                          </span>
                                            ) : (
                                                <span className="text-sm text-slate-300">
                            —
                          </span>
                                            )}
                                        </td>

                                        <td className="max-w-60 px-5 py-4 text-sm text-slate-500">
                                            {record.note || '—'}
                                        </td>

                                        <td className="px-5 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openEdit(
                                                        record,
                                                    )
                                                }
                                                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                                            >
                                                <Edit3 size={14}/>

                                                Sửa
                                            </button>
                                        </td>
                                    </tr>
                                ),
                            )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* EDIT MODAL */}

            {editForm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Chỉnh sửa chấm công
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-950">
                                    {editForm.employeeName}
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    {formatDate(
                                        editForm.workDate,
                                    )}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeEdit}
                                disabled={saving}
                                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed"
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        <div className="space-y-5 p-6">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Giờ vào sáng (24H)
                                </label>

                                <input
                                    type="text"
                                        inputMode="numeric"
                                        maxLength={5}
                                        placeholder="HH:mm"
                                        pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]"
                                    value={
                                        editForm.checkIn
                                    }
                                    onChange={(event) =>
                                        setEditForm(
                                            (current) =>
                                                current
                                                    ? {
                                                        ...current,
                                                        checkIn:
                                                        event
                                                            .target
                                                            .value,
                                                    }
                                                    : null,
                                        )
                                    }
                                    className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />

                                {editForm.checkIn &&
                                    editForm.checkIn >
                                    lateAfterTime && (
                                        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                                            <Clock3
                                                size={14}
                                            />
                                            Sau {lateAfterTime} — Đi
                                            trễ
                                        </p>
                                    )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Ca sáng
                                    </label>

                                    <select
                                        value={
                                            editForm.morningStatus
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setEditForm(
                                                (current) =>
                                                    current
                                                        ? {
                                                            ...current,

                                                            morningStatus:
                                                                event
                                                                    .target
                                                                    .value as AttendanceStatus,
                                                        }
                                                        : null,
                                            )
                                        }
                                        className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
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
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Ca chiều
                                    </label>

                                    <select
                                        value={
                                            editForm.afternoonStatus
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setEditForm(
                                                (current) =>
                                                    current
                                                        ? {
                                                            ...current,

                                                            afternoonStatus:
                                                                event
                                                                    .target
                                                                    .value as AttendanceStatus,
                                                        }
                                                        : null,
                                            )
                                        }
                                        className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
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
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Ghi chú
                                </label>

                                <textarea
                                    rows={3}
                                    value={editForm.note}
                                    onChange={(event) =>
                                        setEditForm(
                                            (current) =>
                                                current
                                                    ? {
                                                        ...current,
                                                        note:
                                                        event
                                                            .target
                                                            .value,
                                                    }
                                                    : null,
                                        )
                                    }
                                    placeholder="Lý do nghỉ, lý do đi trễ..."
                                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeEdit}
                                disabled={saving}
                                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed"
                            >
                                Hủy
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    void saveEdit()
                                }
                                disabled={saving}
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
                                    : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}