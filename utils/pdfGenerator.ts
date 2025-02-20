import jsPDF from 'jspdf';

type SurgeryDetails = {
  type: string;
  date: Date;
  duration: number;
  surgeon: string;
  neurophysiologist: string;
  hospital: string;
  operatingRoom: string;
  materials: string[];
};

export function generateSurgeryPDF(surgery: SurgeryDetails) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text('Surgery Details', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text(`Type: ${surgery.type}`, 20, 40);
  doc.text(`Date: ${surgery.date.toLocaleString()}`, 20, 50);
  doc.text(`Duration: ${surgery.duration} minutes`, 20, 60);
  doc.text(`Surgeon: ${surgery.surgeon}`, 20, 70);
  doc.text(`Neurophysiologist: ${surgery.neurophysiologist}`, 20, 80);
  doc.text(`Hospital: ${surgery.hospital}`, 20, 90);
  doc.text(`Operating Room: ${surgery.operatingRoom}`, 20, 100);

  doc.text('Required Materials:', 20, 120);
  surgery.materials.forEach((material, index) => {
    doc.text(`- ${material}`, 30, 130 + index * 10);
  });

  doc.save(`surgery_details_${surgery.date.toISOString().split('T')[0]}.pdf`);
}