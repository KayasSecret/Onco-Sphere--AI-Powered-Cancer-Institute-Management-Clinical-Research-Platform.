import React, { useState, useEffect, useRef } from 'react'
import {
  RiCalendarEventLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
} from 'react-icons/ri'

const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
]

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// Generate years from current year down to 1900
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i)

/**
 * Modern, high-performance Date of Birth picker component.
 * Features instant Year & Month dropdowns, dark glassmorphic styling,
 * responsive popover, and YYYY-MM-DD output formatting.
 */
export default function DOBPicker({
  value,
  onChange,
  error,
  placeholder = 'Select Date of Birth',
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Parse initial value (YYYY-MM-DD)
  const parseValue = (val) => {
    if (!val) return null
    const parts = val.split('-')
    if (parts.length !== 3) return null
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const d = parseInt(parts[2], 10)
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null
    return { year: y, month: m, day: d }
  }

  const parsed = parseValue(value)

  const [viewYear, setViewYear] = useState(parsed ? parsed.year : 2000)
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.month : 0)

  useEffect(() => {
    if (value) {
      const p = parseValue(value)
      if (p) {
        setViewYear(p.year)
        setViewMonth(p.month)
      }
    }
  }, [value])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  // Days calculation for calendar grid
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const handleSelectDay = (day) => {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    const isoString = `${viewYear}-${mm}-${dd}`
    onChange(isoString)
    setOpen(false)
  }

  // Format display text (e.g. "14 Oct 1998")
  const formatDisplay = (val) => {
    const p = parseValue(val)
    if (!p) return val
    const monthName = MONTHS[p.month]
    if (!monthName) return val
    return `${p.day} ${monthName.slice(0, 3)} ${p.year}`
  }

  const isSelected = (day) => {
    if (!parsed) return false
    return parsed.year === viewYear && parsed.month === viewMonth && parsed.day === day
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Input */}
      <div
        onClick={() => setOpen((o) => !o)}
        className={[
          'w-full h-11 rounded-lg bg-slate-800/80 border px-3 text-sm flex items-center justify-between cursor-pointer select-none transition-all',
          error
            ? 'border-red-500/60 ring-2 ring-red-500/20'
            : 'border-white/10 hover:border-white/20 focus-within:border-blue-400/60',
          open ? 'border-blue-400/80 ring-2 ring-blue-500/20' : '',
        ].join(' ')}
      >
        <div className="flex items-center gap-2 text-white overflow-hidden">
          <RiCalendarEventLine className="text-slate-400 shrink-0" size={17} />
          {value ? (
            <span className="font-medium text-slate-100">{formatDisplay(value)}</span>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </div>

        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label="Clear date"
          >
            <RiCloseLine size={15} />
          </button>
        ) : null}
      </div>

      {/* Popover Calendar Card */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 p-4 bg-slate-900 border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95">
          {/* Header Controls: Month & Year Dropdowns */}
          <div className="flex items-center justify-between gap-1 mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Previous month"
            >
              <RiArrowLeftSLine size={18} />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Month Selector */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="bg-slate-800 border border-white/10 text-white text-xs font-semibold rounded-md px-2 py-1 outline-none cursor-pointer hover:bg-slate-700 transition-colors [&>option]:bg-slate-800"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Year Selector — Quick Year Jump */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="bg-slate-800 border border-white/10 text-white text-xs font-semibold rounded-md px-2 py-1 outline-none cursor-pointer hover:bg-slate-700 transition-colors font-mono [&>option]:bg-slate-800"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Next month"
            >
              <RiArrowRightSLine size={18} />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} className="text-[11px] font-semibold text-slate-400 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Blank offset days for first week */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`blank-${idx}`} className="h-8" />
            ))}

            {/* Days 1 to N */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1
              const active = isSelected(dayNum)
              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={[
                    'h-8 w-8 text-xs font-medium rounded-lg flex items-center justify-center transition-all',
                    active
                      ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30 scale-105'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white',
                  ].join(' ')}
                >
                  {dayNum}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
