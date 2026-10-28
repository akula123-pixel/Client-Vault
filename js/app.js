/**
 * ClientVault ISP - Customer Monthly Payment Management System
 * Core Application Controller & State Engine
 */

(function () {
  'use strict';

  // Application State
  let state = {
    customers: [],
    paymentDb: {},
    plans: [],
    selectedCustomerId: 'CV-IND-1001',
    selectedYear: 2026,
    activeTab: 'monthly-payments', // 'dashboard', 'customers', 'monthly-payments', 'plans'
    statusFilter: 'ALL',
    systemDate: new Date(2026, 9, 27), // 27 Oct 2026 (Local time context)
    editingTxnId: null,
    editingRecordMeta: null
  };

  const STORAGE_KEY = 'clientvault_billing_data_v2';

  // Initialize Application
  function init() {
    loadState();
    setupNavigation();
    setupYearSelectors();
    setupCustomerSearch();
    setupQuickCustomerChips();
    setupFilters();
    setupPaymentModal();
    setupReceiptModal();
    setupCustomerDirectory();
    setupDemoHelpers();

    // Initial render
    renderAll();
  }

  // Load state from localStorage or fallback to default
  function loadState() {
    state.plans = DEFAULT_PLANS;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        state.customers = parsed.customers || DEFAULT_CUSTOMERS;
        state.paymentDb = parsed.paymentDb || initializeDefaultPayments(state.customers);
        state.selectedCustomerId = parsed.selectedCustomerId || DEFAULT_CUSTOMERS[0].id;
        state.selectedYear = parsed.selectedYear || 2026;
        return;
      } catch (e) {
        console.warn('Failed to parse saved state, resetting to defaults.', e);
      }
    }

    state.customers = DEFAULT_CUSTOMERS;
    state.paymentDb = initializeDefaultPayments(state.customers);
    state.selectedCustomerId = DEFAULT_CUSTOMERS[0].id;
    state.selectedYear = 2026;
    saveState();
  }

  // Persist state to localStorage
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        customers: state.customers,
        paymentDb: state.paymentDb,
        selectedCustomerId: state.selectedCustomerId,
        selectedYear: state.selectedYear
      }));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }

  // Section 4: Calculate Payment Status strictly from payment data and due dates
  function getPaymentStatus(record) {
    const amountDue = Number(record.amountDue) || 0;
    const amountPaid = Number(record.amountPaid) || 0;
    const dueDate = new Date(record.dueDate + 'T23:59:59');

    // Rule 1: Paid - the full amount due has been received
    if (amountPaid >= amountDue && amountDue > 0) {
      return 'Paid';
    }

    // Rule 2: Partially Paid - some, but not all, of the amount due has been received
    if (amountPaid > 0 && amountPaid < amountDue) {
      return 'Partially Paid';
    }

    // Unpaid rules: amountPaid === 0
    const sysYear = state.systemDate.getFullYear();
    const sysMonth = state.systemDate.getMonth(); // 0-based: 9 = October

    // Rule 5: Upcoming - the due date is in the future and payment is not complete
    if (record.year > sysYear || (record.year === sysYear && record.monthIndex > sysMonth)) {
      return 'Upcoming';
    } 
    // Rule 3: Pending - the payment is due but has not been received (within current month cycle / before due date)
    else if (state.systemDate <= dueDate) {
      return 'Pending';
    } 
    // Rule 4: Overdue - the due date has passed and a balance remains unpaid
    else {
      return 'Overdue';
    }
  }

  // Active customer accessor
  function getCurrentCustomer() {
    return state.customers.find(c => c.id === state.selectedCustomerId) || state.customers[0];
  }

  // Customer year records accessor
  function getCustomerRecords(customerId, year) {
    if (!state.paymentDb[customerId]) {
      const customer = state.customers.find(c => c.id === customerId);
      state.paymentDb[customerId] = {};
      state.paymentDb[customerId][year] = customer ? createCustomerYearPayments(customer, year) : [];
    }
    if (!state.paymentDb[customerId][year]) {
      const customer = state.customers.find(c => c.id === customerId);
      state.paymentDb[customerId][year] = customer ? createCustomerYearPayments(customer, year) : [];
    }
    return state.paymentDb[customerId][year];
  }

  // Calculate Overall Year Totals (Section 1)
  function calculateYearTotals(year) {
    let totalReceived = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let totalCollected = 0;
    let countReceived = 0;
    let countPending = 0;
    let countOverdue = 0;
    let countPartiallyPaid = 0;

    const monthlyReceived = new Array(12).fill(0);
    const monthlyPending = new Array(12).fill(0);
    const monthlyDue = new Array(12).fill(0);

    state.customers.forEach(customer => {
      const records = getCustomerRecords(customer.id, year);
      records.forEach(rec => {
        const status = getPaymentStatus(rec);
        const due = Number(rec.amountDue) || 0;
        const paid = Number(rec.amountPaid) || 0;
        const balance = Math.max(0, due - paid);

        totalCollected += paid;
        monthlyReceived[rec.monthIndex] += paid;
        monthlyDue[rec.monthIndex] += due;

        if (status === 'Paid') {
          totalReceived += paid;
          countReceived++;
        } else if (status === 'Partially Paid') {
          totalReceived += paid;
          countPartiallyPaid++;
          if (balance > 0) {
            totalPending += balance;
            monthlyPending[rec.monthIndex] += balance;
          }
        } else if (status === 'Overdue') {
          totalOverdue += balance;
          countOverdue++;
          monthlyPending[rec.monthIndex] += balance;
        } else if (status === 'Pending') {
          totalPending += balance;
          countPending++;
          monthlyPending[rec.monthIndex] += balance;
        }
      });
    });

    return {
      totalReceived,
      totalPending,
      totalOverdue,
      totalCollected,
      countReceived,
      countPending,
      countOverdue,
      countPartiallyPaid,
      monthlyReceived,
      monthlyPending,
      monthlyDue
    };
  }

  // Setup Navigation
  function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-tab]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');
        switchTab(tab);
      });
    });
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.nav-link[data-tab]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabName}`);
    });

    // Update top breadcrumb
    const tabTitles = {
      'dashboard': 'Dashboard Overview',
      'customers': 'Customer Directory',
      'monthly-payments': 'Monthly Payments Management',
      'plans': 'Internet Plans & Vault'
    };
    const crumbEl = document.getElementById('header-active-crumb');
    if (crumbEl) {
      crumbEl.textContent = tabTitles[tabName] || tabName;
    }

    if (tabName === 'monthly-payments') {
      renderMonthlyPaymentsPage();
    } else if (tabName === 'dashboard') {
      renderDashboardOverview();
    } else if (tabName === 'customers') {
      renderCustomerDirectoryTable();
    }
  }

  // Setup Year Selectors (Section 1 & 5)
  function setupYearSelectors() {
    const yearSelect = document.getElementById('global-year-select');
    if (yearSelect) {
      yearSelect.value = state.selectedYear;
      yearSelect.addEventListener('change', (e) => {
        state.selectedYear = parseInt(e.target.value, 10);
        saveState();
        renderAll();
        showToast('Year Switched', `Now viewing all payment and billing records for year ${state.selectedYear}`);
      });
    }
  }

  // Setup Customer Search Bar (Section 2 & 5)
  function setupCustomerSearch() {
    const searchInput = document.getElementById('customer-search-input');
    const dropdown = document.getElementById('search-results-dropdown');
    const clearBtn = document.getElementById('search-clear-btn');

    if (!searchInput || !dropdown) return;

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (clearBtn) {
        clearBtn.style.display = query ? 'block' : 'none';
      }

      if (!query) {
        dropdown.classList.remove('show');
        return;
      }

      const matches = state.customers.filter(c => {
        return (
          c.name.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.phone.replace(/\s+/g, '').includes(query.replace(/\s+/g, ''))
        );
      });

      renderSearchResults(matches, query, dropdown);
    });

    searchInput.addEventListener('focus', () => {
      const query = searchInput.value.trim().toLowerCase();
      if (query) {
        searchInput.dispatchEvent(new Event('input'));
      }
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('show');
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        dropdown.classList.remove('show');
        searchInput.focus();
      });
    }
  }

  // Render Search Dropdown Results (Section 5)
  function renderSearchResults(matches, query, dropdown) {
    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div class="search-empty-state">
          <svg class="search-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <p style="font-weight: 600; color: #1e293b;">No customer matching "${escapeHtml(query)}"</p>
          <p style="font-size: 0.78rem; margin-top: 4px;">Try searching by name, Customer ID (e.g., CV-IND-1001), email address, or 10-digit mobile number.</p>
        </div>
      `;
      dropdown.classList.add('show');
      return;
    }

    let html = `
      <div class="dropdown-header-bar">
        <span>Matching Customers (${matches.length})</span>
        <span>Click to select customer</span>
      </div>
    `;

    matches.forEach(c => {
      html += `
        <div class="search-result-item" data-customer-id="${c.id}">
          <div class="result-item-left">
            <div class="result-avatar" style="background-color: ${c.avatarBg || '#0078d4'};">
              ${c.avatar}
            </div>
            <div>
              <div class="result-name-row">
                <span class="result-customer-name">${highlightMatch(c.name, query)}</span>
                <span class="result-customer-id">${highlightMatch(c.id, query)}</span>
              </div>
              <div class="result-contact-row">
                <span>${highlightMatch(c.email, query)}</span>
                <span>•</span>
                <span>${highlightMatch(c.phone, query)}</span>
              </div>
            </div>
          </div>
          <div class="result-item-right">
            <div class="result-plan-badge">${c.planName}</div>
            <div class="result-plan-price">${formatINR(c.monthlyRental)}/mo</div>
          </div>
        </div>
      `;
    });

    dropdown.innerHTML = html;
    dropdown.classList.add('show');

    dropdown.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const custId = item.getAttribute('data-customer-id');
        selectCustomer(custId);
        dropdown.classList.remove('show');
        const searchInput = document.getElementById('customer-search-input');
        if (searchInput) searchInput.value = '';
        const clearBtn = document.getElementById('search-clear-btn');
        if (clearBtn) clearBtn.style.display = 'none';
      });
    });
  }

  function highlightMatch(text, query) {
    if (!text || !query) return text;
    const regex = new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark style="background:#FFF4CE; color:#000; padding:0 2px; border-radius:2px;">$1</mark>');
  }

  function escapeHtml(string) {
    if (!string) return '';
    return String(string)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Switch Customer
  function selectCustomer(customerId) {
    state.selectedCustomerId = customerId;
    saveState();
    renderCustomerBanner();
    renderPaymentTable();
    updateQuickCustomerChips();
    showToast('Customer Loaded', `Viewing billing records for ${getCurrentCustomer().name}`);
  }

  // Setup Quick Customer Selector Chips
  function setupQuickCustomerChips() {
    const container = document.getElementById('quick-customer-chips');
    if (!container) return;

    let html = '<span class="quick-label">Quick Switch:</span>';
    state.customers.forEach(c => {
      const isActive = c.id === state.selectedCustomerId;
      html += `
        <button class="quick-customer-chip ${isActive ? 'active' : ''}" data-cust-id="${c.id}">
          <span class="chip-dot" style="background:${c.avatarBg || '#107c41'}"></span>
          <span>${c.name} (${c.id})</span>
        </button>
      `;
    });
    container.innerHTML = html;

    container.querySelectorAll('.quick-customer-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-cust-id');
        selectCustomer(id);
      });
    });
  }

  function updateQuickCustomerChips() {
    document.querySelectorAll('.quick-customer-chip').forEach(btn => {
      const id = btn.getAttribute('data-cust-id');
      btn.classList.toggle('active', id === state.selectedCustomerId);
    });
  }

  // Setup Status Filters (Section 5)
  function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-pill[data-filter]');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.statusFilter = btn.getAttribute('data-filter');
        renderPaymentTable();
      });
    });
  }

  // ===================================================================
  // RENDER MONTHLY PAYMENTS PAGE (SECTIONS 1, 2, 4)
  // ===================================================================
  function renderMonthlyPaymentsPage() {
    renderKPIStats();
    renderOverviewChart();
    renderCustomerBanner();
    renderPaymentTable();
    setupQuickCustomerChips();
  }

  // Section 1: KPI Stats Cards
  function renderKPIStats() {
    const totals = calculateYearTotals(state.selectedYear);

    // 1. Total payments received
    const elReceivedVal = document.getElementById('stat-received-amount');
    const elReceivedCount = document.getElementById('stat-received-count');
    if (elReceivedVal) elReceivedVal.textContent = formatINR(totals.totalReceived);
    if (elReceivedCount) elReceivedCount.textContent = `${totals.countReceived} fully paid`;

    // 2. Total payments pending
    const elPendingVal = document.getElementById('stat-pending-amount');
    const elPendingCount = document.getElementById('stat-pending-count');
    if (elPendingVal) elPendingVal.textContent = formatINR(totals.totalPending);
    if (elPendingCount) elPendingCount.textContent = `${totals.countPending} months awaiting`;

    // 3. Total overdue payments
    const elOverdueVal = document.getElementById('stat-overdue-amount');
    const elOverdueCount = document.getElementById('stat-overdue-count');
    if (elOverdueVal) elOverdueVal.textContent = formatINR(totals.totalOverdue);
    if (elOverdueCount) elOverdueCount.textContent = `${totals.countOverdue} months overdue`;

    // 4. Total amount collected this year
    const elCollectedVal = document.getElementById('stat-collected-amount');
    const elCollectedYear = document.getElementById('stat-collected-year');
    if (elCollectedVal) elCollectedVal.textContent = formatINR(totals.totalCollected);
    if (elCollectedYear) elCollectedYear.textContent = `All payments in ${state.selectedYear}`;
  }

  // Section 1: Monthly Payment Overview Chart (Jan to Dec)
  function renderOverviewChart() {
    const chartContainer = document.getElementById('monthly-overview-chart');
    if (!chartContainer) return;

    const totals = calculateYearTotals(state.selectedYear);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let maxVal = 10000;
    for (let i = 0; i < 12; i++) {
      const monthSum = (totals.monthlyReceived[i] || 0) + (totals.monthlyPending[i] || 0);
      if (monthSum > maxVal) maxVal = monthSum;
    }
    maxVal = Math.ceil(maxVal / 10000) * 10000;

    const svgWidth = 1000;
    const svgHeight = 240;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;
    const chartW = svgWidth - paddingLeft - paddingRight;
    const chartH = svgHeight - paddingTop - paddingBottom;
    const colWidth = chartW / 12;
    const barWidth = 32;

    let svg = `<svg class="svg-chart-container" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="none">`;

    // Background horizontal grid lines
    const gridLines = 4;
    for (let g = 0; g <= gridLines; g++) {
      const yVal = (maxVal / gridLines) * g;
      const yPos = paddingTop + chartH - (g * (chartH / gridLines));
      svg += `
        <line x1="${paddingLeft}" y1="${yPos}" x2="${svgWidth - paddingRight}" y2="${yPos}" class="chart-grid-line" />
        <text x="${paddingLeft - 10}" y="${yPos + 4}" text-anchor="end" class="chart-tick-label">${formatINR(yVal)}</text>
      `;
    }

    // Baseline
    svg += `<line x1="${paddingLeft}" y1="${paddingTop + chartH}" x2="${svgWidth - paddingRight}" y2="${paddingTop + chartH}" class="chart-axis-line" />`;

    // Draw monthly bars
    for (let i = 0; i < 12; i++) {
      const xCenter = paddingLeft + (i * colWidth) + (colWidth / 2);
      const xBar = xCenter - (barWidth / 2);

      const received = totals.monthlyReceived[i] || 0;
      const pending = totals.monthlyPending[i] || 0;

      const receivedHeight = (received / maxVal) * chartH;
      const pendingHeight = (pending / maxVal) * chartH;

      const yReceived = paddingTop + chartH - receivedHeight;
      const yPending = yReceived - pendingHeight;

      if (pending > 0) {
        svg += `
          <rect x="${xBar}" y="${yPending}" width="${barWidth}" height="${pendingHeight}" rx="3" class="chart-bar-pending">
            <title>${MONTH_NAMES[i]} ${state.selectedYear}&#10;Pending/Overdue: ${formatINR(pending)}</title>
          </rect>
        `;
      }

      if (received > 0) {
        svg += `
          <rect x="${xBar}" y="${yReceived}" width="${barWidth}" height="${receivedHeight}" rx="3" class="chart-bar-received">
            <title>${MONTH_NAMES[i]} ${state.selectedYear}&#10;Collected: ${formatINR(received)}</title>
          </rect>
        `;
      }

      svg += `
        <text x="${xCenter}" y="${svgHeight - 14}" text-anchor="middle" class="chart-tick-label" style="font-weight: 600;">
          ${months[i]}
        </text>
      `;
    }

    svg += '</svg>';
    chartContainer.innerHTML = svg;
  }

  // Section 2: Selected Customer Banner
  function renderCustomerBanner() {
    const customer = getCurrentCustomer();
    if (!customer) return;

    const nameEl = document.getElementById('selected-cust-name');
    const idEl = document.getElementById('selected-cust-id');
    const emailEl = document.getElementById('selected-cust-email');
    const phoneEl = document.getElementById('selected-cust-phone');
    const avatarEl = document.getElementById('selected-cust-avatar');
    const planNameEl = document.getElementById('selected-cust-plan-name');
    const planRentalEl = document.getElementById('selected-cust-rental');
    const storageEl = document.getElementById('selected-cust-storage');

    if (nameEl) nameEl.textContent = customer.name;
    if (idEl) idEl.textContent = customer.id;
    if (emailEl) emailEl.textContent = customer.email;
    if (phoneEl) phoneEl.textContent = customer.phone;
    if (avatarEl) {
      avatarEl.textContent = customer.avatar;
      avatarEl.style.backgroundColor = customer.avatarBg || '#0078d4';
    }
    if (planNameEl) planNameEl.textContent = customer.planName;
    if (planRentalEl) planRentalEl.textContent = `${formatINR(customer.monthlyRental)} / month`;
    if (storageEl) storageEl.textContent = customer.storageQuota || 'Cloud Vault Active';

    updateFilterCounts();
  }

  function updateFilterCounts() {
    const customer = getCurrentCustomer();
    const records = getCustomerRecords(customer.id, state.selectedYear);

    let countAll = records.length;
    let countPaid = 0;
    let countPartial = 0;
    let countPending = 0;
    let countOverdue = 0;

    records.forEach(r => {
      const st = getPaymentStatus(r);
      if (st === 'Paid') countPaid++;
      else if (st === 'Partially Paid') countPartial++;
      else if (st === 'Pending') countPending++;
      else if (st === 'Overdue') countOverdue++;
    });

    const setBadge = (id, count) => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    };

    setBadge('count-filter-all', countAll);
    setBadge('count-filter-paid', countPaid);
    setBadge('count-filter-partial', countPartial);
    setBadge('count-filter-pending', countPending);
    setBadge('count-filter-overdue', countOverdue);
  }

  // Section 2, 4 & 5: Monthly Payment Table (January to December)
  function renderPaymentTable() {
    const tableBody = document.getElementById('payment-table-body');
    const footerDue = document.getElementById('table-foot-total-due');
    const footerPaid = document.getElementById('table-foot-total-paid');
    const footerBalance = document.getElementById('table-foot-total-balance');

    if (!tableBody) return;

    const customer = getCurrentCustomer();
    const records = getCustomerRecords(customer.id, state.selectedYear);

    let totalYearDue = 0;
    let totalYearPaid = 0;
    let visibleRows = 0;

    let html = '';

    records.forEach(record => {
      const status = getPaymentStatus(record);
      const due = Number(record.amountDue) || 0;
      const paid = Number(record.amountPaid) || 0;
      const balance = Math.max(0, due - paid);

      totalYearDue += due;
      totalYearPaid += paid;

      // Filter check (Section 5)
      if (state.statusFilter !== 'ALL') {
        if (state.statusFilter === 'Paid' && status !== 'Paid') return;
        if (state.statusFilter === 'Partially Paid' && status !== 'Partially Paid') return;
        if (state.statusFilter === 'Pending' && status !== 'Pending') return;
        if (state.statusFilter === 'Overdue' && status !== 'Overdue') return;
      }

      visibleRows++;

      // Latest payment date display (Rule 4)
      let displayPaymentDate = '—';
      if (record.transactions && record.transactions.length > 0) {
        const sorted = [...record.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        displayPaymentDate = formatDisplayDate(sorted[0].date);
      } else if (status === 'Paid') {
        displayPaymentDate = formatDisplayDate(record.dueDate);
      }

      // Status Badge Style
      let statusBadgeClass = 'badge-pending';
      if (status === 'Paid') statusBadgeClass = 'badge-paid';
      else if (status === 'Partially Paid') statusBadgeClass = 'badge-partially-paid';
      else if (status === 'Overdue') statusBadgeClass = 'badge-overdue';
      else if (status === 'Upcoming') statusBadgeClass = 'badge-upcoming';

      // Amount paid text color
      let paidColorClass = 'amount-paid-zero';
      if (status === 'Paid') paidColorClass = 'amount-paid-full';
      else if (status === 'Partially Paid') paidColorClass = 'amount-paid-partial';

      // Action Buttons (View, Record / Pay Balance, Edit)
      let actionButtons = '';
      if (status === 'Paid') {
        actionButtons = `
          <button class="btn-action-view" onclick="window.ClientVault.openReceiptModal('${record.customerId}', ${record.year}, ${record.monthIndex})">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            View
          </button>
        `;
      } else if (status === 'Partially Paid') {
        actionButtons = `
          <button class="btn-action-view" onclick="window.ClientVault.openReceiptModal('${record.customerId}', ${record.year}, ${record.monthIndex})">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            View
          </button>
          <button class="btn-action-record" onclick="window.ClientVault.openRecordPaymentModal('${record.customerId}', ${record.year}, ${record.monthIndex})">
            + Pay
          </button>
        `;
      } else {
        // Pending, Overdue, Upcoming
        actionButtons = `
          <button class="btn-action-record" onclick="window.ClientVault.openRecordPaymentModal('${record.customerId}', ${record.year}, ${record.monthIndex})">
            Record
          </button>
        `;
      }

      html += `
        <tr>
          <td>
            <div class="month-cell">
              <span class="month-icon-tag">${record.monthName.substring(0, 3)}</span>
              <span>${record.monthName}</span>
            </div>
          </td>
          <td class="text-right">
            <span class="amount-due-text">${formatINR(due)}</span>
          </td>
          <td class="text-right">
            <span class="amount-paid-text ${paidColorClass}">${formatINR(paid)}</span>
          </td>
          <td class="text-right">
            <span style="font-weight: 700; color: ${balance > 0 ? '#a80000' : '#107c41'};">
              ${formatINR(balance)}
            </span>
          </td>
          <td>
            <span class="date-text ${displayPaymentDate === '—' ? 'date-dash' : ''}">${displayPaymentDate}</span>
          </td>
          <td>
            <span class="date-text">${formatDisplayDate(record.dueDate)}</span>
          </td>
          <td>
            <span class="status-badge ${statusBadgeClass}">${status}</span>
          </td>
          <td class="text-right">
            <div class="table-action-group">
              ${actionButtons}
            </div>
          </td>
        </tr>
      `;
    });

    if (visibleRows === 0) {
      html = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2.5rem; color: #64748b;">
            <p style="font-weight: 600;">No payment records match the "${state.statusFilter}" filter for ${customer.name}.</p>
            <button class="btn btn-sm btn-outline" style="margin-top: 0.5rem;" onclick="window.ClientVault.resetStatusFilter()">Show All Months</button>
          </td>
        </tr>
      `;
    }

    tableBody.innerHTML = html;

    const totalYearBalance = Math.max(0, totalYearDue - totalYearPaid);
    if (footerDue) footerDue.textContent = formatINR(totalYearDue);
    if (footerPaid) footerPaid.textContent = formatINR(totalYearPaid);
    if (footerBalance) footerBalance.textContent = formatINR(totalYearBalance);
  }

  // ===================================================================
  // SECTION 3: PAYMENT RECORDING MODAL & PARTIAL PAYMENT LOGIC
  // ===================================================================
  function setupPaymentModal() {
    const modal = document.getElementById('record-payment-modal');
    const form = document.getElementById('record-payment-form');
    const cancelBtn = document.getElementById('btn-cancel-payment');
    const closeBtn = document.getElementById('btn-close-payment-modal');
    const genRefBtn = document.getElementById('btn-generate-ref');
    const monthSelect = document.getElementById('pay-month-select');

    if (!modal || !form) return;

    const closeModal = () => {
      modal.classList.remove('show');
      state.editingTxnId = null;
      state.editingRecordMeta = null;
    };

    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
    });

    // Handle Month Selection Change inside modal
    if (monthSelect) {
      monthSelect.addEventListener('change', () => {
        const custId = form.elements['customerId'].value;
        const yr = parseInt(form.elements['year'].value, 10);
        const mIdx = parseInt(monthSelect.value, 10);
        updateModalMonthContext(custId, yr, mIdx);
      });
    }

    // Auto-generate Reference helper
    if (genRefBtn) {
      genRefBtn.addEventListener('click', () => {
        const method = form.elements['paymentMethod'].value || 'UPI';
        const rand = Math.floor(100000 + Math.random() * 900000);
        const refField = document.getElementById('pay-ref-input');
        if (refField) {
          if (method === 'UPI') refField.value = `UPI/${rand}/HDFC`;
          else if (method === 'Bank Transfer') refField.value = `NEFT-SBIN-${rand}`;
          else if (method === 'Card') refField.value = `CARD-VISA-${rand}`;
          else refField.value = `CASH-REC-${rand}`;
        }
      });
    }

    // Quick Amount Chips
    document.querySelectorAll('.amount-quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const type = chip.getAttribute('data-amount-type');
        const remaining = Number(chip.getAttribute('data-remaining-val')) || 0;
        const amountInput = document.getElementById('pay-amount-input');
        if (!amountInput) return;

        if (type === 'full') {
          amountInput.value = remaining;
        } else if (type === 'half') {
          amountInput.value = Math.max(1, Math.round(remaining / 2));
        }
      });
    });

    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handlePaymentFormSubmit(form);
    });
  }

  function updateModalMonthContext(customerId, year, monthIndex) {
    const customer = state.customers.find(c => c.id === customerId);
    const records = getCustomerRecords(customerId, year);
    const record = records[monthIndex];
    if (!customer || !record) return;

    const amountDue = Number(record.amountDue) || 0;
    const amountPaid = Number(record.amountPaid) || 0;
    const remainingBalance = Math.max(0, amountDue - amountPaid);

    document.getElementById('pay-due-display').textContent = formatINR(amountDue);
    document.getElementById('pay-balance-display').textContent = formatINR(remainingBalance);

    document.querySelectorAll('.amount-quick-chip').forEach(c => {
      c.setAttribute('data-remaining-val', remainingBalance);
    });

    const amountInput = document.getElementById('pay-amount-input');
    if (!state.editingTxnId) {
      amountInput.value = remainingBalance > 0 ? remainingBalance : amountDue;
    }
  }

  function openRecordPaymentModal(customerId, year, monthIndex, editTxnId = null) {
    const customer = state.customers.find(c => c.id === customerId);
    if (!customer) return;

    const records = getCustomerRecords(customerId, year);
    const record = records[monthIndex];
    if (!record) return;

    const modal = document.getElementById('record-payment-modal');
    const form = document.getElementById('record-payment-form');
    if (!modal || !form) return;

    state.editingTxnId = editTxnId;
    state.editingRecordMeta = { customerId, year, monthIndex };

    // Set Customer Context
    document.getElementById('modal-cust-name').textContent = customer.name;
    document.getElementById('modal-cust-id').textContent = customer.id;
    document.getElementById('modal-cust-avatar').textContent = customer.avatar;
    document.getElementById('modal-cust-avatar').style.backgroundColor = customer.avatarBg || '#0078d4';

    form.elements['customerId'].value = customerId;
    form.elements['year'].value = year;

    const monthSelect = document.getElementById('pay-month-select');
    if (monthSelect) {
      monthSelect.value = monthIndex;
    }

    updateModalMonthContext(customerId, year, monthIndex);

    // If Editing an Existing Transaction
    if (editTxnId) {
      const txn = record.transactions.find(t => t.id === editTxnId);
      if (txn) {
        document.getElementById('pay-amount-input').value = txn.amount;
        document.getElementById('pay-date-input').value = txn.date;
        document.getElementById('pay-ref-input').value = txn.reference || '';
        document.getElementById('pay-notes-input').value = txn.notes || '';
        form.elements['paymentMethod'].value = txn.method || 'UPI';
        document.getElementById('btn-save-payment').textContent = 'Update Payment';
      }
    } else {
      // New Payment defaults
      const yyyy = state.systemDate.getFullYear();
      const mm = String(state.systemDate.getMonth() + 1).padStart(2, '0');
      const dd = String(state.systemDate.getDate()).padStart(2, '0');
      document.getElementById('pay-date-input').value = `${yyyy}-${mm}-${dd}`;
      document.getElementById('pay-ref-input').value = '';
      document.getElementById('pay-notes-input').value = '';
      form.elements['paymentMethod'].value = 'UPI';
      document.getElementById('btn-save-payment').textContent = 'Save Payment';
    }

    modal.classList.add('show');
  }

  function handlePaymentFormSubmit(form) {
    const customerId = form.elements['customerId'].value;
    const year = parseInt(form.elements['year'].value, 10);
    const monthIndex = parseInt(document.getElementById('pay-month-select').value, 10);
    const payingAmount = Number(form.elements['amountPaid'].value);
    const payDate = form.elements['paymentDate'].value;
    const method = form.elements['paymentMethod'].value;
    const reference = form.elements['reference'].value.trim();
    const notes = form.elements['notes'].value.trim();

    const customer = state.customers.find(c => c.id === customerId);
    const records = getCustomerRecords(customerId, year);
    const record = records[monthIndex];

    if (!record) return;

    if (payingAmount <= 0) {
      showToast('Invalid Amount', 'Please enter a valid payment amount greater than ₹0.', 'error');
      return;
    }

    // Check duplicate reference entry
    if (reference) {
      const isDuplicate = record.transactions.some(t => {
        if (state.editingTxnId && t.id === state.editingTxnId) return false;
        return t.reference && t.reference.toLowerCase() === reference.toLowerCase();
      });
      if (isDuplicate) {
        showToast('Duplicate Transaction', `Transaction reference "${reference}" already exists for this payment.`, 'error');
        return;
      }
    }

    // Handle Edit vs New
    if (state.editingTxnId) {
      const txn = record.transactions.find(t => t.id === state.editingTxnId);
      if (txn) {
        txn.amount = payingAmount;
        txn.date = payDate;
        txn.method = method;
        txn.reference = reference;
        txn.notes = notes;
      }
      state.editingTxnId = null;
      state.editingRecordMeta = null;
    } else {
      // New Transaction
      const newTxn = {
        id: `TXN-${year}${String(monthIndex + 1).padStart(2, '0')}${String(record.transactions.length + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`,
        amount: payingAmount,
        date: payDate,
        method: method,
        reference: reference || `REF-${Date.now().toString().slice(-6)}`,
        notes: notes || `Payment recorded for ${MONTH_NAMES[monthIndex]} ${year}`,
        recordedAt: new Date().toISOString()
      };
      record.transactions.push(newTxn);
    }

    // Recalculate amountPaid dynamically from all transactions
    record.amountPaid = record.transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    saveState();

    // Close modal
    document.getElementById('record-payment-modal').classList.remove('show');

    // Update UI immediately
    renderAll();

    const newStatus = getPaymentStatus(record);
    const msg = `Payment of ${formatINR(payingAmount)} saved via ${method} for ${customer.name} (${MONTH_NAMES[monthIndex]} ${year}). Status: ${newStatus}.`;
    showToast('Payment Saved Successfully', msg, 'success');
  }

  // Delete transaction handler (to assist demo testing)
  function deleteTransaction(customerId, year, monthIndex, txnId) {
    if (!confirm('Remove this transaction entry? Ledger totals will automatically adjust.')) return;

    const records = getCustomerRecords(customerId, year);
    const record = records[monthIndex];
    if (!record) return;

    record.transactions = record.transactions.filter(t => t.id !== txnId);
    record.amountPaid = record.transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    saveState();
    renderAll();
    openReceiptModal(customerId, year, monthIndex);
    showToast('Transaction Removed', 'Payment entry deleted and ledger recalculated.', 'info');
  }

  // ===================================================================
  // RECEIPT & DETAILED TRANSACTION VIEW MODAL
  // ===================================================================
  function setupReceiptModal() {
    const modal = document.getElementById('receipt-view-modal');
    const closeBtn = document.getElementById('btn-close-receipt');
    const printBtn = document.getElementById('btn-print-receipt');

    if (!modal) return;

    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) {
        modal.classList.remove('show');
      }
    });
  }

  function openReceiptModal(customerId, year, monthIndex) {
    const customer = state.customers.find(c => c.id === customerId);
    const records = getCustomerRecords(customerId, year);
    const record = records[monthIndex];
    if (!customer || !record) return;

    const modal = document.getElementById('receipt-view-modal');
    const body = document.getElementById('receipt-modal-content');
    if (!modal || !body) return;

    const status = getPaymentStatus(record);
    const due = Number(record.amountDue) || 0;
    const paid = Number(record.amountPaid) || 0;
    const balance = Math.max(0, due - paid);

    let statusBadgeClass = 'badge-paid';
    if (status === 'Partially Paid') statusBadgeClass = 'badge-partially-paid';
    else if (status === 'Overdue') statusBadgeClass = 'badge-overdue';

    let transactionsHtml = '';
    if (record.transactions && record.transactions.length > 0) {
      record.transactions.forEach((t, idx) => {
        transactionsHtml += `
          <div class="timeline-item">
            <div class="timeline-bullet"></div>
            <div class="timeline-content">
              <div class="timeline-top">
                <span style="font-weight: 700; font-size: 0.88rem;">Payment #${idx + 1} (${t.method})</span>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span class="timeline-amount">${formatINR(t.amount)}</span>
                  <button class="btn-action-edit" title="Edit this transaction" onclick="window.ClientVault.editTransaction('${customerId}', ${year}, ${monthIndex}, '${t.id}')">
                    Edit
                  </button>
                  <button class="btn-action-edit" style="color: #a80000;" title="Delete this transaction" onclick="window.ClientVault.deleteTransaction('${customerId}', ${year}, ${monthIndex}, '${t.id}')">
                    ✕
                  </button>
                </div>
              </div>
              <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">
                <span>Date: <strong>${formatDisplayDate(t.date)}</strong></span> |
                <span>Ref: <code>${t.reference || 'N/A'}</code></span>
              </div>
              ${t.notes ? `<div style="font-size: 0.78rem; color: #475569; margin-top: 3px; font-style: italic;">"${escapeHtml(t.notes)}"</div>` : ''}
            </div>
          </div>
        `;
      });
    } else {
      transactionsHtml = '<p style="color: #64748b; font-size: 0.82rem;">No transaction payments recorded for this month yet.</p>';
    }

    body.innerHTML = `
      <div class="receipt-header-banner">
        <div>
          <h4>ClientVault Payment Receipt</h4>
          <p style="font-size: 0.8rem; opacity: 0.9;">Internet Provider Billing & Customer Vault</p>
        </div>
        <div class="receipt-status-pill">${status}</div>
      </div>

      <div class="receipt-meta-grid">
        <div class="receipt-meta-box">
          <div class="label">Customer</div>
          <div class="val">${customer.name}</div>
          <div style="font-size:0.75rem; color:#64748b;">${customer.id}</div>
        </div>
        <div class="receipt-meta-box">
          <div class="label">Billing Month</div>
          <div class="val">${MONTH_NAMES[monthIndex]} ${year}</div>
          <div style="font-size:0.75rem; color:#64748b;">Due Date: ${formatDisplayDate(record.dueDate)}</div>
        </div>
        <div class="receipt-meta-box">
          <div class="label">Internet Plan</div>
          <div class="val">${customer.planName}</div>
          <div style="font-size:0.75rem; color:#64748b;">IP: ${customer.ipAddress}</div>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.4rem;">
          <span style="color: #64748b;">Total Amount Billed:</span>
          <strong>${formatINR(due)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.4rem;">
          <span style="color: #64748b;">Total Amount Received:</span>
          <strong style="color: #107c41;">${formatINR(paid)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.92rem; font-weight: 700; border-top: 1px solid #cbd5e1; padding-top: 0.4rem;">
          <span>Outstanding Balance:</span>
          <span style="color: ${balance > 0 ? '#a80000' : '#107c41'};">${formatINR(balance)}</span>
        </div>
      </div>

      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h5 style="font-size: 0.9rem; font-weight: 700; color: #1e293b; margin: 0;">
            Transaction Payment History (${record.transactions.length})
          </h5>
          ${balance > 0 ? `
            <button class="btn btn-sm btn-primary" onclick="window.ClientVault.openRecordPaymentModal('${customerId}', ${year}, ${monthIndex})">
              + Pay Remaining Balance (${formatINR(balance)})
            </button>
          ` : ''}
        </div>
        <div class="txn-history-timeline">
          ${transactionsHtml}
        </div>
      </div>
    `;

    modal.classList.add('show');
  }

  function editTransaction(customerId, year, monthIndex, txnId) {
    const receiptModal = document.getElementById('receipt-view-modal');
    if (receiptModal) receiptModal.classList.remove('show');
    openRecordPaymentModal(customerId, year, monthIndex, txnId);
  }

  // ===================================================================
  // SECTION 6: CUSTOMER DIRECTORY & PROFILE DRAWER WITH PAYMENT HISTORY
  // ===================================================================
  function setupCustomerDirectory() {
    const custSearch = document.getElementById('dir-search-input');
    if (custSearch) {
      custSearch.addEventListener('input', () => {
        renderCustomerDirectoryTable();
      });
    }

    const addCustBtn = document.getElementById('btn-add-customer-open');
    if (addCustBtn) {
      addCustBtn.addEventListener('click', () => {
        showToast('Demo Ready', 'New customer registration is available in ClientVault database.', 'info');
      });
    }
  }

  function renderCustomerDirectoryTable() {
    const tableBody = document.getElementById('customer-dir-table-body');
    const searchInput = document.getElementById('dir-search-input');
    if (!tableBody) return;

    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filtered = state.customers.filter(c => {
      if (!query) return true;
      return c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query) || c.phone.includes(query);
    });

    let html = '';
    filtered.forEach(c => {
      const records = getCustomerRecords(c.id, state.selectedYear);
      let paidCount = 0;
      let overdueCount = 0;
      records.forEach(r => {
        const st = getPaymentStatus(r);
        if (st === 'Paid') paidCount++;
        else if (st === 'Overdue') overdueCount++;
      });

      html += `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="result-avatar" style="background-color: ${c.avatarBg || '#0078d4'}; width: 34px; height: 34px; font-size: 0.78rem;">
                ${c.avatar}
              </div>
              <div>
                <strong style="color: #1e293b; display: block; font-size: 0.88rem;">${c.name}</strong>
                <span style="font-size: 0.75rem; color: #0078d4; font-weight: 600;">${c.id}</span>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size: 0.82rem; color: #475569;">${c.email}</div>
            <div style="font-size: 0.75rem; color: #64748b;">${c.phone}</div>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 0.82rem;">${c.planName}</div>
            <div style="font-size: 0.75rem; color: #107c41; font-weight: 700;">${formatINR(c.monthlyRental)}/mo</div>
          </td>
          <td>
            <div style="font-size: 0.82rem; color: #1e293b;">${c.storageQuota}</div>
            <div style="font-size: 0.75rem; color: #64748b;">Used: ${c.storageUsed}</div>
          </td>
          <td>
            <span class="status-badge badge-paid" style="font-size: 0.72rem; padding: 2px 7px;">${c.connectionStatus}</span>
          </td>
          <td>
            <div style="font-size: 0.78rem;">
              <span style="color: #107c41; font-weight: 700;">${paidCount} Paid</span> /
              <span style="color: ${overdueCount > 0 ? '#a80000' : '#64748b'}; font-weight: 600;">${overdueCount} Overdue</span>
            </div>
          </td>
          <td class="text-right">
            <button class="btn-action-view" onclick="window.ClientVault.openCustomerProfileModal('${c.id}')">
              View Profile
            </button>
            <button class="btn-action-record" onclick="window.ClientVault.jumpToCustomerPayments('${c.id}')" style="margin-left: 4px;">
              Payments
            </button>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  }

  // Section 6: Customer Profile Modal with Payment History Tab
  function openCustomerProfileModal(customerId, defaultTab = 'payments') {
    const customer = state.customers.find(c => c.id === customerId);
    if (!customer) return;

    const modal = document.getElementById('customer-profile-modal');
    const content = document.getElementById('customer-profile-content');
    if (!modal || !content) return;

    const records = getCustomerRecords(customerId, state.selectedYear);

    let totalDue = 0;
    let totalPaid = 0;
    let countPaid = 0;
    let countPartial = 0;
    let countPending = 0;
    let countOverdue = 0;

    records.forEach(r => {
      const st = getPaymentStatus(r);
      const due = Number(r.amountDue) || 0;
      const paid = Number(r.amountPaid) || 0;
      totalDue += due;
      totalPaid += paid;

      if (st === 'Paid') countPaid++;
      else if (st === 'Partially Paid') countPartial++;
      else if (st === 'Pending') countPending++;
      else if (st === 'Overdue') countOverdue++;
    });

    const totalBalance = Math.max(0, totalDue - totalPaid);

    content.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; background: #f8fafc; padding: 1.25rem; border-radius: 8px; border: 1px solid #e2e8f0; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div class="result-avatar" style="background-color: ${customer.avatarBg || '#0078d4'}; width: 50px; height: 50px; font-size: 1.1rem;">
            ${customer.avatar}
          </div>
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 700; color: #1e293b;">${customer.name}</h3>
            <div style="display: flex; gap: 0.75rem; font-size: 0.8rem; color: #64748b; margin-top: 2px; flex-wrap: wrap;">
              <span>ID: <strong style="color: #0078d4;">${customer.id}</strong></span> |
              <span>${customer.email}</span> |
              <span>${customer.phone}</span>
            </div>
          </div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="window.ClientVault.jumpToCustomerPayments('${customer.id}')">
          Open in Monthly Payments &rarr;
        </button>
      </div>

      <!-- Profile Tabs -->
      <div class="profile-tab-nav">
        <button class="profile-tab-btn ${defaultTab === 'payments' ? 'active' : ''}" id="p-tab-btn-pay" onclick="window.ClientVault.toggleProfileInnerTab('payments')">
          Payment History (${state.selectedYear})
        </button>
        <button class="profile-tab-btn ${defaultTab === 'details' ? 'active' : ''}" id="p-tab-btn-det" onclick="window.ClientVault.toggleProfileInnerTab('details')">
          Connection & Vault Storage
        </button>
      </div>

      <!-- Section 6: Payment History Tab Pane -->
      <div id="p-tab-content-payments" style="${defaultTab === 'payments' ? 'display: block;' : 'display: none;'}">
        <!-- 4 Metric Counters -->
        <div class="customer-history-metrics-row">
          <div class="metric-pill-card">
            <div class="count" style="color: #0078d4;">${formatINR(totalDue)}</div>
            <div class="lbl">Total Due (${state.selectedYear})</div>
          </div>
          <div class="metric-pill-card">
            <div class="count" style="color: #107c41;">${formatINR(totalPaid)}</div>
            <div class="lbl">Total Paid</div>
          </div>
          <div class="metric-pill-card">
            <div class="count" style="color: ${totalBalance > 0 ? '#a80000' : '#107c41'};">${formatINR(totalBalance)}</div>
            <div class="lbl">Outstanding Balance</div>
          </div>
          <div class="metric-pill-card">
            <div class="count" style="font-size: 1.15rem; color: #475569;">
              <span style="color: #107c41;">${countPaid}P</span> •
              <span style="color: #b74700;">${countPartial}PP</span> •
              <span style="color: #0078d4;">${countPending}Pnd</span> •
              <span style="color: #a80000;">${countOverdue}Ovd</span>
            </div>
            <div class="lbl">Monthly Breakdown</div>
          </div>
        </div>

        <!-- 12-Month Table -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-height: 380px; overflow-y: auto;">
          <table class="payment-table" style="font-size: 0.82rem;">
            <thead>
              <tr>
                <th>Month</th>
                <th class="text-right">Due</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Balance</th>
                <th>Due Date</th>
                <th>Payment Date</th>
                <th>Status</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              ${records.map(r => {
                const st = getPaymentStatus(r);
                const bal = Math.max(0, r.amountDue - r.amountPaid);
                let stClass = 'badge-pending';
                if (st === 'Paid') stClass = 'badge-paid';
                else if (st === 'Partially Paid') stClass = 'badge-partially-paid';
                else if (st === 'Overdue') stClass = 'badge-overdue';
                else if (st === 'Upcoming') stClass = 'badge-upcoming';

                let payDate = '—';
                if (r.transactions && r.transactions.length > 0) {
                  const sorted = [...r.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
                  payDate = formatDisplayDate(sorted[0].date);
                }

                return `
                  <tr style="cursor: pointer;" onclick="window.ClientVault.openReceiptModal('${customer.id}', ${r.year}, ${r.monthIndex})">
                    <td style="font-weight: 600;">${r.monthName}</td>
                    <td class="text-right">${formatINR(r.amountDue)}</td>
                    <td class="text-right" style="font-weight: 700; color: ${st === 'Paid' ? '#107c41' : (st === 'Partially Paid' ? '#b74700' : '#64748b')};">
                      ${formatINR(r.amountPaid)}
                    </td>
                    <td class="text-right" style="font-weight: 700; color: ${bal > 0 ? '#a80000' : '#107c41'};">
                      ${formatINR(bal)}
                    </td>
                    <td>${formatDisplayDate(r.dueDate)}</td>
                    <td>${payDate}</td>
                    <td><span class="status-badge ${stClass}" style="font-size: 0.7rem;">${st}</span></td>
                    <td class="text-right">
                      <span style="color: #0078d4; font-weight: 600; font-size: 0.75rem;">View Transactions &rarr;</span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Details Tab Pane -->
      <div id="p-tab-content-details" style="${defaultTab === 'details' ? 'display: block;' : 'display: none;'}">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
          <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h5 style="font-weight: 700; font-size: 0.88rem; margin-bottom: 0.5rem;">Connection Specifications</h5>
            <p style="font-size: 0.82rem; margin-bottom: 4px;"><strong>IP Address:</strong> ${customer.ipAddress}</p>
            <p style="font-size: 0.82rem; margin-bottom: 4px;"><strong>Plan:</strong> ${customer.planName}</p>
            <p style="font-size: 0.82rem; margin-bottom: 4px;"><strong>Monthly Fee:</strong> ${formatINR(customer.monthlyRental)}</p>
            <p style="font-size: 0.82rem;"><strong>Billing Cycle:</strong> 10th of every month</p>
          </div>
          <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h5 style="font-weight: 700; font-size: 0.88rem; margin-bottom: 0.5rem;">Azure Cloud Vault Quota</h5>
            <p style="font-size: 0.82rem; margin-bottom: 4px;"><strong>Allocated Quota:</strong> ${customer.storageQuota}</p>
            <p style="font-size: 0.82rem; margin-bottom: 4px;"><strong>Space Used:</strong> ${customer.storageUsed}</p>
            <p style="font-size: 0.82rem; margin-bottom: 4px;"><strong>Account Status:</strong> <span style="color: #107c41; font-weight: 700;">${customer.connectionStatus}</span></p>
            <p style="font-size: 0.82rem;"><strong>Installation Date:</strong> ${customer.joinedDate || '2024'}</p>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('show');

    const closeBtn = document.getElementById('btn-close-profile-modal');
    if (closeBtn) {
      closeBtn.onclick = () => modal.classList.remove('show');
    }
  }

  function toggleProfileInnerTab(tab) {
    const payContent = document.getElementById('p-tab-content-payments');
    const detContent = document.getElementById('p-tab-content-details');
    const payBtn = document.getElementById('p-tab-btn-pay');
    const detBtn = document.getElementById('p-tab-btn-det');

    if (tab === 'payments') {
      if (payContent) payContent.style.display = 'block';
      if (detContent) detContent.style.display = 'none';
      if (payBtn) payBtn.classList.add('active');
      if (detBtn) detBtn.classList.remove('active');
    } else {
      if (payContent) payContent.style.display = 'none';
      if (detContent) detContent.style.display = 'block';
      if (payBtn) payBtn.classList.remove('active');
      if (detBtn) detBtn.classList.add('active');
    }
  }

  function jumpToCustomerPayments(customerId) {
    const modal = document.getElementById('customer-profile-modal');
    if (modal) modal.classList.remove('show');

    selectCustomer(customerId);
    switchTab('monthly-payments');
  }

  // ===================================================================
  // DASHBOARD OVERVIEW RENDER
  // ===================================================================
  function renderDashboardOverview() {
    const totals = calculateYearTotals(state.selectedYear);

    const dCustCount = document.getElementById('dash-cust-count');
    const dRevCollected = document.getElementById('dash-rev-collected');
    const dPendingAmt = document.getElementById('dash-pending-amt');
    const dCollectionRate = document.getElementById('dash-collection-rate');

    const totalBilled = totals.totalCollected + totals.totalPending + totals.totalOverdue;
    const rate = totalBilled > 0 ? Math.round((totals.totalCollected / totalBilled) * 100) : 100;

    if (dCustCount) dCustCount.textContent = state.customers.length;
    if (dRevCollected) dRevCollected.textContent = formatINR(totals.totalCollected);
    if (dPendingAmt) dPendingAmt.textContent = formatINR(totals.totalPending + totals.totalOverdue);
    if (dCollectionRate) dCollectionRate.textContent = `${rate}%`;

    const feed = document.getElementById('dash-recent-payments-feed');
    if (feed) {
      const allTxns = [];
      state.customers.forEach(c => {
        const records = getCustomerRecords(c.id, state.selectedYear);
        records.forEach(r => {
          if (r.transactions) {
            r.transactions.forEach(t => {
              allTxns.push({
                ...t,
                customerName: c.name,
                customerId: c.id,
                monthName: r.monthName,
                year: r.year
              });
            });
          }
        });
      });

      allTxns.sort((a, b) => new Date(b.date) - new Date(a.date));

      let feedHtml = '';
      allTxns.slice(0, 6).forEach(t => {
        feedHtml += `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 32px; height: 32px; border-radius: 6px; background: #eff6fc; color: #0078d4; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem;">
                ${t.method.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <strong style="font-size: 0.85rem; color: #1e293b;">${t.customerName}</strong>
                <div style="font-size: 0.75rem; color: #64748b;">${t.monthName} ${t.year} • Ref: ${t.reference}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700; color: #107c41; font-size: 0.9rem;">+${formatINR(t.amount)}</div>
              <div style="font-size: 0.72rem; color: #64748b;">${formatDisplayDate(t.date)}</div>
            </div>
          </div>
        `;
      });

      feed.innerHTML = feedHtml || '<p style="color: #64748b; font-size: 0.85rem;">No payment transactions logged yet.</p>';
    }
  }

  // ===================================================================
  // DEMO & EXPORT TOOLS
  // ===================================================================
  function setupDemoHelpers() {
    const resetBtn = document.getElementById('btn-reset-demo-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset ClientVault to clean demo workshop state? Any added payments will be restored to default values.')) {
          localStorage.removeItem(STORAGE_KEY);
          loadState();
          renderAll();
          showToast('Data Reset', 'Demo database restored to default workshop state.', 'info');
        }
      });
    }

    const exportBtn = document.getElementById('btn-export-payments');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        exportPaymentsCSV();
      });
    }

    const openModalBtn = document.getElementById('btn-open-record-modal-hero');
    if (openModalBtn) {
      openModalBtn.addEventListener('click', () => {
        // Open for current customer and October (index 9) by default
        openRecordPaymentModal(state.selectedCustomerId, state.selectedYear, 9);
      });
    }
  }

  function exportPaymentsCSV() {
    const customer = getCurrentCustomer();
    const records = getCustomerRecords(customer.id, state.selectedYear);

    let csv = 'Month,Amount Due,Amount Paid,Remaining Balance,Payment Date,Due Date,Status,Transactions\n';
    records.forEach(r => {
      const st = getPaymentStatus(r);
      const bal = Math.max(0, r.amountDue - r.amountPaid);
      let payDate = '—';
      if (r.transactions && r.transactions.length > 0) {
        payDate = r.transactions[r.transactions.length - 1].date;
      }
      csv += `"${r.monthName}","${r.amountDue}","${r.amountPaid}","${bal}","${payDate}","${r.dueDate}","${st}","${r.transactions.length}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ClientVault_${customer.id}_${state.selectedYear}_Payments.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export Generated', `Payment records exported for ${customer.name}`);
  }

  // Toast Notifications
  function showToast(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = `
      <svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `;
    if (type === 'error') {
      iconSvg = `
        <svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `;
    } else if (type === 'info') {
      iconSvg = `
        <svg class="toast-icon" fill="none" stroke="#0078d4" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-body">
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Master Render
  function renderAll() {
    renderMonthlyPaymentsPage();
    renderDashboardOverview();
    renderCustomerDirectoryTable();
  }

  // Public API for inline onclicks & global hooks
  window.ClientVault = {
    selectCustomer,
    openRecordPaymentModal,
    openReceiptModal,
    openCustomerProfileModal,
    toggleProfileInnerTab,
    jumpToCustomerPayments,
    editTransaction,
    deleteTransaction,
    resetStatusFilter: () => {
      state.statusFilter = 'ALL';
      document.querySelectorAll('.filter-pill[data-filter]').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-filter') === 'ALL');
      });
      renderPaymentTable();
    },
    showToast
  };

  // Bootstrap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
