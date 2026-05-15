"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex flex-col gap-4",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list flex flex-row flex-wrap items-center text-muted-foreground",
  {
    variants: {
      variant: {
        default: "inline-flex w-fit justify-center bg-muted rounded-lg p-[3px] h-8",
        line: "inline-flex w-fit justify-center gap-1 bg-transparent rounded-lg p-[3px] h-8",
        card: "gap-3 bg-transparent p-0 h-auto",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Default variant styles
        "group-data-[variant=default]/tabs-list:h-[calc(100%-2px)] group-data-[variant=default]/tabs-list:data-active:bg-background group-data-[variant=default]/tabs-list:data-active:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm",
        // Line variant styles
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:data-active:text-foreground group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:bottom-[-3px] group-data-[variant=line]/tabs-list:after:left-0 group-data-[variant=line]/tabs-list:after:right-0 group-data-[variant=line]/tabs-list:after:h-0.5 group-data-[variant=line]/tabs-list:after:bg-foreground group-data-[variant=line]/tabs-list:after:opacity-0 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        // Card variant styles
        "group-data-[variant=card]/tabs-list:h-auto group-data-[variant=card]/tabs-list:px-4 group-data-[variant=card]/tabs-list:py-3 group-data-[variant=card]/tabs-list:rounded-lg group-data-[variant=card]/tabs-list:border group-data-[variant=card]/tabs-list:border-slate-200 group-data-[variant=card]/tabs-list:bg-white group-data-[variant=card]/tabs-list:shadow-sm group-data-[variant=card]/tabs-list:text-slate-600",
        "group-data-[variant=card]/tabs-list:hover:border-slate-300 group-data-[variant=card]/tabs-list:hover:bg-slate-50",
        "group-data-[variant=card]/tabs-list:data-active:border-blue-500 group-data-[variant=card]/tabs-list:data-active:bg-blue-50 group-data-[variant=card]/tabs-list:data-active:text-blue-700 group-data-[variant=card]/tabs-list:data-active:shadow-md",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
