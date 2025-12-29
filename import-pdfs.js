const fs = require('fs');
const path = require('path');

// API URL
const API_URL = 'https://divine-nature-production-c49a.up.railway.app';

// Mapping from invoice filename to shoot name (from CSV)
const invoiceToShootMap = {
  'GDW Inv No. 31_25-26.pdf': 'TP start investing in 2025 shoot',
  'GDW Inv No. 32_25-26.pdf': 'regular income shoot & Pay your loan early or invest shoot',
  'GDW Inv No. 35_25-26.pdf': 'varsity live AMA',
  'GDW Inv No. 36_25-26.pdf': 'varsity live AMA',
  'GDW Inv No. 37_25-26_Genz Audio Equipment.pdf': 'GEN-Z',
  'GDW Inv No. 38_25-26 GenZ, Iphone & Live AMA.pdf': 'GENZ Vs iphone',
  'GDW Inv No. 39_25-26 GenZ, Iphone & Live AMA.pdf': 'GenZ, Iphone & Live AMA',
  'GDW Inv No. 40_25-26 StandUp.pdf': 'COMEDY SHOW',
  'GDW Inv No. 42_25-26 Varsity 2 Days Shoot.pdf': 'VARSITY SHOOT',
  'GDW Inv No. 44_25-26 why cant you afford a house.pdf': 'why cant you afford a house & how brands are fooling you SHOOT',
  'GDW Inv No. 46_25-26 how brands are fooling you.pdf': 'why cant you afford a house & how brands are fooling you SHOOT',
  'GDW Inv No. 47_25-26 Psychology of Money.pdf': 'Psychological money SHOOT',
  'GDW Inv No. 48_25-26 why Dose everyone seems to have more money.pdf': 'why does everyone seem to have more money SHOOT',
  'GDW Inv No. 49_25-26.pdf': 'VARSITY SHOOT',
  'GDW Inv No. 52_25-26.pdf': 'creadit card and civic sense',
  'GDW Inv No. 53_25-26.pdf': 'Pranay\'s Meetup shoot',
  'GDW Inv No. 54_25-26 (1).pdf': 'Bitcoin & Ind vs china',
  'GDW Inv No. 60_25-26.pdf': 'Zero 1 Luxury car and Short term investing setup',
  'GDW Inv No. 61_25-26.pdf': 'Zero 1 Luxury car and Short term investing shoot and shivank\'s podcast setup',
  'GDW Inv No. 62_25-26.pdf': 'Shivank\'s podcast shoot and varsity setup',
  'GDW Inv No. 63_25-26.pdf': 'Varsity Shoot',
  'GDW Inv No. 67_25-26.pdf': 'Devil Circuit Shoot',
  'GDW Inv No. 70_25-26 Varsity.pdf': 'Varsity Shoot',
  'GDW Inv No. 71_25-26 Varsity.pdf': 'Varsity Shoot',
  'GDW Inv No. 72_25-26 Varsity.pdf': 'Varsity Shoot',
  'GDW Inv No. 81_25-26 (1).pdf': 'Social Media Addcition',
  'GDW Inv No. 82_25-26 (1).pdf': 'Social Media Addcition b rool shoot',
  'GDW Inv No. 83_25-26 (1).pdf': 'Social Media Addcition b rool shoot',
  'GDW Inv No. 85-25-26.pdf': 'Road accident & water crisis brolls',
  'GDW Inv No. 86_25-26.pdf': 'varsity shoot',
  'GDW Inv No. 87_25-26.pdf': 'varsity shoot',
  'GDW Inv No. 88_25-26.pdf': 'Road accident & water crisis brolls shoot',
  'GDW Inv No. 90_25-26 (1).pdf': 'Gold vs silver & Air Pollution',
  'GDW Inv No. 92_25-26.pdf': 'Air pollution shoot',
  'GDW Inv No. 95_25-26 P.pdf': 'Prateek Persnal',
  'GDW Inv No. 96_25-26.pdf': 'Air pollution brolls shoot',
  'GDW Inv No. 97_25-26 A.pdf': 'SHOTS game shoot',
  'GDW Inv No. 103_25-26 (1).pdf': 'Diwali Party Singer Audio Setup',
  'GDW Inv No. 104_25-26 D CTC vs In Hand (Short Style).pdf': 'shoot style CTC vs In Hand',
  'GDW Inv No. 105_25-26 D Education System.pdf': 'Education System Trap',
  'GDW Inv No. 106_25-26 D Fin Shot Delhi Shoot.pdf': 'FinShot Podcast (Delhi)',
};

// Also map by invoice name stored in database
const invoiceNameMap = {};
Object.keys(invoiceToShootMap).forEach(filename => {
  invoiceNameMap[filename] = filename;
});

async function importPDFs() {
  // Get the PDF folder path from command line or use default
  const pdfFolder = process.argv[2] || '/Users/bhavya/Downloads';
  
  console.log('📁 Looking for PDFs in:', pdfFolder);
  console.log('');
  
  // Fetch all shoots from API
  console.log('📡 Fetching shoots from API...');
  const response = await fetch(`${API_URL}/api/shoots`);
  const shoots = await response.json();
  console.log(`   Found ${shoots.length} shoots in database`);
  console.log('');
  
  // Find PDF files in the folder
  const files = fs.readdirSync(pdfFolder).filter(f => f.endsWith('.pdf') && f.startsWith('GDW'));
  console.log(`📄 Found ${files.length} GDW PDF files`);
  console.log('');
  
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  
  for (const filename of files) {
    const shootName = invoiceToShootMap[filename];
    
    if (!shootName) {
      console.log(`⚠️  No mapping found for: ${filename}`);
      notFound++;
      continue;
    }
    
    // Find the shoot in database - try multiple matching strategies
    let shoot = shoots.find(s => {
      const name = (s.name || s.title || '').toLowerCase().trim();
      const targetName = shootName.toLowerCase().trim();
      
      // Exact match
      if (name === targetName) return true;
      
      // Contains match
      if (name.includes(targetName) || targetName.includes(name)) return true;
      
      // Check invoice file name
      if (s.invoiceFile?.name === filename) return true;
      if (s.invoice_file?.name === filename) return true;
      
      return false;
    });
    
    if (!shoot) {
      // Try partial matching
      shoot = shoots.find(s => {
        const name = (s.name || s.title || '').toLowerCase();
        const words = shootName.toLowerCase().split(' ').filter(w => w.length > 3);
        return words.some(word => name.includes(word));
      });
    }
    
    if (!shoot) {
      console.log(`❌ Shoot not found for: ${filename} -> "${shootName}"`);
      notFound++;
      continue;
    }
    
    // Read PDF file and convert to base64
    const filePath = path.join(pdfFolder, filename);
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = `data:application/pdf;base64,${fileBuffer.toString('base64')}`;
    
    // Update shoot with PDF data
    const updatedShoot = {
      ...shoot,
      invoiceFile: {
        name: filename,
        url: filename,
        data: base64Data
      },
      invoice_file: {
        name: filename,
        url: filename,
        data: base64Data
      },
      paid: true
    };
    
    try {
      const updateResponse = await fetch(`${API_URL}/api/shoots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedShoot)
      });
      
      if (updateResponse.ok) {
        console.log(`✅ Updated: ${shoot.name || shoot.title} <- ${filename}`);
        updated++;
      } else {
        const errorText = await updateResponse.text();
        console.log(`❌ Failed to update: ${shoot.name || shoot.title} - Status: ${updateResponse.status} - ${errorText.substring(0, 100)}`);
        errors++;
      }
    } catch (err) {
      console.log(`❌ Error updating ${shoot.name || shoot.title}: ${err.message}`);
      errors++;
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('');
  console.log('='.repeat(50));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successfully updated: ${updated}`);
  console.log(`⚠️  Not found/no mapping: ${notFound}`);
  console.log(`❌ Errors: ${errors}`);
  console.log('='.repeat(50));
}

importPDFs().catch(console.error);

