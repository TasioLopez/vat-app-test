import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import mammoth from 'mammoth';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Document priority order
const DOCUMENT_PRIORITY = {
  'intakeformulier': 1,
  'ad rapport': 2,
  'fml/izp': 3,
  'extra': 4
};

function extractStoragePath(url: string): string | null {
  const match = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (match?.[1]) return match[1];
  if (url.startsWith('documents/')) return url.slice('documents/'.length);
  if (!url.includes('://') && !url.includes('object/')) return url;
  return null;
}

// Helper function to detect file type
function getFileType(path: string, docName?: string): { ext: string; mime: string } {
  const pathLower = path.toLowerCase();
  const nameLower = (docName || '').toLowerCase();
  
  if (pathLower.endsWith('.docx') || nameLower.endsWith('.docx')) {
    return { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }
  if (pathLower.endsWith('.doc') || nameLower.endsWith('.doc')) {
    return { ext: 'doc', mime: 'application/msword' };
    }
  return { ext: 'pdf', mime: 'application/pdf' };
}

// ============================================
// DOCX TABLE EXTRACTION USING MAMMOTH
// ============================================

interface ExtractedTableData {
  vervoer: {
    auto: boolean;
    fiets: boolean;
    bromfiets: boolean;
    motor: boolean;
    ov: boolean;
    rijbewijs: boolean;
    rijbewijsType?: string;
  };
  talen: {
    nederlands: {
      spreken: 'G' | 'R' | 'S' | null;
      schrijven: 'G' | 'R' | 'S' | null;
      lezen: 'G' | 'R' | 'S' | null;
    };
  };
  computer: {
    heeftPcThuis: boolean;
    heeftPcThuisNotitie: string | null;
    bekendMetMsOffice: boolean;
  };
  rawText: string;
}

// Fallback: Parse raw text for table data using pattern matching
function parseRawTextForTableData(rawText: string, result: ExtractedTableData) {
  console.log('📝 Parsing raw text for table data patterns...');
  
  const textLower = rawText.toLowerCase();
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Look for Vervoer patterns
  // Pattern: "Auto" followed by "Ja" or "Nee" (or X in Ja/Nee column)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    const nextLine = (lines[i + 1] || '').toLowerCase();
    const combinedLine = line + ' ' + nextLine;
    
    // Check for transport items with Ja/Nee
    if (line.includes('auto') && !line.includes('bromfiets')) {
      if (combinedLine.includes('ja') && !combinedLine.includes('nee')) {
        result.vervoer.auto = true;
      } else if (combinedLine.includes('nee')) {
        result.vervoer.auto = false;
      }
    }
    if (line.includes('fiets') && !line.includes('bromfiets')) {
      if (combinedLine.includes('ja') && !combinedLine.includes('nee')) {
        result.vervoer.fiets = true;
      } else if (combinedLine.includes('nee')) {
        result.vervoer.fiets = false;
      }
    }
    if (line.includes('bromfiets')) {
      if (combinedLine.includes('ja') && !combinedLine.includes('nee')) {
        result.vervoer.bromfiets = true;
      } else if (combinedLine.includes('nee')) {
        result.vervoer.bromfiets = false;
      }
    }
    if (line.includes('motor') && !line.includes('bromfiets')) {
      if (combinedLine.includes('ja') && !combinedLine.includes('nee')) {
        result.vervoer.motor = true;
      } else if (combinedLine.includes('nee')) {
        result.vervoer.motor = false;
      }
    }
    if (line.includes('ov') || line.includes('openbaar vervoer')) {
      if (combinedLine.includes('ja') && !combinedLine.includes('nee')) {
        result.vervoer.ov = true;
      } else if (combinedLine.includes('nee')) {
        result.vervoer.ov = false;
      }
    }
    if (line.includes('rijbewijs')) {
      if (combinedLine.includes('ja') && !combinedLine.includes('nee')) {
        result.vervoer.rijbewijs = true;
        // Look for license type
        const typeMatch = combinedLine.match(/\b([a-e])\b/i);
        if (typeMatch) {
          result.vervoer.rijbewijsType = typeMatch[1].toUpperCase();
        }
      }
    }
    
    // Check for language skills - look for Nederlands row with G/R/S
    if (line.includes('nederlands')) {
      // Look for G, R, S markers in same or next lines
      const context = lines.slice(i, i + 3).join(' ').toLowerCase();
      
      // Pattern: "spreken" near G/R/S
      if (context.includes('spreken')) {
        if (context.match(/spreken[^a-z]*s\b/) || context.match(/s[^a-z]*spreken/)) {
          result.talen.nederlands.spreken = 'S';
        } else if (context.match(/spreken[^a-z]*r\b/) || context.match(/r[^a-z]*spreken/)) {
          result.talen.nederlands.spreken = 'R';
        } else if (context.match(/spreken[^a-z]*g\b/) || context.match(/g[^a-z]*spreken/)) {
          result.talen.nederlands.spreken = 'G';
        }
      }
      if (context.includes('schrijven')) {
        if (context.match(/schrijven[^a-z]*s\b/) || context.match(/s[^a-z]*schrijven/)) {
          result.talen.nederlands.schrijven = 'S';
        } else if (context.match(/schrijven[^a-z]*r\b/) || context.match(/r[^a-z]*schrijven/)) {
          result.talen.nederlands.schrijven = 'R';
        } else if (context.match(/schrijven[^a-z]*g\b/) || context.match(/g[^a-z]*schrijven/)) {
          result.talen.nederlands.schrijven = 'G';
        }
      }
      if (context.includes('lezen')) {
        if (context.match(/lezen[^a-z]*s\b/) || context.match(/s[^a-z]*lezen/)) {
          result.talen.nederlands.lezen = 'S';
        } else if (context.match(/lezen[^a-z]*r\b/) || context.match(/r[^a-z]*lezen/)) {
          result.talen.nederlands.lezen = 'R';
        } else if (context.match(/lezen[^a-z]*g\b/) || context.match(/g[^a-z]*lezen/)) {
          result.talen.nederlands.lezen = 'G';
        }
      }
    }
    
    // Check for PC/computer skills
    if (line.includes('pc thuis') || line.includes('computer thuis')) {
      const context = combinedLine;
      if (context.includes('nee')) {
        result.computer.heeftPcThuis = false;
      } else if (context.includes('ja')) {
        // Check for notitie
        if (context.includes('evt') || context.includes('dochter') || context.includes('familie')) {
          result.computer.heeftPcThuis = false;
          result.computer.heeftPcThuisNotitie = '(bij familie)';
        } else {
          result.computer.heeftPcThuis = true;
        }
      }
    }
    if (line.includes('ms office') || line.includes('office')) {
      const context = combinedLine;
      if (context.includes('ja') && !context.includes('nee')) {
        result.computer.bekendMetMsOffice = true;
      } else if (context.includes('nee')) {
        result.computer.bekendMetMsOffice = false;
      }
    }
  }
  
  console.log('📝 Raw text parsing results:', JSON.stringify(result, null, 2));
}

// Extract tables from DOCX using mammoth
async function extractDocxTables(buffer: Buffer): Promise<ExtractedTableData> {
  console.log('📊 Extracting tables from DOCX using mammoth...');
  
  // Extract HTML to preserve table structure
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const html = htmlResult.value;
  
  // Also extract raw text for other fields
  const textResult = await mammoth.extractRawText({ buffer });
  const rawText = textResult.value;
  
  console.log('📄 Extracted HTML length:', html.length);
  console.log('📄 Extracted text length:', rawText.length);
  
  // Log first 500 chars of raw text for debugging
  console.log('📄 Raw text preview:', rawText.substring(0, 500));
  
  // Initialize result
  const result: ExtractedTableData = {
    vervoer: {
      auto: false,
      fiets: false,
      bromfiets: false,
      motor: false,
      ov: false,
      rijbewijs: false,
      rijbewijsType: undefined
    },
    talen: {
      nederlands: {
        spreken: null,
        schrijven: null,
        lezen: null
      }
    },
    computer: {
      heeftPcThuis: false,
      heeftPcThuisNotitie: null,
      bekendMetMsOffice: false
    },
    rawText
  };
  
  // Parse tables from HTML
  const tables = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];
  console.log(`📊 Found ${tables.length} tables in document`);
  
  for (const table of tables) {
    const tableText = table.toLowerCase();
    
    // Check if this is the Vervoer table
    if (tableText.includes('vervoer') || tableText.includes('auto') && tableText.includes('fiets') && tableText.includes('rijbewijs')) {
      console.log('🚗 Found Vervoer table');
      parseVervoerTable(table, result.vervoer);
    }
    
    // Check if this is the Talen table
    if (tableText.includes('talen') || (tableText.includes('spreken') && tableText.includes('schrijven') && tableText.includes('lezen'))) {
      console.log('🗣️ Found Talen table');
      parseTalenTable(table, result.talen);
    }
    
    // Check if this is the Computer skills table
    if (tableText.includes('computer') || tableText.includes('pc thuis') || tableText.includes('ms office')) {
      console.log('💻 Found Computer table');
      parseComputerTable(table, result.computer);
    }
  }
  
  // If HTML table parsing didn't find much, try raw text parsing as fallback
  const tableFieldsFound = 
    result.vervoer.auto || result.vervoer.fiets || result.vervoer.bromfiets || 
    result.vervoer.motor || result.vervoer.ov || result.vervoer.rijbewijs ||
    result.talen.nederlands.spreken || result.talen.nederlands.schrijven || result.talen.nederlands.lezen ||
    result.computer.heeftPcThuis || result.computer.bekendMetMsOffice;
  
  if (!tableFieldsFound) {
    console.log('⚠️ HTML table parsing found few fields, using raw text fallback...');
    parseRawTextForTableData(rawText, result);
  }
  
  console.log('📊 Final extracted table data:', JSON.stringify(result, null, 2));
  return result;
}

// Parse Vervoer table
function parseVervoerTable(tableHtml: string, vervoer: ExtractedTableData['vervoer']) {
  // Extract rows
  const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  
  // First, find the header row to determine column positions
  // Table structure: [Type, Welk?, Ja, Nee] or [Type, Ja, Nee]
  let jaColIndex = -1;
  let neeColIndex = -1;
  
  for (const row of rows) {
    const cells = row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
    const cellContents = cells.map(cell => 
      cell.replace(/<[^>]+>/g, '').trim().toLowerCase()
    );
    
    // Check if this is the header row
    for (let i = 0; i < cellContents.length; i++) {
      if (cellContents[i] === 'ja') jaColIndex = i;
      if (cellContents[i] === 'nee') neeColIndex = i;
    }
    
    if (jaColIndex !== -1 && neeColIndex !== -1) {
      console.log(`  Vervoer header found: Ja col=${jaColIndex}, Nee col=${neeColIndex}`);
      break;
    }
  }
  
  // If header not found, assume default positions
  // Common structure: [Type, Welk?, Ja, Nee] → Ja=2, Nee=3
  // Or: [Type, Ja, Nee] → Ja=1, Nee=2
  if (jaColIndex === -1) jaColIndex = 2;
  if (neeColIndex === -1) neeColIndex = 3;
  
  for (const row of rows) {
    const cells = row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
    
    // Clean cell content
    const cellContents = cells.map(cell => 
      cell.replace(/<[^>]+>/g, '').trim().toLowerCase()
    );
    
    const firstCell = cellContents[0] || '';
    const rowText = cellContents.join(' ');
    
    // Skip header row
    if (firstCell === 'vervoer' || firstCell.includes('welk')) continue;
    
    // Find where the 'x' is in this row (after the first cell which is the transport type)
    let xIndex = -1;
    for (let i = 1; i < cellContents.length; i++) {
      if (cellContents[i] === 'x' || cellContents[i] === '✓' || cellContents[i] === '✔') {
        xIndex = i;
        break;
      }
    }
    
    // Determine if Ja or Nee based on x position and row structure
    // The table structure is: [Type, Welk?, Ja, Nee] but empty cells may be collapsed
    let isJa = false;
    let isNee = false;
    
    if (xIndex !== -1) {
      // Check if there's a cell after x - if yes and it's empty, x is likely in Ja column
      // If x is at the last position and there's an empty cell before it, x is in Nee column
      const hasWelkColumn = cellContents.length >= 4 || (cellContents.length >= 2 && cellContents[1] && cellContents[1].match(/^[a-e]$/i));
      
      if (hasWelkColumn) {
        // 4-column structure: [Type, Welk?, Ja, Nee]
        // x at index 2 = Ja, x at index 3 = Nee
        isJa = xIndex === 2;
        isNee = xIndex === 3;
      } else {
        // 3-column structure (no Welk?): [Type, Ja, Nee]
        // But cells may be collapsed, so we need to check the pattern
        // If x is at index 1 and followed by empty = Ja
        // If x is at index 2 and preceded by empty at index 1 = Nee
        if (xIndex === 1) {
          isJa = true;  // x right after type name = Ja
        } else if (xIndex === 2 && (!cellContents[1] || cellContents[1] === '')) {
          isNee = true;  // empty cell before x = Nee
        } else if (xIndex === 2) {
          isJa = true;  // x at index 2 without empty before = Ja (has Welk?)
        }
      }
    }
    
    if (firstCell.includes('rijbewijs')) {
      vervoer.rijbewijs = isJa && !isNee;
      // Extract license type from Welk? column (usually column 1)
      const welkCell = cellContents[1] || '';
      const typeMatch = welkCell.match(/\b([a-e])\b/i) || rowText.match(/\b([a-e])\b/i);
      if (typeMatch) {
        vervoer.rijbewijsType = typeMatch[1].toUpperCase();
      }
      console.log(`  Rijbewijs: ${vervoer.rijbewijs ? 'Ja' : 'Nee'}, Type: ${vervoer.rijbewijsType || 'N/A'}, cells: [${cellContents.join(', ')}]`);
    }
    else if (firstCell.includes('auto') && !firstCell.includes('bromfiets')) {
      vervoer.auto = isJa && !isNee;
      console.log(`  Auto: ${vervoer.auto ? 'Ja' : 'Nee'}, cells: [${cellContents.join(', ')}]`);
    }
    else if (firstCell.includes('fiets') && !firstCell.includes('bromfiets')) {
      vervoer.fiets = isJa && !isNee;
      console.log(`  Fiets: ${vervoer.fiets ? 'Ja' : 'Nee'}, cells: [${cellContents.join(', ')}]`);
    }
    else if (firstCell.includes('bromfiets')) {
      vervoer.bromfiets = isJa && !isNee;
      console.log(`  Bromfiets: ${vervoer.bromfiets ? 'Ja' : 'Nee'}`);
    }
    else if (firstCell.includes('motor') && !firstCell.includes('bromfiets')) {
      vervoer.motor = isJa && !isNee;
      console.log(`  Motor: ${vervoer.motor ? 'Ja' : 'Nee'}`);
    }
    else if (firstCell.includes('ov') || firstCell.includes('openbaar vervoer')) {
      vervoer.ov = isJa && !isNee;
      console.log(`  OV: ${vervoer.ov ? 'Ja' : 'Nee'}, cells: [${cellContents.join(', ')}]`);
    }
  }
}

// Parse Talen table
function parseTalenTable(tableHtml: string, talen: ExtractedTableData['talen']) {
  const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  
  // Find header row to determine column positions
  let sprekenCol = -1;
  let schrijvenCol = -1;
  let lezenCol = -1;
  
  for (const row of rows) {
    const cells = row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
    const cellContents = cells.map(cell => 
      cell.replace(/<[^>]+>/g, '').trim().toLowerCase()
    );
    
    // Check if this is header row
    if (cellContents.some(c => c.includes('spreken') || c.includes('schrijven') || c.includes('lezen'))) {
      // This is header - find column positions
      for (let i = 0; i < cellContents.length; i++) {
        if (cellContents[i].includes('spreken')) sprekenCol = i;
        if (cellContents[i].includes('schrijven')) schrijvenCol = i;
        if (cellContents[i].includes('lezen')) lezenCol = i;
      }
      console.log(`  Header columns - Spreken: ${sprekenCol}, Schrijven: ${schrijvenCol}, Lezen: ${lezenCol}`);
      continue;
    }
    
    // Check if this is the Nederlands row
    const rowText = cellContents.join(' ');
    if (rowText.includes('nederlands') || cellContents[0]?.includes('nederland')) {
      console.log('  Found Nederlands row:', cellContents);
      
      // Extract G/R/S values from the appropriate columns
      // The table structure is usually: [Language] [Spreken G R S] [Schrijven G R S] [Lezen G R S]
      // Or: [Language] [G] [R] [S] [G] [R] [S] [G] [R] [S]
      
      // Look for X markers in the cells
      for (let i = 1; i < cellContents.length; i++) {
        const cell = cellContents[i];
        
        // Check if cell contains X or checkmark
        if (cell === 'x' || cell === '✓' || cell === '✔' || cell === 'g' || cell === 'r' || cell === 's') {
          // Determine which skill and level based on position
          // Common patterns:
          // - 3 columns per skill (G, R, S)
          // - Or explicit G/R/S value in single column
          
          const skillIndex = Math.floor((i - 1) / 3); // 0=spreken, 1=schrijven, 2=lezen
          const levelIndex = (i - 1) % 3; // 0=G, 1=R, 2=S
          
          const level: 'G' | 'R' | 'S' = levelIndex === 0 ? 'G' : levelIndex === 1 ? 'R' : 'S';
          
          if (skillIndex === 0) {
            talen.nederlands.spreken = level;
            console.log(`  Spreken: ${level}`);
          } else if (skillIndex === 1) {
            talen.nederlands.schrijven = level;
            console.log(`  Schrijven: ${level}`);
          } else if (skillIndex === 2) {
            talen.nederlands.lezen = level;
            console.log(`  Lezen: ${level}`);
          }
        }
      }
      
      // Alternative: Look for explicit G/R/S text in cells
      for (let i = 0; i < cellContents.length; i++) {
        const cell = cellContents[i];
        if (cell === 'g' || cell === 'goed') {
          // Determine which skill based on column header or position
          if (sprekenCol !== -1 && i === sprekenCol) talen.nederlands.spreken = 'G';
          else if (schrijvenCol !== -1 && i === schrijvenCol) talen.nederlands.schrijven = 'G';
          else if (lezenCol !== -1 && i === lezenCol) talen.nederlands.lezen = 'G';
        }
        if (cell === 'r' || cell === 'redelijk') {
          if (sprekenCol !== -1 && i === sprekenCol) talen.nederlands.spreken = 'R';
          else if (schrijvenCol !== -1 && i === schrijvenCol) talen.nederlands.schrijven = 'R';
          else if (lezenCol !== -1 && i === lezenCol) talen.nederlands.lezen = 'R';
        }
        if (cell === 's' || cell === 'slecht') {
          if (sprekenCol !== -1 && i === sprekenCol) talen.nederlands.spreken = 'S';
          else if (schrijvenCol !== -1 && i === schrijvenCol) talen.nederlands.schrijven = 'S';
          else if (lezenCol !== -1 && i === lezenCol) talen.nederlands.lezen = 'S';
        }
      }
    }
  }
}

// Parse Computer skills table
function parseComputerTable(tableHtml: string, computer: ExtractedTableData['computer']) {
  const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  
  for (const row of rows) {
    const rowLower = row.toLowerCase();
    const cells = row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
    const cellContents = cells.map(cell => 
      cell.replace(/<[^>]+>/g, '').trim()
    );
    const cellContentsLower = cellContents.map(c => c.toLowerCase());
    
    const rowText = cellContentsLower.join(' ');
    const firstCell = cellContentsLower[0] || '';
    
    // Check for "Heeft u een pc thuis" row
    if (firstCell.includes('pc thuis') || firstCell.includes('computer thuis')) {
      // Look for Ja/Nee
      let hasJa = false;
      let notitie: string | null = null;
      
      for (let i = 1; i < cellContents.length; i++) {
        const cell = cellContentsLower[i];
        const originalCell = cellContents[i];
        
        if (cell === 'x' || cell === '✓' || cell === '✔' || cell.includes('ja')) {
          // Check if previous cell or this cell indicates Ja column
          if (i === 1 || cellContentsLower[i-1]?.includes('ja')) {
            hasJa = true;
          }
        }
        
        // Check for notitie like "(evt. bij dochter)"
        if (originalCell.includes('(') && originalCell.includes(')')) {
          notitie = originalCell.match(/\([^)]+\)/)?.[0] || null;
        }
      }
      
      // Check for notitie in any cell
      for (const cell of cellContents) {
        if (cell.includes('(evt') || cell.includes('bij dochter') || cell.includes('bij familie')) {
          notitie = cell;
          break;
        }
      }
      
      computer.heeftPcThuis = hasJa && !notitie;
      computer.heeftPcThuisNotitie = notitie;
      console.log(`  Heeft PC thuis: ${computer.heeftPcThuis}, Notitie: ${notitie || 'geen'}`);
    }
    
    // Check for "Bekend met MS Office" row
    if (firstCell.includes('ms office') || firstCell.includes('microsoft office') || firstCell.includes('office')) {
      let hasJa = false;
      
      for (let i = 1; i < cellContents.length; i++) {
        const cell = cellContentsLower[i];
        if (cell === 'x' || cell === '✓' || cell === '✔' || cell.includes('ja')) {
          if (i === 1 || cellContentsLower[i-1]?.includes('ja')) {
            hasJa = true;
          }
        }
      }
      
      computer.bekendMetMsOffice = hasJa;
      console.log(`  Bekend met MS Office: ${computer.bekendMetMsOffice}`);
    }
  }
}

// Convert extracted table data to employee details format
function convertTableDataToEmployeeDetails(tableData: ExtractedTableData): any {
  const result: any = {};
  
  // Convert transport_type
  const transportTypes: string[] = [];
  if (tableData.vervoer.auto) transportTypes.push('Auto');
  if (tableData.vervoer.fiets) transportTypes.push('Fiets');
  if (tableData.vervoer.bromfiets) transportTypes.push('Bromfiets');
  if (tableData.vervoer.motor) transportTypes.push('Motor');
  if (tableData.vervoer.ov) transportTypes.push('OV');
  result.transport_type = transportTypes;
  
  // Convert drivers_license
  result.drivers_license = tableData.vervoer.rijbewijs;
  if (tableData.vervoer.rijbewijsType) {
    result.drivers_license_type = tableData.vervoer.rijbewijsType;
  }
  
  // Convert language skills
  const mapLevel = (level: 'G' | 'R' | 'S' | null): string | null => {
    if (level === 'G') return 'Goed';
    if (level === 'R') return 'Gemiddeld';
    if (level === 'S') return 'Niet goed';
    return null;
  };
  
  if (tableData.talen.nederlands.spreken) {
    result.dutch_speaking = mapLevel(tableData.talen.nederlands.spreken);
  }
  if (tableData.talen.nederlands.schrijven) {
    result.dutch_writing = mapLevel(tableData.talen.nederlands.schrijven);
  }
  if (tableData.talen.nederlands.lezen) {
    result.dutch_reading = mapLevel(tableData.talen.nederlands.lezen);
  }
  
  // Convert computer skills
  result.has_computer = tableData.computer.heeftPcThuis;
  
  // Calculate computer_skills level
  const hasPc = tableData.computer.heeftPcThuis;
  const hasOffice = tableData.computer.bekendMetMsOffice;
  const hasNotitie = !!tableData.computer.heeftPcThuisNotitie;
  
  if (!hasPc && !hasOffice) {
    result.computer_skills = 1; // Geen
  } else if (!hasPc && hasOffice) {
    result.computer_skills = 2; // Basis
  } else if (hasPc && hasOffice) {
    result.computer_skills = 3; // Gemiddeld
  } else if (hasPc && !hasOffice) {
    result.computer_skills = 2; // Basis
  }
  
  // If has notitie like "(evt. bij dochter)", treat as no PC
  if (hasNotitie) {
    result.has_computer = false;
    if (hasOffice) {
      result.computer_skills = 2; // Basis - knows Office but no own PC
    } else {
      result.computer_skills = 1; // Geen
    }
  }
  
  console.log('📊 Converted table data to employee details:', JSON.stringify(result, null, 2));
  return result;
}

// Helper function to clean and parse assistant response
function parseAssistantResponse(responseText: string): any {
  let cleanedResponse = responseText;
        
        // Remove ```json and ``` markers
        cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
  // Try to find JSON object - look for first { and matching }
        const firstBrace = cleanedResponse.indexOf('{');
  if (firstBrace === -1) {
    throw new Error('No JSON object found in response');
  }
  
  // Find the matching closing brace by counting braces
  let braceCount = 0;
  let lastBrace = -1;
  for (let i = firstBrace; i < cleanedResponse.length; i++) {
    if (cleanedResponse[i] === '{') braceCount++;
    if (cleanedResponse[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        lastBrace = i;
        break;
      }
    }
  }
  
  if (lastBrace === -1) {
    throw new Error('No matching closing brace found');
  }
  
          cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
  
  try {
    return JSON.parse(cleanedResponse);
  } catch (error: any) {
    console.error('❌ JSON parsing error:', error.message);
    console.error('📄 Attempted to parse:', cleanedResponse.substring(0, 200));
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }
}

// Helper function to map and validate extracted data
function mapAndValidateData(extractedData: any): any {
        const fieldMapping: { [key: string]: string } = {
          'geslacht_werknemer': 'gender',
          'geslacht': 'gender',
          'leeftijd_werknemer': 'date_of_birth',
          'naam_werknemer': 'name'
        };
        
        const validEmployeeDetailsFields = [
          'current_job', 'work_experience', 'education_level', 'education_name',
    'drivers_license', 'drivers_license_type', 'transport_type',
          'dutch_speaking', 'dutch_writing', 'dutch_reading', 
          'has_computer', 'computer_skills', 'contract_hours', 'other_employers',
          'gender', 'date_of_birth', 'phone'
        ];
        
        const mappedData: any = {};
  
        Object.entries(extractedData).forEach(([key, value]) => {
          const mappedKey = fieldMapping[key] || key;
          
          // Skip fields that don't belong in employee_details table
          if (!validEmployeeDetailsFields.includes(mappedKey)) {
            console.log(`⚠️ Skipping field "${mappedKey}" - belongs in tp_meta table, not employee_details`);
            return;
          }
          
          // Special handling for date_of_birth - if it's a number (age), skip it
          if (mappedKey === 'date_of_birth' && typeof value === 'number') {
            console.log('⚠️ Skipping age number, expecting date format for date_of_birth');
            return;
          }
          
          // Handle European decimal format (15,5 → 15.5)
          if (mappedKey === 'contract_hours') {
            if (typeof value === 'string') {
              // Replace comma with dot for European decimal format
              const normalizedValue = value.replace(',', '.');
              const numValue = parseFloat(normalizedValue);
              if (!isNaN(numValue)) {
                mappedData[mappedKey] = numValue;
                console.log(`✅ Converted contract_hours from "${value}" to ${mappedData[mappedKey]}`);
              } else {
                console.log(`⚠️ Skipping invalid contract_hours value: "${value}"`);
                return;
              }
            } else if (typeof value === 'number') {
              mappedData[mappedKey] = value;
            } else {
              console.log(`⚠️ Skipping non-numeric contract_hours value: ${value}`);
              return;
            }
          } 
    // Special handling for transport_type - ensure it's an array
    else if (mappedKey === 'transport_type') {
      if (Array.isArray(value)) {
        mappedData[mappedKey] = value;
        console.log(`✅ transport_type is array:`, value);
      } else if (typeof value === 'string' && value.length > 0) {
        mappedData[mappedKey] = [value];
        console.log(`✅ Converted transport_type from string "${value}" to array`);
      } else {
        mappedData[mappedKey] = [];
        console.log(`✅ Set transport_type to empty array`);
      }
          } else {
            mappedData[mappedKey] = value;
          }
        });
        
  return mappedData;
}

// Process intake form document (contains TABLES and text)
// NEW APPROACH: Use mammoth for deterministic table extraction, AI only for text fields
async function processIntakeForm(doc: any): Promise<any> {
  console.log(`📋 Processing intake form: ${doc.type}`);
  
  try {
    const path = extractStoragePath(doc.url);
    if (!path) {
      console.log('⚠️ Could not extract storage path for intake form');
      return {};
    }
    
    // Download file
    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) {
      console.log('⚠️ Could not download intake form');
      return {};
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = getFileType(path, doc.name);
    
    // Initialize result
    let tableData: any = {};
    let textData: any = {};
    let rawText = '';
    
    // STEP 1: If DOCX, use mammoth for deterministic table extraction
    if (fileType.ext === 'docx') {
      console.log('📊 DOCX detected - using mammoth for table extraction...');
      
      try {
        const extractedTables = await extractDocxTables(buffer);
        tableData = convertTableDataToEmployeeDetails(extractedTables);
        rawText = extractedTables.rawText;
        
        console.log('✅ Mammoth table extraction completed:', JSON.stringify(tableData, null, 2));
      } catch (mammothError: any) {
        console.error('⚠️ Mammoth extraction failed, falling back to AI:', mammothError.message);
      }
    } else {
      // For non-DOCX (PDF), extract raw text
      console.log('📄 Non-DOCX file, will use AI for all extraction');
    }
    
    // STEP 2: Use AI for TEXT fields only (job, experience, education, etc.)
    // The AI no longer needs to parse tables - we already have that data
    console.log('🤖 Using AI for text field extraction...');
    
    const textFieldsToExtract = [
      'current_job',
      'contract_hours', 
      'date_of_birth',
      'gender',
      'work_experience',
      'education_level',
      'education_name',
      'other_employers'
    ];
    
    // Only use AI if we have raw text or it's not DOCX
    if (rawText || fileType.ext !== 'docx') {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0, // Deterministic output
        messages: [
          {
            role: "system",
            content: `Je bent een expert in het extracten van informatie uit Nederlandse intake formulieren.

EXTRACT ALLEEN DEZE VELDEN (uit vrije tekst, NIET uit tabellen):
- current_job: De huidige/laatste functietitel (bijv. "Helpende incl medicatie")
- contract_hours: Aantal contracturen als string (bijv. "16" of "15,5" - behoud de komma als decimaal)
- date_of_birth: Geboortedatum in YYYY-MM-DD formaat
- gender: "Man" of "Vrouw"
- work_experience: ALLEEN functietitels/beroepen, gescheiden door komma's. Geen datums, geen jaren, geen organisatienamen.
- education_level: Hoogste opleidingsniveau (Praktijkonderwijs, VMBO, HAVO, VWO, MBO 1, MBO 2, MBO 3, MBO 4, HBO, WO)
- education_name: Naam van de opleiding/cursus
- other_employers: Vorige werkgevers (niet de huidige), komma-gescheiden

BELANGRIJK:
- Zoek ALLEEN in de vrije tekst
- NEGEER tabellen (vervoer, talen, computer - die worden apart verwerkt)
- Als een veld niet gevonden kan worden, gebruik null

RETURN FORMAT: ALLEEN een JSON object, geen tekst ervoor of erna.
Voorbeeld: {"current_job": "Helpende", "contract_hours": 16, "gender": "Vrouw"}`
          },
          {
            role: "user",
            content: `Extract de tekstvelden uit dit intake formulier:\n\n${rawText || '(document wordt via file_search geanalyseerd)'}`
          }
        ]
      });
      
      const aiResponse = completion.choices[0]?.message?.content || '{}';
      console.log('📄 AI text extraction response:', aiResponse.substring(0, 300));
      
      try {
        textData = parseAssistantResponse(aiResponse);
        textData = mapAndValidateData(textData);
        console.log('✅ AI text extraction completed:', Object.keys(textData).length, 'fields');
      } catch (parseError: any) {
        console.error('⚠️ Failed to parse AI response:', parseError.message);
      }
    }
    
    // STEP 3: Merge table data (from mammoth) with text data (from AI)
    // Table data takes priority for fields it covers
    const mergedData = {
      ...textData,  // AI-extracted text fields first
      ...tableData  // Mammoth-extracted table fields override
    };
    
<<<<<<< HEAD
    if (response.type === 'text') {
      console.log('📄 Raw intake form response (first 500 chars):', response.text.value.substring(0, 500));
      const extractedData = parseAssistantResponse(response.text.value);
      const mappedData = mapAndValidateData(extractedData);
        
        // Cleanup
        await openai.beta.assistants.delete(assistant.id);
      await openai.files.delete(uploadedFile.id);
      
      console.log(`✅ Intake form processing completed:`, Object.keys(mappedData).length, 'fields');
      return mappedData;
    }
=======
    console.log('✅ Intake form processing completed with merged data:', Object.keys(mergedData).length, 'fields');
    console.log('📊 Final merged data:', JSON.stringify(mergedData, null, 2));
>>>>>>> ab05792f96971edddcba5331999b0afa973c8848
    
    return mergedData;
    
  } catch (error: any) {
    console.error('❌ Error processing intake form:', error.message);
    console.error('❌ Error stack:', error.stack);
    return {};
  }
}

// Process AD report document (TEXT only, no tables)
async function processADReport(doc: any): Promise<any> {
  console.log(`📋 Processing AD report: ${doc.type}`);
  
  try {
    const path = extractStoragePath(doc.url);
    if (!path) {
      console.log('⚠️ Could not extract storage path for AD report');
      return {};
    }
    
    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) {
      console.log('⚠️ Could not download AD report');
      return {};
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = getFileType(path, doc.name);
    const fileName = `${doc.type}.${fileType.ext}`;
    
    // Create assistant with AD-specific instructions
    const assistant = await openai.beta.assistants.create({
      name: "AD Report Analyzer",
      instructions: `Je bent een expert in het analyseren van Nederlandse AD (arbeidsdeskundige) rapporten.

BELANGRIJK: Dit AD rapport bevat VRIJE TEKST, GEEN tabellen.

VELDEN TE EXTRACTEN (employee_details tabel - ALLEEN uit tekst):

- current_job: Zoek functietitel/beroep in tekst beschrijvingen
- contract_hours: Zoek "Urenomvang" of "Contracturen" in tekst
- date_of_birth: Zoek geboortedatum/leeftijd in tekst (converteer naar YYYY-MM-DD)
- gender: Zoek "Man" of "Vrouw" in tekst
- work_experience: Extract functietitels uit beschrijvingen (ALLEEN functietitels, geen datums/jaren/organisaties)
- education_level: Zoek opleidingsniveau in tekst (Praktijkonderwijs, VMBO, HAVO, VWO, MBO 1-4, HBO, WO)
- education_name: Zoek opleiding/cursus naam in tekst

NIET EXTRACTEN (niet beschikbaar in AD rapporten):
- transport_type (NIET in AD rapport)
- computer_skills (NIET in AD rapport)
- has_computer (NIET in AD rapport)
- dutch_speaking/writing/reading (NIET in AD rapport)
- drivers_license (NIET in AD rapport)
- drivers_license_type (NIET in AD rapport)

BELANGRIJK:
- Extract ALLEEN uit vrije tekst beschrijvingen
- Geen tabellen verwacht

RETURN FORMAT:
Je MOET ALLEEN een JSON object teruggeven, GEEN tekst voor of na.
VOORBEELD:
{"current_job": "Helpende", "contract_hours": 16}
NIET dit:
Hier is de informatie: {"current_job": "Helpende"}
NIET markdown, NIET bullet points, ALLEEN JSON object.`,
      model: "gpt-4o",
      tools: [{ type: "file_search" }]
    });
    
    const uploadedFile = await openai.files.create({
      file: new File([buffer], fileName, { type: fileType.mime }),
      purpose: "assistants"
    });
    
    console.log(`✅ Uploaded AD report (${fileType.mime}):`, uploadedFile.id);
    
    const thread = await openai.beta.threads.create({
      messages: [{
        role: "user",
        content: "Analyseer dit AD rapport en extract relevante werknemersprofiel velden uit de tekst.",
        attachments: [{ file_id: uploadedFile.id, tools: [{ type: "file_search" }] }]
      }]
    });
    
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    });
    
    if (run.status !== 'completed') {
      throw new Error(`Assistant run failed: ${run.status}`);
    }
    
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0].content[0];
    
    if (response.type === 'text') {
      const extractedData = parseAssistantResponse(response.text.value);
      const mappedData = mapAndValidateData(extractedData);
      
      await openai.beta.assistants.delete(assistant.id);
      await openai.files.delete(uploadedFile.id);
      
      console.log(`✅ AD report processing completed:`, Object.keys(mappedData).length, 'fields');
      return mappedData;
    }
    
    await openai.beta.assistants.delete(assistant.id);
    await openai.files.delete(uploadedFile.id);
    return {};
    
  } catch (error: any) {
    console.error('❌ Error processing AD report:', error.message);
    return {};
  }
}

// Process FML/IZP document (TEXT only)
async function processFMLIZP(doc: any): Promise<any> {
  console.log(`📋 Processing FML/IZP: ${doc.type}`);
  
  try {
    const path = extractStoragePath(doc.url);
    if (!path) {
      console.log('⚠️ Could not extract storage path for FML/IZP');
      return {};
    }
    
    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) {
      console.log('⚠️ Could not download FML/IZP');
      return {};
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = getFileType(path, doc.name);
    const fileName = `${doc.type}.${fileType.ext}`;
    
    const assistant = await openai.beta.assistants.create({
      name: "FML/IZP Analyzer",
      instructions: `Je bent een expert in het analyseren van Nederlandse FML/IZP documenten.

BELANGRIJK: Dit document bevat VRIJE TEKST, GEEN tabellen.

VELDEN TE EXTRACTEN (employee_details tabel - ALLEEN uit tekst):

- date_of_birth: Zoek geboortedatum in tekst (YYYY-MM-DD format)
- gender: Zoek "Man" of "Vrouw" in tekst
- contract_hours: Zoek urenomvang indien beschikbaar

NIET EXTRACTEN (medische informatie niet relevant voor employee_details):
- transport_type, computer_skills, language_skills, etc. (niet in FML/IZP)

BELANGRIJK:
- Extract ALLEEN uit tekst
- Focus op demografische gegevens

RETURN FORMAT:
Je MOET ALLEEN een JSON object teruggeven, GEEN tekst voor of na.
VOORBEELD:
{"date_of_birth": "1977-01-02", "gender": "Vrouw"}
NIET markdown, NIET bullet points, ALLEEN JSON object.`,
      model: "gpt-4o",
      tools: [{ type: "file_search" }]
    });
    
    const uploadedFile = await openai.files.create({
      file: new File([buffer], fileName, { type: fileType.mime }),
      purpose: "assistants"
    });
    
    console.log(`✅ Uploaded FML/IZP (${fileType.mime}):`, uploadedFile.id);
    
    const thread = await openai.beta.threads.create({
      messages: [{
        role: "user",
        content: "Analyseer dit FML/IZP document en extract relevante demografische gegevens.",
        attachments: [{ file_id: uploadedFile.id, tools: [{ type: "file_search" }] }]
      }]
    });
    
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    });
    
    if (run.status !== 'completed') {
      throw new Error(`Assistant run failed: ${run.status}`);
    }
    
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0].content[0];
    
    if (response.type === 'text') {
      const extractedData = parseAssistantResponse(response.text.value);
      const mappedData = mapAndValidateData(extractedData);
      
      await openai.beta.assistants.delete(assistant.id);
      await openai.files.delete(uploadedFile.id);
      
      console.log(`✅ FML/IZP processing completed:`, Object.keys(mappedData).length, 'fields');
        return mappedData;
      }
    
    await openai.beta.assistants.delete(assistant.id);
    await openai.files.delete(uploadedFile.id);
    return {};
    
  } catch (error: any) {
    console.error('❌ Error processing FML/IZP:', error.message);
    return {};
  }
}

// Process extra document (TEXT only, generic fallback)
async function processExtraDoc(doc: any): Promise<any> {
  console.log(`📋 Processing extra document: ${doc.type}`);
  
  try {
    const path = extractStoragePath(doc.url);
    if (!path) {
      console.log('⚠️ Could not extract storage path for extra document');
      return {};
    }
    
    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) {
      console.log('⚠️ Could not download extra document');
      return {};
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = getFileType(path, doc.name);
    const fileName = `${doc.type}.${fileType.ext}`;
    
    const assistant = await openai.beta.assistants.create({
      name: "Extra Document Analyzer",
      instructions: `Je bent een expert in het analyseren van Nederlandse werknemersdocumenten.

BELANGRIJK: Dit document bevat VRIJE TEKST, GEEN tabellen.

VELDEN TE EXTRACTEN (employee_details tabel - ALLEEN uit tekst):

- current_job: Zoek functietitel/beroep in tekst
- contract_hours: Zoek urenomvang in tekst
- date_of_birth: Zoek geboortedatum (YYYY-MM-DD)
- gender: Zoek "Man" of "Vrouw"
- work_experience: Extract functietitels uit tekst
- education_level: Zoek opleidingsniveau in tekst

BELANGRIJK:
- Extract ALLEEN uit tekst

RETURN FORMAT:
Je MOET ALLEEN een JSON object teruggeven, GEEN tekst voor of na.
VOORBEELD:
{"current_job": "Helpende", "contract_hours": 16}
NIET markdown, NIET bullet points, ALLEEN JSON object.`,
      model: "gpt-4o",
      tools: [{ type: "file_search" }]
    });
    
    const uploadedFile = await openai.files.create({
      file: new File([buffer], fileName, { type: fileType.mime }),
      purpose: "assistants"
    });
    
    console.log(`✅ Uploaded extra document (${fileType.mime}):`, uploadedFile.id);
    
    const thread = await openai.beta.threads.create({
      messages: [{
        role: "user",
        content: "Analyseer dit document en extract relevante werknemersprofiel velden.",
        attachments: [{ file_id: uploadedFile.id, tools: [{ type: "file_search" }] }]
      }]
    });
    
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    });
    
    if (run.status !== 'completed') {
    throw new Error(`Assistant run failed: ${run.status}`);
    }
    
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0].content[0];
    
    if (response.type === 'text') {
      const extractedData = parseAssistantResponse(response.text.value);
      const mappedData = mapAndValidateData(extractedData);
      
      await openai.beta.assistants.delete(assistant.id);
      await openai.files.delete(uploadedFile.id);
      
      console.log(`✅ Extra document processing completed:`, Object.keys(mappedData).length, 'fields');
      return mappedData;
    }
    
    await openai.beta.assistants.delete(assistant.id);
    await openai.files.delete(uploadedFile.id);
    return {};
    
  } catch (error: any) {
    console.error('❌ Error processing extra document:', error.message);
    return {};
  }
}

// Main function: Process documents separately and merge with priority
async function processDocumentsSeparately(docs: any[]): Promise<any> {
  console.log('🚀 Processing documents separately with document-specific instructions...');
  
  const results: any = {};
  const processedDocs: string[] = [];
  
  // 1. Process intake form (highest priority)
  const intakeDoc = docs.find(d => {
    const type = (d.type || '').toLowerCase();
    return type.includes('intake');
  });
  
  if (intakeDoc) {
    console.log('📄 Processing intake form (priority 1)...');
    const intakeResult = await processIntakeForm(intakeDoc);
    Object.assign(results, intakeResult);
    processedDocs.push('intakeformulier');
    console.log(`✅ Intake form: ${Object.keys(intakeResult).length} fields extracted`);
  }
  
  // 2. Process AD report (second priority) - only fill missing fields
  const adDoc = docs.find(d => {
    const type = (d.type || '').toLowerCase();
    return type.includes('ad') || type.includes('arbeidsdeskundig');
  });
  
  if (adDoc) {
    console.log('📄 Processing AD report (priority 2)...');
    const adResult = await processADReport(adDoc);
    // Only merge fields that are missing
    Object.keys(adResult).forEach(key => {
      if (!results[key] || results[key] === null || results[key] === '') {
        results[key] = adResult[key];
      }
    });
    processedDocs.push('ad_rapport');
    console.log(`✅ AD report: ${Object.keys(adResult).length} fields extracted`);
  }
  
  // 3. Process FML/IZP (third priority) - only fill missing fields
  const fmlDoc = docs.find(d => {
    const type = (d.type || '').toLowerCase();
    return type === 'fml' || type === 'izp' || type === 'lab';
  });
  
  if (fmlDoc) {
    console.log('📄 Processing FML/IZP (priority 3)...');
    const fmlResult = await processFMLIZP(fmlDoc);
    Object.keys(fmlResult).forEach(key => {
      if (!results[key] || results[key] === null || results[key] === '') {
        results[key] = fmlResult[key];
      }
    });
    processedDocs.push('fml/izp');
    console.log(`✅ FML/IZP: ${Object.keys(fmlResult).length} fields extracted`);
  }
  
  // 4. Process extra documents (lowest priority) - only fill missing fields
  const extraDocs = docs.filter(d => {
    const type = (d.type || '').toLowerCase();
    return !type.includes('intake') && 
           !type.includes('ad') && 
           !type.includes('arbeidsdeskundig') &&
           type !== 'fml' && 
           type !== 'izp' && 
           type !== 'lab';
  });
  
  if (extraDocs.length > 0) {
    console.log(`📄 Processing ${extraDocs.length} extra document(s) (priority 4)...`);
    for (const extraDoc of extraDocs) {
      const extraResult = await processExtraDoc(extraDoc);
      Object.keys(extraResult).forEach(key => {
        if (!results[key] || results[key] === null || results[key] === '') {
          results[key] = extraResult[key];
        }
      });
    }
    processedDocs.push('extra');
    console.log(`✅ Extra documents: processed`);
  }
  
  console.log(`✅ Document processing completed. Processed: ${processedDocs.join(', ')}. Total fields: ${Object.keys(results).length}`);
  
  return results;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    
    if (!employeeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing employeeId',
        data: { details: {} }
      }, { status: 400 });
    }

    console.log('🔍 Processing employee:', employeeId);

    // Fetch documents
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employeeId);

    if (docsError) {
      console.error('Database error:', docsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        data: { details: {} }
      }, { status: 500 });
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: { details: {} },
        message: 'No documents found for this employee'
      });
    }

    console.log('📄 Found documents:', docs.length);

    // Process documents separately
    const details = await processDocumentsSeparately(docs);
    
    if (Object.keys(details).length === 0) {
      console.error('❌ No data extracted from documents');
      return NextResponse.json({ 
        success: false, 
        data: { details: {} },
        message: 'Geen relevante informatie gevonden in de documenten'
      });
    }
    
    console.log('✅ Document processing completed');

    return NextResponse.json({
      success: true,
      data: {
        details,
        autofilled_fields: Object.keys(details)
      },
      message: `Employee information successfully extracted from ${docs.length} documents using separate document processing`
    });

  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Processing failed', 
      details: error.message,
      data: { details: {} }
    }, { status: 500 });
  }
}
