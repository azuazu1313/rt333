/*
  # Add developer tools functionality
  
  1. New Functions
    - `run_sql_query` - A secured function to run read-only SQL queries for the database browser
    - `get_table_columns` - A function to get column information for a table
  
  2. Security
    - Both functions are SECURITY DEFINER functions that enforce read-only access
    - Limited to admin users only for security
*/

-- Function to run SQL queries (READ ONLY for security)
CREATE OR REPLACE FUNCTION public.run_sql_query(sql_query text)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    is_admin boolean;
BEGIN
    -- Check if the user is an admin
    SELECT user_role = 'admin' INTO is_admin 
    FROM auth.users JOIN public.users ON auth.users.id = public.users.id
    WHERE auth.users.id = auth.uid();
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only administrators can execute SQL queries';
    END IF;
    
    -- Check if the query is read-only (only allow SELECT)
    IF NOT (
        sql_query ~* '^[\s\n]*select'
    ) THEN
        RAISE EXCEPTION 'Only SELECT queries are allowed for security reasons';
    END IF;
    
    -- Execute the query and return results
    FOR result IN EXECUTE sql_query
    LOOP
        RETURN NEXT result;
    END LOOP;
    
    RETURN;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error executing SQL query: %', SQLERRM;
END;
$$;

-- Secure function to get columns for a table
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name text)
RETURNS TABLE (
    column_name text,
    data_type text,
    is_nullable boolean,
    column_default text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
BEGIN
    -- Check if the user is an admin
    SELECT user_role = 'admin' INTO is_admin 
    FROM auth.users JOIN public.users ON auth.users.id = public.users.id
    WHERE auth.users.id = auth.uid();
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only administrators can access table schema information';
    END IF;
    
    RETURN QUERY
    SELECT 
        c.column_name::text,
        c.data_type::text,
        (c.is_nullable = 'YES')::boolean,
        c.column_default::text
    FROM 
        information_schema.columns c
    WHERE 
        c.table_schema = 'public' AND 
        c.table_name = table_name
    ORDER BY 
        c.ordinal_position;
END;
$$;

COMMENT ON FUNCTION public.run_sql_query IS 'Executes a read-only SQL query with admin permission check';
COMMENT ON FUNCTION public.get_table_columns IS 'Gets column information for a specified table with admin permission check';