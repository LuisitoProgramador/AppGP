import { memo } from 'react'
import { useHistorial } from '../hooks/historial/useHistorial'
import { navigateToTab } from '../utils/dashboard/welcomeBack'
import EditGastoModal from './editGasto/EditGastoModal'
import MonthSelector from './ui/MonthSelector'
import Select from './ui/Select'
import OfflineSyncStatus from './dashboard/widgets/OfflineSyncStatus'
import HistorialVirtualList from './historial/HistorialVirtualList'
import {
  cardClassName,
  inputClassName,
  buttonSecondaryClassName,
} from './ui/formStyles'

export default memo(function Historial() {
  const {
    selectedMonth,
    setSelectedMonth,
    categoriaFiltro,
    setCategoriaFiltro,
    busqueda,
    setBusqueda,
    categoriaFilterOptions,
    items,
    handleLoadMore,
    handleEliminar,
    abrirEdicion,
    handleCloseEdit,
    gastoEditando,
    editModo,
    error,
    cargando,
    cargandoMas,
    hasMore,
    accionId,
    isSyncing,
    pendingCount,
  } = useHistorial()

  return (
    <section className={cardClassName}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Historial</h2>
        <p className="text-sm text-slate-400">Gastos e ingresos del mes</p>
      </div>

      <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />

      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          value={categoriaFiltro}
          onChange={setCategoriaFiltro}
          aria-label="Filtrar por categoría"
          options={categoriaFilterOptions}
        />
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar descripción..."
          className={inputClassName}
          aria-label="Buscar por descripción"
        />
      </div>

      <OfflineSyncStatus isSyncing={isSyncing} pendingCount={pendingCount} />

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Error al cargar historial: {error}
        </p>
      )}

      {cargando && <p className="text-center text-sm text-slate-400">Cargando...</p>}

      {!cargando && !error && items.length === 0 && (
        <div className="space-y-3 text-center">
          <p className="text-sm text-slate-400">
            {busqueda.trim() || categoriaFiltro !== 'Todas'
              ? 'No hay movimientos que coincidan con los filtros.'
              : 'Aún no hay movimientos este mes.'}
          </p>
          {!busqueda.trim() && categoriaFiltro === 'Todas' && (
            <button
              type="button"
              onClick={() => navigateToTab('registro')}
              className={buttonSecondaryClassName}
            >
              Registrar primer gasto
            </button>
          )}
        </div>
      )}

      {!cargando && items.length > 0 && (
        <HistorialVirtualList
          items={items}
          accionId={accionId}
          hasMore={hasMore}
          cargandoMas={cargandoMas}
          onLoadMore={handleLoadMore}
          onEdit={abrirEdicion}
          onDelete={handleEliminar}
        />
      )}

      {!cargando && hasMore && cargandoMas && (
        <button type="button" disabled className={`w-full ${buttonSecondaryClassName}`}>
          Cargando...
        </button>
      )}

      {gastoEditando && (
        <EditGastoModal
          gasto={gastoEditando}
          modoInicial={editModo}
          onClose={handleCloseEdit}
        />
      )}
    </section>
  )
})
