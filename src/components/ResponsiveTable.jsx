import React, { useState, useMemo, useEffect } from 'react';

export default function ResponsiveTable({ 
  headers = [], 
  rows = [], 
  itemsPerPage = 10, 
  emptyMessage = 'ไม่มีข้อมูลการแสดงผล',
  tabViewClass = 'stagnant-view', // stagnant-view, expiry-view, etc.
  minHeight = '528px',
  onRowClick,
  page,
  onPageChange
}) {
  const [internalPage, setInternalPage] = useState(1);

  const safeRows = useMemo(() => Array.isArray(rows) ? rows : [], [rows]);
  const safeHeaders = useMemo(() => Array.isArray(headers) ? headers : [], [headers]);

  // Reset internal page to 1 if rows count changes in uncontrolled mode
  useEffect(() => {
    if (page === undefined) {
      setInternalPage(1);
    }
  }, [safeRows.length, page]);

  const isControlled = page !== undefined;
  const currentPage = isControlled ? page : internalPage;

  const totalPages = Math.ceil(safeRows.length / itemsPerPage) || 1;
  const activePage = Math.max(1, Math.min(currentPage, totalPages));

  const handlePageSelect = (newPage) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages));
    if (isControlled && onPageChange) {
      onPageChange(validPage);
    } else {
      setInternalPage(validPage);
    }
  };

  const paginatedRows = useMemo(() => {
    const startIdx = (activePage - 1) * itemsPerPage;
    return safeRows.slice(startIdx, startIdx + itemsPerPage);
  }, [safeRows, activePage, itemsPerPage]);

  const emptyRows = useMemo(() => {
    const needed = itemsPerPage - paginatedRows.length;
    if (needed <= 0 || safeRows.length === 0) return [];
    return Array(needed).fill(null);
  }, [paginatedRows.length, itemsPerPage, safeRows.length]);

  const startRecord = safeRows.length === 0 ? 0 : (activePage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(activePage * itemsPerPage, safeRows.length);

  return (
    <>
      <div className={`table-wrapper ${tabViewClass === 'drilldown-table-view' ? '' : 'main-table-wrapper'} ${tabViewClass}`} style={{ minHeight }}>
        <table className={`executive-table ${tabViewClass}`} id="transaction-table">
          <thead>
            <tr style={{ height: '48px' }}>
              {safeHeaders.map((h, i) => (
                <th 
                  key={i} 
                  className={h.align === 'right' ? 'text-right' : 'text-left'}
                  style={h.style}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr style={{ height: '48px' }}>
                <td colSpan={headers.length} className="text-center" style={{ padding: '24px', color: 'var(--text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              <>
                {paginatedRows.map((row, rowIdx) => (
                  <tr 
                    key={rowIdx} 
                    style={{ height: '48px', cursor: onRowClick ? 'pointer' : 'default' }}
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {headers.map((h, colIdx) => {
                      const value = row[h.key];
                      const alignClass = h.align === 'right' ? 'text-right' : 'text-left';
                      let renderedValue = value;
                      if (h.cellRender) {
                        try {
                          renderedValue = h.cellRender(row, value);
                        } catch (err) {
                          console.error("Cell render error:", err);
                          renderedValue = value !== undefined && value !== null ? value.toString() : '';
                        }
                      }
                      return (
                        <td 
                          key={colIdx} 
                          className={alignClass}
                          style={h.style}
                        >
                          {renderedValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {emptyRows.map((_, idx) => (
                  <tr key={`empty-${idx}`} style={{ height: '48px', visibility: 'hidden' }}>
                    {headers.map((h, colIdx) => (
                      <td key={colIdx}>&nbsp;</td>
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer using exact table-footer classes */}
      {totalPages > 1 && (
        <div className="table-footer">
          <div className="pagination-info">
            Showing {startRecord}-{endRecord} of {rows.length}
          </div>
          <div className="pagination-controls">
            <button 
              className="btn-pagination" 
              onClick={() => handlePageSelect(1)}
              disabled={activePage === 1}
            >
              First
            </button>
            <button 
              className="btn-pagination" 
              onClick={() => handlePageSelect(activePage - 1)}
              disabled={activePage === 1}
            >
              Prev
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Page <strong>{activePage}</strong> of <strong>{totalPages}</strong>
            </span>
            <button 
              className="btn-pagination" 
              onClick={() => handlePageSelect(activePage + 1)}
              disabled={activePage === totalPages}
            >
              Next
            </button>
            <button 
              className="btn-pagination" 
              onClick={() => handlePageSelect(totalPages)}
              disabled={activePage === totalPages}
            >
              Last
            </button>
          </div>
        </div>
      )}
    </>
  );
}
