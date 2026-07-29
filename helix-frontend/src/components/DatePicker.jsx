import React, { useState, forwardRef, memo } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { RiCalendarLine, RiArrowDownSLine } from 'react-icons/ri'
import { cn } from '@/lib/utils'

const CustomDatePicker = forwardRef(({
  value,
  onChange,
  placeholder = 'dd-mm-yyyy',
  disabled = false,
  required = false,
  error = null,
  label = null,
  maxDate = new Date(),
  minDate = new Date(1900, 0, 1),
  isClearable = true,
  className = '',
  ...props
}, ref) => {

  // Local state to manage Year and Month custom dropdown popups
  const [isYearOpen, setIsYearOpen] = useState(false)
  const [isMonthOpen, setIsMonthOpen] = useState(false)

  // Local timezone safe parsing of 'yyyy-MM-dd' to avoid timezone shifts
  const getSelectedDate = (val) => {
    if (!val) return null
    if (val instanceof Date) return val
    
    // Parse 'yyyy-MM-dd' safely
    const str = typeof val === 'string' ? val.split('T')[0] : ''
    const parts = str.split('-')
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10) - 1
      const d = parseInt(parts[2], 10)
      const parsed = new Date(y, m, d)
      return isNaN(parsed.getTime()) ? null : parsed
    }
    
    const parsed = new Date(val)
    return isNaN(parsed.getTime()) ? null : parsed
  }

  // Format Date object back to local 'yyyy-MM-dd' for parent state / APIs
  const handleDateChange = (date) => {
    if (!date) {
      onChange('')
      return
    }
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    onChange(`${y}-${m}-${d}`)
  }

  // Range of years (Current Year down to 1900)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => 1900 + i).reverse()
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold text-ink-primary block">
          {label} {required && <span className="text-status-critical">*</span>}
        </label>
      )}
      
      <div className="relative flex items-center DatePicker-wrapper">
        {/* Calendar Icon */}
        <RiCalendarLine 
          className="absolute left-3 text-ink-secondary pointer-events-none z-10" 
          size={16} 
        />
        
        <DatePicker
          selected={getSelectedDate(value)}
          onChange={handleDateChange}
          dateFormat="dd-MM-yyyy"
          placeholderText={placeholder}
          disabled={disabled}
          maxDate={maxDate}
          minDate={minDate}
          isClearable={isClearable && !disabled}
          className={cn(
            "flex h-10 w-full rounded-md border border-surface-border bg-surface-card pl-10 pr-8 py-2 text-sm text-ink-primary ring-offset-background placeholder:text-ink-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-status-critical focus-visible:ring-status-critical" : "",
            className
          )}
          // Prevents parent container clipping by rendering in a React Portal
          portalId="datepicker-portal"
          popperClassName="react-datepicker-popper-custom"
          
          // Fast Month & Year Custom Styled Navigation Header
          renderCustomHeader={({
            date,
            changeYear,
            changeMonth,
            decreaseMonth,
            increaseMonth,
            prevMonthButtonDisabled,
            nextMonthButtonDisabled,
          }) => (
            <div className="flex items-center justify-between px-3 py-2 bg-surface-base border-b border-surface-border gap-2 relative">
              <button
                type="button"
                onClick={decreaseMonth}
                disabled={prevMonthButtonDisabled}
                className="w-6 h-6 flex items-center justify-center hover:bg-surface-hover rounded text-ink-secondary disabled:opacity-30"
              >
                &lt;
              </button>
              
              <div className="flex items-center gap-1.5 z-50">
                {/* Custom Year Dropdown Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsYearOpen(!isYearOpen)
                      setIsMonthOpen(false)
                    }}
                    className="flex items-center gap-1 bg-surface-card border border-surface-border text-ink-primary text-xs font-semibold rounded px-2 py-0.5 hover:bg-surface-hover transition-colors"
                  >
                    {date.getFullYear()}
                    <RiArrowDownSLine className="text-ink-secondary" size={13} />
                  </button>

                  {isYearOpen && (
                    <>
                      {/* Click outside backdrop */}
                      <div className="fixed inset-0 z-40" onClick={() => setIsYearOpen(false)} />
                      {/* Year Popover dropdown menu */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-surface-card border border-surface-border rounded shadow-lg max-h-48 overflow-y-auto z-50 py-1 w-20 scrollbar-thin">
                        {years.map((y) => (
                          <button
                            key={y}
                            type="button"
                            onClick={() => {
                              changeYear(y)
                              setIsYearOpen(false)
                            }}
                            className={cn(
                              "w-full text-center px-2 py-1.5 text-xs hover:bg-surface-hover text-ink-primary block font-medium transition-colors",
                              date.getFullYear() === y ? "bg-brand-blue/15 text-brand-blue font-bold" : ""
                            )}
                          >
                            {y}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Custom Month Dropdown Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMonthOpen(!isMonthOpen)
                      setIsYearOpen(false)
                    }}
                    className="flex items-center gap-1 bg-surface-card border border-surface-border text-ink-primary text-xs font-semibold rounded px-2 py-0.5 hover:bg-surface-hover transition-colors"
                  >
                    {months[date.getMonth()].slice(0, 3)}
                    <RiArrowDownSLine className="text-ink-secondary" size={13} />
                  </button>

                  {isMonthOpen && (
                    <>
                      {/* Click outside backdrop */}
                      <div className="fixed inset-0 z-40" onClick={() => setIsMonthOpen(false)} />
                      {/* Month Popover dropdown menu */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-surface-card border border-surface-border rounded shadow-lg max-h-48 overflow-y-auto z-50 py-1 w-28 scrollbar-thin">
                        {months.map((m, idx) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              changeMonth(idx)
                              setIsMonthOpen(false)
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs hover:bg-surface-hover text-ink-primary block font-medium transition-colors",
                              date.getMonth() === idx ? "bg-brand-blue/15 text-brand-blue font-bold" : ""
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={increaseMonth}
                disabled={nextMonthButtonDisabled}
                className="w-6 h-6 flex items-center justify-center hover:bg-surface-hover rounded text-ink-secondary disabled:opacity-30"
              >
                &gt;
              </button>
            </div>
          )}
          {...props}
        />
      </div>
      
      {error && (
        <p className="text-[11px] text-status-critical mt-0.5 leading-none animate-fade-in">
          {error}
        </p>
      )}
    </div>
  )
})

CustomDatePicker.displayName = 'DatePicker'

export default memo(CustomDatePicker)
