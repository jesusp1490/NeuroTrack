import { jsPDF } from "jspdf"
import type { SurgeryMaterial, SurgeryType } from "@/lib/surgery-types"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export interface SurgeryDetails {
  id: string
  surgeryType: SurgeryType
  date: Date
  estimatedDuration: number
  surgeon: {
    id: string
    name: string
  }
  neurophysiologist: {
    id: string
    name: string
  }
  hospital: {
    id: string
    name: string
  }
  materials: SurgeryMaterial[]
  additionalNotes?: string
  room?: string
}

export function generateSurgeryPDF(surgery: SurgeryDetails): string {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 20

  // Header
  doc.setFontSize(20)
  doc.text("Informe de Cirugía Programada", pageWidth / 2, margin, { align: "center" })

  // Basic Info
  doc.setFontSize(12)
  doc.text(`ID de Cirugía: ${surgery.id}`, margin, margin + 20)
  doc.text(`Fecha: ${format(surgery.date, "EEEE d 'de' MMMM yyyy", { locale: es })}`, margin, margin + 30)
  doc.text(`Tipo de Cirugía: ${surgery.surgeryType.name}`, margin, margin + 40)
  doc.text(`Descripción: ${surgery.surgeryType.description}`, margin, margin + 50)
  doc.text(`Duración Estimada: ${surgery.estimatedDuration} minutos`, margin, margin + 60)

  // Personnel
  doc.setFontSize(14)
  doc.text("Personal", margin, margin + 80)
  doc.setFontSize(12)
  doc.text(`Cirujano: Dr. ${surgery.surgeon.name}`, margin, margin + 90)
  doc.text(`Neurofisiólogo: Dr. ${surgery.neurophysiologist.name}`, margin, margin + 100)

  // Location
  doc.setFontSize(14)
  doc.text("Ubicación", margin, margin + 120)
  doc.setFontSize(12)
  doc.text(`Hospital: ${surgery.hospital.name}`, margin, margin + 130)
  if (surgery.room) {
    doc.text(`Quirófano: ${surgery.room}`, margin, margin + 140)
  }

  // Materials
  doc.setFontSize(14)
  doc.text("Materiales Requeridos", margin, margin + 160)
  doc.setFontSize(12)
  let yPos = margin + 170
  surgery.materials.forEach((material) => {
    doc.text(`• ${material.name} (${material.category})`, margin, yPos)
    yPos += 10
  })

  // Additional Notes
  if (surgery.additionalNotes) {
    doc.setFontSize(14)
    doc.text("Notas Adicionales", margin, yPos + 20)
    doc.setFontSize(12)
    doc.text(surgery.additionalNotes, margin, yPos + 30)
  }

  // Footer
  doc.setFontSize(10)
  doc.text(
    `Generado el ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}`,
    pageWidth - margin,
    doc.internal.pageSize.height - margin,
    { align: "right" },
  )

  // Save the PDF
  const fileName = `cirugia_${surgery.id}_${format(surgery.date, "yyyyMMdd")}.pdf`
  doc.save(fileName)
  return fileName
}

