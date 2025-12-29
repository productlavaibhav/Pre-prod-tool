const fs = require('fs');
const https = require('https');
const http = require('http');

const API_URL = 'https://divine-nature-production-c49a.up.railway.app';

// Read CSV
const csvContent = fs.readFileSync('/Users/bhavya/Downloads/Shoot flow data  - Sheet1.csv', 'utf-8');
const lines = csvContent.split('\n');

// Parse number from string (handles commas)
function parseNumber(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[₹,\s]/g, '').replace(/"/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Extract shoots with equipment from CSV
function parseCSV() {
  const shoots = [];
  let currentShoot = null;
  
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV line (handle quoted values)
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());
    
    const [month, shootName, shootDate, itemName, qty, rate, days, total, invoice, invoiceName] = parts;
    
    // New shoot starts when we have a shoot name
    if (shootName && shootName.trim()) {
      if (currentShoot) {
        shoots.push(currentShoot);
      }
      currentShoot = {
        name: shootName.trim(),
        date: shootDate,
        invoice: invoiceName || invoice,
        equipment: []
      };
    }
    
    // Add equipment item if we have item name and it's not a total row
    if (currentShoot && itemName && itemName.trim() && !itemName.toLowerCase().includes('total')) {
      const equipItem = {
        name: itemName.trim(),
        quantity: parseNumber(qty) || 1,
        rate: parseNumber(rate),
        days: parseNumber(days) || 1,
        total: parseNumber(total)
      };
      // Only add if it has meaningful data
      if (equipItem.name && (equipItem.rate > 0 || equipItem.total > 0)) {
        currentShoot.equipment.push(equipItem);
      }
    }
  }
  
  if (currentShoot) {
    shoots.push(currentShoot);
  }
  
  return shoots;
}

// Fetch all shoots from API
function fetchShoots() {
  return new Promise((resolve, reject) => {
    https.get(`${API_URL}/api/shoots`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Update a shoot with equipment
function updateShoot(shoot) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(shoot);
    const url = new URL(`${API_URL}/api/shoots`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Match CSV shoots to database shoots and update
async function main() {
  console.log('Parsing CSV...');
  const csvShoots = parseCSV();
  console.log(`Found ${csvShoots.length} shoots in CSV`);
  
  console.log('\nFetching shoots from database...');
  const dbShoots = await fetchShoots();
  console.log(`Found ${dbShoots.length} shoots in database`);
  
  let updated = 0;
  
  for (const csvShoot of csvShoots) {
    // Find matching shoot in database by name similarity or invoice
    const dbShoot = dbShoots.find(db => {
      const nameMatch = db.name && csvShoot.name && 
        (db.name.toLowerCase().includes(csvShoot.name.toLowerCase().substring(0, 15)) ||
         csvShoot.name.toLowerCase().includes(db.name.toLowerCase().substring(0, 15)));
      const invoiceMatch = db.invoice_file?.name && csvShoot.invoice &&
        db.invoice_file.name.includes(csvShoot.invoice.split('.')[0]);
      return nameMatch || invoiceMatch;
    });
    
    if (dbShoot && csvShoot.equipment.length > 0) {
      console.log(`\nUpdating: ${dbShoot.name}`);
      console.log(`  Equipment items: ${csvShoot.equipment.length}`);
      
      // Update the shoot with equipment
      const updatedShoot = {
        ...dbShoot,
        equipment: csvShoot.equipment
      };
      
      try {
        await updateShoot(updatedShoot);
        updated++;
        console.log(`  ✓ Updated`);
      } catch (err) {
        console.log(`  ✗ Error: ${err.message}`);
      }
    }
  }
  
  console.log(`\n=============================`);
  console.log(`Updated ${updated} shoots with equipment data`);
}

main().catch(console.error);






