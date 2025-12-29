const fs = require('fs');
const https = require('https');

const API_URL = 'https://divine-nature-production-c49a.up.railway.app';

// Parse CSV data
const csvData = fs.readFileSync('/Users/bhavya/Downloads/Shoot flow data  - Sheet1.csv', 'utf8');
const lines = csvData.split('\n').slice(2); // Skip header rows

function parseNumber(str) {
  if (!str) return 0;
  // Remove commas and quotes, then parse
  const cleaned = str.replace(/[",]/g, '').trim();
  return parseFloat(cleaned) || 0;
}

function parseDate(dateStr, month) {
  if (!dateStr) return null;
  
  dateStr = dateStr.trim();
  
  // Format: DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  
  // Format: D-M-YY (like 9-2-25)
  if (/^\d{1,2}-\d{1,2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    return `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  
  // Format: M/D/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  
  // Format: DD/MM/YY
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    return `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  
  // Format with & (multi-day): "21-05-2025 & 22-05-2025" or "27-05-2025 & 28-05-2025"
  if (dateStr.includes('&')) {
    const firstDate = dateStr.split('&')[0].trim();
    return parseDate(firstDate, month);
  }
  
  // Format: D/MonthAbbr/Year like "3/4Jul/2025" or "12/Jul/2025"
  const monthMatch = dateStr.match(/(\d+).*?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec).*?(\d{4})/i);
  if (monthMatch) {
    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    const day = monthMatch[1].padStart(2, '0');
    const mon = monthMap[monthMatch[2].toLowerCase()];
    const year = monthMatch[3];
    return `${year}-${mon}-${day}`;
  }
  
  return null;
}

function getDuration(dateStr) {
  if (!dateStr) return '1 Day';
  if (dateStr.includes('&')) {
    // Count the days
    const parts = dateStr.split('&');
    return `${parts.length} Days`;
  }
  return '1 Day';
}

// Parse shoots from CSV
const shoots = [];
let currentShoot = null;
let currentMonth = '';
let lineNumber = 0;

for (let i = 0; i < lines.length; i++) {
  lineNumber++;
  const line = lines[i];
  if (!line.trim()) continue;
  
  // Parse CSV properly handling quoted fields
  const fields = [];
  let field = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(field.trim());
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field.trim());
  
  const [month, shootName, shootDate, itemName, quantity, rentalCost, rentalDays, totalCost, invoice, invoiceName] = fields;
  
  // Track current month
  if (month && month.trim()) {
    currentMonth = month.trim();
  }
  
  // Check if this is a new shoot (has shoot name AND a date)
  if (shootName && shootName.trim() && shootDate && shootDate.trim()) {
    // Save previous shoot if exists
    if (currentShoot && currentShoot.equipment.length > 0) {
      shoots.push(currentShoot);
    }
    
    // Parse the date
    let parsedDate = parseDate(shootDate, currentMonth);
    const duration = getDuration(shootDate);
    
    // Get invoice name - prefer column 9 (invoice)
    const invoiceFileName = invoice?.trim() || invoiceName?.trim() || null;
    
    // Create new shoot
    currentShoot = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: shootName.trim(),
      date: parsedDate || '2025-01-01',
      duration: duration,
      location: 'Studio',
      equipment: [],
      status: 'completed',
      requestor: {
        name: 'Production Team',
        avatar: 'PT',
        email: 'production@learnapp.com'
      },
      vendorQuote: {
        amount: 0,
        notes: `Vendor: Gopala Digital World`
      },
      approved: true,
      approvedAmount: 0,
      invoiceFile: invoiceFileName ? {
        name: invoiceFileName,
        url: `/invoices/${invoiceFileName}`
      } : null,
      paid: true,
      activities: [{
        id: `act-${Date.now()}-${i}`,
        type: 'status_change',
        description: `Shoot completed - ${currentMonth} 2025`,
        timestamp: new Date(parsedDate || '2025-01-01'),
        user: 'System'
      }],
      createdAt: new Date(parsedDate || '2025-01-01'),
      shootDate: new Date(parsedDate || '2025-01-01'),
      _csvLine: lineNumber,
      _month: currentMonth
    };
    
    // Add first equipment item if present
    if (itemName && itemName.trim() && 
        !itemName.toLowerCase().includes('total') &&
        itemName.trim() !== 'SHOOT II') {
      const qty = parseInt(quantity) || 1;
      const rate = parseNumber(rentalCost);
      const total = parseNumber(totalCost);
      
      currentShoot.equipment.push({
        id: `eq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: itemName.trim().replace(/^\*\s*/, ''),
        quantity: qty,
        dailyRate: rate,
        vendorRate: rate,
        category: 'Equipment'
      });
      
      currentShoot.vendorQuote.amount += total || (qty * rate);
    }
  } else if (currentShoot && itemName && itemName.trim()) {
    // This is an equipment line for current shoot
    const cleanItemName = itemName.trim();
    
    // Skip total rows and section markers
    if (cleanItemName.toLowerCase().includes('total') || 
        cleanItemName === '' ||
        cleanItemName === 'SHOOT II' ||
        cleanItemName === 'Lights' ||
        cleanItemName.startsWith('For Dated:')) {
      continue;
    }
    
    const qty = parseInt(quantity) || 1;
    const rate = parseNumber(rentalCost);
    const total = parseNumber(totalCost);
    
    // Clean item name - remove leading asterisks and extra whitespace
    const finalItemName = cleanItemName
      .replace(/^\*\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (finalItemName) {
      currentShoot.equipment.push({
        id: `eq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}-${i}`,
        name: finalItemName,
        quantity: qty,
        dailyRate: rate,
        vendorRate: rate,
        category: 'Equipment'
      });
      
      currentShoot.vendorQuote.amount += total || (qty * rate);
    }
    
    // Update invoice if present on this line and not already set
    if ((invoice?.trim() || invoiceName?.trim()) && !currentShoot.invoiceFile) {
      const invName = invoice?.trim() || invoiceName?.trim();
      currentShoot.invoiceFile = {
        name: invName,
        url: `/invoices/${invName}`
      };
    }
  }
}

// Don't forget the last shoot
if (currentShoot && currentShoot.equipment.length > 0) {
  shoots.push(currentShoot);
}

// Set approved amount to match vendor quote
shoots.forEach(s => {
  s.approvedAmount = s.vendorQuote.amount;
  // Clean up internal fields
  delete s._csvLine;
  delete s._month;
});

console.log(`\n${'='.repeat(60)}`);
console.log(`PARSED ${shoots.length} SHOOTS FROM CSV`);
console.log(`${'='.repeat(60)}\n`);

// Display summary grouped by month
const byMonth = {};
shoots.forEach(s => {
  const month = s.date.substring(0, 7); // YYYY-MM
  if (!byMonth[month]) byMonth[month] = [];
  byMonth[month].push(s);
});

Object.keys(byMonth).sort().forEach(month => {
  console.log(`\n📅 ${month}`);
  console.log('-'.repeat(40));
  byMonth[month].forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}`);
    console.log(`     Date: ${s.date} | Items: ${s.equipment.length}`);
    console.log(`     Amount: ₹${s.vendorQuote.amount.toLocaleString()}`);
    console.log(`     Invoice: ${s.invoiceFile?.name || '❌ None'}`);
  });
});

// Calculate totals
const totalAmount = shoots.reduce((sum, s) => sum + s.vendorQuote.amount, 0);
console.log(`\n${'='.repeat(60)}`);
console.log(`TOTAL: ${shoots.length} shoots | ₹${totalAmount.toLocaleString()}`);
console.log(`${'='.repeat(60)}\n`);

// Function to save shoot to API
function saveShoot(shoot) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(shoot);
    
    const options = {
      hostname: 'divine-nature-production-c49a.up.railway.app',
      port: 443,
      path: '/api/shoots',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Failed: ${res.statusCode} - ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Import all shoots
async function importAll() {
  console.log('\n🚀 STARTING IMPORT TO DATABASE...\n');
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < shoots.length; i++) {
    const shoot = shoots[i];
    try {
      await saveShoot(shoot);
      console.log(`✅ [${i + 1}/${shoots.length}] ${shoot.name} - ₹${shoot.vendorQuote.amount.toLocaleString()}`);
      success++;
    } catch (error) {
      console.error(`❌ [${i + 1}/${shoots.length}] ${shoot.name} - ${error.message}`);
      failed++;
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ IMPORT COMPLETE`);
  console.log(`   Success: ${success} | Failed: ${failed}`);
  console.log(`${'='.repeat(60)}\n`);
}

// Run import
importAll().catch(console.error);
