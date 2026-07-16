/**
 * Data corrections to existing fund records in /community/funds.
 * Touches text fields only, total_amount, amount_disbursed, currency are NOT modified.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const updates = [
  {
    id: '0f44b69b-9546-45e1-a393-03261989e412',
    label: 'Hustler Fund',
    patch: {
      description:
        'Mobile-first micro-credit and savings fund accessible via *254# USSD code or M-PESA, Airtel Money, and T-Kash apps. Personal loans from KES 100 to KES 50,000 based on credit score and repayment history (starts low, grows with consistent repayment). Group loans up to KES 250,000. Bridge Loan available for graduates reaching up to KES 150,000. Over 24 million Kenyans registered. 8% interest p.a., repayment in 14 days.',
    },
  },
  {
    id: '498e79d8-6a5d-4550-ac89-08e5a7c80650',
    label: 'Youth Enterprise Development Fund (YEDF)',
    patch: {
      description:
        'Government revolving fund providing affordable credit to youth-owned enterprises and supporting business development services. Operates through constituency offices countrywide. Targets youth aged 18 to 34. Offers 10+ loan products including Stawi, Agri-Biz (up to KES 2M), E-Yes, Asset Finance, and LPO/LSO loans. Applied through constituency YEDF offices or financial intermediaries.',
      target_beneficiaries: 'Youth entrepreneurs aged 18 to 34 across Kenya',
    },
  },
  {
    id: 'b2a8837b-1006-4bfe-ba83-63b317c1976d',
    label: 'Uwezo Fund',
    patch: {
      // Append the corrected eligibility detail without losing the existing summary.
      description:
        'Constituency-level revolving fund targeting women, youth and persons with disabilities to access interest-free credit for enterprise development. Managed through constituency-based committees. Over KES 7 billion disbursed nationally as of 2024. Zero interest. Groups must practise table banking with evidence of monthly contributions. Minimum group size is as required by the registration body (typically more than 5 members). Loan range: KES 50,000 to KES 500,000 per group per cycle.',
    },
  },
  {
    id: '318ea7f4-7aea-4162-8b9b-fe413fa65a06',
    label: 'KYEOP → NYOTA (Option A: replace in place)',
    patch: {
      title: 'NYOTA, National Youth Opportunities Towards Advancement',
      managing_body:
        'State Department for Youth Affairs and Creative Economy / Micro and Small Enterprise Authority (MSEA)',
      description:
        'World Bank-financed five-year programme (successor to KYEOP) providing skills training, entrepreneurship grants, apprenticeships, and savings support to vulnerable youth. Each beneficiary receives a KES 50,000 business grant (paid in two tranches linked to training attendance). Targets 820,000 unemployed youth across all 47 counties.',
      target_beneficiaries:
        'Unemployed or underemployed youth aged 18 to 29 (up to 35 for PWDs), with Form 4 education or below. Must not have defaulted on the Hustler Fund.',
      official_url: 'https://nyotaproject.go.ke',
      status: 'active',
    },
  },
];

for (const u of updates) {
  const { data, error } = await supabase
    .from('public_funds')
    .update(u.patch)
    .eq('id', u.id)
    .select('id, title')
    .single();
  if (error) {
    console.error(`✗ ${u.label}: ${error.message}`);
    continue;
  }
  console.log(`✓ ${u.label}  →  ${data.title}`);
}

console.log('\nDone. No financial figures touched.');
