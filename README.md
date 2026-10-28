# ClientVault: Customer Data Storage & Monthly Payments Management Dashboard

An enterprise-grade, frontend-only Customer Management and Monthly Subscription Billing system tailored for Internet Service Providers (ISPs), styled with a Microsoft Azure cloud design language and built for college workshop demonstrations.

---

## 🌟 Overview

**ClientVault** allows broadband and cloud storage providers to manage subscribers, monitor storage allocations, and administer 12-month subscription payments with automated status calculations, real-time analytics, and instant ledger updates in Indian Rupees (₹).

---

## 🚀 How to Run

1. Open `index.html` directly in any modern web browser (Microsoft Edge, Google Chrome, Brave, Firefox, Safari):
   ```
   Double-click index.html or open:
   file:///path/to/billing system for an internet provider/index.html
   ```
2. **Zero Dependencies & Zero Setup**: The application is 100% client-side with native HTML5, CSS3, and JavaScript. No Node.js, Python, or build step required.
3. **Data Persistence**: Changes (new payments, edits, customer switches) persist in browser `localStorage`. Click **"Reset Demo Data"** at the top right at any time to restore the default workshop demonstration state.

---

## 📋 Feature Implementation Checklist

### 1. Monthly Payments Page
- [x] **Sidebar Navigation**: Dedicated **"Monthly Payments"** item with a credit card/payment icon and a `"NEW"` badge.
- [x] **Top KPI Metrics Cards**:
  - **Total Payments Received**: Live count of fully paid invoices + formatted sum in ₹.
  - **Total Payments Pending**: Live count of current-cycle pending bills + formatted sum in ₹.
  - **Total Overdue Payments**: Live count of past-due invoices + formatted overdue sum in ₹.
  - **Total Amount Collected This Year**: Grand sum of all payments collected in the selected calendar year.
- [x] **Monthly Payment Overview Chart**:
  - Interactive SVG bar chart displaying Jan through Dec collections versus pending/overdue balances.
  - Tooltips with exact rupee amounts on hover.
  - Dynamically recalculates whenever a payment is added, edited, or deleted.
- [x] **Year Selector**:
  - Dropdown supporting `2026` (Current Year), `2025` (Completed Historical Year), and `2024` (Archive).
  - Switches all dashboard metrics, charts, and customer payment tables instantly.

---

### 2. Customer Search & 12-Month Payment History
- [x] **Prominent Search Bar**:
  - Exact placeholder: `"Search customer by name, customer ID, email, or phone number..."`
  - Real-time instant search matching customer names, IDs (e.g. `CV-IND-1001`), emails, or phone numbers.
  - Dropdown results list with matching highlights, customer avatars, plan badges, and prices.
  - Clear empty state message when no customer matches.
- [x] **Quick Switch Chips**:
  - 1-click customer selector pills for live workshop presenters to seamlessly jump between client personas (`Ramesh Kumar`, `Priya Sharma`, `Rajesh Patel`, `Ananya Iyer`, `Vikram Singh`, `Sneha Reddy`).
- [x] **Selected Customer Profile Header**:
  - Customer Name with avatar badge
  - Customer ID (`CV-IND-1001`)
  - Email address (`ramesh.kumar@outlook.com`)
  - Phone number (`+91 98450 12345`)
  - Subscribed broadband plan (`Fiber Ultra 300 Mbps`)
  - Monthly rental (`₹5,000 / month`)
  - Cloud Vault storage allocation (`1 TB Cloud Vault`)
- [x] **12-Month Payment Table**:
  - Columns:
    1. **Month** (January through December with icon tag)
    2. **Amount Due** (e.g., `₹5,000`)
    3. **Amount Paid** (e.g., `₹5,000`, `₹2,500`, `₹0`)
    4. **Outstanding Balance** (e.g., `₹0`, `₹2,500`, `₹5,000`)
    5. **Payment Date** (`05 Jan 2026`, or dash `—` if unpaid, or latest date if partial)
    6. **Due Date** (`10 Jan 2026`)
    7. **Status** (`Paid`, `Partially Paid`, `Pending`, `Overdue`, `Upcoming`)
    8. **Action** (`View` / `Record` / `+ Pay`)
  - Table footer displaying Annual Totals (Total Due, Total Paid, Total Balance).

---

### 3. Payment Recording & Partial Payments
- [x] **Payment Modal Dialog**:
  - Customer Name, Avatar, and ID context
  - Payment Month & Year selector (supports all 12 months)
  - Amount Due display and remaining balance indicator
  - Amount Paid input field with currency prefix (₹)
  - Quick amount presets: **"Pay Full Balance"** and **"Pay 50% (Token)"**
  - Payment Date picker (`<input type="date">` defaulted to current date)
  - Payment Method selection: **UPI / QR**, **Debit / Card**, **Bank / NEFT**, **Cash**
  - Transaction Reference Number / UTR input (with **"Auto-Fill Ref"** demo helper)
  - Optional Notes / remarks textarea
  - **Save Payment** and **Cancel** buttons
- [x] **Validation & Duplicate Prevention**:
  - Prevents empty or zero amounts.
  - Prevents duplicate transaction reference numbers.
- [x] **Partial Payments Logic**:
  - If a customer pays less than the full monthly rental (e.g., ₹2,500 of ₹5,000), status dynamically becomes **"Partially Paid"**.
  - Calculates and displays remaining outstanding balance.
  - Allows multiple partial payments for the same month until fully settled.
- [x] **Audit Trail & Receipt**:
  - Clicking **"View"** opens the itemized Transaction History with breakdown of all payments, timestamp, method, reference, and notes.
  - Printable receipt generator (**"Print Receipt"**).
  - Edit and delete transaction entries with immediate ledger recalculation.

---

### 4. Dynamic Payment Status Rules
Status is calculated dynamically from amounts and due dates:
- **`Paid`**: `amountPaid >= amountDue` and `amountDue > 0`. Shows actual payment date.
- **`Partially Paid`**: `amountPaid > 0 && amountPaid < amountDue`. Shows date of latest payment, outstanding balance, and transaction history.
- **`Pending`**: Payment is due in the current billing cycle, but due date has not yet passed (`amountPaid === 0` and `systemDate <= dueDate`). Displays dash `—`.
- **`Overdue`**: Due date has passed and balance remains unpaid (`amountPaid < amountDue` and `systemDate > dueDate`). Displays dash `—` or latest partial date.
- **`Upcoming`**: Due date is in the future calendar month and payment is not complete. Displays dash `—`.

---

### 5. Quick Status Filters
- Quick filter tabs above the payment table:
  - **All Months** (12)
  - **Paid**
  - **Partially Paid**
  - **Pending**
  - **Overdue**
- Real-time counter badge on each filter pill.

---

### 6. Customer Profile Integration
- In the Customer Directory tab, clicking **"View Profile"** opens the Customer Profile Modal.
- Includes a dedicated **"Payment History"** tab containing:
  - 4 Metric summary cards: Total Due, Total Paid, Total Outstanding Balance, and Monthly Status Breakdown.
  - Complete 12-month summary table.
  - Click any row to open itemized transaction receipts.
  - Seamless jump link: **"Open in Monthly Payments &rarr;"**.

---

### 7. Demonstration Sample Clients
| Customer ID | Name | Subscribed Plan | Monthly Fee | Payment Persona |
|---|---|---|---|---|
| **CV-IND-1001** | Ramesh Kumar | Fiber Ultra 300 Mbps | ₹5,000 | Matching Section 2 illustrative sample (Paid Jan-Apr, Partially Paid May, Overdue Jun-Sep, Pending Oct, Upcoming Nov-Dec) |
| **CV-IND-1002** | Priya Sharma | Fiber Gold 200 Mbps | ₹3,499 | High compliance on-time payer via UPI |
| **CV-IND-1003** | Rajesh Patel | Fiber Silver 100 Mbps | ₹1,999 | Mixed payer with cash advances & overdue invoices |
| **CV-IND-1004** | Ananya Iyer | Enterprise Leased 1 Gbps | ₹15,000 | Corporate enterprise client with RTGS/Bank transfers |
| **CV-IND-1005** | Vikram Singh | Fiber Bronze 50 Mbps | ₹999 | Retail subscriber paying cash |
| **CV-IND-1006** | Sneha Reddy | Fiber Ultra 300 Mbps | ₹5,000 | Power user with active cloud storage vault |

---

## 🎨 Design System
- **Theme**: Enterprise Microsoft Azure Cloud Design System (`#0078D4`, `#107C41`, `#D83B01`, `#A80000`).
- **Typography**: Segoe UI, system modern sans-serif.
- **Icons**: Scalable vector SVGs embedded natively (works offline without external font CDN dependencies).
- **Currency**: Indian Rupees (`₹`) formatted with standard Indian digit grouping (`₹5,000`, `₹1,25,000`).
- **Responsive**: Fully responsive grid adapting from 4K displays down to laptops, tablets, and mobile screens.
