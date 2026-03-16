const fs   = require('fs');
const path = require('path');

function formatRupiah(angka) {
  if (!angka && angka !== 0) return '0';
  return new Intl.NumberFormat('id-ID').format(angka);
}
function getNamaBulan(date) {
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'];
  return bulan[date.getMonth()];
}
function getTanggalIndo(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return `${d.getDate()} ${getNamaBulan(d)} ${d.getFullYear()}`;
}
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function toBase64(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
}

function generateHTML(submission, settings) {
  const { nomor, client_title, client_name, client_address, client_city,
          items, ppn_included, ongkir_included, notes, lampiran, created_at } = submission;

  const companyName       = settings.company_name       || 'PT. Lapan Alpha Kirana';
  const companyTagline    = settings.company_tagline    || 'Perdagangan Alat Kesehatan';
  const companyAddress    = settings.company_address    || 'Jakarta';
  const companyHeadoffice = settings.company_headoffice || '';
  const companyWarehouse  = settings.company_warehouse  || '';
  const signerName        = settings.signer_name        || 'Aris Hamdanny';
  const signerTitle       = settings.signer_title       || 'General Manager';
  const tanggal           = getTanggalIndo(created_at);

  const logoDataUrl = toBase64(path.join(__dirname, 'public', 'img', 'logo.png'));
  const ttdDataUrl  = toBase64(path.join(__dirname, 'public', 'img', 'ttd.png'));

  const grandTotal = items.reduce(
    (s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.harga_satuan) || 0), 0
  );

  const itemRows = items.map((item, idx) => {
    const qty   = parseFloat(item.qty)         || 0;
    const harga = parseFloat(item.harga_satuan) || 0;
    const bg    = idx % 2 === 0 ? '#ffffff' : '#eef4fb';
    return `<tr style="background:${bg}">
      <td style="text-align:center">${idx + 1}</td>
      <td><strong>${esc(item.nama_produk)}</strong></td>
      <td>${esc(item.merek || '')}</td>
      <td>${esc(item.spesifikasi || '')}</td>
      <td style="text-align:center">${esc(String(item.qty || ''))}</td>
      <td style="text-align:center">${esc(item.satuan || '')}</td>
      <td style="text-align:right">Rp ${formatRupiah(harga)}</td>
      <td style="text-align:right"><strong>Rp ${formatRupiah(qty * harga)}</strong></td>
    </tr>`;
  }).join('');

  const kondisi = [
    `Harga <strong>${ppn_included ? 'sudah' : 'belum'}</strong> termasuk PPN`,
    `Harga <strong>${ongkir_included ? 'sudah' : 'belum'}</strong> termasuk ongkos kirim`,
    ...(notes && notes.trim() ? [esc(notes.trim())] : []),
  ];

  const hasFooter = companyHeadoffice || companyWarehouse;

  // Tinggi footer: ~42px tanpa alamat, ~56px dengan 1 alamat, ~70px dengan 2 alamat
  const footerLines = 1 + (companyHeadoffice ? 1 : 0) + (companyWarehouse ? 1 : 0);
  const footerHeight = 14 + footerLines * 16; // px estimasi untuk margin-bottom body

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11.5pt;
      color: #111;
      background: #fff;
      /* beri ruang di atas untuk header fixed & di bawah untuk footer fixed */
      padding-top: 148px;
      padding-bottom: ${footerHeight + 20}px;
    }

    @page {
      size: A4;
      margin: 20mm;
    }

    /* ── Header fixed — muncul di setiap halaman ── */
    .page-header {
      position: fixed;
      top: -14mm;          /* tepat di area margin atas @page */
      left: 0;
      right: 0;
      height: 148px;
    }
    .page-header .logo-wrap {
      text-align: right;
    }
    .page-header .logo-wrap img {
      max-width: 150px;
      max-height: 112px;
      object-fit: contain;
    }
    .page-header .divider {
      border: none;
      border-top: 4px solid #1F4E79;
      border-bottom: 1px solid #1F4E79;
      margin: 6px 0 0;
      height: 4px;
    }

    /* ── Footer fixed — muncul di setiap halaman ── */
    .page-footer {
      position: fixed;
      bottom: -14mm;       /* tepat di area margin bawah @page */
      left: 0;
      right: 0;
    }
    .page-footer .footer-inner {
      border-top: 2px solid #1F4E79;
      padding-top: 5px;
      text-align: center;
      font-family: Arial, sans-serif;
      font-size: 8pt;
      color: #555;
      line-height: 1.6;
    }
    .page-footer .ft-name {
      font-weight: bold;
      color: #1F4E79;
      font-size: 8.5pt;
    }

    /* ── Info surat ── */
    .info-table { border-collapse: collapse; margin-bottom: 12px; }
    .info-table td { padding: 1px 0; font-size: 11.5pt; }
    .info-table .lbl { width: 88px; }
    .info-table .sep { width: 12px; }

    /* ── Kepada ── */
    .kepada { line-height: 1.65; margin-bottom: 12px; }

    /* ── Pembuka ── */
    .pembuka { line-height: 1.75; margin-bottom: 12px; text-align: justify; }

    /* ── Tabel produk ── */
    .tbl { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9.5pt; }
    .tbl th {
      background: #1F4E79; color: #fff;
      font-family: Arial, sans-serif; font-size: 8.5pt; font-weight: bold;
      padding: 6px 7px; text-align: center; border: 1px solid #1F4E79;
    }
    .tbl td { border: 1px solid #bbb; padding: 4px 7px; vertical-align: middle; }
    .tbl tfoot td {
      background: #d6e4f7;
      font-family: Arial, sans-serif; font-size: 9.5pt; font-weight: bold; color: #1F4E79;
      border: 1px solid #bbb; padding: 6px 7px;
    }

    /* ── Kondisi ── */
    .kondisi { margin-bottom: 10px; }
    .kondisi ul { padding-left: 18px; line-height: 1.8; }

    /* ── Penutup ── */
    .penutup { line-height: 1.75; text-align: justify; margin-bottom: 10px; }

    /* ── Tanda tangan ── */
    .ttd-section { line-height: 1.65; }
    .ttd-img { display: block; max-height: 78px; max-width: 155px; margin: 4px 0; }
    .signer-name { text-decoration: underline; }
  </style>
</head>
<body>

  <!-- ════ HEADER FIXED — logo + garis, tampil di setiap halaman ════ -->
  <div class="page-header">
    <div class="logo-wrap">
      ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo">` : ''}
    </div>
    <hr class="divider">
  </div>

  ${hasFooter ? `
  <!-- ════ FOOTER FIXED — nama PT + alamat, tampil di setiap halaman ════ -->
  <div class="page-footer">
    <div class="footer-inner">
      <span class="ft-name">${esc(companyName.toUpperCase())}</span>
      ${companyHeadoffice ? `<br>Head Office : ${esc(companyHeadoffice)}` : ''}
      ${companyWarehouse  ? `<br>Warehouse : ${esc(companyWarehouse)}`   : ''}
    </div>
  </div>` : ''}

  <!-- ════ INFO SURAT ════ -->
  <table class="info-table">
    <tr><td class="lbl">Nomor</td>   <td class="sep">:</td><td>${esc(nomor || '___/___/___/____')}</td></tr>
    <tr><td class="lbl">Perihal</td> <td class="sep">:</td><td>Penawaran Harga</td></tr>
    <tr><td class="lbl">Lampiran</td><td class="sep">:</td><td>${esc(lampiran || '-')}</td></tr>
  </table>

  <!-- ════ KEPADA ════ -->
  <div class="kepada">
    <div>Kepada Yth.</div>
    ${client_title ? `<div>${esc(client_title)}</div>` : ''}
    <div>${esc(client_name)}</div>
    <div>${esc(client_address)}</div>
    <div>${esc(client_city || 'di Tempat')}</div>
  </div>

  <!-- ════ PEMBUKA ════ -->
  <div class="pembuka">
    <div style="margin-bottom:7px"><em>Dengan hormat,</em></div>
    <div>Bersama ini kami ${esc(companyName)} yang bergerak dibidang ${esc(companyTagline.toLowerCase())} bermaksud mengajukan penawaran produk sebagai berikut :</div>
  </div>

  <!-- ════ TABEL PRODUK ════ -->
  <table class="tbl">
    <thead>
      <tr>
        <th>No</th><th>Nama Produk</th><th>Merek</th><th>Spesifikasi</th>
        <th>Qty</th><th>Satuan</th><th>Harga Satuan</th><th>Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="7" style="text-align:right">GRAND TOTAL</td>
        <td style="text-align:right">Rp ${formatRupiah(grandTotal)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- ════ KONDISI ════ -->
  <div class="kondisi">
    <div>Dengan kondisi penawaran :</div>
    <ul>${kondisi.map(k => `<li>${k}</li>`).join('')}</ul>
  </div>

  <!-- ════ PENUTUP ════ -->
  <div class="penutup">
    Demikian surat penawaran ini kami sampaikan. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.
  </div>

  <!-- ════ TANDA TANGAN ════ -->
  <div class="ttd-section">
    <div>${esc(companyAddress)}, ${tanggal}</div>
    <div>Hormat Kami,</div>
    <div>${esc(companyName)}</div>
    <br>
    ${ttdDataUrl ? `<img src="${ttdDataUrl}" class="ttd-img" alt="TTD">` : '<br><br><br>'}
    <div class="signer-name">${esc(signerName)}</div>
    <div>${esc(signerTitle)}</div>
  </div>

</body>
</html>`;
}

module.exports = { generateHTML };
