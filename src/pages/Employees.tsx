import {
    BadgeCheck,
    CircleOff,
    Edit3,
    Loader2,
    Plus,
    RotateCcw,
    Search,
    UserRound,
    Users,
    X,
} from 'lucide-react'

import {
    type FormEvent,
    useEffect,
    useMemo,
    useState,
} from 'react'

import {supabase} from '../lib/supabase'

interface Employee {
    id: string
    employee_code: string
    full_name: string
    is_active: boolean
    created_at: string
    updated_at: string
}

type StatusFilter =
    | 'all'
    | 'active'
    | 'inactive'

interface EmployeeForm {
    id?: string
    employee_code: string
    full_name: string
}

function getNextEmployeeCode(
    employees: Employee[],
) {
    const numbers = employees
        .map((employee) => {
            const match =
                employee.employee_code.match(
                    /^NV(\d+)$/i,
                )

            if (!match) {
                return 0
            }

            return Number(match[1])
        })
        .filter(
            (number) =>
                Number.isFinite(number),
        )

    const next =
        Math.max(0, ...numbers) + 1

    return `NV${String(next).padStart(
        3,
        '0',
    )}`
}

export default function Employees() {
    const [employees, setEmployees] =
        useState<Employee[]>([])

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [changingStatusId, setChangingStatusId] =
        useState<string | null>(null)

    const [search, setSearch] =
        useState('')

    const [statusFilter, setStatusFilter] =
        useState<StatusFilter>('all')

    const [form, setForm] =
        useState<EmployeeForm | null>(
            null,
        )

    const [error, setError] =
        useState<string | null>(null)

    const [success, setSuccess] =
        useState<string | null>(null)

    const loadEmployees =
        async () => {
            setLoading(true)
            setError(null)

            try {
                const {
                    data,
                    error: employeesError,
                } = await supabase
                    .from('employees')
                    .select(
                        `
              id,
              employee_code,
              full_name,
              is_active,
              created_at,
              updated_at
            `,
                    )
                    .order('employee_code')

                if (employeesError) {
                    throw employeesError
                }

                setEmployees(
                    (data ?? []) as Employee[],
                )
            } catch (err) {
                console.error(err)

                setError(
                    'Không thể tải danh sách nhân viên.',
                )
            } finally {
                setLoading(false)
            }
        }

    useEffect(() => {
        void loadEmployees()
    }, [])

    const summary = useMemo(() => {
        const active =
            employees.filter(
                (employee) =>
                    employee.is_active,
            ).length

        return {
            total: employees.length,
            active,
            inactive:
                employees.length -
                active,
        }
    }, [employees])

    const filteredEmployees =
        useMemo(() => {
            const keyword = search
                .trim()
                .toLocaleLowerCase(
                    'vi-VN',
                )

            return employees.filter(
                (employee) => {
                    if (
                        statusFilter ===
                        'active' &&
                        !employee.is_active
                    ) {
                        return false
                    }

                    if (
                        statusFilter ===
                        'inactive' &&
                        employee.is_active
                    ) {
                        return false
                    }

                    if (!keyword) {
                        return true
                    }

                    const searchable =
                        `${employee.employee_code} ${employee.full_name}`.toLocaleLowerCase(
                            'vi-VN',
                        )

                    return searchable.includes(
                        keyword,
                    )
                },
            )
        }, [
            employees,
            search,
            statusFilter,
        ])

    const openAdd = () => {
        setError(null)
        setSuccess(null)

        setForm({
            employee_code:
                getNextEmployeeCode(
                    employees,
                ),
            full_name: '',
        })
    }

    const openEdit = (
        employee: Employee,
    ) => {
        setError(null)
        setSuccess(null)

        setForm({
            id: employee.id,
            employee_code:
            employee.employee_code,
            full_name:
            employee.full_name,
        })
    }

    const closeForm = () => {
        if (saving) return

        setForm(null)
    }

    const handleSave = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault()

        if (!form) return

        const employeeCode =
            form.employee_code
                .trim()
                .toUpperCase()

        const fullName =
            form.full_name.trim()

        if (!employeeCode) {
            setError(
                'Vui lòng nhập mã nhân viên.',
            )
            return
        }

        if (!fullName) {
            setError(
                'Vui lòng nhập họ và tên.',
            )
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            if (form.id) {
                const {
                    data,
                    error: updateError,
                } = await supabase
                    .from('employees')
                    .update({
                        employee_code:
                        employeeCode,

                        full_name:
                        fullName,
                    })
                    .eq('id', form.id)
                    .select(
                        `
              id,
              employee_code,
              full_name,
              is_active,
              created_at,
              updated_at
            `,
                    )
                    .single()

                if (updateError) {
                    if (
                        updateError.code ===
                        '23505'
                    ) {
                        throw new Error(
                            'Mã nhân viên đã tồn tại.',
                        )
                    }

                    throw updateError
                }

                setEmployees(
                    (current) =>
                        current
                            .map((employee) =>
                                employee.id ===
                                data.id
                                    ? (data as Employee)
                                    : employee,
                            )
                            .sort((a, b) =>
                                a.employee_code.localeCompare(
                                    b.employee_code,
                                ),
                            ),
                )

                setSuccess(
                    `Đã cập nhật ${fullName}.`,
                )
            } else {
                const {
                    data,
                    error: insertError,
                } = await supabase
                    .from('employees')
                    .insert({
                        employee_code:
                        employeeCode,

                        full_name:
                        fullName,

                        is_active: true,
                    })
                    .select(
                        `
              id,
              employee_code,
              full_name,
              is_active,
              created_at,
              updated_at
            `,
                    )
                    .single()

                if (insertError) {
                    if (
                        insertError.code ===
                        '23505'
                    ) {
                        throw new Error(
                            'Mã nhân viên đã tồn tại.',
                        )
                    }

                    throw insertError
                }

                setEmployees(
                    (current) =>
                        [
                            ...current,
                            data as Employee,
                        ].sort((a, b) =>
                            a.employee_code.localeCompare(
                                b.employee_code,
                            ),
                        ),
                )

                setSuccess(
                    `Đã thêm nhân viên ${fullName}.`,
                )
            }

            setForm(null)
        } catch (err) {
            console.error(err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể lưu nhân viên.',
            )
        } finally {
            setSaving(false)
        }
    }

    const changeEmployeeStatus =
        async (
            employee: Employee,
        ) => {
            const newStatus =
                !employee.is_active

            if (!newStatus) {
                const confirmed =
                    window.confirm(
                        `Ngưng hoạt động "${employee.full_name}"?\n\nNhân viên sẽ không còn xuất hiện trong trang Chấm công hôm nay, nhưng toàn bộ lịch sử vẫn được giữ lại.`,
                    )

                if (!confirmed) {
                    return
                }
            }

            setChangingStatusId(
                employee.id,
            )

            setError(null)
            setSuccess(null)

            try {
                const {
                    data,
                    error: updateError,
                } = await supabase
                    .from('employees')
                    .update({
                        is_active:
                        newStatus,
                    })
                    .eq(
                        'id',
                        employee.id,
                    )
                    .select(
                        `
              id,
              employee_code,
              full_name,
              is_active,
              created_at,
              updated_at
            `,
                    )
                    .single()

                if (updateError) {
                    throw updateError
                }

                setEmployees(
                    (current) =>
                        current.map(
                            (item) =>
                                item.id ===
                                employee.id
                                    ? (data as Employee)
                                    : item,
                        ),
                )

                setSuccess(
                    newStatus
                        ? `Đã kích hoạt lại ${employee.full_name}.`
                        : `Đã ngưng hoạt động ${employee.full_name}.`,
                )
            } catch (err) {
                console.error(err)

                setError(
                    'Không thể thay đổi trạng thái nhân viên.',
                )
            } finally {
                setChangingStatusId(
                    null,
                )
            }
        }

    return (
        <div className="p-6 lg:p-8">
            {/* HEADER */}

            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        Nhân sự
                    </p>

                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                        Quản lý nhân viên
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Thêm, chỉnh sửa và quản
                        lý trạng thái nhân viên.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openAdd}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                    <Plus size={18}/>

                    Thêm nhân viên
                </button>
            </div>

            {/* SUMMARY */}

            <section className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <Users className="mb-4 text-slate-500"/>

                    <p className="text-sm text-slate-500">
                        Tổng nhân viên
                    </p>

                    <p className="mt-1 text-3xl font-bold text-slate-950">
                        {summary.total}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <BadgeCheck className="mb-4 text-emerald-600"/>

                    <p className="text-sm text-slate-500">
                        Đang hoạt động
                    </p>

                    <p className="mt-1 text-3xl font-bold text-slate-950">
                        {summary.active}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <CircleOff className="mb-4 text-slate-400"/>

                    <p className="text-sm text-slate-500">
                        Đã ngưng
                    </p>

                    <p className="mt-1 text-3xl font-bold text-slate-950">
                        {summary.inactive}
                    </p>
                </div>
            </section>

            {/* FILTER */}

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                    <div className="relative">
                        <Search
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value,
                                )
                            }
                            placeholder="Tìm theo tên hoặc mã nhân viên..."
                            className="h-11 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(
                                event.target
                                    .value as StatusFilter,
                            )
                        }
                        className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                        <option value="all">
                            Tất cả trạng thái
                        </option>

                        <option value="active">
                            Đang hoạt động
                        </option>

                        <option value="inactive">
                            Đã ngưng
                        </option>
                    </select>
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
                    className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    {success}
                </div>
            )}

            {/* LIST */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex min-h-80 items-center justify-center">
                        <div className="text-center">
                            <Loader2 className="mx-auto h-9 w-9 animate-spin text-slate-400"/>

                            <p className="mt-4 text-sm font-medium text-slate-500">
                                Đang tải danh sách
                                nhân viên...
                            </p>
                        </div>
                    </div>
                ) : filteredEmployees.length ===
                0 ? (
                    <div className="px-6 py-20 text-center">
                        <UserRound
                            size={44}
                            className="mx-auto text-slate-300"
                        />

                        <p className="mt-4 font-semibold text-slate-700">
                            Không tìm thấy nhân
                            viên
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px]">
                            <thead className="bg-slate-50">
                            <tr className="border-b border-slate-200">
                                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Mã NV
                                </th>

                                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Họ và tên
                                </th>

                                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Trạng thái
                                </th>

                                <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Thao tác
                                </th>
                            </tr>
                            </thead>

                            <tbody>
                            {filteredEmployees.map(
                                (employee) => {
                                    const changing =
                                        changingStatusId ===
                                        employee.id

                                    return (
                                        <tr
                                            key={
                                                employee.id
                                            }
                                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600">
                            {
                                employee.employee_code
                            }
                          </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {
                                                        employee.full_name
                                                    }
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                {employee.is_active ? (
                                                    <span
                                                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                              <span className="h-2 w-2 rounded-full bg-emerald-500"/>

                              Đang hoạt động
                            </span>
                                                ) : (
                                                    <span
                                                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
                              <span className="h-2 w-2 rounded-full bg-slate-400"/>

                              Đã ngưng
                            </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEdit(
                                                                employee,
                                                            )
                                                        }
                                                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                                                    >
                                                        <Edit3
                                                            size={
                                                                14
                                                            }
                                                        />

                                                        Sửa
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            changing
                                                        }
                                                        onClick={() =>
                                                            void changeEmployeeStatus(
                                                                employee,
                                                            )
                                                        }
                                                        className={
                                                            employee.is_active
                                                                ? 'flex cursor-pointer items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50'
                                                                : 'flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50'
                                                        }
                                                    >
                                                        {changing ? (
                                                            <Loader2
                                                                size={
                                                                    14
                                                                }
                                                                className="animate-spin"
                                                            />
                                                        ) : employee.is_active ? (
                                                            <CircleOff
                                                                size={
                                                                    14
                                                                }
                                                            />
                                                        ) : (
                                                            <RotateCcw
                                                                size={
                                                                    14
                                                                }
                                                            />
                                                        )}

                                                        {employee.is_active
                                                            ? 'Ngưng'
                                                            : 'Kích hoạt'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                },
                            )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* ADD / EDIT MODAL */}

            {form && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    {form.id
                                        ? 'Chỉnh sửa'
                                        : 'Nhân viên mới'}
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-950">
                                    {form.id
                                        ? 'Thông tin nhân viên'
                                        : 'Thêm nhân viên'}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={closeForm}
                                disabled={saving}
                                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed"
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        <form
                            onSubmit={
                                handleSave
                            }
                        >
                            <div className="space-y-5 p-6">
                                <div>
                                    <label
                                        htmlFor="employee-code"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Mã nhân viên
                                    </label>

                                    <input
                                        id="employee-code"
                                        type="text"
                                        value={
                                            form.employee_code
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setForm({
                                                ...form,

                                                employee_code:
                                                event.target
                                                    .value,
                                            })
                                        }
                                        placeholder="NV017"
                                        maxLength={30}
                                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold uppercase outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="employee-name"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Họ và tên
                                    </label>

                                    <input
                                        id="employee-name"
                                        type="text"
                                        value={
                                            form.full_name
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setForm({
                                                ...form,

                                                full_name:
                                                event.target
                                                    .value,
                                            })
                                        }
                                        placeholder="Nguyễn Văn A"
                                        maxLength={150}
                                        autoFocus={
                                            !form.id
                                        }
                                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                {!form.id && (
                                    <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
                                        Nhân viên mới sẽ
                                        tự động ở trạng
                                        thái{' '}
                                        <strong>
                                            Đang hoạt động
                                        </strong>{' '}
                                        và xuất hiện trong
                                        bảng chấm công.
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                                <button
                                    type="button"
                                    onClick={
                                        closeForm
                                    }
                                    disabled={
                                        saving
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
                                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {saving ? (
                                        <Loader2
                                            size={17}
                                            className="animate-spin"
                                        />
                                    ) : form.id ? (
                                        <Edit3
                                            size={17}
                                        />
                                    ) : (
                                        <Plus
                                            size={17}
                                        />
                                    )}

                                    {saving
                                        ? 'Đang lưu...'
                                        : form.id
                                            ? 'Lưu thay đổi'
                                            : 'Thêm nhân viên'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}