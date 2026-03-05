function getVisiblePages(currentPage, totalPages) {
  const pages = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  if (start > 1) {
    pages.push(1);
    if (start > 2) {
      pages.push("...");
    }
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      pages.push("...");
    }
    pages.push(totalPages);
  }

  return pages;
}

export default function PaginationControls({
  page,
  totalPages,
  totalCount,
  startLabel,
  endLabel,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  itemLabel,
}) {
  if (totalCount === 0) {
    return null;
  }

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div className="table-footer">
      <div className="table-footer-left">
        <p>
          Showing {startLabel} to {endLabel} of {totalCount} {itemLabel}
        </p>
        <label className="toolbar-field compact">
          Rows
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {pageSizeOptions.map((size) => (
              <option key={`rows-${size}`} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="pager-controls">
        <button
          className="ghost-btn"
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>

        <div className="page-number-group" role="navigation" aria-label="Pagination">
          {visiblePages.map((value, index) =>
            value === "..." ? (
              <span className="page-gap" key={`gap-${index}`}>
                ...
              </span>
            ) : (
              <button
                className={`page-number-btn ${value === page ? "active" : ""}`}
                key={`page-${value}`}
                type="button"
                onClick={() => onPageChange(value)}
              >
                {value}
              </button>
            )
          )}
        </div>

        <button
          className="ghost-btn"
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
