"""Automated PDF inspection report generator using ReportLab."""

import os
from pathlib import Path
from typing import Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from backend.app.core.config import settings


class ReportGeneratorService:
    """Generates comprehensive inspection PDF reports with embedded visual analysis."""

    def __init__(self, report_dir: str = settings.REPORT_DIRECTORY):
        self.report_dir = Path(report_dir)
        self.report_dir.mkdir(parents=True, exist_ok=True)

    def generate_pdf_report(
        self,
        record_id: int,
        record_uuid: str,
        filename: str,
        created_at: str,
        is_crack: bool,
        confidence: float,
        severity: str,
        crack_percentage: float,
        overlay_path: Optional[str] = None,
        boxes: Optional[list] = None,
    ) -> str:
        """Create a professional PDF inspection report and return its file path."""
        report_filename = f"CrackSense_Report_{record_uuid[:8]}.pdf"
        output_path = self.report_dir / report_filename

        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#0f172a"),
            fontName="Helvetica-Bold",
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#64748b"),
        )
        heading2_style = ParagraphStyle(
            "Heading2",
            parent=styles["Heading2"],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#1e293b"),
            spaceBefore=12,
            spaceAfter=6,
        )
        disclaimer_style = ParagraphStyle(
            "Disclaimer",
            parent=styles["Normal"],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#64748b"),
            alignment=1,  # Center
        )

        elements = []

        # Header Title
        elements.append(Paragraph("CrackSense AI – Concrete Surface Inspection Report", title_style))
        elements.append(Paragraph("Automated Deep Learning & Computer Vision Analysis", subtitle_style))
        elements.append(Spacer(1, 14))

        # Status Banner
        status_color = colors.HexColor("#dc2626") if is_crack else colors.HexColor("#16a34a")
        status_label = "CRACK DETECTED" if is_crack else "SURFACE INTACT (CLEAR)"
        status_data = [[
            Paragraph(f"<font color='white'><b>INSPECTION RESULT: {status_label}</b></font>", ParagraphStyle("StatusBanner", alignment=1, fontSize=12, leading=14))
        ]]
        status_table = Table(status_data, colWidths=[540])
        status_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), status_color),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ]))
        elements.append(status_table)
        elements.append(Spacer(1, 14))

        # Metadata Table
        elements.append(Paragraph("Inspection Details", heading2_style))
        meta_data = [
            ["Record ID", str(record_id), "Inspection UUID", record_uuid[:18] + "..."],
            ["Target File", filename, "Inspection Date", str(created_at)],
            ["Confidence Score", f"{confidence:.1%}", "Structural Severity", f"{severity} (image-relative px)"],
            ["Estimated Crack Area", f"{crack_percentage:.2f}%", "AI Models Used", "ResNet + YOLO + U-Net"],
        ]
        meta_table = Table(meta_data, colWidths=[120, 150, 130, 140])
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#1e293b")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 14))

        # Embedded Image Overlay if available
        if overlay_path and os.path.exists(overlay_path):
            elements.append(Paragraph("Visual Evidence (Side-by-Side Analysis)", heading2_style))
            # Scale image proportionally to fit within 540 width
            try:
                img = RLImage(overlay_path, width=540, height=220)
                elements.append(img)
                elements.append(Spacer(1, 14))
            except Exception:
                pass

        # Bounding box findings
        if boxes and len(boxes) > 0:
            elements.append(Paragraph("Localized Crack Coordinates (Bounding Boxes)", heading2_style))
            box_rows = [["#", "Region Label", "Bounding Box [X1, Y1, X2, Y2]", "Confidence"]]
            for idx, b in enumerate(boxes, 1):
                box_rows.append([
                    str(idx),
                    b.get("label", "Crack"),
                    f"[{b.get('x1', 0):.0f}, {b.get('y1', 0):.0f}, {b.get('x2', 0):.0f}, {b.get('y2', 0):.0f}]",
                    f"{b.get('confidence', 0.0):.1%}",
                ])
            box_table = Table(box_rows, colWidths=[30, 150, 260, 100])
            box_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]))
            elements.append(box_table)
            elements.append(Spacer(1, 16))

        # Regulatory / Professional Notice
        elements.append(Spacer(1, 20))
        notice_text = (
            "<b>NOTICE:</b> CrackSense AI is an image-based inspection support tool. AI-generated results "
            "do not constitute a certified structural safety certification and should be reviewed by licensed "
            "civil engineering professionals."
        )
        elements.append(Paragraph(notice_text, disclaimer_style))

        doc.build(elements)
        return str(output_path)


report_generator = ReportGeneratorService()
