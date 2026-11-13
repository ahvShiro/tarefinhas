// Shared helpers and styles for the sign-in and sign-up forms.

/** Moves focus to the first field with an error, in the order of `fieldOrder`. */
export function focusFirstInvalid(form: HTMLFormElement, fieldOrder: readonly string[], errors: object) {
  const first = fieldOrder.find((name) => name in errors)
  if (!first) return
  const field = form.elements.namedItem(first)
  if (field instanceof HTMLElement) field.focus()
}

export const PRIMARY_BUTTON_CLASS =
  'h-11 w-full rounded-full bg-brand text-[15px] text-white hover:bg-brand/90 focus-visible:ring-brand/35'

export const SECONDARY_BUTTON_CLASS =
  'h-11 w-full gap-2.5 rounded-full border-ink/15 bg-white text-[15px] text-ink hover:bg-ink/[0.04] focus-visible:ring-brand/30'
