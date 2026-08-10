import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSheetSetting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Forbidden");
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
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Forbidden");
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
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Forbidden");

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
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    if (!orders?.length) return { synced: 0, configured: true };

    const { getFirstSheetTitle, appendRows, reconcileOrderStatuses } = await import("@/lib/sheets.server");
    const title = await getFirstSheetTitle(spreadsheetId);

    const unsyncedOrders = orders.filter((order) => !order.sheet_synced_at);

    const rows = unsyncedOrders.map((o: any) => [
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

    if (rows.length) await appendRows(spreadsheetId, title, rows);

    if (unsyncedOrders.length) {
      const now = new Date().toISOString();
      const { error: syncMarkError } = await context.supabase
        .from("orders")
        .update({ sheet_synced_at: now })
        .in(
          "id",
          unsyncedOrders.map((o: any) => o.id),
        );
      if (syncMarkError) throw new Error(syncMarkError.message);
    }

    const statusesUpdated = await reconcileOrderStatuses(
      spreadsheetId,
      title,
      orders.map((order) => ({ order_code: order.order_code, status: order.status })),
    );

    return { synced: rows.length, statusesUpdated, configured: true };
  });

export const syncOrderStatusToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderCode: string; status: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Forbidden");

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
