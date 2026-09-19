// =========================================================================
// STATIC DATA LOADER FOR GITHUB PAGES / STANDALONE FRONTEND
// =========================================================================

const BASE_PATH = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

// 1. Stagnant Data Fetcher (สินค้าค้าง 1 ปี)
export async function fetchStagnantData() {
  try {
    const res = await fetch(`${BASE_PATH}data/stagnant.json`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return { data, isLive: true };
      }
    }
  } catch (err) {
    console.warn(`⚠️ Error loading stagnant.json:`, err.message);
  }
  return { data: [], isLive: false };
}

// 2. Expiry Data Fetcher (สินค้าหมดอายุ)
export async function fetchExpiryData() {
  try {
    const res = await fetch(`${BASE_PATH}data/expiry.json`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return { data, isLive: true };
      }
    }
  } catch (err) {
    console.warn(`⚠️ Error loading expiry.json:`, err.message);
  }
  return { data: [], isLive: false };
}

// 3. Dispatch Data Fetcher (ประวัติการจ่ายสินค้า)
export async function fetchDispatchData() {
  try {
    const res = await fetch(`${BASE_PATH}data/dispatch.json`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.transactions && data.transactions.length > 0) {
        return { data, isLive: true };
      }
    }
  } catch (err) {
    console.warn(`⚠️ Error loading dispatch.json:`, err.message);
  }
  return {
    data: {
      products: [],
      destinations: [],
      departments: [],
      transactions: []
    },
    isLive: false
  };
}

// 4. Inventory Data Fetcher (ยอดสินค้าคงคลัง)
export async function fetchInventoryData() {
  try {
    const res = await fetch(`${BASE_PATH}data/inventory.json`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return { data, isLive: true };
      }
    }
  } catch (err) {
    console.warn(`⚠️ Error loading inventory.json:`, err.message);
  }
  return { data: [], isLive: false };
}

// 5. Turnover Data Fetcher (อัตราหมุนเวียนสินค้า)
export async function fetchTurnoverData() {
  try {
    const res = await fetch(`${BASE_PATH}data/turnover.json`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.aggregated && data.aggregated.length > 0) {
        return { data, isLive: true };
      }
    }
  } catch (err) {
    console.warn(`⚠️ Error loading turnover.json:`, err.message);
  }

  return {
    data: {
      products: [],
      warehouses: [],
      months: [],
      aggregated: [],
      details: [],
      dowAggregated: []
    },
    isLive: false
  };
}

// Backward compatibility stubs
export async function checkServerHealth() {
  return { status: 'static_mode', hasData: true };
}

export async function getSnapshotStatus() {
  return { hasData: true, lastSyncedAt: null, rowCounts: {} };
}

export async function triggerSnapshotSync() {
  return { success: true };
}
