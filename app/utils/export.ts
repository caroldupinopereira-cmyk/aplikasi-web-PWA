export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = String(row[h] ?? "");
      return val.includes(",") || val.includes('"') || val.includes("\n")
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(",")
  );

  const csv = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportAllPages<T>(
  endpoint: string,
  key: string,
  filters: Record<string, string>,
  mapRow: (row: T, index: number) => Record<string, unknown>,
  filename: string,
) {
  const rows: T[] = [];
  let page = 1;
  let total = 0;
  do {
    const params = new URLSearchParams({
      ...filters,
      page: String(page),
      perPage: "100",
    });
    const response = await fetch(`${endpoint}?${params}`);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Data lengkap belum dapat diekspor.");
    }
    rows.push(...((result[key] ?? []) as T[]));
    total = Number(result.pagination?.total ?? rows.length);
    page += 1;
  } while (rows.length < total && page <= 101);

  exportToCSV(rows.map(mapRow), filename);
}
