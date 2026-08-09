import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const getSheetSetting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data } = await context.supabase
      .from("store_settings")
      .select("value")
      .eq("key", "google_sheet_id")
      .maybeSingle();
    return { spreadsheetId: (data?.value as string | undefined) ?? "" };
  });

export const saveSheetSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sheetUrl: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
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

export const syncOrdersToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);

    const { data: setting } = await context.supabase
      .from("store_settings")
      .select("value")
      .eq("key", "google_sheet_id")
      .maybeSingle();
    const spreadsheetId = setting?.value as string | undefined;
    if (!spreadsheetId) return { synced: 0, configured: false };

    const { data: orders, error } = await context.supabase
      .from("orders")
      .select("*")
      .is("sheet_synced_at", null)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    if (!orders?.length) return { synced: 0, configured: true };

    const { getFirstSheetTitle, appendRows } = await import("@/lib/sheets.server");
    const title = await getFirstSheetTitle(spreadsheetId);

    const rows = orders.map((o: any) => [
      o.order_code,
      new Date(o.created_at).toLocaleString("en-GB"),
      o.customer_name,
      o.phone,
      o.address,
      o.area === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka",
      (o.items as { name: string; qty: number }[])
        .map((i) => `${i.name} x${i.qty}`)
        .join(", "),
      o.subtotal,
      o.delivery_fee,
      o.total,
      o.status,
      o.notes ?? "",
    ]);

    await appendRows(spreadsheetId, title, rows);

    const now = new Date().toISOString();
    await context.supabase
      .from("orders")
      .update({ sheet_synced_at: now })
      .in(
        "id",
        orders.map((o: any) => o.id),
      );

    return { synced: rows.length, configured: true };
  });

export const syncOrderStatusToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderCode: string; status: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);

    const { data: setting } = await context.supabase
      .from("store_settings")
      .select("value")
      .eq("key", "google_sheet_id")
      .maybeSingle();
    const spreadsheetId = setting?.value as string | undefined;
    if (!spreadsheetId) return { updated: false, configured: false };

    const { getFirstSheetTitle, updateStatusForOrder } = await import("@/lib/sheets.server");
    const title = await getFirstSheetTitle(spreadsheetId);
    const updated = await updateStatusForOrder(spreadsheetId, title, data.orderCode, data.status);
    return { updated, configured: true };
  });
