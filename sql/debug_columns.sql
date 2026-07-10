-- Temporary debug function to inspect schema columns
create or replace function public.debug_table_columns(schema_name text, table_name text)
returns json
language plpgsql
security definer
as $$
declare
  col_rec record;
  out_arr jsonb := '[]'::jsonb;
begin
  for col_rec in 
    select column_name, data_type, is_nullable
    from information_schema.columns 
    where table_schema = schema_name 
      and table_name = table_name
  loop
    out_arr := out_arr || json_build_object(
      'column_name', col_rec.column_name,
      'data_type', col_rec.data_type,
      'is_nullable', col_rec.is_nullable
    )::jsonb;
  end loop;
  return out_arr;
end;
$$;
