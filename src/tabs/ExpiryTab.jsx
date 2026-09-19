import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Chart from 'react-apexcharts';
import KpiCard from '../components/KpiCard';
import ResponsiveTable from '../components/ResponsiveTable';
import ApexDonut from '../components/ApexDonut';
import DrilldownModal from '../components/DrilldownModal';
import SearchBar from '../components/SearchBar';
import { Package, Hash, DollarSign, AlertCircle, Clock, Layers, Link2, ChevronDown, X } from 'lucide-react';
import { 
  formatDateToDDMMYY, 
  getBangkokDateString, 
  isValidISODate, 
  formatRemainingTime, 
  getExpiryYears, 
  getExpiryTotalMonths 
} from '../utils/helpers';

/**
 * Component ปุ่ม [ ⚠️ คาดคะเน ▾ ] หรือ [ 🔗 ดูที่มา ▾ ] พร้อม Click Popover
 */
function InheritedBadge({ row }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const badgeRef = useRef(null);
  const popoverRef = useRef(null);

  const inheritanceType = row?.['การสืบทอด'];
  const isEstimated = inheritanceType === 'ESTIMATED';
  const isInherited = inheritanceType === 'INHERITED_MAIN' || inheritanceType === 'INHERITED_LOT';

  if (!isEstimated && !isInherited) {
    return null;
  }

  const srcWarehouse = row?.['คลังต้นทาง'] || 'คลังหลัก';
  const srcLotId = row?.['lot_id_ต้นทาง'] || '-';
  const currentLotId = row?.lot_number_id || '-';
  const isDirectSub = 
    row?.['หมายเหตุ']?.includes('ส่งเข้าคลังย่อยโดยตรง') ||
    (!srcWarehouse.includes('หลัก') && 
     !srcWarehouse.includes('กลาง') && 
     srcWarehouse !== 'คลัง เวชภัณฑ์ที่มิใช่ยา' && 
     srcWarehouse !== 'คลังยา (1001)');

  const updatePosition = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      // If badge scrolled off screen, close popover
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setIsOpen(false);
        return;
      }
      const popoverWidth = isEstimated ? 340 : 320;
      let left = rect.left - 12;
      if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16;
      }
      if (left < 16) left = 16;

      const popoverHeight = isEstimated ? 190 : 165;
      let top = rect.bottom + 5;
      if (top + popoverHeight > window.innerHeight && rect.top - popoverHeight > 10) {
        top = rect.top - popoverHeight - 5;
      }

      setCoords({ top, left });
    }
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on outside click or scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target) &&
        badgeRef.current && 
        !badgeRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  // Styles for ESTIMATED vs INHERITED_MAIN
  const badgeStyle = isEstimated ? {
    color: isOpen ? '#b45309' : (isHovered ? '#b45309' : '#d97706'),
    backgroundColor: isOpen ? '#fef3c7' : (isHovered ? '#fffbeb' : '#fffdf5'),
    border: `1px solid ${isOpen ? '#f59e0b' : (isHovered ? '#fbbf24' : '#fde68a')}`,
    boxShadow: isOpen 
      ? '0 0 0 2px rgba(245, 158, 11, 0.25)' 
      : (isHovered ? '0 1px 3px rgba(217, 119, 6, 0.2)' : '0 1px 2px rgba(217, 119, 6, 0.08)'),
  } : {
    color: isOpen ? '#1d4ed8' : (isHovered ? '#1d4ed8' : '#2563eb'),
    backgroundColor: isOpen ? '#dbeafe' : (isHovered ? '#eff6ff' : '#f0f7ff'),
    border: `1px solid ${isOpen ? '#3b82f6' : (isHovered ? '#60a5fa' : '#93c5fd')}`,
    boxShadow: isOpen 
      ? '0 0 0 2px rgba(59, 130, 246, 0.25)' 
      : (isHovered ? '0 1px 3px rgba(37, 99, 235, 0.2)' : '0 1px 2px rgba(37, 99, 235, 0.08)'),
  };

  return (
    <>
      <button
        type="button"
        ref={badgeRef}
        onClick={handleToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={isEstimated ? 'คลิกเพื่อดูเกณฑ์และวิธีคำนวณวันหมดอายุคาดคะเน' : 'คลิกเพื่อดูข้อมูลอ้างอิง'}
        style={{
          fontSize: '12px',
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          transform: (isHovered && !isOpen) ? 'translateY(-0.5px)' : 'none',
          transition: 'all 0.15s ease',
          lineHeight: '16px',
          height: '24px',
          outline: 'none',
          verticalAlign: 'middle',
          userSelect: 'none',
          flexShrink: 0,
          ...badgeStyle
        }}
      >
        {isEstimated ? (
          <AlertCircle size={13} strokeWidth={2.3} style={{ flexShrink: 0, color: '#d97706' }} />
        ) : (
          <Link2 size={13} strokeWidth={2.3} style={{ flexShrink: 0, color: '#2563eb' }} />
        )}
        <span style={{ letterSpacing: '-0.2px' }}>อ้างอิง</span>
        <ChevronDown 
          size={12} 
          strokeWidth={2.4} 
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            flexShrink: 0,
            opacity: 0.85
          }} 
        />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 999999,
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.5), 0 6px 12px -2px rgba(0, 0, 0, 0.3)',
            fontSize: '13px',
            lineHeight: '1.5',
            width: 'max-content',
            minWidth: '275px',
            maxWidth: '350px',
            border: `1px solid ${isEstimated ? '#d97706' : '#334155'}`,
            animation: 'fadeIn 0.15s ease'
          }}
        >
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            gap: '8px', 
            fontWeight: 600, 
            color: isEstimated ? '#fbbf24' : '#60a5fa', 
            marginBottom: '8px', 
            borderBottom: '1px solid #334155', 
            paddingBottom: '6px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px' }}>
              {isEstimated ? <Clock size={14} strokeWidth={2.2} /> : <Link2 size={14} strokeWidth={2.2} />}
              <span>{isEstimated ? 'เกณฑ์การคาดคะเนวันหมดอายุ' : 'ข้อมูลอ้างอิง'}</span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              title="ปิด"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              <X size={14} strokeWidth={2.2} />
            </button>
          </div>

          {/* Body details */}
          {isEstimated ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '12.5px', whiteSpace: 'nowrap' }}>วันรับเข้าแรกสุด:</span>
                <strong style={{ color: '#f8fafc', textAlign: 'right', fontSize: '13px' }}>
                  {row?.earliest_receive_date ? formatDateToDDMMYY(row.earliest_receive_date) : '-'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '12.5px', whiteSpace: 'nowrap' }}>อายุเฉลี่ย:</span>
                <strong style={{ color: '#fbbf24', textAlign: 'right', fontSize: '13px' }}>
                  {row?.estimated_shelf_months ? `${row.estimated_shelf_months} เดือน` : '-'}
                  {row?.historical_sample_lots ? ` (จาก ${row.historical_sample_lots} ล็อต)` : ''}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '12.5px', whiteSpace: 'nowrap' }}>วันหมดอายุคาดคะเน:</span>
                <strong style={{ color: '#38bdf8', textAlign: 'right', fontSize: '13px' }}>
                  {formatDateToDDMMYY(row?.['วันหมดอายุ'] || row?.expire_date)}
                </strong>
              </div>
              <div style={{ 
                marginTop: '6px', 
                padding: '6px 8px', 
                borderRadius: '4px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.25)', 
                fontSize: '11px', 
                color: '#fde68a', 
                lineHeight: '1.4' 
              }}>
                ⚠️ คำนวณจากค่าเฉลี่ยของล็อตอื่นๆ ที่มีวันหมดอายุ
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '12.5px', whiteSpace: 'nowrap' }}>คลังต้นทาง:</span>
                <strong style={{ color: '#f8fafc', textAlign: 'right', fontSize: '13px' }}>{srcWarehouse}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '12.5px', whiteSpace: 'nowrap' }}>LOT ID ต้นทาง:</span>
                <strong style={{ color: '#38bdf8', fontFamily: 'monospace', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>{srcLotId}</strong>
              </div>
              {currentLotId && currentLotId !== '-' && currentLotId !== srcLotId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: '12.5px', whiteSpace: 'nowrap' }}>LOT ID ปัจจุบัน:</span>
                  <span style={{ color: '#cbd5e1', fontFamily: 'monospace', textAlign: 'right', fontSize: '13px' }}>{currentLotId}</span>
                </div>
              )}
              <div style={{ 
                marginTop: '6px', 
                padding: '6px 8px', 
                borderRadius: '4px',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.25)', 
                fontSize: '11px', 
                color: '#93c5fd', 
                lineHeight: '1.4' 
              }}>
                🔗 อ้างอิงวันหมดอายุจากล็อตเดียวกันในคลังหลัก
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

export default function ExpiryTab({ rawExpiryDataset = [], selectedWarehouses = [], selectedProducts = [], startDate, endDate, resetKey }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tableTab, setTableTab] = useState('expired'); // 'expired', 'upcoming', 'all'

  // Reset local search when filter reset is triggered
  useEffect(() => {
    setSearchTerm('');
  }, [resetKey]);
  
  // Dynamic Animation Series States
  const [top10ValueAnimatedSeries, setTop10ValueAnimatedSeries] = useState([]);
  const [warehouseAnimatedSeries, setWarehouseAnimatedSeries] = useState([]);
  const [top10AnimatedSeries, setTop10AnimatedSeries] = useState([]);
  const [upcomingAnimatedSeries, setUpcomingAnimatedSeries] = useState([]);

  // Drilldown Modal state & Navigation History Stack (Level 1 -> Level 2)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalHistory, setModalHistory] = useState([]); // Array of { level, type, title, rows, headers, summaryItems, onRowClick }

  const activeDrilldown = modalHistory[modalHistory.length - 1] || null;

  // วันปัจจุบัน ตามเวลาประเทศไทย (UTC+7)
  const todayStr = useMemo(() => getBangkokDateString(), []);

  // Helper: คำนวณจำนวนวันหมดอายุของแต่ละล็อต (diff จากวันปัจจุบัน)
  const getDaysExpired = (r) => {
    const dateStr = r.วันหมดอายุ;
    if (dateStr && isValidISODate(dateStr)) {
      const expDate = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expDate.setHours(0, 0, 0, 0);
      const diffMs = today - expDate;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  // Helper: จัดรูปแบบค่าเฉลี่ยระยะเวลาหมดอายุให้อ่านง่าย
  const formatAverageExpiredDuration = (totalDays, lotCount) => {
    if (!lotCount || lotCount <= 0 || isNaN(totalDays)) return '-';
    const avgDays = Math.round(totalDays / lotCount);
    if (avgDays > 0) {
      if (avgDays >= 365.25) {
        const yrs = Math.floor(avgDays / 365.25);
        const remaining = avgDays % 365.25;
        const mons = Math.floor(remaining / 30.4375);
        return mons > 0 ? `${yrs} ปี ${mons} เดือน` : `${yrs} ปี`;
      } else if (avgDays >= 30) {
        const mons = Math.floor(avgDays / 30.4375);
        const days = Math.floor(avgDays % 30.4375);
        return days > 0 ? `${mons} เดือน ${days} วัน` : `${mons} เดือน`;
      } else {
        return `${avgDays} วัน`;
      }
    } else if (avgDays === 0) {
      return 'หมดอายุวันนี้';
    } else {
      const daysRemaining = Math.abs(avgDays);
      if (daysRemaining >= 30) {
        const mons = Math.floor(daysRemaining / 30.4375);
        const days = Math.floor(daysRemaining % 30.4375);
        return days > 0 ? `อีก ${mons} เดือน ${days} วัน` : `อีก ${mons} เดือน`;
      }
      return `อีก ${daysRemaining} วัน`;
    }
  };

  // Helper: คำนวณและแสดงระยะเวลาหมดอายุภาษาไทยแม่นยำ (เช่น "13 วัน", "2 เดือน 5 วัน", "1 ปี 2 เดือน")
  const formatExpiredDurationLabel = (val, row) => {
    const dateStr = row?.วันหมดอายุ;
    if (isValidISODate(dateStr)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);

      const diffTime = today - targetDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        if (diffDays >= 365) {
          const yrs = Math.floor(diffDays / 365);
          const mons = Math.floor((diffDays % 365) / 30.4375);
          return mons > 0 ? `${yrs} ปี ${mons} เดือน` : `${yrs} ปี`;
        } else if (diffDays >= 30) {
          const mons = Math.floor(diffDays / 30.4375);
          const days = Math.floor(diffDays % 30.4375);
          return days > 0 ? `${mons} เดือน ${days} วัน` : `${mons} เดือน`;
        } else {
          return `${diffDays} วัน`;
        }
      } else if (diffDays === 0) {
        return 'วันนี้';
      } else {
        return formatRemainingTime(dateStr);
      }
    }

    if (!val || val === '0 days' || val === '0 mon') return '-';
    return val;
  };

  // 1. Filter Expiry Dataset (ตามฟิลเตอร์ทั่วไป คลัง/สินค้า/ช่วงวันที่)
  const filteredExpiryDataset = useMemo(() => {
    return rawExpiryDataset.filter(row => {
      // Warehouse Filter
      if (selectedWarehouses.length > 0 && !selectedWarehouses.includes(row.คลัง)) return false;

      // Product Filter
      if (selectedProducts.length > 0 && !selectedProducts.includes(row.รหัสสินค้า)) return false;

      // Date Range Filter on Expiry Date
      if (startDate || endDate) {
        const rowDate = new Date(row.วันหมดอายุ);
        if (startDate && rowDate < startDate) return false;
        if (endDate) {
          const endWithTime = new Date(endDate);
          endWithTime.setHours(23, 59, 59, 999);
          if (rowDate > endWithTime) return false;
        }
      }
      return true;
    });
  }, [rawExpiryDataset, selectedWarehouses, selectedProducts, startDate, endDate]);

  // 2. ชุดข้อมูลเฉพาะสินค้าที่ "หมดอายุแล้วเท่านั้น" (<= วันปัจจุบัน)
  const expiredDatasetOnly = useMemo(() => {
    return filteredExpiryDataset.filter(row => {
      const dateStr = row.วันหมดอายุ;
      return isValidISODate(dateStr) && dateStr <= todayStr;
    });
  }, [filteredExpiryDataset, todayStr]);

  // 3. ชุดข้อมูลเฉพาะสินค้าที่ "ใกล้หมดอายุอีก 6 เดือนข้างหน้า" (> วันปัจจุบัน && <= 6 เดือน)
  const upcomingDatasetOnly = useMemo(() => {
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    const sixMonthsLaterStr = getBangkokDateString(sixMonthsLater);

    return filteredExpiryDataset.filter(row => {
      const dateStr = row.วันหมดอายุ;
      return isValidISODate(dateStr) && dateStr > todayStr && dateStr <= sixMonthsLaterStr;
    }).sort((a, b) => {
      const dateA = a.day_expiry || a.วันหมดอายุ || '';
      const dateB = b.day_expiry || b.วันหมดอายุ || '';
      return dateA.localeCompare(dateB);
    });
  }, [filteredExpiryDataset, todayStr]);

  // 4. ชุดข้อมูลสำหรับตารางตามแท็บที่เลือก (หมดอายุ / ใกล้หมดอายุ / ทั้งหมด)
  const activeTableDataset = useMemo(() => {
    if (tableTab === 'expired') {
      if (expiredDatasetOnly.length > 0) return expiredDatasetOnly;
      if (upcomingDatasetOnly.length > 0) return upcomingDatasetOnly;
      return filteredExpiryDataset;
    }
    if (tableTab === 'upcoming') {
      if (upcomingDatasetOnly.length > 0) return upcomingDatasetOnly;
      return filteredExpiryDataset;
    }
    return filteredExpiryDataset;
  }, [tableTab, expiredDatasetOnly, upcomingDatasetOnly, filteredExpiryDataset]);

  // Auto-switch table tab to 'upcoming' or 'all' if no expired items exist in the uploaded file
  useEffect(() => {
    if (rawExpiryDataset.length > 0) {
      if (expiredDatasetOnly.length === 0 && upcomingDatasetOnly.length > 0) {
        setTableTab('upcoming');
      } else if (expiredDatasetOnly.length === 0 && filteredExpiryDataset.length > 0) {
        setTableTab('all');
      }
    }
  }, [rawExpiryDataset.length, expiredDatasetOnly.length, upcomingDatasetOnly.length, filteredExpiryDataset.length]);

  // 5. Local Table filter based on Search input
  const searchedTableRows = useMemo(() => {
    if (!searchTerm.trim()) return activeTableDataset;
    const term = searchTerm.toLowerCase().trim();
    return activeTableDataset.filter(row => {
      return (
        (row.รหัสสินค้า && row.รหัสสินค้า.toLowerCase().includes(term)) ||
        (row.ชื่อสินค้า && row.ชื่อสินค้า.toLowerCase().includes(term)) ||
        (row.คลัง && row.คลัง.toLowerCase().includes(term)) ||
        (row.lot_number_id && row.lot_number_id.toLowerCase().includes(term))
      );
    });
  }, [activeTableDataset, searchTerm]);

  // 6. Compute KPI Statistics (การ์ด ยอดรวม คำนวณยืดหยุ่นตามชุดข้อมูลจริง)
  const stats = useMemo(() => {
    const targetRows = expiredDatasetOnly.length > 0 ? expiredDatasetOnly : filteredExpiryDataset;
    const totalVal = targetRows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
    const totalQty = targetRows.reduce((sum, r) => sum + (r.จำนวน || 0), 0);
    const totalLots = targetRows.length;
    const activeWhCount = new Set(targetRows.map(r => r.คลัง).filter(Boolean)).size;

    return {
      totalVal,
      totalQty,
      totalLots,
      activeWhCount
    };
  }, [expiredDatasetOnly, filteredExpiryDataset]);

  // Currency formatter helper
  const formatBahtCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '';
    if (val === 0) return '0';
    const absVal = Math.abs(val);
    if (absVal >= 1e6) {
      return (val / 1e6).toFixed(2) + 'M';
    } else if (absVal >= 1e3) {
      return (val / 1e3).toFixed(1) + 'K';
    }
    return val.toLocaleString();
  };

  const formatFullBahtCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '';
    return Math.round(val).toLocaleString();
  };

  // 7. Monthly/Daily Expired Trend Chart (Row 1 - ปรับแกน X และ Y ยืดหยุ่นตามช่วงปี/เดือนที่มีข้อมูลจริงในไฟล์)
  const trendChartData = useMemo(() => {
    let isDaily = false;
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 90) {
        isDaily = true;
      }
    }

    // เลือกใช้ชุดข้อมูลที่มี (ถ้า expiredDatasetOnly มีข้อมูลให้ใช้ ถ้าไม่มีให้ fallback ไป filteredExpiryDataset)
    const targetRows = expiredDatasetOnly.length > 0 ? expiredDatasetOnly : filteredExpiryDataset;

    // หาเดือนต่ำสุดและสูงสุดที่มีอยู่ในข้อมูลจริง (เช่น ปี 2025 ถึง 2026)
    const monthsWithData = [];
    const dateMap = {};

    targetRows.forEach(row => {
      const dateStr = row.วันหมดอายุ;
      if (!isValidISODate(dateStr)) return;

      const m = dateStr.substring(0, 7);
      monthsWithData.push(m);

      const key = isDaily ? dateStr : m;
      if (!dateMap[key]) dateMap[key] = 0;
      dateMap[key] += (row.มูลค่ารวม || 0);
    });

    if (monthsWithData.length === 0) {
      return {
        categories: [],
        values: [],
        sortedKeys: [],
        isDaily: false
      };
    }

    monthsWithData.sort();
    const minMonthStr = monthsWithData[0];
    const maxMonthStr = monthsWithData[monthsWithData.length - 1];

    // สร้างรายการเดือนทั้งหมดอย่างต่อเนื่อง (ไม่ข้ามเดือน) ระหว่าง minMonth ถึง maxMonth ที่มีในข้อมูลจริง
    if (!isDaily) {
      const [startYear, startMon] = minMonthStr.split('-').map(Number);
      const [endYear, endMon] = maxMonthStr.split('-').map(Number);

      let curY = startYear;
      let curM = startMon;
      while (curY < endYear || (curY === endYear && curM <= endMon)) {
        const mKey = `${curY}-${String(curM).padStart(2, '0')}`;
        if (dateMap[mKey] === undefined) {
          dateMap[mKey] = 0;
        }
        curM++;
        if (curM > 12) {
          curM = 1;
          curY++;
        }
      }
    }

    const sortedKeys = Object.keys(dateMap).sort((a, b) => a.localeCompare(b));
    const values = sortedKeys.map(k => Math.round(dateMap[k]));

    const thaiMonthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const categories = sortedKeys.map(k => {
      if (isDaily) {
        const parts = k.split('-');
        if (parts.length === 3) {
          const [_y, m, d] = parts;
          return `${parseInt(d, 10)} ${thaiMonthsShort[parseInt(m, 10) - 1]}`;
        }
        return k;
      } else {
        const parts = k.split('-');
        if (parts.length >= 2) {
          const [y, m] = parts;
          return `${thaiMonthsShort[parseInt(m, 10) - 1]} ${y.substring(2)}`;
        }
        return k;
      }
    });

    return {
      categories,
      values,
      sortedKeys,
      isDaily
    };
  }, [expiredDatasetOnly, filteredExpiryDataset, startDate, endDate]);

  // 8. Top 10 Products by Expired Value (10 อันดับสินค้าที่มีมูลค่าหมดอายุมากที่สุด)
  const top10ValueChartData = useMemo(() => {
    const targetRows = expiredDatasetOnly.length > 0 ? expiredDatasetOnly : filteredExpiryDataset;
    const prodMap = {};
    targetRows.forEach(row => {
      const name = row.ชื่อสินค้า || row.ชื่อสามัญ || 'Unknown';
      const val = row.มูลค่ารวม || 0;
      if (!prodMap[name]) {
        prodMap[name] = 0;
      }
      prodMap[name] += val;
    });

    const sortedList = Object.keys(prodMap)
      .map(name => ({ name, value: Math.round(prodMap[name]) }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      categories: sortedList.map(d => (d.name && d.name.length > 28 ? d.name.substring(0, 28) + '...' : d.name)),
      fullCategories: sortedList.map(d => d.name),
      values: sortedList.map(d => d.value),
      fullList: sortedList
    };
  }, [expiredDatasetOnly, filteredExpiryDataset]);

  // 9. Top 10 Warehouses by Expired Value (Row 2 Col 2 - ปรับยืดหยุ่นตามคลังที่มีอยู่จริง)
  const warehouseChartData = useMemo(() => {
    const targetRows = expiredDatasetOnly.length > 0 ? expiredDatasetOnly : filteredExpiryDataset;
    const whMap = {};
    targetRows.forEach(row => {
      const wh = row.คลัง || 'ไม่ระบุคลัง';
      if (!whMap[wh]) whMap[wh] = 0;
      whMap[wh] += (row.มูลค่ารวม || 0);
    });

    const sortedWhList = Object.keys(whMap)
      .map(name => ({ name, value: Math.round(whMap[name]) }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      categories: sortedWhList.map(d => (d.name && d.name.length > 25 ? d.name.substring(0, 25) + '...' : d.name)),
      fullCategories: sortedWhList.map(d => d.name),
      values: sortedWhList.map(d => d.value),
      fullList: sortedWhList
    };
  }, [expiredDatasetOnly, filteredExpiryDataset]);

  // 10. Top 10 Products by Expired Qty (Row 3 Col 1 - ปรับยืดหยุ่นตามสินค้าที่มีอยู่จริง)
  const top10ChartData = useMemo(() => {
    const targetRows = expiredDatasetOnly.length > 0 ? expiredDatasetOnly : filteredExpiryDataset;
    const prodMap = {};
    targetRows.forEach(row => {
      const name = row.ชื่อสินค้า || row.ชื่อสามัญ || 'Unknown';
      const val = row.จำนวน || 0;
      if (!prodMap[name]) {
        prodMap[name] = 0;
      }
      prodMap[name] += val;
    });

    const sortedList = Object.keys(prodMap)
      .map(name => ({ name, value: Math.round(prodMap[name]) }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      categories: sortedList.map(d => (d.name && d.name.length > 28 ? d.name.substring(0, 28) + '...' : d.name)),
      fullCategories: sortedList.map(d => d.name),
      values: sortedList.map(d => d.value),
      fullList: sortedList
    };
  }, [expiredDatasetOnly, filteredExpiryDataset]);

  // 11. Expiry Duration/Status Distribution (Donut Chart - Row 3 Col 2 - ปรับยืดหยุ่นตามข้อมูลจริง)
  const donutData = useMemo(() => {
    const targetRows = expiredDatasetOnly.length > 0 ? expiredDatasetOnly : filteredExpiryDataset;
    let under1Y = 0;
    let between1and2Y = 0;
    let between2and3Y = 0;
    let over3Y = 0;

    targetRows.forEach(row => {
      const duration = row.ระยะเวลาหมดอายุ;
      const years = getExpiryYears(duration);
      const val = row.มูลค่ารวม || 0;

      if (years === 0) {
        under1Y += val;
      } else if (years === 1) {
        between1and2Y += val;
      } else if (years === 2) {
        between2and3Y += val;
      } else {
        over3Y += val;
      }
    });

    return {
      series: [Math.round(under1Y), Math.round(between1and2Y), Math.round(between2and3Y), Math.round(over3Y)],
      labels: [
        'หมดอายุ < 1 ปี',
        'หมดอายุ 1-2 ปี',
        'หมดอายุ 2-3 ปี',
        'หมดอายุ 3 ปีขึ้นไป'
      ]
    };
  }, [expiredDatasetOnly, filteredExpiryDataset]);

  // 12. Upcoming Expiring Line Chart Data (Row 4 - สแกนหาช่วงเดือนอนาคตที่มีข้อมูลจริงในไฟล์)
  const upcomingExpiryChartData = useMemo(() => {
    const futureRows = filteredExpiryDataset.filter(row => {
      const dateStr = row.วันหมดอายุ;
      return isValidISODate(dateStr) && dateStr > todayStr;
    });

    if (futureRows.length === 0) {
      return {
        categories: [],
        values: [],
        sortedKeys: [],
        totalUpcomingVal: 0
      };
    }

    const monthMap = {};
    const monthsWithFuture = [];
    futureRows.forEach(row => {
      const dateStr = row.วันหมดอายุ;
      const m = dateStr.substring(0, 7);
      monthsWithFuture.push(m);
      if (!monthMap[m]) monthMap[m] = 0;
      monthMap[m] += (row.มูลค่ารวม || 0);
    });

    monthsWithFuture.sort();
    const minMonthStr = monthsWithFuture[0];
    const maxMonthStr = monthsWithFuture[monthsWithFuture.length - 1];

    const [startYear, startMon] = minMonthStr.split('-').map(Number);
    const [endYear, endMon] = maxMonthStr.split('-').map(Number);

    let curY = startYear;
    let curM = startMon;
    while (curY < endYear || (curY === endYear && curM <= endMon)) {
      const mKey = `${curY}-${String(curM).padStart(2, '0')}`;
      if (monthMap[mKey] === undefined) {
        monthMap[mKey] = 0;
      }
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    const sortedKeys = Object.keys(monthMap).sort((a, b) => a.localeCompare(b));
    const values = sortedKeys.map(k => Math.round(monthMap[k]));

    const thaiMonthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const categories = sortedKeys.map(k => {
      const parts = k.split('-');
      if (parts.length >= 2) {
        const [y, m] = parts;
        return `${thaiMonthsShort[parseInt(m, 10) - 1]} ${y.substring(2)}`;
      }
      return k;
    });

    const totalUpcomingVal = values.reduce((sum, v) => sum + v, 0);

    return {
      categories,
      values,
      sortedKeys,
      totalUpcomingVal
    };
  }, [filteredExpiryDataset, todayStr]);

  // Trigger dynamic entrance animation for Top 10 Value Chart
  useEffect(() => {
    setTop10ValueAnimatedSeries([]);
    const timer = setTimeout(() => {
      if (top10ValueChartData.values && top10ValueChartData.values.length > 0) {
        setTop10ValueAnimatedSeries([{
          name: 'มูลค่าสินค้า',
          data: top10ValueChartData.values
        }]);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [top10ValueChartData]);

  // Trigger dynamic entrance animation for Warehouse Chart
  useEffect(() => {
    setWarehouseAnimatedSeries([]);
    const timer = setTimeout(() => {
      if (warehouseChartData.values && warehouseChartData.values.length > 0) {
        setWarehouseAnimatedSeries([{
          name: 'มูลค่าสินค้า',
          data: warehouseChartData.values
        }]);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [warehouseChartData]);

  // Trigger dynamic entrance animation for Top 10 Qty Chart
  useEffect(() => {
    setTop10AnimatedSeries([]);
    const timer = setTimeout(() => {
      if (top10ChartData.values && top10ChartData.values.length > 0) {
        setTop10AnimatedSeries([{
          name: 'จำนวนหน่วย',
          data: top10ChartData.values
        }]);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [top10ChartData]);

  // Trigger dynamic entrance animation for Upcoming Expiry Chart
  useEffect(() => {
    setUpcomingAnimatedSeries([]);
    const timer = setTimeout(() => {
      if (upcomingExpiryChartData.values && upcomingExpiryChartData.values.length > 0) {
        setUpcomingAnimatedSeries([{
          name: 'มูลค่าใกล้หมดอายุ',
          data: upcomingExpiryChartData.values
        }]);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [upcomingExpiryChartData]);

  // Headers สำหรับตารางเจาะลึกระดับล็อต (ชั้น 2 และตารางหลัก) - ครบถ้วน 8 คอลัมน์
  const lotDetailHeaders = useMemo(() => [
    { key: 'รหัสสินค้า', label: 'รหัสสินค้า', style: { width: '180px', minWidth: '120px' } },
    { key: 'ชื่อสินค้า', label: 'ชื่อสินค้า', style: { whiteSpace: 'normal', width: '380px', minWidth: '220px' } },
    { key: 'คลัง', label: 'คลังสินค้า', style: { width: '180px', minWidth: '140px' } },
    { key: 'lot_number_id', label: 'LOT ID', style: { width: '200px', minWidth: '130px' } },
    { key: 'จำนวน', label: 'จำนวน', align: 'right', style: { width: '120px', minWidth: '90px' }, cellRender: (row, val) => val !== undefined && val !== null ? val.toLocaleString() : '0' },
    { key: 'มูลค่ารวม', label: 'มูลค่ารวม', align: 'right', style: { width: '150px', minWidth: '110px' }, cellRender: (row, val) => formatFullBahtCurrency(val) },
    { key: 'วันหมดอายุ', label: 'วันหมดอายุ', style: { width: '160px', minWidth: '135px' }, cellRender: (row, val) => {
      const isInherited = ['INHERITED_LOT', 'INHERITED_MAIN', 'ESTIMATED'].includes(row?.['การสืบทอด'] || row?.is_inherited);
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <span>{formatDateToDDMMYY(val)}</span>
          {isInherited && <InheritedBadge row={row} />}
        </div>
      );
    } },
    { key: 'ระยะเวลาหมดอายุ', label: 'ระยะเวลา', style: { width: '160px', minWidth: '150px' }, cellRender: (row, val) => {
      const displayLabel = formatExpiredDurationLabel(val, row);
      return (
        <strong style={{ fontWeight: 600, color: 'var(--danger)' }}>
          {displayLabel}
        </strong>
      );
    } }
  ], []);

  // Headers สำหรับตารางสรุปรายชื่อสินค้า (ชั้น 1: การ์ดมูลค่าสินค้า และ จำนวนสินค้า)
  const productSummaryHeaders = useMemo(() => [
    { key: 'รหัสสินค้า', label: 'รหัสสินค้า', style: { width: '180px', minWidth: '130px' } },
    { key: 'ชื่อสินค้า', label: 'ชื่อสินค้า', style: { whiteSpace: 'normal', width: '420px', minWidth: '220px' } },
    { key: 'จำนวนล็อต', label: 'จำนวนล็อต', align: 'right', style: { width: '120px', minWidth: '90px' }, cellRender: (row, val) => <span style={{ fontWeight: 600, color: 'var(--accent, #6366f1)' }}>{val || 1} ล็อต</span> },
    { key: 'จำนวน', label: 'จำนวนรวม (ชิ้น)', align: 'right', style: { width: '140px', minWidth: '110px' }, cellRender: (row, val) => val !== undefined && val !== null ? val.toLocaleString() : '0' },
    { key: 'มูลค่ารวม', label: 'มูลค่ารวม (บาท)', align: 'right', style: { width: '160px', minWidth: '120px' }, cellRender: (row, val) => formatFullBahtCurrency(val) },
    { key: 'ค่าเฉลี่ยระยะเวลา', label: 'ค่าเฉลี่ยระยะเวลาหมดอายุของล็อต', style: { width: '220px', minWidth: '180px' }, cellRender: (row, val) => <strong style={{ fontWeight: 600, color: '#dc2626' }}>{val || '-'}</strong> }
  ], []);

  // Headers สำหรับตารางสรุปรายคลัง (ชั้น 1: การ์ดจำนวนคลังสินค้า)
  const warehouseSummaryHeaders = useMemo(() => [
    { key: 'คลัง', label: 'คลังสินค้า', style: { width: '260px', minWidth: '180px' } },
    { key: 'จำนวนรายการ', label: 'จำนวนรายการ (ล็อต)', align: 'right', style: { width: '150px', minWidth: '110px' }, cellRender: (row, val) => <span style={{ fontWeight: 600, color: 'var(--accent, #6366f1)' }}>{val !== undefined && val !== null ? val.toLocaleString() : '0'} ล็อต</span> },
    { key: 'จำนวน', label: 'จำนวนสินค้ารวม (ชิ้น)', align: 'right', style: { width: '160px', minWidth: '110px' }, cellRender: (row, val) => val !== undefined && val !== null ? val.toLocaleString() : '0' },
    { key: 'มูลค่ารวม', label: 'มูลค่าหมดอายุรวม', align: 'right', style: { width: '170px', minWidth: '120px' }, cellRender: (row, val) => formatFullBahtCurrency(val) },
    { key: 'ค่าเฉลี่ยระยะเวลา', label: 'ค่าเฉลี่ยระยะเวลาหมดอายุของล็อต', style: { width: '220px', minWidth: '180px' }, cellRender: (row, val) => <strong style={{ fontWeight: 600, color: '#dc2626' }}>{val || '-'}</strong> }
  ], []);

  // Headers สำหรับตาราง Drilldown สินค้าใกล้หมดอายุ (เปลี่ยนชื่อคอลัมน์และคำนวณเป็น "เหลือเวลา")
  const upcomingTableHeaders = useMemo(() => [
    { key: 'รหัสสินค้า', label: 'รหัสสินค้า', style: { width: '170px', minWidth: '110px' } },
    { key: 'ชื่อสินค้า', label: 'ชื่อสินค้า', style: { whiteSpace: 'normal', width: '520px', minWidth: '220px' } },
    { key: 'คลัง', label: 'คลังสินค้า', style: { width: '160px', minWidth: '140px' } },
    { key: 'lot_number_id', label: 'LOT ID', style: { width: '180px', minWidth: '130px' } },
    { key: 'จำนวน', label: 'จำนวน', align: 'right', style: { width: '120px', minWidth: '100px' }, cellRender: (row, val) => val !== undefined && val !== null ? val.toLocaleString() : '0' },
    { key: 'มูลค่ารวม', label: 'มูลค่ารวม', style: { width: '120px', minWidth: '100px' }, cellRender: (row, val) => formatFullBahtCurrency(val) },
    { key: 'วันหมดอายุ', label: 'วันหมดอายุ', style: { width: '160px', minWidth: '135px' }, cellRender: (row, val) => {
      const isInherited = ['INHERITED_LOT', 'INHERITED_MAIN', 'ESTIMATED'].includes(row?.['การสืบทอด'] || row?.is_inherited);
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <span>{formatDateToDDMMYY(val)}</span>
          {isInherited && <InheritedBadge row={row} />}
        </div>
      );
    } },
    { key: 'วันหมดอายุ', label: 'เหลือเวลา', style: { width: '160px', minWidth: '150px' }, cellRender: (row, val) => (
      <strong style={{ fontWeight: 700, color: '#d97706' }}>
        {formatRemainingTime(val)}
      </strong>
    ) }
  ], []);

  // Headers สำหรับแท็บ "ทั้งหมด" (รวมหมดอายุและใกล้หมดอายุ)
  const allTableHeaders = useMemo(() => [
    { key: 'รหัสสินค้า', label: 'รหัสสินค้า', style: { width: '170px', minWidth: '110px' } },
    { key: 'ชื่อสินค้า', label: 'ชื่อสินค้า', style: { whiteSpace: 'normal', width: '480px', minWidth: '220px' } },
    { key: 'คลัง', label: 'คลังสินค้า', style: { width: '160px', minWidth: '140px' } },
    { key: 'lot_number_id', label: 'LOT ID', style: { width: '180px', minWidth: '130px' } },
    { key: 'จำนวน', label: 'จำนวน', align: 'right', style: { width: '120px', minWidth: '100px' }, cellRender: (row, val) => val !== undefined && val !== null ? val.toLocaleString() : '0' },
    { key: 'มูลค่ารวม', label: 'มูลค่ารวม', style: { width: '120px', minWidth: '100px' }, cellRender: (row, val) => formatFullBahtCurrency(val) },
    { key: 'วันหมดอายุ', label: 'วันหมดอายุ', style: { width: '160px', minWidth: '135px' }, cellRender: (row, val) => {
      const isInherited = ['INHERITED_LOT', 'INHERITED_MAIN', 'ESTIMATED'].includes(row?.['การสืบทอด'] || row?.is_inherited);
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <span>{formatDateToDDMMYY(val)}</span>
          {isInherited && <InheritedBadge row={row} />}
        </div>
      );
    } },
    { key: 'วันหมดอายุ', label: 'สถานะ / เหลือเวลา', style: { width: '170px', minWidth: '160px' }, cellRender: (row, val) => {
      const isExpired = val && val <= todayStr;
      return isExpired ? (
        <span style={{ color: 'var(--danger)', fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
          หมดอายุ ({row.ระยะเวลาหมดอายุ || 'แล้ว'})
        </span>
      ) : (
        <span style={{ color: '#d97706', fontWeight: 700, background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
          {formatRemainingTime(val)}
        </span>
      );
    } }
  ], [todayStr]);

  // เลือกว่าตารางหลักใช้ Header ตัวไหนตามแท็บ
  const currentTableHeaders = useMemo(() => {
    if (tableTab === 'upcoming') return upcomingTableHeaders;
    if (tableTab === 'all') return allTableHeaders;
    return lotDetailHeaders;
  }, [tableTab, lotDetailHeaders, upcomingTableHeaders, allTableHeaders]);

  // ฟังก์ชันเจาะลึกชั้น 2: แสดงรายละเอียดทุกล็อตของสินค้าที่เลือก
  const handleDrilldownProductLots = (productRow) => {
    const itemCode = productRow.รหัสสินค้า;
    const itemName = productRow.ชื่อสินค้า;
    const targetDataset = expiredDatasetOnly.length > 0 ? expiredDatasetOnly : filteredExpiryDataset;
    const lotRows = targetDataset.filter(r => {
      if (itemCode && itemCode !== '-') return r.รหัสสินค้า === itemCode;
      return r.ชื่อสินค้า === itemName;
    }).sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));

    const totalVal = lotRows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
    const totalQty = lotRows.reduce((sum, r) => sum + (r.จำนวน || 0), 0);

    const level2State = {
      level: 2,
      type: 'product_lots',
      title: `📦 เจาะลึกทุกล็อตสินค้าหมดอายุ: ${itemName} (${itemCode})`,
      rows: lotRows,
      headers: lotDetailHeaders,
      summaryItems: [
        { label: 'จำนวนล็อตย่อย', value: `${lotRows.length.toLocaleString()} ล็อต`, color: 'var(--primary)' },
        { label: 'จำนวนสินค้ารวม', value: `${totalQty.toLocaleString()} ชิ้น`, color: 'var(--success)' },
        { label: 'มูลค่าหมดอายุรวม', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' }
      ]
    };

    setModalHistory(prev => [...prev, level2State]);
  };

  // ฟังก์ชันเจาะลึกชั้น 2: แสดงรายละเอียดทุกล็อตในคลังที่เลือก
  const handleDrilldownWarehouseLots = (warehouseRow) => {
    const whName = warehouseRow.คลัง;
    const targetDataset = expiredDatasetOnly.length > 0 ? expiredDatasetOnly : filteredExpiryDataset;
    const lotRows = targetDataset.filter(r => r.คลัง === whName)
      .sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));

    const totalVal = lotRows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
    const totalQty = lotRows.reduce((sum, r) => sum + (r.จำนวน || 0), 0);

    const level2State = {
      level: 2,
      type: 'warehouse_lots',
      title: `🏥 เจาะลึกทุกล็อตสินค้าหมดอายุในคลัง: ${whName}`,
      rows: lotRows,
      headers: lotDetailHeaders,
      summaryItems: [
        { label: 'คลังสินค้า', value: whName, color: 'var(--primary)' },
        { label: 'จำนวนรายการล็อต', value: `${lotRows.length.toLocaleString()} ล็อต`, color: 'var(--warning)' },
        { label: 'จำนวนสินค้ารวม', value: `${totalQty.toLocaleString()} ชิ้น`, color: 'var(--success)' },
        { label: 'มูลค่าหมดอายุรวม', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' }
      ]
    };

    setModalHistory(prev => [...prev, level2State]);
  };

  // ย้อนกลับจากชั้น 2 สู่ชั้น 1
  const handleModalBack = () => {
    setModalHistory(prev => {
      if (prev.length <= 1) {
        setIsModalOpen(false);
        return [];
      }
      return prev.slice(0, -1);
    });
  };

  // Drilldown Opening Handlers (รวมเจาะลึกที่การ์ดและกราฟ)
  const handleOpenDrilldown = (type, key, titleStr) => {
    let rows = [];
    let headers = lotDetailHeaders;
    let summaryItems = [];
    let onRowClickHandler = null;

    if (type === 'all_value' || type === 'all_qty') {
      // รวมกลุ่มยอดตามชื่อสินค้า (ชั้น 1)
      const prodMap = new Map();
      expiredDatasetOnly.forEach(r => {
        const id = r.รหัสสินค้า || '-';
        const name = r.ชื่อสินค้า || 'Unknown';
        const pKey = `${id}___${name}`;
        const days = getDaysExpired(r);
        if (!prodMap.has(pKey)) {
          prodMap.set(pKey, {
            "รหัสสินค้า": id,
            "ชื่อสินค้า": name,
            "จำนวนล็อต": 0,
            "จำนวน": 0,
            "มูลค่ารวม": 0,
            "totalDays": 0
          });
        }
        const entry = prodMap.get(pKey);
        entry.จำนวนล็อต += 1;
        entry.จำนวน += (r.จำนวน || 0);
        entry.มูลค่ารวม += (r.มูลค่ารวม || 0);
        entry.totalDays += days;
      });

      prodMap.forEach(entry => {
        entry.ค่าเฉลี่ยระยะเวลา = formatAverageExpiredDuration(entry.totalDays, entry.จำนวนล็อต);
      });

      if (type === 'all_value') {
        rows = Array.from(prodMap.values()).sort((a, b) => b.มูลค่ารวม - a.มูลค่ารวม);
        summaryItems = [
          { label: 'มูลค่าสินค้าหมดอายุรวมทั้งหมด', value: formatFullBahtCurrency(stats.totalVal), color: 'var(--primary)' },
          { label: 'จำนวนรายการสินค้า', value: `${rows.length.toLocaleString()} รายการ (คลิกที่แถวเพื่อดูทุกล็อตย่อย)`, color: 'var(--text-muted)' }
        ];
      } else {
        rows = Array.from(prodMap.values()).sort((a, b) => b.จำนวน - a.จำนวน);
        summaryItems = [
          { label: 'จำนวนหน่วยสินค้าหมดอายุรวมทั้งหมด', value: `${stats.totalQty.toLocaleString()} ชิ้น`, color: 'var(--success)' },
          { label: 'จำนวนรายการสินค้า', value: `${rows.length.toLocaleString()} รายการ (คลิกที่แถวเพื่อดูทุกล็อตย่อย)`, color: 'var(--text-muted)' }
        ];
      }
      headers = productSummaryHeaders;
      onRowClickHandler = handleDrilldownProductLots;

    } else if (type === 'all_lots') {
      rows = expiredDatasetOnly.slice().sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));
      summaryItems = [
        { label: 'จำนวนล็อตสินค้าหมดอายุทั้งหมด', value: `${stats.totalLots.toLocaleString()} รายการ`, color: 'var(--warning)' },
        { label: 'มูลค่ารวม', value: formatFullBahtCurrency(stats.totalVal), color: 'var(--primary)' }
      ];
      headers = lotDetailHeaders;

    } else if (type === 'all_warehouses') {
      // รวมกลุ่มเฉพาะคลังที่มีสินค้าหมดอายุเท่านั้น (ชั้น 1)
      const whMap = new Map();
      expiredDatasetOnly.forEach(r => {
        const wh = r.คลัง || '-';
        const days = getDaysExpired(r);
        if (!whMap.has(wh)) {
          whMap.set(wh, {
            "คลัง": wh,
            "จำนวนรายการ": 0,
            "จำนวน": 0,
            "มูลค่ารวม": 0,
            "totalDays": 0
          });
        }
        const entry = whMap.get(wh);
        entry.จำนวนรายการ += 1;
        entry.จำนวน += (r.จำนวน || 0);
        entry.มูลค่ารวม += (r.มูลค่ารวม || 0);
        entry.totalDays += days;
      });

      whMap.forEach(entry => {
        entry.ค่าเฉลี่ยระยะเวลา = formatAverageExpiredDuration(entry.totalDays, entry.จำนวนรายการ);
      });

      rows = Array.from(whMap.values())
        .filter(w => w.มูลค่ารวม > 0 || w.จำนวน > 0)
        .sort((a, b) => b.มูลค่ารวม - a.มูลค่ารวม);

      summaryItems = [
        { label: 'คลังสินค้าที่มีสินค้าหมดอายุทั้งหมด', value: `${rows.length.toLocaleString()} คลัง (คลิกที่แถวเพื่อดูทุกล็อตย่อย)`, color: 'var(--primary)' },
        { label: 'มูลค่าหมดอายุรวม', value: formatFullBahtCurrency(stats.totalVal), color: 'var(--warning)' }
      ];
      headers = warehouseSummaryHeaders;
      onRowClickHandler = handleDrilldownWarehouseLots;

    } else if (type === 'warehouse') {
      rows = expiredDatasetOnly.filter(r => r.คลัง === key).sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));
      const totalVal = rows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
      summaryItems = [
        { label: 'คลังสินค้า', value: key, color: 'var(--primary)' },
        { label: 'มูลค่าหมดอายุรวม', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' },
        { label: 'จำนวนรายการล็อต', value: `${rows.length.toLocaleString()} ล็อต`, color: 'var(--text-muted)' }
      ];
      headers = lotDetailHeaders;

    } else if (type === 'expiry_month') {
      rows = expiredDatasetOnly.filter(r => {
        const dateStr = r.day_expiry || r.วันหมดอายุ;
        return dateStr && dateStr.startsWith(key);
      }).sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));
      const totalVal = rows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
      summaryItems = [
        { label: 'เดือนหมดอายุ', value: key, color: 'var(--primary)' },
        { label: 'มูลค่าหมดอายุรวม', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' },
        { label: 'จำนวนรายการล็อต', value: `${rows.length.toLocaleString()} ล็อต`, color: 'var(--text-muted)' }
      ];
      headers = lotDetailHeaders;

    } else if (type === 'upcoming_expiry_month') {
      rows = filteredExpiryDataset.filter(r => {
        const dateStr = r.day_expiry || r.วันหมดอายุ;
        return dateStr && dateStr.startsWith(key) && dateStr > todayStr;
      }).sort((a, b) => {
        const dateA = a.day_expiry || a.วันหมดอายุ || '';
        const dateB = b.day_expiry || b.วันหมดอายุ || '';
        return dateA.localeCompare(dateB);
      });
      const totalVal = rows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
      summaryItems = [
        { label: 'เดือนใกล้หมดอายุ', value: titleStr.replace('เจาะลึกสินค้าใกล้หมดอายุเดือน: ', ''), color: '#f59e0b' },
        { label: 'มูลค่ารวม', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' },
        { label: 'จำนวนรายการล็อต', value: `${rows.length.toLocaleString()} ล็อต`, color: 'var(--text-muted)' }
      ];
      headers = upcomingTableHeaders;

    } else if (type === 'expiry_day') {
      rows = expiredDatasetOnly.filter(r => {
        const dateStr = r.day_expiry || r.วันหมดอายุ;
        return dateStr && dateStr === key;
      }).sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));
      const totalVal = rows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
      summaryItems = [
        { label: 'วันหมดอายุ', value: key, color: 'var(--primary)' },
        { label: 'มูลค่าหมดอายุรวม', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' },
        { label: 'จำนวนรายการล็อต', value: `${rows.length.toLocaleString()} ล็อต`, color: 'var(--text-muted)' }
      ];
      headers = lotDetailHeaders;

    } else if (type === 'status') {
      rows = expiredDatasetOnly.filter(r => {
        const totalMonths = getExpiryTotalMonths(r.ระยะเวลาหมดอายุ);
        if (key === 'expired') {
          return totalMonths <= 0;
        } else if (key === 'risk_high') {
          return totalMonths > 0 && totalMonths <= 6;
        } else if (key === 'risk_med') {
          return totalMonths > 6 && totalMonths <= 12;
        } else {
          return totalMonths > 12;
        }
      }).sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));
      const totalVal = rows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
      const label = key === 'expired' ? 'หมดอายุแล้ว' : (key === 'risk_high' ? 'วิกฤต (≤ 6 ด.)' : (key === 'risk_med' ? 'เตือนภัย (6-12 ด.)' : 'ปลอดภัย (> 12 ด.)'));
      summaryItems = [
        { label: 'สถานะอายุสินค้า', value: label, color: 'var(--danger)' },
        { label: 'มูลค่ารวม', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' },
        { label: 'จำนวนรายการล็อต', value: `${rows.length.toLocaleString()} ล็อต`, color: 'var(--text-muted)' }
      ];
      headers = lotDetailHeaders;

    } else if (type === 'expiry_duration_group') {
      rows = expiredDatasetOnly.filter(r => {
        const years = getExpiryYears(r.ระยะเวลาหมดอายุ);
        if (key === 'under_1y') return years === 0;
        if (key === '1_2y') return years === 1;
        if (key === '2_3y') return years === 2;
        return years >= 3;
      }).sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));
      const totalVal = rows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
      summaryItems = [
        { label: 'ช่วงอายุสินค้าหมดอายุ', value: titleStr.replace('เจาะลึกสถานะอายุสินค้า: ', '').replace('เจาะลึกสินค้าสถานะ: ', ''), color: 'var(--warning)' },
        { label: 'มูลค่ารวม', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' },
        { label: 'จำนวนรายการล็อต', value: `${rows.length.toLocaleString()} ล็อต`, color: 'var(--text-muted)' }
      ];
      headers = lotDetailHeaders;

    } else if (type === 'product_name' || type === 'product_value') {
      rows = expiredDatasetOnly.filter(r => (r.ชื่อสินค้า === key || r.ชื่อสามัญ === key)).sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));
      const totalVal = rows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
      const totalQty = rows.reduce((sum, r) => sum + (r.จำนวน || 0), 0);
      summaryItems = [
        { label: 'ชื่อสินค้า', value: key, color: 'var(--primary)' },
        { label: 'จำนวนสินค้ารวม', value: `${totalQty.toLocaleString()} ชิ้น`, color: 'var(--success)' },
        { label: 'มูลค่าหมดอายุรวม', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' },
        { label: 'จำนวนล็อตย่อย', value: `${rows.length.toLocaleString()} ล็อต`, color: 'var(--text-muted)' }
      ];
      headers = lotDetailHeaders;
    }

    const level1State = {
      level: 1,
      type,
      title: titleStr,
      rows,
      headers,
      summaryItems,
      onRowClick: onRowClickHandler
    };

    setModalHistory([level1State]);
    setIsModalOpen(true);
  };

  return (
    <div className="tab-container">
      {/* KPI Cards Row*/}
      <section className="kpi-row" style={{ marginBottom: '24px' }}>
        <KpiCard 
          title="มูลค่าสินค้า"
          value={`${stats.totalVal.toLocaleString()} <span style="font-size: 0.9rem; font-weight: 500; margin-left: 4px; color: var(--text-muted);">บาท</span>`}
          icon={DollarSign}
          accentClass="info"
          subtext="มูลค่ารวมของสินค้าที่หมดอายุแล้ว"
          onClick={() => handleOpenDrilldown('all_value', null, 'เจาะลึกมูลค่าสินค้าหมดอายุตามรายการสินค้า')}
        />
        <KpiCard 
          title="จำนวนสินค้า"
          value={`${stats.totalQty.toLocaleString()} <span style="font-size: 0.9rem; font-weight: 500; margin-left: 4px; color: var(--text-muted);">ชิ้น</span>`}
          icon={Package}
          accentClass="success"
          subtext="จำนวนรวมหน่วยสินค้าที่หมดอายุแล้ว"
          onClick={() => handleOpenDrilldown('all_qty', null, 'เจาะลึกจำนวนสินค้าหมดอายุตามรายการสินค้า')}
        />
        <KpiCard 
          title="จำนวนล็อตสินค้า"
          value={`${stats.totalLots.toLocaleString()} <span style="font-size: 0.9rem; font-weight: 500; margin-left: 4px; color: var(--text-muted);">รายการ</span>`}
          icon={Hash}
          accentClass="warning"
          subtext="จำนวนรวมล็อตสินค้าที่หมดอายุแล้ว"
          onClick={() => handleOpenDrilldown('all_lots', null, 'เจาะลึกทุกล็อตสินค้าหมดอายุ')}
        />
        <KpiCard 
          title="จำนวนคลังสินค้า"
          value={`${stats.activeWhCount.toLocaleString()} <span style="font-size: 0.9rem; font-weight: 500; margin-left: 4px; color: var(--text-muted);">คลัง</span>`}
          icon={AlertCircle}
          accentClass="purple"
          subtext="คลังที่มีสินค้าหมดอายุ"
          onClick={() => handleOpenDrilldown('all_warehouses', null, 'เจาะลึกคลังสินค้าที่มีสินค้าหมดอายุ')}
        />
      </section>

      {/* Charts Layout Section */}
      <section className="charts-layout-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
        
        {/* Row 1: Monthly Expired Value Trend (Full width - แสดงเดือนทั้งหมดอย่างต่อเนื่อง) */}
        <div className="charts-row-full">
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">
                <Hash style={{ color: 'var(--success)', width: '20px', height: '20px' }} />
                <span>{trendChartData.isDaily ? "มูลค่าสินค้าที่หมดอายุในแต่ละวัน" : "มูลค่าสินค้าที่หมดอายุในแต่ละเดือน"}</span>
              </div>
            </div>
            <div className="chart-body" style={{ display: 'block', width: '100%', minWidth: 0 }}>
              <Chart 
                key="expiry-monthly-trend-chart"
                width="100%" 
                options={{
                  chart: {
                    type: 'area',
                    height: 300,
                    toolbar: { show: false },
                    animations: {
                      enabled: true,
                      easing: 'easeinout',
                      speed: 800,
                      dynamicAnimation: { enabled: false }
                    },
                    events: {
                      markerClick: (e, chartCtx, config) => {
                        const idx = config.dataPointIndex;
                        const key = trendChartData.sortedKeys[idx];
                        if (key) {
                          handleOpenDrilldown(trendChartData.isDaily ? 'expiry_day' : 'expiry_month', key, `เจาะลึกสินค้าหมดอายุวันที่ ${trendChartData.categories[idx]}`);
                        }
                      },
                      dataPointSelection: (e, chartCtx, config) => {
                        const idx = config.dataPointIndex;
                        if (idx !== undefined && trendChartData.sortedKeys[idx]) {
                          const key = trendChartData.sortedKeys[idx];
                          handleOpenDrilldown(trendChartData.isDaily ? 'expiry_day' : 'expiry_month', key, `เจาะลึกสินค้าหมดอายุวันที่ ${trendChartData.categories[idx]}`);
                        }
                      }
                    }
                  },
                  stroke: { curve: 'smooth', width: 2.5 },
                  markers: { size: 0, hover: { size: 5 } },
                  colors: ['#0d9488'],
                  dataLabels: { enabled: false },
                  fill: {
                    type: 'gradient',
                    gradient: {
                      shadeIntensity: 1,
                      opacityFrom: 0.35,
                      opacityTo: 0.02,
                      stops: [0, 100]
                    }
                  },
                  xaxis: {
                    categories: trendChartData.categories,
                    labels: { 
                      style: { colors: 'var(--secondary)', fontWeight: 600 },
                      rotate: -45,
                      rotateAlways: false,
                      hideOverlappingLabels: true
                    }
                  },
                  yaxis: {
                    labels: {
                      formatter: (val) => formatBahtCurrency(val),
                      style: { colors: 'var(--secondary)' }
                    }
                  },
                  grid: { borderColor: 'var(--border)', strokeDashArray: 4 },
                  tooltip: {
                    custom: function({series, seriesIndex, dataPointIndex, _w}) {
                      const dateLabel = trendChartData.categories[dataPointIndex];
                      const val = series[seriesIndex][dataPointIndex];
                      return `
                        <div class="custom-chart-tooltip">
                          <div class="tooltip-header">เดือน ${dateLabel}</div>
                          <div class="tooltip-body">
                            <div><strong>มูลค่าหมดอายุ:</strong> ${Math.round(val).toLocaleString()} บาท</div>
                          </div>
                        </div>
                      `;
                    }
                  }
                }}
                series={[{ name: 'มูลค่าสินค้า', data: trendChartData.values || [] }]}
                type="area"
                height={300}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Top 10 Value Bar and Warehouse Bar (Split 50/50 - เฉพาะสินค้าที่หมดอายุแล้ว <= วันนี้) */}
        <div className="charts-row-half">
          {/* Top 10 Products by Expired Value Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">
                <DollarSign style={{ color: 'var(--accent, #6366f1)', width: '20px', height: '20px' }} />
                <span>10 อันดับสินค้าที่มีมูลค่าหมดอายุมากที่สุด</span>
              </div>
            </div>
            <div className="chart-body" style={{ display: 'block', width: '100%', minWidth: 0 }}>
              <Chart 
                key={`expiry-top10-val-${top10ValueChartData.categories.length}`}
                width="100%" 
                options={{
                  chart: {
                    type: 'bar',
                    toolbar: { show: false },
                    animations: {
                      enabled: true,
                      easing: 'easeinout',
                      speed: 1200,
                      animateGradually: { enabled: true, delay: 150 },
                      dynamicAnimation: { enabled: true, speed: 1200 }
                    },
                    events: {
                      dataPointSelection: (e, chartCtx, config) => {
                        const idx = config ? config.dataPointIndex : undefined;
                        if (idx !== undefined && top10ValueChartData.fullList[idx]) {
                          handleOpenDrilldown('product_value', top10ValueChartData.fullList[idx].name, `เจาะลึกสินค้าหมดอายุ: ${top10ValueChartData.fullList[idx].name}`);
                        }
                      }
                    }
                  },
                  plotOptions: {
                    bar: {
                      horizontal: true,
                      borderRadius: 4,
                      barHeight: '70%',
                      distributed: true,
                      dataLabels: {
                        position: 'top'
                      }
                    }
                  },
                  colors: ['#6366F1', '#8B5CF6', '#3B82F6', '#0EA5E9', '#14B8A6', '#22C55E', '#FACC15', '#FB923C', '#EF4444', '#EC4899'],
                  fill: {
                    opacity: 0.7
                  },
                  stroke: {
                    show: true,
                    width: 1,
                    colors: ['#6366F1', '#8B5CF6', '#3B82F6', '#0EA5E9', '#14B8A6', '#22C55E', '#FACC15', '#FB923C', '#EF4444', '#EC4899']
                  },
                  legend: {
                    show: false
                  },
                  dataLabels: {
                    enabled: true,
                    textAnchor: 'start',
                    style: {
                      colors: ['#374151'],
                      fontWeight: 700,
                      fontSize: '12px'
                    },
                    formatter: (val) => formatBahtCurrency(val),
                    offsetX: 10
                  },
                  xaxis: {
                    categories: top10ValueChartData.categories,
                    labels: {
                      formatter: (val) => formatBahtCurrency(val),
                      style: { colors: 'var(--secondary)', fontSize: '12px' }
                    }
                  },
                  yaxis: {
                    labels: {
                      maxWidth: 280,
                      style: { colors: '#0f172a', fontWeight: 400, fontSize: '12px' }
                    }
                  },
                  grid: { borderColor: 'var(--border)', strokeDashArray: 4, padding: { right: 65, left: 10 } },
                  tooltip: {
                    custom: function({series, seriesIndex, dataPointIndex, w}) {
                      const prod = top10ValueChartData.fullList ? top10ValueChartData.fullList[dataPointIndex] : null;
                      const prodName = prod ? prod.name : (top10ValueChartData.fullCategories ? top10ValueChartData.fullCategories[dataPointIndex] : w.config.xaxis.categories[dataPointIndex]);
                      if (!prodName) return '';
                      const val = series[seriesIndex][dataPointIndex] || (prod ? prod.value : 0);
                      const matchingItems = expiredDatasetOnly.filter(r => (r.ชื่อสินค้า === prodName || r.ชื่อสามัญ === prodName));
                      const totalQty = matchingItems.reduce((sum, r) => sum + (r.จำนวน || 0), 0);
                      const lotCount = matchingItems.length;
                      return `
                        <div class="custom-chart-tooltip">
                          <div class="tooltip-header">${prodName}</div>
                          <div class="tooltip-body">
                            <div><strong>มูลค่าหมดอายุ:</strong> ${Math.round(val).toLocaleString()} บาท</div>
                            <div><strong>จำนวนสินค้า:</strong> ${Math.round(totalQty).toLocaleString()} ชิ้น</div>
                            <div><strong>จำนวนล็อต:</strong> ${lotCount.toLocaleString()} ล็อต</div>
                          </div>
                        </div>
                      `;
                    }
                  }
                }}
                series={top10ValueAnimatedSeries.length > 0 ? top10ValueAnimatedSeries : [{ name: 'มูลค่าสินค้า', data: [] }]}
                type="bar"
                height={340}
              />
            </div>
          </div>

          {/* Warehouse bar chart */}
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">
                <Package style={{ color: 'var(--accent)', width: '20px', height: '20px' }} />
                <span>10 อันดับคลังสินค้าที่มีมูลค่ามากที่สุด</span>
              </div>
            </div>
            <div className="chart-body" style={{ display: 'block', width: '100%', minWidth: 0 }}>
              <Chart 
                key={`expiry-wh-${warehouseChartData.categories.length}`}
                width="100%" 
                options={{
                  chart: {
                    type: 'bar',
                    toolbar: { show: false },
                    animations: {
                      enabled: true,
                      easing: 'easeinout',
                      speed: 1200,
                      animateGradually: { enabled: true, delay: 150 },
                      dynamicAnimation: { enabled: true, speed: 1200 }
                    },
                    events: {
                      dataPointSelection: (e, chartCtx, config) => {
                        const idx = config ? config.dataPointIndex : undefined;
                        if (idx !== undefined && idx !== -1) {
                          const name = warehouseChartData.fullCategories ? warehouseChartData.fullCategories[idx] : warehouseChartData.categories[idx];
                          if (name) {
                            handleOpenDrilldown('warehouse', name, `เจาะลึกสินค้าหมดอายุคลัง: ${name}`);
                          }
                        }
                      }
                    }
                  },
                  plotOptions: {
                    bar: {
                      horizontal: true,
                      borderRadius: 4,
                      barHeight: '70%',
                      distributed: true,
                      dataLabels: {
                        position: 'top'
                      }
                    }
                  },
                  colors: ['#6366F1', '#8B5CF6', '#3B82F6', '#0EA5E9', '#14B8A6', '#22C55E', '#FACC15', '#FB923C', '#EF4444', '#EC4899'],
                  fill: {
                    opacity: 0.65
                  },
                  stroke: {
                    show: true,
                    width: 1,
                    colors: ['#6366F1', '#8B5CF6', '#3B82F6', '#0EA5E9', '#14B8A6', '#22C55E', '#FACC15', '#FB923C', '#EF4444', '#EC4899']
                  },
                  legend: {
                    show: false
                  },
                  dataLabels: {
                    enabled: true,
                    textAnchor: 'start',
                    style: {
                      colors: ['#374151'],
                      fontWeight: 700,
                      fontSize: '12px'
                    },
                    formatter: (val) => formatBahtCurrency(val),
                    offsetX: 10
                  },
                  xaxis: {
                    categories: warehouseChartData.categories,
                    labels: {
                      formatter: (val) => formatBahtCurrency(val),
                      style: { colors: 'var(--secondary)', fontSize: '12px' }
                    }
                  },
                  yaxis: {
                    labels: {
                      maxWidth: 280,
                      style: { colors: '#0f172a', fontWeight: 400, fontSize: '12px' }
                    }
                  },
                  grid: { borderColor: 'var(--border)', strokeDashArray: 4, padding: { right: 65, left: 10 } },
                  tooltip: {
                    custom: function({_series, _seriesIndex, dataPointIndex, w}) {
                      const whName = warehouseChartData.fullCategories ? warehouseChartData.fullCategories[dataPointIndex] : w.config.xaxis.categories[dataPointIndex];
                      if (!whName) return '';
                      const whItems = expiredDatasetOnly.filter(r => r.คลัง === whName);
                      const totalVal = whItems.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
                      const totalQty = whItems.reduce((sum, r) => sum + (r.จำนวน || 0), 0);
                      const lotCount = whItems.length;
                      return `
                        <div class="custom-chart-tooltip">
                          <div class="tooltip-header">${whName}</div>
                          <div class="tooltip-body">
                            <div><strong>มูลค่า:</strong> ${Math.round(totalVal).toLocaleString()} บาท</div>
                            <div><strong>จำนวนสินค้า:</strong> ${Math.round(totalQty).toLocaleString()} ชิ้น</div>
                            <div><strong>จำนวนรายการ:</strong> ${lotCount.toLocaleString()} รายการ</div>
                          </div>
                        </div>
                      `;
                    }
                  }
                }}
                series={warehouseAnimatedSeries.length > 0 ? warehouseAnimatedSeries : [{ name: 'มูลค่าสินค้า', data: [] }]}
                type="bar"
                height={340}
              />
            </div>
          </div>
        </div>

        {/* Row 3: Product Qty Bar and Donut (Split 50/50 - เฉพาะสินค้าที่หมดอายุแล้ว <= วันนี้) */}
        <div className="charts-row-half">
          {/* Product Qty Bar Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">
                <Hash style={{ color: 'var(--info)', width: '20px', height: '20px' }} />
                <span>10 อันดับจำนวนสินค้าที่มากที่สุด</span>
              </div>
            </div>
            <div className="chart-body" style={{ display: 'block', width: '100%', minWidth: 0 }}>
              <Chart 
                key={`expiry-top10-${top10ChartData.categories.length}`}
                width="100%" 
                options={{
                  chart: {
                    type: 'bar',
                    toolbar: { show: false },
                    animations: {
                      enabled: true,
                      easing: 'easeinout',
                      speed: 1200,
                      animateGradually: { enabled: true, delay: 150 },
                      dynamicAnimation: { enabled: true, speed: 1200 }
                    },
                    events: {
                      dataPointSelection: (e, chartCtx, config) => {
                        const idx = config.dataPointIndex;
                        if (idx !== undefined && top10ChartData.fullList[idx]) {
                          handleOpenDrilldown('product_name', top10ChartData.fullList[idx].name, `เจาะลึกสินค้าหมดอายุ: ${top10ChartData.fullList[idx].name}`);
                        }
                      }
                    }
                  },
                  plotOptions: {
                    bar: {
                      horizontal: true,
                      borderRadius: 4,
                      barHeight: '70%',
                      distributed: true,
                      dataLabels: {
                        position: 'top'
                      }
                    }
                  },
                  colors: ['#6366F1', '#8B5CF6', '#3B82F6', '#0EA5E9', '#14B8A6', '#22C55E', '#FACC15', '#FB923C', '#EF4444', '#EC4899'],
                  fill: {
                    opacity: 0.65
                  },
                  stroke: {
                    show: true,
                    width: 1,
                    colors: ['#6366F1', '#8B5CF6', '#3B82F6', '#0EA5E9', '#14B8A6', '#22C55E', '#FACC15', '#FB923C', '#EF4444', '#EC4899']
                  },
                  legend: {
                    show: false
                  },
                  dataLabels: {
                    enabled: true,
                    textAnchor: 'start',
                    style: {
                      colors: ['#374151'],
                      fontWeight: 700,
                      fontSize: '12px'
                    },
                    formatter: (val) => val.toLocaleString(),
                    offsetX: 10
                  },
                  xaxis: {
                    categories: top10ChartData.categories,
                    labels: {
                      formatter: (val) => val.toLocaleString(),
                      style: { colors: 'var(--secondary)', fontSize: '12px' }
                    }
                  },
                  yaxis: {
                    labels: {
                      maxWidth: 280,
                      style: { colors: '#0f172a', fontWeight: 400, fontSize: '12px' }
                    }
                  },
                  grid: { borderColor: 'var(--border)', strokeDashArray: 4, padding: { right: 65, left: 10 } },
                  tooltip: {
                    custom: function({series, seriesIndex, dataPointIndex, w}) {
                      const prod = top10ChartData.fullList ? top10ChartData.fullList[dataPointIndex] : null;
                      const prodName = prod ? prod.name : (top10ChartData.fullCategories ? top10ChartData.fullCategories[dataPointIndex] : w.config.xaxis.categories[dataPointIndex]);
                      if (!prodName) return '';
                      const qty = series[seriesIndex][dataPointIndex] || (prod ? prod.value : 0);
                      return `
                        <div class="custom-chart-tooltip">
                          <div class="tooltip-header">${prodName}</div>
                          <div class="tooltip-body">
                            <div><strong>จำนวนสินค้า:</strong> ${Math.round(qty).toLocaleString()} ชิ้น</div>
                          </div>
                        </div>
                      `;
                    }
                  }
                }}
                series={top10AnimatedSeries.length > 0 ? top10AnimatedSeries : [{ name: 'จำนวนหน่วย', data: [] }]}
                type="bar"
                height={340}
              />
            </div>
          </div>

          {/* Expiry Duration/Status Donut */}
          <div className="chart-card" style={{ minHeight: '340px' }}>
            <div className="chart-header">
              <div className="chart-title">
                <Package style={{ color: 'var(--success)', width: '20px', height: '20px' }} />
                <span>สัดส่วนมูลค่าสินค้าตามระยะเวลา</span>
              </div>
            </div>
            <div className="chart-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <ApexDonut 
                series={donutData.series}
                labels={donutData.labels}
                colors={['#eab308', '#fb923c', '#ef4444', '#991b1b']}
                totalLabel="มูลค่ารวม"
                totalValueFormatter={() => formatFullBahtCurrency(stats.totalVal)}
                onPointSelected={(idx) => {
                  const categories = ['under_1y', '1_2y', '2_3y', 'over_3y'];
                  const label = categories[idx];
                  handleOpenDrilldown('expiry_duration_group', label, `เจาะลึกสถานะอายุสินค้า: ${donutData.labels[idx]}`);
                }}
              />
            </div>
          </div>
        </div>

        {/* Row 4: สินค้าใกล้หมดอายุอีก 6 เดือนข้างหน้า (Line/Area Chart directly above table) */}
        <div className="charts-row-full">
          <div className="chart-card">
            <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div className="chart-title">
                <Clock style={{ color: '#f59e0b', width: '20px', height: '20px' }} />
                <span>สินค้าใกล้หมดอายุอีก 6 เดือนข้างหน้า</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                มูลค่าใกล้หมดอายุรวม: <span style={{ color: '#f59e0b', fontWeight: 700 }}>{formatFullBahtCurrency(upcomingExpiryChartData.totalUpcomingVal)}</span>
              </div>
            </div>
            <div className="chart-body" style={{ display: 'block', width: '100%', minWidth: 0 }}>
              <Chart 
                key="expiry-upcoming-area-chart"
                width="100%" 
                options={{
                  chart: {
                    type: 'area',
                    height: 300,
                    toolbar: { show: false },
                    animations: {
                      enabled: true,
                      easing: 'easeinout',
                      speed: 800,
                      dynamicAnimation: { enabled: false }
                    },
                    events: {
                      markerClick: (e, chartCtx, config) => {
                        const idx = config.dataPointIndex;
                        const key = upcomingExpiryChartData.sortedKeys[idx];
                        if (key) {
                          handleOpenDrilldown('upcoming_expiry_month', key, `เจาะลึกสินค้าใกล้หมดอายุเดือน: ${upcomingExpiryChartData.categories[idx]}`);
                        }
                      },
                      dataPointSelection: (e, chartCtx, config) => {
                        const idx = config.dataPointIndex;
                        if (idx !== undefined && upcomingExpiryChartData.sortedKeys[idx]) {
                          const key = upcomingExpiryChartData.sortedKeys[idx];
                          handleOpenDrilldown('upcoming_expiry_month', key, `เจาะลึกสินค้าใกล้หมดอายุเดือน: ${upcomingExpiryChartData.categories[idx]}`);
                        }
                      }
                    }
                  },
                  stroke: { curve: 'smooth', width: 2.5 },
                  markers: { size: 4, hover: { size: 6 } },
                  colors: ['#f59e0b'],
                  dataLabels: { enabled: false },
                  fill: {
                    type: 'gradient',
                    gradient: {
                      shadeIntensity: 1,
                      opacityFrom: 0.40,
                      opacityTo: 0.05,
                      stops: [0, 100]
                    }
                  },
                  xaxis: {
                    categories: upcomingExpiryChartData.categories,
                    labels: { style: { colors: 'var(--secondary)', fontWeight: 600 } }
                  },
                  yaxis: {
                    labels: {
                      formatter: (val) => formatBahtCurrency(val),
                      style: { colors: 'var(--secondary)' }
                    }
                  },
                  grid: { borderColor: 'var(--border)', strokeDashArray: 4 },
                  tooltip: {
                    custom: function({series, seriesIndex, dataPointIndex, _w}) {
                      const monthLabel = upcomingExpiryChartData.categories[dataPointIndex];
                      const val = series[seriesIndex][dataPointIndex];
                      return `
                        <div class="custom-chart-tooltip">
                          <div class="tooltip-header">เดือน ${monthLabel}</div>
                          <div class="tooltip-body">
                            <div><strong>มูลค่าใกล้หมดอายุ:</strong> ${Math.round(val).toLocaleString()} บาท</div>
                          </div>
                        </div>
                      `;
                    }
                  }
                }}
                series={upcomingAnimatedSeries.length > 0 ? upcomingAnimatedSeries : [{ name: 'มูลค่าใกล้หมดอายุ', data: [] }]}
                type="area"
                height={300}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Data Table Card - รายการสินค้าทั้งหมด พร้อมแท็บสีเทาเรียบหรู */}
      <section className="table-card">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Header Title + Tab Filter Pills (สีเทาปกติ เรียบหรู) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h2 className="table-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={20} style={{ color: 'var(--secondary, #475569)' }} />
              <span>รายการสินค้าทั้งหมด</span>
            </h2>

            {/* Tab Pills (Neutral Grey Tabs) */}
            <div style={{ 
              display: 'inline-flex', 
              background: 'var(--bg-muted, #f1f5f9)', 
              padding: '4px', 
              borderRadius: '8px', 
              gap: '4px',
              border: '1px solid var(--border)'
            }}>
              <button 
                type="button"
                onClick={() => setTableTab('expired')}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: tableTab === 'expired' ? '#475569' : 'transparent',
                  color: tableTab === 'expired' ? '#ffffff' : '#64748b',
                  boxShadow: tableTab === 'expired' ? '0 1px 2px rgba(0, 0, 0, 0.15)' : 'none'
                }}
              >
                หมดอายุแล้ว ({expiredDatasetOnly.length.toLocaleString()})
              </button>

              <button 
                type="button"
                onClick={() => setTableTab('upcoming')}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: tableTab === 'upcoming' ? '#475569' : 'transparent',
                  color: tableTab === 'upcoming' ? '#ffffff' : '#64748b',
                  boxShadow: tableTab === 'upcoming' ? '0 1px 2px rgba(0, 0, 0, 0.15)' : 'none'
                }}
              >
                ใกล้หมดอายุ ({upcomingDatasetOnly.length.toLocaleString()})
              </button>

              <button 
                type="button"
                onClick={() => setTableTab('all')}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: tableTab === 'all' ? '#475569' : 'transparent',
                  color: tableTab === 'all' ? '#ffffff' : '#64748b',
                  boxShadow: tableTab === 'all' ? '0 1px 2px rgba(0, 0, 0, 0.15)' : 'none'
                }}
              >
                ทั้งหมด ({filteredExpiryDataset.length.toLocaleString()})
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="table-actions">
            <SearchBar 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, คลัง, LOT..."
            />
          </div>
        </div>

        <ResponsiveTable 
          headers={currentTableHeaders}
          rows={searchedTableRows}
          itemsPerPage={10}
          tabViewClass="expiry-view"
        />
      </section>

      {/* Drilldown Modal popup (Multi-level 2-step navigation stack) */}
      <DrilldownModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalHistory([]);
        }}
        onBack={modalHistory.length > 1 ? handleModalBack : null}
        onRowClick={activeDrilldown?.onRowClick}
        title={activeDrilldown?.title || 'เจาะลึกสินค้าหมดอายุ'}
        summaryItems={activeDrilldown?.summaryItems || []}
        headers={activeDrilldown?.headers || lotDetailHeaders}
        rows={activeDrilldown?.rows || []}
        filename={`${(activeDrilldown?.title || 'drilldown_expiry').replace(/\s+/g, '_')}.xlsx`}
      />
    </div>
  );
}
