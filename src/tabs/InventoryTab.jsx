import React, { useState, useMemo, useEffect } from 'react';
import Chart from 'react-apexcharts';
import KpiCard from '../components/KpiCard';
import ResponsiveTable from '../components/ResponsiveTable';
import ApexDonut from '../components/ApexDonut';
import DrilldownModal from '../components/DrilldownModal';
import SearchBar from '../components/SearchBar';
import { TrendingUp, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

export default function InventoryTab({ 
  rawInventoryDataset = [], 
  selectedWarehouses = [], 
  selectedProducts = [],
  startDate,
  endDate,
  resetKey
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTableStatus, setActiveTableStatus] = useState('All');
  const [usageFilter, setUsageFilter] = useState('All'); // 'All', 'Out of Stock', 'Below Min', 'Normal', 'Over Max'
  const [activeRiskLevel, setActiveRiskLevel] = useState('All');

  // Reset local search when filter reset is triggered
  useEffect(() => {
    setSearchTerm('');
  }, [resetKey]);
  
  // Dynamic Animation Series States
  const [usageAnimatedSeries, setUsageAnimatedSeries] = useState([]);
  const [belowMinAnimatedSeries, setBelowMinAnimatedSeries] = useState([]);
  const [exceedingAnimatedSeries, setExceedingAnimatedSeries] = useState([]);

  // Drilldown modal states & Navigation History Stack (Level 1 -> Level 2)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalHistory, setModalHistory] = useState([]); // Array of { level, type, title, rows, headers, summaryItems, onRowClick }

  const activeDrilldown = modalHistory[modalHistory.length - 1] || null;

  // 1. Filter raw lot dataset based on criteria (คลัง, สินค้า, วันที่)
  const filteredRawLots = useMemo(() => {
    return rawInventoryDataset.filter(row => {
      // Only filter out if active_status is explicitly inactive (N, 0, false, Inactive)
      if (row.active_status !== undefined && row.active_status !== null) {
        const s = String(row.active_status).trim().toUpperCase();
        if (s === 'N' || s === '0' || s === 'FALSE' || s === 'INACTIVE' || s === 'I') {
          return false;
        }
      }
      const wh = row.warehouse || row.คลัง || '';
      if (selectedWarehouses.length > 0 && wh && !selectedWarehouses.includes(wh)) return false;
      const itemId = row.item_id || row.รหัสสินค้า || '';
      if (selectedProducts.length > 0 && itemId && !selectedProducts.includes(itemId)) return false;
      if ((startDate || endDate) && row.date) {
        const rowDate = new Date(row.date);
        if (startDate && rowDate < startDate) return false;
        if (endDate) {
          const endWithTime = new Date(endDate);
          endWithTime.setHours(23, 59, 59, 999);
          if (rowDate > endWithTime) return false;
        }
      }
      return true;
    });
  }, [rawInventoryDataset, selectedWarehouses, selectedProducts, startDate, endDate]);

  // 2. Aggregated Dataset (Per Item + Warehouse) for Overview & Level 1 Summary
  const filteredDataset = useMemo(() => {
    const itemMap = new Map();
    filteredRawLots.forEach(lot => {
      const itemId = String(lot.item_id || lot['รหัสสินค้า'] || lot['รหัส'] || '-').trim();
      const warehouse = String(lot.warehouse || lot['คลัง'] || lot['คลังสินค้า'] || 'คลังหลัก').trim();
      const key = `${itemId}___${warehouse}`;

      if (!itemMap.has(key)) {
        itemMap.set(key, {
          key,
          item_id: itemId,
          name: String(lot.name || lot['ชื่อสินค้า'] || lot['ชื่อสามัญ'] || itemId || 'Unknown Item').trim(),
          warehouse_id: String(lot.warehouse_id || '').trim(),
          warehouse,
          unit: String(lot.unit || 'ea').trim(),
          stock: 0,
          total_value: 0,
          daily_usage: parseFloat(lot.daily_usage ?? lot.usage ?? 0) || 0,
          min_threshold: parseFloat(lot.min_threshold ?? lot.min_stock ?? 0) || 0,
          max_threshold: parseFloat(lot.max_threshold ?? lot.max_stock ?? 0) || 0,
          date: lot.date || '',
          lot_count: 0,
          lots: []
        });
      }

      const entry = itemMap.get(key);
      const lotStock = parseFloat(lot.stock ?? lot.quantity ?? lot.balance ?? lot['คงเหลือ'] ?? lot['จำนวน'] ?? 0) || 0;
      const lotUnitPrice = parseFloat(lot.unit_price ?? lot.cost_purchase ?? 0) || 0;
      const lotVal = parseFloat(lot.total_value ?? lot['มูลค่ารวม'] ?? 0) || (lotStock * lotUnitPrice);

      entry.stock += lotStock;
      entry.total_value += lotVal;
      entry.lot_count += 1;
      entry.lots.push({
        ...lot,
        item_id: itemId,
        name: entry.name,
        warehouse,
        lot_number_id: String(lot.lot_number_id || lot.lot_no || '-').trim(),
        stock: lotStock,
        unit: String(lot.unit || entry.unit || 'ea').trim(),
        unit_price: lotUnitPrice,
        total_value: lotVal,
        date: lot.date || ''
      });

      if (lot.date && (!entry.date || lot.date > entry.date)) {
        entry.date = lot.date;
      }
    });

    return Array.from(itemMap.values()).map(item => {
      let status = 'Normal';
      let status_th = 'ปกติ';
      const stock = item.stock;
      const min = item.min_threshold;
      const max = item.max_threshold;
      const dailyUsage = item.daily_usage;
      const remainingDays = dailyUsage > 0 ? parseFloat((stock / dailyUsage).toFixed(1)) : null;

      if (min === 0 && max === 0) {
        status = 'Unspecified';
        status_th = 'ไม่ได้ระบุ';
      } else if (stock === 0) {
        status = 'Out of Stock';
        status_th = 'สินค้าหมดคลัง';
      } else if (min > 0 && stock < min) {
        status = 'Below Min';
        status_th = 'ต่ำกว่าเกณฑ์';
      } else if (max > 0 && stock > max) {
        status = 'Over Max';
        status_th = 'เกินเกณฑ์สูงสุด';
      } else {
        status = 'Normal';
        status_th = 'ปริมาณปกติ';
      }

      // Sync status to all lots inside this item
      item.lots.forEach(l => {
        l.status = status;
        l.status_th = status_th;
      });

      return {
        ...item,
        status,
        status_th,
        remaining_days: remainingDays,
        days_remaining: remainingDays
      };
    });
  }, [filteredRawLots]);

  const searchedTableRows = useMemo(() => {
    let filtered = filteredDataset;
    if (activeTableStatus !== 'All') {
      filtered = filtered.filter(r => r.status === activeTableStatus);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(r => {
        return r.item_id.toLowerCase().includes(term) || r.name.toLowerCase().includes(term);
      });
    }
    return [...filtered].sort((a, b) => b.stock - a.stock);
  }, [filteredDataset, activeTableStatus, searchTerm]);

  // 3. Compute KPI Metrics
  const stats = useMemo(() => {
    const totalItems = filteredDataset.length;
    const outOfStockItems = filteredDataset.filter(r => r.status === 'Out of Stock');
    const belowMinItems = filteredDataset.filter(r => r.status === 'Below Min');
    const overMaxItems = filteredDataset.filter(r => r.status === 'Over Max');
    const normalItems = filteredDataset.filter(r => r.status === 'Normal');
    const unspecifiedItems = filteredDataset.filter(r => r.status === 'Unspecified');

    const outOfStockCount = outOfStockItems.length;
    const belowMinCount = belowMinItems.length;
    const overMaxCount = overMaxItems.length;
    const normalCount = normalItems.length;
    const unspecifiedCount = unspecifiedItems.length;

    const outOfStockPct = totalItems > 0 ? (outOfStockCount / totalItems * 100) : 0;
    const belowMinPct = totalItems > 0 ? (belowMinCount / totalItems * 100) : 0;
    const overMaxPct = totalItems > 0 ? (overMaxCount / totalItems * 100) : 0;
    const normalPct = totalItems > 0 ? (normalCount / totalItems * 100) : 0;
    const unspecifiedPct = totalItems > 0 ? (unspecifiedCount / totalItems * 100) : 0;

    let avgExceedingPct = 0;
    if (overMaxCount > 0) {
      avgExceedingPct = overMaxItems.reduce((sum, r) => {
        const pct = r.max_threshold > 0 ? ((r.stock - r.max_threshold) / r.max_threshold * 100) : 0;
        return sum + pct;
      }, 0) / overMaxCount;
    }

    let avgBelowMinPct = 0;
    if (belowMinCount > 0) {
      avgBelowMinPct = belowMinItems.reduce((sum, r) => {
        const pct = r.min_threshold > 0 ? ((r.min_threshold - r.stock) / r.min_threshold * 100) : 0;
        return sum + pct;
      }, 0) / belowMinCount;
    }

    const avgStockNormal = normalCount > 0 ? normalItems.reduce((sum, r) => sum + r.stock, 0) / normalCount : 0;
    const avgStockOverMax = overMaxCount > 0 ? overMaxItems.reduce((sum, r) => sum + r.stock, 0) / overMaxCount : 0;
    const avgStockBelowMin = belowMinCount > 0 ? belowMinItems.reduce((sum, r) => sum + r.stock, 0) / belowMinCount : 0;
    const avgStockOutOfStock = outOfStockCount > 0 ? outOfStockItems.reduce((sum, r) => sum + r.stock, 0) / outOfStockCount : 0;
    const avgStockUnspecified = unspecifiedCount > 0 ? unspecifiedItems.reduce((sum, r) => sum + r.stock, 0) / unspecifiedCount : 0;

    const avgNormalPct = normalCount > 0 ? normalItems.reduce((sum, r) => sum + (r.min_threshold > 0 ? (r.stock - r.min_threshold) / r.min_threshold * 100 : 0), 0) / normalCount : 0;

    return {
      totalItems,
      outOfStockCount,
      outOfStockPct,
      belowMinCount,
      belowMinPct,
      overMaxCount,
      overMaxPct,
      normalCount,
      normalPct,
      unspecifiedCount,
      unspecifiedPct,
      avgExceedingPct,
      avgBelowMinPct,
      avgStockNormal,
      avgStockOverMax,
      avgStockBelowMin,
      avgStockOutOfStock,
      avgStockUnspecified,
      avgNormalPct
    };
  }, [filteredDataset]);

  // Donut Chart data
  const donutData = useMemo(() => {
    return {
      series: [stats.overMaxCount, stats.normalCount, stats.belowMinCount, stats.outOfStockCount, stats.unspecifiedCount],
      labels: ['เกินเกณฑ์สูงสุด', 'ปริมาณปกติ', 'ต่ำกว่าเกณฑ์', 'สินค้าหมดคลัง', 'ไม่ได้ระบุ']
    };
  }, [stats]);

  const usageChartData = useMemo(() => {
    let usageData = [...filteredDataset];
    if (usageFilter !== 'All') {
      usageData = usageData.filter(r => r.status === usageFilter);
    }
    usageData.sort((a, b) => b.daily_usage - a.daily_usage);
    const top20 = usageData.slice(0, 20);
    const colors = top20.map(r => {
      if (r.status === 'Out of Stock') return '#ef4444';
      if (r.status === 'Below Min') return '#f59e0b';
      if (r.status === 'Normal') return '#10b981';
      if (r.status === 'Over Max') return '#3b82f6';
      return '#64748b'; // Unspecified
    });
    return {
      categories: top20.map(r => {
        const lbl = `${r.name} (${r.warehouse})`;
        return lbl.length > 28 ? `${lbl.substring(0, 28)}...` : lbl;
      }),
      fullCategories: top20.map(r => `${r.name} (${r.warehouse})`),
      values: top20.map(r => r.daily_usage),
      colors,
      fullList: top20
    };
  }, [filteredDataset, usageFilter]);

  const belowMinChartData = useMemo(() => {
    const belowMinData = filteredDataset.filter(r => r.status === 'Below Min' || r.status === 'Out of Stock');
    const top10 = belowMinData
      .map(r => ({ ...r, deficit: r.min_threshold - r.stock }))
      .sort((a, b) => b.deficit - a.deficit)
      .slice(0, 10);
    return {
      categories: top10.map(r => {
        const lbl = `${r.name} (${r.warehouse})`;
        return lbl.length > 28 ? `${lbl.substring(0, 28)}...` : lbl;
      }),
      fullCategories: top10.map(r => `${r.name} (${r.warehouse})`),
      values: top10.map(r => r.deficit),
      rows: top10
    };
  }, [filteredDataset]);

  const exceedingChartData = useMemo(() => {
    const exceedingData = filteredDataset.filter(r => r.status === 'Over Max');
    const top10 = exceedingData
      .map(r => ({ ...r, excess: r.stock - r.max_threshold }))
      .sort((a, b) => b.excess - a.excess)
      .slice(0, 10);
    return {
      categories: top10.map(r => {
        const lbl = `${r.name} (${r.warehouse})`;
        return lbl.length > 28 ? `${lbl.substring(0, 28)}...` : lbl;
      }),
      fullCategories: top10.map(r => `${r.name} (${r.warehouse})`),
      values: top10.map(r => r.excess),
      rows: top10
    };
  }, [filteredDataset]);

  // Trigger dynamic entrance animation for Top 20 Usage Chart
  useEffect(() => {
    setUsageAnimatedSeries([]);
    const timer = setTimeout(() => {
      if (usageChartData.values && usageChartData.values.length > 0) {
        setUsageAnimatedSeries([{
          name: 'อัตราใช้เฉลี่ย/วัน',
          data: usageChartData.values
        }]);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [usageChartData]);

  // Trigger dynamic entrance animation for Deficit Chart (Below Min)
  useEffect(() => {
    setBelowMinAnimatedSeries([]);
    const timer = setTimeout(() => {
      if (belowMinChartData.values && belowMinChartData.values.length > 0) {
        setBelowMinAnimatedSeries([{
          name: 'ส่วนขาด (ต่ำกว่า Min)',
          data: belowMinChartData.values
        }]);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [belowMinChartData]);

  // Trigger dynamic entrance animation for Excess Chart (Over Max)
  useEffect(() => {
    setExceedingAnimatedSeries([]);
    const timer = setTimeout(() => {
      if (exceedingChartData.values && exceedingChartData.values.length > 0) {
        setExceedingAnimatedSeries([{
          name: 'ส่วนเกิน (เกิน Max)',
          data: exceedingChartData.values
        }]);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [exceedingChartData]);

  // Headers สำหรับตารางสรุปรายการสินค้า (ชั้น 1 ในโมดอล) - ลบคอลัมน์สถานะสต๊อกออกตามที่ผู้ใช้กำหนด
  const summaryHeaders = useMemo(() => [
    { key: 'item_id', label: 'Item ID', style: { width: '170px', minWidth: '140px' } },
    { key: 'name', label: 'ชื่อสินค้า', style: { whiteSpace: 'normal', width: '320px', minWidth: '220px' } },
    { key: 'warehouse', label: 'คลังสินค้า', style: { width: '180px', minWidth: '140px' } },
    { key: 'lot_count', label: 'จำนวนล็อต', align: 'right', style: { width: '120px', minWidth: '100px' }, cellRender: (row, val) => {
      const count = (val !== undefined && val !== null && !isNaN(Number(val)) && Number(val) > 0)
        ? Math.round(Number(val))
        : (row.lots ? row.lots.length : (Math.round(Number(row.lot_count)) || 1));
      return (
        <span style={{ fontWeight: 600, color: 'var(--accent, #6366f1)' }}>
          {count.toLocaleString()} ล็อต
        </span>
      );
    } },
    { key: 'stock', label: 'ยอดคงคลังรวม', align: 'right', style: { width: '130px', minWidth: '110px' }, cellRender: (row, val) => (val !== undefined && val !== null && !isNaN(Number(val)) ? Math.round(Number(val)).toLocaleString() : '0') },
    { key: 'total_value', label: 'มูลค่ารวม', align: 'right', style: { width: '140px', minWidth: '110px' }, cellRender: (row, val) => {
      const num = (val !== undefined && val !== null && !isNaN(Number(val)) && Number(val) > 0)
        ? Number(val)
        : (row.total_value !== undefined && !isNaN(Number(row.total_value)) && Number(row.total_value) > 0
            ? Number(row.total_value)
            : ((Number(row.stock) || 0) * (Number(row.unit_price) || 0)));
      return Math.round(num).toLocaleString();
    } },
    { key: 'daily_usage', label: 'อัตราใช้เฉลี่ย/วัน', align: 'right', style: { width: '140px', minWidth: '120px' }, cellRender: (row, val) => (val !== undefined && val !== null && !isNaN(Number(val)) ? Math.round(Number(val)).toLocaleString() : '0') },
    { key: 'remainingDays', label: 'วันคงเหลือ', align: 'right', style: { width: '130px', minWidth: '110px' }, cellRender: (row) => {
        return row.daily_usage > 0 ? Math.round(row.stock / row.daily_usage).toLocaleString() + ' วัน' : 'ไม่มีการใช้งาน';
      }
    },
    { key: 'min_threshold', label: 'Min', align: 'right', style: { width: '90px', minWidth: '80px' }, cellRender: (row, val) => Math.round(Number(val || 0)).toLocaleString() },
    { key: 'max_threshold', label: 'Max', align: 'right', style: { width: '90px', minWidth: '80px' }, cellRender: (row, val) => Math.round(Number(val || 0)).toLocaleString() }
  ], []);

  // Headers สำหรับตารางเจาะลึกระดับล็อต (ชั้น 2 ในโมดอล) - รูปแบบเหมือนชั้น 1 เพิ่ม LOT NO. และไม่มีคอลัมน์สถานะ
  const lotDetailHeaders = useMemo(() => [
    { key: 'item_id', label: 'Item ID', style: { width: '170px', minWidth: '140px' } },
    { key: 'name', label: 'ชื่อสินค้า', style: { whiteSpace: 'normal', width: '320px', minWidth: '220px' } },
    { key: 'warehouse', label: 'คลังสินค้า', style: { width: '180px', minWidth: '140px' } },
    { key: 'lot_number_id', label: 'LOT ID', style: { width: '180px', minWidth: '140px' }, cellRender: (row, val) => (
      <span style={{ fontWeight: 600, color: 'var(--accent, #6366f1)' }}>
        {val || row.lot_number_id || '-'}
      </span>
    ) },
    { key: 'stock', label: 'ยอดคงคลัง', align: 'right', style: { width: '130px', minWidth: '110px' }, cellRender: (row, val) => (val !== undefined && val !== null && !isNaN(Number(val)) ? Math.round(Number(val)).toLocaleString() : '0') },
    { key: 'total_value', label: 'มูลค่ารวม', align: 'right', style: { width: '140px', minWidth: '110px' }, cellRender: (row, val) => {
      const num = (val !== undefined && val !== null && !isNaN(Number(val)) && Number(val) > 0)
        ? Number(val)
        : (row.total_value !== undefined && !isNaN(Number(row.total_value)) && Number(row.total_value) > 0
            ? Number(row.total_value)
            : ((Number(row.stock) || 0) * (Number(row.unit_price) || 0)));
      return Math.round(num).toLocaleString();
    } },
    { key: 'daily_usage', label: 'อัตราใช้เฉลี่ย/วัน', align: 'right', style: { width: '140px', minWidth: '120px' }, cellRender: (row, val) => (val !== undefined && val !== null && !isNaN(Number(val)) ? Math.round(Number(val)).toLocaleString() : '0') },
    { key: 'remainingDays', label: 'วันคงเหลือ', align: 'right', style: { width: '130px', minWidth: '110px' }, cellRender: (row) => {
        return (row.daily_usage > 0 && row.stock !== undefined) ? Math.round(row.stock / row.daily_usage).toLocaleString() + ' วัน' : 'ไม่มีการใช้งาน';
      }
    },
    { key: 'min_threshold', label: 'Min', align: 'right', style: { width: '90px', minWidth: '80px' }, cellRender: (row, val) => Math.round(Number(val || 0)).toLocaleString() },
    { key: 'max_threshold', label: 'Max', align: 'right', style: { width: '90px', minWidth: '80px' }, cellRender: (row, val) => Math.round(Number(val || 0)).toLocaleString() }
  ], []);

  // ฟังก์ชันเจาะลึกชั้น 2: แสดงรายละเอียดทุกล็อตของสินค้าในคลังที่เลือก
  const handleDrilldownLots = (itemRow) => {
    const itemId = itemRow.item_id;
    const wh = itemRow.warehouse;
    
    // กรองหาทุกล็อตย่อยของสินค้านี้ในคลังนี้
    const lotRows = (itemRow.lots && itemRow.lots.length > 0) 
      ? itemRow.lots 
      : filteredRawLots.filter(l => l.item_id === itemId && l.warehouse === wh);

    const sortedLots = [...lotRows].map(l => {
      const lotStock = parseFloat(l.stock ?? l.balance ?? l.quantity ?? 0) || 0;
      const lotPrice = parseFloat(l.unit_price ?? l.cost_purchase ?? 0) || 0;
      const lotVal = parseFloat(l.total_value ?? 0) || (lotStock * lotPrice);
      return {
        ...l,
        item_id: itemId,
        name: itemRow.name || l.name,
        warehouse: wh,
        lot_number_id: String(l.lot_number_id || l.lot_no || '-').trim(),
        stock: lotStock,
        unit: String(l.unit || itemRow.unit || 'ea').trim(),
        unit_price: lotPrice,
        total_value: lotVal,
        daily_usage: itemRow.daily_usage || 0,
        remainingDays: itemRow.daily_usage > 0 ? Math.round(lotStock / itemRow.daily_usage) : null,
        min_threshold: itemRow.min_threshold || 0,
        max_threshold: itemRow.max_threshold || 0,
        date: l.date || ''
      };
    }).sort((a, b) => (b.total_value || b.stock || 0) - (a.total_value || a.stock || 0));

    const totalStock = sortedLots.reduce((sum, l) => sum + (Number(l.stock) || 0), 0);
    const totalVal = sortedLots.reduce((sum, l) => sum + (Number(l.total_value) || 0), 0);

    const level2State = {
      level: 2,
      type: 'item_lots',
      title: `📦 เจาะลึกทุกล็อตสินค้าคงคลัง: ${itemRow.name} (${itemId})`,
      rows: sortedLots,
      headers: lotDetailHeaders,
      summaryItems: [
        { label: 'คลังสินค้า', value: wh, color: 'var(--primary)' },
        { label: 'จำนวนล็อตย่อย', value: `${sortedLots.length.toLocaleString()} ล็อต`, color: 'var(--accent, #6366f1)' },
        { label: 'ยอดคงคลังรวม', value: `${totalStock.toLocaleString()} ${itemRow.unit || 'ชิ้น'}`, color: 'var(--success)' },
        { label: 'มูลค่าคงคลังรวม', value: `${Math.round(totalVal).toLocaleString()} บาท`, color: 'var(--warning)' }
      ]
    };

    setModalHistory(prev => [...prev, level2State]);
    setIsModalOpen(true);
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

  // ปิดหน้าต่าง Modal ทั้งหมด
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalHistory([]);
  };

  // Drilldown Opening Handlers (รวมเจาะลึกที่การ์ดและกราฟ - ชั้น 1)
  const handleOpenDrilldown = (type, key, titleStr) => {
    let rows = [];
    let headers = summaryHeaders;
    let summary = [];
    let onRowClickHandler = handleDrilldownLots;

    if (type === 'inventory_status') {
      rows = [...filteredDataset.filter(r => r.status === key)].sort((a, b) => b.stock - a.stock);
      const totalStock = rows.reduce((sum, r) => sum + (Number(r.stock) || 0), 0);
      const totalVal = rows.reduce((sum, r) => sum + (Number(r.total_value) || 0), 0);
      const totalLots = rows.reduce((sum, r) => sum + (Number(r.lot_count) || 1), 0);
      summary = [
        { label: 'กลุ่มสถานะ', value: titleStr.replace('เจาะลึกสินค้ากลุ่ม: ', '').replace('รายการสินค้า', ''), color: 'var(--primary)' },
        { label: 'จำนวนรายการสินค้า', value: `${rows.length.toLocaleString()} รายการ (คลิกที่แถวเพื่อดูทุกล็อตย่อย)`, color: 'var(--text-muted)' },
        { label: 'จำนวนล็อตทั้งหมด', value: `${totalLots.toLocaleString()} ล็อต`, color: 'var(--accent, #6366f1)' },
        { label: 'ยอดคงคลังรวม', value: `${totalStock.toLocaleString()} ชิ้น`, color: 'var(--success)' },
        { label: 'มูลค่ารวม', value: `${Math.round(totalVal).toLocaleString()} บาท`, color: 'var(--warning)' }
      ];
    } else if (type === 'inventory_single_item') {
      const [itemId, wh] = key.split('|');
      const match = filteredDataset.find(r => r.item_id === itemId && r.warehouse === wh);
      if (match) {
        handleDrilldownLots(match);
        return;
      }
    } else if (type === 'all_items') {
      rows = [...filteredDataset].sort((a, b) => b.stock - a.stock);
      const totalStock = rows.reduce((sum, r) => sum + (Number(r.stock) || 0), 0);
      const totalVal = rows.reduce((sum, r) => sum + (Number(r.total_value) || 0), 0);
      const totalLots = rows.reduce((sum, r) => sum + (Number(r.lot_count) || 1), 0);
      summary = [
        { label: 'รายการสินค้าคงคลังทั้งหมด', value: `${rows.length.toLocaleString()} รายการ (คลิกที่แถวเพื่อดูทุกล็อตย่อย)`, color: 'var(--primary)' },
        { label: 'จำนวนล็อตทั้งหมด', value: `${totalLots.toLocaleString()} ล็อต`, color: 'var(--accent, #6366f1)' },
        { label: 'ยอดคงคลังรวม', value: `${totalStock.toLocaleString()} ชิ้น`, color: 'var(--success)' },
        { label: 'มูลค่ารวม', value: `${Math.round(totalVal).toLocaleString()} บาท`, color: 'var(--warning)' }
      ];
    }

    const level1State = {
      level: 1,
      type,
      title: titleStr,
      rows,
      headers,
      summaryItems: summary,
      onRowClick: onRowClickHandler
    };

    setModalHistory([level1State]);
    setIsModalOpen(true);
  };

  const tableHeaders = [
    { key: 'item_id', label: 'Item ID', style: { width: '160px', minWidth: '140px' } },
    { key: 'name', label: 'ชื่อสินค้า', style: { whiteSpace: 'normal', width: '300px', minWidth: '220px' } },
    { key: 'warehouse', label: 'คลังสินค้า', style: { width: '180px', minWidth: '140px' } },
    { key: 'lot_count', label: 'จำนวนล็อต', align: 'right', style: { width: '110px', minWidth: '95px' }, cellRender: (row, val) => (
      <span style={{ fontWeight: 600, color: 'var(--accent, #6366f1)' }}>
        {val !== undefined && val !== null ? Math.round(Number(val)).toLocaleString() : (Math.round(Number(row.lot_count)) || 1)} ล็อต
      </span>
    ) },
    { key: 'stock', label: 'ยอดคงคลังรวม', align: 'right', style: { width: '130px', minWidth: '110px' }, cellRender: (row, val) => (val !== undefined && val !== null ? Math.round(Number(val)).toLocaleString() : '0') },
    { key: 'total_value', label: 'มูลค่ารวม', align: 'right', style: { width: '140px', minWidth: '110px' }, cellRender: (row, val) => {
      const num = (val !== undefined && val !== null && !isNaN(Number(val)) && Number(val) > 0)
        ? Number(val)
        : (row.total_value !== undefined && !isNaN(Number(row.total_value)) && Number(row.total_value) > 0
            ? Number(row.total_value)
            : ((Number(row.stock) || 0) * (Number(row.unit_price) || 0)));
      return Math.round(num).toLocaleString();
    } },
    { key: 'daily_usage', label: 'อัตราใช้เฉลี่ย/วัน', align: 'right', style: { width: '140px', minWidth: '120px' }, cellRender: (row, val) => (val !== undefined && val !== null ? Math.round(Number(val)).toLocaleString() : '0') },
    { key: 'remainingDays', label: 'วันคงเหลือ', align: 'right', style: { width: '130px', minWidth: '110px' }, cellRender: (row) => {
        return row.daily_usage > 0 ? Math.round(row.stock / row.daily_usage).toLocaleString() + ' วัน' : 'ไม่มีการใช้งาน';
      }
    },
    { key: 'min_threshold', label: 'Min', align: 'right', style: { width: '90px', minWidth: '80px' }, cellRender: (row, val) => Math.round(Number(val || 0)).toLocaleString() },
    { key: 'max_threshold', label: 'Max', align: 'right', style: { width: '90px', minWidth: '80px' }, cellRender: (row, val) => Math.round(Number(val || 0)).toLocaleString() },
    { key: 'status_th', label: 'สถานะสต๊อก', align: 'center', style: { width: '130px', minWidth: '115px' }, cellRender: (row, val) => (
      <span className={`kpi-badge ${
        row.status === 'Out of Stock' ? 'badge-danger' : 
        (row.status === 'Below Min' ? 'badge-warning' : 
        (row.status === 'Normal' ? 'badge-success' : 
        (row.status === 'Over Max' ? 'badge-info' : 'badge-neutral')))
      }`}>
        {val}
      </span>
    ) }
  ];

  const riskTableHeaders = [
    { key: 'item_id', label: 'Item ID', style: { width: '160px', minWidth: '140px' } },
    { key: 'name', label: 'ชื่อสินค้า (ชื่อสามัญ)', style: { whiteSpace: 'normal', width: '320px', minWidth: '220px' } },
    { key: 'warehouse', label: 'คลังสินค้า', style: { width: '180px', minWidth: '140px' } },
    { key: 'lot_count', label: 'จำนวนล็อต', align: 'right', style: { width: '110px', minWidth: '95px' }, cellRender: (row, val) => (
      <span style={{ fontWeight: 600, color: 'var(--accent, #6366f1)' }}>
        {val !== undefined && val !== null ? Math.round(Number(val)).toLocaleString() : (Math.round(Number(row.lot_count)) || 1)} ล็อต
      </span>
    ) },
    { key: 'stock', label: 'ยอดคงคลังปัจจุบัน', align: 'right', style: { width: '130px', minWidth: '110px' }, cellRender: (row, val) => (val !== undefined && val !== null ? Math.round(Number(val)).toLocaleString() : '0') },
    { key: 'daily_usage', label: 'อัตราใช้เฉลี่ย/วัน', align: 'right', style: { width: '140px', minWidth: '120px' }, cellRender: (row, val) => (val !== undefined && val !== null ? Math.round(Number(val)).toLocaleString() : '0') },
    { key: 'remaining_days', label: 'ระยะเวลาจ่ายหมด', align: 'right', style: { width: '130px', minWidth: '110px' }, cellRender: (row, val) => {
      if (val === undefined || val === null || isNaN(Number(val))) return 'ไม่มีการใช้งาน';
      const numVal = Math.round(Number(val));
      if (numVal > 15) return 'ปกติ';
      let color = '#3b82f6'; // Caution: blue
      if (numVal <= 5) color = '#ef4444'; // Red
      else if (numVal <= 10) color = '#f59e0b'; // Orange
      return <strong style={{ color, fontWeight: 700 }}>{numVal <= 0 ? 0 : numVal} วัน</strong>;
    } }
  ];

  const riskTableRows = useMemo(() => {
    let list = filteredDataset.filter(r => r.remaining_days > 0 && r.remaining_days <= 15);

    if (activeRiskLevel !== 'All') {
      list = list.filter(row => {
        const d = row.remaining_days;
        if (activeRiskLevel === 'Critical') return d > 0 && d <= 5;
        if (activeRiskLevel === 'Warning') return d > 5 && d <= 10;
        if (activeRiskLevel === 'Caution') return d > 10 && d <= 15;
        return true;
      });
    }

    return [...list].sort((a, b) => a.remaining_days - b.remaining_days);
  }, [filteredDataset, activeRiskLevel]);

  return (
    <div className="tab-container" id="inventory-dashboard-layout">
      {/* KPI metric cards row */}
      <section className="kpi-row">
        <KpiCard 
          title="สินค้าเกินเกณฑ์สูงสุด (Over Max)"
          value={stats.overMaxCount.toLocaleString() + ' <span style="font-size:0.85rem; color:var(--text-muted);">รายการ</span>'}
          icon={TrendingUp}
          accentClass="info"
          subtext={`ค่าเฉลี่ยเกินเกณฑ์: <b>+${Math.round(stats.avgExceedingPct)}%</b>`}
          onClick={() => handleOpenDrilldown('inventory_status', 'Over Max', 'รายการสินค้าเกินเกณฑ์สูงสุด')}
        />
        <KpiCard 
          title="สินค้าในสถานะปริมาณปกติ (Safe Stock)"
          value={stats.normalCount.toLocaleString() + ' <span style="font-size:0.85rem; color:var(--text-muted);">รายการ</span>'}
          icon={CheckCircle}
          accentClass="success"
          subtext={`ค่าเฉลี่ยเหนือเกณฑ์: <b>+${Math.round(stats.avgNormalPct)}%</b>`}
          onClick={() => handleOpenDrilldown('inventory_status', 'Normal', 'รายการสินค้าปริมาณปกติ')}
        />
        <KpiCard 
          title="สินค้าต่ำกว่าเกณฑ์ (Below Min)"
          value={stats.belowMinCount.toLocaleString() + ' <span style="font-size:0.85rem; color:var(--text-muted);">รายการ</span>'}
          icon={AlertTriangle}
          accentClass="warning"
          subtext={`ค่าเฉลี่ยต่ำกว่าเกณฑ์: <b>-${Math.round(stats.avgBelowMinPct)}%</b>`}
          onClick={() => handleOpenDrilldown('inventory_status', 'Below Min', 'รายการสินค้าต่ำกว่าเกณฑ์')}
        />
        <KpiCard 
          title="สินค้าหมดคลัง (Out of Stock)"
          value={stats.outOfStockCount.toLocaleString() + ' <span style="font-size:0.85rem; color:var(--text-muted);">รายการ</span>'}
          icon={AlertTriangle}
          accentClass="danger"
          subtext={`ค่าเฉลี่ยต่ำกว่าเกณฑ์: <b>-100%</b>`}
          onClick={() => handleOpenDrilldown('inventory_status', 'Out of Stock', 'รายการสินค้าหมดคลัง')}
        />
        <KpiCard 
          title="ไม่ได้ระบุเกณฑ์ Min-Max"
          value={stats.unspecifiedCount.toLocaleString() + ' <span style="font-size:0.85rem; color:var(--text-muted);">รายการ</span>'}
          icon={HelpCircle}
          accentClass="neutral"
          subtext={`สัดส่วนสินค้าในคลัง: <b>${Math.round(stats.unspecifiedPct)}%</b>`}
          onClick={() => handleOpenDrilldown('inventory_status', 'Unspecified', 'รายการสินค้าไม่ได้ระบุเกณฑ์ Min-Max')}
        />
      </section>

      {/* Charts section */}
      
      {/* Row 1: Donut chart (Full Width) */}
      <section className="charts-row-full" style={{ marginBottom: '24px' }}>
        {/* Donut chart */}
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">สัดส่วนสินค้าแยกตามสถานะคลัง (Status Distribution)</span>
          </div>
          <div className="chart-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ApexDonut 
              series={donutData.series}
              labels={donutData.labels}
              colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b']}
              totalLabel="สินค้าทั้งหมด"
              totalValueFormatter={() => stats.totalItems.toLocaleString()}
              onPointSelected={(idx) => {
                const statuses = ['Over Max', 'Normal', 'Below Min', 'Out of Stock', 'Unspecified'];
                const selected = statuses[idx];
                const labels = ['เกินเกณฑ์สูงสุด', 'ปริมาณปกติ', 'ต่ำกว่าเกณฑ์', 'สินค้าหมดคลัง', 'ไม่ได้ระบุ'];
                handleOpenDrilldown('inventory_status', selected, `เจาะลึกสินค้ากลุ่ม: ${labels[idx]}`);
              }}
            />
          </div>
        </div>
      </section>

      {/* Row 2: Top Daily Usage bar chart (Full Width) */}
      <section className="charts-row-full" style={{ marginBottom: '24px' }}>
        <div className="chart-card">
          <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="chart-title">
              {usageChartData.categories.length > 0 ? `${Math.min(20, usageChartData.categories.length)} อันดับสินค้าที่มีอัตราการจ่ายใช้สูงสุด/วัน` : 'อันดับสินค้าที่มีอัตราการจ่ายใช้สูงสุด/วัน'}
            </span>
            
            {/* Local chart filter dropdown */}
            <div className="chart-actions">
              <select 
                value={usageFilter} 
                onChange={(e) => setUsageFilter(e.target.value)}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', outline: 'none' }}
              >
                <option value="All">ทุกสถานะ</option>
                <option value="Over Max">เกินเกณฑ์</option>
                <option value="Normal">ปกติ</option>
                <option value="Below Min">ต่ำกว่าเกณฑ์</option>
                <option value="Out of Stock">หมดคลัง</option>
                <option value="Unspecified">ไม่ระบุ</option>
              </select>
            </div>
          </div>
          <div className="chart-body" style={{ display: 'block', width: '100%' }}>
            {usageChartData.categories.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '180px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                ไม่มีสินค้าในกลุ่มนี้
              </div>
            ) : (
              <Chart 
                key={`inventory-usage-${usageChartData.categories.length}-${usageFilter}`}
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
                        if (idx !== undefined && usageChartData.fullList[idx]) {
                          const item = usageChartData.fullList[idx];
                          handleDrilldownLots(item);
                        }
                      }
                    }
                  },
                  plotOptions: { 
                    bar: { 
                      horizontal: true, 
                      borderRadius: 4, 
                      distributed: true, 
                      barHeight: '70%',
                      dataLabels: {
                        position: 'top'
                      }
                    }
                  },
                  dataLabels: {
                    enabled: true,
                    textAnchor: 'start',
                    style: {
                      colors: ['#4b5563'],
                      fontWeight: 700,
                      fontSize: '12px'
                    },
                    formatter: (val) => Math.round(Number(val || 0)).toLocaleString(),
                    offsetX: 10
                  },
                  colors: usageChartData.colors,
                  legend: { show: false },
                  stroke: { show: false, width: 0 },
                  xaxis: {
                    categories: usageChartData.categories,
                    labels: { style: { colors: 'var(--secondary)', fontSize: '12px' } }
                  },
                  yaxis: {
                    labels: {
                      maxWidth: 280,
                      style: { colors: '#0f172a', fontWeight: 400, fontSize: '12px' }
                    }
                  },
                  grid: { borderColor: 'var(--border)', strokeDashArray: 4, padding: { right: 65, left: 10 } },
                  tooltip: {
                    custom: ({ dataPointIndex }) => {
                      const item = usageChartData.fullList[dataPointIndex];
                      if (!item) return '';
                      return `
                        <div class="custom-chart-tooltip">
                          <div class="tooltip-header">${item.name} (${item.warehouse})</div>
                          <div class="tooltip-body">
                            <div><strong>รหัสสินค้า:</strong> ${item.item_id}</div>
                            <div><strong>ยอดคงคลังรวม:</strong> ${Math.round(item.stock).toLocaleString()} ${item.unit || 'ชิ้น'}</div>
                            <div><strong>จำนวนล็อต:</strong> ${item.lot_count} ล็อต</div>
                            <div><strong>Min / Max:</strong> ${Math.round(item.min_threshold).toLocaleString()} / ${Math.round(item.max_threshold).toLocaleString()}</div>
                            <div><strong>อัตราใช้เฉลี่ย/วัน:</strong> <span style="font-weight:700; color:var(--accent);">${Math.round(item.daily_usage).toLocaleString()}</span></div>
                          </div>
                        </div>
                      `;
                    }
                  }
                }}
                series={usageAnimatedSeries.length > 0 ? usageAnimatedSeries : [{ name: 'อัตราใช้เฉลี่ย/วัน', data: [] }]}
                type="bar"
                height={Math.max(280, Math.min(500, usageChartData.categories.length * 28 + 60))}
              />
            )}
          </div>
        </div>
      </section>

      {/* Row 3: Deficit and Excess charts side-by-side */}
      <section className="charts-row-half">
        {/* Top Deficit (Below Min) bar chart */}
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">
              {belowMinChartData.categories.length > 0 ? `${Math.min(10, belowMinChartData.categories.length)} อันดับสินค้าที่มีส่วนขาดจาก Min มากที่สุด` : 'อันดับสินค้าที่มีส่วนขาดจาก Min มากที่สุด'}
            </span>
          </div>
          <div className="chart-body" style={{ display: 'block', width: '100%' }}>
            {belowMinChartData.categories.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '180px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                ไม่มีสินค้าต่ำกว่าเกณฑ์ในช่วงที่เลือก
              </div>
            ) : (
              <Chart 
                key={`inventory-deficit-${belowMinChartData.categories.length}`}
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
                        if (idx !== undefined && belowMinChartData.rows[idx]) {
                          const item = belowMinChartData.rows[idx];
                          handleDrilldownLots(item);
                        }
                      }
                    }
                  },
                  plotOptions: { 
                    bar: { 
                      horizontal: true, 
                      barHeight: '70%', 
                      borderRadius: 4, 
                      distributed: true, 
                      dataLabels: { position: 'top' } 
                    } 
                  },
                  dataLabels: {
                    enabled: true,
                    textAnchor: 'start',
                    style: {
                      colors: ['#4b5563'],
                      fontWeight: 700,
                      fontSize: '12px'
                    },
                    formatter: (val) => val.toLocaleString(),
                    offsetX: 10
                  },
                  colors: ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#fbbf24', '#fcd34d', '#fef08a', '#fde68a', '#f59e0b'],
                  legend: { show: false },
                  stroke: { show: false, width: 0 },
                  xaxis: { 
                    categories: belowMinChartData.categories,
                    labels: { style: { colors: 'var(--secondary)', fontSize: '12px' } }
                  },
                  yaxis: {
                    labels: {
                      maxWidth: 280,
                      style: { colors: '#0f172a', fontWeight: 400, fontSize: '12px' }
                    }
                  },
                  grid: { borderColor: 'var(--border)', strokeDashArray: 4, padding: { right: 65, left: 10 } },
                  tooltip: {
                    custom: ({ dataPointIndex }) => {
                      const item = belowMinChartData.rows[dataPointIndex];
                      if (!item) return '';
                      return `
                        <div class="custom-chart-tooltip">
                          <div class="tooltip-header">${item.name} (${item.warehouse})</div>
                          <div class="tooltip-body">
                            <div><strong>รหัสสินค้า:</strong> ${item.item_id}</div>
                            <div><strong>ยอดคงคลังรวม:</strong> ${item.stock.toLocaleString()} ${item.unit || 'ชิ้น'}</div>
                            <div><strong>เกณฑ์ Min:</strong> ${item.min_threshold.toLocaleString()} ${item.unit || 'ชิ้น'}</div>
                            <div><strong>ส่วนขาด:</strong> <span style="font-weight:700; color:#f59e0b;">${item.deficit.toLocaleString()} ${item.unit || 'ชิ้น'}</span></div>
                          </div>
                        </div>
                      `;
                    }
                  }
                }}
                series={belowMinAnimatedSeries.length > 0 ? belowMinAnimatedSeries : [{ name: 'ส่วนขาด (ต่ำกว่า Min)', data: [] }]}
                type="bar"
                height={Math.max(260, Math.min(450, belowMinChartData.categories.length * 30 + 60))}
              />
            )}
          </div>
        </div>

        {/* Top Excess (Over Max) bar chart */}
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">
              {exceedingChartData.categories.length > 0 ? `${Math.min(10, exceedingChartData.categories.length)} อันดับสินค้าที่มีสต็อกเกิน Max มากที่สุด` : 'อันดับสินค้าที่มีสต็อกเกิน Max มากที่สุด'}
            </span>
          </div>
          <div className="chart-body" style={{ display: 'block', width: '100%' }}>
            {exceedingChartData.categories.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '180px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                ไม่มีสินค้าที่เกิน Max ในช่วงที่เลือก
              </div>
            ) : (
              <Chart 
                key={`inventory-excess-${exceedingChartData.categories.length}`}
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
                        if (idx !== undefined && exceedingChartData.rows[idx]) {
                          const item = exceedingChartData.rows[idx];
                          handleDrilldownLots(item);
                        }
                      }
                    }
                  },
                  plotOptions: { 
                    bar: { 
                      horizontal: true, 
                      barHeight: '70%', 
                      borderRadius: 4, 
                      distributed: true, 
                      dataLabels: { position: 'top' } 
                    } 
                  },
                  dataLabels: {
                    enabled: true,
                    textAnchor: 'start',
                    style: {
                      colors: ['#4b5563'],
                      fontWeight: 700,
                      fontSize: '12px'
                    },
                    formatter: (val) => val.toLocaleString(),
                    offsetX: 10
                  },
                  colors: ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#3b82f6'],
                  legend: { show: false },
                  stroke: { show: false, width: 0 },
                  xaxis: { 
                    categories: exceedingChartData.categories,
                    labels: { style: { colors: 'var(--secondary)', fontSize: '12px' } }
                  },
                  yaxis: {
                    labels: {
                      maxWidth: 280,
                      style: { colors: '#0f172a', fontWeight: 400, fontSize: '12px' }
                    }
                  },
                  grid: { borderColor: 'var(--border)', strokeDashArray: 4, padding: { right: 65, left: 10 } },
                  tooltip: {
                    custom: ({ dataPointIndex }) => {
                      const item = exceedingChartData.rows[dataPointIndex];
                      if (!item) return '';
                      return `
                        <div class="custom-chart-tooltip">
                          <div class="tooltip-header">${item.name} (${item.warehouse})</div>
                          <div class="tooltip-body">
                            <div><strong>รหัสสินค้า:</strong> ${item.item_id}</div>
                            <div><strong>ยอดคงคลังรวม:</strong> ${item.stock.toLocaleString()} ${item.unit || 'ชิ้น'}</div>
                            <div><strong>เกณฑ์ Max:</strong> ${item.max_threshold.toLocaleString()} ${item.unit || 'ชิ้น'}</div>
                            <div><strong>ส่วนเกิน:</strong> <span style="font-weight:700; color:#3b82f6;">${item.excess.toLocaleString()} ${item.unit || 'ชิ้น'}</span></div>
                          </div>
                        </div>
                      `;
                    }
                  }
                }}
                series={exceedingAnimatedSeries.length > 0 ? exceedingAnimatedSeries : [{ name: 'ส่วนเกิน (เกิน Max)', data: [] }]}
                type="bar"
                height={Math.max(260, Math.min(450, exceedingChartData.categories.length * 30 + 60))}
              />
            )}
          </div>
        </div>
      </section>

      {/* Highest Risk Table */}
      <section className="table-card" style={{ marginBottom: '24px' }}>
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h2 className="table-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            สินค้าที่เสี่ยงหมดคลังมากที่สุด (≤ 15 วัน)
          </h2>
        </div>

        <div className="risk-tab-btn-group" style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '0', marginBottom: '16px' }}>
          {[
            { id: 'All', label: 'All' },
            { id: 'Caution', label: 'Caution (11-15 วัน)', color: '#eab308' },
            { id: 'Warning', label: 'Warning (6-10 วัน)', color: '#f97316' },
            { id: 'Critical', label: 'Critical (1-5 วัน)', color: '#ef4444' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`risk-tab-btn ${activeRiskLevel === tab.id ? 'active' : ''}`}
              onClick={() => setActiveRiskLevel(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                borderBottom: activeRiskLevel === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                padding: '6px 4px 10px 4px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: activeRiskLevel === tab.id ? 700 : 500,
                color: activeRiskLevel === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            >
              {tab.color && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: tab.color }}></span>}
              {tab.label}
            </button>
          ))}
        </div>

        <ResponsiveTable 
          headers={riskTableHeaders} 
          rows={riskTableRows} 
          itemsPerPage={10}
          tabViewClass="inventory-view"
          onRowClick={(row) => handleDrilldownLots(row)}
        />
      </section>

      {/* Main Stock Table */}
      <section className="table-card">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h2 className="table-title">ตารางสถานะสินค้าคงคลังปัจจุบันทั้งหมด</h2>
          
          <div className="table-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Status tabs */}
            <div className="inventory-tab-btn-group" style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
              <button 
                type="button" 
                className={`inventory-tab-btn ${activeTableStatus === 'All' ? 'active' : ''}`}
                onClick={() => setActiveTableStatus('All')}
                style={{ padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
              >
                ทั้งหมด
              </button>
              <button 
                type="button" 
                className={`inventory-tab-btn ${activeTableStatus === 'Normal' ? 'active' : ''}`}
                onClick={() => setActiveTableStatus('Normal')}
                style={{ padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
              >
                ปกติ
              </button>
              <button 
                type="button" 
                className={`inventory-tab-btn ${activeTableStatus === 'Below Min' ? 'active' : ''}`}
                onClick={() => setActiveTableStatus('Below Min')}
                style={{ padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
              >
                ต่ำกว่าเกณฑ์
              </button>
              <button 
                type="button" 
                className={`inventory-tab-btn ${activeTableStatus === 'Over Max' ? 'active' : ''}`}
                onClick={() => setActiveTableStatus('Over Max')}
                style={{ padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
              >
                เกินเกณฑ์
              </button>
              <button 
                type="button" 
                className={`inventory-tab-btn ${activeTableStatus === 'Out of Stock' ? 'active' : ''}`}
                onClick={() => setActiveTableStatus('Out of Stock')}
                style={{ padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
              >
                หมดคลัง
              </button>
              <button 
                type="button" 
                className={`inventory-tab-btn ${activeTableStatus === 'Unspecified' ? 'active' : ''}`}
                onClick={() => setActiveTableStatus('Unspecified')}
                style={{ padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
              >
                ไม่ได้ระบุ
              </button>
            </div>

            <SearchBar 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ หรือ Item ID..."
            />
          </div>
        </div>

        <ResponsiveTable 
          headers={tableHeaders} 
          rows={searchedTableRows} 
          itemsPerPage={10}
          tabViewClass="inventory-view"
          onRowClick={(row) => handleDrilldownLots(row)}
        />
      </section>

      {/* Drilldown Modal popup with Multi-level Navigation Stack */}
      <DrilldownModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onBack={modalHistory.length > 1 ? handleModalBack : undefined}
        onRowClick={activeDrilldown?.onRowClick}
        title={activeDrilldown?.title || 'เจาะลึกสินค้าคงคลัง'}
        summaryItems={activeDrilldown?.summaryItems || []}
        headers={activeDrilldown?.headers || lotDetailHeaders}
        rows={activeDrilldown?.rows || []}
        filename={`${(activeDrilldown?.title || 'drilldown_inventory').replace(/[^\w\u0E00-\u0E7F]/g, '_')}.xlsx`}
      />
    </div>
  );
}
