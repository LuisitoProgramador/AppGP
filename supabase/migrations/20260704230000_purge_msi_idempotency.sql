-- Purga claves de idempotencia MSI antiguas (retención ~48 h).
create or replace function public.purge_msi_idempotency_keys(
  older_than interval default interval '2 days'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  delete from public.msi_idempotency_keys
  where created_at < timezone('utc', now()) - older_than;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_msi_idempotency_keys(interval) from public;
grant execute on function public.purge_msi_idempotency_keys(interval) to service_role;
