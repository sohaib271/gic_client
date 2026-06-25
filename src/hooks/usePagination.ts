import { useEffect, useMemo, useState } from "react";

export const usePagination = <T,>(items: T[], pageSize = 10) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return {
    page,
    setPage,
    pageItems,
    pageSize,
    total: items.length,
    totalPages,
  };
};
