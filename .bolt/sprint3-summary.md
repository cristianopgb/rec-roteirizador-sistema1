# Sprint 3 - Carteira Upload System - Summary

## Implementation Complete

A comprehensive carteira upload, validation, and routing payload generation system has been successfully implemented with **EXACT column name validation** (zero tolerance for deviations).

---

## Core Features Implemented

### 1. Database Schema
**Tables Created:**
- `uploads_carteira` - Metadata for uploaded files (nome_arquivo, usuario_id, filial_id, total_linhas, total_validas, total_invalidas, status, erro_estrutura)
- `carteira_itens` - Individual row storage with JSONB preservation of exact Excel column names plus extracted typed columns for query performance

**Key Design Decisions:**
- `dados_originais` JSONB column stores complete row data with EXACT Excel column names as keys
- Extracted typed columns (filial, romane, nro_doc, uf, cida, destinatario, tomador, peso, vlr_merc, dates, coordinates) for efficient filtering
- GIN index on JSONB for fast querying
- Row Level Security (RLS) policies for admin and user access control

### 2. Exact Column Name Validation

**Critical Requirement Met:**
- **37 required columns** defined in `COLUNAS_OBRIGATORIAS_EXCEL` constant
- **Zero normalization** - strict string equality validation (case, space, accent sensitive)
- Examples enforced:
  - "Série" (not "Serie")
  - "Destinatário" (not "Destinatario")
  - "Observação R" (not "Observacao_R")
  - "NF / Serie" (with spaces, not "NF/Serie")
  - "D.L.E." (with periods)

**Validation Process:**
1. Read Excel headers exactly as they appear (no transformation)
2. Compare each header using strict `===` equality
3. Block entire file if ANY column doesn't match EXACTLY
4. Provide detailed error showing expected vs found column names
5. Store structure errors in database for review

### 3. File Processing Pipeline

**Upload Flow:**
1. User selects .xlsx file (10MB max)
2. File structure validation (EXACT column matching)
3. If structure valid → process rows
4. Each row validated for business rules:
   - UF must be exactly 2 characters
   - Peso (weight) must be valid number
   - Vlr.Merc. (merchandise value) must be valid number
   - Lat./Lon. optional but must be valid numbers if present
5. Store original data in JSONB + extract typed columns
6. Batch insert (500 rows per batch)
7. Update statistics (total_linhas, total_validas, total_invalidas)

**Validation Status:**
- `valida` - Row passed all validation rules
- `invalida` - Row failed one or more rules (specific errors stored)

### 4. User Interface

**Upload Section:**
- Drag & drop file upload component
- File size and type validation
- Processing status with loading indicator
- Structure error display (blocking with clear error message)
- Row validation error display

**Statistics Dashboard:**
- Total de Linhas
- Linhas Válidas (green)
- Linhas Inválidas (red)
- Taxa de Validação (percentage)

**Data Preview Table:**
- First 50 rows displayed
- Key columns shown: Filial, Romane, Nro Doc., Destinatário, Cidade, UF, Peso, Vlr. Merc., Status
- Invalid rows highlighted with error tooltips
- Horizontal scroll for wide data

**Recent Uploads:**
- Last 5 uploads shown
- Quick load previous upload
- Status badges (processando, concluido, erro)

### 5. Advanced Filter System

**Filter Options:**
- Status Validação (valida/invalida)
- Filial (text search) - auto-locked for users, open for admins
- UF (2-char state code)
- Destinatário (recipient name search)
- Cidade (city search)
- Tomador (payer search)
- Date ranges:
  - Agendam. (scheduling date)
  - D.L.E. (delivery date)
  - Data Des (dispatch date)

**Filter Behavior:**
- Active filter count badge
- Clear all filters button
- Filters applied to both preview table and payload generation
- Users can only filter their own filial's data
- Admins can filter across all filials

### 6. Payload Generation

**Function:** `montarPayloadRoteirizacao()`

**Payload Structure:**
```json
{
  "carteira": [
    { /* Row with EXACT Excel column names */ }
  ],
  "veiculos": [
    { /* Active vehicles for filial */ }
  ],
  "regionalidades": [
    { /* All regionalidade records */ }
  ],
  "parametros": {
    "usuario_id": "uuid",
    "usuario_nome": "string",
    "filial_id": "uuid",
    "filial_nome": "string",
    "data_execucao": "ISO datetime",
    "filtros_aplicados": { /* Filter object */ }
  }
}
```

**Validation:**
- Only valid rows included
- Filters applied to carteira selection
- Checks for empty carteira (blocks if no valid rows)
- Checks for empty vehicles (blocks if no active vehicles)
- Downloads as JSON file for external routing system

### 7. Blocking Conditions

**System blocks user from proceeding when:**
1. **Structure Invalid:** File doesn't have exact 37 columns with exact names → Show structure error, allow retry
2. **No File Selected:** Disable "Processar Carteira" button
3. **100% Invalid Rows:** Show alert, disable "Gerar Roteirização" button
4. **No Valid Rows After Filters:** Payload generation throws error
5. **No Active Vehicles:** Payload generation throws error

---

## File Structure

### New Files Created:
1. `src/constants/carteira-columns.ts` - Column definitions and types
2. `src/services/carteira.service.ts` - Upload processing and data retrieval
3. `src/components/carteira/CarteiraFilters.tsx` - Advanced filter component

### Updated Files:
1. `src/pages/Roteirizacao.tsx` - Complete upload interface implementation
2. `supabase/migrations/[timestamp]_create_uploads_carteira_tables.sql` - Database schema

---

## Key Technical Details

### Constants File (`carteira-columns.ts`):
- `COLUNAS_OBRIGATORIAS_EXCEL`: Array of 37 exact column names
- `EXCEL_TO_DB_MAP`: Mapping from Excel names to database column names
- `CarteiraExcelRow`: TypeScript type with exact Excel column names
- `RowValidationResult`, `StructureValidationResult`: Validation types

### Service Functions (`carteira.service.ts`):
- `validateExcelStructure()`: EXACT header validation, no normalization
- `validateCarteiraRow()`: Business rule validation (UF, Peso, Vlr.Merc., coordinates)
- `processCarteiraUpload()`: Complete upload pipeline with error handling
- `getUploadById()`: Fetch upload metadata
- `getCarteiraItems()`: Fetch items with pagination and filters
- `getRecentUploads()`: Fetch recent upload history
- `montarPayloadRoteirizacao()`: Generate routing payload with all dependencies

### Database Schema:
- JSONB storage preserves exact Excel column names
- Typed columns extracted for performance
- RLS policies enforce filial-based access control
- Indexes on common filter columns
- Cascade delete on upload removal

---

## Security & Permissions

**RLS Policies:**
- Admins: Full access to all uploads and items
- Users: Access only to their filial's data
- INSERT policies validate filial ownership
- UPDATE policies restricted to admins

**Data Validation:**
- File type validation (.xlsx only)
- File size limit (10MB)
- Structure validation before processing
- Business rule validation per row
- SQL injection protection via parameterized queries

---

## User Experience Flow

### Successful Upload:
1. Select file → See file details
2. Click "Processar Carteira" → Loading state
3. View statistics dashboard → Green/red indicators
4. Preview data table → See valid/invalid rows
5. Apply filters (optional) → Narrow dataset
6. Click "Gerar Roteirização" → Download JSON payload

### Failed Upload (Structure Error):
1. Select file → See file details
2. Click "Processar Carteira" → Processing
3. **Red error box** with exact column name differences
4. Click "Tentar Novamente" or "Nova Carteira"
5. Fix Excel file structure
6. Retry upload

### Failed Upload (100% Invalid):
1. File structure valid → Processing succeeds
2. **Red alert** showing 100% invalid rows
3. View preview table with all error details
4. **Cannot proceed** to generate routing
5. Fix data issues in Excel
6. Upload corrected file

---

## Testing Checklist

- [x] Upload with exact column names → Success
- [x] Upload with missing columns → Structure error, blocked
- [x] Upload with misspelled columns → Structure error with details
- [x] Upload with extra columns → Structure error
- [x] Upload with invalid UF → Row marked invalid
- [x] Upload with non-numeric Peso → Row marked invalid
- [x] Upload with non-numeric Vlr.Merc. → Row marked invalid
- [x] Upload with invalid coordinates → Row marked invalid
- [x] Filter by status → Table updates
- [x] Filter by UF → Table updates
- [x] Filter by date ranges → Table updates
- [x] Generate payload with filters → JSON includes only filtered valid rows
- [x] User access → Only sees own filial
- [x] Admin access → Sees all filials
- [x] Build success → No TypeScript errors

---

## Next Steps (Future Enhancements)

1. **External Routing API Integration:**
   - Send payload to routing service API
   - Receive routing results
   - Store routing output in database

2. **Route Visualization:**
   - Display routes on map
   - Show vehicle assignments
   - Display delivery sequence

3. **Export Options:**
   - Download routes as PDF
   - Export to Excel
   - Print delivery manifests

4. **Performance Optimizations:**
   - Lazy loading for large datasets
   - Virtual scrolling for tables
   - Background processing for large files

5. **Enhanced Validation:**
   - Address validation
   - Coordinate geocoding
   - Duplicate detection

---

## Summary

The carteira upload system is **production-ready** with:
- ✅ Exact column name validation (zero tolerance)
- ✅ Comprehensive error handling and user feedback
- ✅ Advanced filtering capabilities
- ✅ Complete payload generation for routing
- ✅ Secure RLS policies
- ✅ Responsive UI with loading states
- ✅ Recent uploads history
- ✅ Detailed validation statistics
- ✅ JSON payload export

The system successfully blocks invalid files while providing clear, actionable error messages to guide users toward resolution.
