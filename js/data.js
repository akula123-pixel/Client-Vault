/**
 * ClientVault ISP - Customer Data & Monthly Billing Management System
 * Local Data Store & Default State
 */

const SYSTEM_DATE = new Date(2026, 9, 27); // 27 October 2026 (Local time context)

const DEFAULT_PLANS = [
  { id: 'bronze-50', name: 'Fiber Bronze 50 Mbps', speed: '50 Mbps', quota: '100 GB Cloud Vault', price: 999, ipType: 'Dynamic' },
  { id: 'silver-100', name: 'Fiber Silver 100 Mbps', speed: '100 Mbps', quota: '250 GB Cloud Vault', price: 1999, ipType: 'Dynamic' },
  { id: 'gold-200', name: 'Fiber Gold 200 Mbps', speed: '200 Mbps', quota: '500 GB Cloud Vault', price: 3499, ipType: 'Static IPv4' },
  { id: 'ultra-300', name: 'Fiber Ultra 300 Mbps', speed: '300 Mbps', quota: '1 TB Cloud Vault', price: 5000, ipType: 'Static IPv4' },
  { id: 'enterprise-1g', name: 'Enterprise Dedicated 1 Gbps', speed: '1 Gbps', quota: '5 TB Azure Sync', price: 15000, ipType: 'Dedicated Subnet /29' }
];

const DEFAULT_CUSTOMERS = [
  {
    id: 'CV-IND-1001',
    name: 'Ramesh Kumar',
    email: 'ramesh.kumar@outlook.com',
    phone: '+91 98450 12345',
    avatar: 'RK',
    avatarBg: '#0078D4',
    address: 'Flat 402, Azure Heights, 12th Main, Indiranagar, Bengaluru, KA - 560038',
    planId: 'ultra-300',
    planName: 'Fiber Ultra 300 Mbps',
    monthlyRental: 5000,
    ipAddress: '103.24.182.45',
    storageQuota: '1 TB Cloud Vault',
    storageUsed: '648 GB (64%)',
    connectionStatus: 'Active',
    dueDateDay: 10,
    joinedDate: '15 Jan 2024'
  },
  {
    id: 'CV-IND-1002',
    name: 'Priya Sharma',
    email: 'priya.sharma@techcloud.in',
    phone: '+91 98765 43210',
    avatar: 'PS',
    avatarBg: '#107C41',
    address: 'Villa 18, Palm Meadows, Whitefield, Bengaluru, KA - 560066',
    planId: 'gold-200',
    planName: 'Fiber Gold 200 Mbps',
    monthlyRental: 3499,
    ipAddress: '103.24.182.88',
    storageQuota: '500 GB Cloud Vault',
    storageUsed: '190 GB (38%)',
    connectionStatus: 'Active',
    dueDateDay: 10,
    joinedDate: '10 Feb 2024'
  },
  {
    id: 'CV-IND-1003',
    name: 'Rajesh Patel',
    email: 'rajesh.patel@pateltech.com',
    phone: '+91 91234 56789',
    avatar: 'RP',
    avatarBg: '#D83B01',
    address: 'B-604, Synergy Towers, SG Highway, Ahmedabad, GJ - 380054',
    planId: 'silver-100',
    planName: 'Fiber Silver 100 Mbps',
    monthlyRental: 1999,
    ipAddress: '103.24.183.12',
    storageQuota: '250 GB Cloud Vault',
    storageUsed: '215 GB (86%)',
    connectionStatus: 'Active',
    dueDateDay: 10,
    joinedDate: '22 Mar 2024'
  },
  {
    id: 'CV-IND-1004',
    name: 'Ananya Iyer',
    email: 'ananya.iyer@iyerconsulting.com',
    phone: '+91 94440 98765',
    avatar: 'AI',
    avatarBg: '#5C2D91',
    address: 'Floor 7, Express Chambers, Mount Road, Chennai, TN - 600002',
    planId: 'enterprise-1g',
    planName: 'Enterprise Dedicated 1 Gbps',
    monthlyRental: 15000,
    ipAddress: '103.24.190.101',
    storageQuota: '5 TB Azure Sync',
    storageUsed: '2.8 TB (56%)',
    connectionStatus: 'Active',
    dueDateDay: 10,
    joinedDate: '01 Nov 2023'
  },
  {
    id: 'CV-IND-1005',
    name: 'Vikram Singh',
    email: 'vikram.singh@gmail.com',
    phone: '+91 97112 34567',
    avatar: 'VS',
    avatarBg: '#008272',
    address: 'House 142, Sector 21-C, Chandigarh, PB - 160022',
    planId: 'bronze-50',
    planName: 'Fiber Bronze 50 Mbps',
    monthlyRental: 999,
    ipAddress: '103.24.184.55',
    storageQuota: '100 GB Cloud Vault',
    storageUsed: '42 GB (42%)',
    connectionStatus: 'Active',
    dueDateDay: 10,
    joinedDate: '05 May 2025'
  },
  {
    id: 'CV-IND-1006',
    name: 'Sneha Reddy',
    email: 'sneha.reddy@innovate.org',
    phone: '+91 99887 76655',
    avatar: 'SR',
    avatarBg: '#B4009E',
    address: 'Plot 89, Jubilee Hills Road No. 36, Hyderabad, TS - 500033',
    planId: 'ultra-300',
    planName: 'Fiber Ultra 300 Mbps',
    monthlyRental: 5000,
    ipAddress: '103.24.185.73',
    storageQuota: '1 TB Cloud Vault',
    storageUsed: '512 GB (51%)',
    connectionStatus: 'Active',
    dueDateDay: 10,
    joinedDate: '12 Aug 2024'
  }
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Generate monthly records for a customer for a given year.
 */
function createCustomerYearPayments(customer, year) {
  const records = [];
  const monthlyRental = customer.monthlyRental;
  const dueDay = customer.dueDateDay || 10;

  for (let m = 0; m < 12; m++) {
    const monthName = MONTH_NAMES[m];
    // For October in 2026, set dueDate to 31st Oct so it's actively "Pending" on 27 Oct 2026
    const day = (year === 2026 && m === 9) ? 31 : dueDay;
    const dueDateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    let amountPaid = 0;
    const transactions = [];

    if (customer.id === 'CV-IND-1001') {
      // Ramesh Kumar (Matching Section 2 specification with full demo status coverage)
      if (year === 2026) {
        if (m === 0) { // Jan
          amountPaid = 5000;
          transactions.push({
            id: 'TXN-20260105-01',
            amount: 5000,
            date: '2026-01-05',
            method: 'UPI',
            reference: 'UPI/600523/HDFC',
            notes: 'January internet bill via PhonePe'
          });
        } else if (m === 1) { // Feb
          amountPaid = 5000;
          transactions.push({
            id: 'TXN-20260204-01',
            amount: 5000,
            date: '2026-02-04',
            method: 'UPI',
            reference: 'UPI/603512/HDFC',
            notes: 'February subscription payment'
          });
        } else if (m === 2) { // Mar
          amountPaid = 5000;
          transactions.push({
            id: 'TXN-20260306-01',
            amount: 5000,
            date: '2026-03-06',
            method: 'Card',
            reference: 'CARD-VISA-9421',
            notes: 'March bill via HDFC Credit Card'
          });
        } else if (m === 3) { // Apr
          amountPaid = 5000;
          transactions.push({
            id: 'TXN-20260408-01',
            amount: 5000,
            date: '2026-04-08',
            method: 'Bank Transfer',
            reference: 'NEFT-SBIN-893201',
            notes: 'April corporate reimbursement'
          });
        } else if (m === 4) { // May - Partially Paid sample
          amountPaid = 2500;
          transactions.push({
            id: 'TXN-20260512-01',
            amount: 2500,
            date: '2026-05-12',
            method: 'UPI',
            reference: 'UPI/613201/GPay',
            notes: 'Part token payment (50%) for May'
          });
        } else {
          // Jun - Dec: ₹0 paid
          // Jun-Sep: Overdue (dueDate < 27 Oct 2026)
          // Oct: Pending (dueDate is 31 Oct 2026 > 27 Oct 2026)
          // Nov, Dec: Upcoming (future months)
          amountPaid = 0;
        }
      } else if (year === 2025) {
        // Complete year for testing historical switch
        amountPaid = 5000;
        const d = (m % 5) + 3;
        transactions.push({
          id: `TXN-2025${String(m + 1).padStart(2, '0')}05-01`,
          amount: 5000,
          date: `2025-${String(m + 1).padStart(2, '0')}-0${d}`,
          method: m % 2 === 0 ? 'UPI' : 'Card',
          reference: `REF-2025-${m + 1}-OK`,
          notes: `Full payment for ${monthName} 2025`
        });
      } else if (year === 2024) {
        amountPaid = 5000;
        transactions.push({
          id: `TXN-2024${String(m + 1).padStart(2, '0')}05-01`,
          amount: 5000,
          date: `2024-${String(m + 1).padStart(2, '0')}-05`,
          method: 'Bank Transfer',
          reference: `REF-2024-${m + 1}`,
          notes: `Paid in full`
        });
      }
    } else if (customer.id === 'CV-IND-1002') {
      // Priya Sharma: High on-time payer (Jan-Sep Paid, Oct Pending, Nov-Dec Upcoming in 2026)
      if (year === 2026) {
        if (m <= 8) { // Jan to Sep paid
          amountPaid = monthlyRental;
          const d = (m % 4) + 4;
          transactions.push({
            id: `TXN-2026${String(m + 1).padStart(2, '0')}0${d}-PS`,
            amount: monthlyRental,
            date: `2026-${String(m + 1).padStart(2, '0')}-0${d}`,
            method: 'UPI',
            reference: `UPI/PS${m + 1}283/ICICI`,
            notes: `Auto-debit for ${monthName}`
          });
        }
      } else {
        amountPaid = monthlyRental;
        transactions.push({
          id: `TXN-${year}${String(m + 1).padStart(2, '0')}05-PS`,
          amount: monthlyRental,
          date: `${year}-${String(m + 1).padStart(2, '0')}-05`,
          method: 'UPI',
          reference: `UPI/${year}/PS${m + 1}`,
          notes: 'Full payment'
        });
      }
    } else if (customer.id === 'CV-IND-1003') {
      // Rajesh Patel: Some partial, some overdue
      if (year === 2026) {
        if (m <= 4) { // Jan-May paid
          amountPaid = monthlyRental;
          transactions.push({
            id: `TXN-20260${m + 1}06-RP`,
            amount: monthlyRental,
            date: `2026-0${m + 1}-06`,
            method: 'Bank Transfer',
            reference: `NEFT-AXIS-${m + 1}82`,
            notes: 'Paid via Axis NetBanking'
          });
        } else if (m === 5) { // Jun partially paid
          amountPaid = 1000;
          transactions.push({
            id: 'TXN-20260608-RP',
            amount: 1000,
            date: '2026-06-08',
            method: 'Cash',
            reference: 'CASH-REC-601',
            notes: 'Part cash advance at branch'
          });
        }
      } else {
        amountPaid = monthlyRental;
        transactions.push({
          id: `TXN-${year}0${m + 1}05-RP`,
          amount: monthlyRental,
          date: `${year}-0${m + 1}-05`,
          method: 'Card',
          reference: `CARD-${year}-${m + 1}`,
          notes: 'Full payment'
        });
      }
    } else if (customer.id === 'CV-IND-1004') {
      // Ananya Iyer: Corporate Enterprise quarterly payments
      if (year === 2026) {
        if (m <= 8) { // Jan-Sep paid
          amountPaid = monthlyRental;
          transactions.push({
            id: `TXN-20260${m + 1}02-AI`,
            amount: monthlyRental,
            date: `2026-0${m + 1}-02`,
            method: 'Bank Transfer',
            reference: `RTGS-SBIN-${m + 1}992`,
            notes: 'Corporate dedicated fiber lease'
          });
        }
      } else {
        amountPaid = monthlyRental;
        transactions.push({
          id: `TXN-${year}0${m + 1}02-AI`,
          amount: monthlyRental,
          date: `${year}-0${m + 1}-02`,
          method: 'Bank Transfer',
          reference: `RTGS-CORP-${year}`,
          notes: 'Corporate lease payment'
        });
      }
    } else {
      // Vikram & Sneha
      if (year === 2026 && m <= 7) {
        amountPaid = monthlyRental;
        transactions.push({
          id: `TXN-20260${m + 1}05-${customer.avatar}`,
          amount: monthlyRental,
          date: `2026-0${m + 1}-05`,
          method: 'UPI',
          reference: `UPI/${customer.avatar}/0${m + 1}`,
          notes: 'Timely payment'
        });
      } else if (year < 2026) {
        amountPaid = monthlyRental;
        transactions.push({
          id: `TXN-${year}0${m + 1}05-${customer.avatar}`,
          amount: monthlyRental,
          date: `${year}-0${m + 1}-05`,
          method: 'Cash',
          reference: `CASH-${customer.avatar}-${year}`,
          notes: 'Paid'
        });
      }
    }

    records.push({
      customerId: customer.id,
      monthIndex: m,
      monthName: monthName,
      year: year,
      amountDue: monthlyRental,
      amountPaid: amountPaid,
      dueDate: dueDateStr,
      transactions: transactions
    });
  }

  return records;
}

/**
 * Initialize default payment database across all customers and supported years
 */
function initializeDefaultPayments(customers) {
  const paymentDb = {};
  const years = [2026, 2025, 2024];

  customers.forEach(customer => {
    paymentDb[customer.id] = {};
    years.forEach(year => {
      paymentDb[customer.id][year] = createCustomerYearPayments(customer, year);
    });
  });

  return paymentDb;
}

/**
 * Format currency into Indian Rupees (₹) with Indian number grouping
 */
function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const num = Math.round(Number(amount));
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Format date string (YYYY-MM-DD) into readable format: "05 Jan 2026"
 */
function formatDisplayDate(dateStr) {
  if (!dateStr || dateStr === '—') return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2].padStart(2, '0');
      const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${shortMonths[monthIdx]} ${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')} ${shortMonths[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}
