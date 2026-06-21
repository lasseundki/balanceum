let _code = localStorage.getItem('balanceum_currency') ?? 'EUR'

export function getBaseCurrency() { return _code }
export function syncBaseCurrency(code: string) { _code = code }
