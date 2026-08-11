import * as React from "react"
import { cn } from "@/lib/utils"

export interface IconProps extends React.ComponentProps<"span"> {
  name: string
  size?: number | string
}

export function Icon({ name, className, size, ...props }: IconProps) {
  const style = size ? { fontSize: typeof size === "number" ? `${size}px` : size } : undefined
  return (
    <span
      className={cn(
        "material-symbols-outlined select-none inline-flex items-center justify-center shrink-0 font-normal align-middle leading-none",
        !size && "size-5 text-[20px]",
        className
      )}
      style={style}
      {...props}
    >
      {name}
    </span>
  )
}
