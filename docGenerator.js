const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign, LevelFormat, UnderlineType, Header, Footer, PageNumber, NumberFormat } = require('docx');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

function formatRupiah(angka) {
  if (!angka && angka !== 0) return '';
  return new Intl.NumberFormat('id-ID').format(angka);
}
function getNamaBulan(date) {
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'];
  return bulan[date.getMonth()];
}
function getTanggalIndo(dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  return `${date.getDate()} ${getNamaBulan(date)} ${date.getFullYear()}`;
}
async function generateQR(text) {
  if (!text || !text.trim()) return null;
  try {
    return await QRCode.toBuffer(text.trim(), { type: 'png', width: 80, margin: 1, errorCorrectionLevel: 'M' });
  } catch (e) { return null; }
}

const BLUE       = '1F4E79';
const LIGHT_BLUE = 'D6E4F7';
const WHITE      = 'FFFFFF';
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' };
const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

async function generateDoc(submission, settings) {
  const { nomor, client_title, client_name, client_address, client_city,
          items, ppn_included, ongkir_included, notes, lampiran, created_at } = submission;

  const companyName      = settings.company_name      || 'PT. Lapan Alpha Kirana';
  const companyTagline   = settings.company_tagline   || 'Perdagangan Alat Kesehatan';
  const companyAddress   = settings.company_address   || 'Jakarta';
  const companyHeadoffice= settings.company_headoffice|| '';
  const companyWarehouse = settings.company_warehouse || '';
  const signerName       = settings.signer_name       || 'Aris Hamdanny';
  const signerTitle      = settings.signer_title      || 'General Manager';
  const tanggal          = getTanggalIndo(created_at);

  let logoBuffer = null;
  const logoPath = path.join(__dirname, 'public', 'img', 'logo.png');
  if (fs.existsSync(logoPath)) logoBuffer = fs.readFileSync(logoPath);

  let ttdBuffer = null;
  const ttdPath = path.join(__dirname, 'public', 'img', 'ttd.png');
  if (fs.existsSync(ttdPath)) ttdBuffer = fs.readFileSync(ttdPath);

  const qrBuffers = await Promise.all(
    items.map(item => item.link ? generateQR(item.link) : Promise.resolve(null))
  );
  const grandTotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.harga_satuan) || 0), 0
  );

  // ── Helpers ─────────────────────────────────────────────────
  function normalPara(text, opts = {}) {
    return new Paragraph({
      spacing: { after: 0, line: 276, lineRule: 'auto' },
      alignment: opts.align || AlignmentType.LEFT,
      children: [new TextRun({
        font: 'Times New Roman', size: opts.size || 24, text,
        bold: opts.bold || false,
        underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
      })]
    });
  }
  function emptyPara(halfLine = false) {
    return new Paragraph({ spacing: { after: 0, line: halfLine ? 120 : 240 }, children: [] });
  }

  // ════════════════════════════════════════════════════════════
  // HEADER — logo kanan + garis pemisah (muncul di setiap halaman)
  // ════════════════════════════════════════════════════════════
  const headerChildren = [];
  if (logoBuffer) {
    headerChildren.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 0 },
      children: [new ImageRun({
        type: 'png', data: logoBuffer,
        transformation: { width: 150, height: 112 },
        altText: { title: 'Logo', description: 'Logo Perusahaan', name: 'Logo' }
      })]
    }));
  } else {
    headerChildren.push(new Paragraph({ children: [] }));
  }
  headerChildren.push(new Paragraph({
    spacing: { before: 80, after: 120 },
    border: {
      bottom: { style: BorderStyle.THICK, size: 28, color: BLUE, space: 3 },
      top:    { style: BorderStyle.SINGLE, size: 4,  color: BLUE, space: 3 },
    },
    children: []
  }));

  // ════════════════════════════════════════════════════════════
  // FOOTER — nama PT + head office + warehouse (muncul di setiap halaman)
  // ════════════════════════════════════════════════════════════
  const footerChildren = [];
  footerChildren.push(new Paragraph({
    spacing: { before: 60, after: 40 },
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
    children: [new TextRun({
      text: companyName.toUpperCase(),
      font: 'Arial', size: 16, bold: true, color: BLUE
    })]
  }));
  if (companyHeadoffice) {
    footerChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [new TextRun({ text: `Head Office : ${companyHeadoffice}`, font: 'Arial', size: 14, color: '444444' })]
    }));
  }
  if (companyWarehouse) {
    footerChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [new TextRun({ text: `Warehouse : ${companyWarehouse}`, font: 'Arial', size: 14, color: '444444' })]
    }));
  }

  // ════════════════════════════════════════════════════════════
  // TABEL PRODUK
  // ════════════════════════════════════════════════════════════
  const colWidths = [400, 2250, 1300, 1450, 460, 620, 1150, 1280, 728];

  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: ['No','Nama Produk','Merek','Spesifikasi','Qty','Satuan','Harga Satuan','Total','Info']
      .map((label, i) => new TableCell({
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: BLUE, type: ShadingType.CLEAR },
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 4, color: BLUE },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: '2C6FAD' },
          left:   { style: BorderStyle.SINGLE, size: 4, color: BLUE },
          right:  { style: BorderStyle.SINGLE, size: 4, color: '2C6FAD' },
        },
        margins: { top: 70, bottom: 70, left: 90, right: 90 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: label, font: 'Arial', size: 20, bold: true, color: WHITE })]
        })]
      }))
  });

  const dataRows = await Promise.all(items.map(async (item, idx) => {
    const qty   = parseFloat(item.qty) || 0;
    const harga = parseFloat(item.harga_satuan) || 0;
    const bg    = idx % 2 === 0 ? 'FFFFFF' : 'EEF4FB';
    const shading = { fill: bg, type: ShadingType.CLEAR };
    function cell(text, align = AlignmentType.LEFT, bold = false, colIdx = 0) {
      return new TableCell({
        width: { size: colWidths[colIdx], type: WidthType.DXA },
        shading, borders: allBorders,
        margins: { top: 50, bottom: 50, left: 90, right: 90 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: align,
          children: [new TextRun({ text: String(text || ''), font: 'Times New Roman', size: 21, bold })]
        })]
      });
    }
    return new TableRow({ children: [
      cell(idx + 1, AlignmentType.CENTER, false, 0),
      cell(item.nama_produk || '', AlignmentType.LEFT, true, 1),
      cell(item.merek || '', AlignmentType.LEFT, false, 2),
      cell(item.spesifikasi || '', AlignmentType.LEFT, false, 3),
      cell(item.qty || '', AlignmentType.CENTER, false, 4),
      cell(item.satuan || '', AlignmentType.CENTER, false, 5),
      cell('Rp '+formatRupiah(harga), AlignmentType.RIGHT, false, 6),
      cell('Rp '+formatRupiah(qty*harga), AlignmentType.RIGHT, true, 7),
      new TableCell({
        width: { size: colWidths[8], type: WidthType.DXA },
        shading, borders: allBorders,
        margins: { top: 30, bottom: 30, left: 40, right: 40 },
        verticalAlign: VerticalAlign.CENTER,
        children: qrBuffers[idx] ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({
              type: 'png', data: qrBuffers[idx],
              transformation: { width: 55, height: 55 },
              altText: { title: 'QR', description: item.link || '', name: 'QR' }
            })]
          })
        ] : [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '-', font: 'Times New Roman', size: 20, color: 'AAAAAA' })]
        })]
      }),
    ]});
  }));

  const spanWidth = colWidths.slice(0, 7).reduce((a, b) => a + b, 0);
  const totalRow = new TableRow({ children: [
    new TableCell({
      columnSpan: 7, width: { size: spanWidth, type: WidthType.DXA },
      shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR },
      borders: allBorders,
      margins: { top: 80, bottom: 80, left: 90, right: 90 },
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'G R A N D  T O T A L', font: 'Arial', size: 22, bold: true, color: BLUE })]
      })]
    }),
    new TableCell({
      width: { size: colWidths[7], type: WidthType.DXA },
      shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR },
      borders: allBorders,
      margins: { top: 80, bottom: 80, left: 90, right: 90 },
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'Rp '+formatRupiah(grandTotal), font: 'Arial', size: 22, bold: true, color: BLUE })]
      })]
    }),
    new TableCell({
      width: { size: colWidths[8], type: WidthType.DXA },
      shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR },
      borders: allBorders,
      children: [new Paragraph({ children: [] })]
    }),
  ]});

  const produkTable = new Table({
    width: { size: 9638, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [tableHeaderRow, ...dataRows, totalRow]
  });

  // ── Kondisi penawaran ──────────────────────────────────────
  const kondisiItems = [
    new Paragraph({
      spacing: { after: 0, line: 240 },
      numbering: { reference: 'bullets', level: 0 },
      children: [
        new TextRun({ text: 'Harga ', font: 'Times New Roman', size: 24 }),
        new TextRun({ text: ppn_included ? 'sudah' : 'belum', font: 'Times New Roman', size: 24, bold: true }),
        new TextRun({ text: ' termasuk PPN', font: 'Times New Roman', size: 24 }),
      ]
    }),
    new Paragraph({
      spacing: { after: 0, line: 240 },
      numbering: { reference: 'bullets', level: 0 },
      children: [
        new TextRun({ text: 'Harga ', font: 'Times New Roman', size: 24 }),
        new TextRun({ text: ongkir_included ? 'sudah' : 'belum', font: 'Times New Roman', size: 24, bold: true }),
        new TextRun({ text: ' termasuk ongkos kirim', font: 'Times New Roman', size: 24 }),
      ]
    }),
    ...(notes && notes.trim() ? [new Paragraph({
      spacing: { after: 0, line: 240 },
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun({ text: notes.trim(), font: 'Times New Roman', size: 24 })]
    })] : []),
  ];

  // ════════════════════════════════════════════════════════════
  // ISI DOKUMEN (body) — tanpa logo & tanpa footer statis
  // ════════════════════════════════════════════════════════════
  const docChildren = [
    // 1. Info surat
    new Paragraph({
      spacing: { after: 0, line: 276 },
      tabStops: [{ type: 'left', position: 1440 }, { type: 'left', position: 1700 }],
      children: [
        new TextRun({ text: 'Nomor',   font: 'Times New Roman', size: 24 }),
        new TextRun({ text: '\t\t', font: 'Times New Roman', size: 24 }),
        new TextRun({ text: ': ' + (nomor || '___/___/___/____'), font: 'Times New Roman', size: 24 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 0, line: 276 },
      tabStops: [{ type: 'left', position: 1440 }, { type: 'left', position: 1700 }],
      children: [
        new TextRun({ text: 'Perihal', font: 'Times New Roman', size: 24 }),
        new TextRun({ text: '\t\t', font: 'Times New Roman', size: 24 }),
        new TextRun({ text: ': Penawaran Harga', font: 'Times New Roman', size: 24 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 0, line: 276 },
      tabStops: [{ type: 'left', position: 1440 }, { type: 'left', position: 1700 }],
      children: [
        new TextRun({ text: 'Lampiran', font: 'Times New Roman', size: 24 }),
        new TextRun({ text: '\t',     font: 'Times New Roman', size: 24 }),
        new TextRun({ text: ': ' + (lampiran || '-'), font: 'Times New Roman', size: 24 }),
      ],
    }),
    emptyPara(),

    // 2. Kepada
    normalPara('Kepada Yth.'),
    ...(client_title ? [normalPara(client_title)] : []),
    normalPara(client_name),
    normalPara(client_address),
    normalPara(client_city || 'di Tempat'),
    emptyPara(),

    // 3. Pembukaan
    new Paragraph({
      spacing: { after: 0, line: 276 },
      children: [new TextRun({ text: 'Dengan hormat,', font: 'Times New Roman', size: 24, italics: true })]
    }),
    new Paragraph({
      spacing: { after: 0, line: 276 },
      children: [new TextRun({
        text: `Bersama ini kami ${companyName} yang bergerak dibidang ${companyTagline.toLowerCase()} bermaksud mengajukan penawaran produk sebagai berikut :`,
        font: 'Times New Roman', size: 24
      })]
    }),
    emptyPara(),

    // 4. Tabel produk
    produkTable,
    emptyPara(),

    // 5. Kondisi penawaran
    normalPara('Dengan kondisi penawaran :'),
    ...kondisiItems,
    emptyPara(),

    // 6. Penutup — hanya 1 spasi agar dekat dengan TTD
    normalPara('Demikian surat penawaran ini kami sampaikan. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.'),
    emptyPara(),

    // 7. Tanda tangan
    normalPara(`${companyAddress}, ${tanggal}`),
    normalPara('Hormat Kami,'),
    normalPara(companyName),
    emptyPara(),
  ];

  // Gambar TTD atau spasi kosong
  if (ttdBuffer) {
    docChildren.push(new Paragraph({
      spacing: { after: 0 },
      children: [new ImageRun({
        type: 'png', data: ttdBuffer,
        transformation: { width: 160, height: 80 },
        altText: { title: 'TTD', description: 'Tanda Tangan', name: 'TTD' }
      })]
    }));
  } else {
    docChildren.push(emptyPara(), emptyPara(), emptyPara());
  }

  docChildren.push(
    new Paragraph({
      spacing: { after: 0, line: 276 },
      children: [new TextRun({
        text: signerName, font: 'Times New Roman', size: 24,
        underline: { type: UnderlineType.SINGLE }
      })]
    }),
    normalPara(signerTitle),
  );

  // ════════════════════════════════════════════════════════════
  // BUAT DOKUMEN dengan Header & Footer Word
  // ════════════════════════════════════════════════════════════
  const doc = new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1800, right: 1134, bottom: 1700, left: 1134 } // ruang untuk header & footer
        }
      },
      headers: {
        default: new Header({ children: headerChildren }),
      },
      footers: {
        default: new Footer({ children: footerChildren }),
      },
      children: docChildren
    }]
  });

  return await Packer.toBuffer(doc);
}

module.exports = { generateDoc };
