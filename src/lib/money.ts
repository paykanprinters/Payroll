import { bankersRound } from "@/lib/utils";

/** Sum monetary line items with a single bankers-round at the end to limit float drift. */
export function sumMoney(amounts: number[], decimals = 2): number {
  if (amounts.length === 0) return 0;
  const total = amounts.reduce((sum, n) => sum + n, 0);
  return bankersRound(total, decimals);
}
