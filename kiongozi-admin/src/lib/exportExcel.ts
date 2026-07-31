export interface ExportColumn<T> {
  header: string
  width?: number
  value: (row: T) => string | number | Date | null | undefined
}

/**
 * Builds a styled .xlsx (merged title row, bold header, bordered numbered rows —
 * the EOC-report layout) and triggers a browser download.
 */
export async function exportToExcel<T>(opts: {
  title: string
  fileName: string
  columns: ExportColumn<T>[]
  rows: T[]
}) {
  const { title, fileName, columns, rows } = opts

  // Lazy-loaded: exceljs is ~1 MB and only needed when an export is triggered
  const ExcelJS = (await import('exceljs')).default

  const wb = new ExcelJS.Workbook()
  wb.created = new Date()
  const ws = wb.addWorksheet('Sheet1')

  const totalCols = columns.length + 1 // +1 for the "No" column

  // Row 1 — merged title
  ws.mergeCells(1, 1, 1, totalCols)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = title
  titleCell.font = { bold: true, size: 14 }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 24

  // Row 2 — headers
  const headerRow = ws.getRow(2)
  headerRow.getCell(1).value = 'No'
  columns.forEach((col, i) => {
    headerRow.getCell(i + 2).value = col.header
  })
  headerRow.eachCell(cell => {
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF3' } }
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    }
    cell.alignment = { vertical: 'middle' }
  })

  // Data rows
  rows.forEach((row, idx) => {
    const r = ws.getRow(idx + 3)
    r.getCell(1).value = idx + 1
    columns.forEach((col, i) => {
      const v = col.value(row)
      r.getCell(i + 2).value = v == null ? '' : v
    })
    r.eachCell({ includeEmpty: false }, cell => {
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      }
      cell.alignment = { vertical: 'middle', wrapText: false }
    })
  })

  // Column widths
  ws.getColumn(1).width = 5
  columns.forEach((col, i) => {
    ws.getColumn(i + 2).width = col.width ?? Math.max(col.header.length + 4, 16)
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `${fileName}-${stamp}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
