import { useEffect, useMemo, useState } from 'react';

export type PaginationResult<T> = {
  page: number;
  pageCount: number;
  pageItems: T[];
  setPage: (page: number) => void;
};

// Slices `items` into `pageSize`-sized pages. `resetKey` is any value that
// identifies the current filter/sort criteria (e.g. a joined string of
// filter field values) — whenever it changes, the page resets to 1 so a
// filter change never leaves the view stuck on a now-out-of-range page.
export function usePagination<T>(items: T[], pageSize: number, resetKey?: unknown): PaginationResult<T> {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    // Deliberately only re-runs when resetKey changes, not on every `items`
    // identity change (a new filtered array on every render would otherwise
    // reset the page on its own re-render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const clampedPage = Math.min(page, pageCount);

  const pageItems = useMemo(
    () => items.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [items, clampedPage, pageSize],
  );

  return { page: clampedPage, pageCount, pageItems, setPage };
}
