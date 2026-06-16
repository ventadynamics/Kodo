const formatter = new Intl.NumberFormat('be-BY', {
  style: 'currency',
  currency: 'BYN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function fmtMoney(n: number) {
  return formatter.format(n)
}
