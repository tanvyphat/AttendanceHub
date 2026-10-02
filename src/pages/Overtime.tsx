import {
    Clock3,
    Edit3,
    Loader2,
    Plus,
    Search,
    Timer,
    Trash2,
    Users,
    X,
} from 'lucide-react'
import {
    type FormEvent,
    useEffect,
    useMemo,
    useState,
} from 'react'

import ConfirmDialog from '../components/ui/ConfirmDialog'
import Toast from '../components/ui/Toast'
import {supabase} from '../lib/supabase'
import {isValid24HourTime} from '../utils/time24'

interface Employee {
    id: string
    employee_code: string
    full_name: string
    is_active: boolean
}

interface OvertimeRecord {
    id: string
    employee_id: string
    overtime_date: string
    overtime_end_time: string
    overtime_base_time: string
    overtime_minutes: number
    note: string | null
    employees: {
        employee_code: string
        full_name: string
    } | null
}

interface OvertimeForm {
    id?: string
    employeeId: string
    overtimeDate: string
    endTime: string
    note: string
}

function getVietnamDate() {
    return new Date().toLocaleDateString(
        'en-CA',
        {
            timeZone:
                'Asia/Ho_Chi_Minh',
        },
    )
}

function getVietnamMonth() {
    return getVietnamDate().slice(
        0,
        7,
    )
}

function getMonthRange(
    month: string,
) {
    const [year, monthNumber] =
        month
            .split('-')
            .map(Number)

    const lastDay =
        new Date(
            year,
            monthNumber,
            0,
        ).getDate()

    return {
        startDate:
            `${month}-01`,

        endDate:
            `${month}-${String(
                lastDay,
            ).padStart(2, '0')}`,
    }
}

function formatDate(
    value: string,
) {
    const [
        year,
        month,
        day,
    ] = value.split('-')

    return `${day}/${month}/${year}`
}

function timeToMinutes(
    value: string,
) {
    const [hours, minutes] =
        value
            .slice(0, 5)
            .split(':')
            .map(Number)

    return (
        hours * 60 +
        minutes
    )
}

function calculateOvertimeMinutes(
    endTime: string,
    baseTime: string,
) {
    if (
        !isValid24HourTime(
            endTime,
        ) ||
        !isValid24HourTime(
            baseTime,
        )
    ) {
        return null
    }

    const result =
        timeToMinutes(endTime) -
        timeToMinutes(baseTime)

    return result > 0
        ? result
        : null
}

function formatDuration(
    value: number,
) {
    const hours =
        Math.floor(value / 60)

    const minutes =
        value % 60

    if (
        hours > 0 &&
        minutes > 0
    ) {
        return `${hours} giờ ${minutes} phút`
    }

    if (hours > 0) {
        return `${hours} giờ`
    }

    return `${minutes} phút`
}

export default function Overtime() {
    const [month, setMonth] =
        useState(
            getVietnamMonth(),
        )

    const [
        employees,
        setEmployees,
    ] = useState<Employee[]>([])

    const [
        records,
        setRecords,
    ] = useState<
        OvertimeRecord[]
    >([])

    const [
        workEndTime,
        setWorkEndTime,
    ] = useState('17:00')

    const [search, setSearch] =
        useState('')

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [deleting, setDeleting] =
        useState(false)

    const [form, setForm] =
        useState<OvertimeForm | null>(
            null,
        )

    const [
        deleteRecord,
        setDeleteRecord,
    ] = useState<
        OvertimeRecord | null
    >(null)

    const [error, setError] =
        useState<string | null>(
            null,
        )

    const [success, setSuccess] =
        useState<string | null>(
            null,
        )

    const loadData = async () => {
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
                employeeResult,
                overtimeResult,
                settingsResult,
            ] =
                await Promise.all([
                    supabase
                        .from(
                            'employees',
                        )
                        .select(
                            'id, employee_code, full_name, is_active',
                        )
                        .eq(
                            'department',
                            'warehouse_delivery',
                        )
                        .order(
                            'employee_code',
                        ),

                    supabase
                        .from(
                            'overtime_records',
                        )
                        .select(
                            `
                                id,
                                employee_id,
                                overtime_date,
                                overtime_end_time,
                                overtime_base_time,
                                overtime_minutes,
                                note,
                                employees (
                                    employee_code,
                                    full_name
                                )
                            `,
                        )
                        .gte(
                            'overtime_date',
                            startDate,
                        )
                        .lte(
                            'overtime_date',
                            endDate,
                        )
                        .order(
                            'overtime_date',
                            {
                                ascending:
                                    false,
                            },
                        ),

                    supabase
                        .from(
                            'company_settings',
                        )
                        .select(
                            'afternoon_end_time',
                        )
                        .eq(
                            'id',
                            1,
                        )
                        .single(),
                ])

            if (
                employeeResult.error
            ) {
                throw employeeResult.error
            }

            if (
                overtimeResult.error
            ) {
                throw overtimeResult.error
            }

            if (
                settingsResult.error
            ) {
                throw settingsResult.error
            }

            setEmployees(
                (employeeResult.data ??
                    []) as Employee[],
            )

            setRecords(
                (overtimeResult.data ??
                    []) as unknown as OvertimeRecord[],
            )

            if (
                settingsResult.data
                    ?.afternoon_end_time
            ) {
                setWorkEndTime(
                    settingsResult.data
                        .afternoon_end_time
                        .slice(
                            0,
                            5,
                        ),
                )
            }
        } catch (err) {
            console.error(err)

            setError(
                'Không thể tải dữ liệu tăng ca.',
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadData()
    }, [month])

    const filteredRecords =
        useMemo(() => {
            const keyword =
                search
                    .trim()
                    .toLocaleLowerCase(
                        'vi-VN',
                    )

            if (!keyword) {
                return records
            }

            return records.filter(
                (record) => {
                    const employee =
                        record.employees

                    return `${
                        employee
                            ?.employee_code ??
                        ''
                    } ${
                        employee
                            ?.full_name ??
                        ''
                    }`
                        .toLocaleLowerCase(
                            'vi-VN',
                        )
                        .includes(
                            keyword,
                        )
                },
            )
        }, [
            records,
            search,
        ])

    const summary = useMemo(() => {
        const totalMinutes =
            records.reduce(
                (
                    total,
                    record,
                ) =>
                    total +
                    record.overtime_minutes,
                0,
            )

        return {
            entries:
                records.length,

            employees:
                new Set(
                    records.map(
                        (record) =>
                            record.employee_id,
                    ),
                ).size,

            totalMinutes,
        }
    }, [records])

    const previewMinutes =
        form
            ? calculateOvertimeMinutes(
                  form.endTime,
                  workEndTime,
              )
            : null

    const openAdd = () => {
        const currentDate =
            getVietnamDate()

        const dateForMonth =
            currentDate.startsWith(
                month,
            )
                ? currentDate
                : `${month}-01`

        setError(null)

        setForm({
            employeeId:
                employees.find(
                    (employee) =>
                        employee.is_active,
                )?.id ??
                employees[0]?.id ??
                '',

            overtimeDate:
                dateForMonth,

            endTime:
                '',

            note:
                'Tăng ca',
        })
    }

    const openEdit = (
        record: OvertimeRecord,
    ) => {
        setError(null)

        setForm({
            id: record.id,

            employeeId:
                record.employee_id,

            overtimeDate:
                record.overtime_date,

            endTime:
                record.overtime_end_time.slice(
                    0,
                    5,
                ),

            note:
                record.note ??
                'Tăng ca',
        })
    }

    const saveOvertime = async (
        event:
            FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault()

        if (!form) return

        if (!form.employeeId) {
            setError(
                'Vui lòng chọn nhân viên.',
            )
            return
        }

        if (!form.overtimeDate) {
            setError(
                'Vui lòng chọn ngày tăng ca.',
            )
            return
        }

        if (
            !isValid24HourTime(
                form.endTime,
            )
        ) {
            setError(
                'Giờ về phải theo định dạng 24H HH:mm, ví dụ 19:27.',
            )
            return
        }

        const overtimeMinutes =
            calculateOvertimeMinutes(
                form.endTime,
                workEndTime,
            )

        if (
            overtimeMinutes ===
            null
        ) {
            setError(
                `Giờ về phải sau giờ kết thúc ca chiều (${workEndTime}).`,
            )
            return
        }

        setSaving(true)
        setError(null)

        try {
            const payload = {
                employee_id:
                    form.employeeId,

                overtime_date:
                    form.overtimeDate,

                overtime_end_time:
                    form.endTime,

                note:
                    form.note.trim() ||
                    'Tăng ca',
            }

            if (form.id) {
                const {
                    error:
                        updateError,
                } = await supabase
                    .from(
                        'overtime_records',
                    )
                    .update(
                        payload,
                    )
                    .eq(
                        'id',
                        form.id,
                    )

                if (updateError) {
                    if (
                        updateError.code ===
                        '23505'
                    ) {
                        throw new Error(
                            'Nhân viên đã có bản tăng ca trong ngày này.',
                        )
                    }

                    throw updateError
                }

                setSuccess(
                    'Đã cập nhật bản tăng ca.',
                )
            } else {
                const {
                    error:
                        insertError,
                } = await supabase
                    .from(
                        'overtime_records',
                    )
                    .insert(
                        payload,
                    )

                if (insertError) {
                    if (
                        insertError.code ===
                        '23505'
                    ) {
                        throw new Error(
                            'Nhân viên đã có bản tăng ca trong ngày này.',
                        )
                    }

                    throw insertError
                }

                setSuccess(
                    'Đã thêm bản tăng ca.',
                )
            }

            setForm(null)

            await loadData()
        } catch (err) {
            console.error(err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể lưu bản tăng ca.',
            )
        } finally {
            setSaving(false)
        }
    }

    const confirmDelete =
        async () => {
            if (!deleteRecord) {
                return
            }

            setDeleting(true)
            setError(null)

            try {
                const {
                    error:
                        deleteError,
                } = await supabase
                    .from(
                        'overtime_records',
                    )
                    .delete()
                    .eq(
                        'id',
                        deleteRecord.id,
                    )

                if (deleteError) {
                    throw deleteError
                }

                setRecords(
                    (current) =>
                        current.filter(
                            (record) =>
                                record.id !==
                                deleteRecord.id,
                        ),
                )

                setSuccess(
                    'Đã xóa bản tăng ca.',
                )

                setDeleteRecord(
                    null,
                )
            } catch (err) {
                console.error(err)

                setError(
                    'Không thể xóa bản tăng ca.',
                )
            } finally {
                setDeleting(false)
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

            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        Kho & Giao Hàng
                    </p>

                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                        Tăng ca
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Nhập giờ về từ bảng giấy cuối tháng, hệ thống tự tính thời gian tăng ca.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openAdd}
                    disabled={
                        employees.length ===
                        0
                    }
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Plus size={18}/>
                    Thêm tăng ca
                </button>
            </div>

            <section className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
                <p className="text-sm leading-6 text-blue-800">
                    Giờ kết thúc ca chiều hiện tại là <strong>{workEndTime}</strong>. Ví dụ nhập giờ về <strong>19:27</strong> thì hệ thống tự tính <strong>2 giờ 27 phút</strong> tăng ca.
                </p>
            </section>

            <section className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <Clock3 className="mb-4 text-slate-500"/>

                    <p className="text-sm text-slate-500">
                        Bản tăng ca
                    </p>

                    <p className="mt-1 text-3xl font-bold text-slate-950">
                        {summary.entries}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <Users className="mb-4 text-slate-500"/>

                    <p className="text-sm text-slate-500">
                        Nhân viên có tăng ca
                    </p>

                    <p className="mt-1 text-3xl font-bold text-slate-950">
                        {summary.employees}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <Timer className="mb-4 text-amber-600"/>

                    <p className="text-sm text-slate-500">
                        Tổng tăng ca
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-950">
                        {formatDuration(
                            summary.totalMinutes,
                        )}
                    </p>
                </div>
            </section>

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 md:grid-cols-[190px_1fr]">
                    <input
                        type="month"
                        value={month}
                        onChange={(event) =>
                            setMonth(
                                event.target.value,
                            )
                        }
                        className="h-11 cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

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
                            placeholder="Tìm tên hoặc mã nhân viên..."
                            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                    </div>
                </div>
            </section>

            {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex min-h-80 items-center justify-center">
                        <Loader2 className="h-9 w-9 animate-spin text-slate-400"/>
                    </div>
                ) : filteredRecords.length ===
                  0 ? (
                    <div className="px-6 py-20 text-center">
                        <Timer
                            size={44}
                            className="mx-auto text-slate-300"
                        />

                        <p className="mt-4 font-semibold text-slate-700">
                            Chưa có dữ liệu tăng ca
                        </p>

                        <p className="mt-2 text-sm text-slate-400">
                            Bấm Thêm tăng ca để nhập giờ về từ bảng giấy.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px]">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200">
                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                        Ngày
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                        Nhân viên
                                    </th>

                                    <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                        Kết thúc ca
                                    </th>

                                    <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                        Giờ về
                                    </th>

                                    <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                        Tăng ca
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                        Ghi chú
                                    </th>

                                    <th className="px-5 py-4 text-right text-xs font-bold uppercase text-slate-500">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredRecords.map(
                                    (record) => (
                                        <tr
                                            key={
                                                record.id
                                            }
                                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                                        >
                                            <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-700">
                                                {formatDate(
                                                    record.overtime_date,
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="whitespace-nowrap font-semibold text-slate-900">
                                                    {record
                                                        .employees
                                                        ?.full_name ??
                                                        'Không xác định'}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    {record
                                                        .employees
                                                        ?.employee_code ??
                                                        '---'}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4 text-center font-semibold text-slate-500">
                                                {record.overtime_base_time.slice(
                                                    0,
                                                    5,
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-center font-bold text-slate-900">
                                                {record.overtime_end_time.slice(
                                                    0,
                                                    5,
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-center">
                                                <span className="whitespace-nowrap rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                                                    {formatDuration(
                                                        record.overtime_minutes,
                                                    )}
                                                </span>
                                            </td>

                                            <td className="max-w-80 px-5 py-4 text-sm text-slate-500">
                                                {record.note ||
                                                    'Tăng ca'}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEdit(
                                                                record,
                                                            )
                                                        }
                                                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                                                    >
                                                        <Edit3 size={14}/>
                                                        Sửa
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleteRecord(
                                                                record,
                                                            )
                                                        }
                                                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                                    >
                                                        <Trash2 size={14}/>
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <ConfirmDialog
                open={Boolean(
                    deleteRecord,
                )}
                title="Xóa bản tăng ca?"
                description={
                    deleteRecord
                        ? `Bản tăng ca ngày ${formatDate(
                              deleteRecord.overtime_date,
                          )} của ${deleteRecord.employees?.full_name ?? 'nhân viên'} sẽ bị xóa.`
                        : ''
                }
                confirmLabel="Xóa bản ghi"
                danger
                loading={deleting}
                onCancel={() => {
                    if (!deleting) {
                        setDeleteRecord(
                            null,
                        )
                    }
                }}
                onConfirm={() =>
                    void confirmDelete()
                }
            />

            {form && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Kho & Giao Hàng
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-950">
                                    {form.id
                                        ? 'Chỉnh sửa tăng ca'
                                        : 'Thêm tăng ca'}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    if (!saving) {
                                        setForm(
                                            null,
                                        )
                                    }
                                }}
                                disabled={saving}
                                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed"
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        <form
                            onSubmit={
                                saveOvertime
                            }
                        >
                            <div className="space-y-5 p-6">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Nhân viên
                                    </label>

                                    <select
                                        value={
                                            form.employeeId
                                        }
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                employeeId:
                                                    event.target.value,
                                            })
                                        }
                                        className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    >
                                        {employees.map(
                                            (employee) => (
                                                <option
                                                    key={
                                                        employee.id
                                                    }
                                                    value={
                                                        employee.id
                                                    }
                                                >
                                                    {employee.employee_code} — {employee.full_name}
                                                    {!employee.is_active
                                                        ? ' (Đã ngưng)'
                                                        : ''}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Ngày tăng ca
                                        </label>

                                        <input
                                            type="date"
                                            value={
                                                form.overtimeDate
                                            }
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    overtimeDate:
                                                        event.target.value,
                                                })
                                            }
                                            className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Giờ về (24H)
                                        </label>

                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={5}
                                            value={
                                                form.endTime
                                            }
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    endTime:
                                                        event.target.value,
                                                })
                                            }
                                            placeholder="19:27"
                                            pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]"
                                            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                                        <div>
                                            <p className="text-xs font-semibold text-amber-600">
                                                Kết thúc ca
                                            </p>

                                            <p className="mt-1 text-xl font-bold text-amber-950">
                                                {workEndTime}
                                            </p>
                                        </div>

                                        <span className="font-bold text-amber-400">
                                            →
                                        </span>

                                        <div>
                                            <p className="text-xs font-semibold text-amber-600">
                                                Giờ về
                                            </p>

                                            <p className="mt-1 text-xl font-bold text-amber-950">
                                                {form.endTime ||
                                                    '--:--'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 border-t border-amber-200 pt-4 text-center">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                                            Thời gian tăng ca
                                        </p>

                                        <p className="mt-1 text-2xl font-bold text-amber-950">
                                            {previewMinutes ===
                                            null
                                                ? '—'
                                                : formatDuration(
                                                      previewMinutes,
                                                  )}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Ghi chú
                                    </label>

                                    <textarea
                                        rows={4}
                                        value={
                                            form.note
                                        }
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                note:
                                                    event.target.value,
                                            })
                                        }
                                        placeholder="Ví dụ: Tăng ca giao hàng..."
                                        className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                                <button
                                    type="button"
                                    disabled={
                                        saving
                                    }
                                    onClick={() =>
                                        setForm(
                                            null,
                                        )
                                    }
                                    className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed"
                                >
                                    Hủy
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving
                                    }
                                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2
                                            size={17}
                                            className="animate-spin"
                                        />
                                    ) : form.id ? (
                                        <Edit3 size={17}/>
                                    ) : (
                                        <Plus size={17}/>
                                    )}

                                    {saving
                                        ? 'Đang lưu...'
                                        : form.id
                                            ? 'Lưu thay đổi'
                                            : 'Thêm tăng ca'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
