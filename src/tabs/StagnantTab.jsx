import React, { useState, useMemo, useEffect } from 'react';
import Chart from 'react-apexcharts';
import KpiCard from '../components/KpiCard';
import ResponsiveTable from '../components/ResponsiveTable';
import ApexDonut from '../components/ApexDonut';
import DrilldownModal from '../components/DrilldownModal';
import SearchBar from '../components/SearchBar';
import { Package, List, DollarSign, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  formatDateToDDMMYY, 
  isValidISODate, 
  getStagnantYears 
} from '../utils/helpers';

export default function StagnantTab({ rawDataset = [], selectedWarehouses = [], selectedProducts = [], selectedYear = 'All', resetKey }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseChartPage, setWarehouseChartPage] = useState(1);
  const [top10AnimatedSeries, setTop10AnimatedSeries] = useState([]);
  const [warehouseAnimatedSeries, setWarehouseAnimatedSeries] = useState([]);

  // Reset local search when filter reset is triggered
  useEffect(() => {
    setSearchTerm('');
  }, [resetKey]);
  
  const chartPageSize = 11;

  // 1. Filter Stagnant Dataset based on selection criteria (Active Stagnant Stock Only)
  const filteredDataset = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return rawDataset.filter(row => {
      // Exclude expired items (already handled exclusively by Expired Stock Tab)
      const expDate = row.วันหมดอายุ || row.expire_date;
      if (expDate && isValidISODate(expDate) && expDate <= todayStr) {
        return false;
      }

      // Warehouse Filter
      if (selectedWarehouses.length > 0 && !selectedWarehouses.includes(row.คลัง)) return false;

      // Product Filter
      if (selectedProducts.length > 0 && !selectedProducts.includes(row.รหัสสินค้า)) return false;

      // Year Filter (based on Transfer Date)
      if (selectedYear !== 'All') {
        const dateStr = row.วันโอน || row.วันที่เคลื่อนไหวล่าสุด || row.วันที่เคลื่อนไหวล่าสุ;
        if (!isValidISODate(dateStr)) return false;
        const year = dateStr.split('-')[0];
        if (year !== selectedYear) return false;
      }
      return true;
    });
  }, [rawDataset, selectedWarehouses, selectedProducts, selectedYear]);

  // 2. Local Table filter based on Search input
  const searchedTableRows = useMemo(() => {
    if (!searchTerm.trim()) return filteredDataset;
    const term = searchTerm.toLowerCase().trim();
    return filteredDataset.filter(row => {
      return (
        (row.รหัสสินค้า && row.รหัสสินค้า.toLowerCase().includes(term)) ||
        (row.ชื่อสามัญ && row.ชื่อสามัญ.toLowerCase().includes(term)) ||
        (row.คลัง && row.คลัง.toLowerCase().includes(term)) ||
        (row.lot_number_id && row.lot_number_id.toLowerCase().includes(term))
      );
    });
  }, [filteredDataset, searchTerm]);

  // 3. Compute KPI Statistics matching original exactly
  const stats = useMemo(() => {
    const totalVal = filteredDataset.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
    const totalQty = filteredDataset.reduce((sum, r) => sum + (r.จำนวน || 0), 0);
    const totalLots = filteredDataset.length;
    const totalWh = new Set(filteredDataset.map(r => r.คลัง)).size;

    return {
      totalVal,
      totalQty,
      totalLots,
      totalWh
    };
  }, [filteredDataset]);

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

  // 4. Stagnant Risk Distribution (Donut Chart - Dynamic by Stagnant Years)
  const donutData = useMemo(() => {
    const yearMap = new Map();

    filteredDataset.forEach(row => {
      const years = getStagnantYears(row.ระยะเวลารวม);
      const val = row.มูลค่ารวม || 0;
      yearMap.set(years, (yearMap.get(years) || 0) + val);
    });

    // Sort distinct years ascending (e.g. 1, 2, 3, 4, 5...)
    const sortedYears = Array.from(yearMap.keys())
      .filter(y => (yearMap.get(y) || 0) > 0)
      .sort((a, b) => a - b);

    const series = sortedYears.map(y => Math.round(yearMap.get(y)));
    const labels = sortedYears.map(y => `ค้าง ${y} ปี`);

    // Progressive color palette from amber/orange to deep crimson
    const colorPalette = ['#f59e0b', '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#581c87', '#3b0764'];
    const colors = sortedYears.map((y, idx) => colorPalette[Math.min(Math.max(0, y - 1), colorPalette.length - 1)] || colorPalette[idx % colorPalette.length]);

    return {
      series,
      labels,
      years: sortedYears,
      colors
    };
  }, [filteredDataset]);

  // 5. Stagnant Warehouse paginated Bar Chart data
  const warehouseChartData = useMemo(() => {
    const whMap = {};
    filteredDataset.forEach(row => {
      const wh = row.คลัง;
      if (!whMap[wh]) whMap[wh] = 0;
      whMap[wh] += (row.มูลค่ารวม || 0);
    });

    const warehousesList = Object.keys(whMap)
      .map(name => ({ name, value: Math.round(whMap[name]) }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const totalPages = Math.max(1, Math.ceil(warehousesList.length / chartPageSize));
    const activePage = warehouseChartPage > totalPages ? totalPages : warehouseChartPage;

    const startIdx = (activePage - 1) * chartPageSize;
    const pageData = warehousesList.slice(startIdx, startIdx + chartPageSize);

    return {
      categories: pageData.map(d => (d.name && d.name.length > 25 ? d.name.substring(0, 25) + '...' : d.name)),
      fullCategories: pageData.map(d => d.name),
      values: pageData.map(d => d.value),
      totalPages,
      activePage,
      totalCount: warehousesList.length,
      fullList: warehousesList
    };
  }, [filteredDataset, warehouseChartPage]);

  // 6. Top 10 Stagnant Items by Value (Bar Chart)
  const top10ChartData = useMemo(() => {
    const prodMap = {};
    filteredDataset.forEach(row => {
      const code = row.รหัสสินค้า || 'Unknown';
      const name = row.ชื่อสามัญ || 'Unknown';
      const key = `${code}::${name}`;
      const val = row.มูลค่ารวม || 0;
      const qty = row.จำนวน || 0;

      if (!prodMap[key]) {
        prodMap[key] = {
          code,
          name,
          value: 0,
          qty: 0,
          lotCount: 0
        };
      }

      prodMap[key].value += val;
      prodMap[key].qty += qty;
      prodMap[key].lotCount += 1;
    });

    const sortedList = Object.values(prodMap)
      .map(item => ({ ...item, value: Math.round(item.value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      categories: sortedList.map(d => (d.name && d.name.length > 28 ? d.name.substring(0, 28) + '...' : d.name)),
      fullCategories: sortedList.map(d => d.name),
      values: sortedList.map(d => d.value),
      fullList: sortedList
    };
  }, [filteredDataset]);

  // Trigger dynamic entrance animation for Top 10 chart
  useEffect(() => {
    setTop10AnimatedSeries([]);
    const timer = setTimeout(() => {
      if (top10ChartData.values && top10ChartData.values.length > 0) {
        setTop10AnimatedSeries([{
          name: 'มูลค่ารวม',
          data: top10ChartData.values
        }]);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [top10ChartData]);

  // Trigger dynamic entrance animation for Warehouse chart
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

  // Drilldown Modal state & Navigation History Stack (Level 1 -> Level 2)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalHistory, setModalHistory] = useState([]); // Array of { title, rows, headers, summaryItems, onRowClick, type }

  const activeDrilldown = modalHistory[modalHistory.length - 1] || null;

  // Headers สำหรับตารางเจาะลึกระดับล็อต (ชั้น 2 และตารางหลัก)
  const lotDetailHeaders = useMemo(() => [
    { 
      key: 'รหัสสินค้า', 
      label: 'รหัสสินค้า', 
      style: { width: '135px', minWidth: '110px' },
      cellRender: (row, val) => <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{val || '-'}</span>
    },
    { 
      key: 'ชื่อสามัญ', 
      label: 'ชื่อสินค้า', 
      style: { whiteSpace: 'normal', width: '240px', minWidth: '180px', lineHeight: 1.35 } 
    },
    { 
      key: 'คลัง', 
      label: 'คลังสินค้า', 
      style: { width: '135px', minWidth: '110px' } 
    },
    { 
      key: 'lot_number_id', 
      label: 'LOT ID', 
      style: { width: '135px', minWidth: '110px' },
      cellRender: (row, val) => <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{val || '-'}</span>
    },
    { 
      key: 'จำนวน', 
      label: 'จำนวน', 
      align: 'right', 
      style: { width: '70px', minWidth: '60px' }, 
      cellRender: (row, val) => val !== undefined && val !== null ? val.toLocaleString() : '0' 
    },
    { 
      key: 'มูลค่ารวม', 
      label: 'มูลค่ารวม', 
      align: 'right', 
      style: { width: '95px', minWidth: '80px' }, 
      cellRender: (row, val) => formatFullBahtCurrency(val) 
    },
    { 
      key: 'วันที่เคลื่อนไหวล่าสุด', 
      label: 'วันเคลื่อนไหวล่าสุด', 
      style: { width: '95px', minWidth: '85px' }, 
      cellRender: (row, val) => formatDateToDDMMYY(val || row.วันที่เคลื่อนไหวล่าสุ || row.วันโอน) 
    },
    { 
      key: 'ระยะเวลารวม', 
      label: 'ระยะเวลาไม่เคลื่อนไหว', 
      style: { width: '115px', minWidth: '100px' }, 
      cellRender: (row, val) => <strong style={{ fontWeight: 600, fontSize: '0.78rem' }}>{val}</strong> 
    },
    { 
      key: 'วันหมดอายุ', 
      label: 'วันหมดอายุ / สถานะ', 
      style: { width: '185px', minWidth: '170px' }, 
      cellRender: (row) => {
        const expDate = row.วันหมดอายุ || row.expire_date;
        if (!expDate || typeof expDate !== 'string' || expDate.trim() === '') {
          const statusText = row.สถานะวันหมดอายุ || row.expiry_status || '';
          const isEquipment = statusText.includes('อุปกรณ์') || statusText.includes('ครุภัณฑ์');

          if (isEquipment) {
            return (
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontSize: '0.73rem', 
                fontWeight: 600, 
                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                color: '#2563eb',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                whiteSpace: 'nowrap'
              }}>
                🔵 ครุภัณฑ์ไม่มีวันหมดอายุ
              </span>
            );
          }

          return (
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              padding: '2px 6px', 
              borderRadius: '4px', 
              fontSize: '0.73rem', 
              fontWeight: 600, 
              backgroundColor: 'rgba(148, 163, 184, 0.12)', 
              color: '#64748b',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              whiteSpace: 'nowrap'
            }}>
              ⚪ ไม่ระบุวันหมดอายุ
            </span>
          );
        }
        
        const formattedDate = formatDateToDDMMYY(expDate);
        
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            padding: '2px 6px', 
            borderRadius: '4px', 
            fontSize: '0.73rem', 
            fontWeight: 600, 
            backgroundColor: 'rgba(16, 185, 129, 0.1)', 
            color: '#059669',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            whiteSpace: 'nowrap',
            width: 'fit-content'
          }}>
            🟢 ยังไม่หมดอายุ ({formattedDate})
          </span>
        );
      } 
    }
  ], []);

  // Helper: คำนวณจำนวนวันไม่เคลื่อนไหวของแต่ละล็อต
  const getDaysStagnant = (r) => {
    const dateStr = r.วันที่เคลื่อนไหวล่าสุด || r.วันที่เคลื่อนไหวล่าสุ || r.วันโอน;
    if (dateStr && isValidISODate(dateStr)) {
      const moveDate = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffMs = today - moveDate;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    }
    if (r.ระยะเวลารวม && typeof r.ระยะเวลารวม === 'string') {
      let days = 0;
      const yrMatch = r.ระยะเวลารวม.match(/(\d+)\s*(year|yr|ปี)/i);
      const monMatch = r.ระยะเวลารวม.match(/(\d+)\s*(mon|month|เดือน)/i);
      const dayMatch = r.ระยะเวลารวม.match(/(\d+)\s*(day|วัน)/i);
      if (yrMatch) days += parseInt(yrMatch[1], 10) * 365.25;
      if (monMatch) days += parseInt(monMatch[1], 10) * 30.4375;
      if (dayMatch) days += parseInt(dayMatch[1], 10);
      return days;
    }
    return 365;
  };

  // Helper: จัดรูปแบบค่าเฉลี่ยระยะเวลาภาษาไทยให้อ่านง่าย
  const formatAverageStagnantDuration = (totalDays, lotCount) => {
    if (!lotCount || lotCount <= 0 || !totalDays || isNaN(totalDays)) return '-';
    const avgDays = Math.round(totalDays / lotCount);
    if (avgDays <= 0) return '-';

    const yrs = Math.floor(avgDays / 365.25);
    const remainingDaysAfterYrs = avgDays % 365.25;
    const mons = Math.floor(remainingDaysAfterYrs / 30.4375);
    const days = Math.floor(remainingDaysAfterYrs % 30.4375);

    const parts = [];
    if (yrs > 0) parts.push(`${yrs} ปี`);
    if (mons > 0) parts.push(`${mons} เดือน`);
    if (days > 0 && yrs === 0) parts.push(`${days} วัน`);

    return parts.length > 0 ? parts.join(' ') : `${avgDays} วัน`;
  };

  // Headers สำหรับตารางสรุปรายชื่อสินค้า (ชั้น 1: การ์ดมูลค่าสินค้า และ จำนวนสินค้า)
  const productSummaryHeaders = useMemo(() => [
    { key: 'รหัสสินค้า', label: 'รหัสสินค้า', style: { width: '135px', minWidth: '110px' }, cellRender: (row, val) => <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{val || '-'}</span> },
    { key: 'ชื่อสามัญ', label: 'ชื่อสินค้า', style: { whiteSpace: 'normal', width: '260px', minWidth: '180px', lineHeight: 1.35 } },
    { key: 'จำนวนล็อต', label: 'จำนวนล็อต', align: 'right', style: { width: '95px', minWidth: '80px' }, cellRender: (row, val) => <span style={{ fontWeight: 600, color: 'var(--accent, #6366f1)' }}>{val || 1} ล็อต</span> },
    { key: 'จำนวน', label: 'จำนวนรวม (ชิ้น)', align: 'right', style: { width: '110px', minWidth: '90px' }, cellRender: (row, val) => val !== undefined && val !== null ? val.toLocaleString() : '0' },
    { key: 'มูลค่ารวม', label: 'มูลค่ารวม (บาท)', align: 'right', style: { width: '125px', minWidth: '100px' }, cellRender: (row, val) => formatFullBahtCurrency(val) },
    { key: 'ค่าเฉลี่ยระยะเวลา', label: 'ค่าเฉลี่ยระยะเวลาไม่เคลื่อนไหว', style: { width: '170px', minWidth: '140px' }, cellRender: (row, val) => <strong style={{ fontWeight: 600, color: '#dc2626', fontSize: '0.8rem' }}>{val || '-'}</strong> }
  ], []);

  // Headers สำหรับตารางสรุปรายคลัง (ชั้น 1: การ์ดจำนวนคลังสินค้า)
  const warehouseSummaryHeaders = useMemo(() => [
    { key: 'คลัง', label: 'คลังสินค้า', style: { width: '210px', minWidth: '150px' } },
    { key: 'จำนวนรายการ', label: 'จำนวนรายการ (ล็อต)', align: 'right', style: { width: '130px', minWidth: '100px' }, cellRender: (row, val) => <span style={{ fontWeight: 600, color: 'var(--accent, #6366f1)' }}>{val !== undefined && val !== null ? val.toLocaleString() : '0'} ล็อต</span> },
    { key: 'จำนวน', label: 'จำนวนสินค้ารวม (ชิ้น)', align: 'right', style: { width: '130px', minWidth: '100px' }, cellRender: (row, val) => val !== undefined && val !== null ? val.toLocaleString() : '0' },
    { key: 'มูลค่ารวม', label: 'มูลค่าค้างคลังรวม', align: 'right', style: { width: '135px', minWidth: '100px' }, cellRender: (row, val) => formatFullBahtCurrency(val) },
    { key: 'ค่าเฉลี่ยระยะเวลา', label: 'ค่าเฉลี่ยระยะเวลาไม่เคลื่อนไหว', style: { width: '170px', minWidth: '140px' }, cellRender: (row, val) => <strong style={{ fontWeight: 600, color: '#dc2626', fontSize: '0.8rem' }}>{val || '-'}</strong> }
  ], []);

  // ฟังก์ชันเจาะลึกชั้น 2: แสดงรายละเอียดทุกล็อตของสินค้าที่เลือก
  const handleDrilldownProductLots = (productRow) => {
    const itemCode = productRow.รหัสสินค้า;
    const itemName = productRow.ชื่อสามัญ;
    const lotRows = filteredDataset.filter(r => {
      if (itemCode && itemCode !== '-') return r.รหัสสินค้า === itemCode;
      return r.ชื่อสามัญ === itemName;
    }).sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));

    const totalVal = lotRows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
    const totalQty = lotRows.reduce((sum, r) => sum + (r.จำนวน || 0), 0);

    const level2State = {
      level: 2,
      type: 'product_lots',
      title: `📦 เจาะลึกทุกล็อต: ${itemName} (${itemCode})`,
      rows: lotRows,
      headers: lotDetailHeaders,
      summaryItems: [
        { label: 'จำนวนล็อตย่อย', value: `${lotRows.length.toLocaleString()} ล็อต`, color: 'var(--primary)' },
        { label: 'จำนวนสินค้ารวม', value: `${totalQty.toLocaleString()} ชิ้น`, color: 'var(--success)' },
        { label: 'มูลค่าสินค้ารวม', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' }
      ]
    };

    setModalHistory(prev => [...prev, level2State]);
  };

  // ฟังก์ชันเจาะลึกชั้น 2: แสดงรายละเอียดทุกล็อตในคลังที่เลือก
  const handleDrilldownWarehouseLots = (warehouseRow) => {
    const whName = warehouseRow.คลัง;
    const lotRows = filteredDataset.filter(r => r.คลัง === whName)
      .sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));

    const totalVal = lotRows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
    const totalQty = lotRows.reduce((sum, r) => sum + (r.จำนวน || 0), 0);

    const level2State = {
      level: 2,
      type: 'warehouse_lots',
      title: `🏥 เจาะลึกทุกล็อตสินค้าในคลัง: ${whName}`,
      rows: lotRows,
      headers: lotDetailHeaders,
      summaryItems: [
        { label: 'คลังสินค้า', value: whName, color: 'var(--primary)' },
        { label: 'จำนวนรายการล็อต', value: `${lotRows.length.toLocaleString()} ล็อต`, color: 'var(--warning)' },
        { label: 'จำนวนสินค้ารวม', value: `${totalQty.toLocaleString()} ชิ้น`, color: 'var(--success)' },
        { label: 'มูลค่ารวมในคลัง', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' }
      ]
    };

    setModalHistory(prev => [...prev, level2State]);
  };

  // Drilldown Opening Handlers (เปิดชั้น 1)
  const handleOpenDrilldown = (type, key, titleStr) => {
    let rows = [];
    let headers = lotDetailHeaders;
    let summaryItems = [];
    let onRowClickHandler = null;

    if (type === 'all_value' || type === 'all_qty') {
      // รวมกลุ่มยอดตามชื่อสินค้า (ชั้น 1)
      const prodMap = new Map();
      filteredDataset.forEach(r => {
        const id = r.รหัสสินค้า || '-';
        const name = r.ชื่อสามัญ || 'Unknown';
        const pKey = `${id}___${name}`;
        const days = getDaysStagnant(r);
        if (!prodMap.has(pKey)) {
          prodMap.set(pKey, {
            "รหัสสินค้า": id,
            "ชื่อสามัญ": name,
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

      // คำนวณค่าเฉลี่ยระยะเวลาไม่เคลื่อนไหว
      prodMap.forEach(entry => {
        entry.ค่าเฉลี่ยระยะเวลา = formatAverageStagnantDuration(entry.totalDays, entry.จำนวนล็อต);
      });

      if (type === 'all_value') {
        rows = Array.from(prodMap.values()).sort((a, b) => b.มูลค่ารวม - a.มูลค่ารวม);
        summaryItems = [
          { label: 'มูลค่าสินค้าค้างคลังรวม', value: formatFullBahtCurrency(stats.totalVal), color: 'var(--primary)' },
          { label: 'จำนวนรายการสินค้า', value: `${rows.length.toLocaleString()} รายการ (คลิกที่แถวเพื่อดูทุกล็อตย่อย)`, color: 'var(--text-muted)' }
        ];
      } else {
        rows = Array.from(prodMap.values()).sort((a, b) => b.จำนวน - a.จำนวน);
        summaryItems = [
          { label: 'จำนวนหน่วยสินค้าค้างคลังรวม', value: `${stats.totalQty.toLocaleString()} ชิ้น`, color: 'var(--success)' },
          { label: 'จำนวนรายการสินค้า', value: `${rows.length.toLocaleString()} รายการ (คลิกที่แถวเพื่อดูทุกล็อตย่อย)`, color: 'var(--text-muted)' }
        ];
      }
      headers = productSummaryHeaders;
      onRowClickHandler = handleDrilldownProductLots;

    } else if (type === 'all_lots') {
      rows = filteredDataset.slice().sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));
      summaryItems = [
        { label: 'จำนวนล็อตสินค้าค้างคลังทั้งหมด', value: `${stats.totalLots.toLocaleString()} ล็อต`, color: 'var(--warning)' },
        { label: 'มูลค่ารวมทั้งหมด', value: formatFullBahtCurrency(stats.totalVal), color: 'var(--primary)' }
      ];
      headers = lotDetailHeaders;

    } else if (type === 'all_warehouses') {
      // รวมกลุ่มเฉพาะคลังที่มีสินค้าค้างคลังเท่านั้น (ชั้น 1)
      const whMap = new Map();
      filteredDataset.forEach(r => {
        const wh = r.คลัง || '-';
        const days = getDaysStagnant(r);
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

      // คำนวณค่าเฉลี่ยระยะเวลาไม่เคลื่อนไหวสำหรับแต่ละคลัง
      whMap.forEach(entry => {
        entry.ค่าเฉลี่ยระยะเวลา = formatAverageStagnantDuration(entry.totalDays, entry.จำนวนรายการ);
      });

      rows = Array.from(whMap.values())
        .filter(w => w.มูลค่ารวม > 0 || w.จำนวน > 0)
        .sort((a, b) => b.มูลค่ารวม - a.มูลค่ารวม);

      summaryItems = [
        { label: 'จำนวนคลังสินค้าที่มีของค้าง', value: `${rows.length.toLocaleString()} คลัง (คลิกที่แถวเพื่อดูทุกล็อตในคลัง)`, color: 'var(--primary)' },
        { label: 'มูลค่าค้างคลังรวม', value: formatFullBahtCurrency(stats.totalVal), color: 'var(--accent)' }
      ];
      headers = warehouseSummaryHeaders;
      onRowClickHandler = handleDrilldownWarehouseLots;

    } else if (type === 'warehouse') {
      rows = filteredDataset.filter(r => r.คลัง === key).sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));
      const totalVal = rows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
      const totalQty = rows.reduce((sum, r) => sum + (r.จำนวน || 0), 0);
      summaryItems = [
        { label: 'คลังสินค้า', value: key, color: 'var(--primary)' },
        { label: 'จำนวนล็อต', value: `${rows.length.toLocaleString()} ล็อต`, color: 'var(--warning)' },
        { label: 'จำนวนสินค้ารวม', value: `${totalQty.toLocaleString()} ชิ้น`, color: 'var(--success)' },
        { label: 'มูลค่ารวม', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' }
      ];
      headers = lotDetailHeaders;

    } else if (type === 'year') {
      rows = filteredDataset.filter(r => {
        const dateStr = r.วันโอน || r.วันที่เคลื่อนไหวล่าสุด || r.วันที่เคลื่อนไหวล่าสุ;
        return dateStr && dateStr.startsWith(key.toString());
      }).sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));
      const totalVal = rows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
      summaryItems = [
        { label: 'ปีที่ทำรายการ', value: key, color: 'var(--primary)' },
        { label: 'จำนวนล็อต', value: `${rows.length.toLocaleString()} ล็อต`, color: 'var(--warning)' },
        { label: 'มูลค่ารวม', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' }
      ];
      headers = lotDetailHeaders;

    } else if (type === 'risk') {
      const targetYear = parseInt(key, 10);
      rows = filteredDataset.filter(r => {
        const years = getStagnantYears(r.ระยะเวลารวม);
        return !isNaN(targetYear) ? years === targetYear : true;
      }).sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));
      const totalVal = rows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
      const label = !isNaN(targetYear) ? `ค้าง ${targetYear} ปี` : key;
      summaryItems = [
        { label: 'กลุ่มความเสี่ยง', value: label, color: 'var(--primary)' },
        { label: 'จำนวนล็อต', value: `${rows.length.toLocaleString()} ล็อต`, color: 'var(--warning)' },
        { label: 'มูลค่ารวม', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' }
      ];
      headers = lotDetailHeaders;

    } else if (type === 'product_name') {
      rows = filteredDataset.filter(r => r.ชื่อสามัญ === key).sort((a, b) => (b.มูลค่ารวม || 0) - (a.มูลค่ารวม || 0));
      const totalVal = rows.reduce((sum, r) => sum + (r.มูลค่ารวม || 0), 0);
      const totalQty = rows.reduce((sum, r) => sum + (r.จำนวน || 0), 0);
      summaryItems = [
        { label: 'ชื่อสินค้า', value: key, color: 'var(--primary)' },
        { label: 'จำนวนล็อต', value: `${rows.length.toLocaleString()} ล็อต`, color: 'var(--warning)' },
        { label: 'จำนวนสินค้ารวม', value: `${totalQty.toLocaleString()} ชิ้น`, color: 'var(--success)' },
        { label: 'มูลค่ารวม', value: formatFullBahtCurrency(totalVal), color: 'var(--accent)' }
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

  // ฟังก์ชันย้อนกลับจากชั้น 2 -> ชั้น 1
  const handleModalBack = () => {
    if (modalHistory.length > 1) {
      setModalHistory(prev => prev.slice(0, prev.length - 1));
    }
  };

  return (
    <div className="tab-container">
      {/* KPI Cards Row */}
      <section className="kpi-row" style={{ marginBottom: '24px' }}>
        <KpiCard 
          title="มูลค่าสินค้าไม่เคลื่อนไหว"
          value={`${stats.totalVal.toLocaleString()} <span style="font-size: 0.9rem; font-weight: 500; margin-left: 4px; color: var(--text-muted);">บาท</span>`}
          icon={DollarSign}
          accentClass="info"
          subtext="สินค้าไม่เคลื่อนไหว >1 ปี ที่ยังไม่หมดอายุ / อุปกรณ์ลอย"
          onClick={() => handleOpenDrilldown('all_value', null, 'เจาะลึกมูลค่าสินค้าค้างคลังตามรายการสินค้า')}
        />
        <KpiCard 
          title="จำนวนสินค้าคงเหลือ"
          value={`${stats.totalQty.toLocaleString()} <span style="font-size: 0.9rem; font-weight: 500; margin-left: 4px; color: var(--text-muted);">ชิ้น</span>`}
          icon={Package}
          accentClass="success"
          subtext="จำนวนรวมชิ้นสินค้าค้างคลังที่ยังไม่หมดอายุ"
          onClick={() => handleOpenDrilldown('all_qty', null, 'เจาะลึกจำนวนสินค้าค้างคลังตามรายการสินค้า')}
        />
        <KpiCard 
          title="จำนวนล็อตสินค้า"
          value={`${stats.totalLots.toLocaleString()} <span style="font-size: 0.9rem; font-weight: 500; margin-left: 4px; color: var(--text-muted);">รายการ</span>`}
          icon={List}
          accentClass="warning"
          subtext="จำนวนรวมล็อตสินค้าไม่เคลื่อนไหวเกิน 1 ปี (ไม่รวมที่หมดอายุแล้ว)"
          onClick={() => handleOpenDrilldown('all_lots', null, 'เจาะลึกทุกล็อตสินค้าค้างคลัง')}
        />
        <KpiCard 
          title="จำนวนคลังสินค้า"
          value={`${stats.totalWh.toLocaleString()} <span style="font-size: 0.9rem; font-weight: 500; margin-left: 4px; color: var(--text-muted);">คลัง</span>`}
          icon={Home}
          accentClass="purple"
          subtext="คลังที่มีสินค้าค้างเกิน 1 ปี (ยังไม่หมดอายุ)"
          onClick={() => handleOpenDrilldown('all_warehouses', null, 'เจาะลึกคลังสินค้าที่มีสินค้าค้างคลัง')}
        />
      </section>

      {/* Charts Layout Section matching original CSS rows */}
      <section className="charts-layout-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
        
        {/* Row 1: Top 10 Items by Value */}
        <div className="charts-row-full" id="stagnant-top10-chart-row">
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">
                <Package style={{ color: 'var(--primary)', width: '20px', height: '20px' }} />
                <span>
                  {top10ChartData.categories.length > 0 ? `${Math.min(10, top10ChartData.categories.length)} อันดับสินค้าที่มีมูลค่าค้างคลังสูงสุด` : 'อันดับสินค้าที่มีมูลค่าค้างคลังสูงสุด'}
                </span>
              </div>
            </div>
            <div className="chart-body" style={{ display: 'block', width: '100%', minWidth: 0 }}>
              {top10ChartData.categories.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '220px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  ไม่มีข้อมูลสินค้าค้างคลังตามเงื่อนไขที่เลือก
                </div>
              ) : (
                <Chart 
                  key={`top10-stagnant-chart-${top10ChartData.categories.length}-${warehouseChartPage}`}
                  width="100%" 
                  options={{
                    chart: {
                      type: 'bar',
                      toolbar: { show: false },
                      animations: {
                        enabled: true,
                        easing: 'easeinout',
                        speed: 1200,
                        animateGradually: { 
                          enabled: true, 
                          delay: 200 
                        },
                        dynamicAnimation: { 
                          enabled: true, 
                          speed: 1000 
                        }
                      },
                      events: {
                        dataPointSelection: (e, chartCtx, config) => {
                          const idx = config.dataPointIndex;
                          if (idx !== undefined && top10ChartData.fullList[idx]) {
                            const item = top10ChartData.fullList[idx];
                            handleOpenDrilldown('product_name', item.name, `เจาะลึกสินค้าค้างคลัง: ${item.name}`);
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
                    dataLabels: {
                      enabled: true,
                      textAnchor: 'start',
                      style: {
                        colors: ['#374151'],
                        fontWeight: 700,
                        fontSize: '11px'
                      },
                      formatter: (val) => formatBahtCurrency(val),
                      offsetX: 10
                    },
                    xaxis: {
                      categories: top10ChartData.categories,
                      labels: {
                        formatter: (val) => formatBahtCurrency(val),
                        style: { colors: 'var(--secondary)' }
                      }
                    },
                    yaxis: {
                      labels: {
                        maxWidth: 320,
                        style: { colors: '#0f172a', fontWeight: 600, fontSize: '12px' }
                      }
                    },
                    legend: { show: false },
                    grid: { borderColor: 'var(--border)', strokeDashArray: 4, padding: { right: 65, left: 10 } },
                    tooltip: {
                      custom: function({_series, _seriesIndex, dataPointIndex, _w}) {
                        const prod = top10ChartData.fullList[dataPointIndex];
                        if (!prod) return '';
                        return `
                          <div class="custom-chart-tooltip">
                            <div class="tooltip-header">${prod.name}</div>
                            <div class="tooltip-body">
                              <div><strong>รหัสสินค้า:</strong> ${prod.code}</div>
                              <div><strong>มูลค่ารวม:</strong> ${Math.round(prod.value).toLocaleString()} บาท</div>
                              <div><strong>จำนวนรวม:</strong> ${prod.qty.toLocaleString()} หน่วย</div>
                              <div><strong>จำนวนล็อต:</strong> ${prod.lotCount} ล็อต</div>
                            </div>
                          </div>
                        `;
                      }
                    }
                  }}
                  series={top10AnimatedSeries.length > 0 ? top10AnimatedSeries : [{ name: 'มูลค่ารวม', data: [] }]}
                  type="bar"
                  height={Math.max(260, Math.min(480, top10ChartData.categories.length * 28 + 60))}
                />
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Warehouse Bar Chart & Stagnant Risk Donut (Split 50/50) */}
        <div className="charts-row-half">
          {/* Warehouse paginated bar chart */}
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">
                <Home style={{ color: 'var(--accent)', width: '20px', height: '20px' }} />
                <span>
                  {warehouseChartData.totalCount > 0 ? `มูลค่าสินค้าค้างคลังสะสม แยกตามคลังสินค้า (ทั้งหมด ${warehouseChartData.totalCount} คลัง)` : 'มูลค่าสินค้าค้างคลังสะสม แยกตามคลังสินค้า'}
                </span>
              </div>
              
              {/* Paginated bar chart controls */}
              {warehouseChartData.totalPages > 1 && (
                <div className="chart-pagination-controls" id="warehouse-chart-pagination">
                  <button 
                    className="btn-chart-page" 
                    disabled={warehouseChartData.activePage === 1}
                    onClick={() => setWarehouseChartPage(prev => Math.max(1, prev - 1))}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span id="chart-page-indicator">
                    {warehouseChartData.activePage} / {warehouseChartData.totalPages}
                  </span>
                  <button 
                    className="btn-chart-page" 
                    disabled={warehouseChartData.activePage === warehouseChartData.totalPages}
                    onClick={() => setWarehouseChartPage(prev => Math.min(warehouseChartData.totalPages, prev + 1))}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="chart-body" style={{ display: 'block', width: '100%', minWidth: 0 }}>
              {warehouseChartData.categories.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '220px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  ไม่มีข้อมูลคลังสินค้าตามเงื่อนไขที่เลือก
                </div>
              ) : (
                <Chart 
                  key={`wh-chart-${warehouseChartPage}-${warehouseChartData.categories.length}`}
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
                              handleOpenDrilldown('warehouse', name, `เจาะลึกสินค้าคงเหลือในคลัง: ${name}`);
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
                        style: { colors: '#0f172a', fontWeight: 600, fontSize: '12px' }
                      }
                    },
                    legend: { show: false },
                    grid: { borderColor: 'var(--border)', strokeDashArray: 4, padding: { right: 65, left: 10 } },
                    tooltip: {
                      custom: function({_series, _seriesIndex, dataPointIndex, w}) {
                        const whName = warehouseChartData.fullCategories ? warehouseChartData.fullCategories[dataPointIndex] : w.config.xaxis.categories[dataPointIndex];
                        if (!whName) return '';
                        const whItems = filteredDataset.filter(r => r.คลัง === whName);
                        const totalVal = whItems.reduce((sum, r) => sum + r.มูลค่ารวม, 0);
                        const totalQty = whItems.reduce((sum, r) => sum + r.จำนวน, 0);
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
                  height={Math.max(260, Math.min(480, warehouseChartData.categories.length * 28 + 60))}
                />
              )}
            </div>
          </div>

          {/* Stagnant Risk Donut Chart */}
          <div className="chart-card" style={{ minHeight: '380px' }}>
            <div className="chart-header">
              <div className="chart-title">
                <Package style={{ color: 'var(--warning)', width: '20px', height: '20px' }} />
                <span>การแบ่งกลุ่มตามระดับความเสี่ยงของสินค้าค้างคลัง</span>
              </div>
            </div>
            <div className="chart-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              {donutData.series.length === 0 || donutData.series.reduce((a, b) => a + b, 0) === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '220px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  ไม่มีข้อมูลระดับความเสี่ยง
                </div>
              ) : (
                <ApexDonut 
                  series={donutData.series}
                  labels={donutData.labels}
                  colors={donutData.colors}
                  totalLabel="มูลค่ารวม"
                  totalValueFormatter={() => formatFullBahtCurrency(stats.totalVal)}
                  onPointSelected={(idx) => {
                    if (donutData.years && donutData.years[idx] !== undefined) {
                      const yr = donutData.years[idx];
                      handleOpenDrilldown('risk', String(yr), `เจาะลึกสินค้าค้าง ${donutData.labels[idx]}`);
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>

      </section>

      {/* Data Table Card */}
      <section className="table-card">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h2 className="table-title">รายการสินค้าไม่เคลื่อนไหวเกิน 1 ปี (เฉพาะสินค้ายังไม่หมดอายุ / อุปกรณ์ลอย)</h2>
          <div className="table-actions">
            <SearchBar 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, คลัง, LOT..."
            />
          </div>
        </div>

        <ResponsiveTable 
          headers={lotDetailHeaders}
          rows={searchedTableRows}
          itemsPerPage={10}
          tabViewClass="stagnant-view"
        />
      </section>

      {/* Drilldown Modal popup (รองรับ 2 ชั้น Level 1 -> Level 2) */}
      <DrilldownModal 
        isOpen={isModalOpen && !!activeDrilldown}
        onClose={() => {
          setIsModalOpen(false);
          setModalHistory([]);
        }}
        title={activeDrilldown?.title || ''}
        summaryItems={activeDrilldown?.summaryItems || []}
        headers={activeDrilldown?.headers || lotDetailHeaders}
        rows={activeDrilldown?.rows || []}
        onRowClick={activeDrilldown?.onRowClick}
        onBack={modalHistory.length > 1 ? handleModalBack : null}
        filename={`${(activeDrilldown?.title || 'stagnant_drilldown').replace(/\s+/g, '_')}.xlsx`}
      />
    </div>
  );
}
