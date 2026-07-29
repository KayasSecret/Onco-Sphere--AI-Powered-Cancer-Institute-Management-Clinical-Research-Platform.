import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { RiSearchLine, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri'
import EmptyState from './EmptyState'

/**
 * Reusable DataTable component
 * Props:
 * - columns: { header: string, accessor: string | function, cell?: function }[]
 * - items: array of objects
 * - total: total count (for server side paginated data)
 * - page: current page
 * - limit: items per page
 * - onPageChange: callback function(page)
 * - searchPlaceholder: string
 * - onSearchChange: callback function(search_term)
 * - emptyMessage: string
 */
export default function DataTable({
  columns,
  items = [],
  total = 0,
  page = 1,
  limit = 10,
  onPageChange,
  searchPlaceholder = 'Search...',
  onSearchChange,
  emptyMessage = 'No records found.',
}) {
  const [searchValue, setSearchValue] = useState('')

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (onSearchChange) {
      onSearchChange(searchValue)
    }
  }

  const handleClearSearch = () => {
    setSearchValue('')
    if (onSearchChange) {
      onSearchChange('')
    }
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      {onSearchChange && (
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm">
          <div className="relative flex-1">
            <RiSearchLine
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary"
            />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9 pr-8 h-9 bg-surface-card border-surface-border text-ink-primary placeholder:text-ink-disabled text-xs rounded-md"
            />
            {searchValue && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-disabled hover:text-ink-primary font-medium"
              >
                Clear
              </button>
            )}
          </div>
          <Button
            type="submit"
            className="h-9 px-4 bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse text-xs rounded-md font-medium"
          >
            Search
          </Button>
        </form>
      )}

      {/* Styled Grid/Table */}
      <div className="border border-surface-border rounded-lg bg-surface-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-surface-base border-b border-surface-border">
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead
                  key={idx}
                  className="text-brand-navy font-semibold text-xs py-3 px-4 uppercase tracking-wider text-left"
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-surface-border">
            {items.length > 0 ? (
              items.map((row, rowIdx) => (
                <TableRow
                  key={row.id || rowIdx}
                  className="hover:bg-surface-hover/50 transition-colors duration-fast"
                >
                  {columns.map((col, colIdx) => {
                    let val = ''
                    if (typeof col.accessor === 'function') {
                      val = col.accessor(row)
                    } else if (col.accessor) {
                      val = row[col.accessor]
                    }

                    return (
                      <TableCell
                        key={colIdx}
                        className="py-3.5 px-4 text-sm text-ink-primary align-middle"
                      >
                        {col.cell ? col.cell(row, val) : val}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-8">
                  <EmptyState message={emptyMessage} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Server-Side Pagination Bar */}
      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2 text-xs text-ink-secondary font-medium">
          <div>
            Showing <span className="text-ink-primary font-semibold">{(page - 1) * limit + 1}</span> to{' '}
            <span className="text-ink-primary font-semibold">
              {Math.min(page * limit, total)}
            </span>{' '}
            of <span className="text-ink-primary font-semibold">{total}</span> records
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 border-surface-border hover:bg-surface-hover"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <RiArrowLeftSLine size={16} />
            </Button>
            <span className="px-2">
              Page <span className="text-ink-primary font-semibold">{page}</span> of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 border-surface-border hover:bg-surface-hover"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <RiArrowRightSLine size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
