-- Add last_accessed_at and last_modified_at to employee_users
ALTER TABLE employee_users 
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_employee_users_last_accessed 
ON employee_users(user_id, last_accessed_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_employee_users_last_modified 
ON employee_users(user_id, last_modified_at DESC NULLS LAST);

-- Add similar columns to user_clients if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_clients') THEN
    ALTER TABLE user_clients 
    ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ;
    
    CREATE INDEX IF NOT EXISTS idx_user_clients_last_accessed 
    ON user_clients(user_id, last_accessed_at DESC NULLS LAST);
    
    CREATE INDEX IF NOT EXISTS idx_user_clients_last_modified 
    ON user_clients(user_id, last_modified_at DESC NULLS LAST);
  END IF;
END $$;

