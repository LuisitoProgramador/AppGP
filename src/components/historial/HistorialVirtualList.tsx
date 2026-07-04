import { memo, useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Gasto } from '../../types/gasto'
import type { EditGastoModo } from '../EditGastoModal'
import HistorialItemRow from './HistorialItemRow'
import {
  getHistorialAccionId,
  getHistorialItemKey,
  isHistorialOptimistic,
  type HistorialItem,
} from './historialTypes'

const ROW_ESTIMATE_PX = 92
const LOAD_MORE_THRESHOLD = 5

interface HistorialVirtualListProps {
  items: HistorialItem[]
  accionId: string | number | null
  hasMore: boolean
  cargandoMas: boolean
  onLoadMore: () => void
  onEdit: (gasto: Gasto, modo: EditGastoModo) => void
  onDelete: (item: HistorialItem) => void
}

function HistorialVirtualList({
  items,
  accionId,
  hasMore,
  cargandoMas,
  onLoadMore,
  onEdit,
  onDelete,
}: HistorialVirtualListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 8,
    measureElement: (element) => element.getBoundingClientRect().height,
  })

  const virtualItems = virtualizer.getVirtualItems()

  useEffect(() => {
    if (!hasMore || cargandoMas || virtualItems.length === 0) return

    const lastVisible = virtualItems[virtualItems.length - 1]
    if (lastVisible.index >= items.length - LOAD_MORE_THRESHOLD) {
      onLoadMore()
    }
  }, [virtualItems, items.length, hasMore, cargandoMas, onLoadMore])

  return (
    <div
      ref={scrollRef}
      className="max-h-[min(70vh,32rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-700/60"
      aria-label="Lista de gastos"
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index]
          const itemKey = getHistorialItemKey(item)
          const isOptimistic = isHistorialOptimistic(item)
          const isBusy = isOptimistic ? false : accionId === getHistorialAccionId(item)

          return (
            <div
              key={itemKey}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full border-b border-slate-700/80 last:border-b-0"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <HistorialItemRow
                item={item}
                isBusy={isBusy}
                isOptimistic={isOptimistic}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default memo(HistorialVirtualList)
