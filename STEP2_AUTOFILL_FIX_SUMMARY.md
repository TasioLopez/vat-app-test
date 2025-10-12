# Step 2 Autofill Fix - Summary

## Problem
The Step 2 autofill was incorrectly updating auto-calculated fields (like `tp_creation_date`, `tp_start_date`, `tp_end_date`, `tp_lead_time`) instead of extracting the actual information from uploaded documents.

## Solution Overview
Fixed the `/api/autofill-tp-2` endpoint to:
1. **ONLY extract fields that should come from documents**
2. **Improved PDF text extraction** using pdfjs-dist library
3. **Better document prioritization** (Intakeformulier > AD Rapport > FML/IZP > Others)
4. **Enhanced AI prompting** with specific field descriptions and examples
5. **Better error handling and user feedback**

---

## Changes Made

### 1. `/src/app/api/autofill-tp-2/route.ts`

#### A. Enhanced PDF Text Extraction
- **Added** `pdfjs-dist` library for proper PDF text extraction
- **Fallback methods** if pdfjs fails (latin1 encoding, text markers, ASCII text)
- **Better logging** to track extraction success/failure

#### B. Document Prioritization
- Documents are now sorted by priority before processing:
  1. Intakeformulier (highest priority)
  2. AD Rapport
  3. FML/IZP/LAB reports
  4. Others (lowest priority)
- Document type and filename are added as context for AI

#### C. Restricted Fields to Extract
**NOW ONLY EXTRACTS:**
- ✅ `first_sick_day` - Eerste ziektedag/verzuimdag
- ✅ `registration_date` - Registratiedatum/Aanmelddatum UWV
- ✅ `ad_report_date` - Datum AD Rapport
- ✅ `fml_izp_lab_date` - Datum FML/IZP/LAB rapport
- ✅ `occupational_doctor_name` - Naam bedrijfsarts
- ✅ `occupational_doctor_org` - Organisatie bedrijfsarts

**NO LONGER EXTRACTS (auto-calculated):**
- ❌ `tp_creation_date` (set in Step 1)
- ❌ `tp_start_date` (auto-calculated from intake_date)
- ❌ `tp_end_date` (auto-calculated from first_sick_day + 2 years)
- ❌ `tp_lead_time` (auto-calculated from date difference)
- ❌ `intake_date` (set in Step 1)

#### D. Improved AI Prompt
- **Clear instructions** on what NOT to extract
- **Specific search terms** for each field (with synonyms and variations)
- **Examples** of how to recognize each field in Dutch documents
- **Date format specification** (YYYY-MM-DD)
- **Context awareness** tips for the AI

#### E. Better Logging & Error Messages
- **Detailed console logs** for debugging:
  - Document count and types
  - Download success/failure
  - Text extraction results
  - AI extraction results
- **User-friendly error messages** in Dutch
- **Success messages** showing what fields were filled

### 2. `/src/components/tp/sections/EmployeeInfo.tsx`

#### Enhanced Autofill Handler
- **Better error handling** with user-friendly alerts
- **Success feedback** showing exactly which fields were filled
- **Error feedback** with clear messages about what went wrong

### 3. `package.json`

#### New Dependency
- **Added** `pdfjs-dist` for robust PDF text extraction

---

## Auto-Calculation Logic (remains unchanged)

These calculations happen automatically in the EmployeeInfo component:

```typescript
// tp_start_date = intake_date
useEffect(() => {
  if (tpData.tp_start_date !== tpData.intake_date) 
    updateField('tp_start_date', tpData.intake_date);
}, [tpData.intake_date]);

// tp_end_date = first_sick_day + 2 years
useEffect(() => {
  const endDate = addYears(parseDateFlexible(tpData.first_sick_day), 2);
  updateField('tp_end_date', toISODate(endDate));
}, [tpData.first_sick_day]);

// tp_lead_time = weeks between start and end
useEffect(() => {
  const weeks = weekDiffCeil(
    parseDateFlexible(tpData.tp_start_date),
    parseDateFlexible(tpData.tp_end_date)
  );
  updateField('tp_lead_time', String(weeks));
}, [tpData.tp_start_date, tpData.tp_end_date]);
```

---

## How to Send PDFs for Analysis

You can share your PDFs with me in any of these ways:

1. **Direct Upload**: Drag and drop PDF files directly into this chat
2. **Paste**: Copy and paste PDF files into the conversation
3. **Share Link**: Provide a download link from your Supabase storage
4. **Screenshot**: If you can't share the full PDF, screenshots of key sections work too

Once you share the PDFs, I can:
- Analyze their structure and content
- Identify where specific fields are located
- Optimize the extraction patterns
- Add special handling for your document formats

---

## Testing the Fix

### To Test:
1. Navigate to an employee's TP (Step 2 - Employee Info)
2. Make sure the employee has documents uploaded (Intakeformulier, AD Rapport, etc.)
3. Click the "Autofill" button
4. Check the console logs (F12 → Console) to see detailed extraction info
5. Verify that ONLY the correct fields are filled:
   - First sick day
   - Registration date
   - AD report date
   - FML/IZP date
   - Occupational doctor name/org
6. Verify that auto-calculated fields remain unchanged:
   - TP creation date (from Step 1)
   - TP start/end dates (auto-calculated)
   - TP lead time (auto-calculated)

### Expected Results:
- ✅ Success alert showing which fields were filled
- ✅ Console logs showing PDF extraction details
- ✅ Auto-calculated fields remain correct
- ✅ Only document-based fields are updated

### If It Fails:
- Check console logs for specific errors
- Verify PDFs contain text (not scanned images)
- Share PDFs with me for custom optimization

---

## Next Steps

1. **Test the autofill** with your actual documents
2. **Share sample PDFs** if extraction isn't working optimally
3. **Report any missing fields** that should be extracted
4. I can add **more field patterns** based on your document structure

