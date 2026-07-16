/**
 * Seeds 4 mega-courses (text + slides + video delivery) and 3 text-only standalones
 * for instructor ledeve5997@fermiro.com. Idempotent, if a course with the same title
 * (and matching author + non-deleted) already exists, it's skipped.
 *
 * Run: node scripts/seed-courses.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const INSTRUCTOR_ID = '08be0480-70a5-4e3d-9c22-e4f789a90d7b'; // ledeve5997@fermiro.com

// Resolve category IDs by name
const { data: cats } = await supabase.from('module_categories').select('id, name');
const CAT = Object.fromEntries(cats.map(c => [c.name, c.id]));

const requiredCats = ['Digital Entrepreneurship', 'Leadership', 'Civic Participation', 'Climate Advocacy', 'Business'];
for (const n of requiredCats) {
  if (!CAT[n]) { console.error(`Missing category: ${n}`); process.exit(1); }
}

// ---------------------------------------------------------------------------
// CURRICULUM DATA
// ---------------------------------------------------------------------------

const COURSES = [
  // =========================================================================
  // COURSE 1: The Youth Builder Blueprint
  // =========================================================================
  {
    title: 'The Youth Builder Blueprint',
    description: 'Shift from entrepreneurial myths to collaborative, iterative problem-solving. The operating system every young builder needs before they pick a single Friday-night idea.',
    overview: 'A five-module reset for the founder who is tired of TED-Talk theatre. We replace the "lone-genius" myth with the E.E.T. Engine, separate roots from fruit, locate your Zone of Execution, stress-test the idea with DFV, then ship an MVP and pitch it through a tight 4-stage narrative.',
    category: 'Digital Entrepreneurship',
    difficulty_level: 'beginner',
    estimated_duration_hours: 12,
    prerequisites: ['Curiosity', 'A real community problem you have observed', 'Willingness to be wrong publicly'],
    learning_outcomes: [
      'Diagnose surface symptoms vs. systemic roots in any local problem',
      'Apply the E.E.T. Engine (Education, Training, Empowerment) to your own build',
      'Plot a venture inside the Zone of Execution and exit Hobby / Grind / Dead zones',
      'Run a DFV stress test (Desirability, Feasibility, Viability) on any idea in 60 minutes',
      'Ship an MVP using Build, Measure, Learn loops',
      'Pitch through the 4-stage narrative arc using the 3 C\'s',
    ],
    modules: [
      {
        title: 'Mindset Reset, Myths vs. Reality of Building',
        description: 'Unlearn the lone-founder fairy tale. Replace it with the reality: collaborative, iterative, evidence-based building.',
        minutes: 90,
        objectives: [
          'List the 5 most common entrepreneurial myths young builders inherit',
          'Reframe "failure" as the cheapest research method available',
          'Identify the three identity shifts required to build seriously',
        ],
        keywords: ['mindset', 'myths', 'iteration', 'youth-builder'],
        content: `# Mindset Reset, Myths vs. Reality of Building

## Why this matters

Most youth entrepreneurship content sells **fairy tales dressed in suits**. The Lone Genius. The Overnight Exit. The Pitch That Changed Everything. None of these survive contact with Nairobi traffic, a stubborn licensing officer, or the moment your co-founder ghosts your group chat.

Before frameworks, before pitch decks, before Sheria ya Vijana, your **operating system** has to be right. This module rewires it.

## The 5 Myths You Inherited

1. **"You need a big, original idea."**, No. You need a *specific, observed* problem and the patience to sit with it. Originality is the by-product, not the input.
2. **"Founders are born, not made."**, Born founders make great LinkedIn posts and broke companies. Made founders read, ship, get feedback, repeat.
3. **"Real entrepreneurs don't need help."**, Every venture that survived the first 24 months had a brain trust. You will too.
4. **"Move fast and break things."**, Move *deliberately* and learn things. Breaking things in a low-income community is somebody's rent.
5. **"Funding is the milestone."**, Funding is the *fuel*. The milestone is paying customers, a moved policy, or a community that defends your service when you go down for maintenance.

## The Reality

> Building is **boring on most days and terrifying on Tuesdays**. The job is to convert raw confusion into one testable question per week.

You are not chasing inspiration. You are running a structured search. Three identity shifts make this possible:

### Shift 1: From "Founder" to **Investigator**
You are not the hero of this story. The community you serve is. You investigate their problem until you understand it better than they do, then you propose, test, retract, propose again.

### Shift 2: From "Idea" to **Hypothesis**
Ideas are precious. Hypotheses are disposable. Stop saying "I have an idea." Start saying "I have a hypothesis I want to test cheaply this week."

### Shift 3: From "Output" to **Loop**
You are not building a product. You are building a *learning loop* that happens to produce a product. The product is the residue; the loop is the asset.

## Sheng Reality Check

> *Kuanza biz si "vibe", ni decision to be wrong publicly, on schedule, until you're right.*

If you can't be embarrassed by your last version, you weren't learning fast enough. Welcome to the work.

## Action Item

Write down, in one paragraph, the **last three "ideas"** you've had in the past six months. For each, answer:

- What *problem* was I solving?
- *Who* told me it was a problem (not just my own assumption)?
- What is the cheapest possible test I could have run to disprove it within 7 days?

If you can't answer cleanly, you weren't building. You were daydreaming with a Notion template.

## What's Next

Module 2 introduces the **E.E.T. Engine**, the three-fuel system (Education, Training, Empowerment) that powers every serious youth builder. We'll diagnose which fuel you're starved of right now.
`,
      },
      {
        title: 'The E.E.T. Engine, Education, Training, Empowerment',
        description: 'The three fuels every young builder runs on. Diagnose which one you\'re starved of and patch it.',
        minutes: 105,
        objectives: [
          'Define each pillar of E.E.T. and the failure mode of imbalance',
          'Audit your current E.E.T. fuel mix honestly',
          'Build a 30-day plan to top up your weakest pillar',
        ],
        keywords: ['EET', 'education', 'training', 'empowerment', 'capacity'],
        content: `# The E.E.T. Engine, Education, Training, Empowerment

## The thesis

Most young builders fail not from lack of vision but from a **lopsided fuel mix**. They have one of the three pillars in excess and the other two empty. The result is predictable:

- **Education-only** → walking encyclopedia. Can quote Lean Startup. Has shipped nothing.
- **Training-only** → polished operator. Can wireframe, model finances, pitch. Has no idea *why* their venture exists.
- **Empowerment-only** → swagger without substance. Confident, charismatic, broke.

The E.E.T. Engine balances all three.

## Pillar 1: Education (the Knowledge Base)

This is the **macro literacy** layer. You should be able to speak fluently about:

- The **market** you operate in, its size, its players, its margins, its informalities
- The **legal frame**, especially *Sheria ya Vijana*, what protects you, what limits you, what funds you missed because you didn't read it
- The **frameworks** that systematize thinking (Lean Startup, JTBD, RCA, we cover all of these)

You don't memorize education. You *metabolize* it, until you can apply it to a stranger's problem at 11pm without slides.

## Pillar 2: Training (the Hard Skills)

This is what your hands can do. Concretely:

- **Wireframing** a screen or a service flow
- **Financial modeling** at a depth where a banker stops smirking
- **Pitch deck** construction, visual, narrative, defensible
- **User interviews** that surface truth, not flattery
- **Operational ops**, accounting, payroll, M-Pesa reconciliations, contracts

Training is the difference between *understanding* and *doing*. Without it, the Education pillar becomes a coffee-shop hobby.

## Pillar 3: Empowerment (the Mindset / Agency Shift)

This is the hardest to teach because it lives in the gut. Empowerment is the internal answer to: *"Why am I qualified to attempt this?"*

It is **not** confidence. Confidence is a feeling. Empowerment is a **stance**:

> "I have the right to attempt this. I will be wrong loudly. I will adjust. The community I serve deserves a serious attempt, even an imperfect one, more than they deserve another talking head."

Without empowerment, training collapses into impostor syndrome the moment a stakeholder pushes back.

## The Audit (Do This Now)

Score yourself 1 to 10 on each pillar, but **with evidence**, not vibes:

| Pillar | Your score | The evidence (be specific) |
|---|---|---|
| Education | / 10 | List 3 books, 3 frameworks, 1 policy you can teach to a stranger |
| Training | / 10 | List 3 artifacts you've shipped this quarter |
| Empowerment | / 10 | When did you last advocate for your work to a hostile audience? |

Your lowest pillar is your **growth edge** for the next 30 days. Everything else is sequencing.

## Sheng Reality Check

> *Knowing ni knowing. Doing ni doing. Owning the room ni owning the room. Ukikosa moja, the engine inakwama.*

## Action Item

Build a one-page "E.E.T. Top-Up Plan" for the next 30 days. For your weakest pillar, list:

1. **One book or course** you'll finish (Education)
2. **One artifact** you'll ship (Training)
3. **One conversation** you'll have where you defend your work to someone who can push back (Empowerment)

Pin it to your wall. Check it weekly.

## What's Next

Module 3 introduces the **Root vs. Fruit** model. We stop diagnosing surface symptoms ("the youth are unemployed") and start tracing them down to the systemic drivers ("licensing regimes lock youth out of formalization, which compounds with…"). That is where serious interventions live.
`,
      },
      {
        title: 'Root vs. Fruit, Surface Symptoms vs. Systemic Drivers',
        description: 'Stop treating leaves. Trace any community problem down its trunk to the systemic roots.',
        minutes: 100,
        objectives: [
          'Distinguish symptoms, mid-tier problems, and root drivers',
          'Map any local issue into the Root, Trunk, Fruit tree',
          'Pick an intervention level appropriate to your resources',
        ],
        keywords: ['root-cause', 'systems-thinking', 'diagnosis'],
        content: `# Root vs. Fruit, Surface vs. Systemic Drivers

## The Tree

Imagine the problem you want to solve as a tree. Three layers:

- **Fruit**, the visible, daily symptoms. "Youth unemployment is high in my area."
- **Trunk**, the specific community problem. "There are no formal pathways from secondary school into local SMEs that hire."
- **Roots**, the systemic drivers. "Licensing fees price out new SMEs; the few that survive can't afford structured hiring; the curriculum doesn't track local industry."

Most founders pick a piece of **fruit**, paint it green, and call it impact. The fruit grows back next season because the roots are untouched.

## The Discipline

To work at the right altitude, you must answer three questions in order:

### 1. What is the visible symptom?
Describe it concretely. Numbers if you have them. *"In my ward, 7 out of 10 youth I interviewed last month are not engaged in formal work or training."*

### 2. What is the trunk, the specific local mechanism?
This is where most founders skip. Force yourself to spend a week on this. Examples:

- "School-to-work info gap" (no career counsellors)
- "Capital exclusion" (no collateral, no formal credit history)
- "Licensing chokepoint" (the kiosk-permit costs 3x what an unemployed youth has)

### 3. What are the roots, the policy / structural drivers?
Now you go upstream:

- The Constitution, *Sheria ya Vijana*, county finance acts
- Curriculum design at the national level
- Banking regulation around informal collateral
- Cultural / gender norms that shape who gets capital

You do not have to solve at the root level. But you must **know where you are** on the tree. A literacy programme that pretends to solve a licensing problem will fail. A licensing-reform advocacy campaign that ignores literacy will reach no one.

## The "Three Whys" Drill

For your chosen problem, ask "Why?" three times:

> **Surface:** "Youth-led kiosks in my ward keep collapsing within 6 months."
> **Why?** "They can't make payroll past the first dry season."
> **Why?** "They run on cash-on-hand with no buffer because banks won't lend without collateral."
> **Why?** "Informal businesses aren't recognized as creditworthy under current banking guidelines."

You just moved from fruit → trunk → root in three sentences. That's the move. Practice it until it's reflex.

## Matching Resources to Altitude

| Level | Intervention type | Resource scale |
|---|---|---|
| Fruit | Awareness, direct service | Days, small budget |
| Trunk | Service redesign, structured programme | Months, mid budget |
| Root | Policy advocacy, regulatory reform | Years, coalitions |

You can intervene at any level, but you must be **honest** about which.

## Sheng Reality Check

> *Usitibu majani. Tibua mizizi. Otherwise you'll be busy forever and impactful never.*

## Action Item

Pick one problem in your community. Fill in the tree:

\`\`\`
FRUIT (what you see daily):     ____________________
TRUNK (the specific mechanism): ____________________
ROOT 1 (systemic / policy):     ____________________
ROOT 2 (cultural / structural): ____________________
ROOT 3 (economic / regulatory): ____________________
\`\`\`

Then ask three trusted people if your trunk and roots match what they observe. **The point is not to be right. The point is to be calibrated.**

## What's Next

Module 4 introduces the **Zone of Execution**, the only 2x2 you'll need to decide whether to actually attempt the venture. Plus the **DFV Stress-Test** to interrogate any idea in under 60 minutes.
`,
      },
      {
        title: 'Zone of Execution + The DFV Stress-Test',
        description: 'Find the Sweet Spot at the intersection of market need and founder skill, and pass the Desirability/Feasibility/Viability gates.',
        minutes: 95,
        objectives: [
          'Plot any idea on the Market Need × Founder Passion/Skill matrix',
          'Recognize Hobby, Grind, and Dead zones, and exit them quickly',
          'Run a DFV stress-test on a candidate idea in one sitting',
        ],
        keywords: ['zone-of-execution', 'DFV', 'desirability', 'feasibility', 'viability'],
        content: `# Zone of Execution + The DFV Stress-Test

## The Map

Two axes. Four zones.

\`\`\`
                Market Need →

                LOW             HIGH
              ┌──────────────┬──────────────┐
       HIGH  │   HOBBY      │  SWEET SPOT  │
Passion /    │ (loved, no   │  (work here) │
Skill  ↑     │  customers)  │              │
              ├──────────────┼──────────────┤
       LOW   │  DEAD ZONE   │   GRIND      │
              │ (no one wins)│ (burnout job)│
              └──────────────┴──────────────┘
\`\`\`

### Sweet Spot
High demand × your authentic passion or skill. The market pulls you forward. The work feels heavy but right. **Build here.**

### Hobby
You love it. The market shrugs. You'll subsidize it from your day job forever. Honourable, but call it what it is.

### Grind
The market wants it. You don't. You can do it for money but the founder will burn out within 24 months. The world has enough miserable founders.

### Dead Zone
Nobody wants it. Including you. Stop.

## How to Plot Yourself Honestly

The trap: founders confuse **familiarity** with **passion**, and **friend feedback** with **market need**. Two checks:

### Passion / Skill (Y-axis)
- Have I voluntarily worked on this without pay for ≥40 hours?
- When I learn something new in this domain, do I lose track of time?
- Do I have a *demonstrable* skill ladder I'm already climbing, or only an interest?

### Market Need (X-axis)
- Can I name 10 strangers (not friends) who have *paid for* a current solution to this problem?
- Is there an existing market category, or am I inventing demand?
- If I disappeared, would the customer notice within 30 days?

If your skill axis is high but your market check fails, you're in Hobby. Don't quit, but don't bet your rent.

## The DFV Stress-Test

Once you're plotting somewhere in the Sweet Spot, the next gate is **D.F.V.**, three independent questions, each capable of killing the idea on its own.

### D, Desirability
*Do real users actually want this, enough to change a behaviour?*

Test: 10 problem interviews with target users. Not "would you use this?" but "tell me about the last time this problem hurt you. What did you do? What did it cost you?"

If you can't get a 10-minute story out of someone, the problem isn't acute enough.

### F, Feasibility
*Can we actually build this with the team, budget, and time we have?*

Test: write the technical / operational spec on one page. Show it to one expert in that domain. If they laugh, you're not feasible yet. If they nod and add 2 risks, you might be.

### V, Viability
*Can the unit economics work? Does it survive at scale?*

Test: a back-of-envelope on (revenue per customer), (cost to serve per customer) > 0 within 18 months. If the answer is "yes, but only if a grant subsidizes us indefinitely," you don't have a business. You have a project. (Projects are valid! But name it correctly.)

## Pass Rules

You only proceed if **all three** stress-tests pass. One No kills the round. Don't rationalize. Don't lower the bar. **Kill the idea, save the founder.**

## Sheng Reality Check

> *Sweet Spot ndo home. Hobby ni weekend. Grind ni jela. Dead Zone ni "block & delete."*

## Action Item

For your current top idea:

1. **Plot it** on the 2×2 with evidence.
2. **Run DFV.** Write 3 short paragraphs, one per letter, with evidence and a verdict.
3. **Verdict:** Proceed / Pivot / Park. Be honest. Bring it to your brain trust.

## What's Next

Module 5 closes the course with the **MVP Loop** (Build → Measure → Learn) and the **Pitch Pillar**, the 4-stage narrative arc through which you sell what you've built to investors, partners, and policymakers.
`,
      },
      {
        title: 'The MVP Loop + The Pitch Pillar (3 C\'s, 4-Stage Narrative)',
        description: 'Ship the skateboard before the car. Then tell its story in a 4-stage arc that closes rooms.',
        minutes: 110,
        objectives: [
          'Design the smallest possible MVP that still tests your riskiest assumption',
          'Run a Build, Measure, Learn cycle in under 14 days',
          'Structure a pitch through the 4-stage arc using the 3 C\'s (Clear, Concise, Confident)',
        ],
        keywords: ['MVP', 'build-measure-learn', 'pitch', 'narrative'],
        content: `# The MVP Loop + The Pitch Pillar

## Part 1: The MVP Principle

### The Skateboard, not the Car

The classic mistake: founders try to build a Tesla on Day 1 and ship it on Day 1,000. The discipline says: ship a **skateboard** first. Then a **scooter**. Then a **bicycle**. Then a **motorcycle**. Then a **car**.

Each version is **fully usable** by a customer. Each version teaches you something the previous didn't.

> "The skateboard isn't a worse car. It's a different vehicle that proves locomotion is possible."

### What an MVP Is (and Isn't)

It **is**:
- The smallest version that delivers real value to a real user
- A learning instrument disguised as a product
- Embarrassing on purpose

It **isn't**:
- A prototype that doesn't ship
- A beta you only show your cousins
- A polished v1 that took 9 months

### The Build, Measure, Learn Loop

\`\`\`
   BUILD ─────────► MEASURE ─────────► LEARN
     ▲                                     │
     └─────────────── PIVOT ───────────────┘
\`\`\`

**Build.** Ship the smallest testable thing.
**Measure.** Define one or two metrics *before* you ship. Did people sign up? Did they come back? Did they pay?
**Learn.** Sit with the data for 48 hours. What hypothesis did this confirm or kill?
**Pivot or persevere.** Either way, design the next loop.

Target loop length: **14 days or less**. If your loops take 3 months, you'll learn 4 things a year. Your competitors will learn 26.

### Common Failures

- **Vanity metrics.** "Impressions" is not a real metric. Paid users is.
- **No kill criterion.** Decide *before* you ship what failure looks like. Otherwise every result becomes "encouraging."
- **Skipping the Learn step.** Most teams Build → Measure → Build → Measure with no reflection between. They run loudly in circles.

---

## Part 2: The Pitch Pillar

You will pitch dozens of times. To investors. To grant officers. To policymakers. To your aunt. The structure is the same. **Four stages**. **Three C's.**

### The 4-Stage Narrative Arc

#### Stage 1, Status Quo (Pain)
Open with the world as it is today. Concrete. Painful. Specific.

> *"In Kibera last quarter, 73% of youth-led kiosks closed within 90 days. We followed 12 of them. The number-one reason: they couldn't get a permit fast enough to survive their first dry-season cashflow gap."*

This is not "Africa's youth unemployment is a crisis." That's a lecture. This is **one room, one number, one quarter, one cause.**

#### Stage 2, Catalyst (The MVP Solution)
What did you build, and why does it shift the status quo?

> *"We built a 48-hour permit advisory bot. It takes a kiosk owner from registration to permit-ready paperwork in two days, not two months."*

Be specific. Show the thing. Don't promise, demonstrate.

#### Stage 3, Proof (Traction)
Numbers that defend the catalyst. If you ran the MVP loop, you have data:

> *"Across 28 pilot kiosks, the average permit time dropped from 47 days to 5. 82% are still operating 6 months later, versus the 27% baseline."*

If you don't have data yet, say so honestly: *"We're three weeks in. Here's what we're tracking."* Honesty defeats fluff every time.

#### Stage 4, Vision / Ask
Now you zoom out. **What does the world look like in 3 years if this works?** And **what do you need to get there?**

> *"In 3 years, every youth-led kiosk in our county is permit-ready in under 7 days. To pilot county-wide for 12 months, we need $48k and a partnership with the county licensing office."*

Vision → Ask. In that order. Never lead with the ask. Always close with it.

### The 3 C's

Layered over the 4 stages:

- **Clear**, a 10-year-old could repeat your pitch. Cut jargon. Cut acronyms unless you define them.
- **Concise**, total pitch ≤ 3 minutes. The 4 stages: 45 seconds each.
- **Confident**, you don't apologize for being early. You don't oversell either. You speak from inside the work.

## Sheng Reality Check

> *Skateboard kwanza, gari baadaye. Na unapopitch, story ndo currency, sio slides.*

## Capstone Action Item

You're done with Course 1. Final task:

1. **Build (or commit to) one skateboard MVP** within 14 days. Define your one metric and one kill criterion in writing.
2. **Write your 4-stage pitch** in 4 paragraphs, 200 words total. Read it out loud. Time it.
3. **Pitch it to one person who will push back hard.** Take notes. Revise.

Bring the revised pitch to Course 2 (Leadership), we'll use it as a working artifact.

## You've completed The Youth Builder Blueprint

You now have:
- A working mindset (Investigator, Hypothesis, Loop)
- A diagnostic engine (E.E.T. audit + Root/Fruit + Zone of Execution + DFV)
- A delivery loop (MVP Build, Measure, Learn)
- A narrative structure (4-stage arc, 3 C's)

This is the operating system. Now go run it.
`,
      },
    ],
  },

  // =========================================================================
  // COURSE 2: The Youth Leadership Blueprint
  // =========================================================================
  {
    title: 'The Youth Leadership Blueprint',
    description: 'Personal growth scaling outward to system-level advocacy. Lead Self, then Lead Others, then Lead Systems, without skipping a step.',
    overview: 'A five-module leadership stack. We start where every honest leader starts, inside your own head, and scale outward through interpersonal calibration into systems-level advocacy. Tools you can deploy on Monday morning, not after a retreat in Naivasha.',
    category: 'Leadership',
    difficulty_level: 'intermediate',
    estimated_duration_hours: 14,
    prerequisites: ['You lead something, a team, a chama, a campaign, a project', 'Willingness to receive uncomfortable feedback'],
    learning_outcomes: [
      'Run Personal Root-Cause Analysis on your own patterns',
      'Operate the Continuous Growth Loop instead of waiting for annual reviews',
      'Place every interpersonal conflict on the Empathy × Clarity matrix',
      'De-escalate conflict using the Escalation Curve',
      'Diagnose team friction with the 3 Whys (Capacity / Clarity / Motivation)',
      'Convert local friction into a targeted advocacy strategy via the Advocacy Funnel',
    ],
    modules: [
      {
        title: 'Leading Self, Internal Operating System + Personal RCA',
        description: 'Before you lead anyone else, audit the operating system you run on. Personal Root-Cause Analysis on your own patterns.',
        minutes: 100,
        objectives: [
          'Map your own internal operating system (defaults, triggers, recovery patterns)',
          'Run a Personal Root-Cause Analysis on one recurring failure',
          'Identify your "leadership tax", the cost you pay when your OS misfires',
        ],
        keywords: ['self-leadership', 'self-awareness', 'personal-RCA'],
        content: `# Leading Self, Your Internal Operating System

## The premise

You cannot out-skill your operating system. If you yell when stressed, you will yell at your team when stressed, no matter how many "active listening" workshops you attend. The skill layer is downstream of the OS layer.

This module is uncomfortable on purpose.

## What an Internal OS includes

Four components that shape *every* leadership action you take:

### 1. Defaults
When you have no time to think, what do you do? Some leaders default to **action** (decide fast, ask forgiveness). Some default to **consensus** (delay, gather). Neither is right. Knowing yours is right.

### 2. Triggers
The conditions that make you smaller, short-tempered, defensive, controlling. Common ones: feeling stupid in a meeting, having a parent figure question you, money stress, being out of sleep.

### 3. Recovery Patterns
After a hit (failed pitch, bad meeting, public mistake), how long until you're functional? 10 minutes? 10 days? Until you measure it, you cannot shorten it.

### 4. Energy Sources
What actually refills you, not what you *think* should, but what does. Time alone? A specific friend? Movement? A specific kind of work?

## The Self-Audit

Spend 30 minutes. Answer in writing:

1. **My default when stressed is to:** ____________
2. **The three things that reliably make me smaller are:** ____________
3. **After a real setback, I'm functional again within:** ____________
4. **The thing that refills me, and that I systematically under-do, is:** ____________

You cannot lead well until you've answered these clearly.

## Personal Root-Cause Analysis

Pick one recurring failure pattern in your leadership. Examples:

- *"I keep over-promising and missing deadlines."*
- *"I avoid hard conversations until they explode."*
- *"I lose my team's best people every 14 months."*

Now run the **5 Whys** on yourself:

> **Why do I over-promise?** Because I want to keep funders happy in the moment.
> **Why?** Because I'm afraid they'll walk if I say "no" or "later."
> **Why?** Because in my last role, a "no" cost me a contract and three months' runway.
> **Why?** Because I hadn't diversified my pipeline; one funder held my whole organization.
> **Why?** Because I confused fundraising momentum with organizational stability.

The root isn't "I over-promise." The root is "I haven't built fundraising resilience, so I treat every conversation like a survival event."

**Different root → different solution.** "Stop over-promising" is willpower. "Diversify the funder pipeline this quarter" is a strategy.

## The Leadership Tax

Every leader pays a tax when their OS misfires. Make yours explicit:

| Misfire | Symptom | Tax I pay (people, money, time, trust) |
|---|---|---|
| Default to action under stress | Skipping consultation | Lost team buy-in; rework |
| Trigger: feeling questioned | Defensive replies | Senior team stops pushing back; I miss errors |
| Slow recovery after setbacks | 2 weeks of low output | Half a month lost per real hit |

Once you can see the tax in cash terms, you stop romanticizing the misfire as "personality."

## Sheng Reality Check

> *Huwezi lead watu kabla u-lead nafsi. Mafundo yako ya ndani are everyone else's problem the moment you sit at the head of the table.*

## Action Item

1. Complete the Self-Audit (above).
2. Pick **one** recurring leadership failure pattern. Run the 5 Whys on it.
3. Write **one concrete experiment** for the next 30 days targeting the actual root, not the symptom.

Bring the experiment back at the end of the course.

## What's Next

Module 2 introduces the **Continuous Growth Loop**, the system that turns every action (good or bad) into structured calibration. We replace the annual review with a weekly one.
`,
      },
      {
        title: 'The Continuous Growth Loop',
        description: 'Action → Reception → Calibration → Adaptation. Replace the annual review with a weekly one.',
        minutes: 90,
        objectives: [
          'Operate a four-stage feedback loop on yourself, weekly',
          'Solicit feedback as raw data, not as therapy',
          'Separate ego from data without faking detachment',
        ],
        keywords: ['feedback', 'calibration', 'growth-loop'],
        content: `# The Continuous Growth Loop

## Why annual reviews fail

Annual reviews are too slow, too political, and too late. A leader who only calibrates once a year drifts for 11 months. The Continuous Growth Loop runs weekly and turns every action into a data point.

\`\`\`
   ACTION ─────► RECEPTION ─────► CALIBRATION ─────► ADAPTATION
      ▲                                                    │
      └────────────────── (next week) ─────────────────────┘
\`\`\`

## Stage 1: Action

You did something, ran a meeting, sent a message, made a call. The action is over. The data is the residue.

## Stage 2: Reception

This is where 90% of leaders fail. They wait passively for feedback to arrive on its own, and it never does.

**You must solicit it.** And the way you ask determines what you get.

### Bad solicitations
- "How did that go?" → polite nothing
- "Was that okay?" → fishing for reassurance
- "Any feedback?" → easy to dodge

### Good solicitations
- "What was one thing I did that you'd want me to **stop**?"
- "If you were running that meeting, what would you have done **differently**?"
- "Where did I lose you?"

Specific questions invite specific answers. Vague questions invite flattery.

### Sources to ask
Don't just ask your friends. Stratify:

| Source | What they're best at telling you |
|---|---|
| Senior team | Strategic blind spots |
| Direct reports | Pattern of how you treat them |
| Peers in other orgs | Cross-context calibration |
| The person who pushed back | Where your logic broke |
| Yourself (in writing) | What you knew and didn't say |

## Stage 3: Calibration, Separating Ego from Data

The hardest stage. When feedback arrives, your ego will categorize it before your mind does:

- **"That's unfair"** → ego classifying it as attack
- **"They don't understand"** → ego classifying it as ignorance
- **"They're just having a bad day"** → ego classifying it as noise

These reflexes feel like analysis. They aren't. They're protection.

The discipline:

1. **Receive without responding.** Don't argue in the moment. "Thank you, I want to sit with this" is a complete sentence.
2. **Write it down verbatim.** The exact words. Not your interpretation.
3. **Wait 24 hours.** Re-read the words. Now ask: *what would be true about this feedback if I were not the one being criticized?*
4. **Separate into three buckets:**
   - **Signal**, true, useful, actionable
   - **Noise**, context the giver lacked
   - **Style**, about how it was delivered, separable from whether it's true

You don't have to accept all feedback. You have to *process* all of it before deciding.

## Stage 4: Adaptation

Pick **one** thing to change this week. Not five. Not "I'll be better." One concrete, observable adjustment.

> *"This week, in any meeting I'm running, I will explicitly invite the most junior person to speak first."*

Track it. Was it done? What was the effect? Loop closes. New action. Loop reopens.

## A worked example

**Action:** I chaired a partner meeting. We agreed on next steps.

**Reception:** I asked my deputy: "What was one thing I did that you'd want me to stop?" She said: *"You cut off the partner from County 5 twice. I think they had something to say."*

**Calibration:** Ego reaction: *"They were rambling and we had 10 minutes left."* (Note it.) 24 hours later: *True. They were slower. But I never let them land their point. If I'd given them 90 seconds, I might have heard a partnership angle I missed.*

**Adaptation:** This week, in any meeting I'm running, when I'm tempted to cut someone off, I will give it 30 more seconds. Track in my notebook.

## Sheng Reality Check

> *Feedback ni mali. Lakini mali ile huwezi tumia ni waste. Receive → digest → adapt. Bila adaptation, the loop is a vibe.*

## Action Item

1. Identify **one** action you did this past week worth running through the loop.
2. **Ask two people** the specific question (not the vague one).
3. **Write the verbatim response.**
4. After 24 hours, **separate Signal / Noise / Style**.
5. Pick **one adaptation** for the coming week. Track it.

## What's Next

Module 3 introduces the **Empathy × Clarity Matrix** and the **Escalation Curve**, for when you're leading *other people* and the friction is interpersonal, not just internal.
`,
      },
      {
        title: 'Leading Others, Empathy × Clarity Matrix + The Escalation Curve',
        description: 'The 2×2 of interpersonal calibration, plus how to intervene on conflict early, before it peaks.',
        minutes: 95,
        objectives: [
          'Place every leadership interaction on the Empathy × Clarity matrix',
          'Identify your default quadrant and shift toward Youth Advocate',
          'Use the Escalation Curve to intervene on conflict early',
        ],
        keywords: ['empathy', 'clarity', 'conflict', 'de-escalation'],
        content: `# Leading Others, Empathy × Clarity Matrix + The Escalation Curve

## Part 1: The Empathy × Clarity Matrix

Every interpersonal interaction you have as a leader can be plotted on two axes:

- **Empathy**, how well you understand and acknowledge what the other person is experiencing
- **Clarity**, how unambiguous you are about expectations, decisions, and consequences

\`\`\`
                Clarity →
                LOW             HIGH
              ┌──────────────┬─────────────────┐
       HIGH  │ FRIEND       │  YOUTH ADVOCATE │
Empathy ↑    │ (kind, vague)│  (kind, clear)  │
              ├──────────────┼─────────────────┤
       LOW   │ GHOST        │  TYRANT         │
              │ (absent)     │ (clear, harsh) │
              └──────────────┴─────────────────┘
\`\`\`

### The four modes

**Friend (High Empathy, Low Clarity)**
You care. You listen. You don't decide. People love you. Your projects don't ship. People eventually leave because they don't know where they stand.

**Tyrant (Low Empathy, High Clarity)**
You decide. You direct. You don't acknowledge. People execute. They also burn out, quit, or quietly resist. You get short-term output and long-term attrition.

**Ghost (Low Empathy, Low Clarity)**
You're not present in the room. You don't notice the person, and you also don't direct them. Worst quadrant. Common when leaders are overwhelmed.

**Youth Advocate (High Empathy, High Clarity)** ← target
You see them. You name what's hard. **And then you are unambiguous** about what's expected, by when, why. People stretch under you because they feel both held and pushed.

### Diagnosing your default

For each of your direct reports, ask: *In our last difficult interaction, which quadrant was I in?*

You'll find a pattern. Most leaders default to Friend (especially with people they like) and Tyrant (with people they don't). Almost none default to Youth Advocate; it's deliberate.

### Shifting toward Youth Advocate

Two moves:

1. **Add empathy without losing clarity:** Before delivering hard news, *name* what's hard about it. *"I know this contract not getting renewed is going to hit your projects in Q3, that's real, and I want to talk about it."* Then deliver the decision cleanly.
2. **Add clarity without losing empathy:** After listening fully, *summarize what you heard* and then say: *"Here's what I'm going to decide and why."* No mush.

## Part 2: The Escalation Curve

\`\`\`
   Intensity
     ↑                          ▲ PEAK (worst time to intervene)
     │                       ╱ ╲
     │                    ╱       ╲
     │                 ╱             ╲
     │      ◄ EARLY ╱                   ╲ LATE (damage done) ►
     │           ╱                          ╲
     │     ╱                                    ╲
     └───────────────────────────────────────► Time
\`\`\`

Conflict has a curve. Most leaders intervene at the peak, when emotions are loudest and reasoning is impossible. By then, damage is done.

The discipline: **intervene on the ascent.**

### Signs you're on the ascent (intervene now)
- Someone goes quiet who usually speaks
- A subtle shift in someone's tone in a thread
- Two people who used to collaborate stop tagging each other
- Increased "for the record…" emails
- A meeting where one person doesn't make eye contact

### Signs you're at the peak (do not engage on substance yet)
- Voices raised
- Personal accusations
- People walking out
- Sweeping statements ("you always", "you never")

### Three early-intervention moves

**Move 1: The Private Acknowledgment**
*"Hey, I noticed you've been quieter in our planning meetings. Anything you'd want me to know?"*

Not a confrontation. An opening. Often that's all that's needed.

**Move 2: The Reframe**
When you see two people drifting into opposition, name it before they entrench:
*"I want to make sure I understand, are we disagreeing on **what** to do, or on **how** to do it? Because those are different conversations."*

**Move 3: The Time-Out**
If something is starting to heat in a meeting, pause it: *"Let's take 15 minutes. We'll come back at the half-hour."* Don't apologize for the pause. It's leadership.

### After the peak

If conflict has peaked, you cannot win it. You can only contain it and return to it later. Two moves:

1. **End the substantive conversation.** *"I want to think about this. Let's pick this up tomorrow."*
2. **Acknowledge harm, not blame.** Even if you disagree on substance, you can say: *"I can see this conversation has been costly for both of us. I want to find a way through it."*

## Sheng Reality Check

> *Empathy bila clarity ni story tu. Clarity bila empathy ni tyranny. Lazima mbili. And usisubiri conflict ipande peak before you act, kazi ya leader ni kuintervene mapema.*

## Action Item

1. For each of your **three closest direct reports**, plot your *last difficult interaction* on the matrix. Note the pattern.
2. Pick **one** person you're currently in Friend or Tyrant mode with. Design one move that shifts you toward Youth Advocate. Execute this week.
3. Identify **one** conflict that's on the ascent in your team right now. Do one early-intervention move within 48 hours.

## What's Next

Module 4 introduces the **3 Whys Diagnostic**, when team friction shows up, it's almost always one of three things: Capacity, Clarity, or Motivation. We learn to diagnose which.
`,
      },
      {
        title: 'The 3 Whys Diagnostic, Capacity / Clarity / Motivation',
        description: 'When team friction shows up, it\'s almost always one of three things. Diagnose which, and stop applying the wrong fix.',
        minutes: 75,
        objectives: [
          'Run the 3 Whys Diagnostic on any team friction',
          'Match each root cause to its appropriate intervention',
          'Avoid the most common error: treating a motivation problem with a training fix',
        ],
        keywords: ['team-diagnostics', 'capacity', 'clarity', 'motivation'],
        content: `# The 3 Whys Diagnostic, Capacity / Clarity / Motivation

## The premise

When a team member underperforms, the leader's instinct is to assume **motivation**. *"They don't care enough."* This is almost always wrong, and almost always damaging.

In reality, underperformance has three possible roots:

1. **Capacity**, they don't yet have the *skill or resources* to do it
2. **Clarity**, they don't actually understand what "it" is, by when, to what standard
3. **Motivation**, they understand and could do it, but choose not to

Each root needs a completely different response. The wrong fix makes the problem worse.

## How to diagnose

Sit down with the person. Ask three questions, in order. Note the answer to each, your diagnosis lives in *which question fails first*.

### Why 1: Clarity
> *"Walk me through exactly what you understood the task to be, what done looks like, by when, and why it matters."*

If they can't articulate the task crisply, the root is **Clarity**. (And it's your fault as much as theirs, you didn't communicate it well.)

### Why 2: Capacity
> *"Of the steps to do this, which ones feel hard for you? Where would you get stuck?"*

If the person *can* describe the task but identifies a real skill gap or resource gap, the root is **Capacity**.

### Why 3: Motivation
> *"If everything were easy and you had infinite resources, would you want to do this?"*

If they can articulate the task and have the capacity, but they hesitate here, the root is **Motivation**.

## Matching fix to root

| Root | Wrong fix (what we usually do) | Right fix |
|---|---|---|
| **Clarity** | Send them on more training | Re-state the task, in writing, with deadline + standard. Confirm understanding. |
| **Capacity** | Get angry | Pair them with a senior person; resource the gap; create a learning runway with a deadline. |
| **Motivation** | Send them on more training | A direct, structured conversation about what's blocking them, and what changes if it continues. |

The single most common error: applying a **training fix** (Capacity) to a **motivation problem**. The person is bored, demoralized, or in the wrong role, and you give them a course. They get more demoralized. They quit, often poorly.

## What "Motivation" actually means

When a competent person under-delivers, the motivation root is rarely "they're lazy." It's usually one of:

- **Misalignment**, their values diverged from the org's recent decisions
- **Burnout**, they've been giving 110% with no recovery and they're done
- **Wrong role**, their actual strengths don't match what you're asking
- **Trust break**, something happened (a decision, a passed-over promotion, a public correction) that broke their commitment quietly

Each of these is a *real* problem with a *specific* intervention. None of them are fixed by "try harder."

## The structured conversation

If the diagnostic points to motivation, you don't ambush. You schedule a one-hour conversation. Three parts:

**Part 1, Name the gap (5 min)**
*"I've noticed [specific behaviour]. I want to understand it. I'm not in a hurry, I want to listen."*

**Part 2, Listen (40 min)**
Mostly silent. Ask "and what else?" three times before you respond.

**Part 3, Decide together (15 min)**
*"Here's what I heard. Here's what I'm willing to change. Here's what would need to change on your side. Do we have a path?"*

If there's a path: write it down, set a check-in date, both sign.
If there isn't: name it. *"It sounds like the right move is for us to part ways well, on a planned timeline. Let's talk about that."*

Either is a leadership outcome. Pretending nothing is wrong is not.

## Sheng Reality Check

> *Si kila underperformance ni "they don't care." Sometimes ni hawajui, sometimes ni hawawezi, sometimes ni hawapendi. Diagnose. Treat. Repeat.*

## Action Item

1. Identify **one** team member currently under-delivering.
2. Schedule a 30-minute conversation. Walk through the **3 Whys** in order.
3. Decide where the root sits.
4. Pick the matching fix. Execute within 7 days.
5. Schedule a 14-day check-in **before** you leave the room.

## What's Next

Module 5, the final module of Leading, scales up from interpersonal to systemic. When the friction in your community is structural, not personal, you need the **Advocacy Funnel**. We close the course there.
`,
      },
      {
        title: 'Leading Systems, The Advocacy Funnel + Sheria ya Vijana',
        description: 'When the friction is structural, not personal, convert local pain into a targeted advocacy strategy.',
        minutes: 100,
        objectives: [
          'Move from "local friction" to "policy diagnosis" to "advocacy strategy"',
          'Identify which Sheria ya Vijana provisions are load-bearing for your work',
          'Build a one-page advocacy plan with stakeholders, tactics, and milestones',
        ],
        keywords: ['advocacy', 'policy', 'systems', 'Sheria-ya-Vijana'],
        content: `# Leading Systems, The Advocacy Funnel + Sheria ya Vijana

## The transition

You can run Self perfectly (Module 1), calibrate weekly (Module 2), be a Youth Advocate (Module 3), and diagnose your team flawlessly (Module 4), and *still* be defeated by the structure your community operates in.

When the problem is **structural**, the answer is **advocacy**. Not a hashtag. Not a townhall. A funnel.

## The Advocacy Funnel

\`\`\`
   LOCAL FRICTION
        ▼
   ROOT-CAUSE SYNTHESIS
        ▼
   TARGETED ADVOCACY STRATEGY
        ▼
   POLICY MOTION
\`\`\`

### Stage 1: Local Friction
You observe a recurring pain in your community. Specific. Repeatable. Numbered.

> *"In our ward, 11 of the 14 youth-led food businesses we've worked with were shut down in the last 18 months for sanitation-permit issues that took 6+ months to resolve."*

Not "youth are struggling." Specific friction.

### Stage 2: Root-Cause Synthesis
Apply Course 1 Module 3, the Root/Fruit tree, at community scale. What's the trunk? What's the root?

> *Trunk: The county sanitation-permit pathway has no fast-track for low-risk food businesses.*
> *Root: The county finance act treats all food businesses identically, a tea kiosk faces the same review depth as a hotel.*

You now know what kind of intervention will work and what won't. A training programme on hygiene won't fix this. A policy amendment to the county finance act might.

### Stage 3: Targeted Advocacy Strategy
This is where most well-intentioned campaigns fail. They have a problem and outrage, but no **target**, no **vehicle**, and no **timeline**.

A targeted strategy answers:

- **Who** specifically can change this? (A named office holder, a committee, a specific clerk.)
- **What** would they have to do? (Amend a clause, issue a directive, fast-track a category.)
- **When** is their decision window? (Budget season? Committee meeting? Re-election cycle?)
- **What evidence** would move them? (Numbers, stories, a coalition, a court ruling.)
- **What tactic** delivers the evidence? (Memorandum, briefing, public hearing, op-ed, organized testimony.)

If you can't fill all five, you don't have a strategy. You have a feeling.

### Stage 4: Policy Motion
Execution. The campaign runs. You measure. You adapt. Real campaigns take 6 months to 3 years. Pace yourself.

## Sheria ya Vijana, the legal scaffolding

You cannot lead youth systems work without knowing the legal frame. Sheria ya Vijana isn't a single act, it's the constellation of laws and policies that shape youth life:

- **The Constitution (2010)**, Article 55 explicitly directs the State to take measures to ensure youth access to relevant education and training, employment opportunities, political participation, and protection from harmful cultural practices.
- **The Youth Enterprise Development Fund Act**, defines a financing pathway specifically for youth.
- **Access to Government Procurement Opportunities (AGPO)**, reserves 30% of all public procurement for youth, women, and persons with disabilities.
- **County Youth Policies**, most counties have one; few have implementation budgets. This gap is the advocacy frontier.
- **Sectoral acts**, Labour, Public Health, Trade Licensing, County Finance Acts, these are where most actual frictions sit.

### The literacy test
Can you, right now, name the law or policy provision that is **load-bearing** for your work? If your venture or campaign quietly depends on AGPO 30%, you should be able to recite that provision. If you can't, you don't own your work yet, you're being carried by something you can't name.

## The "Kapanga" Move

In Kenyan political shorthand, *Kapanga* refers to operators who hold quiet influence over outcomes, chiefs of staff, committee clerks, senior advisors, the *Kapanga* who decides whose memo reaches the principal's desk.

Serious advocacy targets the *Kapanga* as much as the principal. A 15-minute briefing with the right *Kapanga* can move a policy faster than three years of public campaigning.

Identify the *Kapanga* for every advocacy target. Build a relationship before you have an ask.

## The one-page advocacy plan

After this course, write a one-page plan with these sections:

\`\`\`
1. LOCAL FRICTION (1 paragraph, with numbers)
2. ROOT CAUSE (1 paragraph)
3. TARGETED CHANGE
     Who can change it: ____________
     What they'd have to do: ____________
     Decision window: ____________
4. EVIDENCE NEEDED: ____________
5. TACTICS (3 max): ____________
6. COALITION (who joins you): ____________
7. TIMELINE: 30 / 90 / 180 days
8. MILESTONES (3): ____________
9. LEGAL ANCHOR (which Sheria ya Vijana provision is your scaffolding): ____________
\`\`\`

Bring it to Course 3, we'll deepen it.

## Sheng Reality Check

> *Personal kuwekewa direct hata na boss yako ni rahisi. Kupiga vita system bila plan ni kuipa kichapo bure. Funnel ndo strategy. Sheria ya Vijana ndo silaha. Kapanga ndo door.*

## Capstone Action Item

1. Pick one structural friction you've observed.
2. Run it through all four stages of the funnel.
3. Identify the Sheria ya Vijana / policy provision that scaffolds your work.
4. Identify one *Kapanga* you need to know.
5. Write the one-page plan above.

## You've completed The Youth Leadership Blueprint

You now have:
- A diagnosis of your own internal OS (Module 1)
- A weekly calibration system (Module 2)
- A model for interpersonal calibration and conflict (Module 3)
- A diagnostic for team friction (Module 4)
- A funnel for systemic friction (Module 5)

The next course, **The Advocacy Impact Engine**, goes deep on Stage 3 of the funnel. We'll turn that one-page plan into a multi-phase campaign.
`,
      },
    ],
  },

  // =========================================================================
  // COURSE 3: The Advocacy Impact Engine
  // =========================================================================
  {
    title: 'The Advocacy Impact Engine',
    description: 'A master framework that bridges business innovation with systemic policy influence. Use your venture as empirical proof to policymakers.',
    overview: 'Four phases for serious advocacy that gets policy moved. We diagnose hidden policy failures, assemble the human engine, build a stakeholder playbook (lawmakers, Kapanga), and execute through a five-step chronological pipeline. The output is regulatory change, not awareness.',
    category: 'Civic Participation',
    difficulty_level: 'advanced',
    estimated_duration_hours: 16,
    prerequisites: ['Course 2: Youth Leadership Blueprint (or equivalent advocacy experience)', 'An identified local friction with policy roots'],
    learning_outcomes: [
      'Map a market symptom to its underground policy failure',
      'Build an internal human engine using the EET operational matrix',
      'Align a business advocacy strategy with Sheria ya Vijana drivers',
      'Move "Kapanga" stakeholders, not just principals',
      'Run a five-step advocacy pipeline from issue identification to review',
      'Use a live product or service as empirical proof to policymakers',
    ],
    modules: [
      {
        title: 'Phase 1, Diagnosis & Ideation: Symptoms to Underground Policy Failures',
        description: 'Surface market friction is the tip of the iceberg. Trace it down to the policy mechanism that caused it.',
        minutes: 105,
        objectives: [
          'Distinguish market symptoms from underground policy mechanisms',
          'Map the policy stack that touches your sector (national → county → sectoral)',
          'Identify which specific clauses are load-bearing in your problem',
        ],
        keywords: ['diagnosis', 'policy-failure', 'stakeholder-mapping'],
        content: `# Phase 1, Diagnosis & Ideation

## The principle

Markets don't fail because of "the economy." They fail because of **specific policy mechanisms**, clauses, fee schedules, licensing chokepoints, enforcement asymmetries, that nobody talks about because they're three layers below the visible problem.

This module trains the discipline of **drilling down**.

## Surface symptoms vs. underground mechanisms

| Surface symptom | Underground mechanism (often) |
|---|---|
| "Young people can't get loans" | Banking regs treat informal income as un-creditworthy; no alternative scoring exists |
| "Kiosks keep closing" | Permit costs are flat-rate, not tiered by revenue scale |
| "Few female founders" | Property-titling and inheritance norms collateralize male founders only |
| "Youth-led businesses can't scale" | AGPO 30% procurement reservation is unenforced county-by-county |
| "Climate startups can't get funding" | Carbon-credit rules require formalization most early ventures can't afford |

The pattern: **every visible market dysfunction has a regulatory shadow.** Your job is to find it.

## The drilling protocol

For your chosen friction, drill in five questions:

### Q1: What is the visible market symptom?
Be specific. *"Of 30 youth-led food businesses in my ward, 21 closed in 18 months. Average reason: cashflow gap during permit renewal."*

### Q2: What is the immediate operational cause?
*"Permit renewal takes 4 to 6 months and costs KES 22,000."*

### Q3: What regulation governs that operation?
*"The County Trade Licensing Act, Section 7, sub-3."*

### Q4: What's broken about that specific clause?
*"It applies the same renewal review depth to a tea kiosk as to a 5-star hotel."*

### Q5: What would the *minimum sufficient* policy change look like?
*"Tier the renewal pathway by previous-year revenue: under KES 500k → 30-day fast-track at KES 5,000. Above → existing pathway."*

Now you have a **diagnosis precise enough to advocate around**. Not "youth need help." A specific clause, a specific change, in a specific act.

## The policy stack you must map

Every venture or campaign operates in a stack. Know all four layers:

1. **Constitutional**, what the Constitution requires (e.g., Article 55 on youth)
2. **National statute**, Acts of Parliament (e.g., Public Procurement Act → AGPO 30%)
3. **Sectoral regulation**, sector ministries' regulations (Trade, Health, Labour, ICT)
4. **County instruments**, Finance Acts, County Trade Licensing Acts, County Youth Policies

Most live frictions sit in layers 3 and 4. Most attention goes to layer 2. **The advocacy edge is in being literate at layer 3 and 4 while your peers are still arguing about layer 2.**

## Worked example: the EET sector

A youth-led EdTech wanting to deliver vocational training:

| Layer | Relevant instrument | Load-bearing clause |
|---|---|---|
| Constitution | Art. 55 (youth) | Right to relevant training |
| National | TVETA Act | Accreditation pathway for training providers |
| Sectoral | Ministry of Education regs | Curriculum mapping requirements |
| County | County Youth Policy + County Finance Act | Implementation budget allocation |

A founder who knows only Art. 55 will fundraise on rhetoric. A founder who knows the TVETA accreditation pathway and the county Finance Act allocation can advocate for both regulatory and budgetary movement. That founder gets policy support, not just sympathy.

## Sheng Reality Check

> *Mtaani wanasema "siasa imeharibu biz." Ukweli ni ya specific section ya specific act imekuvuruga. Find it. Name it. Then we can move it.*

## Action Item

For your chosen friction:

1. Walk through Q1, Q5.
2. Map the policy stack: which clause in which act in which layer is load-bearing?
3. Draft the **minimum sufficient policy change** as a single sentence.

This sentence is the seed of your advocacy strategy. We carry it through the rest of the course.

## What's Next

Phase 2, The Human Engine. The strategy is only as good as the team running it. We turn the EET framework into an *operational matrix* for advocacy work.
`,
      },
      {
        title: 'Phase 2, The Human Engine: Internal Leadership + EET Matrix',
        description: 'Strategy is downstream of team. Run the EET framework as an operational matrix for your advocacy crew.',
        minutes: 90,
        objectives: [
          'Assemble the four roles every serious advocacy team needs',
          'Run the EET framework as an operational team matrix (not just personal)',
          'Define ecosystem influence rings (Core / Allies / Witnesses)',
        ],
        keywords: ['team-building', 'EET-matrix', 'ecosystem'],
        content: `# Phase 2, The Human Engine

## The premise

Advocacy strategies don't fail from bad logic. They fail from bad teams. The wrong people, in the wrong roles, with too much overlap or too many gaps. This module is about engineering the human substrate.

## The four roles every advocacy team needs

You don't need four people. You need four roles **assigned and accountable**, sometimes overlapping in a small team. But every role must exist.

### 1. The Diagnostician
Owns the policy stack. Reads acts, regulations, gazette notices. Can articulate the load-bearing clause and the minimum sufficient change.

### 2. The Convenor
Owns the human network. Knows who to call. Builds the coalition. Manages the *Kapanga* relationships from Module 5 of the Leadership Blueprint.

### 3. The Storyteller
Owns the narrative. Translates the diagnosis into language that moves rooms, testimony, op-eds, social, briefings. Without this person, the diagnosis dies on a Notion page.

### 4. The Operator
Owns the execution rhythm. Tracks deadlines, follows up, confirms attendance, captures decisions in writing. Without this person, the strategy melts on contact with reality.

**Common failure modes:**

| Missing role | What happens |
|---|---|
| No Diagnostician | Strategy is loud and vague; gets dismissed in committee |
| No Convenor | Brilliant strategy with no door into the building |
| No Storyteller | Door opens, room loses interest in three minutes |
| No Operator | Three months in, you've missed two budget cycles |

## Running EET as a team matrix

In Course 1 we treated E.E.T. (Education, Training, Empowerment) as a personal audit. At team scale, it's an operational matrix.

| Role | Education focus | Training focus | Empowerment focus |
|---|---|---|---|
| Diagnostician | Reads acts, attends committee sittings | Drafting briefs, statistical analysis | Defends diagnosis in hostile rooms |
| Convenor | Maps the ecosystem | Relationship-building rhythm | Asks for time from senior figures |
| Storyteller | Studies precedent successful campaigns | Writing, media, design | Speaks publicly, on the record |
| Operator | Knows the calendar of governance | Project management, comms tools | Holds the team accountable, including the lead |

Audit your team weekly: where's the weakest cell in the matrix? That's your hiring or training priority for the month.

## Ecosystem influence, the three rings

\`\`\`
       ┌───────────────────────┐
       │      WITNESSES        │
       │  (broad public,       │
       │   sympathetic media,  │
       │   adjacent CSOs)      │
       │   ┌───────────────┐   │
       │   │   ALLIES      │   │
       │   │ (coalition,   │   │
       │   │  funders,     │   │
       │   │  experts)     │   │
       │   │   ┌───────┐   │   │
       │   │   │ CORE  │   │   │
       │   │   │ (you, │   │   │
       │   │   │ 3-7   │   │   │
       │   │   │ ppl)  │   │   │
       │   │   └───────┘   │   │
       │   └───────────────┘   │
       └───────────────────────┘
\`\`\`

### Core (3 to 7 people)
The people who hold the strategy, the secrets, the calendar. Total trust. Meets weekly. Decisions live here.

### Allies (15 to 50 people)
Coalition members. Funders. Domain experts. They lend reputation, budget, or expertise. Meet monthly. They get briefed, not consulted on every decision.

### Witnesses (hundreds, thousands)
The public who will notice when the campaign breaks through. They're not strategy partners. They're the audience. They get the *outputs* (op-ed, social, public hearing testimony).

### The error
Most young advocates collapse all three rings into one. Everyone is in the WhatsApp group. Strategy leaks. Trust corrodes. Decisions take 40 messages. Build the rings deliberately.

## The Core covenant

Before you begin, write a one-page **Core Covenant**:

- Who is in the Core?
- What's the decision rule? (Consensus? Majority? Coordinator decides?)
- What's confidential vs. shareable to Allies vs. shareable to Witnesses?
- What's the rhythm? (Weekly meeting? Sunday note?)
- How does someone exit the Core gracefully if needed?

This document prevents 80% of the relational fractures that kill campaigns.

## Sheng Reality Check

> *Strategy bila team ni planning fiction. Team bila roles wazi ni group chat ya stress. Define wapi kila mtu yuko, na rings za influence, Core, Allies, Witnesses.*

## Action Item

1. Map your current advocacy team into the **four roles**. Identify gaps.
2. Audit the **EET matrix**. Where's the weakest cell?
3. Define your **three rings** by name. Who is Core? Allies? Witnesses?
4. Draft the **Core Covenant** in one page.

## What's Next

Phase 3, The Playbook. Now that we have a diagnosis and a team, we build the actual stakeholder map and tactical playbook. This is where Sheria ya Vijana, lawmakers, and Kapanga relationships become a *plan*, not a hope.
`,
      },
      {
        title: 'Phase 3, The Playbook: Lawmakers, Sheria ya Vijana, "Kapanga" Stakeholders',
        description: 'Convert diagnosis + team into a stakeholder map and tactical plan. Move lawmakers, and the Kapanga who guard the door.',
        minutes: 110,
        objectives: [
          'Build a Power × Interest stakeholder matrix for your campaign',
          'Map Sheria ya Vijana provisions to specific advocacy levers',
          'Identify Kapanga relationships and approach them correctly',
          'Sequence outreach to maximize movement and minimize wasted asks',
        ],
        keywords: ['stakeholder-mapping', 'lawmakers', 'Kapanga', 'tactics'],
        content: `# Phase 3, The Playbook

## The matrix

You cannot influence everyone. You must choose. The Power × Interest matrix forces the choice.

\`\`\`
                    Interest in your issue →
                    LOW             HIGH
              ┌──────────────┬─────────────────┐
       HIGH  │  KEEP        │    ENGAGE       │
              │  SATISFIED   │    CLOSELY      │
Power ↑       │ (don't       │  (your primary  │
              │  antagonize) │   targets)      │
              ├──────────────┼─────────────────┤
       LOW   │  MONITOR     │   KEEP          │
              │  (light      │   INFORMED      │
              │   touch)     │  (your base)    │
              └──────────────┴─────────────────┘
\`\`\`

### Engage Closely, your primary targets
High power, high interest. They can move the policy AND they already care. Pour your energy here. Build the deepest relationships. Provide the highest-quality briefings.

### Keep Satisfied, defensive engagement
High power, low interest. They could veto. Don't antagonize. Brief them lightly. Make sure they hear your story from you, not from your opponents.

### Keep Informed, your base
Low power, high interest. The CSOs, the affected community, the sympathetic press. They amplify your story. Give them content they can use. Don't ask them for things they can't deliver.

### Monitor, light touch
Low power, low interest. Light periodic touch. Don't waste your time, but don't disappear either, interest can change.

## Mapping Sheria ya Vijana to levers

Every advocacy strategy must answer: **which legal provision do I anchor to, and which lever does it pull?**

Examples from the Kenyan stack:

| Sheria ya Vijana provision | Lever it unlocks |
|---|---|
| Constitution Art. 55 (youth) | Constitutional duty argument, high in courts, medium in committees |
| Public Procurement Act §157 (AGPO 30%) | Procurement reservation enforcement, county-by-county leverage |
| Youth Enterprise Development Fund Act | Direct financing channel, affects programme design |
| County Youth Policy (where it exists) | Budget allocation argument, Finance Act amendments |
| County Trade Licensing Acts | Direct regulatory amendment, fastest local wins |

**Question for every campaign:** if you got a court ruling, would that move it? If you got a committee chair, would that move it? If you got a county Finance Act amendment, would that move it? The answer tells you which level to anchor.

## The Kapanga doctrine

(*Kapanga* is shorthand for the operators who quietly control access and pace, chiefs of staff, committee clerks, senior advisors.)

### Why Kapanga matter
A senator who supports your cause but whose Kapanga has never heard your name will... eventually get to your memo. Maybe. After the budget passes. After the recess.

A Kapanga who has been briefed, who trusts you, who knows your stat, moves your file to the top of the principal's pile. Quietly. Reliably.

### Approaching Kapanga correctly

**Don't:**
- Show up with the full ask on first meeting
- Treat them as a gatekeeper to be charmed past
- Pitch them like you're pitching the principal
- Skip them and go around them (worst possible move)

**Do:**
- Build the relationship before you have an ask
- Treat them as the substantive expert they often are (Kapanga frequently know the policy stack better than the principal)
- Bring them quality work, briefs, data, drafts, so they can look good when they brief up
- Acknowledge their work. *"Senator Z mentioned the report you put together last quarter, that framing helped us think."*

### The Kapanga ladder

Map, for every primary target, the Kapanga chain:

\`\`\`
   YOU
    ▼
   Personal Assistant (calendar gatekeeper)
    ▼
   Policy Advisor / Chief of Staff (substantive gatekeeper)
    ▼
   Committee Clerk (legislative gatekeeper)
    ▼
   PRINCIPAL (the decision)
\`\`\`

Build relationships at each rung. The Personal Assistant gets you on the calendar. The Policy Advisor decides whether your briefing reaches the principal's reading pile. The Committee Clerk decides whether your draft language survives mark-up.

## Sequencing, the order matters

Don't approach in random order. The right sequence:

1. **Witnesses first**, build a base of evidence and sympathetic public visibility. This is what serious targets check before agreeing to meet.
2. **Allies next**, secure coalition. A campaign with one founder is a complaint. A campaign with 12 organizations is a movement.
3. **Kapanga at primary targets**, substantive briefings. Build trust, not asks.
4. **Primary targets**, the formal meeting with the principal. By this point, the Kapanga has already pre-sold your story.
5. **Defensive engagement**, Keep Satisfied stakeholders briefed so they aren't surprised when the principal moves.

Most amateur campaigns reverse this order. They go straight to the principal. They get a polite meeting. Nothing moves.

## Sheng Reality Check

> *Power × Interest = nani anaweza na nani anataka. Kapanga ndio wenye njia. Bila wao, even the warmest senator inakuwa polite ghosting. Build the ladder mapema.*

## Action Item

1. List **all stakeholders** for your campaign. Plot each on the Power × Interest matrix.
2. For each primary target, **map the Kapanga ladder**.
3. Identify your **legal anchor**, which Sheria ya Vijana provision is your scaffolding?
4. Write your **sequencing plan** for the next 90 days.

## What's Next

Phase 4, Execution & Evolution. We turn the plan into a campaign that uses your live product or service as **empirical proof** to policymakers. This is what separates serious advocacy from awareness work.
`,
      },
      {
        title: 'Phase 4, Execution & Evolution: Business-as-Proof',
        description: 'Launch the campaign. Use your live venture as empirical proof to policymakers. Adapt as evidence accumulates.',
        minutes: 95,
        objectives: [
          'Use a live product/service as evidence in advocacy',
          'Translate operational metrics into policy-grade arguments',
          'Adapt the campaign without losing strategic coherence',
        ],
        keywords: ['execution', 'business-as-proof', 'campaigning'],
        content: `# Phase 4, Execution & Evolution

## The doctrine: business as empirical proof

The single most underused asset in youth advocacy is the campaigner's own venture. If you operate a real product or service in the policy-affected space, your **operational data** is the most powerful argument you have.

Policymakers can dismiss surveys. They struggle to dismiss revenue, cost, and behavioural data from a live operation.

### Why operational data wins

| Argument type | How it lands |
|---|---|
| "Youth need help" | Sympathy. Forgotten in 48 hours. |
| "60% of youth report struggle" | Survey scepticism. "Methodology?" |
| "Our 28-business pilot shows permit costs consume 14% of revenue" | Specific. Defensible. Re-quotable in committee. |
| "When we automated permit-readiness, 6-month survival went 27% → 82%" | Counterfactual evidence. Policy implication obvious. |

Your venture is a **policy experiment** whether or not you intended it to be. Treat it as one. Track the metrics that will be your future evidence.

## The execution rhythm

Campaigns are not events. They are rhythms. The serious advocacy team runs three loops simultaneously:

### Loop 1: Operational (Weekly)
You're still running a venture. Customers, deliveries, payroll. This loop runs whether or not the campaign is active. The data it generates is your fuel.

### Loop 2: Campaign (Bi-weekly)
The Core meets. Reviews the past 14 days: what was the diagnostic update, who did the team meet, what evidence accumulated, what's the next tactical move? Decisions are captured.

### Loop 3: Strategic (Quarterly)
The Core + key Allies meet. Step back. Is the diagnosis still right? Is the policy window still open? Has the stakeholder landscape shifted? Do we pivot tactics or hold?

Most failed campaigns run only Loop 2, they're tactically busy and strategically blind.

## Tactical moves and when to use them

| Tactic | When it works | When it backfires |
|---|---|---|
| **Memorandum / Policy Brief** | When you need to get on the formal record and arm Kapanga with a citable document | When the team isn't fluent enough to defend it in committee |
| **Op-ed** | Public visibility moment, early in the campaign or just before a key decision | When the principal hates being pressured in public |
| **Public Hearing Testimony** | When a committee is taking submissions and you have a tight, evidence-loaded 3-minute statement | When the hearing is performative, wastes the team's best moment |
| **Direct Briefing** | When you have the relationship and the principal has decision authority | If you skip it and rely on op-eds only |
| **Court Action** | When the policy violates a clear constitutional or statutory provision and political channels are closed | As a first move, burns relationships permanently |
| **Coalition Letter** | To prove breadth of support; signed by 8 to 20 orgs | If signed by people who haven't actually read it |

## Evolving the campaign

Evidence accumulates. The landscape moves. The discipline is to **adapt tactics while preserving strategic intent**.

What you don't change mid-campaign:
- The diagnosis (Phase 1), unless you genuinely got it wrong
- The minimum sufficient policy change, unless a new pathway opens

What you do change:
- Tactics that aren't producing movement
- Stakeholder priorities as their interest shifts
- Public framing as the news cycle moves
- Team roles as people's capacity changes

### The "kill criterion"

Before you launch, define a **kill criterion**, what would tell you the campaign isn't working and you should redirect?

Examples:
- "After 6 months of engagement, no scheduled meeting with the Committee Chair → we shift to coalition + court route."
- "If our load-bearing clause becomes politically attached to a controversy unrelated to youth, we pause and re-frame."

Without a kill criterion, you'll run a dying campaign for two extra years.

## When a win lands

If the policy moves, two final disciplines:

1. **Implementation watch.** Most policy wins are paper wins. The County Finance Act amendment passes, and the county licensing office doesn't update its workflow for 18 months. Your campaign isn't done. You shift from advocacy to implementation monitoring.
2. **Capture the playbook.** Write down what worked, what didn't, who moved when, what evidence was decisive. This is your contribution to the next generation of youth advocates. Many won't write it. You will.

## Sheng Reality Check

> *Hatuandiki memos bure. Tunatumia biz yetu as the proof. Real numbers, real customers, real cost. Policy makers wanachoka na "surveys", wanaheshimu data ya operations.*

## Action Item

1. Define the **3 to 5 operational metrics** from your venture that double as advocacy evidence. Begin tracking them deliberately if you aren't already.
2. Choose **three tactics** appropriate to your current campaign stage (early / mid / late).
3. Write your **kill criterion** in one sentence.
4. Sketch the **three loops** (Operational / Campaign / Strategic) with cadence and owner.

## What's Next

Final module, the five-step **Chronological Pipeline** that ties Phases 1 to 4 into a deployable sequence you can run, in order, the moment this course ends.
`,
      },
      {
        title: 'The Chronological Pipeline, A 5-Step Deployment Sequence',
        description: 'Synthesis. Tie the four phases into a single deployable pipeline you can run from Monday morning.',
        minutes: 80,
        objectives: [
          'Sequence advocacy work into 5 stages from Issue Identification to Review',
          'Set milestones, owners, and timelines for each stage',
          'Build a one-page campaign canvas',
        ],
        keywords: ['pipeline', 'deployment', 'milestones', 'review'],
        content: `# The Chronological Pipeline

## The five steps

A serious campaign moves through five stages, in order. Skipping any of them or running them in the wrong order is the most common failure pattern.

\`\`\`
   01. ISSUE IDENTIFICATION
        ▼
   02. STAKEHOLDER MAPPING
        ▼
   03. MESSAGE DEVELOPMENT
        ▼
   04. TACTIC DEPLOYMENT
        ▼
   05. REVIEW & ADAPT
        │
        └── (back to 01 or 03 as needed)
\`\`\`

### 01. Issue Identification
*(Course 3 Phase 1 work)*

You drilled from market symptom to underground policy mechanism. You wrote the **minimum sufficient policy change** in one sentence.

**Done when:** a third party could read your one-page diagnosis and explain the specific clause to a colleague.

### 02. Stakeholder Mapping
*(Course 3 Phase 2 + 3 work)*

You assembled the Core. You mapped Power × Interest. You built the Kapanga ladders for primary targets.

**Done when:** every primary target has a named relationship owner on your team and a documented Kapanga path.

### 03. Message Development
*(Course 3 Phase 4 preparation)*

You translated diagnosis into language for three audiences:

- **For the principal:** a 90-second framing of why this matters and what they should do
- **For Kapanga:** a 5-page brief with diagnosis, evidence, legal anchor, draft language
- **For Witnesses (public):** a 250-word op-ed-ready story with one number, one face, one ask

**Done when:** you can deliver each of these three from memory, on demand.

### 04. Tactic Deployment
*(Course 3 Phase 4 execution)*

You ran the campaign rhythm, Operational / Campaign / Strategic loops. You deployed memos, briefings, hearings, op-eds in the right sequence for the right audiences.

**Done when:** you hit a defined milestone, a meeting confirmed, a clause amended, a regulation issued, *or* your kill criterion triggers.

### 05. Review & Adapt
*(closes the loop)*

The campaign generated outcomes, wins, losses, or stalemates. The Core sits down and runs a **structured retrospective**:

- What worked, and why?
- What didn't, and why?
- What did we learn about the stakeholder landscape we didn't know going in?
- Should we return to Step 01 (the diagnosis was incomplete) or Step 03 (the diagnosis was right, the message wasn't landing)?

The pipeline doesn't end. It cycles. **The most experienced youth advocates have run this pipeline 4 to 6 times across different issues by the time they're 30.** Each cycle they get faster.

## The campaign canvas (one page)

Distill everything onto one page. Print it. Pin it next to your desk.

\`\`\`
CAMPAIGN: _____________________________________________________
LEAD: _______________________   CORE TEAM: _____________________

01 ISSUE
   Surface symptom:   ______________________________________
   Underground cause: ______________________________________
   Min. sufficient change: __________________________________
   Legal anchor (Sheria ya Vijana clause): ___________________

02 STAKEHOLDERS
   Primary target(s) (Engage Closely): ______________________
   Kapanga ladder owner(s): _________________________________
   Coalition (Allies): _____________________________________
   Witnesses base: _________________________________________

03 MESSAGE
   For principal (90s):  ____________________________________
   For Kapanga (brief):  ____________________________________
   For public (250w):    ____________________________________

04 TACTICS (sequenced, next 90 days)
   Week 1 to 2:   __________________________________________
   Week 3 to 6:   __________________________________________
   Week 7 to 12:  __________________________________________

05 REVIEW
   Next review date: _________________
   Kill criterion:    _________________
\`\`\`

If you can't fill this canvas, you don't have a campaign yet. You have intention. The discipline of this course is to convert intention into a runnable pipeline.

## The 30 / 90 / 180 day targets

Set three time-bound checkpoints:

- **30 days:** Diagnosis complete. Core assembled. First two Kapanga briefings done.
- **90 days:** First evidence package delivered. Coalition signed up. Primary target meeting confirmed.
- **180 days:** First public moment (hearing testimony, op-ed, or briefing). Decision window analysed. Kill criterion not yet triggered.

If you're significantly behind any milestone, you have a structural problem, not a pace problem. Stop. Review. Adapt.

## Sheng Reality Check

> *Five steps. Sio four. Sio six. Identify, map, message, deploy, review. Bila step ya review, the campaign inakua circular tour ya frustration.*

## Capstone Action Item

1. Fill out the **one-page campaign canvas** for your current issue.
2. Define **30/90/180-day milestones** with named owners.
3. Schedule your **first quarterly Strategic Review** before you leave today.
4. Identify the **first three Kapanga briefings** for the next 30 days.

## You've completed The Advocacy Impact Engine

You now have:
- A diagnostic engine for surfacing underground policy mechanisms (Phase 1)
- A human engine, roles, EET matrix, rings of influence (Phase 2)
- A stakeholder playbook with Sheria ya Vijana anchors and Kapanga ladders (Phase 3)
- An execution rhythm using business-as-proof (Phase 4)
- A deployable five-step pipeline (this module)

Now the work begins. The next course, **Diagnosing Impact**, gives you the M&E discipline to prove your cure with empirical, unassailable data.
`,
      },
    ],
  },

  // =========================================================================
  // COURSE 4: Diagnosing Impact, Proving the Cure
  // =========================================================================
  {
    title: 'Diagnosing Impact, Proving the Cure',
    description: 'Evidence-based project design. Transform messy qualitative field realities into empirical, unassailable data.',
    overview: 'Five modules of M&E discipline for serious youth changemakers. We use the Iceberg of Visibility, run the 5 Whys descent, sort failures with Fishbone, design the Results Chain, pick signal-over-noise KPIs, and close the feedback loop. The output is a project that can defend its own claims to a sceptical funder, regulator, or community.',
    category: 'Climate Advocacy',
    difficulty_level: 'advanced',
    estimated_duration_hours: 15,
    prerequisites: ['Course 3: Advocacy Impact Engine (or equivalent M&E exposure)', 'A live or planned intervention you need to measure'],
    learning_outcomes: [
      'Use the Iceberg of Visibility to distinguish events from underlying structures',
      'Run a 5 Whys descent to find the Core Intervention Point',
      'Sort failure vectors using the Fishbone (Ishikawa) diagram',
      'Build a Results Chain from Inputs to Impact',
      'Select 3 to 5 signal-over-noise KPIs that survive scrutiny',
      'Close the loop with structured end-line evaluation that seeds the next cycle',
    ],
    modules: [
      {
        title: 'The Iceberg of Visibility',
        description: 'Most of what shapes outcomes lives below the waterline. Distinguish events, patterns, and systemic structures.',
        minutes: 90,
        objectives: [
          'Sort observed phenomena into Events / Patterns / Structures',
          'Resist the trap of intervening at the Event level',
          'Build the habit of looking for the structural layer first',
        ],
        keywords: ['systems-thinking', 'iceberg', 'M&E'],
        content: `# The Iceberg of Visibility

## The model

\`\`\`
        ────────────────────────  WATER LINE  ────────────────────────

                  ▲  EVENTS  (10% visible)
                 ╱│╲   ← the one thing that happened today
                ╱ │ ╲
               ╱  │  ╲
              ╱   │   ╲
             ╱    │    ╲   PATTERNS  (the same thing, repeatedly)
            ╱     │     ╲  ← what's happened over weeks / months
           ╱      │      ╲
          ╱       │       ╲
         ╱        │        ╲   STRUCTURES  (why the patterns happen)
        ╱         │         ╲  ← policies, incentives, norms
       ╱          │          ╲
      ╱           │           ╲
\`\`\`

90% of what determines outcomes is below the water. Most M&E and most journalism live at the Events tip. Most policy lives at the Structures depth. Most useful intervention thinking lives at the Patterns layer, where you can still act, but you're not chasing every wave.

## Events

A single observation. *"Three youth-led businesses closed in our ward last month."*

Events feel urgent. They drive reactive intervention. They're often misleading because they're random sampling, sometimes you happened to look during a bad month.

**Diagnostic question:** *Is this a one-off, or have I seen this before?*

## Patterns

A repeated observation over time. *"Youth-led food businesses in our ward have a 6-month survival rate of 27%, against a sector average of 60%, consistent over 18 months."*

Patterns are where M&E earns its keep. You stop reacting to events and start *measuring* the recurring shape of reality.

**Diagnostic question:** *What recurring shape do these events together describe?*

## Structures

The underlying mechanics that *generate* the patterns. *"County-level permit costs are flat-rate regardless of business size; combined with cash-on-hand operations, this means small food businesses can't absorb permit renewal during dry-season cashflow gaps."*

Structures are slow to move but high-leverage. You don't intervene here every day; you intervene here once per campaign, but the intervention rewrites many future patterns.

**Diagnostic question:** *What rule, norm, or incentive guarantees this pattern keeps appearing?*

## Why the iceberg matters for M&E

Each layer demands a different measurement strategy.

| Layer | Measurement type | Example metric |
|---|---|---|
| Events | Real-time counts | "5 businesses closed this week" |
| Patterns | Time-series, baselines, cohort tracking | "6-month survival rate by founding cohort" |
| Structures | Policy analysis + counterfactual | "After permit-tier amendment, year-2 survival of cohort B vs A" |

Funders often demand Event metrics ("how many youth did you reach?"). Serious M&E reports the Pattern layer ("what changed about the cohort's trajectory?") and, where possible, the Structural layer ("what changed about the rules they operated under?").

## The discipline

Every time you observe a new piece of data, ask in sequence:

1. **What event did I just see?**
2. **What pattern, if any, does it fit into?**
3. **What structure produces that pattern?**

If you only answer Question 1, you're a news anchor. If you answer 1 and 2, you're an analyst. If you answer all three, you're an M&E practitioner.

## Sheng Reality Check

> *Kila event si crisis. Kila crisis si event. Pattern ndo unaona kazi. Structure ndo unaona kwa nini. Bila Q3, you'll always be putting out fires you started lighting yourself.*

## Action Item

1. Pick **one event** from the last 30 days in your work.
2. Trace it up: **what pattern does it fit into?**
3. Trace it deeper: **what structure produces that pattern?**
4. Then ask: **which layer can I afford to intervene at right now?** (Often the Pattern. Sometimes the Structure. Rarely the Event.)

## What's Next

Module 2 introduces the **5 Whys Descent**, a more rigorous, surgical way to drill from any observation down to its actionable root.
`,
      },
      {
        title: 'The 5 Whys Descent, Finding the Core Intervention Point',
        description: 'A rigorous root-cause descent. Stop at the level where action becomes possible.',
        minutes: 80,
        objectives: [
          'Run a disciplined 5 Whys descent on any operational problem',
          'Recognize when you\'ve hit the "core intervention point"',
          'Avoid the common errors that turn 5 Whys into wishful thinking',
        ],
        keywords: ['5-whys', 'root-cause', 'intervention-point'],
        content: `# The 5 Whys Descent

## The method

Originally from Toyota Production System. Deceptively simple: when you encounter a problem, ask "Why?" five times in succession. Each Why descends one layer.

## A worked example

**Problem:** *Our literacy programme has 40% drop-off between week 2 and week 4.*

> **Why?** Because attendance falls during the daytime sessions.
> **Why?** Because most attendees are also informally employed and the sessions clash with peak earning hours.
> **Why?** Because we scheduled around our facilitators' availability, not our learners'.
> **Why?** Because we recruited facilitators who could only do daytime, then built the schedule around them.
> **Why?** Because our partner funding line restricted us to facilitators hired under their training contract, who could only commit daytime hours.

You've descended from "people don't show up" to "our funder's contract structure is shaping our schedule wrong."

**The Core Intervention Point**, where action becomes possible, is at *Why 4 or 5* here. Renegotiate the facilitator contract clause OR run a parallel evening cohort with a different staffing model.

If you'd stopped at Why 1 ("attendance falls"), your intervention would have been "send more reminders." Useless.

## Where to stop

The descent isn't infinite. Stop at the level where:

1. **You can actually intervene** (not "the macro-economy"), AND
2. **The intervention would dissolve the higher layers** (i.e., fixing this *would* close the problem)

If "Why" #6 takes you into "the global geopolitical order," you've gone too deep. Back up one level.

If "Why" #2 already names something you can change, fine. Stop there. The discipline isn't to take exactly 5 steps. It's to stop at the **core intervention point**.

## Common errors

### Error 1: Asking "Why" without evidence
"Why?" demands an *answer with evidence*, not a guess. If you can't cite an interview, a metric, or a documented observation, your Why is speculation and the whole descent corrupts.

**Fix:** every Why answer should reference a source. *"Because attendance falls during daytime, per our last 8 weeks of attendance logs."*

### Error 2: Asking "Why is X happening?" instead of "What causes X?"
The first invites a story. The second invites a mechanism. Aim for mechanism.

### Error 3: Pre-deciding the answer
You can't run 5 Whys with a thesis. If you already "know" the answer is "funding," you'll force every Why to land there. Run the descent honestly. Sometimes it leads somewhere you didn't expect.

### Error 4: Doing it alone
A solo 5 Whys becomes confirmation bias. Run it with at least one other person, ideally someone from outside your team.

## The 5 Whys + Sheng

Local context check: at each layer, ask *"would someone living this problem describe it this way?"* If your answer to Why 3 sounds like a McKinsey memo, your descent has gone abstract, drag it back to language a participant would actually use.

## Compounding with the Iceberg

The 5 Whys and the Iceberg are companion tools.

- **Iceberg** sorts observations into layers.
- **5 Whys** descends through those layers with surgical precision.

Use Iceberg when you're surveying the field. Use 5 Whys when you've picked a specific problem to dissect.

## Worked example #2, climate advocacy

**Problem:** *Our smallholder farmer adaptation programme has lower female participation than designed.*

> **Why?** Because the village trainings are held on Wednesday afternoons.
> **Why?** Because that's when the chief's hall is available.
> **Why?** Because the morning is fully booked by school activities.
> **Why?** Because there's only one shared meeting space in the village.
> **Why?** Because under the County Devolution Allocation, this ward's community-infrastructure line has been unfunded for 3 years.

The Core Intervention Point: *Why 3 or 4* (find or build an alternative meeting space, or rearrange morning use), OR, *Why 5* (advocate for the devolution allocation, a longer-term play).

You now have a tactical option (alternative space) AND a strategic option (allocation advocacy). The 5 Whys gave you both.

## Sheng Reality Check

> *5 Whys si swali tu. Ni descent. Each Why lazima iwe na ushahidi. Hapo ndo "Why" inakua silaha, sio storo.*

## Action Item

1. Pick one **operational problem** in your current work.
2. Run a **disciplined 5 Whys**, with at least one external partner, and with evidence cited at each layer.
3. Identify your **Core Intervention Point**.
4. Distinguish tactical and strategic intervention options. Pick which you'll act on this quarter.

## What's Next

Module 3 introduces the **Fishbone Diagram**, when the problem isn't linear (which 5 Whys assumes) but instead involves multiple parallel causes feeding the same failure.
`,
      },
      {
        title: 'Fishbone Categorization, Sorting Failure Vectors',
        description: 'When failures have multiple parallel causes, the 5 Whys isn\'t enough. Sort them with the Ishikawa diagram.',
        minutes: 85,
        objectives: [
          'Apply the Fishbone (Ishikawa) diagram to any complex failure',
          'Use the four buckets: People / Policy / Environment / Procedures',
          'Combine Fishbone with 5 Whys for hybrid root-cause analysis',
        ],
        keywords: ['fishbone', 'ishikawa', 'root-cause', 'M&E'],
        content: `# Fishbone Categorization, Sorting Failure Vectors

## When linear isn't enough

The 5 Whys assumes a chain, one cause, deeper cause, deepest cause. Real-world failures often have **multiple parallel causes** that converge on a single failure. For these, you need a different shape: the Fishbone.

## The structure

\`\`\`
                                     ┌──────────────┐
                                     │   PROBLEM    │
                                     └──────▲───────┘
        PEOPLE            POLICY            │
           ╲                ╱               │
            ╲              ╱                │
             ╲            ╱                 │
              ╲          ╱                  │
               ╲────────╱                   │
               ╱        ╲                   │
              ╱          ╲                  │
             ╱            ╲                 │
            ╱              ╲                │
           ╱                ╲               │
      ENVIRONMENT       PROCEDURES          │
\`\`\`

Four "bones" feed the central spine. Each bone holds one **category** of cause. Each category branches into specific contributors.

The four bones we use (adapted from classic 4M / 6M Ishikawa for advocacy and youth-development work):

### Bone 1: People
Who is involved? Skill levels. Roles. Capacity. Motivation. Team composition. Stakeholder relationships.

### Bone 2: Policy
What rules govern this? Acts, regulations, organizational policies, funder requirements, sectoral norms, Sheria ya Vijana provisions.

### Bone 3: Environment
What's the operating context? Geography, weather, economic conditions, political season, security, infrastructure availability.

### Bone 4: Procedures
How is the work done? Operational workflows, data systems, communication patterns, decision rights, scheduling.

## A worked example

**Problem:** *Our policy memorandum to the County Trade Committee was not adopted.*

\`\`\`
                                  ┌───────────────────────────────┐
                                  │ Memo not adopted by Committee │
                                  └─────────────▲─────────────────┘
   PEOPLE                                       │
      • Committee chair changed mid-process     │
      • Our Convenor was traveling at key       │
        meeting; deputy briefed but lighter     │
        on history                              │
      • No relationship at Kapanga rung 2       │
                                                │
   POLICY                                       │
      • Committee operates under draft rules    │
        that don't allow externally-drafted     │
        clauses, only formal Committee staff   │
        drafts                                  │
      • Our memo referenced a competing         │
        sectoral act creating jurisdictional    │
        ambiguity                               │
                                                │
   ENVIRONMENT                                  │
      • Budget cycle moved up 4 weeks; we       │
        weren't ready                           │
      • Concurrent unrelated controversy        │
        absorbed Committee attention            │
                                                │
   PROCEDURES                                   │
      • We submitted via formal channels only;  │
        no parallel Kapanga briefing            │
      • Our follow-up cadence was monthly when  │
        it needed to be weekly during decision  │
        window                                  │
\`\`\`

Now you can see: this wasn't *one* failure. Five or six contributors stacked. **Some are fixable next time (Procedures, People), some demand strategic adjustment (Policy), some are out of your control (Environment).**

## How to run it

1. **Write the problem** crisply in the head of the fish.
2. **Brainstorm causes**, not as a list, but sorted into the four bones as you go.
3. **Push for specifics.** "Bad communication" isn't a Procedure cause. "Updates went via email, but the chair only reads WhatsApp" is.
4. **Combine with 5 Whys** on the highest-impact bone. For each major contributor, ask "Why?" twice to surface the deeper driver.
5. **Score for leverage.** Of all the causes mapped, which 2 to 3 would, if changed, prevent recurrence? Those are your interventions.

## Why this is harder than 5 Whys

Fishbone forces you to **see complexity you'd otherwise reduce away**. Most teams pick *one* favourite story for why something failed. Fishbone forces them to admit five or six factors converged.

This is uncomfortable. It also produces more durable interventions.

## A second example, programme design

**Problem:** *Our coastal adaptation training programme had only 30% completion.*

| Bone | Contributors |
|---|---|
| People | Facilitator turnover (2 left mid-cohort); attendees over-recruited (we had 60 when curriculum was designed for 35) |
| Policy | Funder reporting cadence forced us to launch before pre-tests were stabilized |
| Environment | Mid-cohort flooding closed the road for 11 days |
| Procedures | No structured make-up sessions; attendance recorded on paper not synced for 3 weeks |

The intervention that emerges: **build slack into the design**. Funder cadence forced bad launch → next round, build a 2-week pre-launch buffer into the proposal. Mid-cohort floods can't be prevented → build structured make-up sessions into the original schedule. People turnover → keep a 2-deep facilitator bench.

Same problem (low completion). Multiple compounding causes. Multiple interventions.

## Sheng Reality Check

> *Si kila failure ni "one big thing." Sometimes ni vitu tano vimekutana mahali pamoja. Fishbone inakulazimisha uone zote. Mtu mwenye anasema "the problem was X" before he's drawn the bones, wakili wa moja, sio M&E officer.*

## Action Item

1. Pick a **recent failure** (project, campaign, programme).
2. Draw the Fishbone. Fill all four bones with specific contributors.
3. Run **2-Why descents** on the top 2 contributors.
4. Identify the **2 to 3 highest-leverage interventions** to prevent recurrence.

## What's Next

Module 4 introduces the **Results Chain Blueprint**, the chronological model that turns Inputs into Impact. It's the spine of any M&E framework worth its name.
`,
      },
      {
        title: 'The Results Chain, Inputs → Activities → Outputs → Outcomes → Impact',
        description: 'The spine of any serious M&E framework. Chronological flow from resources to systemic shift.',
        minutes: 100,
        objectives: [
          'Distinguish Inputs / Activities / Outputs / Outcomes / Impact rigorously',
          'Build a Results Chain for an existing or planned intervention',
          'Identify the most common confusion: Outputs masquerading as Outcomes',
        ],
        keywords: ['results-chain', 'theory-of-change', 'logic-model', 'M&E'],
        content: `# The Results Chain Blueprint

## The five links

\`\`\`
   INPUTS ──► ACTIVITIES ──► OUTPUTS ──► OUTCOMES ──► IMPACT
   (you)      (you do)        (immediate)  (behaviour /  (systemic
                              (you make)   regulatory)   shift)
\`\`\`

Each link is fundamentally different from its neighbour. The discipline of M&E is being **precise** about which link you're measuring.

### Inputs
The resources you bring. Funding, staff time, partnerships, equipment, data, expertise.

### Activities
What you *do* with the inputs. Trainings delivered, memos drafted, meetings convened, services provided, advocacy outreach conducted.

### Outputs
What the activities **immediately produce**. The countable, deliverable artifacts. "73 youth trained," "5 policy briefs published," "12 community dialogues held," "1 mobile app shipped."

Outputs are NOT impact. They are the **evidence that the activity happened**, nothing more.

### Outcomes
The **behavioural or regulatory change** that flows from outputs. Did the trained youth start businesses? Did the briefed committee amend a clause? Did the dialogue lead to a documented community agreement? Did the app users change a behaviour?

Outcomes are **medium-term, observable changes** in the people, organizations, or systems your activities touched.

### Impact
The **long-term, systemic shift** in the condition you set out to change. Are youth in your ward measurably better employed 3 years on? Has the policy environment evolved? Has the underlying root cause weakened?

## The Output vs. Outcome trap

This is the single most common M&E failure. **Funder reports are full of Outputs reported as Outcomes.**

| Claimed as Outcome | Actually an Output | What the real Outcome would be |
|---|---|---|
| "We trained 200 youth" | Output, the training happened | "180 of 200 changed a measured workplace behaviour, sustained at 6 months" |
| "We published 5 policy briefs" | Output, the briefs exist | "3 of the 5 briefs were cited in committee proceedings or led to a clause-level engagement" |
| "We held 12 community dialogues" | Output, the dialogues happened | "Of the 12 dialogues, 8 produced a documented community-led agreement that was acted on within 90 days" |

Outputs are within your control. Outcomes require behaviour from people you don't control. That's why they're so much harder to claim, and so much more valuable when you can.

## Building a Results Chain

Start at either end. Both directions work, but each catches different errors.

### Top-down (start at Impact)
*"What systemic shift do I want in 3 to 5 years?"*
*"What Outcomes (behaviours, regulations) must occur for that Impact to be plausible?"*
*"What Outputs would generate those Outcomes?"*
*"What Activities produce those Outputs?"*
*"What Inputs do those Activities require?"*

Catches **vision drift**, the temptation to claim Impact you have no theory for.

### Bottom-up (start at Inputs)
*"Here's what I have: 3 staff, KES 2M, 6 months."*
*"Here are the Activities I can run with that."*
*"Here are the Outputs they'd produce."*
*"What Outcomes would those Outputs plausibly drive?"*
*"What Impact would those Outcomes contribute to?"*

Catches **scope inflation**, the temptation to promise Outcomes your Inputs can't support.

## A worked example

**Youth livelihoods venture (training + permit-readiness assistance):**

\`\`\`
INPUTS
  • 4 staff (2 trainers, 1 ops, 1 lead)
  • KES 3M for 12 months
  • Partnership with County Trade Office
  • Curriculum from Course 1

ACTIVITIES
  • Deliver 5-week "Builder Basics" training, 4 cohorts × 30 youth
  • Provide permit-readiness clinic for graduates
  • Track graduates' venture launch + survival monthly

OUTPUTS
  • 120 youth complete the 5-week training (with ≥80% session attendance)
  • 80 youth receive 1:1 permit-readiness clinic
  • 60 ventures formally registered

OUTCOMES (target, 6 to 12 months)
  • 65% of registered ventures still operating at 6 months
        (county baseline: 27%)
  • 50% of operating ventures meeting payroll for at least 2 employees
  • 30% have engaged with County Trade Office for renewal independently

IMPACT (target, 3 years)
  • Sustained youth-led business density in the ward measurably above
    county baseline
  • Policy: County adopts tiered renewal pathway (from our parallel
    advocacy work, Course 3)
\`\`\`

Notice: each link is **measurable** with a specific number and timeframe. Each link is **causally connected** to the next. There are no vague verbs like "support," "empower," "enable."

## When the chain breaks

If you read your chain top-to-bottom and one link doesn't plausibly produce the next, your **theory of change** is broken. Common breakages:

- **Output → Outcome** is the most common breakage. Training doesn't automatically produce behaviour change. You need an assumption: "trained youth + permit-readiness clinic + county partnership → enough scaffolding for behaviour change." Make that assumption explicit. Track it.
- **Outcome → Impact** is the next most common. Behaviour change at small scale doesn't automatically aggregate to systemic shift. You need a theory of scale: "if 65% survive in our 4 cohorts, the model is replicable to N more cohorts via Y mechanism."

Naming the breakages is the discipline. Hoping no one notices is the failure mode.

## Sheng Reality Check

> *Funders wanasema "show us impact." Hatuwezi show impact in year 1. Tunashow Outputs honestly, Outcomes with evidence, and Impact as the medium-term theory. Mtu anayeahidi Impact ndani ya 12 months ni anajidanganya, au anakudanganya.*

## Action Item

1. Build a **Results Chain** for your current intervention (any one).
2. Fill in each link with **specific numbers and timeframes**.
3. Identify your **Output → Outcome assumption**. Write it down. Decide how you'll test it.
4. Identify your **Outcome → Impact theory of scale**. Even rough is fine.

## What's Next

Module 5 closes the course: how to pick the **3 to 5 high-leverage KPIs** that survive scrutiny, and how to close the loop so end-line evaluation feeds back into the next cycle's diagnosis.
`,
      },
      {
        title: 'KPI Selection + The Feedback Loop',
        description: 'Pick the 3 to 5 metrics that matter. Close the loop so evaluation seeds the next cycle.',
        minutes: 85,
        objectives: [
          'Select 3 to 5 signal-over-noise KPIs aligned to your Results Chain',
          'Avoid the vanity metric trap',
          'Design an end-line evaluation that feeds back into the next cycle\'s diagnosis',
        ],
        keywords: ['KPIs', 'metrics', 'evaluation', 'feedback-loop'],
        content: `# KPI Selection + The Feedback Loop

## Why 3 to 5, not 30

Funders ask for everything. Programme managers oblige. M&E plans balloon. By year two, the team is spending 40% of capacity feeding the metrics machine and 60% running the programme. Nothing learns from anything.

The discipline: **3 to 5 KPIs**. Not 8. Not 15. The team must be able to recite all of them from memory. If they can't, the KPI list is broken.

## What makes a KPI worth keeping

Every KPI you keep must pass four tests:

### Test 1: Tied to the Results Chain
Does it measure an Output, Outcome, or Impact you defined? If it doesn't map to a link, drop it.

### Test 2: Actually changeable by your work
If the metric will move (or not) regardless of what you do, drop it. It's a context indicator, not a KPI.

### Test 3: Sensitive on the right timescale
If the metric only moves over 5 years, but you're reviewing quarterly, you need a closer proxy. If it twitches daily, it's noise.

### Test 4: Affordable to collect cleanly
A metric that requires a 2-day field visit per data point will be collected once and then faked. Better to pick a slightly less precise metric you can actually maintain.

## Output / Outcome / Impact KPIs, examples

For the worked example from Module 4:

| Link | Bad KPI (vanity) | Good KPI (signal) |
|---|---|---|
| Outputs | "Number of social impressions" | "Number of youth completing 5-week training with ≥80% attendance" |
| Outcomes | "Number of trained youth" (this is an output!) | "% of registered ventures still operating at 6 months" |
| Impact | "Number of lives changed" | "Sustained youth-business density in ward, vs county baseline, year-on-year" |

Notice: each "good" KPI is **specific**, **measurable**, **time-bound**, and **defensible** against a sceptical reviewer.

## The vanity metric trap

A metric is vanity when it goes up *but doesn't tell you anything actionable*.

| Vanity | Why it's vanity |
|---|---|
| Total reach / impressions | You can't tell who acted; usually grows with money spent on promotion |
| "Lives touched" | Undefined, could be anything from "saw a poster" to "completed a programme" |
| Aggregate spend | Bigger budget ≠ better outcomes |
| Number of stakeholders engaged | Engagement quality matters more than quantity |

If a metric trends upward but doesn't sharpen your decision-making, it's vanity. Drop it.

## The KPI dashboard (one page)

You should be able to read your KPIs on one page, monthly. Like this:

\`\`\`
   KPI                                  TARGET    LAST MONTH    TREND    NOTE
   ─────────────────────────────────────────────────────────────────────────────
   1. Training completion rate          ≥85%       82%           ↘         Cohort 3 sick days
   2. Venture registration rate         ≥50%       58%           ↗         Stronger than expected
   3. 6-month venture survival rate     ≥65%       67%           →         Per Cohort 1 data
   4. Independent permit renewal rate   ≥30%       12%           ↘         Major gap; investigating
   5. Funder pipeline coverage          ≥12mo      9mo           ↘         Two RFP losses
\`\`\`

Five lines. Targets, current, trend, note. **This is what M&E delivers.** Not a 40-page report.

## The Feedback Loop, closing the cycle

End-line evaluation is where most M&E projects go to die. The team writes a report. The funder reads the executive summary. Nobody changes anything. The next cohort is designed identically to the last.

The discipline: **every end-line evaluation must seed the next cycle's diagnosis.**

### Three questions every end-line must answer

1. **Where did our Outputs miss?** (And why? Fishbone or 5 Whys it.)
2. **Where did our Outputs land but our Outcomes didn't follow?** (This breaks your Output → Outcome assumption. Re-examine it.)
3. **Where did our context change in ways our chain didn't anticipate?** (New policy, new entrants, exogenous events.)

The answers go directly into the **Diagnosis** phase of the next cycle, replacing assumptions with evidence.

### The loop in practice

\`\`\`
   CYCLE 1
      DIAGNOSIS (best assumptions)
            ▼
      INTERVENTION
            ▼
      MEASUREMENT
            ▼
      END-LINE EVALUATION   ────────┐
                                    │
                                    │  (replaces assumptions
                                    │   with evidence)
   CYCLE 2                          │
      DIAGNOSIS (now evidence-led) ◄┘
            ▼
      INTERVENTION (sharper)
            ▼
      MEASUREMENT (better KPIs)
            ▼
      END-LINE EVALUATION   ────────┐
                                    │
   CYCLE 3                          │
      DIAGNOSIS (now sharper still)◄┘
\`\`\`

Each cycle, the diagnosis gets less wrong. That's the entire game.

## The retrospective ritual

End every cycle with a structured retrospective. 90 minutes. Three sections:

**Section 1 (30 min): What did the data show?**
KPIs against targets. Variance analysis. Anomalies.

**Section 2 (30 min): What did the data *not* show?**
What did we observe in the field that didn't make it into a metric? Stories, edge cases, near-misses. (Often the most valuable section.)

**Section 3 (30 min): What changes for next cycle?**
Specific design changes. Specific KPI changes. Specific assumption updates. Captured in writing. Owned by named people.

If you don't capture it in writing with owners, it didn't happen.

## Sheng Reality Check

> *Vanity metrics ni vibrations tu. Pick 3-5 KPIs ambazo zikiwa za uongo, the whole programme inakuwa uongo, ndo unajua ni real. Na bila feedback loop, kila cohort ni Cohort 1. Hutalearn kitu.*

## Capstone Action Item

1. Distil your current intervention into **3 to 5 KPIs** that pass all four tests.
2. Build the **one-page dashboard** template.
3. Schedule the **first end-line retrospective** before your next cycle starts.
4. Identify **two assumptions** from your Results Chain that the next cycle's evaluation will explicitly test.

## You've completed Diagnosing Impact

You now have the full M&E spine:
- The **Iceberg of Visibility** to sort observations
- The **5 Whys Descent** to drill to the Core Intervention Point
- The **Fishbone Diagram** to map parallel failure vectors
- The **Results Chain** to structure your theory of change
- **KPI selection + the Feedback Loop** to keep the cycle learning

Combined with Courses 1 to 3, you have the operating system, the leadership stack, the advocacy engine, and the M&E discipline of a serious youth changemaker. **The next decade of your work is to use them.**
`,
      },
    ],
  },

  // =========================================================================
  // TEXT-ONLY STANDALONE 1: Product Development Essentials
  // =========================================================================
  {
    title: 'Product Development Essentials',
    description: 'A pragmatic, 3-module primer on how to take an idea from a back-of-napkin sketch through wireframe, prototype, and launch, for youth founders who can\'t afford a 12-month roadmap.',
    overview: 'Drawn from the Product Development toolkit. Three short modules: defining the user problem with rigour, designing the minimum-viable interaction loop, and shipping iteratively without losing your sanity.',
    category: 'Business',
    difficulty_level: 'beginner',
    estimated_duration_hours: 6,
    prerequisites: ['A product or service idea you want to develop'],
    learning_outcomes: [
      'Translate a user problem into a clear product specification',
      'Run user interviews that surface real pain, not flattery',
      'Wireframe a service or app flow on a single page',
      'Ship a v0 that real users can react to within 14 days',
    ],
    modules: [
      {
        title: 'Define the Problem, User-Centred From Day One',
        description: 'Most product failures are problem-definition failures in disguise. Get this right and the rest follows.',
        minutes: 80,
        objectives: ['Write a one-sentence user problem statement', 'Conduct 5 problem interviews that surface real pain', 'Distinguish user need from user request'],
        keywords: ['product-discovery', 'user-research', 'problem-definition'],
        content: `# Define the Problem, User-Centred From Day One

## The most common product failure

It isn't "the tech didn't work" or "the funding ran out." It's "we built the wrong thing." The team had a beautiful answer to a question nobody was asking.

This module is about asking the right question.

## The one-sentence problem statement

Before you wireframe anything, write a single sentence in this shape:

> *[User type] struggles to [achieve specific outcome] because of [specific friction], which costs them [specific time / money / opportunity].*

Example:

> *Youth-led kiosk owners struggle to renew their permits on time because the County Trade Office process is opaque and requires multiple in-person visits, which costs them 3-6 weeks of trading time per renewal.*

If you can't write that sentence, you don't have a product yet. You have a vibe.

### What makes a good statement
- **Specific user.** Not "Africans." Not "small businesses." A definable, recruitable user type.
- **Specific outcome.** What they're trying to achieve, not what they "want." (They want a kiosk that doesn't close. They're trying to renew a permit.)
- **Specific friction.** The actual mechanism getting in the way.
- **Quantified cost.** What does this friction cost them in time, money, or opportunity?

If your sentence has "people," "improve," "enable," or "empower", rewrite it. Those words mean nothing.

## The 5 problem interviews

Before a single line of code or a single wireframe, do five problem interviews.

### Rules
- **Talk to the user type, not your friends.** If your friends are the users, fine. Otherwise, this is harder than you think, recruit deliberately.
- **Ask about the past, not the future.** "Tell me about the last time you renewed your permit. What did you do? Where did you get stuck?", NOT "Would you use a permit-renewal app?"
- **Listen 80% of the time.** If you're talking more than the user, you're conducting a sales pitch, not an interview.
- **Take notes verbatim.** Not your interpretation. Their exact words. (You'll see why later.)

### The interview structure (45 minutes)

| Minutes | Section | Sample prompts |
|---|---|---|
| 0 to 5 | Context | "Tell me a bit about your work. How long have you been doing this?" |
| 5 to 25 | Story | "Walk me through the last time [the problem] happened. From the very beginning. Don't skip steps." |
| 25 to 35 | Cost | "What did this cost you? Time? Money? Anything else?" |
| 35 to 40 | Workarounds | "How are you handling this today? What's working? What isn't?" |
| 40 to 45 | Wishlist (carefully) | "If you could change one thing about this, what would it be?" |

That last question is **dangerous**. Users will invent features. Take the answers as raw material, not gospel.

## Need vs. request

Users will *request* things. ("I want a dashboard." "I want notifications.") Your job is to translate requests into needs.

> *User says:* "I want notifications when my permit is about to expire."
> *Underlying need:* "I lose track of renewal deadlines and get penalised for late filing."
> *Possible solutions (you brainstorm later):* notifications, calendar integration, a once-a-month phone call, a community WhatsApp group.

The need is more durable than the request. Solve at the need level.

## After the 5 interviews

You should be able to write, with evidence, answers to:

1. What does the user actually do today? (their workaround)
2. What does this cost them today? (in their own words / numbers)
3. What's the single biggest source of friction? (cited in 3+ interviews)
4. What language do they use about it? (not your jargon, theirs)

If three or more interviews didn't surface the same kind of pain, **your problem statement is wrong**. Rewrite it. Run five more. This is not optional.

## Sheng Reality Check

> *Founder akianza coding kabla ya interviews tano, anajenga jiko ya hawa watu hajui kama wanapenda chai au coffee.*

## Action Item

1. Write your **one-sentence problem statement**.
2. Recruit **5 users** of your target type. Schedule the interviews.
3. Run the interviews. Take **verbatim notes**.
4. Review: did the same pain show up 3+ times? If yes, proceed to Module 2. If no, rewrite the statement and try again.

## What's Next

Module 2: with the problem clear, we design the minimum-viable interaction loop, the smallest possible flow that solves the real pain.
`,
      },
      {
        title: 'Design the Minimum-Viable Loop',
        description: 'Wireframe the smallest possible interaction that solves the real pain. Skateboard before car.',
        minutes: 75,
        objectives: ['Sketch a single-page wireframe of your core user flow', 'Identify the ONE moment where the user gets value', 'Cut everything that doesn\'t serve that moment'],
        keywords: ['wireframing', 'MVP', 'user-flow', 'design'],
        content: `# Design the Minimum-Viable Loop

## The one-moment principle

Every product has a single **moment of value**, the instant where the user's pain is reduced and they think *"oh, this is useful."*

For a permit-renewal app, the moment might be: *the user opens it, sees their renewal date and exactly the 3 documents required, and submits via the app in 4 taps.*

For a job-matching service, the moment might be: *the user receives a daily SMS with 2 matched opportunities and a one-tap apply.*

**Your v0 has one job: deliver that moment.** Everything else, settings, accounts, analytics, social, comes later.

## The single-page wireframe

Before you open any design tool, do this with paper:

1. Draw 3 boxes in a row.
2. Box 1: **Entry** (how does the user arrive?)
3. Box 2: **The Moment** (what do they see / do at the moment of value?)
4. Box 3: **What's next** (what comes after the moment? usually nothing for v0)

For your permit-renewal example:

\`\`\`
  ┌──────────────┐     ┌────────────────────────┐     ┌──────────────────┐
  │  SMS link    │ ──► │  Renewal screen:       │ ──► │  Confirmation +  │
  │  10 days     │     │  - Date: Mar 15        │     │  receipt SMS     │
  │  before due  │     │  - 3 docs needed       │     │                  │
  │              │     │  - "Submit" button     │     │                  │
  └──────────────┘     └────────────────────────┘     └──────────────────┘
\`\`\`

That's it. That's the wireframe. If you can't fit it in three boxes, you're building too much for v0.

## What to cut

In v0, cut everything below the line:

| KEEP | CUT FROM v0 |
|---|---|
| The one-moment delivery flow | Onboarding flow |
| The minimum data needed to deliver that moment | User accounts, profiles |
| A clear way for the user to give feedback | Settings, preferences |
| | Analytics dashboard for users |
| | Social / referral features |
| | Multi-language support |
| | Light/dark mode |
| | Anything someone added in a meeting last week |

Every cut feature is a future feature. You're not deleting forever. You're sequencing.

## The "concierge" v0

If your one-moment flow is hard to build, **don't build it yet, perform it.**

For the permit-renewal example: before building an SMS-app system, **manually** WhatsApp 10 kiosk owners 10 days before their renewal dates with the document list. See if they actually use it. If yes, automate. If no, you saved 3 months.

This is the **concierge MVP**. The user gets the experience; you do the back-end manually. It's not cheating. It's the smartest possible test.

## The flow audit

Once you have your three-box wireframe, audit:

1. **Where does the user enter?** Is the entry realistic? (Don't assume people will download an app, what gets them to it?)
2. **What's the absolute minimum they need to do at "the moment"?** Tap once? Type one field? Show an ID? Make every step earn its place.
3. **What's the success signal?** How will they know the moment delivered? (A confirmation. An SMS. A visible status change.)

If any of these three are unclear in your wireframe, you're not ready to build.

## Worked example, youth job matching

| Box | Content |
|---|---|
| Entry | User signs up via SMS keyword "JOBS" sent to a shortcode |
| The Moment | Within 24h, receives an SMS with 2 matched opportunities + "Reply 1 or 2 to apply" |
| What's next | Receives confirmation + the employer contacts within 48h |

No app. No website. No portal. SMS only. **And v0 is enough to test whether the matching is useful.** If users keep replying, you can build the app later. If they don't, no app would have saved you.

## Sheng Reality Check

> *Si lazima uoneshe Tesla on day one. Skateboard inaeleweka, inafanya kazi, na watu wanaitumia. Build skateboard kwanza.*

## Action Item

1. Identify the **one-moment** in your product flow.
2. Draw the **three-box wireframe** on paper.
3. List **5 features you will cut** from v0. Be specific.
4. Decide: build v0 or run a **concierge MVP** instead?

## What's Next

Module 3, ship v0 within 14 days, collect the right feedback, iterate. The closing module of this standalone.
`,
      },
      {
        title: 'Ship, Measure, Iterate, Without Losing Your Sanity',
        description: 'Get v0 in front of real users within 14 days. Listen with discipline. Iterate without thrashing.',
        minutes: 70,
        objectives: ['Ship v0 within 14 days of finishing Module 2', 'Define 1 to 2 metrics you\'ll watch before shipping', 'Iterate without losing strategic direction'],
        keywords: ['shipping', 'iteration', 'metrics', 'product'],
        content: `# Ship, Measure, Iterate

## The 14-day rule

Once your wireframe is done, you have **14 days** to get v0 in front of real users. Not 30. Not 60. Fourteen.

Why so tight? Because the longer you spend before shipping, the more attached you become to assumptions you haven't tested. **The work expands to fill the time available.** A 14-day window forces ruthlessness.

If 14 days feels impossible, your v0 is too big. Cut more.

## Pre-ship: define two metrics

Before you ship v0, write down two metrics, only two, that you'll watch.

| Metric type | Example for permit renewal | Example for job match |
|---|---|---|
| **Engagement** (did they interact?) | % of users who opened the SMS link | % of SMS recipients who replied to apply |
| **Outcome** (did it solve the pain?) | % who submitted permit docs through the app within the renewal window | % who got a job interview from a match |

Define your **success threshold** before you ship. ("If less than 30% engage, we have a problem with the entry point. If less than 10% see the outcome, we have a problem with the value delivery.")

**Why define before shipping?** Because after shipping, you'll rationalize any number as "encouraging." Pre-commitment kills self-deception.

## Ship it

The ship checklist:
- [ ] Three-box wireframe matches what you built (no scope creep)
- [ ] Two metrics defined with success threshold
- [ ] 5 to 10 real users recruited and ready
- [ ] A way for users to give feedback (a phone number, a WhatsApp group, anything)
- [ ] You're emotionally prepared to hear "this isn't useful"

When all five are checked: ship. Don't wait for "perfect." Perfect is a lie founders tell themselves to avoid shipping.

## Post-ship: listen with discipline

In the first 7 days after shipping:

### Day 1 to 2: Watch the data
Don't interact yet. Watch how users behave when no one is helping them. Are they finding the entry point? Are they completing the moment?

### Day 3 to 5: Talk to 3 users
Call them. Ask:
- *"Walk me through what you did when [the situation] happened. Did you remember to use [the product]?"*
- *"Where did you get stuck? Where did you get confused?"*
- *"If this disappeared tomorrow, would you notice?"*

That last question is gold. If they wouldn't notice, your product doesn't matter to them yet. Don't take it personally, it's data.

### Day 6 to 7: Synthesize
Write down:
- What worked (with evidence)
- What didn't work (with evidence)
- What you don't yet know
- What's the **single biggest fix** for the next iteration?

Pick **one fix.** Not five. The team's attention is limited; one fix done well beats five done poorly.

## Iterating without thrashing

Three rules of thumb:

### Rule 1: Don't pivot mid-test
If you change v0 every 3 days, you'll never know what worked. Let v0 run for the full 7-day learning window before you change anything substantive.

### Rule 2: Distinguish "tweak" from "pivot"
- **Tweak** = same problem, same user, same flow, different details ("change the SMS wording from formal to casual"). Do this often.
- **Pivot** = different problem OR different user OR fundamentally different flow ("we thought permit renewal, actually the bigger pain is initial registration"). Do this rarely, and only with strong evidence.

### Rule 3: Track your assumptions
Keep a list of every assumption baked into v0. After each iteration, ask: *which assumption did this iteration test? Did it hold or break?*

Tested assumptions are gold. Untested assumptions are landmines.

## When to stop iterating on v0

Iterate v0 until either:
- **Your metrics hit your success threshold** consistently across 3+ cohorts, proceed to v1
- **Iterations stop moving the metric**, your model has a deeper problem; revisit Module 1 (the problem)
- **8 weeks have passed without movement**, most likely you mis-defined the problem; restart

Don't iterate forever. Don't pivot at the first sign of friction either. Find the middle.

## When v0 succeeds, what's next

v0 working = you have **proof of value**, not a business. Next steps:

1. **Add the cuts back, slowly.** Onboarding, accounts, settings, re-evaluate each: is it now necessary? (Often the answer is "not yet.")
2. **Plan v1 as the scoot-then-bike progression.** Don't jump straight to the car.
3. **Talk to the next 10 users.** Are they the same user type as the first 5? If not, you may have a segmentation issue.

## Sheng Reality Check

> *Ship inakuwa, listen, iterate. Lakini bila metrics + threshold zilizoamuliwa kabla, utajidanganya. "Encouraging" si data.*

## Action Item

1. Set a **ship date**, 14 days from completing Module 2.
2. Define your **two metrics** + **success threshold** before shipping.
3. Recruit **5 to 10 real users** ready to use v0.
4. Run the **7-day listening window** post-ship.
5. Pick **one fix** for iteration 1.

## You've completed Product Development Essentials

You now have the discipline of:
- Defining problems rigorously (Module 1)
- Designing minimum loops (Module 2)
- Shipping + iterating without thrashing (Module 3)

Now go build something small that matters to five people. Then ten. Then a hundred.
`,
      },
    ],
  },

  // =========================================================================
  // TEXT-ONLY STANDALONE 2: Sheria ya Vijana, Entrepreneurship Edition
  // =========================================================================
  {
    title: 'Sheria ya Vijana, Entrepreneurship Edition',
    description: 'The legal scaffolding every youth founder must know. Constitution, AGPO 30%, Youth Enterprise Fund, county trade licensing, what to invoke, what to avoid, where to push.',
    overview: 'Three modules of practical legal literacy for youth-led ventures in Kenya. Not a law degree, a working knowledge of the Sheria ya Vijana stack that lets you fundraise, register, contract, and advocate without being intimidated by an act number.',
    category: 'Digital Entrepreneurship',
    difficulty_level: 'intermediate',
    estimated_duration_hours: 6,
    prerequisites: ['A youth-led venture, formal or informal', 'Course 1 (Youth Builder Blueprint) recommended'],
    learning_outcomes: [
      'Cite the constitutional provisions that protect youth entrepreneurship',
      'Navigate AGPO 30% public procurement reservations',
      'Access the Youth Enterprise Development Fund pathway',
      'Identify and challenge county trade licensing chokepoints',
    ],
    modules: [
      {
        title: 'The Constitutional Floor, Article 55 and What It Means in Practice',
        description: 'The constitutional baseline that youth founders rarely cite, and the reason they leave power on the table.',
        minutes: 70,
        objectives: ['Quote Article 55 and explain its operative force', 'Recognize when government action falls short of the constitutional duty', 'Use the constitutional anchor in funding and advocacy conversations'],
        keywords: ['Constitution', 'Article-55', 'youth-rights', 'Sheria-ya-Vijana'],
        content: `# The Constitutional Floor, Article 55

## The text

Article 55 of the Constitution of Kenya (2010) directs the State to take measures, including affirmative action programmes, to ensure that the youth:

> (a) access relevant education and training;
> (b) have opportunities to associate, be represented and participate in political, social, economic and other spheres of life;
> (c) access employment; and
> (d) are protected from harmful cultural practices and exploitation.

Read it slowly. **Each clause is operative.** It's not aspirational language. It's a constitutional duty on the State.

## Why founders should know this

When you sit across from a funder, a county official, or a national-level director, the framing of your conversation matters. If you frame your venture as "asking for help," the dynamic is asymmetric. If you frame it as **"contributing to fulfilment of the State's Article 55 obligations,"** the dynamic shifts.

You are not begging. You are partnering with a State that has a constitutional duty to ensure youth access exactly the things your venture provides.

This isn't legal theatre. It's accurate. Use it.

## How Article 55 cascades

The constitutional duty cascades through:

| Layer | Where it lives | Example |
|---|---|---|
| Statute | Youth Enterprise Development Fund Act | Direct financing channel for youth ventures |
| Sector regulation | Public Procurement and Asset Disposal Act → AGPO regulations | 30% set-aside for youth, women, PWD |
| County instruments | County Youth Policies | Implementation budget allocations |
| Sector ministries | Ministry of ICT youth programmes, etc. | Programme-specific opportunities |

When a county Finance Act fails to allocate to a County Youth Policy, that's not just a budget oversight. It's a **constitutional shortfall**. You can name it as such.

## The operative phrases

When invoking Article 55:

- *"The State has a constitutional duty under Article 55 to ensure youth access [education/employment/representation]."*
- *"Our venture operates in the implementation space for that duty."*
- *"We're asking how this office is fulfilling its Article 55 obligations in [specific area]."*

Notice: you're not asking for charity. You're asking how a duty is being fulfilled. Different conversation.

## What Article 55 doesn't do

It doesn't:
- Guarantee specific funding to specific ventures
- Override other constitutional provisions (e.g., procurement fairness)
- Create immediate, individually-enforceable rights to a job or a grant

It does:
- Establish a constitutional baseline
- Create a duty the State can't formally repudiate
- Anchor every other Sheria ya Vijana instrument

## The court angle

In rare cases, Article 55 has been invoked in court, usually when affirmative-action programmes are challenged or when youth representation is denied in formal bodies. Few founders need this; advocacy campaigners do. Know it exists.

## Sheng Reality Check

> *Article 55 si poster. Ni mukataba kati ya State na youth. Ukienda meeting unaijua, the conversation inakuwa "fulfilment ya duty," sio "kuomba msaada." Nguvu yote iko hapo.*

## Action Item

1. **Memorize** the four clauses of Article 55.
2. In your next funding or advocacy conversation, **invoke Article 55** explicitly. Note how the room shifts.
3. Identify **one State actor** (national or county) whose mandate touches youth, and **ask them how they're fulfilling Article 55** in their portfolio.

## What's Next

Module 2, AGPO 30%. The most under-claimed asset in youth entrepreneurship policy. How to access it and how to defend your claim when a procuring entity tries to dodge.
`,
      },
      {
        title: 'AGPO 30%, Public Procurement\'s Best-Kept Secret',
        description: 'Thirty percent of all public procurement is reserved for youth, women, and persons with disabilities. Most youth founders never claim it.',
        minutes: 85,
        objectives: ['Explain AGPO eligibility and the 30% reservation mechanism', 'Register your venture for AGPO certification', 'Identify and respond to procurement opportunities under AGPO', 'Recognize and challenge AGPO violations'],
        keywords: ['AGPO', 'procurement', 'youth-business', 'public-contracts'],
        content: `# AGPO 30%, Public Procurement's Best-Kept Secret

## The provision

Under the Public Procurement and Asset Disposal Act and accompanying AGPO regulations, **30% of all public procurement** (national and county) is reserved for enterprises owned by:

- Youth (18 to 35)
- Women
- Persons with disabilities

Eligible enterprises register under the **Access to Government Procurement Opportunities (AGPO)** programme. Once certified, they can bid on the reserved 30%, competing only against other AGPO-certified firms, not the open market.

## Why this matters

The Kenya government spends **hundreds of billions** annually on procurement. Even fractional access to the 30% reserved share is transformational for a small youth-led venture.

But, and this is the painful part, **AGPO is wildly under-utilized.** Many youth ventures don't know it exists. Many procuring entities exploit the lack of awareness to skip the reservation entirely. Some certified ventures are paper-only and don't actually bid.

The opportunity for the literate youth founder: this is one of the most concrete competitive advantages available to you, and most of your peers haven't claimed it.

## Eligibility, basic test

To be AGPO-eligible (youth category):

- Enterprise is registered (sole prop, partnership, or limited company)
- At least **70% ownership** is by youth (18 to 35)
- For limited companies, at least **70% of directors** are youth
- The enterprise has KRA registration and a valid tax compliance certificate
- The enterprise has a CR12 (or equivalent ownership confirmation)

The category also accepts women-owned and PWD-owned enterprises under similar 70% thresholds.

## How to register

The process, as of the current AGPO portal:

1. Create an account on the AGPO portal (agpo.go.ke).
2. Upload required documents:
   - Certificate of registration (CoR / CR12)
   - KRA PIN of the entity and directors
   - Tax compliance certificate
   - National IDs of owners/directors
   - Bank account confirmation
3. Submit and await certification (typically 14 to 30 days).
4. Upon certification, you receive an AGPO certificate valid for two years (renewable).

Once certified, your enterprise appears in the AGPO database, and procuring entities are required to include AGPO-reserved tenders in their pipeline.

## Finding AGPO opportunities

Procuring entities publish AGPO-reserved tenders through:
- The Public Procurement Information Portal (tenders.go.ke)
- Individual entity websites and notice boards
- The AGPO portal's opportunity feed
- County procurement offices

A serious AGPO bidder checks weekly. Set a calendar reminder. Many opportunities have 14-day windows; if you check monthly, you miss most.

## Bidding, the discipline

Three errors that disqualify AGPO bids:

1. **Document gaps.** Tax compliance lapsed by a week. CR12 not current. KRA PIN of one director missing. Procuring entities use these to disqualify on technicality.
2. **Past performance.** If you've never delivered a similar contract, you can't show track record. Start with smaller tenders and build a portfolio.
3. **Pricing.** AGPO bids are still competitive. You don't win because you're certified, you win because your bid is also competitive against other AGPO bidders.

**Three habits of successful AGPO bidders:**
- Keep documents perpetually current (set calendar reminders 30 days before any expiry)
- Build a portfolio of small completed contracts before chasing big ones
- Network with other AGPO bidders, many opportunities are joint ventures, and consortium bids win contracts solo bids can't

## When AGPO is violated

Procuring entities sometimes skip the 30% reservation, either by claiming "no qualified AGPO bidders applied" without genuine outreach, or by bundling contracts so large that no AGPO-eligible firm can credibly bid.

If you observe this:

1. Document specifics, tender number, dates, contract value, what was skipped.
2. File a complaint with the **Public Procurement Regulatory Authority (PPRA)**.
3. Brief CSO partners (Article 19, Mzalendo, others working in procurement transparency).
4. If your venture has standing (you would have bid), the **Public Procurement Administrative Review Board** is an option.

This is hard work. It's also exactly the kind of advocacy that opens future opportunities, for you and for others.

## Sheng Reality Check

> *AGPO ni kibanda kimewekwa specifically for us, 30% ya gov spending. Lakini majority ya youth hawajawahi register. Si ku-complain serikali haiwasaidii kabla ya kushinda hii moja.*

## Action Item

1. **Register your venture for AGPO certification** within 30 days (if eligible and not already done).
2. **Bookmark tenders.go.ke and the AGPO portal**, set a weekly calendar reminder to scan.
3. **Identify 3 small AGPO-reserved tenders** in your sector this month. Even if you don't bid, study the requirements.
4. Build the discipline of **keeping documents perpetually current.**

## What's Next

Module 3, the Youth Enterprise Development Fund and the county trade licensing layer. The financing pathway most youth ventures could access, and the licensing chokepoints worth advocating against.
`,
      },
      {
        title: 'Youth Enterprise Fund + County Trade Licensing, Money and Friction',
        description: 'The dedicated financing channel for youth ventures, and the licensing layer where most operational pain actually lives.',
        minutes: 80,
        objectives: ['Access the Youth Enterprise Development Fund', 'Map your county\'s trade licensing pathway', 'Identify the licensing chokepoint most worth advocating against'],
        keywords: ['YEDF', 'financing', 'licensing', 'county-government'],
        content: `# Youth Enterprise Development Fund + County Trade Licensing

## Part 1: The Youth Enterprise Development Fund (YEDF)

### What it is

A State corporation under the Ministry of Youth Affairs, established to provide loans and business support specifically for youth-led enterprises. Funded through national budget allocations and, at times, partnerships.

### Loan products (typical)

The YEDF offers tiered loan products including:

| Product | Range (varies) | Typical use |
|---|---|---|
| Group loans | Smaller, lower interest | Youth groups, chamas formalizing |
| Individual youth loans | Mid-range | Established sole-prop or registered SME |
| Special programmes | Project-based | Sector-targeted (agribusiness, ICT, etc.) |

Note: specific terms, ceilings, and rates change. Always confirm current terms on the YEDF portal (yedf.go.ke) before quoting figures to your team or in proposals.

### How to qualify

Baseline requirements:
- Youth (18 to 35) for individual products; majority youth for group products
- Business is registered (sole prop, partnership, limited company) OR is a registered youth group
- Active KRA PIN
- A viable business plan
- For larger products: collateral or guarantor arrangements

### Application discipline

Three habits of successful YEDF applicants:

1. **The plan is real.** Your business plan should reflect actual operations or a credible launch, not a Word doc downloaded the morning of submission.
2. **Numbers match.** Bank statements, KRA filings, and your business plan need to tell the same story.
3. **The use-of-funds is specific.** "Working capital" is weak. "Inventory purchase of 50 units of X at KES Y, with monthly turnover plan Z" is strong.

### When YEDF declines

Common reasons:
- Incomplete documents
- Business plan that doesn't show repayment capacity
- Prior loan defaults (any) in your CRB history
- Unrealistic revenue projections

If declined: ask for **specific reasons in writing**. Improve the gap. Reapply. Many successful applicants succeed on attempt 2 or 3.

### Combining with other instruments

YEDF can be combined (carefully) with:
- AGPO contracts (use YEDF to finance AGPO contract delivery)
- Bank facilities (YEDF as part of a stack, not the whole stack)
- Equity from family or co-founders

Avoid combining with other loan products before you've serviced the first cleanly, over-leverage kills more youth ventures than under-funding.

## Part 2: County Trade Licensing, Where Most Pain Lives

National-level instruments (Constitution, AGPO, YEDF) matter strategically. But for most youth ventures, the *daily operational pain* lives at the **county trade licensing** layer.

Each of Kenya's 47 counties operates its own:
- **County Finance Act**, sets fees, rates, and licensing structures annually
- **County Trade Licensing Act** (or equivalent), defines licensing categories, requirements, and processes
- **Specific sector regulations**, for food, public health, transport, etc.

### The common chokepoints

| Chokepoint | What it looks like | Cost to ventures |
|---|---|---|
| Flat-rate licensing | A tea kiosk pays the same as a hotel for a category | Pricing out small ventures |
| Slow renewals | Renewal takes 30 to 180 days | Trading interruption |
| In-person-only filing | All renewals require multiple visits to county offices | Lost work days |
| Opaque fee structures | The advertised fee + the "expediting" cost | Real cost is often 2 to 3× the listed rate |
| Multiple jurisdiction overlap | One business needs national + county + sub-county clearances | Months of cycling between offices |

### Mapping your county's pathway

Before you can advocate, you need to know exactly what *your* county requires:

1. **Get the current County Finance Act.** It's a public document. Read the trade-licensing schedule.
2. **List every license your venture requires**, by name, fee, and renewal period.
3. **Document the actual process** for each (steps, offices, typical timeline) versus the official process.

The gap between official and actual is where chokepoints live. That gap is also your **advocacy material** (see Course 3).

### When to comply vs. when to advocate

Comply when:
- The license is legally required and the cost is operationally bearable
- The process, even if frustrating, is functional
- You don't yet have the standing or coalition for credible advocacy

Advocate (in parallel with compliance) when:
- The cost or process is genuinely irrational and disproportionately affects youth ventures
- You have evidence (your own + peer ventures)
- The county is in a budget or policy cycle (best windows for amendments)

**Never** simply ignore licensing, operating without required licenses leaves you exposed to enforcement actions that can destroy a venture overnight.

### A worked example

> A youth-led food kiosk in a county where the sanitation permit renewal costs KES 22,000 and takes 4 to 6 months:
>
> **Compliance:** Pay the fee. Stay registered. Don't operate without it.
>
> **Advocacy (parallel):** Document 10 peer ventures with the same friction. Build a coalition with a CSO that works on small-business policy. Engage the County Trade Committee Clerk (Kapanga). Submit a memorandum proposing a tiered renewal schedule based on previous-year revenue. Time it for the next County Finance Act cycle.

The compliance keeps you operational. The advocacy changes the rules under which the *next* generation of youth kiosks operate. Both, not either.

## Sheng Reality Check

> *Constitution, AGPO, YEDF, these are the macro instruments. County trade licensing, that's where day-to-day pain anaishi. You comply where you must, you advocate where you can. Bila both, the rules will keep biting.*

## Action Item

1. **Check YEDF eligibility** for your venture. If eligible, complete an application within 60 days.
2. **Get a copy of your County Finance Act** (current year). Read the trade-licensing schedule.
3. **Map your venture's licensing pathway**: which licenses, what fees, what processes (official vs. actual).
4. **Identify one chokepoint worth advocating against** over the next 18 months. Note it. Carry it forward to Course 3.

## You've completed Sheria ya Vijana, Entrepreneurship Edition

You now have working literacy in:
- The constitutional floor (Article 55)
- The procurement reservation (AGPO 30%)
- The financing pathway (YEDF)
- The licensing layer (county trade)

This isn't all the law. It's the law that most often determines whether a youth-led venture thrives or stalls. Combine it with Courses 1 to 4 and you have both the operating system and the legal scaffolding.
`,
      },
    ],
  },

  // =========================================================================
  // TEXT-ONLY STANDALONE 3: Business Advocacy Strategy in Practice
  // =========================================================================
  {
    title: 'Business Advocacy Strategy in Practice',
    description: 'For the founder who wants their venture to shape policy, not just survive it. Practical strategy for business-led advocacy from the Business Advocacy Toolkit.',
    overview: 'Three modules of focused, ground-game advocacy strategy specifically for business operators. We separate this from Course 3 (which is for changemakers running advocacy as primary work), here, you\'re running a venture and want to shape the rules without abandoning operations.',
    category: 'Business',
    difficulty_level: 'intermediate',
    estimated_duration_hours: 7,
    prerequisites: ['You operate a venture (or are about to)', 'A specific regulatory friction you\'ve identified'],
    learning_outcomes: [
      'Distinguish business advocacy from civic advocacy',
      'Build a coalition that protects business interests without compromising the venture',
      'Design advocacy moves that double as marketing for the venture',
      'Sustain advocacy work over multi-year horizons without burning operational capacity',
    ],
    modules: [
      {
        title: 'Why a Business Should Advocate, and Where to Draw the Line',
        description: 'Most founders avoid policy work. Smart founders shape it. Here\'s how to do it without becoming a politician.',
        minutes: 80,
        objectives: ['Articulate the business case for advocacy', 'Identify which regulations actually affect your venture', 'Set boundaries: what to advocate on, what to leave alone'],
        keywords: ['business-advocacy', 'strategy', 'positioning'],
        content: `# Why a Business Should Advocate, and Where to Draw the Line

## The reluctance

Most founders avoid policy work because they think:

- "I'm not political."
- "Advocacy distracts from operations."
- "I don't want to make enemies in government."
- "It's the role of CSOs, not businesses."

All four are wrong in their absoluteness, but each contains a kernel that matters. This module gets the kernels right and discards the avoidance.

## The case for business advocacy

Three reasons a founder *should* engage with policy:

### Reason 1: Policy directly shapes your unit economics
The fee schedule, the licensing process, the procurement reservation, the tax regime, these are not abstractions. They determine your margin, your cash conversion cycle, your customer acquisition cost. If you don't shape them, someone shapes them around you.

### Reason 2: You have evidence others don't
A think-tank can model the impact of a tiered license fee. You can show 30 kiosks closing because of the current flat rate. **Operational evidence beats modelled evidence in 7 of 10 committee rooms.** You can provide what others can't.

### Reason 3: Advocacy doubles as positioning
Done well, advocacy work raises your venture's profile with funders, partners, and customers who care about systemic change. It's marketing in disguise, but only if the substance is real.

## The line: what business advocacy is NOT

Business advocacy is not:

- **Partisan politics.** You don't endorse candidates. You don't take sides in elections.
- **A primary job.** You are running a venture. Advocacy is a supporting strategy, not the main thing.
- **Confrontational by default.** Strong relationships with regulators usually serve you better than public fights. Public fights are reserved for moments where everything else has failed.
- **Lobbying for unfair advantage.** Pushing for a tiered license is fair. Pushing for *your* venture to be exempt from a rule everyone else follows is captive lobbying, short-term win, long-term reputation killer.

## What to advocate on (and what to leave alone)

A simple test: would the policy change you're seeking benefit your **whole sector** (or whole class of ventures), or only you?

| Advocate | Leave alone |
|---|---|
| Tiered licensing reflecting venture size | Special exemption for your venture specifically |
| Faster permit renewals across the sector | Backdoor pre-approval just for you |
| Recognizing informal collateral for SME lending | A discretionary loan to your venture |
| County implementation of a Youth Policy | A line item naming your venture |
| AGPO enforcement | Skipping the AGPO process because it's tedious |

The first column builds your sector and your reputation. The second column buys you a 12-month advantage and a 10-year liability.

## Time discipline, the 10% rule

Set a **time cap**: no more than 10% of your week on advocacy, except during specific decision-window sprints (where 30% is allowable for 2 to 4 weeks at a time).

10% of a 60-hour founder week = 6 hours. That's enough for:
- One stakeholder meeting per week
- One policy brief per month
- One coalition call bi-weekly
- One op-ed per quarter

If advocacy is consuming more than 10% of your weeks consistently, the venture is paying for it, and at some point operations break. Watch the budget.

## The boundary

Business advocacy works when:
- Your venture is operationally healthy (advocacy isn't a substitute for traction)
- You have specific, evidenced asks (not "we need help")
- You stay focused on the rules of the game, not the players
- You measure advocacy time and outputs like any other work stream

It fails when:
- Founders use it as an escape from harder operational work
- Asks balloon into "fix everything"
- The team can't distinguish advocacy from political activism
- It's not tracked, so it expands invisibly

## Sheng Reality Check

> *Business advocacy si activism. Ni strategy. You shape the rules that shape your margin. 10% ya wakati wako, sio more. Otherwise unaacha biz kufa ukimsifu policy.*

## Action Item

1. List **three policy frictions** affecting your venture or sector.
2. Apply the "whole-sector vs. self-only" test to each. Drop any that don't pass.
3. Set your **10% advocacy time budget**. Block it on your calendar.
4. Identify your **first stakeholder meeting**, who, when, what's the ask.

## What's Next

Module 2, building a coalition that doesn't slow you down, and an advocacy strategy that doubles as marketing.
`,
      },
      {
        title: 'Coalitions That Move, Advocacy That Markets',
        description: 'Build alliance structure that adds force without bureaucracy. Make every advocacy output do double duty as positioning.',
        minutes: 90,
        objectives: ['Choose the right coalition structure for your campaign', 'Design advocacy outputs that work as marketing for your venture', 'Avoid the three common coalition failure modes'],
        keywords: ['coalitions', 'marketing', 'business-advocacy', 'alliances'],
        content: `# Coalitions That Move, Advocacy That Markets

## Why coalitions matter for business advocacy

A single venture making an ask sounds like self-interest. The same ask from a coalition of 10 ventures sounds like a sector position. Same content, completely different reception.

But coalitions can also become bureaucracies that consume more capacity than they create. The trick is choosing the right structure.

## Three coalition structures

| Structure | Pros | Cons | Use when |
|---|---|---|---|
| **Loose alliance** (joint memos, shared events) | Low overhead, fast | Limited durability | Specific 3 to 6 month campaigns |
| **Trade association** (formal, dues-paying) | Sustainable, professional voice | Slow decisions, governance overhead | Long-term sector representation |
| **Coordinated network** (regular calls, shared positions, no formal structure) | Mid-overhead, flexible | Requires a credible convenor | Multi-year campaigns with stable participants |

Most youth-business advocacy starts as **loose alliance** and graduates to **coordinated network** when the campaign exceeds 6 months. Trade-association formation is appropriate only when you have 12+ months of stable participation and ≥15 active member ventures.

## Building a loose alliance, the practical steps

For a 3 to 6 month campaign:

### Step 1: Identify 8 to 15 candidate ventures
They should:
- Operate in your sector or be affected by the same policy
- Be operationally healthy enough to spare 2 hours/month
- Not be direct competitors so close that strategy leaks become risks
- Have a decision-maker who can commit on a 1-hour call

### Step 2: Convene the first call
60 minutes, structured:
- 15 min: round-robin, name, venture, what this friction has cost them
- 15 min: shared diagnosis of the policy issue (from Course 3 Module 1)
- 15 min: shared ask, what would we propose as the policy change?
- 15 min: who does what, one venture leads, others provide evidence/signatures

The deliverable from call 1 is a one-page shared position statement. If you can't agree on that one page, you don't have a coalition yet.

### Step 3: Establish a rhythm
- One short call per month (45 min max)
- A shared document (or WhatsApp / Signal group) for updates
- Each member contributes one piece of evidence per quarter (a stat, a story, a signature)

## The three coalition failure modes

### Failure 1: Diffuse asks
"We support youth entrepreneurship" is not an ask. "We propose amending County Finance Act Section 12 to tier license fees by previous-year revenue" is. Force specificity early.

### Failure 2: Free-riders
One venture does all the work; others put their logo on the output. This is fine briefly. After three months, it breeds resentment. Make small, specific contributions mandatory.

### Failure 3: Mission creep
The coalition was formed to advocate on licensing. Six months in, members are pushing for it to also tackle taxation, training, and procurement. Each addition halves the focus. **Charter the coalition narrowly. Add scope only with explicit decision.**

## Advocacy as marketing, the doubling principle

Every piece of advocacy output should do double duty. Your policy brief is also a credibility artifact. Your op-ed is also a positioning piece. Your coalition signature list is also a partnership announcement.

### Examples

| Advocacy output | Doubles as |
|---|---|
| Policy brief on licensing reform | Demonstrates depth → attracts mission-aligned investors |
| Op-ed in a national paper | Brand awareness for the venture's value proposition |
| Stakeholder map / coalition list | Partnership pipeline (those ventures are likely partners) |
| Quoted in committee testimony | Trust signal to customers, especially institutional ones |
| Successful policy amendment | Permanent positioning credit |

The doubling isn't fake. It just means you **think about what an advocacy output communicates to non-policy audiences** before you publish. Same content; intentional dual framing.

### What NOT to do

- Don't soft-sell the venture inside the advocacy output. ("Buy our product!" doesn't belong in a committee submission.) The output earns credibility precisely because it isn't a sales pitch.
- Don't use advocacy work as deceptive marketing. The relationship runs the other way: do real advocacy, and the positioning benefits accrue.

## A worked example

A youth-led agritech operating in Western Kenya. Advocating for the county to recognize digital crop-yield records as collateral for SACCO lending.

**Advocacy outputs (12 months):**
- 1 policy brief
- 2 op-eds
- 1 county committee testimony
- 3 stakeholder briefings
- 1 coalition memorandum (8 ventures + 2 CSOs signed)

**Doubling outcomes:**
- The policy brief gets cited in a regional agricultural policy report, credibility used in their next investor deck
- The op-eds attract two new co-op partnerships
- The committee testimony is featured in a sector newsletter, small but compounding brand recognition
- The coalition memorandum becomes the basis for a joint product launch with two of the signatories

The venture moved policy AND grew the business. Same hours, dual yield.

## Sheng Reality Check

> *Coalitions ni nguvu lakini also ni overhead. Anza loose, graduate to network when zinakua serious. Kila output ya advocacy lazima ifanye kazi mbili, policy + positioning.*

## Action Item

1. Choose your **coalition structure** for the current campaign, loose alliance, network, or association.
2. Identify **8 to 15 candidate ventures** to invite.
3. For each planned advocacy output in the next 90 days, write **two lines**: what policy effect it pursues, and what positioning effect it could carry.

## What's Next

Module 3, sustaining advocacy work over multi-year horizons without burning operational capacity. The endgame discipline.
`,
      },
      {
        title: 'Sustaining the Effort, Multi-Year Advocacy Without Operational Burnout',
        description: 'Most business advocacy dies in year 2 because the founder ran out of capacity. Here\'s how to design for the long run.',
        minutes: 75,
        objectives: ['Build a sustainable cadence for multi-year advocacy', 'Delegate advocacy work without losing strategic control', 'Recognize and recover from advocacy burnout'],
        keywords: ['sustainability', 'capacity', 'multi-year-advocacy', 'business-advocacy'],
        content: `# Sustaining the Effort, Multi-Year Advocacy Without Operational Burnout

## The 2-year wall

Most business advocacy campaigns hit a wall around month 18 to 24. Three causes:

1. **The founder is exhausted.** Carrying advocacy on top of operations finally compounds.
2. **The coalition has drifted.** Original members have left, new members don't carry institutional memory.
3. **The policy window has shifted.** The committee chair changed; the budget cycle moved; the original ally is now an opponent.

Without explicit design for sustainability, year 2 is where good campaigns die quietly.

## Designing for the long run

### Principle 1: Don't be the sole knowledge holder
If you're the only person on your team who knows the policy stack, the stakeholder map, and the campaign history, your absence breaks the campaign. Document everything. Onboard a second person within 6 months of starting. Even if that person is part-time.

The discipline: write a 5-page **campaign memo** every quarter that summarizes:
- Current diagnosis
- Where we are on the stakeholder map
- What's coming in the next 90 days
- What's stalled and why
- Open decisions

Any new joiner should be able to ramp from this memo in 2 hours. Without it, ramp takes 2 months, and you don't have 2 months in year 2.

### Principle 2: Anchor in operational rhythm, not separate workstreams
The most sustainable advocacy work is **woven into existing operational practices**, not bolted on.

| Operational practice | Advocacy integration |
|---|---|
| Monthly sales / customer review | Note which losses or wins were policy-affected |
| Weekly leadership stand-up | 10 min advocacy update slot |
| Quarterly board / advisor meeting | One slide on advocacy state |
| Annual strategy retreat | Half-day on policy environment |
| Customer success calls | Listen for new regulatory pain stories |

If advocacy lives only in dedicated advocacy meetings, it's an island. When the islands' founders get busy, the island sinks. Integration keeps it floating.

### Principle 3: Stakeholder maintenance, not just stakeholder cultivation
Most campaigns cultivate stakeholders during the first 6 months. Then go quiet. Then 18 months later, panic-call them when something heats up. By then, the Kapanga has moved, the principal has forgotten, the policy advisor is annoyed.

**Stakeholder maintenance** = lightweight, regular touches even when there's no ask:
- Quarterly update note (one paragraph, by email)
- An invitation to a relevant event you're hosting or attending
- Forwarding a piece of evidence relevant to their portfolio (no ask attached)
- A simple "saw your committee just held hearings on X, happy to brief if useful"

This is 30 minutes per stakeholder per quarter. For 8 key stakeholders, that's 4 hours/quarter, well within your 10% time budget.

### Principle 4: Renew the coalition every 12 months
Coalitions atrophy without renewal. Once a year:
- Reconfirm participation (who's still in?)
- Onboard 2 to 3 new members to replace dropouts
- Refresh the shared position statement
- Reset the rhythm

If you skip this, the coalition becomes a fiction, a logo list on documents nobody actually represents.

## Recognizing burnout (your own)

Three signs you're burning out on advocacy:

1. **You start dreading the meetings**, even the ones with allies. This is the earliest signal.
2. **You're skipping the operational rhythm to do advocacy work**, the polarity has inverted dangerously.
3. **You start framing advocacy as "the real impact," and operations as "the day job"**, a sign you're getting addicted to the public-facing work and avoiding the harder commercial work.

When you spot any of these:
- Reduce advocacy hours by half for 30 days. Catch up operationally.
- Have one honest conversation with your closest advisor about whether the campaign is still strategic or has become identity.
- Consider whether to hand off the advocacy lead to someone else on your team for a quarter.

Advocacy work that breaks the founder fails. Sustainable advocacy work outlasts the founder.

## When to stop

Sometimes the right move is to wind down a campaign:

- The policy window closed (the legislature changed, the priority shifted)
- The diagnosis turned out to be wrong (a different friction is more important)
- The cost-benefit no longer holds (the time invested isn't producing movement)
- The venture needs the founder's full attention (a crisis, a pivot, a growth surge)

Winding down well:
- Brief the coalition: here's what we accomplished, here's what's incomplete, here's why we're pausing
- Document the playbook (so the next founder doesn't restart from zero)
- Maintain key stakeholder relationships at a lower cadence (don't ghost)
- Be honest with yourself about why you're stopping, "we won" vs "we're tired" vs "the strategy was wrong"

A clean wind-down preserves credibility for the next campaign. A ghost-quit destroys it.

## When to escalate

The opposite: sometimes the right move is to escalate. The policy window has opened wider than expected; the coalition is humming; the evidence has accumulated; the principal is finally available.

Escalating well:
- Recognize the moment (this is often instinctive, trust the signal)
- Renegotiate operational coverage so you can do the 30% sprint without breaking the venture
- Brief the coalition explicitly: "the window is open; we have 8 weeks; here's our push"
- Track the burn, set the explicit end date for the sprint

After the sprint, return to 10%. Always return.

## Sheng Reality Check

> *Hii ni marathon, sio sprint. Mwaka 1 ni momentum. Mwaka 2 ni discipline. Mwaka 3 ni results. Founders wanaokufa kazi advocacy hawaja-design for sustainability.*

## Capstone Action Item

1. Schedule the **quarterly campaign memo**. Calendar it for the next 4 quarters now.
2. Identify **one person on your team or among advisors** to onboard as a second knowledge holder within 6 months.
3. Set the **stakeholder maintenance cadence** for your top 8 stakeholders.
4. Schedule the **12-month coalition renewal** date.
5. Define **your personal burnout signals** in writing. Share them with one trusted person.

## You've completed Business Advocacy Strategy in Practice

You now have the discipline of:
- Defining business advocacy without confusing it with politics (Module 1)
- Building coalitions and doubling outputs as positioning (Module 2)
- Sustaining the effort across multi-year horizons (Module 3)

Combine with Courses 1 to 4 if you're running a venture that also advocates, or stand-alone if your advocacy work has narrower business-specific scope.

The work is long. The compound interest is real. Run it well.
`,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// EXECUTION
// ---------------------------------------------------------------------------

console.log(`\nSeeding ${COURSES.length} courses for instructor ${INSTRUCTOR_ID}\n`);

const now = new Date().toISOString();
let coursesCreated = 0, modulesCreated = 0;

for (const def of COURSES) {
  // Skip if already seeded (idempotent: by title + author + not deleted)
  const { data: existing } = await supabase
    .from('courses')
    .select('id, title')
    .eq('title', def.title)
    .eq('author_id', INSTRUCTOR_ID)
    .is('deleted_at', null)
    .maybeSingle();

  if (existing) {
    console.log(`⊙ Skip "${def.title}" (already exists, id=${existing.id})`);
    continue;
  }

  // Insert course
  const courseRow = {
    title: def.title,
    description: def.description,
    overview: def.overview,
    category_id: CAT[def.category],
    difficulty_level: def.difficulty_level,
    estimated_duration_hours: def.estimated_duration_hours,
    prerequisites: def.prerequisites,
    learning_outcomes: def.learning_outcomes,
    author_id: INSTRUCTOR_ID,
    status: 'published',
    review_status: 'approved',
    featured: false,
    published_at: now,
  };

  const { data: course, error: cErr } = await supabase
    .from('courses')
    .insert(courseRow)
    .select('id, title')
    .single();

  if (cErr) { console.error(`✗ Failed to create "${def.title}":`, cErr); continue; }

  console.log(`\n✓ Created "${course.title}"  id=${course.id}`);
  coursesCreated++;

  // Insert modules
  for (let i = 0; i < def.modules.length; i++) {
    const m = def.modules[i];
    const modRow = {
      title: m.title,
      description: m.description,
      content: m.content,
      category_id: CAT[def.category],
      author_id: INSTRUCTOR_ID,
      difficulty_level: def.difficulty_level,
      estimated_duration_minutes: m.minutes,
      learning_objectives: m.objectives,
      keywords: m.keywords,
      status: 'published',
      featured: false,
      published_at: now,
    };
    const { data: mod, error: mErr } = await supabase
      .from('learning_modules')
      .insert(modRow)
      .select('id')
      .single();
    if (mErr) { console.error(`  ✗ Module "${m.title}":`, mErr.message); continue; }

    const { error: lErr } = await supabase
      .from('course_modules')
      .insert({
        course_id: course.id,
        module_id: mod.id,
        order_index: i + 1,
        is_required: true,
      });
    if (lErr) { console.error(`  ✗ Linking module:`, lErr.message); continue; }

    console.log(`  → ${i + 1}. ${m.title}  (id=${mod.id})`);
    modulesCreated++;
  }
}

console.log(`\n──────────────────────────────────────`);
console.log(`Done. Created ${coursesCreated} course(s), ${modulesCreated} module(s).`);
