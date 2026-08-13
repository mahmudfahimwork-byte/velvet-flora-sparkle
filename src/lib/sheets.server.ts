const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

/** Canonical sheet layout — rebuilt from the database on every sync. */
export const HEADER_ROW = [
  "Order",
  "Date",
  "Channel",
  "Customer",
  "Phone",
  "Address",
  "Area",
  "Items",
  "Subtotal",
  "Delivery",
  "Discount",
  "Total (COD)",
  "Status",
  "Notes",
] as const;

const LAST_COL = "N";
const STATUS_COL = "M";
const CHANNEL_COL = "C";
const TOTAL_COL = "L";
const MAX_ROWS = 5000;

const VALID_STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"];

function sheetRange(title: string, range: string) {
  return `'${title.replaceAll("'", "''")}'!${range}`;
}

function headers() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovableKey || !sheetsKey) {
    throw new Error("Google Sheets is not connected yet.");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": sheetsKey,
    "Content-Type": "application/json",
  };
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY}${path}`, { ...init, headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[sheets] ${res.status} ${body}`);
    throw new Error(`Google Sheets request failed [${res.status}]: ${body}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export function parseSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) return match[1];
  return /^[a-zA-Z0-9-_]{20,}$/.test(trimmed) ? trimmed : null;
}

export async function getFirstSheetTitle(spreadsheetId: string): Promise<string> {
  const data = await call(`/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`);
  const sheets = data["sheets"] as Array<{ properties?: { title?: string } }> | undefined;
  return sheets?.[0]?.properties?.title ?? "Sheet1";
}

async function readGrid(spreadsheetId: string, title: string): Promise<string[][]> {
  const data = await call(
    `/spreadsheets/${spreadsheetId}/values/${sheetRange(title, `A1:${LAST_COL}${MAX_ROWS}`)}`,
  );
  return ((data["values"] as string[][] | undefined) ?? []).map((row) => row ?? []);
}

export type SheetOrder = {
  order_code: string;
  created_at: string;
  source: string;
  customer_name: string;
  phone: string;
  address: string;
  area: string;
  items: { name: string; qty: number }[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  status: string;
  notes: string | null;
};

function channelLabel(source: string) {
  return source === "messenger" ? "Messenger" : "Website";
}

function orderRow(o: SheetOrder): (string | number)[] {
  return [
    o.order_code,
    new Date(o.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }),
    channelLabel(o.source),
    o.customer_name,
    o.phone,
    o.address,
    o.area === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka",
    (o.items ?? []).map((i) => `${i.name} x${i.qty}`).join(", "),
    o.subtotal,
    o.delivery_fee,
    o.discount ?? 0,
    o.total,
    o.status,
    o.notes ?? "",
  ];
}

/**
 * Reads the statuses currently typed in the sheet, keyed by order code.
 * Works with the old column layout too by locating the "Status" header.
 */
export function statusesFromGrid(grid: string[][]): Map<string, string> {
  const out = new Map<string, string>();
  if (!grid.length) return out;
  const header = (grid[0] ?? []).map((c) => String(c ?? "").trim().toLowerCase());
  let statusIdx = header.indexOf("status");
  if (statusIdx === -1) statusIdx = 12; // canonical column M
  for (const row of grid.slice(1)) {
    const code = String(row?.[0] ?? "").trim().toUpperCase();
    if (!/^VF-/.test(code)) continue;
    const status = String(row?.[statusIdx] ?? "").trim().toLowerCase();
    if (!VALID_STATUSES.includes(status)) continue;
    // first occurrence wins; duplicates get collapsed on rewrite
    if (!out.has(code)) out.set(code, status);
  }
  return out;
}

/** Order codes present in the sheet but unknown to the database. */
export function unknownCodesFromGrid(grid: string[][], knownCodes: Set<string>): string[] {
  const seen = new Set<string>();
  for (const row of grid.slice(1)) {
    const code = String(row?.[0] ?? "").trim().toUpperCase();
    if (!/^VF-/.test(code)) continue;
    if (knownCodes.has(code) || seen.has(code)) continue;
    seen.add(code);
  }
  return [...seen];
}

function summaryBlock(firstRow: number, lastRow: number) {
  const codes = `A${firstRow}:A${lastRow}`;
  const channel = `${CHANNEL_COL}${firstRow}:${CHANNEL_COL}${lastRow}`;
  const status = `${STATUS_COL}${firstRow}:${STATUS_COL}${lastRow}`;
  const total = `${TOTAL_COL}${firstRow}:${TOTAL_COL}${lastRow}`;
  return [
    ["SUMMARY", ""],
    ["Total orders", `=COUNTA(${codes})`],
    ["Website orders", `=COUNTIF(${channel},"Website")`],
    ["Messenger orders", `=COUNTIF(${channel},"Messenger")`],
    ["New", `=COUNTIF(${status},"new")`],
    ["Confirmed", `=COUNTIF(${status},"confirmed")`],
    ["Shipped", `=COUNTIF(${status},"shipped")`],
    ["Delivered", `=COUNTIF(${status},"delivered")`],
    ["Cancelled", `=COUNTIF(${status},"cancelled")`],
    ["Total amount (all)", `=SUM(${total})`],
    ["Total amount (excl. cancelled)", `=SUMIF(${status},"<>cancelled",${total})`],
    ["Delivered amount", `=SUMIF(${status},"delivered",${total})`],
    [
      "Cancel ratio",
      `=IFERROR(ROUND(COUNTIF(${status},"cancelled")/COUNTA(${codes})*100,1)&"%","0%")`,
    ],
    ["Last synced", new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })],
  ];
}

/**
 * Rewrites the whole sheet from the database: one row per order, no duplicates,
 * followed by a live summary block. Returns what changed.
 */
export async function rebuildSheet(
  spreadsheetId: string,
  title: string,
  orders: SheetOrder[],
  unknownCodes: string[],
) {
  const sorted = [...orders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const dataRows = sorted.map(orderRow);
  const firstRow = 2;
  const lastRow = firstRow + dataRows.length - 1;

  const values: (string | number)[][] = [[...HEADER_ROW], ...dataRows];
  // blank spacer row before the summary
  values.push(new Array(HEADER_ROW.length).fill(""));
  const summaryStart = values.length + 1;
  for (const row of summaryBlock(firstRow, Math.max(lastRow, firstRow))) {
    values.push([row[0] ?? "", row[1] ?? ""]);
  }

  if (unknownCodes.length) {
    values.push(new Array(HEADER_ROW.length).fill(""));
    values.push(["NEEDS ATTENTION — in sheet but not in the store database:"]);
    values.push([unknownCodes.join(", ")]);
  }

  const endRow = values.length;

  // Clear everything first so stale/duplicate rows can never survive a rebuild.
  await call(`/spreadsheets/${spreadsheetId}/values/${sheetRange(title, `A1:${LAST_COL}${MAX_ROWS}`)}:clear`, {
    method: "POST",
    body: "{}",
  });

  await call(
    `/spreadsheets/${spreadsheetId}/values/${sheetRange(title, `A1:${LAST_COL}${endRow}`)}?valueInputOption=USER_ENTERED`,
    { method: "PUT", body: JSON.stringify({ values }) },
  );

  return { rows: dataRows.length, summaryStart, unknownCodes };
}

/** Full two-way sync entry point used by the server functions. */
export async function readSheetState(spreadsheetId: string, title: string) {
  const grid = await readGrid(spreadsheetId, title);
  return { grid, sheetStatuses: statusesFromGrid(grid) };
}
