import { useCallback, useEffect, useState } from 'react'
import { useCuentas, useGastosRefreshState } from '../../contexts'
import type { Cuenta } from '../../types/cuenta'
import RegistrarIngresoModal from '../modals/RegistrarIngresoModal'
import TransferenciaModal from '../modals/TransferenciaModal'
import {
  cardClassName,
  toolbarButtonClassName,
} from '../ui/formStyles'
import CuentaCard from './CuentaCard'
import CuentaFormModal from './CuentaFormModal'
import { CuentasListSkeleton } from '../ui/Skeleton'

interface ListaCuentasProps {
  embedded?: boolean
}

function TransferIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M7 7h11M7 7l3-3M7 7l3 3M17 17H6M17 17l-3 3M17 17l-3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IngresoIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ListaCuentas({ embedded = false }: ListaCuentasProps) {
  const { cuentas, cuentasLoading, refreshCuentas } = useCuentas()
  const { refresh } = useGastosRefreshState()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCuenta, setEditingCuenta] = useState<Cuenta | null>(null)
  const [ingresoModalOpen, setIngresoModalOpen] = useState(false)
  const [transferenciaModalOpen, setTransferenciaModalOpen] = useState(false)

  const cargarCuentas = useCallback(async () => {
    await refreshCuentas()
  }, [refreshCuentas])

  useEffect(() => {
    cargarCuentas()
  }, [cargarCuentas])

  function openModal() {
    setEditingCuenta(null)
    setModalOpen(true)
  }

  function openEditModal(cuenta: Cuenta) {
    setEditingCuenta(cuenta)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingCuenta(null)
  }

  async function handleFormSuccess() {
    refresh()
    await cargarCuentas()
  }

  function handleTransferSuccess() {
    refresh()
    void cargarCuentas()
  }

  function handleIngresoSuccess() {
    refresh()
    void cargarCuentas()
  }

  return (
    <section className={embedded ? 'space-y-3' : cardClassName}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-base font-semibold text-white sm:text-lg">Mis cuentas</h2>
          {!embedded && (
            <p className="text-sm text-slate-400">Efectivo, débito y tarjetas de crédito</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTransferenciaModalOpen(true)}
            disabled={cuentas.length < 2}
            className={toolbarButtonClassName}
            aria-label="Transferir entre cuentas"
          >
            <TransferIcon />
            <span className="hidden sm:inline">Transferir</span>
          </button>
          <button
            type="button"
            onClick={() => setIngresoModalOpen(true)}
            className={toolbarButtonClassName}
            aria-label="Registrar ingreso"
          >
            <IngresoIcon />
            <span className="hidden sm:inline">Ingreso</span>
          </button>
          <button
            type="button"
            onClick={openModal}
            className={toolbarButtonClassName}
            aria-label="Nueva cuenta"
          >
            <span className="sm:hidden">+</span>
            <span className="hidden sm:inline">+ Nueva cuenta</span>
          </button>
        </div>
      </div>

      {cuentasLoading && <CuentasListSkeleton count={Math.max(cuentas.length, 2)} />}

      {!cuentasLoading && cuentas.length === 0 && (
        <p className="text-center text-sm text-slate-400">
          No hay cuentas configuradas. Añade una para comenzar.
        </p>
      )}

      {!cuentasLoading && cuentas.length > 0 && (
        <div className="flex flex-col gap-2">
          {cuentas.map((cuenta) => (
            <CuentaCard key={cuenta.id} cuenta={cuenta} onEdit={openEditModal} />
          ))}
        </div>
      )}

      {transferenciaModalOpen && (
        <TransferenciaModal
          onClose={() => setTransferenciaModalOpen(false)}
          onSuccess={handleTransferSuccess}
        />
      )}

      {ingresoModalOpen && (
        <RegistrarIngresoModal
          onClose={() => setIngresoModalOpen(false)}
          onSuccess={handleIngresoSuccess}
        />
      )}

      <CuentaFormModal
        open={modalOpen}
        editingCuenta={editingCuenta}
        onClose={closeModal}
        onSuccess={handleFormSuccess}
      />
    </section>
  )
}
