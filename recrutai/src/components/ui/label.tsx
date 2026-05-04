"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// Composant générique : l'association htmlFor est imposée par les consommateurs
// (cf. Login.tsx, Rgpd.tsx, etc.). Règle jsx-a11y désactivée localement car le
// linter statique ne peut pas suivre la composition.
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
