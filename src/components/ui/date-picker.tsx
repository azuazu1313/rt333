"use client"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { useState } from "react"

interface DatePickerProps {
  date?: Date
  onDateChange: (date: Date | undefined) => void
  className?: string
  placeholder?: string
}

export function DatePicker({ date, onDateChange, className, placeholder = "Pick a date" }: DatePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-between bg-white hover:bg-white focus:ring-2 focus:ring-blue-600 h-[42px]",
            !date && "text-gray-500",
            className
          )}
        >
          {date ? format(date, "PPP") : placeholder}
          <CalendarIcon className="h-5 w-5 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(date) => {
            onDateChange(date)
            setOpen(false)
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}