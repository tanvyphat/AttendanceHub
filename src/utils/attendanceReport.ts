import ExcelJS from 'exceljs'

export type AttendanceStatus =
    | 'pending'
    | 'present'
    | 'approved_leave'
    | 'unapproved_leave'

export interface ReportEmployee {
    id: string
    employee_code: string
    full_name: string
}

export interface ReportAttendance {
    id: string
    employee_id: string
    work_date: string
    check_in: string | null
    check_out: string | null

    morning_status: AttendanceStatus
    afternoon_status: AttendanceStatus

    is_late: boolean
    note: string | null
}

export interface EmployeeMonthlySummary {
    employeeId: string
    employeeCode: string
    fullName: string

    presentSessions: number
    workDays: number

    approvedLeaveSessions: number
    approvedLeaveDays: number

    unapprovedLeaveSessions: number
    unapprovedLeaveDays: number

    lateCount: number
}

export function getMonthRange(
    monthValue: string,
) {
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

        daysInMonth: lastDay,
    }
}

export function buildMonthlySummaries(
    employees: ReportEmployee[],
    attendance: ReportAttendance[],
): EmployeeMonthlySummary[] {
    return employees.map((employee) => {
        const employeeAttendance =
            attendance.filter(
                (record) =>
                    record.employee_id ===
                    employee.id,
            )

        let presentSessions = 0
        let approvedLeaveSessions = 0
        let unapprovedLeaveSessions = 0
        let lateCount = 0

        for (const record of employeeAttendance) {
            if (
                record.morning_status ===
                'present'
            ) {
                presentSessions += 1
            }

            if (
                record.afternoon_status ===
                'present'
            ) {
                presentSessions += 1
            }

            if (
                record.morning_status ===
                'approved_leave'
            ) {
                approvedLeaveSessions += 1
            }

            if (
                record.afternoon_status ===
                'approved_leave'
            ) {
                approvedLeaveSessions += 1
            }

            if (
                record.morning_status ===
                'unapproved_leave'
            ) {
                unapprovedLeaveSessions += 1
            }

            if (
                record.afternoon_status ===
                'unapproved_leave'
            ) {
                unapprovedLeaveSessions += 1
            }

            if (record.is_late) {
                lateCount += 1
            }
        }

        return {
            employeeId: employee.id,

            employeeCode:
            employee.employee_code,

            fullName:
            employee.full_name,

            presentSessions,

            workDays:
                presentSessions / 2,

            approvedLeaveSessions,

            approvedLeaveDays:
                approvedLeaveSessions / 2,

            unapprovedLeaveSessions,

            unapprovedLeaveDays:
                unapprovedLeaveSessions / 2,

            lateCount,
        }
    })
}

function timeToMinutes(
    value: string | null | undefined,
) {
    if (!value) return null

    const [hours, minutes] = value
        .slice(0, 5)
        .split(':')
        .map(Number)

    if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes)
    ) {
        return null
    }

    return hours * 60 + minutes
}

function getLateMinutes(
    record: ReportAttendance | undefined,
    lateAfterTime: string,
) {
    if (!record?.is_late) {
        return 0
    }

    const checkInMinutes =
        timeToMinutes(record.check_in)
    const lateAfterMinutes =
        timeToMinutes(lateAfterTime)

    if (
        checkInMinutes === null ||
        lateAfterMinutes === null
    ) {
        return 0
    }

    return Math.max(
        0,
        checkInMinutes - lateAfterMinutes,
    )
}

function getStatusLabel(
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

function getAttendanceDetails(
    record: ReportAttendance | undefined,
    lateAfterTime: string,
) {
    if (!record) {
        return 'Chưa chấm'
    }

    const lines: string[] = []

    if (record.check_in) {
        lines.push(
            `Vào: ${record.check_in.slice(0, 5)}`,
        )
    }

    if (record.check_out) {
        lines.push(
            `Ra: ${record.check_out.slice(0, 5)}`,
        )
    }

    if (record.is_late) {
        const lateMinutes = getLateMinutes(
            record,
            lateAfterTime,
        )

        lines.push(
            lateMinutes > 0
                ? `Trễ: ${lateMinutes} phút`
                : 'Đi trễ',
        )
    }

    lines.push(
        `Sáng: ${getStatusLabel(
            record.morning_status,
        )}`,
    )

    lines.push(
        `Chiều: ${getStatusLabel(
            record.afternoon_status,
        )}`,
    )

    if (record.note?.trim()) {
        lines.push(
            `Ghi chú: ${record.note.trim()}`,
        )
    }

    return lines.join('\n')
}

function getColumnLetter(
    columnNumber: number,
) {
    let result = ''
    let number = columnNumber

    while (number > 0) {
        const remainder =
            (number - 1) % 26

        result =
            String.fromCharCode(
                65 + remainder,
            ) + result

        number = Math.floor(
            (number - 1) / 26,
        )
    }

    return result
}

function styleTitle(
    worksheet: ExcelJS.Worksheet,
    range: string,
) {
    const cell =
        worksheet.getCell(
            range.split(':')[0],
        )

    cell.font = {
        bold: true,
        size: 16,
    }

    cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
    }
}

function styleHeader(
    row: ExcelJS.Row,
) {
    row.height = 25

    row.eachCell((cell) => {
        cell.font = {
            bold: true,
        }

        cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true,
        }

        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
                argb: 'FFE2E8F0',
            },
        }

        cell.border = {
            top: {
                style: 'thin',
                color: {
                    argb: 'FFCBD5E1',
                },
            },
            left: {
                style: 'thin',
                color: {
                    argb: 'FFCBD5E1',
                },
            },
            bottom: {
                style: 'thin',
                color: {
                    argb: 'FFCBD5E1',
                },
            },
            right: {
                style: 'thin',
                color: {
                    argb: 'FFCBD5E1',
                },
            },
        }
    })
}

function applyTableBorders(
    worksheet: ExcelJS.Worksheet,
    startRow: number,
    endRow: number,
    columnCount: number,
) {
    for (
        let rowNumber = startRow;
        rowNumber <= endRow;
        rowNumber += 1
    ) {
        const row =
            worksheet.getRow(rowNumber)

        for (
            let column = 1;
            column <= columnCount;
            column += 1
        ) {
            const cell =
                row.getCell(column)

            cell.border = {
                top: {
                    style: 'thin',
                    color: {
                        argb: 'FFE2E8F0',
                    },
                },

                left: {
                    style: 'thin',
                    color: {
                        argb: 'FFE2E8F0',
                    },
                },

                bottom: {
                    style: 'thin',
                    color: {
                        argb: 'FFE2E8F0',
                    },
                },

                right: {
                    style: 'thin',
                    color: {
                        argb: 'FFE2E8F0',
                    },
                },
            }

            cell.alignment = {
                vertical: 'middle',
                wrapText: true,
            }
        }
    }
}

export async function exportAttendanceExcel(
    month: string,
    employees: ReportEmployee[],
    attendance: ReportAttendance[],
    lateAfterTime = '07:35',
    selectedDates?: string[],
    periodLabel?: string,
) {
    const workbook =
        new ExcelJS.Workbook()

    workbook.creator =
        'AttendanceHub'

    workbook.created =
        new Date()

    workbook.modified =
        new Date()

    const {
        startDate,
        endDate,
        daysInMonth,
    } = getMonthRange(month)

    const [year, monthNumber] =
        month.split('-')

    const displayMonth =
        `${monthNumber}/${year}`

    const fullMonthDates =
        Array.from(
            {
                length: daysInMonth,
            },
            (_, index) =>
                `${month}-${String(
                    index + 1,
                ).padStart(2, '0')}`,
        )

    const exportDates =
        selectedDates
            ? Array.from(
                new Set(
                    selectedDates.filter(
                        (date) =>
                            date >= startDate &&
                            date <= endDate,
                    ),
                ),
            ).sort()
            : fullMonthDates

    if (exportDates.length === 0) {
        throw new Error(
            'Chưa chọn tuần hoặc ngày nào để xuất báo cáo.',
        )
    }

    const exportDateSet =
        new Set(exportDates)

    const filteredAttendance =
        attendance.filter(
            (record) =>
                exportDateSet.has(
                    record.work_date,
                ),
        )

    const summaries =
        buildMonthlySummaries(
            employees,
            filteredAttendance,
        )

    const firstExportDate =
        exportDates[0]

    const lastExportDate =
        exportDates[
            exportDates.length - 1
        ]

    const formatDate = (
        value: string,
    ) => {
        const [
            dateYear,
            dateMonth,
            dateDay,
        ] = value.split('-')

        return `${dateDay}/${dateMonth}/${dateYear}`
    }

    const reportPeriodLabel =
        periodLabel ??
        `Tháng ${displayMonth}`

    // ========================================
    // SHEET 1 — TỔNG HỢP
    // ========================================

    const summarySheet =
        workbook.addWorksheet(
            'Tổng hợp',
            {
                views: [
                    {
                        state: 'frozen',
                        ySplit: 4,
                    },
                ],
            },
        )

    summarySheet.mergeCells(
        'A1:J1',
    )

    summarySheet.getCell(
        'A1',
    ).value =
        'BÁO CÁO CHẤM CÔNG'

    styleTitle(
        summarySheet,
        'A1:J1',
    )

    summarySheet.mergeCells(
        'A2:J2',
    )

    summarySheet.getCell(
        'A2',
    ).value =
        `${reportPeriodLabel} | ${formatDate(
            firstExportDate,
        )} → ${formatDate(
            lastExportDate,
        )}`

    summarySheet.getCell(
        'A2',
    ).alignment = {
        horizontal: 'center',
    }

    summarySheet.addRow([])

    const summaryHeaders = [
        'STT',
        'Mã NV',
        'Họ và tên',
        'Buổi có mặt',
        'Ngày công',
        'Buổi nghỉ có phép',
        'Ngày nghỉ có phép',
        'Buổi nghỉ không phép',
        'Ngày nghỉ không phép',
        'Số lần đi trễ',
    ]

    const summaryHeader =
        summarySheet.addRow(
            summaryHeaders,
        )

    styleHeader(summaryHeader)

    summaries.forEach(
        (summary, index) => {
            summarySheet.addRow([
                index + 1,

                summary.employeeCode,

                summary.fullName,

                summary.presentSessions,

                summary.workDays,

                summary.approvedLeaveSessions,

                summary.approvedLeaveDays,

                summary.unapprovedLeaveSessions,

                summary.unapprovedLeaveDays,

                summary.lateCount,
            ])
        },
    )

    summarySheet.columns = [
        {width: 7},
        {width: 12},
        {width: 30},
        {width: 15},
        {width: 12},
        {width: 20},
        {width: 20},
        {width: 22},
        {width: 22},
        {width: 15},
    ]

    const summaryEndRow =
        4 + summaries.length

    applyTableBorders(
        summarySheet,
        4,
        summaryEndRow,
        summaryHeaders.length,
    )

    for (
        let row = 5;
        row <= summaryEndRow;
        row += 1
    ) {
        summarySheet.getCell(
            row,
            5,
        ).numFmt = '0.0'

        summarySheet.getCell(
            row,
            7,
        ).numFmt = '0.0'

        summarySheet.getCell(
            row,
            9,
        ).numFmt = '0.0'
    }

    summarySheet.autoFilter = {
        from: 'A4',
        to: `J${summaryEndRow}`,
    }

    // ========================================
    // SHEET 2 — BẢNG CHẤM CÔNG
    // Nhân viên theo trục Y, ngày theo trục X
    // ========================================

    const attendanceSheet =
        workbook.addWorksheet(
            'Bảng chấm công',
            {
                views: [
                    {
                        state: 'frozen',
                        xSplit: 3,
                        ySplit: 4,
                    },
                ],
            },
        )

    const matrixHeaders = [
        'STT',
        'Mã NV',
        'Họ và tên',

        ...exportDates.map(
            (date) => {
                const [, dateMonth, dateDay] =
                    date.split('-')

                return `${dateDay}/${dateMonth}`
            },
        ),

        'Ngày công',
        'Đi trễ',
        'Nghỉ phép',
        'Không phép',
    ]

    const matrixLastColumn =
        getColumnLetter(
            matrixHeaders.length,
        )

    attendanceSheet.mergeCells(
        `A1:${matrixLastColumn}1`,
    )

    attendanceSheet.getCell(
        'A1',
    ).value =
        `BẢNG CHẤM CÔNG — ${reportPeriodLabel.toUpperCase()}`

    styleTitle(
        attendanceSheet,
        `A1:${matrixLastColumn}1`,
    )

    attendanceSheet.mergeCells(
        `A2:${matrixLastColumn}2`,
    )

    attendanceSheet.getCell(
        'A2',
    ).value =
        `Mỗi ô hiển thị giờ vào, giờ ra, số phút trễ, trạng thái sáng/chiều và ghi chú. Mốc đi trễ: sau ${lateAfterTime}.`

    attendanceSheet.getCell(
        'A2',
    ).alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
    }

    attendanceSheet.getRow(2).height = 32

    attendanceSheet.addRow([])

    const matrixHeaderRow =
        attendanceSheet.addRow(
            matrixHeaders,
        )

    styleHeader(
        matrixHeaderRow,
    )

    matrixHeaderRow.height = 40

    const attendanceMap =
        new Map<
            string,
            ReportAttendance
        >()

    filteredAttendance.forEach(
        (record) => {
            attendanceMap.set(
                `${record.employee_id}_${record.work_date}`,
                record,
            )
        },
    )

    employees.forEach(
        (employee, index) => {
            const summary =
                summaries.find(
                    (item) =>
                        item.employeeId ===
                        employee.id,
                )

            const dayValues =
                exportDates.map(
                    (date) => {
                        const record =
                            attendanceMap.get(
                                `${employee.id}_${date}`,
                            )

                        return getAttendanceDetails(
                            record,
                            lateAfterTime,
                        )
                    },
                )

            const row =
                attendanceSheet.addRow([
                    index + 1,

                    employee.employee_code,

                    employee.full_name,

                    ...dayValues,

                    summary?.workDays ?? 0,

                    summary?.lateCount ?? 0,

                    summary?.approvedLeaveDays ??
                    0,

                    summary?.unapprovedLeaveDays ??
                    0,
                ])

            row.height = 82

            exportDates.forEach(
                (date, dateIndex) => {
                    const record =
                        attendanceMap.get(
                            `${employee.id}_${date}`,
                        )

                    if (!record) return

                    const cell =
                        row.getCell(
                            dateIndex + 4,
                        )

                    const hasUnapprovedLeave =
                        record.morning_status ===
                            'unapproved_leave' ||
                        record.afternoon_status ===
                            'unapproved_leave'

                    const hasApprovedLeave =
                        record.morning_status ===
                            'approved_leave' ||
                        record.afternoon_status ===
                            'approved_leave'

                    const hasPresent =
                        record.morning_status ===
                            'present' ||
                        record.afternoon_status ===
                            'present'

                    const fillColor =
                        hasUnapprovedLeave
                            ? 'FFFEE2E2'
                            : record.is_late
                              ? 'FFFEF3C7'
                              : hasApprovedLeave
                                ? 'FFDBEAFE'
                                : hasPresent
                                  ? 'FFDCFCE7'
                                  : null

                    if (fillColor) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: {
                                argb: fillColor,
                            },
                        }
                    }
                },
            )
        },
    )

    attendanceSheet.getColumn(
        1,
    ).width = 6

    attendanceSheet.getColumn(
        2,
    ).width = 12

    attendanceSheet.getColumn(
        3,
    ).width = 28

    const firstDayColumn = 4
    const lastDayColumn =
        firstDayColumn +
        exportDates.length -
        1

    for (
        let column = firstDayColumn;
        column <= lastDayColumn;
        column += 1
    ) {
        attendanceSheet.getColumn(
            column,
        ).width = 24
    }

    for (
        let column =
            lastDayColumn + 1;
        column <= matrixHeaders.length;
        column += 1
    ) {
        attendanceSheet.getColumn(
            column,
        ).width = 13
    }

    const matrixEndRow =
        4 + employees.length

    applyTableBorders(
        attendanceSheet,
        4,
        matrixEndRow,
        matrixHeaders.length,
    )

    for (
        let row = 5;
        row <= matrixEndRow;
        row += 1
    ) {
        attendanceSheet.getCell(
            row,
            1,
        ).alignment = {
            horizontal: 'center',
            vertical: 'middle',
        }

        attendanceSheet.getCell(
            row,
            2,
        ).alignment = {
            vertical: 'middle',
        }

        attendanceSheet.getCell(
            row,
            3,
        ).alignment = {
            vertical: 'middle',
        }

        for (
            let column =
                firstDayColumn;
            column <= lastDayColumn;
            column += 1
        ) {
            attendanceSheet.getCell(
                row,
                column,
            ).alignment = {
                horizontal: 'left',
                vertical: 'top',
                wrapText: true,
            }
        }

        attendanceSheet.getCell(
            row,
            lastDayColumn + 1,
        ).numFmt = '0.0'

        attendanceSheet.getCell(
            row,
            lastDayColumn + 3,
        ).numFmt = '0.0'

        attendanceSheet.getCell(
            row,
            lastDayColumn + 4,
        ).numFmt = '0.0'
    }

    // ========================================
    // SHEET 3 — ĐI TRỄ & NGHỈ
    // ========================================

    const detailSheet =
        workbook.addWorksheet(
            'Đi trễ & Nghỉ',
            {
                views: [
                    {
                        state: 'frozen',
                        ySplit: 4,
                    },
                ],
            },
        )

    detailSheet.mergeCells(
        'A1:I1',
    )

    detailSheet.getCell(
        'A1',
    ).value =
        `CHI TIẾT ĐI TRỄ & NGHỈ — ${reportPeriodLabel.toUpperCase()}`

    styleTitle(
        detailSheet,
        'A1:I1',
    )

    detailSheet.addRow([])
    detailSheet.addRow([])

    const detailHeaders = [
        'Ngày',
        'Mã NV',
        'Họ và tên',
        'Loại',
        'Buổi',
        'Giờ vào',
        'Giờ về',
        'Trễ (phút)',
        'Ghi chú',
    ]

    const detailHeader =
        detailSheet.addRow(
            detailHeaders,
        )

    styleHeader(detailHeader)

    const employeeMap =
        new Map(
            employees.map(
                (employee) => [
                    employee.id,
                    employee,
                ],
            ),
        )

    const sortedAttendance = [
        ...filteredAttendance,
    ].sort((a, b) =>
        a.work_date.localeCompare(
            b.work_date,
        ),
    )

    for (
        const record of sortedAttendance
        ) {
        const employee =
            employeeMap.get(
                record.employee_id,
            )

        if (!employee) continue

        if (record.is_late) {
            detailSheet.addRow([
                record.work_date,

                employee.employee_code,

                employee.full_name,

                'Đi trễ',

                'Sáng',

                record.check_in?.slice(
                    0,
                    5,
                ) ?? '',

                record.check_out?.slice(
                    0,
                    5,
                ) ?? '',

                getLateMinutes(
                    record,
                    lateAfterTime,
                ),

                record.note ?? '',
            ])
        }

        const morningLeave =
            record.morning_status ===
            'approved_leave' ||
            record.morning_status ===
            'unapproved_leave'

        const afternoonLeave =
            record.afternoon_status ===
            'approved_leave' ||
            record.afternoon_status ===
            'unapproved_leave'

        if (
            morningLeave &&
            afternoonLeave &&
            record.morning_status ===
            record.afternoon_status
        ) {
            detailSheet.addRow([
                record.work_date,

                employee.employee_code,

                employee.full_name,

                record.morning_status ===
                'approved_leave'
                    ? 'Nghỉ có phép'
                    : 'Nghỉ không phép',

                'Cả ngày',

                '',

                '',

                '',

                record.note ?? '',
            ])

            continue
        }

        if (morningLeave) {
            detailSheet.addRow([
                record.work_date,

                employee.employee_code,

                employee.full_name,

                record.morning_status ===
                'approved_leave'
                    ? 'Nghỉ có phép'
                    : 'Nghỉ không phép',

                'Sáng',

                '',

                '',

                '',

                record.note ?? '',
            ])
        }

        if (afternoonLeave) {
            detailSheet.addRow([
                record.work_date,

                employee.employee_code,

                employee.full_name,

                record.afternoon_status ===
                'approved_leave'
                    ? 'Nghỉ có phép'
                    : 'Nghỉ không phép',

                'Chiều',

                '',

                '',

                '',

                record.note ?? '',
            ])
        }
    }

    detailSheet.columns = [
        {width: 14},
        {width: 12},
        {width: 28},
        {width: 20},
        {width: 14},
        {width: 12},
        {width: 12},
        {width: 14},
        {width: 35},
    ]

    if (
        detailSheet.rowCount >= 4
    ) {
        applyTableBorders(
            detailSheet,
            4,
            detailSheet.rowCount,
            detailHeaders.length,
        )
    }

    // ========================================
    // DOWNLOAD
    // ========================================

    const buffer =
        await workbook.xlsx.writeBuffer()

    const blob =
        new Blob(
            [
                new Uint8Array(
                    buffer,
                ),
            ],
            {
                type:
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        )

    const url =
        URL.createObjectURL(blob)

    const anchor =
        document.createElement('a')

    anchor.href = url

    const filePeriod =
        selectedDates
            ? `Tuan_${firstExportDate.slice(
                8,
                10,
            )}-${lastExportDate.slice(
                8,
                10,
            )}`
            : 'Thang'

    anchor.download =
        `ChamCong_${monthNumber}_${year}_${filePeriod}.xlsx`

    document.body.appendChild(
        anchor,
    )

    anchor.click()
    anchor.remove()

    URL.revokeObjectURL(url)
}
