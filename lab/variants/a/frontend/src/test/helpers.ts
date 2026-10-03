import { screen, within } from '@testing-library/react';

/** `dl` 에서 항목 이름(dt) 바로 뒤의 값(dd) 문자열 */
export function definitionOf(term: string): string | null {
  const dt = screen.getByText(term, { selector: 'dt' });
  const dd = dt.nextElementSibling;
  if (!dd || dd.tagName !== 'DD') {
    throw new Error(`${term} 다음에 dd 가 없습니다.`);
  }
  return dd.textContent;
}

/** 표에서 첫 셀이 주어진 값인 데이터 행 */
export function rowByFirstCell(table: HTMLElement, value: string): HTMLElement {
  const rows = within(table)
    .getAllByRole('row')
    .filter((row) => row.querySelector('td')?.textContent === value);
  if (rows.length !== 1) {
    throw new Error(`첫 셀이 ${value} 인 행이 ${rows.length}개입니다.`);
  }
  return rows[0];
}

/** 표의 머리글 문자열 목록 */
export function headersOf(table: HTMLElement): string[] {
  return within(table)
    .getAllByRole('columnheader')
    .map((header) => header.textContent ?? '');
}

/** 행의 셀 문자열 목록 */
export function cellsOf(row: HTMLElement): string[] {
  return within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent ?? '');
}
