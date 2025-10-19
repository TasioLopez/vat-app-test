-- SQL script to fix foreign key constraints for employee deletion
-- Run this in your Supabase SQL editor to enable CASCADE DELETE

-- 1. Drop existing foreign key constraints
ALTER TABLE tp_meta DROP CONSTRAINT IF EXISTS tp_meta_employee_id_fkey;
ALTER TABLE employee_details DROP CONSTRAINT IF EXISTS employee_details_employee_id_fkey;
ALTER TABLE employee_users DROP CONSTRAINT IF EXISTS employee_users_employee_id_fkey;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_employee_id_fkey;
ALTER TABLE tp_docs DROP CONSTRAINT IF EXISTS tp_docs_employee_id_fkey;

-- 2. Recreate foreign key constraints with CASCADE DELETE
ALTER TABLE tp_meta 
ADD CONSTRAINT tp_meta_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE employee_details 
ADD CONSTRAINT employee_details_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE employee_users 
ADD CONSTRAINT employee_users_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE documents 
ADD CONSTRAINT documents_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE tp_docs 
ADD CONSTRAINT tp_docs_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- 3. Verify the constraints were created correctly
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'employees'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;


