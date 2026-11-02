// lib/format.ts
// Display formatting shared by the dashboard. Money is whole dollars (salaries
// are entered as whole amounts; a stray "98000.5" must not show a cent digit),
// and dates that don't parse render as a dash instead of "Invalid Date".

const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});

/** "$1,250,000", or "—" for a missing or non-finite amount. */
export function formatMoney(value: number | null | undefined): string {
    return typeof value === "number" && Number.isFinite(value) ? money.format(Math.round(value)) : "—";
}

function toDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** "Nov 3, 2023", or "—" when the value is missing or unparseable. */
export function formatDate(value: Date | string | null | undefined): string {
    const d = toDate(value);
    return d ? d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

/** "Nov 3, 2023, 4:05 PM": minutes, never seconds. */
export function formatDateTime(value: Date | string | null | undefined): string {
    const d = toDate(value);
    return d
        ? d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : "—";
}

/**
 * The letter a company tile shows: the first letter or digit, skipping a
 * leading emoji or symbol ("🦄 Unicorn Labs" is "U"), split by grapheme so
 * CJK and accented names keep a whole character.
 */
export function companyInitial(company: string | null | undefined): string {
    const text = (company || "").trim();
    if (!text) return "?";
    const graphemes =
        typeof Intl !== "undefined" && "Segmenter" in Intl
            ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment)
            : Array.from(text);
    const first = graphemes.find((g) => /[\p{L}\p{N}]/u.test(g));
    return first ? first.toLocaleUpperCase() : "?";
}

/** "1 application" / "3 applications". */
export function plural(count: number, one: string, many: string): string {
    return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}
