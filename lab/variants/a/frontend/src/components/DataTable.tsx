import { Fragment, type Key, type ReactNode } from 'react';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

export const ACTION_HEADER = '처리';

interface LoadStateProps {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  onRetry?: () => void;
}

/** 로딩 · 오류 · 빈 목록 안내. 표시할 것이 없으면 null. */
export function LoadState({ isLoading, isError, isEmpty, onRetry }: LoadStateProps) {
  if (isError) {
    return (
      <div className="load-state">
        <p>데이터를 불러오지 못했습니다.</p>
        {onRetry && (
          <button type="button" onClick={onRetry}>
            다시 시도
          </button>
        )}
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="load-state">
        <p>불러오는 중입니다.</p>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="load-state">
        <p>데이터가 없습니다.</p>
      </div>
    );
  }
  return null;
}

interface DataTableProps<T> {
  /** 표의 접근 가능한 이름 */
  label: string;
  columns: readonly Column<T>[];
  rows: readonly T[] | undefined;
  rowKey: (row: T) => Key;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** 버튼 열("처리") 내용. 주지 않으면 버튼 열을 표시하지 않는다 */
  renderActions?: (row: T) => ReactNode;
  /** 행 바로 아래에 펼칠 내용(예: 수정 입력). null 이면 펼치지 않는다 */
  renderRowDetail?: (row: T) => ReactNode;
}

export function DataTable<T>({
  label,
  columns,
  rows,
  rowKey,
  isLoading = false,
  isError = false,
  onRetry,
  renderActions,
  renderRowDetail,
}: DataTableProps<T>) {
  if (isError || isLoading || rows === undefined || rows.length === 0) {
    return (
      <LoadState
        isError={isError}
        isLoading={isLoading || rows === undefined}
        isEmpty={rows?.length === 0}
        onRetry={onRetry}
      />
    );
  }

  const columnCount = columns.length + (renderActions ? 1 : 0);

  return (
    <div className="data-table-container">
      <table className="data-table" aria-label={label}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} scope="col">
                {column.header}
              </th>
            ))}
            {renderActions && <th scope="col">{ACTION_HEADER}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const detail = renderRowDetail?.(row);
            return (
              <Fragment key={rowKey(row)}>
                <tr>
                  {columns.map((column) => (
                    <td key={column.header}>{column.cell(row)}</td>
                  ))}
                  {renderActions && <td className="data-table-actions">{renderActions(row)}</td>}
                </tr>
                {detail != null && (
                  <tr className="data-table-detail">
                    <td colSpan={columnCount}>{detail}</td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
