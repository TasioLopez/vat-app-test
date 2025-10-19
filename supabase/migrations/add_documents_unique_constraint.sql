-- Add unique constraint to prevent duplicate document types per employee
-- Excludes 'tp' type since multiple can exist per employee
CREATE UNIQUE INDEX documents_employee_type_unique 
ON documents(employee_id, type) 
WHERE type != 'tp';
