import type { Inspection, InspectionItem, LandlordProfile, Property, Room, Student, Contract } from '../types'
import { formatResidence } from './residence'

export interface ContractBundle {
  contract: Contract
  room: Room
  property: Property
  student: Student
  secondStudent?: Student
  inspection?: Inspection
  inspectionItems?: InspectionItem[]
  landlord?: LandlordProfile
  signatureDataUrl?: string
  landlordSignatureDataUrl?: string
  studentSignatureDataUrl?: string
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

const ROOM_TYPE_LABEL: Record<Room['roomType'], string> = {
  studio: 'Studio',
  single: 'Enkelpersoonskamer',
  double: 'Tweepersoonskamer',
}

const MOCK_LANDLORD: LandlordProfile = {
  name: '',
  dateOfBirth: '',
  address: '',
  phone: '',
  email: '',
  iban: '',
  bic: '',
  bank: '',
  insuranceCompany: '',
  policyNumber: '',
  epcLabel: '',
  epcNumber: '',
}

const DEFAULT_INSPECTION_ITEMS: Array<{ category: string; itemName: string }> = [
  { category: 'Keuken', itemName: 'Aanrecht' },
  { category: 'Keuken', itemName: 'Gootsteen & kraan' },
  { category: 'Keuken', itemName: 'Kookplaat' },
  { category: 'Keuken', itemName: 'Koelkast' },
  { category: 'Keuken', itemName: 'Microgolfoven' },
  { category: 'Keuken', itemName: 'Kasten' },
  { category: 'Keuken', itemName: 'Vloer' },
  { category: 'Badkamer', itemName: 'Wastafel & kraan' },
  { category: 'Badkamer', itemName: 'Douche' },
  { category: 'Badkamer', itemName: 'Toilet & toiletbril' },
  { category: 'Badkamer', itemName: 'Spiegel' },
  { category: 'Badkamer', itemName: 'Vloer' },
  { category: 'Kamer', itemName: 'Vloer' },
  { category: 'Kamer', itemName: 'Muren' },
  { category: 'Kamer', itemName: 'Plafond' },
  { category: 'Kamer', itemName: 'Raam/ramen' },
  { category: 'Kamer', itemName: 'Gordijnen' },
  { category: 'Kamer', itemName: 'Deur' },
  { category: 'Kamer', itemName: 'Kledingkast' },
  { category: 'Kamer', itemName: 'Bureau & stoel' },
  { category: 'Inkom', itemName: 'Vloer' },
  { category: 'Inkom', itemName: 'Muren' },
  { category: 'Inkom', itemName: 'Voordeur' },
  { category: 'Inkom', itemName: 'Brievenbus' },
  { category: 'Inkom', itemName: 'Deurbel' },
  { category: 'Algemeen', itemName: 'Verwarming' },
  { category: 'Algemeen', itemName: 'Elektriciteitsmeter' },
  { category: 'Algemeen', itemName: 'Watermeter' },
  { category: 'Algemeen', itemName: 'Rookmelder' },
  { category: 'Algemeen', itemName: 'Sleutels' },
]

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function schoolYearStartDate(schoolYear: string): string {
  const year = parseInt(schoolYear.split('–')[0].trim(), 10)
  if (isNaN(year)) return `september ${schoolYear}`
  const sep1 = new Date(year, 8, 1)
  const day = sep1.getDay()
  const daysToFirstMonday = day === 1 ? 0 : day === 0 ? 1 : 8 - day
  const thirdMonday = 1 + daysToFirstMonday + 14
  return `${thirdMonday} september ${year}`
}

function schoolYearEndDate(schoolYear: string): string {
  const endYear = parseInt(schoolYear.split('–')[1]?.trim() ?? '', 10)
  return isNaN(endYear) ? '30 juni' : `30 juni ${endYear}`
}

export function generateContractHtml(bundle: ContractBundle): string {
  const {
    contract,
    room,
    property,
    student,
    secondStudent,
    inspection,
    inspectionItems = [],
    signatureDataUrl,
    landlordSignatureDataUrl,
    studentSignatureDataUrl,
  } = bundle
  const landlord = bundle.landlord ?? MOCK_LANDLORD
  const landlordSignature = landlordSignatureDataUrl ?? signatureDataUrl
  const totalMonthly = room.monthlyRent + room.fixedCosts
  const startDate = schoolYearStartDate(contract.schoolYear)
  const endDate = schoolYearEndDate(contract.schoolYear)

  const huurderNaam = secondStudent
    ? `${student.lastName}, ${student.firstName} &amp; ${secondStudent.lastName}, ${secondStudent.firstName}`
    : `${student.lastName}, ${student.firstName}`

  const inspectionLookup = new Map(
    inspectionItems.map(item => [`${item.category}|${item.itemName}`, item]),
  )

  const categories = [...new Set(DEFAULT_INSPECTION_ITEMS.map(i => i.category))]

  const inspectionTableRows = categories
    .map(category => {
      const items = DEFAULT_INSPECTION_ITEMS.filter(i => i.category === category)
      const headerRow = `<tr style="background:#dce6f0;"><td colspan="3" style="padding:6px 10px;font-weight:bold;">${escapeHtml(category)}</td></tr>`
      const itemRows = items
        .map(defaultItem => {
          const found = inspectionLookup.get(`${defaultItem.category}|${defaultItem.itemName}`)
          const conditionLabel = found ? (CONDITION_LABEL[found.condition] ?? '') : ''
          const notes = found?.notes ?? ''
          return `<tr>
            <td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(defaultItem.itemName)}</td>
            <td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${escapeHtml(conditionLabel)}</td>
            <td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;color:#555;">${escapeHtml(notes)}</td>
          </tr>`
        })
        .join('')
      return headerRow + itemRows
    })
    .join('')

  const bijlageTitle = inspection
    ? `Bijlage A — ${inspection.type === 'start' ? 'Beginplaatsbeschrijving' : 'Eindplaatsbeschrijving'}`
    : 'Bijlage A — Plaatsbeschrijving'

  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <title>Huurovereenkomst ${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</title>
  <style>
    @media print { @page { size: A4; margin: 0; } button { display: none; } }
    body { margin: 0; padding: 2cm; font-family: Arial, sans-serif; font-size: 10pt; color: #000; line-height: 1.5; }
    h1 { font-size: 15pt; text-align: center; margin: 0 0 4px; page-break-inside: avoid; break-inside: avoid; }
    h2 { font-size: 11pt; text-align: center; margin: 0 0 6px; page-break-inside: avoid; break-inside: avoid; }
    .subtitle { text-align: center; font-size: 9pt; color: #444; margin-bottom: 20px; }
    .warning { border: 1px solid #000; padding: 10px 14px; font-size: 9pt; margin-bottom: 18px; page-break-inside: avoid; break-inside: avoid; }
    .field-row { display: flex; gap: 8px; margin: 2px 0; font-size: 9.5pt; page-break-inside: avoid; break-inside: avoid; }
    .field-label { min-width: 200px; color: #333; }
    article { margin-bottom: 10px; text-align: justify; page-break-inside: avoid; break-inside: avoid; }
    .art-title { font-weight: bold; }
    .sign-block { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; page-break-inside: avoid; break-inside: avoid; }
    .sign-line { border-top: 1px solid #000; padding-top: 8px; font-size: 9pt; page-break-inside: avoid; break-inside: avoid; }
    .page-break { page-break-before: always; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5pt; }
    th { background: #1e3a5f; color: #fff; padding: 7px 10px; text-align: left; }
    tr { page-break-inside: avoid; break-inside: avoid; }
  </style>
</head>
<body>

<h1>HUUROVEREENKOMST STUDENTENKAMER</h1>
<h2>ACADEMIEJAAR ${escapeHtml(contract.schoolYear)}</h2>
<p class="subtitle">Conform het Vlaams Woninghuurdecreet van 9 november 2018</p>

<div class="warning">
  <strong>BELANGRIJK — LEES VOOR ONDERTEKENING</strong><br/>
  Deze overeenkomst werd opgemaakt conform het Vlaams Woninghuurdecreet (9 november 2018).
  Eventuele wijzigingen moeten zichtbaar aangebracht en door beide partijen geparafeerd worden.
  Bepalingen in strijd met het decreet zijn niet rechtsgeldig. De verhuurder is verplicht
  deze overeenkomst binnen twee maanden na ondertekening gratis te laten registreren.
</div>

<p><strong>TUSSEN DE ONDERGETEKENDE PARTIJEN:</strong></p>

<p><strong>ENERZIJDS, de VERHUURDER:</strong></p>
<div class="field-row"><span class="field-label">Naam en voornamen:</span><span>${escapeHtml(landlord.name)}</span></div>
<div class="field-row"><span class="field-label">Geboortedatum en -plaats:</span><span>${escapeHtml(landlord.dateOfBirth)}</span></div>
<div class="field-row"><span class="field-label">Adres:</span><span>${escapeHtml(landlord.address)}</span></div>
<div class="field-row"><span class="field-label">Telefoon / gsm:</span><span>${escapeHtml(landlord.phone)}</span></div>
<div class="field-row"><span class="field-label">E-mailadres:</span><span>${escapeHtml(landlord.email)}</span></div>

<p style="margin-top:12px;"><strong>ANDERZIJDS, de HUURDER:</strong></p>
<div class="field-row"><span class="field-label">Naam en voornamen:</span><span>${huurderNaam}</span></div>
<div class="field-row"><span class="field-label">Geboortedatum:</span><span>${escapeHtml(student.dateOfBirth)}</span></div>
${student.institution ? `<div class="field-row"><span class="field-label">Onderwijsinstelling:</span><span>${escapeHtml(student.institution)}</span></div>` : ''}
${student.faculty ? `<div class="field-row"><span class="field-label">Faculteit:</span><span>${escapeHtml(student.faculty)}</span></div>` : ''}
${student.studentNumber ? `<div class="field-row"><span class="field-label">Studentennummer:</span><span>${escapeHtml(student.studentNumber)}</span></div>` : ''}
${formatResidence(student) ? `<div class="field-row"><span class="field-label">Hoofdverblijf:</span><span>${escapeHtml(formatResidence(student))}</span></div>` : ''}
<div class="field-row"><span class="field-label">Telefoon / gsm:</span><span>${escapeHtml(student.phone)}</span></div>
<div class="field-row"><span class="field-label">E-mailadres:</span><span>${escapeHtml(student.email)}</span></div>

<p style="margin-top:14px;"><strong>Wordt overeengekomen wat volgt:</strong></p>

<article>
  <span class="art-title">Art. 1. BESCHRIJVING VAN HET GEHUURDE GOED</span><br/>
  De verhuurder geeft in huur een ${escapeHtml(ROOM_TYPE_LABEL[room.roomType].toLowerCase())}
  gelegen: <strong>${escapeHtml(property.address)}, kamer ${escapeHtml(room.roomNumber)}</strong>
  (${escapeHtml(property.name)}).<br/>
  Het gehuurde goed kan enkel gebruikt worden als studieverblijf. Het is de huurder niet
  toegestaan er zijn hoofdverblijf te nemen.
</article>

<article>
  <span class="art-title">Art. 2. INVENTARIS VAN HET GEHUURDE GOED</span><br/>
  De inventaris van het gehuurde goed is opgenomen in Bijlage A (plaatsbeschrijving).
</article>

<article>
  <span class="art-title">Art. 3. HUURPERIODE</span><br/>
  Het gehuurde goed wordt verhuurd voor academiejaar ${escapeHtml(contract.schoolYear)},
  van <strong>${escapeHtml(startDate)}</strong> tot en met <strong>${escapeHtml(endDate)}</strong>.
  De huurovereenkomst eindigt op ${escapeHtml(endDate)} zonder opzegging.
</article>

<article>
  <span class="art-title">Art. 4. HUURPRIJS EN KOSTEN</span><br/>
  De huurprijs bedraagt <strong>€ ${room.monthlyRent},00 per maand</strong>.<br/>
  Vaste kosten per maand: € ${room.fixedCosts},00 (water, elektriciteit, verwarming en internet).<br/>
  Studentenbelasting (Stad Gent): € ${room.studentTax},00 per maand.<br/>
  <strong>Totaal maandelijkse betaling: € ${totalMonthly},00</strong><br/>
  Conform art. 60 Vlaams Woninghuurdecreet dienen alle kosten en lasten verrekend te worden.
</article>

<article>
  <span class="art-title">Art. 5. BETALING</span><br/>
  € ${totalMonthly},00 wordt maandelijks betaald door overschrijving, uiterlijk binnen vijf
  kalenderdagen na de aanvang van de huurmaand.<br/>
  IBAN-rekeningnummer: <strong>${escapeHtml(landlord.iban)}</strong><br/>
  BIC-nummer: ${escapeHtml(landlord.bic)} &nbsp;|&nbsp; Bankinstelling: ${escapeHtml(landlord.bank)}<br/>
  Op naam van: ${escapeHtml(landlord.name)}
</article>

<article>
  <span class="art-title">Art. 6. WAARBORG</span><br/>
  De huurwaarborg bedraagt <strong>€ ${room.deposit},00</strong> (twee maanden huurprijs: 2 × € ${room.monthlyRent},00)
  en wordt gestort op een geblokkeerde waarborgrekening op naam van de huurder vóór de aanvang van de huurperiode.
  De waarborg wordt vrijgemaakt binnen drie maanden nadat de huurder het goed verlaten heeft,
  tenzij de verhuurder de teruggave betwist bij aangetekende brief.
</article>

<article>
  <span class="art-title">Art. 7. BELASTING OP TWEEDE VERBLIJVEN (STAD GENT)</span><br/>
  De belasting op tweede verblijven is niet inbegrepen in de huurprijs en wordt door de huurder
  rechtstreeks verrekend. Het geldende studententarief van de Stad Gent is van toepassing.
</article>

<article>
  <span class="art-title">Art. 8. BRANDVERZEKERING</span><br/>
  De verhuurder dekt in zijn brandverzekering de aansprakelijkheid van de huurder tegenover
  de verhuurder en derden. De huurder zorgt zelf voor de verzekering van zijn persoonlijke inboedel.<br/>
  Verzekeringsmaatschappij: ${escapeHtml(landlord.insuranceCompany)} &nbsp;|&nbsp; Polisnummer: ${escapeHtml(landlord.policyNumber)}
</article>

<article>
  <span class="art-title">Art. 9. PLAATSBESCHRIJVING</span><br/>
  Gedurende de eerste maand worden beide partijen verplicht een omstandige en tegensprekelijke
  beginplaatsbeschrijving op te maken. De plaatsbeschrijving maakt integraal deel uit van deze
  huurovereenkomst (Bijlage A).
</article>

<article>
  <span class="art-title">Art. 10. EINDE VAN DE OVEREENKOMST</span><br/>
  De huurovereenkomst eindigt op ${escapeHtml(endDate)} zonder opzegging. De huurder dient
  het goed volledig ontruimd te hebben en de sleutels terug te bezorgen op die datum.
</article>

<article>
  <span class="art-title">Art. 11. REGELING DERDE EXAMENPERIODE EN VAKANTIE</span><br/>
  Indien de huurder examens aflegt in de derde examenperiode, heeft hij het recht te
  beschikken over een gelijkwaardige kamer aan 1/4 van de maandelijkse betaling per
  begonnen week. Gebruik tijdens de zomervakantie is mogelijk mits uitdrukkelijk akkoord
  van de verhuurder aan dezelfde weekprijs.
</article>

<article>
  <span class="art-title">Art. 12. ONDERVERHUREN EN HUUROVERDRACHT</span><br/>
  De huurder heeft het recht zijn kamer onder te verhuren aan een andere student-huurder
  bij studie-uitwisseling of verplichte stage. In alle andere gevallen is schriftelijke
  toestemming van de verhuurder vereist.
</article>

<article>
  <span class="art-title">Art. 13. VOORTIJDIGE BEËINDIGING</span><br/>
  De huurder kan voortijdig beëindigen via schriftelijke opzegging conform art. 39 van het
  Vlaams Woninghuurdecreet. Bij opzegging minder dan drie maanden vóór de startdatum is een
  vergoeding van twee maanden huur (€ ${room.monthlyRent * 2},00) verschuldigd.
</article>

<article>
  <span class="art-title">Art. 14. ONDERHOUD, HERSTELLINGEN EN SCHADE</span><br/>
  Technisch onderhoud en herstellingen zijn ten laste van de verhuurder. De huurder is
  verantwoordelijk voor kleine herstellingen conform de lijst van het Vlaams Woninghuurdecreet.
</article>

<article>
  <span class="art-title">Art. 15. VEILIGHEIDSVOORSCHRIFTEN EN EPC</span><br/>
  De verhuurder verklaart dat het pand uitgerust is met rookmelders conform de Vlaamse regelgeving.
  De huurder staat in voor het onderhoud van de rookmelder in zijn kamer.
  De verhuurder overhandigt de brandveiligheidsvoorschriften aan de huurder.<br/>
  EPC-label kamer: <strong>${escapeHtml(landlord.epcLabel)}</strong>
  (Energieprestatiecertificaat nr. ${escapeHtml(landlord.epcNumber)})
</article>

<article>
  <span class="art-title">Art. 16. RUSTIG GENOT</span><br/>
  De verhuurder verbindt er zich toe het rustig genot te verzekeren. Hij heeft slechts
  toegang tot de kamer in geval van overmacht of mits toestemming van de huurder.
</article>

<article>
  <span class="art-title">Art. 17. COMFORT EN KWALITEITSNORMEN</span><br/>
  De kamer is in overeenstemming met de geldende kwaliteits- en veiligheidsnormen voor
  studentenkamers conform de Vlaamse Codex Wonen.
</article>

<article>
  <span class="art-title">Art. 18. REGISTRATIE</span><br/>
  De verhuurder is verplicht de huurovereenkomst en bijlagen te registreren binnen twee
  maanden na ondertekening. De registratie is gratis.
  Meer informatie: www.vlaanderen.be/studentenhuurovereenkomsten
</article>

<article>
  <span class="art-title">Art. 19. SLOTBEPALINGEN</span><br/>
  Deze huurovereenkomst kan aangevuld worden met een huisreglement, op voorwaarde dat de
  huurder hiervan kennis had vóór ondertekening. De inhoud mag niet strijdig zijn met het
  Vlaams Woninghuurdecreet.
</article>

<p style="margin-top:20px;"><strong>ONDERTEKENING</strong><br/>
Opgemaakt te Gent, in twee originelen. Elke partij erkent één exemplaar ontvangen te hebben.</p>

<div class="sign-block">
  <div class="sign-line">
    <strong>Handtekening verhuurder</strong><br/>
    ${landlordSignature ? `<img src="${landlordSignature}" alt="Handtekening verhuurder" style="max-height:70px;max-width:200px;display:block;margin:6px 0;" />` : '<br/><br/>'}
    Naam: ${escapeHtml(landlord.name)}<br/>
    Datum: _____ / _____ / _____<br/>
    Plaats: Gent
  </div>
  <div class="sign-line">
    <strong>Handtekening huurder</strong><br/>
    ${studentSignatureDataUrl ? `<img src="${studentSignatureDataUrl}" alt="Handtekening huurder" style="max-height:70px;max-width:200px;display:block;margin:6px 0;" />` : '<br/><br/>'}
    Naam: ${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}<br/>
    Datum: _____ / _____ / _____<br/>
    Plaats: _____________________
  </div>
</div>

<div class="page-break"></div>

<h1>${escapeHtml(bijlageTitle)}</h1>
<p style="margin-bottom:12px;font-size:9.5pt;">
  Opgemaakt op _____ / _____ / _____ — Kamer ${escapeHtml(room.roomNumber)}, ${escapeHtml(property.address)}
</p>

<table>
  <thead>
    <tr>
      <th style="width:45%;">Onderdeel</th>
      <th style="width:20%;text-align:center;">Toestand</th>
      <th style="width:35%;">Opmerkingen</th>
    </tr>
  </thead>
  <tbody>
    ${inspectionTableRows}
  </tbody>
</table>

<div class="sign-block" style="margin-top:32px;">
  <div class="sign-line">
    <strong>Handtekening verhuurder</strong><br/><br/><br/>
    Naam: ${escapeHtml(landlord.name)}<br/>
    Datum: _____ / _____ / _____
  </div>
  <div class="sign-line">
    <strong>Handtekening huurder</strong><br/><br/><br/>
    Naam: ${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}<br/>
    Datum: _____ / _____ / _____
  </div>
</div>

</body>
</html>`
}

function openPrintableDocument(_title: string, html: string) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  window.setTimeout(() => printWindow.print(), 250)
}

export function printContractDocument(bundle: ContractBundle) {
  openPrintableDocument(
    `Contract ${bundle.student.firstName} ${bundle.student.lastName}`,
    generateContractHtml(bundle),
  )
}

/**
 * Generates a PDF from the contract HTML and returns it as a base64 string.
 * Uses html2pdf.js (client-side, no server needed).
 */
export async function generateContractPdfBase64(bundle: ContractBundle): Promise<string> {
  // Dynamically import to avoid SSR issues
  const html2pdf = (await import('html2pdf.js')).default

  const html = generateContractHtml(bundle)

  // Render the full HTML document inside a hidden, on-screen iframe. An off-screen
  // (-9999px) container or a bare <div> with innerHTML makes html2canvas capture a
  // blank page; an iframe keeps the <head> styles intact and gives html2canvas real,
  // positively-positioned content at A4 width (794px = A4 at 96dpi).
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;top:0;left:0;width:794px;height:1123px;border:0;opacity:0;pointer-events:none;z-index:-1;'
  document.body.appendChild(iframe)

  try {
    const doc = iframe.contentWindow!.document
    doc.open()
    doc.write(html)
    doc.close()

    // Wait for the iframe document (and its inline signature images) to be ready,
    // otherwise html2canvas can snapshot before layout/paint and produce a blank PDF.
    await new Promise<void>(resolve => {
      const finish = () => window.setTimeout(resolve, 250)
      if (doc.readyState === 'complete') finish()
      else iframe.contentWindow!.addEventListener('load', finish, { once: true })
    })

    const blob: Blob = await html2pdf()
      .set({
        margin: 0,
        filename: `huurovereenkomst_${bundle.student.firstName}_${bundle.student.lastName}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // Respect the document's page-break-inside CSS so html2pdf doesn't slice
        // a field row, article, or sign block in half across a page boundary.
        // (`pagebreak` is supported at runtime but missing from html2pdf.js's .d.ts)
        ...({ pagebreak: { mode: ['css', 'legacy'] } } as Record<string, unknown>),
      })
      // Pass the <html> root, not <body>: html2pdf clones only the element
      // handed to .from(), so <body> alone drops the <head>/<style> block —
      // the clone then renders with zero custom CSS (wrong fonts/margins, and
      // none of the page-break-inside rules above ever take effect).
      .from(doc.documentElement)
      .output('blob')

    // Convert blob to base64
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Strip the data URL prefix (e.g. "data:application/pdf;base64,")
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } finally {
    document.body.removeChild(iframe)
  }
}

export function printInspectionDocument({ title, type, overviewPhotoUrl, items }: InspectionDocumentData) {
  const grouped = items.reduce<Record<string, InspectionDocumentItem[]>>((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item]
    return acc
  }, {})

  const body = `
    <main style="font-family:Arial,sans-serif;font-size:10pt;color:#000;margin:2cm;">
      <h1 style="font-size:15pt;">${escapeHtml(title)}</h1>
      <p style="color:#444;">${type === 'start' ? 'Startplaatsbeschrijving' : 'Eindplaatsbeschrijving'} — ${new Date().toLocaleDateString('nl-BE')}</p>

      ${overviewPhotoUrl ? `<img style="width:100%;max-height:260px;object-fit:cover;margin:12px 0;" src="${overviewPhotoUrl}" alt="Overzichtsfoto" />` : ''}

      ${Object.entries(grouped)
        .map(
          ([category, categoryItems]) => `
          <h2 style="font-size:11pt;margin:20px 0 6px;">${escapeHtml(category)}</h2>
          ${categoryItems
            .map(
              item => `
              <div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;">
                  <span style="font-weight:bold;">${escapeHtml(item.itemName)}</span>
                  <span>${escapeHtml(CONDITION_LABEL[item.condition] ?? item.condition)}</span>
                </div>
                ${item.photoUrl ? `<img style="width:100%;max-height:220px;object-fit:cover;margin-top:8px;border-radius:6px;" src="${item.photoUrl}" alt="${escapeHtml(item.itemName)}" />` : ''}
              </div>
            `,
            )
            .join('')}
        `,
        )
        .join('')}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;">
        <div style="border-top:1px solid #000;padding-top:8px;font-size:9pt;">Handtekening verhuurder</div>
        <div style="border-top:1px solid #000;padding-top:8px;font-size:9pt;">Handtekening huurder</div>
      </div>
    </main>`

  openPrintableDocument(title, `<!doctype html><html lang="nl"><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>@media print{@page{size:A4;margin:2cm;}button{display:none;}}</style></head><body>${body}</body></html>`)
}
