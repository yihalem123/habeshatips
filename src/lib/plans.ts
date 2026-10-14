/** 90 days = three months at 15% off, rounded to a whole birr. */
export function planPrice(monthly: number, days: 30 | 90) {
  return days === 90 ? Math.round(monthly * 3 * 0.85) : monthly;
}
