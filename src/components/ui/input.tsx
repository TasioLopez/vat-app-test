import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/60 selection:bg-purple-200 selection:text-purple-900 dark:bg-input/30 border-purple-200 flex h-10 w-full min-w-0 rounded-lg border-2 bg-white px-4 py-2 text-base shadow-sm transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 md:text-sm",
        "focus-visible:border-purple-500 focus-visible:ring-purple-500/50 focus-visible:ring-[3px] focus-visible:shadow-md focus-visible:shadow-purple-500/10",
        "hover:border-purple-300",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
