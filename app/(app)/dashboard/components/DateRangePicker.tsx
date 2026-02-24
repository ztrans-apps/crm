'use client'

import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DateRangePickerProps {
  value: 'today' | 'week' | 'month'
  onChange: (value: 'today' | 'week' | 'month') => void
  customDates: { start?: Date; end?: Date }
  onCustomDatesChange: (dates: { start?: Date; end?: Date }) => void
}

export function DateRangePicker({
  value,
  onChange,
}: DateRangePickerProps) {
  const options = [
    { value: 'today' as const, label: 'Hari Ini' },
    { value: 'week' as const, label: '7 Hari' },
    { value: 'month' as const, label: '30 Hari' },
  ]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" />
          {options.find(o => o.value === value)?.label || 'Pilih Periode'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="end">
        <div className="flex flex-col gap-1">
          {options.map(option => (
            <Button
              key={option.value}
              variant={value === option.value ? 'default' : 'ghost'}
              className="justify-start"
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
