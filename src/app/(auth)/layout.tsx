/**
 * Auth Layout
 *
 * Layout for authentication pages (login, etc.)
 * Centered layout without sidebar.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md p-4">{children}</div>
    </div>
  )
}
