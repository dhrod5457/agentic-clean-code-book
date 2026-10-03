const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** ISO-8601 시각을 Asia/Seoul 기준 `YYYY-MM-DD HH:mm` 으로 바꾼다. 값이 없으면 `-`. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  const parts: Record<string, string> = {};
  for (const part of dateTimeFormat.formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

export function DateTimeText({ value }: { value: string | null | undefined }) {
  return <span className="datetime">{formatDateTime(value)}</span>;
}
