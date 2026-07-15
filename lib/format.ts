/** Format an amount as currency using the Kenyan locale with no decimal places. */
export function formatKesCurrency(amount: number, currency = 'KES'): string {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}
