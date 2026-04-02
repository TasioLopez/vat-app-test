const fs = require('fs');
const path = require('path');

const supabasePath = path.join(__dirname, '..', 'src', 'types', 'supabase.ts');
let content = fs.readFileSync(supabasePath, 'utf16le');
content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const oldBlock = `      }
      documents: {
        Row: {
          employee_id: string | null
          id: string`;

const newBlock = `      }
      referents: {
        Row: {
          id: string
          client_id: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          email: string | null
          referent_function: string | null
          gender: string | null
          display_order: number | null
          is_default: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          email?: string | null
          referent_function?: string | null
          gender?: string | null
          display_order?: number | null
          is_default?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          email?: string | null
          referent_function?: string | null
          gender?: string | null
          display_order?: number | null
          is_default?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referents_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      documents: {
        Row: {
          employee_id: string | null
          id: string`;

if (!content.includes(oldBlock)) {
  console.error('Old block not found in', supabasePath);
  process.exit(1);
}
content = content.replace(oldBlock, newBlock);
fs.writeFileSync(supabasePath, content, 'utf16le');
console.log('Added referents table to supabase types.');
