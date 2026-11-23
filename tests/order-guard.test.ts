import { describe, expect, test } from "bun:test";
import { isLikelyFakeBdPhone, orderCooldownKind, ORDER_COOLDOWN_MS } from "../src/lib/order-guard";

describe("checkout order guard", () => {
  test("enforces the chosen one-hour cooldown for phone and browser", () => {
    const now = 1_000_000;
    expect(ORDER_COOLDOWN_MS).toBe(60 * 60 * 1000);
    expect(orderCooldownKind(now + ORDER_COOLDOWN_MS, 0, now)).toBe("device");
    expect(orderCooldownKind(0, now + ORDER_COOLDOWN_MS, now)).toBe("phone");
    expect(orderCooldownKind(now, now, now)).toBeNull();
  });

  test("rejects the repeated and sequential fake Bangladesh numbers discussed", () => {
    expect(isLikelyFakeBdPhone("01700000000")).toBe(true);
    expect(isLikelyFakeBdPhone("01811111111")).toBe(true);
    expect(isLikelyFakeBdPhone("01712345678")).toBe(true);
    expect(isLikelyFakeBdPhone("01712345679")).toBe(false);
  });
});