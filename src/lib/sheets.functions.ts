import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !isAdmin) throw new Error("Forbidden");
}

async function getSpreadsheetId(context: { supabase: any }) {
  const { data } = await context.supabase
    .from("store_settings")
    .select("value")
    .eq("key", "google_sheet_id")
    .maybeSingle();
  return (data?.value as string | undefined) ?? "";
}

export const getSheetSetting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return { spreadsheetId: await getSpreadsheetId(context) };
  });

export const saveSheetSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sheetUrl: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { parseSpreadsheetId, getFirstSheetTitle } = await import("@/lib/sheets.server");
    const id = parseSpreadsheetId(data.sheetUrl);
    if (!id) throw new Error("That doesn't look like a Google Sheet link.");
    await getFirstSheetTitle(id); // verifies access
    const { error } = await context.supabase
      .from("store_settings")
      .upsert(
        { key: "google_sheet_id", value: id, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { spreadsheetId: id };
  });

/**
 * Two-way sync:
 * 1. statuses edited directly in the sheet are pulled into the database,
 * 2. the whole sheet is then rebuilt from the database — one row per order,
 *    duplicates impossible, with a live summary block at the bottom.
 */
export const syncOrdersToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const spreadsheetId = await getSpreadsheetId(context);
    if (!spreadsheetId) {
      return { configured: false, rows: 0, statusesPulled: 0, unknownCodes: [] as string[] };
    }

    const { getFirstSheetTitle, readSheetState, rebuildSheet, unknownCodesFromGrid } = await import(
      "@/lib/sheets.server"
    );
    const title = await getFirstSheetTitle(spreadsheetId);
    const { grid, sheetStatuses } = await readSheetState(spreadsheetId, title);

    const { data: orders, error } = await context.supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (orders ?? []) as any[];

    // 1. sheet edits win for status (the sheet is the working document)
    let statusesPulled = 0;
    for (const order of rows) {
      const code = String(order.order_code ?? "").trim().toUpperCase();
      const sheetStatus = sheetStatuses.get(code);
      if (sheetStatus && sheetStatus !== order.status) {
        const { error: upErr } = await context.supabase
          .from("orders")
          .update({ status: sheetStatus })
          .eq("id", order.id);
        if (!upErr) {
          order.status = sheetStatus;
          statusesPulled += 1;
        }
      }
    }

    const knownCodes = new Set(
      rows.map((o) => String(o.order_code ?? "").trim().toUpperCase()),
    );
    const unknownCodes = unknownCodesFromGrid(grid, knownCodes);

    // 2. rebuild the sheet from the database
    const result = await rebuildSheet(spreadsheetId, title, rows, unknownCodes);

    const now = new Date().toISOString();
    const unsynced = rows.filter((o) => !o.sheet_synced_at).map((o) => o.id);
    if (unsynced.length) {
      await context.supabase.from("orders").update({ sheet_synced_at: now }).in("id", unsynced);
    }

    return { configured: true, rows: result.rows, statusesPulled, unknownCodes };
  });

/** Called right after a status change in the dashboard: rebuild keeps the sheet exact. */
export const syncOrderStatusToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderCode: string; status: string }) => input)
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const spreadsheetId = await getSpreadsheetId(context);
    if (!spreadsheetId) return { configured: false, updated: false };

    const { getFirstSheetTitle, rebuildSheet } = await import("@/lib/sheets.server");
    const title = await getFirstSheetTitle(spreadsheetId);

    const { data: orders, error } = await context.supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    await rebuildSheet(spreadsheetId, title, (orders ?? []) as any[], []);
    return { configured: true, updated: true };
  });
