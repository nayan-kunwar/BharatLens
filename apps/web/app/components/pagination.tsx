import Link from 'next/link';
import { withQuery } from '../lib/presentation';

export function Pagination({
  path,
  page,
  pageCount,
  query,
}: {
  path: string;
  page: number;
  pageCount: number;
  query: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className="pagination">
      {page > 1 ? (
        <Link href={withQuery(path, { ...query, page: page - 1 })}>Previous</Link>
      ) : (
        <span />
      )}
      <span>
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={withQuery(path, { ...query, page: page + 1 })}>Next</Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
