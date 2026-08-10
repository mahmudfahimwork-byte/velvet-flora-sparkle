const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

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

export const HEADER_ROW = [
  "Order",
  "Date",
  "Customer",
  "Phone",
  "Address",
  "Area",
  "Items",
  "Subtotal",
  "Delivery",
  "Total (COD)",
  "Status",
  "Notes",
];

export async function appendRows(
  spreadsheetId: string,
  title: string,
  rows: (string | number)[][],
) {
  const existing = await call(`/spreadsheets/${spreadsheetId}/values/${sheetRange(title, "A1:L1")}`);
  const hasHeader = Array.isArray(existing["values"]) && (existing["values"] as unknown[]).length > 0;
  const values = hasHeader ? rows : [HEADER_ROW, ...rows];
  await call(
    `/spreadsheets/${spreadsheetId}/values/${sheetRange(title, "A1:L1")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values }) },
  );
}

export async function updateStatusForOrder(
  spreadsheetId: string,
  title: string,
  orderCode: string,
  status: string,
): Promise<boolean> {
  const data = await call(`/spreadsheets/${spreadsheetId}/values/${sheetRange(title, "A1:A10000")}`);
  const values = (data["values"] as string[][] | undefined) ?? [];
  const normalizedCode = orderCode.trim().toUpperCase();
  const index = values.findIndex(
    (row) => String(row?.[0] ?? "").trim().toUpperCase() === normalizedCode,
  );
  if (index === -1) return false;
  const rowNumber = index + 1;
  await call(
    `/spreadsheets/${spreadsheetId}/values/${sheetRange(title, `K${rowNumber}:K${rowNumber}`)}?valueInputOption=USER_ENTERED`,
    { method: "PUT", body: JSON.stringify({ values: [[status]] }) },
  );
  return true;
}

export async function reconcileOrderStatuses(
  spreadsheetId: string,
  title: string,
  orders: Array<{ order_code: string; status: string }>,
): Promise<number> {
  if (!orders.length) return 0;

  const data = await call(`/spreadsheets/${spreadsheetId}/values/${sheetRange(title, "A1:K10000")}`);
  const values = (data["values"] as Array<Array<string | number>> | undefined) ?? [];
  const statusByCode = new Map(
    orders.map((order) => [order.order_code.trim().toUpperCase(), order.status]),
  );
  const updates = values.flatMap((row, index) => {
    const code = String(row?.[0] ?? "").trim().toUpperCase();
    const expectedStatus = statusByCode.get(code);
    if (!expectedStatus || String(row?.[10] ?? "").trim() === expectedStatus) return [];
    const rowNumber = index + 1;
    return [{ range: sheetRange(title, `K${rowNumber}:K${rowNumber}`), values: [[expectedStatus]] }];
  });

  if (!updates.length) return 0;
  await call(`/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ valueInputOption: "USER_ENTERED", data: updates }),
  });
  return updates.length;
}
