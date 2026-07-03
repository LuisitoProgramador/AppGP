import { GastoForm } from '../components'

export default function HomePage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Gastos Personales</h1>
        <p className="text-slate-400">Registra y controla tus finanzas</p>
      </div>
      <GastoForm />
    </section>
  )
}
