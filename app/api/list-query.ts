export function readListQuery(request: Request) {
  const params = new URL(request.url).searchParams;
  const requestedPage = Number(params.get("page") ?? "1");
  const requestedPerPage = Number(params.get("perPage") ?? "15");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const perPage =
    Number.isInteger(requestedPerPage) && requestedPerPage > 0
      ? Math.min(requestedPerPage, 100)
      : 15;
  return {
    page,
    perPage,
    offset: (page - 1) * perPage,
    query: (params.get("q") ?? "").trim().slice(0, 100),
    params,
  };
}
