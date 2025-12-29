// src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-md hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]",
        destructive: "bg-destructive text-white hover:bg-destructive/90 shadow-md hover:shadow-lg active:scale-[0.98]",
        outline: "border-2 border-purple-200 bg-background hover:bg-purple-50 hover:border-purple-300 text-purple-700 hover:text-purple-800 shadow-sm hover:shadow-md active:scale-[0.98]",
        ghost: "hover:bg-purple-50 hover:text-purple-700 text-foreground",
        link: "underline-offset-4 hover:underline text-purple-600 hover:text-purple-700",
        secondary: "bg-purple-100 text-purple-900 hover:bg-purple-200 shadow-sm hover:shadow-md active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-8 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
