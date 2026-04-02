const fs = require('fs');
const path = require('path');

const supabasePath = path.join(__dirname, '..', 'src', 'types', 'supabase.ts');
let content = fs.readFileSync(supabasePath, 'utf16le');
content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// 1. employees.Row: add referent_id after client_id
content = content.replace(
  `        Row: {
          client_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?:`,
  `        Row: {
          client_id: string | null
          referent_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
        }
        Insert: {
          client_id?: string | null
          referent_id?: string | null
          created_at?:`
);

// employees.Update: add referent_id (after client_id)
content = content.replace(
  `        Update: {
          client_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_client_id_fkey"`,
  `        Update: {
          client_id?: string | null
          referent_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_client_id_fkey"`
);

// 2. tp_meta.Row: add client_referent_name, client_referent_phone, client_referent_function, client_referent_gender (after client_referent_email)
content = content.replace(
  `          client_referent_email: string | null
          created_at: string | null
          employee_id: string | null
          first_sick_day: string | null`,
  `          client_referent_email: string | null
          client_referent_name: string | null
          client_referent_phone: string | null
          client_referent_function: string | null
          client_referent_gender: string | null
          created_at: string | null
          employee_id: string | null
          first_sick_day: string | null`
);

// tp_meta.Insert (same order)
content = content.replace(
  `          client_referent_email?: string | null
          created_at?: string | null
          employee_id?: string | null
          first_sick_day?: string | null`,
  `          client_referent_email?: string | null
          client_referent_name?: string | null
          client_referent_phone?: string | null
          client_referent_function?: string | null
          client_referent_gender?: string | null
          created_at?: string | null
          employee_id?: string | null
          first_sick_day?: string | null`
);

// tp_meta.Update (same order)
content = content.replace(
  `          client_referent_email?: string | null
          created_at?: string | null
          employee_id?: string | null
          first_sick_day?: string | null`,
  `          client_referent_email?: string | null
          client_referent_name?: string | null
          client_referent_phone?: string | null
          client_referent_function?: string | null
          client_referent_gender?: string | null
          created_at?: string | null
          employee_id?: string | null
          first_sick_day?: string | null`
);

fs.writeFileSync(supabasePath, content, 'utf16le');
console.log('Added employees.referent_id and tp_meta referent fields.');
