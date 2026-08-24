from __future__ import annotations

import html
import math
import shutil
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
PUBLIC_DIR = ROOT / "public" / "resume"
PORTRAIT = PUBLIC_DIR / "welles-gu-portrait.png"
LOGO_DIR = PUBLIC_DIR / "logos"
VENTURE_DIR = PUBLIC_DIR / "ventures"
COMPANY_LOGOS = {
    "IHG China": LOGO_DIR / "ihg.png",
    "OYO China": LOGO_DIR / "oyo.png",
    "WeWork China": LOGO_DIR / "wework.png",
    "C&A China": LOGO_DIR / "c-and-a.png",
    "Costa Coffee China": LOGO_DIR / "costa-coffee.png",
    "China Lodging Group": LOGO_DIR / "h-world.png",
    "HP China": LOGO_DIR / "hp.png",
}
VENTURE_LOGOS = {
    "finance": VENTURE_DIR / "j-finance-logo-theme.png",
    "ai": VENTURE_DIR / "j-ai-logo-theme.png",
}
VENTURE_LOGO_SCALE = {"finance": 1.08, "ai": 1.23}

PAGE_WIDTH, PAGE_HEIGHT = A4
CHARCOAL = HexColor("#262423")
INK = HexColor("#302D2B")
MUTED = HexColor("#716864")
ORANGE = HexColor("#C66C49")
ORANGE_LIGHT = HexColor("#E8A080")
WARM_WHITE = HexColor("#FFF9F5")
PEACH = HexColor("#F7E7DE")
LINE = HexColor("#E4CFC4")


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("MSYH", r"C:\Windows\Fonts\msyh.ttc", subfontIndex=0))
    pdfmetrics.registerFont(TTFont("MSYH-Bold", r"C:\Windows\Fonts\msyhbd.ttc", subfontIndex=0))
    pdfmetrics.registerFont(TTFont("Georgia", r"C:\Windows\Fonts\georgia.ttf"))
    pdfmetrics.registerFont(TTFont("Georgia-Bold", r"C:\Windows\Fonts\georgiab.ttf"))


def safe(value: str) -> str:
    return html.escape(value, quote=True)


def paragraph_style(
    name: str,
    font: str,
    size: float,
    leading: float,
    color=INK,
    space_after: float = 0,
) -> ParagraphStyle:
    return ParagraphStyle(
        name,
        fontName=font,
        fontSize=size,
        leading=leading,
        textColor=color,
        alignment=TA_LEFT,
        spaceAfter=space_after,
        allowWidows=0,
        allowOrphans=0,
    )


def draw_paragraph(c: canvas.Canvas, text: str, x: float, y: float, width: float, style: ParagraphStyle) -> float:
    block = Paragraph(text, style)
    _, height = block.wrap(width, PAGE_HEIGHT)
    block.drawOn(c, x, y - height)
    return y - height


def draw_section_title(c: canvas.Canvas, title: str, x: float, y: float, width: float, font: str) -> float:
    c.setFillColor(ORANGE)
    c.roundRect(x, y - 13, 4, 14, 2, fill=1, stroke=0)
    style = paragraph_style("section", font, 12.2, 14.6, CHARCOAL)
    next_y = draw_paragraph(c, f"<b>{safe(title)}</b>", x + 11, y, width - 11, style)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(x, next_y - 6, x + width, next_y - 6)
    return next_y - 15


def draw_bullets(
    c: canvas.Canvas,
    bullets: list[str],
    x: float,
    y: float,
    width: float,
    font: str,
    size: float = 7.35,
    leading: float = 9.7,
) -> float:
    style = paragraph_style("bullet", font, size, leading, MUTED)
    for bullet in bullets:
        text = f'<font color="#C66C49">•</font>&nbsp; {safe(bullet)}'
        y = draw_paragraph(c, text, x, y, width, style) - 3.2
    return y


def draw_job(
    c: canvas.Canvas,
    job: dict,
    x: float,
    y: float,
    width: float,
    font: str,
    bold_font: str,
    compact: bool = False,
) -> float:
    period_style = paragraph_style("period", bold_font, 6.8 if compact else 7.1, 8.7, ORANGE)
    heading_style = paragraph_style("job-heading", bold_font, 8.6 if compact else 9.1, 11.1, CHARCOAL)
    meta_style = paragraph_style("job-meta", font, 6.5 if compact else 6.8, 8.6, MUTED)

    y = draw_paragraph(c, safe(job["period"]), x, y, width, period_style) - 2
    logo_path = COMPANY_LOGOS.get(job["company"])
    heading_x = x
    heading_width = width
    if logo_path and logo_path.exists():
        c.setFillColor(HexColor("#FFFFFF"))
        c.roundRect(x, y - 22, 34, 20, 4, fill=1, stroke=0)
        c.drawImage(str(logo_path), x + 3, y - 20, width=28, height=16, preserveAspectRatio=True, anchor="c", mask="auto")
        heading_x += 41
        heading_width -= 41
    y = draw_paragraph(c, f'<b>{safe(job["company"])}</b> · {safe(job["role"])}', heading_x, y, heading_width, heading_style) - 2
    y = draw_paragraph(c, safe(job["meta"]), heading_x, y, heading_width, meta_style) - 5
    y = draw_bullets(
        c,
        job["bullets"],
        x,
        y,
        width,
        font,
        size=6.85 if compact else 7.25,
        leading=9.1 if compact else 9.7,
    )
    return y - (9 if compact else 12)


def draw_skill_group(
    c: canvas.Canvas,
    title: str,
    skills: list[tuple[str, int]],
    x: float,
    y: float,
    width: float,
    font: str,
    bold_font: str,
    note: str | None = None,
) -> float:
    title_style = paragraph_style("skill-title", bold_font, 8.4, 10, ORANGE)
    label_style = paragraph_style("skill-label", font, 6.6, 8.2, CHARCOAL)
    y = draw_paragraph(c, f"<b>{safe(title)}</b>", x, y, width, title_style) - 7
    for label, value in skills:
        y = draw_paragraph(c, safe(label), x, y, width - 28, label_style)
        c.setFillColor(MUTED)
        c.setFont(font, 6.2)
        c.drawRightString(x + width, y + 1.2, f"{value}%")
        c.setFillColor(LINE)
        c.roundRect(x, y - 6, width, 4, 2, fill=1, stroke=0)
        c.setFillColor(ORANGE_LIGHT)
        c.roundRect(x, y - 6, width * value / 100, 4, 2, fill=1, stroke=0)
        y -= 14
    if note:
        note_style = paragraph_style("skill-note", font, 5.55, 7.25, MUTED)
        y = draw_paragraph(c, safe(note), x, y - 1, width, note_style) - 4
    return y - 4


def draw_radar_group(c: canvas.Canvas, title: str, skills: list[tuple[str, int]], x: float, y: float, width: float, font: str, bold_font: str) -> float:
    title_style = paragraph_style("radar-title", bold_font, 8.4, 10, ORANGE)
    y = draw_paragraph(c, f"<b>{safe(title)}</b>", x, y, width, title_style) - 3
    center_x = x + width / 2
    center_y = y - 53
    radius = min(37, width * 0.26)

    def point(index: int, level: float, extra_radius: float = 0) -> tuple[float, float]:
        angle = -math.pi / 2 + index * math.pi * 2 / len(skills)
        current_radius = radius * level / 100 + extra_radius
        return center_x + math.cos(angle) * current_radius, center_y + math.sin(angle) * current_radius

    c.setLineWidth(0.45)
    for level in (20, 40, 60, 80, 100):
        path = c.beginPath()
        for index in range(len(skills)):
            px, py = point(index, level)
            if index == 0:
                path.moveTo(px, py)
            else:
                path.lineTo(px, py)
        path.close()
        c.setStrokeColor(LINE)
        c.drawPath(path, fill=0, stroke=1)

    c.setStrokeColor(ORANGE_LIGHT)
    for index in range(len(skills)):
        px, py = point(index, 100)
        c.line(center_x, center_y, px, py)

    shape = c.beginPath()
    for index, (_, value) in enumerate(skills):
        px, py = point(index, value)
        if index == 0:
            shape.moveTo(px, py)
        else:
            shape.lineTo(px, py)
    shape.close()
    c.setFillColor(ORANGE_LIGHT)
    c.setStrokeColor(ORANGE)
    c.setLineWidth(1.2)
    c.drawPath(shape, fill=1, stroke=1)

    full_labels = (
        ("Business Analysis", "& Reporting"),
        ("Budgeting &", "Strategic Planning"),
        ("Financial Modeling",),
        ("Leadership",),
        ("Efficiency",),
    )
    label_positions = (
        (center_x, center_y - radius - 8, "center"),
        (x + width - 1, center_y - 9, "right"),
        (x + width - 1, center_y + radius * 0.72, "right"),
        (x + 1, center_y + radius * 0.72, "left"),
        (x + 1, center_y - 9, "left"),
    )
    c.setFont(bold_font, 4.6)
    for (_, value), label_lines, (label_x, label_y, alignment) in zip(skills, full_labels, label_positions):
        c.setFillColor(MUTED)
        current_y = label_y
        for label in label_lines:
            if alignment == "right":
                c.drawRightString(label_x, current_y, label)
            elif alignment == "center":
                c.drawCentredString(label_x, current_y, label)
            else:
                c.drawString(label_x, current_y, label)
            current_y -= 5.2
        c.setFillColor(ORANGE)
        if alignment == "right":
            c.drawRightString(label_x, current_y, f"{value}%")
        elif alignment == "center":
            c.drawCentredString(label_x, current_y, f"{value}%")
        else:
            c.drawString(label_x, current_y, f"{value}%")

    return center_y - radius - 31


def draw_personal_group(c: canvas.Canvas, title: str, items: list[str], x: float, y: float, width: float, font: str, bold_font: str) -> float:
    title_style = paragraph_style("personal-title", bold_font, 7.5, 9, ORANGE)
    item_style = paragraph_style("personal-item", bold_font, 5.9, 7.4, CHARCOAL)
    y = draw_paragraph(c, f"<b>{safe(title)}</b>", x, y, width, title_style) - 6
    label_width = width - 48
    rows: list[tuple[Paragraph, float, float]] = []
    for item in items:
        paragraph = Paragraph(safe(item), item_style)
        paragraph_width, paragraph_height = paragraph.wrap(label_width, 60)
        rows.append((paragraph, paragraph_width, max(29, paragraph_height + 14)))

    panel_height = sum(row_height for _, _, row_height in rows)
    panel_bottom = y - panel_height
    c.setFillColor(WARM_WHITE)
    c.roundRect(x, panel_bottom, width, panel_height, 7, fill=1, stroke=0)

    row_top = y
    for index, (paragraph, _, row_height) in enumerate(rows):
        if index:
            c.setStrokeColor(LINE)
            c.setLineWidth(0.45)
            c.line(x, row_top, x + width, row_top)

        circle_x = x + 17
        circle_y = row_top - row_height / 2
        c.setFillColor(ORANGE_LIGHT)
        c.circle(circle_x, circle_y, 9.4, fill=1, stroke=0)
        c.setFillColor(CHARCOAL)
        c.setFont(bold_font, 5.3)
        c.drawCentredString(circle_x, circle_y - 1.8, f"0{index + 1}")

        stars_y = row_top - 8.5
        c.setFillColor(ORANGE)
        for star_index in range(5):
            center_x = x + 35 + star_index * 5.4
            center_y = stars_y
            star = c.beginPath()
            for point_index in range(10):
                angle = -math.pi / 2 + point_index * math.pi / 5
                radius = 2.05 if point_index % 2 == 0 else 0.86
                px = center_x + math.cos(angle) * radius
                py = center_y + math.sin(angle) * radius
                if point_index == 0:
                    star.moveTo(px, py)
                else:
                    star.lineTo(px, py)
            star.close()
            c.drawPath(star, fill=1, stroke=0)
        paragraph.drawOn(c, x + 35, row_top - 13 - paragraph.height)
        row_top -= row_height
    return panel_bottom - 6


def draw_thumb_icon(c: canvas.Canvas, x: float, y: float, color) -> None:
    c.setStrokeColor(color)
    c.setLineWidth(0.8)
    c.setLineCap(1)
    c.setLineJoin(1)
    path = c.beginPath()
    path.moveTo(x + 3.1, y + 1.4)
    path.lineTo(x + 5.2, y + 5.1)
    path.curveTo(x + 5.8, y + 6.1, x + 7.1, y + 5.6, x + 6.9, y + 4.6)
    path.lineTo(x + 6.6, y + 3.1)
    path.lineTo(x + 9.1, y + 3.1)
    path.curveTo(x + 10.2, y + 3.1, x + 10.6, y + 2.3, x + 10.2, y + 1.5)
    path.lineTo(x + 9.2, y - 0.8)
    path.curveTo(x + 8.9, y - 1.5, x + 8.2, y - 1.8, x + 7.4, y - 1.8)
    path.lineTo(x + 3.1, y - 1.8)
    path.close()
    c.drawPath(path, fill=0, stroke=1)
    c.rect(x, y - 1.8, 2.4, 6.9, fill=0, stroke=1)


def draw_tool_tags(c: canvas.Canvas, x: float, y: float, font: str, bold_font: str) -> float:
    tags = [
        ("Excel", True, 60),
        ("PPT", True, 52),
        ("Tableau", False, 62),
        ("SAP", False, 46),
        ("Anaplan", False, 65),
    ]
    current_x = x
    tag_height = 20
    for label, endorsed, tag_width in tags:
        c.setFillColor(ORANGE if endorsed else WARM_WHITE)
        c.setStrokeColor(ORANGE_LIGHT)
        c.setLineWidth(0.6)
        c.roundRect(current_x, y - tag_height, tag_width, tag_height, 6, fill=1, stroke=1)
        text_x = current_x + 9
        if endorsed:
            draw_thumb_icon(c, current_x + 7, y - 10.5, WARM_WHITE)
            text_x = current_x + 21
        c.setFillColor(WARM_WHITE if endorsed else ORANGE)
        c.setFont(bold_font, 7)
        c.drawString(text_x, y - 13.4, label)
        current_x += tag_width + 7
    return y - tag_height


def draw_venture_summary(
    c: canvas.Canvas,
    venture: dict,
    x: float,
    y: float,
    width: float,
    font: str,
    bold_font: str,
) -> float:
    card_height = 108
    bottom = y - card_height
    c.setFillColor(PEACH)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.roundRect(x, bottom, width, card_height, 11, fill=1, stroke=1)

    logo = VENTURE_LOGOS[venture["logo"]]
    if logo.exists():
        logo_size = 34
        logo_x = x + 11
        logo_y = y - 46
        c.saveState()
        clip = c.beginPath()
        clip.circle(logo_x + logo_size / 2, logo_y + logo_size / 2, logo_size / 2)
        c.clipPath(clip, stroke=0, fill=0)
        logo_scale = VENTURE_LOGO_SCALE[venture["logo"]]
        draw_size = logo_size * logo_scale
        draw_offset = (draw_size - logo_size) / 2
        c.drawImage(
            str(logo),
            logo_x - draw_offset,
            logo_y - draw_offset,
            width=draw_size,
            height=draw_size,
            preserveAspectRatio=True,
            mask="auto",
        )
        c.restoreState()

    c.setFillColor(ORANGE)
    c.setFont(bold_font, 6.4)
    c.drawString(x + 54, y - 17, venture["period"])
    name_style = paragraph_style("venture-name", bold_font, 8.2, 9.5, CHARCOAL)
    name_y = draw_paragraph(c, safe(venture["name"]), x + 54, y - 23, width - 65, name_style)
    meta_style = paragraph_style("venture-meta", font, 5.7, 7.2, MUTED)
    draw_paragraph(c, safe(venture["meta"]), x + 54, name_y - 2, width - 65, meta_style)
    course_style = paragraph_style("venture-courses", font, 5.55, 7.1, CHARCOAL)
    draw_paragraph(c, safe(venture["courses"]), x + 11, y - 56, width - 22, course_style)
    return bottom


def draw_header(c: canvas.Canvas, content: dict, font: str, bold_font: str) -> None:
    c.setFillColor(WARM_WHITE)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    c.setFillColor(CHARCOAL)
    c.rect(0, PAGE_HEIGHT - 145, PAGE_WIDTH, 145, fill=1, stroke=0)
    c.setFillColor(ORANGE)
    c.rect(0, PAGE_HEIGHT - 145, PAGE_WIDTH, 5, fill=1, stroke=0)

    if PORTRAIT.exists():
        c.drawImage(str(PORTRAIT), 38, PAGE_HEIGHT - 127, width=58, height=87, preserveAspectRatio=True, mask="auto")

    c.setFillColor(WARM_WHITE)
    c.setFont("Georgia-Bold", 24)
    c.drawString(116, PAGE_HEIGHT - 58, "Welles Gu")
    c.setFillColor(ORANGE_LIGHT)
    c.setFont(bold_font, 8.9)
    c.drawString(116, PAGE_HEIGHT - 78, content["subtitle"])
    c.setFont(bold_font, 7.8)
    c.drawString(116, PAGE_HEIGHT - 93, content["mentor"])

    c.setFillColor(ORANGE_LIGHT)
    c.setFont(font, 7.4)
    c.drawString(116, PAGE_HEIGHT - 118, "Shanghai · China")
    c.drawString(220, PAGE_HEIGHT - 118, "welles.gu@gmail.com")
    c.drawString(370, PAGE_HEIGHT - 118, "WeChat · MrJ-0527")


def draw_footer(c: canvas.Canvas, page_number: int, language_label: str, font: str) -> None:
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(38, 30, PAGE_WIDTH - 38, 30)
    c.setFillColor(MUTED)
    c.setFont(font, 6.5)
    c.drawString(38, 18, f"Welles Gu · {language_label}")
    c.drawRightString(PAGE_WIDTH - 38, 18, f"{page_number} / 2")


def content_for(language: str) -> dict:
    if language == "zh":
        return {
            "language_label": "中文简历",
            "subtitle": "投资分析与财务分析专家 · 理财规划师",
            "mentor": "个人 AI 应用导师",
            "experience": "核心工作经历",
            "earlier": "早期工作经历",
            "entrepreneurship": "创业经历",
            "page_2_label": "创业与早期经历",
            "skills": "能力图谱",
            "ai_skills_title": "AI 技能（熟练度）",
            "ai_note": "能利用 AI 工具生成专业 PPT 与 AI 简历，制作个人网站、3D 旅行相册 App、投资理财策略、音乐播放器及挂号提醒系统等。",
            "work_title": "工作技能",
            "personal_title": "投资理财技能",
            "personal_items": [
                "家庭资产分配与管理",
                "财报研读与分析",
                "投资策略制定",
            ],
            "tools": "工具与系统",
            "education": "教育背景",
            "ventures": [
                {
                    "logo": "finance",
                    "period": "2020/06 - 2022/05",
                    "name": "J先生财商学院",
                    "meta": "创始人 · 1,000+ 学员 · 40+ 节原创课程",
                    "courses": "基础理论 10 节 · 实战课程 10 节 · A 股投研社 10 节 · 神基投资营 5 节 · 港股打新 5 节",
                },
                {
                    "logo": "ai",
                    "period": "2026/04 - 2026/08",
                    "name": "J先生AI魔法学院",
                    "meta": "创始人 · 100+ 学员 · 6 节原创 AI 入门课程",
                    "courses": "AI魔法理论 · AI 工具-灵宠篇 · AI 工具-龙虾篇 · OPC 一人公司 · AI 基金投资 · AI 股票投资",
                },
            ],
            "jobs_page_1": [
                {
                    "period": "2022/05 - 至今",
                    "company": "IHG China",
                    "role": "Sr. Manager Finance & Business Support",
                    "meta": "酒店业 · 外企 · 10,000+ 人",
                    "bullets": [
                        "与 FPS 团队协作提升酒店效率，识别并解决加盟酒店的财务相关问题。",
                        "提供财务洞察，识别酒店经营挑战与机会，并支持关键 KPI 监控。",
                        "发起新项目与改进举措，提升酒店财务回报并优化运营模式。",
                        "推动并支持 CI 与 Franchise 项目，将新的业务需求纳入项目方案。",
                        "与 COE、IDT、OPS 支持团队及业务专家协作，推进流程再造和系统升级。",
                    ],
                },
                {
                    "period": "2019/10 - 2020/06",
                    "company": "OYO China",
                    "role": "Senior Analytical Manager · CXO Office",
                    "meta": "覆盖约 8,000 家酒店与 8 个区域 · 带领 2 人",
                    "bullets": [
                        "负责中国区业务与商业分析，并支持管理层经营决策。",
                        "承担 CEO/CXO 项目管理，优化跨公司的沟通、流程与执行效率。",
                        "建立并分析 8 个区域的 Regional GM KPI。",
                        "开展 G&A 成本控制，覆盖人力、咨询费与办公租赁。",
                        "负责全球汇报与跨区域沟通。",
                    ],
                },
                {
                    "period": "2018/01 - 2019/10",
                    "company": "WeWork China",
                    "role": "Senior FP&A Manager",
                    "meta": "覆盖 100+ 中国项目 · 带领 2 人",
                    "bullets": [
                        "使用 Anaplan 主导中国区年度预算与季度预测。",
                        "支持管理层改善入住率、收入质量、定价及折扣。",
                        "负责 100+ 项目的 P&L 分析和月度管理报告。",
                        "分析收入与成本 KPI，包括租金、人力、Opex 与 Capex。",
                        "搭建五年规划模型与预测。",
                        "开展房地产投资模型与 pro-forma 分析。",
                        "为多职能团队提供 Anaplan、Workday 与 Looker 支持及培训。",
                    ],
                },
            ],
            "jobs_page_2": [
                {
                    "period": "2014/06 - 2017/12",
                    "company": "C&A China",
                    "role": "Financial Analysis Manager",
                    "meta": "约 80 家门店 · 带领 1 人",
                    "bullets": [
                        "主导年度预算、季度预测与月度经营复盘。",
                        "完成营销活动、新店投资与财务模型分析。",
                        "通过 Capex、租金与人力结构分析支持风险管理。",
                    ],
                },
                {
                    "period": "2011/11 - 2014/06",
                    "company": "Costa Coffee China",
                    "role": "Senior FP&A",
                    "meta": "约 300 家门店",
                    "bullets": [
                        "主导年度预算与战略规划流程。",
                        "建立新投资项目可行性研究模型并参与决策。",
                        "编制经营复盘并开展营销、新品与竞争对手分析。",
                    ],
                },
                {
                    "period": "2010/09 - 2011/10",
                    "company": "China Lodging Group",
                    "role": "Financial Analyst",
                    "meta": "覆盖约 800 家酒店",
                    "bullets": [
                        "支持各区域年度预算与销售差异分析。",
                        "分析入住率、RevPAR、ADR 与运营成本。",
                        "分析新酒店开业前成本及主要竞争对手。",
                    ],
                },
                {
                    "period": "2005/03 - 2009/08",
                    "company": "HP China",
                    "role": "Intercompany / Fixed Assets Team Leader",
                    "meta": "带领 3 人",
                    "bullets": [
                        "处理关联公司结算、对账与长期未清余额。",
                        "带领中国区年度固定资产盘点。",
                        "为业务财务与资产协调员提供固定资产管理培训。",
                    ],
                },
            ],
            "education_lines": [
                "上海财经大学 · Bachelor / Economics · 2000/09 - 2004/06",
                "CET-6 · 英语能力认证",
            ],
        }

    return {
        "language_label": "English Resume",
        "subtitle": "Strategic Finance Professional · FA (Licensed Financial Advisor)",
        "mentor": "Personal AI Application Mentor",
        "experience": "Core Experience",
        "earlier": "Earlier Experience",
        "entrepreneurship": "Entrepreneurship",
        "page_2_label": "Entrepreneurship & Earlier Career",
        "skills": "Capabilities",
        "ai_skills_title": "AI Skills (Proficiency)",
        "ai_note": "Uses AI tools to create professional presentations and AI-enhanced resumes, personal websites, 3D travel-album apps, investment-planning strategies, music players and appointment reminder systems.",
        "work_title": "Work",
        "personal_title": "Personal Investment",
        "personal_items": [
            "Family Asset Allocation & Management",
            "Financial Statement Review & Analysis",
            "Personal Investment Strategy Development",
        ],
        "tools": "Tools & Systems",
        "education": "Education",
        "ventures": [
            {
                "logo": "finance",
                "period": "Jun 2020 - May 2022",
                "name": "Mr. J Financial Intelligence Academy",
                "meta": "Founder · 1,000+ learners · 40+ original lessons",
                "courses": "Fundamentals 10 · Practical Investing 10 · A-share Research Club 10 · Fund Investment Camp 5 · Hong Kong IPO Subscription 5",
            },
            {
                "logo": "ai",
                "period": "Apr 2026 - Aug 2026",
                "name": "Mr. J AI Magic Academy",
                "meta": "Founder · 100+ learners · 6 original AI lessons",
                    "courses": "AI Magic Theory · AI Tools-Companion Agents · AI Tools-Lobster · OPC One-Person Company · AI Fund Investing · AI Stock Investing",
            },
        ],
        "jobs_page_1": [
            {
                "period": "May 2022 - Present",
                "company": "IHG China",
                "role": "Sr. Manager Finance & Business Support",
                "meta": "Hospitality · Global company · 10,000+ people",
                "bullets": [
                    "Partner with the FPS team to improve hotel efficiency and resolve finance-related issues for franchised hotels.",
                    "Provide financial insights that identify hotel challenges and opportunity areas for KPI monitoring.",
                    "Launch initiatives that improve financial returns and strengthen the hotel operating model.",
                    "Drive and support CI and Franchise projects to incorporate new business requirements.",
                    "Partner with COE, IDT, OPS support teams and business experts on process and system enhancement.",
                ],
            },
            {
                "period": "Oct 2019 - Jun 2020",
                "company": "OYO China",
                "role": "Senior Analytical Manager · CXO Office",
                "meta": "About 8,000 hotels across eight regions · Led 2 people",
                "bullets": [
                    "Delivered business and commercial analysis for the China entity.",
                    "Ran CEO/CXO project management to improve communication, process and execution efficiency.",
                    "Built and analyzed Regional GM KPI frameworks across eight regions.",
                    "Managed G&A cost control across people, consulting and office rental.",
                    "Owned global reporting and cross-region communication.",
                ],
            },
            {
                "period": "Jan 2018 - Oct 2019",
                "company": "WeWork China",
                "role": "Senior FP&A Manager",
                "meta": "100+ China locations · Led 2 people",
                "bullets": [
                    "Led annual budgeting and quarterly forecasting for the China entity using Anaplan.",
                    "Supported management on occupancy, quality of revenue, pricing and discount decisions.",
                    "Owned P&L analysis and monthly reporting for more than 100 China locations.",
                    "Analyzed revenue and cost KPIs including rent, labor, opex and capex.",
                    "Built a five-year planning model and forecast.",
                    "Delivered real-estate pro-forma and investment-model analysis.",
                    "Provided Anaplan, Workday and Looker support and training across functions.",
                ],
            },
        ],
        "jobs_page_2": [
            {
                "period": "Jun 2014 - Dec 2017",
                "company": "C&A China",
                "role": "Financial Analysis Manager",
                "meta": "About 80 stores · Led 1 person",
                "bullets": [
                    "Led annual budgeting, quarterly forecasting and monthly business reviews.",
                    "Analyzed campaigns, new-store investments and decision models.",
                    "Supported risk management through capex, rent and labor-structure analysis.",
                ],
            },
            {
                "period": "Nov 2011 - Jun 2014",
                "company": "Costa Coffee China",
                "role": "Senior FP&A",
                "meta": "About 300 stores",
                "bullets": [
                    "Led annual budgeting and strategic planning.",
                    "Built feasibility-study models and participated in new-opening decisions.",
                    "Delivered business reviews plus campaign, product and competitor analysis.",
                ],
            },
            {
                "period": "Sep 2010 - Oct 2011",
                "company": "China Lodging Group",
                "role": "Financial Analyst",
                "meta": "About 800 hotels",
                "bullets": [
                    "Supported regional budgeting and sales-variance analysis.",
                    "Analyzed occupancy, RevPAR, ADR and operating costs.",
                    "Reviewed hotel pre-opening costs and major competitors.",
                ],
            },
            {
                "period": "Mar 2005 - Aug 2009",
                "company": "HP China",
                "role": "Intercompany / Fixed Assets Team Leader",
                "meta": "Led 3 people",
                "bullets": [
                    "Managed intercompany settlements, reconciliations and ageing balances.",
                    "Led the China annual fixed-asset physical count.",
                    "Trained business finance and asset coordinators on fixed-asset management.",
                ],
            },
        ],
        "education_lines": [
            "Shanghai University of Finance and Economics · Bachelor / Economics · Sep 2000 - Jun 2004",
            "CET-6 · English language certification",
        ],
    }


WORK_SKILLS = [
    ("Business Analysis & Reporting", 95),
    ("Budgeting & Strategic Planning", 90),
    ("Financial Modeling", 90),
    ("Leadership", 80),
    ("Work Efficiency", 90),
]

AI_SKILLS = [
    ("ChatGPT (Codex)", 95),
    ("Claude Code", 85),
    ("Workbuddy", 85),
]


def generate_pdf(language: str, destination: Path) -> None:
    content = content_for(language)
    font = "MSYH"
    bold_font = "MSYH-Bold"
    c = canvas.Canvas(str(destination), pagesize=A4, pageCompression=1)
    c.setTitle(f"Welles Gu - {content['language_label']}")
    c.setAuthor("Welles Gu")
    c.setSubject("Strategic Finance, Entrepreneurship and Practical AI Applications")

    # Page 1: recent experience and core capabilities.
    draw_header(c, content, font, bold_font)
    left_x = 38
    left_width = 347
    right_x = 406
    right_width = PAGE_WIDTH - right_x - 38
    body_top = PAGE_HEIGHT - 169

    c.setFillColor(PEACH)
    c.roundRect(right_x - 12, 47, right_width + 24, body_top - 37, 14, fill=1, stroke=0)
    y_left = draw_section_title(c, content["experience"], left_x, body_top, left_width, bold_font)
    for job in content["jobs_page_1"]:
        y_left = draw_job(c, job, left_x, y_left, left_width, font, bold_font)

    y_right = draw_section_title(c, content["skills"], right_x, body_top, right_width, bold_font)
    y_right = draw_skill_group(c, content["ai_skills_title"], AI_SKILLS, right_x, y_right, right_width, font, bold_font, content["ai_note"])
    y_right = draw_radar_group(c, content["work_title"], WORK_SKILLS, right_x, y_right, right_width, font, bold_font)
    y_right = draw_personal_group(c, content["personal_title"], content["personal_items"], right_x, y_right, right_width, font, bold_font)

    if min(y_left, y_right) < 40:
        raise RuntimeError(f"Page 1 overflow for {language}: y={min(y_left, y_right):.1f}")
    draw_footer(c, 1, content["language_label"], font)
    c.showPage()

    # Page 2: earlier experience, education and credentials.
    c.setFillColor(WARM_WHITE)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    c.setFillColor(CHARCOAL)
    c.rect(0, PAGE_HEIGHT - 68, PAGE_WIDTH, 68, fill=1, stroke=0)
    c.setFillColor(ORANGE)
    c.rect(0, PAGE_HEIGHT - 68, PAGE_WIDTH, 4, fill=1, stroke=0)
    c.setFillColor(WARM_WHITE)
    c.setFont("Georgia-Bold", 17)
    c.drawString(38, PAGE_HEIGHT - 42, "Welles Gu")
    c.setFillColor(ORANGE_LIGHT)
    c.setFont(bold_font, 8.2)
    c.drawRightString(PAGE_WIDTH - 38, PAGE_HEIGHT - 41, content["page_2_label"])

    content_top = PAGE_HEIGHT - 94
    column_gap = 25
    column_width = (PAGE_WIDTH - 76 - column_gap) / 2
    left_column_x = 38
    right_column_x = left_column_x + column_width + column_gap
    venture_y = draw_section_title(c, content["entrepreneurship"], 38, content_top, PAGE_WIDTH - 76, bold_font) - 1
    venture_bottoms = [
        draw_venture_summary(c, venture, x, venture_y, column_width, font, bold_font)
        for venture, x in zip(content["ventures"], (left_column_x, right_column_x))
    ]

    earlier_top = min(venture_bottoms) - 11
    earlier_y = draw_section_title(c, content["earlier"], 38, earlier_top, PAGE_WIDTH - 76, bold_font)
    y_left = earlier_y
    y_right = earlier_y
    for job in content["jobs_page_2"][:2]:
        y_left = draw_job(c, job, left_column_x, y_left, column_width, font, bold_font, compact=True)
    for job in content["jobs_page_2"][2:]:
        y_right = draw_job(c, job, right_column_x, y_right, column_width, font, bold_font, compact=True)

    education_top = min(y_left, y_right) - 2
    education_panel_height = 100
    education_panel_bottom = education_top - education_panel_height
    c.setFillColor(PEACH)
    c.roundRect(38, education_panel_bottom, PAGE_WIDTH - 76, education_panel_height, 14, fill=1, stroke=0)
    education_y = draw_section_title(c, content["education"], 52, education_top - 14, PAGE_WIDTH - 104, bold_font)
    education_style = paragraph_style("education", font, 7.3, 10.3, CHARCOAL)
    for line in content["education_lines"]:
        education_y = draw_paragraph(c, f'<font color="#C66C49">•</font>&nbsp; {safe(line)}', 52, education_y, PAGE_WIDTH - 104, education_style) - 5

    if education_y < education_panel_bottom + 18:
        raise RuntimeError(f"Page 2 overflow for {language}: y={education_y:.1f}")

    tools_panel_top = education_panel_bottom - 10
    tools_panel_height = 57
    tools_panel_bottom = tools_panel_top - tools_panel_height
    c.setFillColor(PEACH)
    c.roundRect(38, tools_panel_bottom, PAGE_WIDTH - 76, tools_panel_height, 14, fill=1, stroke=0)
    tools_y = draw_section_title(c, content["tools"], 52, tools_panel_top - 14, PAGE_WIDTH - 104, bold_font)
    draw_tool_tags(c, 52, tools_y, font, bold_font)
    if tools_panel_bottom < 38:
        raise RuntimeError(f"Page 2 tools overflow for {language}: y={tools_panel_bottom:.1f}")
    draw_footer(c, 2, content["language_label"], font)
    c.save()


def main() -> None:
    register_fonts()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    outputs = {
        "zh": OUTPUT_DIR / "welles-gu-resume-zh.pdf",
        "en": OUTPUT_DIR / "welles-gu-resume-en.pdf",
    }
    for language, destination in outputs.items():
        generate_pdf(language, destination)
        shutil.copy2(destination, PUBLIC_DIR / destination.name)
        print(f"generated {destination.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
