"use client";

type Props = {
  currentPage: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({ currentPage, totalItems, perPage, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, totalItems);

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="pagination">
      <span className="pagination-info">Menampilkan {start}–{end} dari {totalItems}</span>
      <div className="pagination-buttons">
        <button disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>‹</button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="pagination-dots">…</span>
          ) : (
            <button
              key={p}
              className={p === currentPage ? "active" : ""}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>›</button>
      </div>
    </div>
  );
}
