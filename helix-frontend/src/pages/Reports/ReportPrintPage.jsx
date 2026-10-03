import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import reportService from '../../services/reportService'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { Button } from '../../components/ui/button'
import { RiPrinterLine, RiDownload2Line, RiArrowLeftLine } from 'react-icons/ri'
import { toast } from 'sonner'

export default function ReportPrintPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const autoPrint = searchParams.get('print') === 'true'

  const printAreaRef = useRef(null)

  // Configuration and Data States
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [instSettings, setInstSettings] = useState(null)
  const [signatures, setSignatures] = useState([])

  const triggerSystemPrint = useCallback(async () => {
    try {
      await reportService.logPrint(id)
    } catch {}
    window.print()
  }, [id])

  const loadPrintData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Get Report Details
      const repRes = await reportService.getReport(id)
      setReport(repRes.data)

      // 2. Get Settings
      const setRes = await reportService.getSettings()
      setInstSettings(setRes.data.institute)
      setSignatures(setRes.data.signatures || [])

      // 3. Auto-trigger print if requested
      if (autoPrint) {
        setTimeout(() => {
          triggerSystemPrint()
        }, 800)
      }
    } catch {
      toast.error('Failed to load report data for printing.')
    } finally {
      setLoading(false)
    }
  }, [id, autoPrint, triggerSystemPrint])

  useEffect(() => {
    loadPrintData()
  }, [loadPrintData])

  const handleDownloadPDF = async () => {
    const element = printAreaRef.current
    if (!element) return

    const toastId = toast.loading('Generating high-resolution PDF...')
    try {
      const canvas = await html2canvas(element, {
        scale: 2, // 2x scale for 300 DPI high-quality rendering
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 210 // A4 size width in mm
      const pageHeight = 297 // A4 size height in mm
      const canvasHeight = canvas.height
      const canvasWidth = canvas.width
      const imgHeight = (canvasHeight * imgWidth) / canvasWidth

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`${report?.report_number || 'REPORT'}.pdf`)
      
      try {
        await reportService.logPrint(id)
      } catch {}
      toast.success('PDF download completed.', { id: toastId })
    } catch {
      toast.error('Failed to generate PDF file.', { id: toastId })
    }
  }

  // Score Qualitative Circle Color Builders
  const getDamageCircleColor = (score) => {
    if (score <= 3) return 'bg-[#FFEB3B]' // Light Yellow
    if (score <= 7) return 'bg-[#FF9800]' // Orange
    return 'bg-[#F44336]' // Red
  }

  const getDefenceCircleColor = (score) => {
    if (score <= 3) return 'bg-[#FFEB3B]' // Light Yellow
    if (score <= 7) return 'bg-[#8BC34A]' // Light Green
    return 'bg-[#2E7D32]' // Dark Green
  }

  const getRatioCircleColor = (score) => {
    if (score <= 3) return 'bg-[#4CAF50]' // Green
    if (score <= 6) return 'bg-[#FFEB3B]' // Yellow
    return 'bg-[#F44336]' // Red
  }

  // Score Indicator Pin position percentages
  const getPinLeftPercent = (score) => {
    const val = parseFloat(score)
    if (isNaN(val) || val <= 1) return '0%'
    if (val >= 10) return '96%'
    return `${((val - 1) / 9) * 96}%`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-sm font-semibold text-gray-500 animate-pulse">Loading Report Viewer...</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 gap-4">
        <p className="text-sm font-semibold text-red-500">Report not found.</p>
        <Button onClick={() => navigate('/reports')} variant="outline">
          Back to History
        </Button>
      </div>
    )
  }

  // Group parameter values by section
  const damageValues = report.values.filter(v => v.parameter_section === 'Oxidative Damage')
  const defenceValues = report.values.filter(v => v.parameter_section === 'Antioxidant Defence')

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-4 print:p-0 print:bg-white">
      {/* Top Toolbar (Hidden on Print) */}
      <div className="w-[794px] mb-6 flex justify-between items-center bg-white border border-gray-200 rounded-lg p-4 shadow-sm print:hidden">
        <Button onClick={() => navigate('/reports')} variant="ghost" className="text-gray-600 flex items-center gap-1 text-xs">
          <RiArrowLeftLine size={16} /> Back to History
        </Button>
        <div className="flex gap-2">
          <Button onClick={triggerSystemPrint} className="bg-brand-blue hover:bg-brand-blue-dark text-white h-9 text-xs flex items-center gap-1.5 font-bold">
            <RiPrinterLine size={15} /> Print Report
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 h-9 text-xs flex items-center gap-1.5">
            <RiDownload2Line size={15} /> Download PDF
          </Button>
        </div>
      </div>

      {/* A4 Printable Document Container */}
      <div
        ref={printAreaRef}
        id="printable-report"
        className="w-[794px] bg-white text-black print:w-full print:border-0 print:shadow-none print:p-0 flex flex-col"
        style={{ minWidth: '794px', maxWidth: '794px' }}
      >
        {/* ── PAGE 1 ── */}
        <div className="w-full min-h-[1123px] max-h-[1123px] p-[40px] flex flex-col justify-between border border-gray-200 shadow-md print:border-0 print:shadow-none print:min-h-0 print:h-[285mm] print:max-h-none print:page-break-after-always">
          <div>
            {/* Header Branding */}
            <div className="flex items-start justify-between border-b-[2px] border-[#6B1D1D] pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={instSettings?.logo_url || '/static/default_logo.png'}
                  alt="Logo"
                  className="h-[60px] w-auto object-contain"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
                <div className="h-9 w-px bg-[#6B1D1D]/30" />
                <div>
                  <p className="text-[11px] font-bold text-[#6B1D1D] uppercase tracking-wider">Shanti Avedna Trust</p>
                  <h1 className="text-[17px] font-bold text-[#6B1D1D] uppercase tracking-tight leading-tight">
                    {instSettings?.name || 'Institute of Cancer and Stem Cell Research'}
                  </h1>
                </div>
              </div>
            </div>

            {/* Patient Header Block Table */}
            <div className="mt-4 border border-gray-200 p-4 bg-[#f9fafb]">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr>
                    <td className="py-1.5 font-bold text-gray-700 w-[14%]">Patient Name:</td>
                    <td className="py-1.5 text-gray-900 w-[36%]">{report.patient.full_name}</td>
                    <td className="py-1.5 font-bold text-gray-700 w-[14%]">Report Date:</td>
                    <td className="py-1.5 text-gray-900 w-[36%]">{report.report_date}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-bold text-gray-700">Ref. By:</td>
                    <td className="py-1.5 text-gray-900">{report.reference_by}</td>
                    <td className="py-1.5 font-bold text-gray-700">Sample:</td>
                    <td className="py-1.5 text-gray-900">{report.sample_type}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 1: Oxidative Damage */}
            <div className="mt-6 space-y-3">
              <h2 className="text-[15px] font-bold text-[#6B1D1D] border-b border-[#6B1D1D]/20 pb-1">Oxidative Damage</h2>
              <p className="text-[10px] text-gray-500 leading-relaxed text-justify">
                This includes markers that show cellular injury caused by reactive species. MDA (TBARS) and FOX-2 indicate lipid peroxidation and early membrane damage. Protein Carbonyl (DNPH) reflects oxidative modification of proteins. Nitric Oxide (Griess assay) indicates nitrosative stress, which can contribute to tissue and cellular damage. Elevated values of these markers suggest increased oxidative stress in the body.
              </p>

              <table className="w-full text-xs text-left border border-gray-200 mt-2">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[#6B1D1D] font-bold">
                    <th className="py-2.5 px-3 border-r border-gray-200 w-[38%]">Parameter Measured</th>
                    <th className="py-2.5 px-3 border-r border-gray-200 text-center w-[16%]">Result</th>
                    <th className="py-2.5 px-3 border-r border-gray-200 text-center w-[18%]">Reference Range</th>
                    <th className="py-2.5 px-3 w-[28%]">Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-850">
                  {damageValues.map((val) => (
                    <tr key={val.id}>
                      <td className="py-2.5 px-3 border-r border-gray-200 font-medium">{val.parameter_name}</td>
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center font-bold">{val.result_value}</td>
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono">{val.reference_range}</td>
                      <td className="py-2.5 px-3 text-gray-600 text-[11px]">{val.interpretation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 2: Antioxidant Defence */}
            <div className="mt-8 space-y-3">
              <h2 className="text-[15px] font-bold text-[#6B1D1D] border-b border-[#6B1D1D]/20 pb-1">Antioxidant Defence</h2>
              <p className="text-[10px] text-gray-500 leading-relaxed text-justify">
                This panel evaluates the body's capacity to neutralize oxidative stress by measuring multiple antioxidant components. Reduced Glutathione (GSH) reflects the primary intracellular antioxidant that protects cells from reactive oxygen and nitrogen species. Total Antioxidant Capacity (TAC) measures the overall antioxidant potential of plasma, integrating both enzymatic and non-enzymatic systems.
              </p>

              <table className="w-full text-xs text-left border border-gray-200 mt-2">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[#6B1D1D] font-bold">
                    <th className="py-2.5 px-3 border-r border-gray-200 w-[38%]">Parameter Measured</th>
                    <th className="py-2.5 px-3 border-r border-gray-200 text-center w-[16%]">Result</th>
                    <th className="py-2.5 px-3 border-r border-gray-200 text-center w-[18%]">Reference Range</th>
                    <th className="py-2.5 px-3 w-[28%]">Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-850">
                  {defenceValues.map((val) => (
                    <tr key={val.id}>
                      <td className="py-2.5 px-3 border-r border-gray-200 font-medium">{val.parameter_name}</td>
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center font-bold">{val.result_value}</td>
                      <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono">{val.reference_range}</td>
                      <td className="py-2.5 px-3 text-gray-600 text-[11px]">{val.interpretation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Page 1 Footer */}
          <div className="border-t border-[#6B1D1D] pt-2 mt-auto">
            <div className="flex justify-between items-center text-[9px] text-[#6B1D1D] font-bold uppercase tracking-tight">
              <span>{instSettings?.name || 'Institute of Cancer and Stem Cell Research'} | SAT</span>
              <span className="font-mono">1</span>
            </div>
          </div>
        </div>

        {/* Page Break for print layout */}
        <div className="h-8 print:hidden" />

        {/* ── PAGE 2 ── */}
        <div className="w-full min-h-[1123px] max-h-[1123px] p-[40px] flex flex-col justify-between border border-gray-200 shadow-md print:border-0 print:shadow-none print:min-h-0 print:h-[285mm] print:max-h-none print:page-break-after-always">
          <div>
            {/* Header Branding Repeat */}
            <div className="flex items-start justify-between border-b-[2px] border-[#6B1D1D] pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={instSettings?.logo_url || '/static/default_logo.png'}
                  alt="Logo"
                  className="h-[60px] w-auto object-contain"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
                <div className="h-9 w-px bg-[#6B1D1D]/30" />
                <div>
                  <p className="text-[11px] font-bold text-[#6B1D1D] uppercase tracking-wider">Shanti Avedna Trust</p>
                  <h1 className="text-[17px] font-bold text-[#6B1D1D] uppercase tracking-tight leading-tight">
                    {instSettings?.name || 'Institute of Cancer and Stem Cell Research'}
                  </h1>
                </div>
              </div>
            </div>

            {/* Patient Header Block Repeat */}
            <div className="mt-4 border border-gray-200 p-4 bg-[#f9fafb]">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr>
                    <td className="py-1.5 font-bold text-gray-700 w-[14%]">Patient Name:</td>
                    <td className="py-1.5 text-gray-900 w-[36%]">{report.patient.full_name}</td>
                    <td className="py-1.5 font-bold text-gray-700 w-[14%]">Report Date:</td>
                    <td className="py-1.5 text-gray-900 w-[36%]">{report.report_date}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-bold text-gray-700">Ref. By:</td>
                    <td className="py-1.5 text-gray-900">{report.reference_by}</td>
                    <td className="py-1.5 font-bold text-gray-700">Sample:</td>
                    <td className="py-1.5 text-gray-900">{report.sample_type}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Overall Summary section */}
            <div className="mt-6 space-y-3">
              <h2 className="text-[15px] font-bold text-[#6B1D1D] border-b border-[#6B1D1D]/20 pb-1">Overall Summary</h2>
              <p className="text-[10px] text-gray-500 leading-relaxed text-justify whitespace-pre-line">
                The Damage vs. Defense Ratio (DDR) summarizes the body's oxidative stress by comparing total oxidative damage to antioxidant capacity. It is calculated as (MDA + FOX-2 + Protein Carbonyl + Nitric Oxide) / GSH. A low DDR indicates that antioxidants effectively counteract oxidative damage; a moderate DDR suggests that oxidative stress is present and defenses are partially overwhelmed; and a high DDR indicates that damage exceeds the body's protective capacity, reflecting severe oxidative stress and higher risk for cellular dysfunction or disease.
              </p>
            </div>

            {/* Score Section 1: Oxidative Damage Score */}
            <div className="mt-8 space-y-4">
              <h3 className="text-[13px] font-bold text-[#6B1D1D]">Oxidative Damage Score</h3>
              <table className="w-full text-xs text-left border border-gray-200">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-bold">
                    <th className="py-2 px-3 border-r border-gray-200 w-[50%]">Parameter</th>
                    <th className="py-2 px-3 border-r border-gray-200 text-center w-[25%]">Quantitative Analysis</th>
                    <th className="py-2 px-3 text-center w-[25%]">Qualitative Analysis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-gray-900">
                    <td className="py-4 px-3 border-r border-gray-200 font-medium">Oxidative Damage Score (MDA+FOX2+NO+Protein Carbonyl)</td>
                    <td className="py-4 px-3 border-r border-gray-200 text-center font-bold text-sm">{report.damage_score}</td>
                    <td className="py-4 px-3 flex justify-center items-center">
                      <div className={['w-6 h-6 rounded-full border border-black/10', getDamageCircleColor(report.damage_score)].join(' ')} />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Horizontal color scale */}
              <div className="relative pt-6 px-1">
                {/* Arrow Indicator */}
                <div
                  className="absolute -top-1.5 transition-all duration-300 flex flex-col items-center"
                  style={{ left: getPinLeftPercent(report.damage_score) }}
                >
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-black" />
                </div>

                {/* Gradient color bar */}
                <div className="h-3 w-full bg-gradient-to-r from-[#FFEB3B] via-[#FF9800] to-[#F44336] rounded-sm" />
                
                {/* Numbers 1-10 */}
                <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1 px-1">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
                </div>

                <p className="text-[8px] text-gray-450 leading-tight mt-1.5">
                  1-3 (Light Yellow): Low oxidative damage, minimal stress on cells.<br />
                  4-7 (Orange): Moderate oxidative damage, some stress present.<br />
                  8-10 (Red): High oxidative damage, significant stress and cellular risk.
                </p>
              </div>
            </div>

            {/* Score Section 2: Antioxidant Defence Score */}
            <div className="mt-8 space-y-4">
              <h3 className="text-[13px] font-bold text-[#6B1D1D]">Antioxidant Defence</h3>
              <table className="w-full text-xs text-left border border-gray-200">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-bold">
                    <th className="py-2 px-3 border-r border-gray-200 w-[50%]">Parameter</th>
                    <th className="py-2 px-3 border-r border-gray-200 text-center w-[25%]">Quantitative Analysis</th>
                    <th className="py-2 px-3 text-center w-[25%]">Qualitative Analysis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-gray-900">
                    <td className="py-4 px-3 border-r border-gray-200 font-medium">Antioxidant Defence (GSH)</td>
                    <td className="py-4 px-3 border-r border-gray-200 text-center font-bold text-sm">{report.defence_score}</td>
                    <td className="py-4 px-3 flex justify-center items-center">
                      <div className={['w-6 h-6 rounded-full border border-black/10', getDefenceCircleColor(report.defence_score)].join(' ')} />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Horizontal color scale */}
              <div className="relative pt-6 px-1">
                {/* Arrow Indicator */}
                <div
                  className="absolute -top-1.5 transition-all duration-300 flex flex-col items-center"
                  style={{ left: getPinLeftPercent(report.defence_score) }}
                >
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-black" />
                </div>

                {/* Gradient color bar */}
                <div className="h-3 w-full bg-gradient-to-r from-[#FFEB3B] via-[#8BC34A] to-[#2E7D32] rounded-sm" />
                
                {/* Numbers 1-10 */}
                <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1 px-1">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
                </div>

                <p className="text-[8px] text-gray-450 leading-tight mt-1.5">
                  1-3 (Light Yellow): Weak antioxidant defense, insufficient protection.<br />
                  4-7 (Light Green): Moderate defense, partial protection against oxidative stress.<br />
                  8-10 (Dark Green): Strong defense, effective neutralization of reactive species.
                </p>
              </div>
            </div>
          </div>

          {/* Page 2 Footer */}
          <div className="border-t border-[#6B1D1D] pt-2 mt-auto">
            <div className="flex justify-between items-center text-[9px] text-[#6B1D1D] font-bold uppercase tracking-tight">
              <span>{instSettings?.name || 'Institute of Cancer and Stem Cell Research'} | SAT</span>
              <span className="font-mono">2</span>
            </div>
          </div>
        </div>

        {/* Page Break for print layout */}
        <div className="h-8 print:hidden" />

        {/* ── PAGE 3 ── */}
        <div className="w-full min-h-[1123px] max-h-[1123px] p-[40px] flex flex-col justify-between border border-gray-200 shadow-md print:border-0 print:shadow-none print:min-h-0 print:h-[285mm] print:max-h-none">
          <div>
            {/* Header Branding Repeat */}
            <div className="flex items-start justify-between border-b-[2px] border-[#6B1D1D] pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={instSettings?.logo_url || '/static/default_logo.png'}
                  alt="Logo"
                  className="h-[60px] w-auto object-contain"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
                <div className="h-9 w-px bg-[#6B1D1D]/30" />
                <div>
                  <p className="text-[11px] font-bold text-[#6B1D1D] uppercase tracking-wider">Shanti Avedna Trust</p>
                  <h1 className="text-[17px] font-bold text-[#6B1D1D] uppercase tracking-tight leading-tight">
                    {instSettings?.name || 'Institute of Cancer and Stem Cell Research'}
                  </h1>
                </div>
              </div>
            </div>

            {/* Patient Header Block Repeat */}
            <div className="mt-4 border border-gray-200 p-4 bg-[#f9fafb]">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr>
                    <td className="py-1.5 font-bold text-gray-700 w-[14%]">Patient Name:</td>
                    <td className="py-1.5 text-gray-900 w-[36%]">{report.patient.full_name}</td>
                    <td className="py-1.5 font-bold text-gray-700 w-[14%]">Report Date:</td>
                    <td className="py-1.5 text-gray-900 w-[36%]">{report.report_date}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-bold text-gray-700">Ref. By:</td>
                    <td className="py-1.5 text-gray-900">{report.reference_by}</td>
                    <td className="py-1.5 font-bold text-gray-700">Sample:</td>
                    <td className="py-1.5 text-gray-900">{report.sample_type}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Score Section 3: Damage - Defence Ratio */}
            <div className="mt-6 space-y-4">
              <h3 className="text-[13px] font-bold text-[#6B1D1D]">Damage - Defence Ratio</h3>
              <table className="w-full text-xs text-left border border-gray-200">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-bold">
                    <th className="py-2 px-3 border-r border-gray-200 w-[50%]">Parameter</th>
                    <th className="py-2 px-3 border-r border-gray-200 text-center w-[25%]">Quantitative Analysis</th>
                    <th className="py-2 px-3 text-center w-[25%]">Qualitative Analysis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-gray-900">
                    <td className="py-4 px-3 border-r border-gray-200 font-medium">Damage - Defence Ratio</td>
                    <td className="py-4 px-3 border-r border-gray-200 text-center font-bold text-sm">{report.ratio_score}</td>
                    <td className="py-4 px-3 flex justify-center items-center">
                      <div className={['w-6 h-6 rounded-full border border-black/10', getRatioCircleColor(report.ratio_score)].join(' ')} />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Horizontal color scale */}
              <div className="relative pt-6 px-1">
                {/* Arrow Indicator */}
                <div
                  className="absolute -top-1.5 transition-all duration-300 flex flex-col items-center"
                  style={{ left: getPinLeftPercent(report.ratio_score) }}
                >
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-black" />
                </div>

                {/* Gradient color bar */}
                <div className="h-3 w-full bg-gradient-to-r from-[#4CAF50] via-[#FFEB3B] to-[#F44336] rounded-sm" />
                
                {/* Numbers 1-10 */}
                <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1 px-1">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
                </div>

                <p className="text-[8px] text-gray-450 leading-tight mt-1.5">
                  1-3 (Green): Low ratio, body defense is sufficient to counter damage.<br />
                  4-6 (Yellow): Moderate ratio, damage and defense are somewhat balanced.<br />
                  7-10 (Red): High ratio, damage exceeds defense, high oxidative stress.
                </p>
              </div>
            </div>

            {/* Section 4: Disclaimer */}
            <div className="mt-8 space-y-2">
              <p className="text-[10px] font-bold text-gray-700">Disclaimer:</p>
              <p className="text-[9px] text-gray-500 leading-relaxed text-justify whitespace-pre-line">
                The information provided by this panel reflects biochemical markers of oxidative balance and is intended for research or monitoring purposes. It should be considered alongside clinical evaluation and not as a standalone diagnostic tool.
              </p>
            </div>

            {/* Authorised Signatory Block */}
            <div className="mt-12 flex justify-between items-end">
              <div className="text-[10px] text-gray-400">
                <span>-------</span><span className="font-bold">End of Report</span><span>------</span>
              </div>

              <div className="flex flex-col items-center space-y-1">
                {/* Signature image */}
                <div className="h-10 flex items-center justify-center p-1 px-3">
                  {signatures.find(s => s.doctor_name === report.doctor_name)?.signature_url ? (
                    <img
                      src={signatures.find(s => s.doctor_name === report.doctor_name).signature_url}
                      alt="Doctor Signature"
                      className="h-full object-contain"
                    />
                  ) : (
                    <div className="h-full w-24 border border-dashed border-gray-300 flex items-center justify-center text-[8px] text-gray-400 font-medium">
                      No Signature
                    </div>
                  )}
                </div>

                {/* Stamp overlay if stamp exists */}
                {instSettings?.stamp_url && (
                  <div className="h-10 w-10 flex items-center justify-center overflow-hidden -mt-6 opacity-80 shrink-0">
                    <img
                      src={instSettings.stamp_url}
                      alt="Stamp"
                      className="h-full object-contain"
                    />
                  </div>
                )}
                
                <span className="text-[10px] font-bold text-[#6B1D1D] mt-1">Authorised Signatory</span>
              </div>
            </div>
          </div>

          {/* Page 3 Footer */}
          <div className="border-t border-[#6B1D1D] pt-4 mt-auto">
            {/* Contact details row */}
            <div className="grid grid-cols-2 gap-4 text-[9px] text-gray-500 mb-3">
              <div>
                <p><span className="font-bold text-gray-700">Address - </span>{instSettings?.address || 'M4 Mishika Tower Sampna Sangeeta Indore M.P. 452001'}</p>
                <p className="mt-1"><span className="font-bold text-gray-700">Email - </span>{instSettings?.email || 'icsrofficial@gmail.com'}</p>
              </div>
              <div className="text-right">
                <p><span className="font-bold text-gray-700">Website - </span>{instSettings?.website || 'www.icsrofficial.com'}</p>
                <p className="mt-1"><span className="font-bold text-gray-700">Contact no - </span>{instSettings?.contact_number || '+91 7582950349'}</p>
              </div>
            </div>

            <div className="flex justify-between items-center text-[9px] text-[#6B1D1D] font-bold uppercase tracking-tight">
              <span>{instSettings?.name || 'Institute of Cancer and Stem Cell Research'} | SAT</span>
              <span className="font-mono">3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS styles for printing (Hides toolbars, sidebars and layout frames) */}
      <style>{`
        @media print {
          /* Hide everything first */
          body * {
            visibility: hidden;
          }
          /* Hide toolbar, sidebar, header, navigation, and page containers */
          .print\\:hidden, .print-hidden, header, nav, aside, footer, button, .topbar {
            display: none !important;
          }
          /* Show ONLY the printable document wrapper */
          #printable-report, #printable-report * {
            visibility: visible !important;
          }
          /* Reset root positions and eliminate margins */
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 210mm !important;
            height: 297mm !important;
          }
          #printable-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          /* Define A4 portrait parameters */
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }
        }
      `}</style>
    </div>
  )
}
