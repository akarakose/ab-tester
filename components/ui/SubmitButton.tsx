'use client'

export default function SubmitButton({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean
  label: string
  pendingLabel: string
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}