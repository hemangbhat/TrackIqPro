// Dependency-free CSV export (RFC 4180 quoting).
//
// String cells that start with = + - @ (or a tab / carriage return) are
// prefixed with a single quote so spreadsheet apps treat them as text rather
// than formulas — a user-typed company name like `=HYPERLINK(...)` can't run
// when the export is opened in Excel or Sheets (CSV injection).

export type CsvValue = string | number | boolean | null | undefined;

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

function formatCell(value: CsvValue): string {
    if (value === null || value === undefined) return "";
    let text = String(value);
    if (typeof value === "string" && FORMULA_TRIGGER.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Serialize rows to CSV; the header row comes from the first row's keys. */
export function toCSV(rows: Record<string, CsvValue>[]): string {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]);
    const lines = [headers.map(formatCell).join(",")];
    for (const row of rows) lines.push(headers.map((h) => formatCell(row[h])).join(","));
    return lines.join("\r\n");
}

/** Trigger a browser download of `rows` as a CSV file. */
export function downloadCSV(filename: string, rows: Record<string, CsvValue>[]): void {
    const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
