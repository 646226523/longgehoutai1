import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import fs from 'fs';

interface CompetitionInfo {
  id: number;
  name: string;
  type: string | null;
  status: string;
  start_time: number | null;
  end_time: number | null;
  location: string | null;
  distance: number | null;
  organizer: string | null;
  contact_phone: string | null;
}

interface ParticipantInfo {
  id: number;
  ring_number: string;
  owner_name: string | null;
  verify_status: string;
  verify_reason: string | null;
  verified_at: number | null;
}

interface StatisticsSummary {
  total: number;
  passed: number;
  failed: number;
  pending: number;
}

const STATUS_LABELS_CN: Record<string, string> = {
  pending: '未核验',
  passed: '通过',
  failed: '不通过',
};

const STATUS_LABELS_EN: Record<string, string> = {
  pending: 'Pending',
  passed: 'Passed',
  failed: 'Failed',
};

export class ReportGenerator {
  private competitions: CompetitionInfo[];
  private participants: ParticipantInfo[];
  private reportId: string;
  private cjkFontPath: { path: string; family?: string } | null = null;
  private cjkFontAvailable: boolean;

  constructor(competitions: CompetitionInfo[], participants: ParticipantInfo[]) {
    this.competitions = competitions;
    this.participants = participants;
    this.reportId =
      'RPT-' +
      Date.now().toString(36).toUpperCase() +
      '-' +
      Math.random().toString(36).slice(2, 8).toUpperCase();
    this.cjkFontPath = this.findCJKFont();
    this.cjkFontAvailable = !!this.cjkFontPath;
  }

  private findCJKFont(): { path: string; family?: string } | null {
    const candidates: { path: string; family?: string }[] = [
      { path: 'C:/Windows/Fonts/simhei.ttf' },
      { path: 'C:/Windows/Fonts/msyh.ttf' },
      { path: 'C:/Windows/Fonts/simkai.ttf' },
      { path: 'C:/Windows/Fonts/msyh.ttc', family: 'Microsoft YaHei' },
      { path: 'C:/Windows/Fonts/simsun.ttc', family: 'SimSun' },
      { path: '/System/Library/Fonts/PingFang.ttc', family: 'PingFang' },
      { path: '/System/Library/Fonts/STHeiti Medium.ttc', family: 'STHeiti' },
      { path: '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', family: 'WenQuanYi Zen Hei' },
      { path: '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', family: 'Noto Sans CJK SC' },
    ];
    for (const c of candidates) {
      if (fs.existsSync(c.path)) {
        return c;
      }
    }
    return null;
  }

  private getStatusLabel(status: string): string {
    return this.cjkFontAvailable
      ? STATUS_LABELS_CN[status] ?? status
      : STATUS_LABELS_EN[status] ?? status;
  }

  private getStatistics(): StatisticsSummary {
    let passed = 0;
    let failed = 0;
    let pending = 0;
    for (const p of this.participants) {
      if (p.verify_status === 'passed') passed++;
      else if (p.verify_status === 'failed') failed++;
      else pending++;
    }
    return { total: this.participants.length, passed, failed, pending };
  }

  private formatTimestamp(ts: number | null): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('zh-CN', { hour12: false });
  }

  private formatDateTime(ts: number | null): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('zh-CN', { hour12: false });
  }

  private getCompetitionStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: '草稿',
      enrolling: '报名中',
      gathering: '集鸽中',
      racing: '比赛中',
      finished: '已结束',
      archived: '已归档',
    };
    return map[status] ?? status;
  }

  async generatePDF(
    options?: { includeDetail?: boolean; includeSummary?: boolean; includeExceptionOnly?: boolean }
  ): Promise<Buffer> {
    const { includeDetail = true, includeSummary = true, includeExceptionOnly = false } = options || {};

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // NOTE: PDFKit does not include built-in CJK font support.
    // When a CJK font file (e.g. msyh.ttc / simhei.ttf) is found on the system,
    // it will be registered and Chinese labels will be used throughout the PDF.
    // When no CJK font is available, English labels are used as fallback.
    let fontName: string | null = null;
    if (this.cjkFontAvailable && this.cjkFontPath) {
      try {
        if (this.cjkFontPath.family) {
          doc.registerFont('CJK', this.cjkFontPath.path, this.cjkFontPath.family);
        } else {
          doc.registerFont('CJK', this.cjkFontPath.path);
        }
        fontName = 'CJK';
      } catch (err) {
        console.warn('[PDF] CJK font registration failed:', err instanceof Error ? err.message : err);
        fontName = null;
      }
    }
    const font = fontName || 'Helvetica';
    const isCJK = !!fontName;

    // ==================== Cover Page ====================
    doc.fontSize(24);
    doc.font(font);
    doc.text(isCJK ? '赛鸽核验报告' : 'Pigeon Verification Report', { align: 'center' });
    doc.moveDown(0.8);
    doc.fontSize(11);
    doc.text(`Report ID: ${this.reportId}`, { align: 'center' });
    doc.moveDown(1.5);

    // Competition info block
    doc.fontSize(14);
    doc.text(isCJK ? '赛事信息' : 'Competition Information', { underline: true });
    doc.moveDown(0.8);

    for (const comp of this.competitions) {
      doc.fontSize(11);
      const lines = [
        isCJK ? `赛事名称: ${comp.name}` : `Name: ${comp.name}`,
        isCJK
          ? `赛事类型: ${comp.type || '-'}`
          : `Type: ${comp.type || '-'}`,
        isCJK
          ? `状态: ${this.getCompetitionStatusLabel(comp.status)}`
          : `Status: ${comp.status}`,
        isCJK
          ? `时间: ${this.formatDateTime(comp.start_time)} ~ ${this.formatDateTime(comp.end_time)}`
          : `Time: ${this.formatDateTime(comp.start_time)} ~ ${this.formatDateTime(comp.end_time)}`,
        isCJK
          ? `地点: ${comp.location || '-'}`
          : `Location: ${comp.location || '-'}`,
        isCJK
          ? `空距: ${comp.distance ? comp.distance + ' km' : '-'}`
          : `Distance: ${comp.distance ? comp.distance + ' km' : '-'}`,
        isCJK
          ? `主办方: ${comp.organizer || '-'}`
          : `Organizer: ${comp.organizer || '-'}`,
        isCJK
          ? `联系电话: ${comp.contact_phone || '-'}`
          : `Contact: ${comp.contact_phone || '-'}`,
      ];
      lines.forEach((line) => doc.text(line));
      doc.moveDown(0.8);
    }

    // Generation timestamp
    doc.fontSize(9);
    doc.text(
      isCJK
        ? `生成时间: ${new Date().toLocaleString('zh-CN', { hour12: false })}`
        : `Generated: ${new Date().toLocaleString()}`,
      { align: 'right' }
    );

    // ==================== Statistics Summary ====================
    if (includeSummary) {
      doc.addPage();
      doc.fontSize(16);
      doc.font(font);
      doc.text(isCJK ? '统计摘要' : 'Statistics Summary', { underline: true });
      doc.moveDown(1);

      const stats = this.getStatistics();
      const tableRows: string[][] = [
        [isCJK ? '类别' : 'Category', isCJK ? '数量' : 'Count'],
        [isCJK ? '总参赛鸽' : 'Total Participants', String(stats.total)],
        [isCJK ? '通过' : 'Passed', String(stats.passed)],
        [isCJK ? '不通过' : 'Failed', String(stats.failed)],
        [isCJK ? '未核验' : 'Pending', String(stats.pending)],
      ];

      const tableLeft = 120;
      const colWidth = 200;
      const rowHeight = 28;
      const tableTop = doc.y;

      tableRows.forEach((row, i) => {
        const y = tableTop + i * rowHeight;
        if (i === 0) {
          doc.font(fontName ? font : 'Helvetica-Bold');
        } else {
          doc.font(font);
        }
        doc.text(row[0], tableLeft, y, { width: colWidth, height: rowHeight });
        doc.text(row[1], tableLeft + colWidth, y, { width: colWidth, height: rowHeight });
      });

      // Draw separator lines
      doc.moveTo(tableLeft, tableTop);
      doc.lineTo(tableLeft + colWidth * 2, tableTop);
      doc.stroke();
      doc.moveTo(tableLeft, tableTop + rowHeight);
      doc.lineTo(tableLeft + colWidth * 2, tableTop + rowHeight);
      doc.stroke();
      for (let i = 2; i < tableRows.length; i++) {
        const y = tableTop + i * rowHeight;
        doc.moveTo(tableLeft, y);
        doc.lineTo(tableLeft + colWidth * 2, y);
        doc.stroke();
      }

      doc.moveDown(2);
    }

    // ==================== Verification Details ====================
    if (includeDetail) {
      doc.addPage();
      doc.fontSize(16);
      doc.font(font);
      doc.text(isCJK ? '核验明细' : 'Verification Details', { underline: true });
      doc.moveDown(1);

      let participants = this.participants;
      if (includeExceptionOnly) {
        participants = participants.filter(
          (p) => p.verify_status === 'failed' || p.verify_status === 'pending'
        );
      }

      const colWidths = [140, 80, 65, 120, 110];
      const headers = isCJK
        ? ['足环号', '鸽主', '核验状态', '核验原因', '核验时间']
        : ['Ring Number', 'Owner', 'Status', 'Reason', 'Verified At'];

      const drawHeader = () => {
        doc.font(fontName ? font : 'Helvetica-Bold');
        doc.fontSize(9);
        let x = 50;
        for (let i = 0; i < headers.length; i++) {
          doc.text(headers[i], x, doc.y, { width: colWidths[i] });
          x += colWidths[i];
        }
        doc.moveDown(0.6);
        doc.font(font);
      };

      drawHeader();

      doc.fontSize(9);
      for (const p of participants) {
        const rowY = doc.y;
        if (rowY > 750) {
          doc.addPage();
          drawHeader();
        }

        const values = [
          p.ring_number,
          p.owner_name || '-',
          this.getStatusLabel(p.verify_status),
          p.verify_reason || '-',
          this.formatTimestamp(p.verified_at),
        ];
        let x = 50;
        for (let i = 0; i < values.length; i++) {
          doc.text(String(values[i]), x, doc.y, { width: colWidths[i] });
          x += colWidths[i];
        }
        doc.moveDown(0.4);
      }

      if (participants.length === 0) {
        doc.fontSize(11);
        doc.text(isCJK ? '暂无核验明细数据' : 'No verification detail data');
      }
    }

    doc.end();

    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  async generateExcel(
    options?: { includeDetail?: boolean; includeSummary?: boolean; includeExceptionOnly?: boolean }
  ): Promise<Buffer> {
    const { includeDetail = true, includeSummary = true, includeExceptionOnly = false } = options || {};

    const workbook = new ExcelJS.Workbook();

    if (includeSummary) {
      const summarySheet = workbook.addWorksheet('统计摘要');

      summarySheet.mergeCells('A1:D1');
      const titleCell = summarySheet.getCell('A1');
      titleCell.value = '赛鸽核验报告 - 统计摘要';
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: 'center' };
      summarySheet.getRow(1).height = 30;

      summarySheet.getCell('A3').value = '报告编号';
      summarySheet.getCell('B3').value = this.reportId;

      summarySheet.getCell('A4').value = '生成时间';
      summarySheet.getCell('B4').value = new Date().toLocaleString('zh-CN', { hour12: false });

      let row = 6;
      summarySheet.getCell(`A${row}`).value = '赛事信息';
      summarySheet.getCell(`A${row}`).font = { bold: true, size: 13 };
      row++;

      for (const comp of this.competitions) {
        summarySheet.getCell(`A${row}`).value = '赛事名称';
        summarySheet.getCell(`B${row}`).value = comp.name;
        row++;
        summarySheet.getCell(`A${row}`).value = '赛事类型';
        summarySheet.getCell(`B${row}`).value = comp.type || '-';
        row++;
        summarySheet.getCell(`A${row}`).value = '状态';
        summarySheet.getCell(`B${row}`).value = this.getCompetitionStatusLabel(comp.status);
        row++;
        summarySheet.getCell(`A${row}`).value = '开始时间';
        summarySheet.getCell(`B${row}`).value = this.formatDateTime(comp.start_time);
        row++;
        summarySheet.getCell(`A${row}`).value = '结束时间';
        summarySheet.getCell(`B${row}`).value = this.formatDateTime(comp.end_time);
        row++;
        summarySheet.getCell(`A${row}`).value = '地点';
        summarySheet.getCell(`B${row}`).value = comp.location || '-';
        row++;
        summarySheet.getCell(`A${row}`).value = '空距';
        summarySheet.getCell(`B${row}`).value = comp.distance ? `${comp.distance} km` : '-';
        row++;
        summarySheet.getCell(`A${row}`).value = '主办方';
        summarySheet.getCell(`B${row}`).value = comp.organizer || '-';
        row++;
        summarySheet.getCell(`A${row}`).value = '联系电话';
        summarySheet.getCell(`B${row}`).value = comp.contact_phone || '-';
        row++;
        row++;
      }

      summarySheet.getCell(`A${row}`).value = '核验统计';
      summarySheet.getCell(`A${row}`).font = { bold: true, size: 13 };
      row++;

      const stats = this.getStatistics();
      summarySheet.getCell(`A${row}`).value = '类别';
      summarySheet.getCell(`B${row}`).value = '数量';
      summarySheet.getCell(`A${row}`).font = { bold: true };
      summarySheet.getCell(`B${row}`).font = { bold: true };
      row++;

      const statRows = [
        ['总参赛鸽', stats.total],
        ['通过', stats.passed],
        ['不通过', stats.failed],
        ['未核验', stats.pending],
      ];
      for (const sr of statRows) {
        summarySheet.getCell(`A${row}`).value = sr[0];
        summarySheet.getCell(`B${row}`).value = sr[1];
        row++;
      }

      summarySheet.getColumn('A').width = 18;
      summarySheet.getColumn('B').width = 30;
      summarySheet.getColumn('C').width = 15;
      summarySheet.getColumn('D').width = 15;
    }

    if (includeDetail) {
      const detailSheet = workbook.addWorksheet('核验明细');

      detailSheet.columns = [
        { header: '足环号', key: 'ring_number', width: 25 },
        { header: '鸽主', key: 'owner_name', width: 15 },
        { header: '核验状态', key: 'verify_status', width: 12 },
        { header: '核验原因', key: 'verify_reason', width: 30 },
        { header: '核验时间', key: 'verified_at', width: 25 },
      ];

      let participants = this.participants;
      if (includeExceptionOnly) {
        participants = participants.filter(
          (p) => p.verify_status === 'failed' || p.verify_status === 'pending'
        );
      }

      for (const p of participants) {
        detailSheet.addRow({
          ring_number: p.ring_number,
          owner_name: p.owner_name || '-',
          verify_status: this.getStatusLabel(p.verify_status),
          verify_reason: p.verify_reason || '-',
          verified_at: this.formatTimestamp(p.verified_at),
        });
      }

      detailSheet.getRow(1).font = { bold: true };
    }

    return workbook.xlsx.writeBuffer().then((buf) => Buffer.from(buf as unknown as ArrayBuffer));
  }

  generateCSV(options?: { includeExceptionOnly?: boolean }): string {
    const { includeExceptionOnly = false } = options || {};

    const headers = ['足环号', '鸽主', '核验状态', '核验原因', '核验时间'];

    let participants = this.participants;
    if (includeExceptionOnly) {
      participants = participants.filter(
        (p) => p.verify_status === 'failed' || p.verify_status === 'pending'
      );
    }

    const rows = participants.map((p) => [
      p.ring_number,
      p.owner_name || '-',
      this.getStatusLabel(p.verify_status),
      p.verify_reason || '-',
      this.formatTimestamp(p.verified_at),
    ]);

    const escapeCSV = (val: string): string => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    };

    const csvLines = [headers, ...rows].map((row) => row.map(escapeCSV).join(','));
    return '\uFEFF' + csvLines.join('\r\n');
  }
}