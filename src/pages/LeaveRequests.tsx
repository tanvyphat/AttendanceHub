import {
    CalendarDays,
    Check,
    CheckCircle2,
    Clock3,
    Loader2,
    Plus,
    Search,
    ShieldCheck,
    TriangleAlert,
    Umbrella,
    X,
    XCircle,
} from 'lucide-react'

import {
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'

import {supabase} from '../lib/supabase'

type LeaveSession =
    | 'morning'
    | 'afternoon'
    | 'full_day'

type ApprovalStatus =
    | 'pending'
    | 'approved'
    | 'rejected'

type StatusFilter =
    | 'all'
    | ApprovalStatus

interface Employee {
    id: string
    employee_code: string
    full_name: string
}

interface LeaveEmployeeRelation {
    employee_code: string
    full_name: string
}

interface LeaveRequest {
    id: string
    employee_id: string

    leave_date: string
    session: LeaveSession

    reason: string | null

    approval_status:
        ApprovalStatus

    decided_by: string | null
    decided_at: string | null

    created_at: string
    updated_at: string

    employees:
        LeaveEmployeeRelation | null
}

interface CreateForm {
    employeeId: string
    leaveDate: string
    session: LeaveSession
    reason: string
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
    value: string,
) {
    const [year, month] =
        value
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
            `${value}-01`,

        endDate:
            `${value}-${String(
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

function formatDateTime(
    value: string | null,
) {
    if (!value) return '—'

    return new Intl.DateTimeFormat(
        'vi-VN',
        {
            timeZone:
                'Asia/Ho_Chi_Minh',

            day: '2-digit',
            month: '2-digit',
            year: 'numeric',

            hour: '2-digit',
            minute: '2-digit',
        },
    ).format(
        new Date(value),
    )
}

function sessionLabel(
    session: LeaveSession,
) {
    switch (session) {
        case 'morning':
            return 'Buổi sáng'

        case 'afternoon':
            return 'Buổi chiều'

        case 'full_day':
            return 'Cả ngày'
    }
}

function statusLabel(
    status: ApprovalStatus,
) {
    switch (status) {
        case 'pending':
            return 'Chờ Sếp xác nhận'

        case 'approved':
            return 'Có phép'

        case 'rejected':
            return 'Không được duyệt'
    }
}

function statusClass(
    status: ApprovalStatus,
) {
    switch (status) {
        case 'pending':
            return 'bg-amber-50 text-amber-700'

        case 'approved':
            return 'bg-emerald-50 text-emerald-700'

        case 'rejected':
            return 'bg-red-50 text-red-600'
    }
}

export default function LeaveRequests() {
    const [month, setMonth] =
        useState(
            getVietnamMonth(),
        )

    const [
        employees,
        setEmployees,
    ] = useState<Employee[]>([])

    const [
        requests,
        setRequests,
    ] = useState<
        LeaveRequest[]
    >([])

    const [search, setSearch] =
        useState('')

    const [
        statusFilter,
        setStatusFilter,
    ] = useState<StatusFilter>(
        'all',
    )

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [
        decidingId,
        setDecidingId,
    ] = useState<string | null>(
        null,
    )

    const [form, setForm] =
        useState<CreateForm | null>(
            null,
        )

    const [error, setError] =
        useState<string | null>(
            null,
        )

    const [success, setSuccess] =
        useState<string | null>(
            null,
        )

    const loadData =
        useCallback(
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
                        employeeResult,
                        leaveResult,
                    ] =
                        await Promise.all([
                            supabase
                                .from(
                                    'employees',
                                )
                                .select(
                                    `
                    id,
                    employee_code,
                    full_name
                  `,
                                )
                                .eq(
                                    'is_active',
                                    true,
                                )
                                .order(
                                    'employee_code',
                                ),

                            supabase
                                .from(
                                    'leave_requests',
                                )
                                .select(
                                    `
                    id,
                    employee_id,
                    leave_date,
                    session,
                    reason,
                    approval_status,
                    decided_by,
                    decided_at,
                    created_at,
                    updated_at,

                    employees (
                      employee_code,
                      full_name
                    )
                  `,
                                )
                                .gte(
                                    'leave_date',
                                    startDate,
                                )
                                .lte(
                                    'leave_date',
                                    endDate,
                                )
                                .order(
                                    'leave_date',
                                    {
                                        ascending:
                                            false,
                                    },
                                )
                                .order(
                                    'created_at',
                                    {
                                        ascending:
                                            false,
                                    },
                                ),
                        ])

                    if (
                        employeeResult.error
                    ) {
                        throw employeeResult.error
                    }

                    if (
                        leaveResult.error
                    ) {
                        throw leaveResult.error
                    }

                    setEmployees(
                        (employeeResult.data ??
                            []) as Employee[],
                    )

                    setRequests(
                        (leaveResult.data ??
                            []) as unknown as LeaveRequest[],
                    )
                } catch (err) {
                    console.error(err)

                    setError(
                        'Không thể tải danh sách nghỉ phép.',
                    )
                } finally {
                    setLoading(false)
                }
            },
            [month],
        )

    useEffect(() => {
        void loadData()
    }, [loadData])

    const filteredRequests =
        useMemo(() => {
            const keyword =
                search
                    .trim()
                    .toLocaleLowerCase(
                        'vi-VN',
                    )

            return requests.filter(
                (request) => {
                    if (
                        statusFilter !==
                        'all' &&
                        request.approval_status !==
                        statusFilter
                    ) {
                        return false
                    }

                    if (!keyword) {
                        return true
                    }

                    const employee =
                        request.employees

                    const searchable =
                        `${
                            employee
                                ?.employee_code ??
                            ''
                        } ${
                            employee
                                ?.full_name ??
                            ''
                        }`.toLocaleLowerCase(
                            'vi-VN',
                        )

                    return searchable.includes(
                        keyword,
                    )
                },
            )
        }, [
            requests,
            search,
            statusFilter,
        ])

    const summary =
        useMemo(() => {
            return {
                total:
                requests.length,

                pending:
                requests.filter(
                    (request) =>
                        request.approval_status ===
                        'pending',
                ).length,

                approved:
                requests.filter(
                    (request) =>
                        request.approval_status ===
                        'approved',
                ).length,

                rejected:
                requests.filter(
                    (request) =>
                        request.approval_status ===
                        'rejected',
                ).length,
            }
        }, [requests])

    const openCreate = () => {
        setError(null)
        setSuccess(null)

        setForm({
            employeeId:
                employees[0]?.id ??
                '',

            leaveDate:
                getVietnamDate(),

            session:
                'full_day',

            reason: '',
        })
    }

    const closeCreate = () => {
        if (saving) return

        setForm(null)
    }

    const createRequest =
        async (
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

            if (!form.leaveDate) {
                setError(
                    'Vui lòng chọn ngày nghỉ.',
                )
                return
            }

            setSaving(true)
            setError(null)
            setSuccess(null)

            try {
                const {
                    error:
                        insertError,
                } = await supabase
                    .from(
                        'leave_requests',
                    )
                    .insert({
                        employee_id:
                        form.employeeId,

                        leave_date:
                        form.leaveDate,

                        session:
                        form.session,

                        reason:
                            form.reason.trim() ||
                            null,

                        approval_status:
                            'pending',
                    })

                if (insertError) {
                    if (
                        insertError.message.includes(
                            'LEAVE_REQUEST_OVERLAP',
                        )
                    ) {
                        throw new Error(
                            'Nhân viên đã có yêu cầu nghỉ trùng buổi trong ngày này.',
                        )
                    }

                    throw insertError
                }

                setForm(null)

                setSuccess(
                    'Đã tạo yêu cầu nghỉ. Trạng thái hiện tại: Chờ Sếp xác nhận.',
                )

                await loadData()
            } catch (err) {
                console.error(err)

                setError(
                    err instanceof Error
                        ? err.message
                        : 'Không thể tạo yêu cầu nghỉ.',
                )
            } finally {
                setSaving(false)
            }
        }

    const decideRequest =
        async (
            request:
            LeaveRequest,
            status:
                'approved'
                | 'rejected',
        ) => {
            if (
                status ===
                'rejected'
            ) {
                const confirmed =
                    window.confirm(
                        `Xác nhận Sếp KHÔNG duyệt yêu cầu nghỉ của ${
                            request.employees
                                ?.full_name ??
                            'nhân viên'
                        }?`,
                    )

                if (!confirmed) {
                    return
                }
            }

            setDecidingId(
                request.id,
            )

            setError(null)
            setSuccess(null)

            try {
                const {
                    error:
                        decisionError,
                } = await supabase.rpc(
                    'decide_leave_request',
                    {
                        p_request_id:
                        request.id,

                        p_status:
                        status,
                    },
                )

                if (decisionError) {
                    throw decisionError
                }

                setSuccess(
                    status ===
                    'approved'
                        ? `Đã xác nhận nghỉ có phép cho ${
                            request.employees
                                ?.full_name ??
                            'nhân viên'
                        }.`
                        : `Đã ghi nhận yêu cầu không được duyệt của ${
                            request.employees
                                ?.full_name ??
                            'nhân viên'
                        }.`,
                )

                await loadData()
            } catch (err) {
                console.error(err)

                setError(
                    'Không thể cập nhật quyết định nghỉ.',
                )
            } finally {
                setDecidingId(
                    null,
                )
            }
        }

    return (
        <div className="p-6 lg:p-8">
            {/* HEADER */}

            <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        Nhân sự
                    </p>

                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                        Nghỉ phép
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Theo dõi nhân viên
                        nghỉ sáng, chiều hoặc
                        cả ngày và quyết định
                        của Sếp.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openCreate}
                    disabled={
                        employees.length ===
                        0
                    }
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Plus size={18}/>

                    Tạo yêu cầu nghỉ
                </button>
            </div>

            {/* IMPORTANT RULE */}

            <section className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
                <p className="text-sm leading-6 text-blue-800">
                    <strong>
                        Cách hoạt động:
                    </strong>{' '}
                    Khi Sếp xác nhận{' '}
                    <strong>
                        Có phép
                    </strong>
                    , hệ thống tự cập nhật
                    chấm công thành nghỉ có
                    phép. Nếu Sếp{' '}
                    <strong>
                        không duyệt
                    </strong>{' '}
                    cho ngày hôm nay hoặc
                    ngày đã qua, hệ thống
                    ghi nhận nghỉ không
                    phép. Với ngày tương
                    lai, từ chối đơn không
                    tự động coi nhân viên
                    là vắng mặt.
                </p>
            </section>

            {/* SUMMARY */}

            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <Umbrella className="mb-4 text-slate-500"/>

                    <p className="text-sm text-slate-500">
                        Tổng yêu cầu
                    </p>

                    <p className="mt-1 text-3xl font-bold text-slate-950">
                        {summary.total}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <Clock3 className="mb-4 text-amber-600"/>

                    <p className="text-sm text-slate-500">
                        Chờ xác nhận
                    </p>

                    <p className="mt-1 text-3xl font-bold text-slate-950">
                        {summary.pending}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <ShieldCheck className="mb-4 text-emerald-600"/>

                    <p className="text-sm text-slate-500">
                        Có phép
                    </p>

                    <p className="mt-1 text-3xl font-bold text-slate-950">
                        {summary.approved}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <TriangleAlert className="mb-4 text-red-600"/>

                    <p className="text-sm text-slate-500">
                        Không được duyệt
                    </p>

                    <p className="mt-1 text-3xl font-bold text-slate-950">
                        {summary.rejected}
                    </p>
                </div>
            </section>

            {/* FILTER */}

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 lg:grid-cols-[180px_1fr_220px]">
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

                    <select
                        value={
                            statusFilter
                        }
                        onChange={(event) =>
                            setStatusFilter(
                                event.target
                                    .value as StatusFilter,
                            )
                        }
                        className="h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                        <option value="all">
                            Tất cả trạng thái
                        </option>

                        <option value="pending">
                            Chờ Sếp xác nhận
                        </option>

                        <option value="approved">
                            Có phép
                        </option>

                        <option value="rejected">
                            Không được duyệt
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
                    className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    <CheckCircle2
                        size={17}
                    />

                    {success}
                </div>
            )}

            {/* TABLE */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex min-h-80 items-center justify-center">
                        <Loader2 className="h-9 w-9 animate-spin text-slate-400"/>
                    </div>
                ) : filteredRequests.length ===
                0 ? (
                    <div className="px-6 py-20 text-center">
                        <CalendarDays
                            size={44}
                            className="mx-auto text-slate-300"
                        />

                        <p className="mt-4 font-semibold text-slate-700">
                            Không có yêu cầu
                            nghỉ phù hợp
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px]">
                            <thead className="bg-slate-50">
                            <tr className="border-b border-slate-200">
                                <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                    Ngày nghỉ
                                </th>

                                <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                    Nhân viên
                                </th>

                                <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                    Buổi
                                </th>

                                <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                    Lý do
                                </th>

                                <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                    Trạng thái
                                </th>

                                <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                    Quyết định lúc
                                </th>

                                <th className="px-5 py-4 text-right text-xs font-bold uppercase text-slate-500">
                                    Quyết định
                                </th>
                            </tr>
                            </thead>

                            <tbody>
                            {filteredRequests.map(
                                (request) => {
                                    const deciding =
                                        decidingId ===
                                        request.id

                                    return (
                                        <tr
                                            key={
                                                request.id
                                            }
                                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-4 font-semibold text-slate-700">
                                                {formatDate(
                                                    request.leave_date,
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {request
                                                            .employees
                                                            ?.full_name ??
                                                        'Không xác định'}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    {request
                                                            .employees
                                                            ?.employee_code ??
                                                        '---'}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                            {sessionLabel(
                                request.session,
                            )}
                          </span>
                                            </td>

                                            <td className="max-w-64 px-5 py-4 text-sm text-slate-500">
                                                {request.reason ||
                                                    '—'}
                                            </td>

                                            <td className="px-5 py-4">
                          <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${statusClass(
                                  request.approval_status,
                              )}`}
                          >
                            {statusLabel(
                                request.approval_status,
                            )}
                          </span>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-500">
                                                {formatDateTime(
                                                    request.decided_at,
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            deciding
                                                        }
                                                        onClick={() =>
                                                            void decideRequest(
                                                                request,
                                                                'approved',
                                                            )
                                                        }
                                                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {deciding ? (
                                                            <Loader2
                                                                size={
                                                                    14
                                                                }
                                                                className="animate-spin"
                                                            />
                                                        ) : (
                                                            <Check
                                                                size={
                                                                    14
                                                                }
                                                            />
                                                        )}

                                                        Có phép
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            deciding
                                                        }
                                                        onClick={() =>
                                                            void decideRequest(
                                                                request,
                                                                'rejected',
                                                            )
                                                        }
                                                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <XCircle
                                                            size={
                                                                14
                                                            }
                                                        />

                                                        Không phép
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

            {/* CREATE MODAL */}

            {form && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Nghỉ phép
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-950">
                                    Tạo yêu cầu nghỉ
                                </h2>
                            </div>

                            <button
                                type="button"
                                disabled={
                                    saving
                                }
                                onClick={
                                    closeCreate
                                }
                                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed"
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        <form
                            onSubmit={
                                createRequest
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
                                                event.target
                                                    .value,
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
                                                    {
                                                        employee.employee_code
                                                    }{' '}
                                                    —{' '}
                                                    {
                                                        employee.full_name
                                                    }
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Ngày nghỉ
                                    </label>

                                    <input
                                        type="date"
                                        value={
                                            form.leaveDate
                                        }
                                        onChange={(event) =>
                                            setForm({
                                                ...form,

                                                leaveDate:
                                                event.target
                                                    .value,
                                            })
                                        }
                                        className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Thời gian nghỉ
                                    </label>

                                    <div className="grid grid-cols-3 gap-2">
                                        {(
                                            [
                                                [
                                                    'morning',
                                                    'Sáng',
                                                ],
                                                [
                                                    'afternoon',
                                                    'Chiều',
                                                ],
                                                [
                                                    'full_day',
                                                    'Cả ngày',
                                                ],
                                            ] as const
                                        ).map(
                                            ([
                                                 value,
                                                 label,
                                             ]) => (
                                                <button
                                                    key={
                                                        value
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        setForm(
                                                            {
                                                                ...form,

                                                                session:
                                                                value,
                                                            },
                                                        )
                                                    }
                                                    className={[
                                                        'cursor-pointer rounded-xl border px-3 py-3 text-sm font-semibold transition',

                                                        form.session ===
                                                        value
                                                            ? 'border-slate-950 bg-slate-950 text-white'
                                                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                                                    ].join(
                                                        ' ',
                                                    )}
                                                >
                                                    {
                                                        label
                                                    }
                                                </button>
                                            ),
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Lý do
                                    </label>

                                    <textarea
                                        rows={4}
                                        value={
                                            form.reason
                                        }
                                        onChange={(event) =>
                                            setForm({
                                                ...form,

                                                reason:
                                                event.target
                                                    .value,
                                            })
                                        }
                                        placeholder="Ví dụ: Việc gia đình, khám bệnh..."
                                        className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                                    Yêu cầu mới sẽ có
                                    trạng thái{' '}
                                    <strong>
                                        Chờ Sếp xác nhận
                                    </strong>
                                    . Chưa ảnh hưởng
                                    đến bảng chấm công
                                    cho đến khi có
                                    quyết định.
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                                <button
                                    type="button"
                                    onClick={
                                        closeCreate
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
                                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2
                                            size={17}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <Plus
                                            size={17}
                                        />
                                    )}

                                    {saving
                                        ? 'Đang tạo...'
                                        : 'Tạo yêu cầu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}