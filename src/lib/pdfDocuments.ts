import type { Contract, Property, Room, Student } from '../types'

interface ContractDocumentData {
  contract: Contract
  room: Room
  student: Student
  property: Property
}

interface InspectionDocumentItem {
  category: string
  itemName: string
  condition: string
  photoUrl: string | null
}

interface InspectionDocumentData {
  title: string
  type: 'start' | 'end'
  overviewPhotoUrl: string | null
  items: InspectionDocumentItem[]
}

const CONDITION_LABEL: Record<string, string> = {
  good: 'Goed',
  moderate: 'Matig',
  bad: 'Slecht',
  unusable: 'Onbruikbaar',
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function pageShell(title: string, body: string) {
  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { margin: 18mm; }
      body {
        margin: 0;
        color: #0f172a;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.45;
      }
      h1 { margin: 0 0 4px; font-size: 26px; }
      h2 { margin: 28px 0 10px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; }
      p { margin: 0; }
      .muted { color: #64748b; }
      .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
      .brand { font-weight: 800; color: #4f46e5; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
      .row { display: flex; justify-content: space-between; gap: 20px; border-bottom: 1px solid #e2e8f0; padding: 8px 0; }
      .label { color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
      .value { font-weight: 700; text-align: right; }
      .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-top: 10px; break-inside: avoid; }
      .photo { width: 100%; max-height: 260px; object-fit: cover; border-radius: 10px; margin-top: 10px; border: 1px solid #e2e8f0; }
      .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 48px; }
      .line { border-top: 1px solid #94a3b8; padding-top: 8px; color: #64748b; font-size: 12px; }
      @media print { button { display: none; } }
    </style>
  </head>
  <body>${body}</body>
</html>`
}

function openPrintableDocument(title: string, html: string) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.open()
  printWindow.document.write(pageShell(title, html))
  printWindow.document.close()
  printWindow.focus()
  window.setTimeout(() => printWindow.print(), 250)
}

export function printContractDocument({ contract, room, student, property }: ContractDocumentData) {
  openPrintableDocument(
    `Contract ${student.firstName} ${student.lastName}`,
    `
    <main>
      <section class="header">
        <div>
          <p class="brand">KotStart</p>
          <h1>Huurovereenkomst studentenkamer</h1>
          <p class="muted">Schooljaar ${escapeHtml(contract.schoolYear)}</p>
        </div>
        <div>
          <p class="label">Status</p>
          <p class="value">${escapeHtml(contract.status)}</p>
        </div>
      </section>

      <h2>Student</h2>
      <div class="grid">
        <div class="row"><span class="label">Naam</span><span class="value">${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</span></div>
        <div class="row"><span class="label">E-mail</span><span class="value">${escapeHtml(student.email)}</span></div>
        <div class="row"><span class="label">Telefoon</span><span class="value">${escapeHtml(student.phone)}</span></div>
        <div class="row"><span class="label">Geboortedatum</span><span class="value">${escapeHtml(student.dateOfBirth)}</span></div>
      </div>

      <h2>Kamer</h2>
      <div class="grid">
        <div class="row"><span class="label">Pand</span><span class="value">${escapeHtml(property.name)}</span></div>
        <div class="row"><span class="label">Adres</span><span class="value">${escapeHtml(property.address)}</span></div>
        <div class="row"><span class="label">Kamer</span><span class="value">${escapeHtml(room.roomNumber)}</span></div>
        <div class="row"><span class="label">Type</span><span class="value">${escapeHtml(room.roomType)}</span></div>
      </div>

      <h2>Financieel</h2>
      <div class="grid">
        <div class="row"><span class="label">Huurprijs</span><span class="value">€ ${room.monthlyRent}/maand</span></div>
        <div class="row"><span class="label">Vaste kosten</span><span class="value">€ ${room.fixedCosts}/maand</span></div>
        <div class="row"><span class="label">Studentenbelasting</span><span class="value">€ ${room.studentTax}/maand</span></div>
        <div class="row"><span class="label">Waarborg</span><span class="value">€ ${room.deposit}</span></div>
      </div>

      <div class="signature">
        <div class="line">Handtekening verhuurder</div>
        <div class="line">Handtekening student</div>
      </div>
    </main>`,
  )
}

export function printInspectionDocument({ title, type, overviewPhotoUrl, items }: InspectionDocumentData) {
  const grouped = items.reduce<Record<string, InspectionDocumentItem[]>>((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item]
    return acc
  }, {})

  openPrintableDocument(
    title,
    `
    <main>
      <section class="header">
        <div>
          <p class="brand">KotStart</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="muted">${type === 'start' ? 'Startplaatsbeschrijving' : 'Eindplaatsbeschrijving'}</p>
        </div>
        <div>
          <p class="label">Datum</p>
          <p class="value">${new Date().toLocaleDateString('nl-BE')}</p>
        </div>
      </section>

      ${overviewPhotoUrl ? `<h2>Overzichtsfoto</h2><img class="photo" src="${overviewPhotoUrl}" alt="Overzichtsfoto" />` : ''}

      ${Object.entries(grouped)
        .map(([category, categoryItems]) => `
          <h2>${escapeHtml(category)}</h2>
          ${categoryItems
            .map(item => `
              <div class="card">
                <div class="row"><span class="label">${escapeHtml(item.itemName)}</span><span class="value">${escapeHtml(CONDITION_LABEL[item.condition] ?? item.condition)}</span></div>
                ${item.photoUrl ? `<img class="photo" src="${item.photoUrl}" alt="${escapeHtml(item.itemName)}" />` : ''}
              </div>
            `)
            .join('')}
        `)
        .join('')}

      <div class="signature">
        <div class="line">Handtekening verhuurder</div>
        <div class="line">Handtekening huurder</div>
      </div>
    </main>`,
  )
}
