-- Ejecutar en el SQL Editor de Supabase para verificar RLS
-- Resultado esperado: rowsecurity = true en gastos y presupuestos

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('gastos', 'presupuestos');

-- Políticas activas (debe haber 4 en gastos y 3 en presupuestos)
SELECT
  tablename,
  policyname,
  cmd AS operacion,
  qual AS condicion_select,
  with_check AS condicion_insert_update
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('gastos', 'presupuestos')
ORDER BY tablename, policyname;

-- Vista mensual con security_invoker
SELECT
  c.relname AS vista,
  c.relrowsecurity AS rls_en_vista
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'gastos_resumen_mensual';
