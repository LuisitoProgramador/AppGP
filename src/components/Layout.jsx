export default function Layout({ children }) {
  return (
    <div className="min-h-svh bg-slate-900 text-white">
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
    </div>
  )
}
