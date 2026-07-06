import fs from 'node:fs';

const files = [
  'src/app/api/autofill-tp-3/zoekprofiel/route.ts',
  'src/app/api/autofill-tp-3/inleiding/route.ts',
  'src/app/api/autofill-tp-3/belemmeringen/route.ts',
  'src/app/api/autofill-tp-3/plaatsbaarheid/route.ts',
  'src/app/api/autofill-tp-3/pow-meter/route.ts',
  'src/app/api/autofill-tp-3/prognose-bedrijfsarts/route.ts',
  'src/app/api/autofill-tp-3/persoonlijk-profiel/route.ts',
  'src/app/api/autofill-tp-3/visie-werknemer/route.ts',
  'src/app/api/autofill-tp-3/sociale-achtergrond/route.ts',
  'src/app/api/autofill-tp-3/ad-advies/route.ts',
  'src/app/api/autofill-tp-3/ad-advies-passende-arbeid/route.ts',
  'src/app/api/autofill-tp-3/visie-adviseur/route.ts',
  'src/app/api/autofill-tp-3/visie-plaatsbaarheid/route.ts',
];

const authImport = "import { requireEmployeeAutofillAccess } from '@/lib/auth/autofill-access';";

const blockRe =
  /export async function GET\(req: NextRequest\) \{\s*\n\s*try \{\s*\n\s*const \{ searchParams \} = new URL\(req\.url\);\s*\n\s*const employeeId = searchParams\.get\(["']employeeId["']\);\s*\n(?:\s*if \(!employeeId[\s\S]*?\n\s*\})?\s*\n/m;

const replacement = `export async function GET(req: NextRequest) {
  try {
    const access = await requireEmployeeAutofillAccess(req);
    if (access instanceof NextResponse) return access;
    const { employeeId } = access;

`;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('requireEmployeeAutofillAccess')) {
    const lastImport = content.lastIndexOf('\nimport ');
    const insertAt = content.indexOf('\n', lastImport) + 1;
    content = content.slice(0, insertAt) + authImport + '\n' + content.slice(insertAt);
  }
  if (!blockRe.test(content)) {
    console.warn('skip pattern', file);
    continue;
  }
  content = content.replace(blockRe, replacement);
  fs.writeFileSync(file, content);
  console.log('patched', file);
}
