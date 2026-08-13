import * as React from "react"

import { cn } from "@/lib/utils"
import { INPUT_CLASS } from "@/lib/select-class"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        INPUT_CLASS,
        "placeholder:text-muted-foreground/60 selection:bg-purple-200 selection:text-purple-900 dark:bg-input/30 text-base file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground md:text-sm",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
