/**
 * Cursor-based pagination helper for Prisma queries.
 *
 * Usage in API routes:
 *   const { items, nextCursor } = await paginate(prisma.employee, {
 *     where: { companyId, status: "ACTIVE" },
 *     orderBy: { createdAt: "desc" },
 *     pageSize: 25,
 *     cursor: searchParams.get("cursor") ?? undefined,
 *   });
 */

export interface PaginateOptions<TWhere, TOrderBy> {
  where?: TWhere;
  orderBy?: TOrderBy;
  pageSize?: number;
  cursor?: string;
  include?: Record<string, boolean | object>;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function paginate<
  T extends { id: string },
  TWhere = unknown,
  TOrderBy = unknown,
>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: { findMany: (args: any) => Promise<T[]> },
  options: PaginateOptions<TWhere, TOrderBy>,
): Promise<PaginatedResult<T>> {
  const pageSize = Math.min(options.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  const items = await model.findMany({
    where: options.where,
    orderBy: options.orderBy,
    include: options.include,
    take: pageSize + 1, // fetch one extra to detect if there's a next page
    ...(options.cursor
      ? { cursor: { id: options.cursor }, skip: 1 }
      : {}),
  });

  const hasMore = items.length > pageSize;
  if (hasMore) items.pop(); // remove the extra item

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
    hasMore,
  };
}
