const moneyFormat = new Intl.NumberFormat('ko-KR');

/** 금액을 `150,000원` 형식으로 바꾼다. 값이 없으면 `-`. */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '-';
  }
  return `${moneyFormat.format(value)}원`;
}

export function MoneyText({ value }: { value: number | null | undefined }) {
  return <span className="money">{formatMoney(value)}</span>;
}
