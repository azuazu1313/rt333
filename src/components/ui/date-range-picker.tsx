"use client"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { useState } from "react"
import { DateRange } from "react-day-picker"

interface DateRangePickerProps {
  dateRange?: DateRange
  onDateRangeChange: (dateRange: DateRange | undefined) => void
  className?: string
  placeholder?: string
}

export function DateRangePicker({ 
  dateRange, 
  onDateRangeChange, 
  className,
  placeholder = "Pick a date range" 
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-between bg-white hover:bg-white focus:ring-2 focus:ring-blue-600 h-[42px]",
            !dateRange?.from && "text-gray-500",
            className
          )}
        >
          <span className="truncate">
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              placeholder
            )}
          </span>
          <CalendarIcon className="h-5 w-5 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={onDateRangeChange}
          initialFocus
          defaultMonth={dateRange?.from}
        />
      </PopoverContent>
    </Popover>
  )
}