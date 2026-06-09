const MONTH_NAMES = ['','January','February','March','April','May','June',
  'July','August','September','October','November','December'];

export function generateEOMCertificate(nom: any, cycle: any) {
  const name        = nom.employee_name        || '';
  const designation = nom.employee_designation || '';
  const department  = nom.employee_department  || '';
  const location    = nom.employee_zone        || '';
  const monthYear   = cycle ? `${MONTH_NAMES[cycle.month]} ${cycle.year}` : nom.cycle_name || '';
  const today       = new Date();
  const dateStr     = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const win = window.open('', '_blank', 'width=1100,height=820');
  if (!win) { alert('Please allow pop-ups to generate the certificate.'); return; }

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>EOM Certificate — ${name}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    @media print {
      html, body { width: 297mm; height: 210mm; }
      .no-print { display: none !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #f0ede0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: Georgia, 'Times New Roman', serif;
    }

    .print-btn {
      margin-bottom: 14px;
      padding: 10px 28px;
      background: #1e3163;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      letter-spacing: 0.5px;
    }
    .print-btn:hover { background: #152548; }

    .cert-wrap {
      width: 270mm;
      min-height: 185mm;
      border: 10px solid #c49a28;
      padding: 8px;
      background: #faf7ed;
    }

    .cert-inner {
      border: 2px solid #c49a28;
      padding: 24px 52px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      text-align: center;
      min-height: calc(185mm - 36px);
    }

    .company-name {
      font-size: 32px;
      font-weight: bold;
      color: #1e3163;
      letter-spacing: 10px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .cert-subtitle {
      font-size: 21px;
      color: #c49a28;
      font-style: italic;
    }

    .presented-to {
      font-size: 13px;
      color: #555;
      margin-bottom: 6px;
    }

    .emp-name {
      font-size: 42px;
      font-weight: bold;
      color: #1e3163;
      text-decoration: underline;
      line-height: 1.15;
      margin-bottom: 6px;
    }

    .emp-details {
      font-size: 13.5px;
      color: #555;
    }
    .emp-details span { text-decoration: underline; }

    .in-recognition {
      font-size: 13px;
      color: #444;
    }

    .award-title {
      font-size: 27px;
      font-weight: bold;
      color: #1e3163;
      margin-bottom: 4px;
    }

    .award-month {
      font-size: 19px;
      font-weight: bold;
      color: #1e3163;
    }

    .cert-quote {
      font-size: 12.5px;
      color: #555;
      line-height: 1.65;
      max-width: 540px;
    }

    .sig-section { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .sig-line { width: 200px; border-bottom: 1px solid #666; height: 28px; }
    .sig-label { font-size: 12.5px; color: #555; }
    .sig-date  { font-size: 12.5px; color: #555; margin-top: 4px; }
  </style>
</head>
<body>

  <button class="no-print print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>

  <div class="cert-wrap">
    <div class="cert-inner">

      <div>
        <div class="company-name">A P I S &nbsp; I N D I A &nbsp; L I M I T E D</div>
        <div class="cert-subtitle">Certificate of Recognition</div>
      </div>

      <div>
        <div class="presented-to">This certificate is proudly presented to</div>
        <div class="emp-name">${name}</div>
        <div class="emp-details">
          <span>${designation}</span> &nbsp;&nbsp;|&nbsp;&nbsp;
          <span>${department}</span> &nbsp;&nbsp;|&nbsp;&nbsp;
          <span>${location}</span>
        </div>
      </div>

      <div class="in-recognition">
        in recognition of outstanding achievement and exemplary contribution as the
      </div>

      <div>
        <div class="award-title">&#9733; &nbsp; Employee of the Month &nbsp; &#9733;</div>
        <div class="award-month">for the month of ${monthYear}</div>
      </div>

      <div class="cert-quote">
        Your initiative, measurable impact and entrepreneurial spirit exemplify<br>
        the APIS commitment to growth, excellence and sustainable value creation.
      </div>

      <div class="sig-section">
        <div class="sig-line"></div>
        <div class="sig-label">[ HR Head Name &amp; Signature ]</div>
        <div class="sig-date">Date: ${dateStr}</div>
      </div>

    </div>
  </div>

</body>
</html>`);
  win.document.close();
}
