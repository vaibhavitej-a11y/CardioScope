"""Build the six-page technical report from index.md.

Install docs/requirements.txt, then run this script from any directory.
Each numbered level-two heading begins a page. Fail rather than replace
the submitted PDF if the edited content exceeds the six-page limit.
"""
from __future__ import annotations

import re
import textwrap
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    Image, PageBreak, Paragraph, Preformatted, SimpleDocTemplate, Spacer, Table, TableStyle,
)

SOURCE = Path(__file__).with_name("index.md")
OUTPUT = SOURCE.with_suffix(".pdf")
INK = colors.HexColor("#202b3b")
MUTED = colors.HexColor("#59677a")
ACCENT = colors.HexColor("#315b87")
WIDTH = A4[0] - 88


def inline(text: str) -> str:
    text = escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', text)
    return re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)


def page_chrome(canvas, document) -> None:
    canvas.saveState()
    canvas.setTitle("CardioScope — Track A Technical Report")
    canvas.setAuthor("CardioScope team")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(44, A4[1] - 26, "CARDIOSCOPE  /  TRACK A  /  2026")
    canvas.setStrokeColor(colors.HexColor("#dce2e9"))
    canvas.line(44, A4[1] - 33, A4[0] - 44, A4[1] - 33)
    canvas.line(44, 36, A4[0] - 44, 36)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(44, 24, "Research and education only; not a substitute for diagnostic imaging.")
    canvas.drawRightString(A4[0] - 44, 24, str(document.page))
    canvas.restoreState()


def build() -> None:
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("ReportBody", fontName="Helvetica", fontSize=9.3,
                              leading=13.6, textColor=INK, spaceAfter=8))
    styles.add(ParagraphStyle("ReportTitle", fontName="Helvetica-Bold", fontSize=25,
                              leading=30, textColor=ACCENT, spaceAfter=10))
    styles.add(ParagraphStyle("ReportHeading", fontName="Helvetica-Bold", fontSize=14,
                              leading=18, textColor=ACCENT, spaceBefore=8, spaceAfter=13))
    styles.add(ParagraphStyle("ReportSubheading", fontName="Helvetica-Bold", fontSize=10,
                              leading=14, textColor=INK, spaceBefore=8, spaceAfter=6))
    styles.add(ParagraphStyle("ReportCode", fontName="Courier", fontSize=7.2,
                              leading=10.5, textColor=INK, backColor=colors.HexColor("#f1f4f8"),
                              borderPadding=8, spaceAfter=12))
    styles.add(ParagraphStyle("ReportCell", fontName="Helvetica", fontSize=8,
                              leading=11.5, textColor=INK))
    story = []
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    section_count = 0
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        if line.startswith("## "):
            if section_count:
                story.append(PageBreak())
            section_count += 1
            story.append(Paragraph(inline(line[3:]), styles["ReportHeading"]))
        elif line.startswith("# "):
            story.append(Paragraph(inline(line[2:]), styles["ReportTitle"]))
        elif line.startswith("### "):
            story.append(Paragraph(inline(line[4:]), styles["ReportSubheading"]))
        elif line.startswith("```"):
            code = []
            index += 1
            while index < len(lines) and not lines[index].startswith("```"):
                code.extend(textwrap.wrap(lines[index], width=100, replace_whitespace=False,
                                          drop_whitespace=False) or [""])
                index += 1
            story.append(Preformatted("\n".join(code), styles["ReportCode"]))
        elif line.startswith("|"):
            rows = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                cells = [cell.strip() for cell in lines[index].strip().strip("|").split("|")]
                if not all(re.fullmatch(r"[-: ]+", cell) for cell in cells):
                    rows.append(cells)
                index += 1
            count = len(rows[0])
            weights = [max(10, min(40, max(len(row[col]) for row in rows))) for col in range(count)]
            widths = [WIDTH * weight / sum(weights) for weight in weights]
            data = [[Paragraph(inline(cell), styles["ReportCell"]) for cell in row] for row in rows]
            table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e9eff6")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f9fb")]),
                ("LINEBELOW", (0, 0), (-1, 0), .6, colors.HexColor("#cad5e3")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]))
            story.extend([table, Spacer(1, 11)])
            continue
        elif line.startswith("!["):
            match = re.match(r"!\[.*?\]\((.*?)\)", line)
            if not match:
                raise ValueError(f"Invalid image: {line}")
            figure = Image(str(SOURCE.parent / match.group(1)))
            ratio = figure.imageHeight / figure.imageWidth
            figure.drawWidth = 320
            figure.drawHeight = figure.drawWidth * ratio
            figure.hAlign = "CENTER"
            story.extend([figure, Spacer(1, 8)])
        elif line.startswith("- "):
            story.append(Paragraph(inline(line[2:]), styles["ReportBody"], bulletText="•"))
        else:
            paragraph = [line]
            while index + 1 < len(lines) and lines[index + 1].strip() and not lines[index + 1].startswith(("#", "|", "```", "![", "- ")):
                index += 1
                paragraph.append(lines[index].strip())
            story.append(Paragraph(inline(" ".join(paragraph)), styles["ReportBody"]))
        index += 1

    if section_count != 6:
        raise ValueError("The report must contain exactly six level-two sections.")
    staged = OUTPUT.with_name("index.build.pdf")
    document = SimpleDocTemplate(str(staged), pagesize=A4, rightMargin=44, leftMargin=44,
                                 topMargin=48, bottomMargin=48, title="CardioScope Technical Report")
    document.build(story, onFirstPage=page_chrome, onLaterPages=page_chrome)
    if document.page != 6:
        staged.unlink(missing_ok=True)
        raise ValueError(f"Report expanded to {document.page} pages; shorten the source before submitting.")
    staged.replace(OUTPUT)
    print(f"Built {OUTPUT} ({document.page} pages)")


if __name__ == "__main__":
    build()
