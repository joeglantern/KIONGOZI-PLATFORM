import { serviceClient } from './_supabase.mjs';
import { readFileSync } from 'node:fs';

const USER_COUNT = Number(process.env.DEMO_USER_COUNT || 300);
const BATCH_ID = process.env.DEMO_BATCH_ID || `youth-demo-${new Date().toISOString().slice(0, 10)}`;
const PASSWORD = process.env.DEMO_USER_PASSWORD || `DemoYouth!${new Date().getUTCFullYear()}`;
const NAME_LIST_PATH = process.env.DEMO_NAME_LIST_PATH;

const maleFirstNames = [
  'Brian', 'Kevin', 'Paul', 'Victor', 'Emmanuel', 'Ian', 'Peter', 'Collins', 'Kelvin', 'Alvin',
  'Samuel', 'David', 'Joseph', 'Daniel', 'Moses', 'Felix', 'Dennis', 'George', 'Elijah', 'Mark',
  'Caleb', 'Allan', 'Brandon', 'Clinton', 'Duncan', 'Eric', 'Francis', 'Gabriel', 'Hassan', 'James',
  'John', 'Laban', 'Martin', 'Nelson', 'Oscar', 'Patrick', 'Robert', 'Simon', 'Stephen', 'Tony',
  'Vincent', 'Wesley', 'Abdi', 'Boniface', 'Edwin', 'Franklin', 'Isaac', 'Jared', 'Kennedy', 'Lawrence'
];

const femaleFirstNames = [
  'Mercy', 'Sharon', 'Faith', 'Diana', 'Grace', 'Cynthia', 'Ann', 'Sheila', 'Mary', 'Janet',
  'Aisha', 'Brenda', 'Caroline', 'Dorcas', 'Esther', 'Fiona', 'Gloria', 'Hellen', 'Irene', 'Joyce',
  'Karen', 'Lilian', 'Maureen', 'Naomi', 'Pauline', 'Rachel', 'Sarah', 'Tracy', 'Violet', 'Winnie',
  'Yvonne', 'Zainab', 'Beatrice', 'Christine', 'Eunice', 'Fridah', 'Jackline', 'Leah', 'Miriam', 'Nancy',
  'Purity', 'Rebecca', 'Stella', 'Tabitha', 'Veronica', 'Wanjiru', 'Akoth', 'Chebet', 'Naliaka', 'Njeri'
];

const secondNames = [
  'Otieno', 'Mwangi', 'Kiptoo', 'Wanjiku', 'Achieng', 'Njeri', 'Ouma', 'Chebet', 'Mutua', 'Atieno',
  'Maina', 'Wambui', 'Ochieng', 'Chepkemoi', 'Barasa', 'Naliaka', 'Oloo', 'Njoki', 'Mutiso', 'Jepkoech',
  'Mboya', 'Kamau', 'Odhiambo', 'Wekesa', 'Muthoni', 'Kiplagat', 'Koech', 'Wairimu', 'Nyambura', 'Onyango',
  'Wafula', 'Kariuki', 'Muli', 'Cheruiyot', 'Njoroge', 'Nyongesa', 'Kimani', 'Were', 'Abdi', 'Noor',
  'Hassan', 'Ali', 'Omondi', 'Kilonzo', 'Kinyua', 'Chege', 'Makori', 'Moraa', 'Mugambi', 'Nyaga'
];

const counties = [
  'Nairobi', 'Kisumu', 'Mombasa', 'Nakuru', 'Kiambu', 'Uasin Gishu', 'Kakamega', 'Machakos',
  'Turkana', 'Garissa', 'Kisii', 'Meru', 'Kilifi', 'Bungoma', 'Kajiado', 'Homa Bay',
  'Nyeri', 'Kericho', 'Embu', 'Makueni'
];

const countyWards = {
  Nairobi: ['Kilimani', 'Embakasi', 'Kasarani', 'Roysambu'],
  Kisumu: ['Market Milimani', 'Nyalenda', 'Kondele', 'Manyatta'],
  Mombasa: ['Likoni', 'Kisauni', 'Tudor', 'Changamwe'],
  Nakuru: ['London', 'Menengai', 'Naivasha East', 'Flamingo'],
  Kiambu: ['Thika Township', 'Ruiru', 'Kikuyu', 'Gatundu North'],
  'Uasin Gishu': ['Kapseret', 'Kimumu', 'Langas', 'Turbo'],
  Kakamega: ['Lurambi', 'Mumias', 'Malava', 'Shinyalu'],
  Machakos: ['Masinga', 'Athi River', 'Kangundo', 'Mwala'],
  Turkana: ['Lodwar Township', 'Kanamkemer', 'Lokichoggio', 'Kalokol'],
  Garissa: ['Township', 'Iftin', 'Balambala', 'Dadaab'],
  Kisii: ['Kitutu Central', 'Bobasi', 'Bonchari', 'Nyaribari'],
  Meru: ['Imenti North', 'Tigania', 'Igembe', 'Buuri'],
  Kilifi: ['Malindi Town', 'Mtwapa', 'Kilifi North', 'Ganze'],
  Bungoma: ['Kanduyi', 'Webuye', 'Kimilili', 'Sirisia'],
  Kajiado: ['Kitengela', 'Ngong', 'Kajiado Central', 'Loitokitok'],
  'Homa Bay': ['Homa Bay Central', 'Rangwe', 'Mbita', 'Ndhiwa'],
  Nyeri: ['Mukurweini', 'Tetu', 'Mathira', 'Nyeri Town'],
  Kericho: ['Ainamoi', 'Belgut', 'Kipkelion', 'Londiani'],
  Embu: ['Manyatta', 'Runyenjes', 'Mbeere North', 'Kirimari'],
  Makueni: ['Wote', 'Kibwezi', 'Makindu', 'Mbooni']
};

const interests = [
  'governance', 'climate', 'entrepreneurship', 'digital skills', 'education', 'agriculture',
  'youth leadership', 'public finance', 'health', 'community service', 'public participation',
  'local development'
];

const activityLevels = [
  'lurker', 'casual commenter', 'active contributor', 'policy-focused user',
  'county-focused user', 'opportunity sharer', 'climate-focused user',
  'skeptical user', 'community mobilizer'
];

const writingStyles = [
  'short and casual', 'polished civic tone', 'asks practical questions', 'county-first and direct',
  'uses light Sheng', 'supportive and encouraging', 'skeptical but respectful', 'youth mobilizer'
];

const focusPaths = ['civic', 'green', 'digital', 'entrepreneurship'];
const ageRanges = ['18-20', '21-24', '25-29', '30-35'];

const postTemplates = [
  ({ county }) => `Sasa team, what is the easiest way for youth in ${county} to know when public participation meetings are happening? Information inafika late sana.`,
  ({ county }) => `County yetu inahitaji clearer updates on youth projects. Launches are good, but timelines and ward contacts would help more.`,
  ({ interest }) => `Just finished a mission on ${interest}. Hii ni real, small civic actions can actually change how we follow up on services.`,
  ({ county }) => `Anyone from ${county} tracking bursary communication? Wantam understand how notices reach students outside town.`,
  ({ county }) => `Mnaona aje if youth reps posted monthly updates here for ${county}? It would make follow-up easier.`,
  ({ interest }) => `I am here to learn more about ${interest} and how young people can turn ideas into practical action.`,
  ({ county }) => `Water and drainage issues keep coming up in ${county}. Si we check which office handles ward-level updates?`,
  ({ county }) => `Apo sawa, the platform is helpful. But can we also get simpler explanations of county budgets for first-time users?`,
  ({ interest }) => `The ${interest} path imebamba. I like that it connects learning with something we can do locally.`,
  ({ county }) => `Vijana wako ready in ${county}, but opportunities need to be shared earlier and in places youth actually check.`
];

const commentTemplates = [
  () => 'This is true in my county too.',
  () => 'Following this. I also want to understand the process.',
  () => 'Apo sawa, but can someone share the exact office to contact?',
  () => 'Hii ni muhimu sana, especially for youth who are not in town centers.',
  () => 'Maze exactly. Updates should not only come after decisions are made.',
  () => 'Can we get a simple breakdown for ward level?',
  () => 'I agree partly, but some youth also need civic education first.',
  () => 'Wantam see more examples from counties that are doing it well.',
  () => 'Tuko pamoja. This is the kind of discussion we need.',
  () => 'Kwani notices cannot be posted here also? It would help many people.'
];

const pollCommentTemplates = [
  () => 'This policy needs a youth-friendly summary before people vote.',
  () => 'Can the results be broken down by county? That would make the brief stronger.',
  () => 'The question is good, but the options should include access to information.',
  () => 'Hii story needs examples. Many youth hear policy and switch off.',
  () => 'I support this, but implementation is where counties usually struggle.'
];

const fundCommentTemplates = [
  () => 'Wantam see how much went to training versus actual equipment.',
  () => 'Budget information should be in simple language, not only PDFs.',
  () => 'Can we confirm if these numbers are official or sample/demo?',
  () => 'Youth funds need ward-level visibility. Otherwise people think the same groups benefit.',
  () => 'Application deadlines should be shared earlier, maze.'
];

const projectUpdateTemplates = [
  ({ county }) => `Visited the area in ${county}; community members say work has started but the timeline is still unclear.`,
  ({ county }) => `No contractor signboard was visible when youth checked the site in ${county}. A public update would help.`,
  ({ county }) => `The project looks useful, but residents are asking for ward-level contact details in ${county}.`,
  ({ county }) => `Some materials are on site. Next update should confirm expected completion date for ${county}.`,
  ({ county }) => `Community feedback from ${county}: people support the project but want clearer budget communication.`
];

const fundResponseTemplates = [
  ({ county }) => `In ${county}, youth mostly hear about funds through friends. A public dashboard with ward-level dates would improve trust.`,
  ({ county }) => `The application process is not always clear. Many young people in ${county} need simple steps and eligibility rules.`,
  ({ county }) => `Information on disbursement should show amounts, timelines, and whether support is training, equipment, or cash.`,
  ({ county }) => `Women and youth with disabilities need accessible venues and earlier communication, not last-minute notices.`,
  ({ county }) => `People want proof of who the fund targets without exposing personal beneficiary data.`
];

const programmeResponseTemplates = [
  ({ county }) => `Youth in ${county} say the programme is known, but follow-up after training is the weak point.`,
  ({ county }) => `Recruitment notices reached some wards but not all. More local channels would help.`,
  ({ county }) => `The opportunity is useful, but payment and reporting timelines should be clearer.`,
  ({ county }) => `Some youth benefited, but others were not sure where to apply or who verifies lists.`,
  ({ county }) => `County-level coordinators should publish monthly updates in simple language.`
];

function pick(list, index, offset = 0) {
  return list[(index + offset) % list.length];
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function parseProvidedNames(raw) {
  return raw
    .split(/\r?\n/)
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => {
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim().replace(/\s+/g, ' '));
      return {
        sourceId: Number(cells[0]),
        gender: cells[1]?.toLowerCase(),
        firstName: cells[2],
        lastName: cells[3],
        fullName: cells[4],
        community: cells[5]
      };
    })
    .filter((row) => row.sourceId && row.firstName && row.lastName && row.fullName);
}

const providedNames = NAME_LIST_PATH ? parseProvidedNames(readFileSync(NAME_LIST_PATH, 'utf8')) : [];
const typoPairs = [
  ['information', 'infomation'],
  ['process', 'proccess'],
  ['actually', 'actully'],
  ['support', 'suport'],
  ['timeline', 'timline'],
  ['clearer', 'cleaer'],
  ['community', 'commuity'],
  ['implementation', 'implemetation'],
  ['because', 'becuase'],
  ['people', 'ppl']
];

function addOccasionalTypo(text, index) {
  if (index % 3 !== 1) return text;
  const pair = typoPairs.find(([word]) => new RegExp(`\\b${word}\\b`, 'i').test(text));
  if (!pair) return `${text} bana`;
  return text.replace(new RegExp(`\\b${pair[0]}\\b`, 'i'), pair[1]);
}

function demoText(text, index) {
  return addOccasionalTypo(text, index)
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeTimestamp(index) {
  const now = new Date();
  const daysAgo = 2 + ((index * 7 + Math.floor(index / 4)) % 58);
  const hourChoices = [8, 10, 12, 17, 19, 21];
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  date.setHours(hourChoices[index % hourChoices.length], (index * 11) % 60, 0, 0);
  return date.toISOString();
}

function buildPersonas() {
  return Array.from({ length: USER_COUNT }, (_, idx) => {
    const number = idx + 1;
    const providedName = providedNames.length ? pick(providedNames, idx) : null;
    const nameRepeat = providedNames.length ? Math.floor(idx / providedNames.length) : 0;
    const gender = providedName?.gender || (idx % 2 === 0 ? 'female' : 'male');
    const firstName = providedName?.firstName || (gender === 'female'
      ? pick(femaleFirstNames, idx)
      : pick(maleFirstNames, idx));
    const lastName = providedName?.lastName || pick(secondNames, idx, Math.floor(idx / 2));
    const county = pick(counties, idx, Math.floor(idx / 5));
    const interestA = pick(interests, idx);
    const interestB = pick(interests, idx, 4);
    const interestC = pick(interests, idx, 8);
    const focusPath = pick(focusPaths, idx);
    const username = `${slugify(firstName)}_${slugify(lastName)}${nameRepeat > 0 ? `_${nameRepeat + 1}` : ''}`;
    const email = `ky-demo-youth-${String(number).padStart(3, '0')}@example.com`;
    const ageRange = pick(ageRanges, idx, Math.floor(idx / 9));
    const activityLevel = pick(activityLevels, idx);
    const writingStyle = pick(writingStyles, idx, 2);
    const fullName = providedName?.fullName || `${firstName} ${lastName}`;
    const bio = demoText(`Youth from ${county} interested in ${interestA}, ${interestB}, and local development`, idx);

    return {
      index: idx,
      number,
      email,
      username,
      firstName,
      lastName,
      fullName,
      gender,
      community: providedName?.community || null,
      county,
      ageRange,
      interests: [...new Set([interestA, interestB, interestC])],
      focusPath,
      activityLevel,
      writingStyle,
      bio
    };
  });
}

async function listAllAuthUsers() {
  const users = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...(data.users || []));
    if (!data.users || data.users.length < perPage) break;
    page += 1;
  }
  return users;
}

async function ensureAuthUsers(personas) {
  const existing = new Map((await listAllAuthUsers()).map((user) => [user.email?.toLowerCase(), user]));
  const resolved = [];

  for (const persona of personas) {
    const existingUser = existing.get(persona.email.toLowerCase());
    if (existingUser) {
      resolved.push({ ...persona, id: existingUser.id });
      continue;
    }

    const { data, error } = await serviceClient.auth.admin.createUser({
      email: persona.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: persona.firstName,
        last_name: persona.lastName,
        full_name: persona.fullName,
        synthetic_demo: true,
        demo_batch_id: BATCH_ID
      },
      app_metadata: {
        synthetic_demo: true,
        demo_batch_id: BATCH_ID
      }
    });

    if (error) throw new Error(`Auth user create failed for ${persona.email}: ${error.message}`);
    resolved.push({ ...persona, id: data.user.id });

    if (resolved.length % 25 === 0) {
      console.log(`Auth users ready: ${resolved.length}/${personas.length}`);
    }
  }

  return resolved;
}

async function upsertProfiles(personas) {
  const rows = personas.map((persona, idx) => ({
    id: persona.id,
    email: persona.email,
    full_name: persona.fullName,
    first_name: persona.firstName,
    last_name: persona.lastName,
    username: persona.username,
    role: 'user',
    status: 'active',
    bio: persona.bio,
    is_bot: true,
    county: persona.county,
    learning_interests: persona.interests,
    focus_path: persona.focusPath,
    onboarding_goal: pick(['community', 'career', 'project', 'explore'], idx),
    daily_goal_minutes: pick([5, 10, 15], idx),
    onboarding_completed_at: makeTimestamp(idx),
    timezone: 'Africa/Nairobi',
    total_xp: 10 + (idx % 9) * 20,
    level: 1 + (idx % 4),
    current_streak: idx % 6,
    longest_streak: (idx % 6) + 2,
    updated_at: new Date().toISOString()
  }));

  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await serviceClient.from('profiles').upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`Profile upsert failed: ${error.message}`);
  }
}

async function labelRecords(records) {
  if (records.length === 0) return;
  for (let i = 0; i < records.length; i += 500) {
    const chunk = records.slice(i, i + 500);
    const { error } = await serviceClient
      .from('synthetic_demo_records')
      .upsert(chunk, { onConflict: 'table_schema,table_name,record_key' });
    if (error) throw new Error(`Synthetic label upsert failed: ${error.message}`);
  }
}

function profileLabel(persona) {
  return {
    batch_id: BATCH_ID,
    table_schema: 'public',
    table_name: 'profiles',
    record_id: persona.id,
    record_key: persona.id,
    persona_user_id: persona.id,
    is_seed_data: true,
    source: 'synthetic_demo',
    visibility: 'demo_only',
    created_for: 'platform_seed_data',
    replace_with_real_activity: true,
    metadata: {
      gender: persona.gender,
      age_range: persona.ageRange,
      county: persona.county,
      community: persona.community,
      interests: persona.interests,
      activity_level: persona.activityLevel,
      writing_style: persona.writingStyle
    }
  };
}

function engagementLabel(tableName, recordKey, recordId, personaUserId, metadata = {}) {
  return {
    batch_id: BATCH_ID,
    table_schema: 'public',
    table_name: tableName,
    record_id: recordId || null,
    record_key: recordKey,
    persona_user_id: personaUserId || null,
    is_seed_data: true,
    source: 'synthetic_demo',
    visibility: 'demo_only',
    created_for: 'platform_seed_data',
    replace_with_real_activity: true,
    metadata
  };
}

async function fetchTargets() {
  const [
    topics,
    polls,
    pollQuestions,
    funds,
    fundQuestions,
    projects,
    programmes,
    programmeQuestions
  ] = await Promise.all([
    serviceClient.from('social_topics').select('id, name, slug').order('created_at'),
    serviceClient.from('policy_polls').select('id, title, status').order('created_at', { ascending: false }),
    serviceClient.from('poll_questions').select('id, poll_id, question_type').order('question_order'),
    serviceClient.from('public_funds').select('id, title, status, sector').order('created_at', { ascending: false }),
    serviceClient.from('fund_accountability_questions').select('id, question_order').order('question_order'),
    serviceClient.from('public_projects').select('id, title, milestone, location_name').order('created_at', { ascending: false }),
    serviceClient.from('civic_programmes').select('id, slug, name').order('sort_order'),
    serviceClient.from('civic_programme_questions').select('id, programme_id, question_order, response_type').order('question_order')
  ]);

  for (const result of [topics, polls, pollQuestions, funds, fundQuestions, projects, programmes, programmeQuestions]) {
    if (result.error) throw result.error;
  }

  if (!topics.data?.length) throw new Error('No social topics found.');
  if (!polls.data?.length) throw new Error('No policy polls found.');
  if (!funds.data?.length) throw new Error('No public funds found.');
  if (!projects.data?.length) throw new Error('No public projects found.');
  if (!programmes.data?.length) throw new Error('No civic programmes found.');

  return {
    topics: topics.data,
    polls: polls.data,
    pollQuestions: pollQuestions.data || [],
    funds: funds.data,
    fundQuestions: fundQuestions.data || [],
    projects: projects.data,
    programmes: programmes.data,
    programmeQuestions: programmeQuestions.data || []
  };
}

async function seedEngagement(personas, targets) {
  const labels = [];
  let engagementCount = 0;

  const postRows = Array.from({ length: 40 }, (_, idx) => {
    const persona = personas[idx % personas.length];
    const topic = pick(targets.topics, idx);
    return {
      user_id: persona.id,
      topic_id: topic.id,
      content: demoText(pick(postTemplates, idx)({ county: persona.county, interest: pick(persona.interests, idx) }), idx),
      created_at: makeTimestamp(idx)
    };
  });
  const insertedPosts = await serviceClient.from('social_posts').insert(postRows).select('id, user_id, topic_id, content');
  if (insertedPosts.error) throw new Error(`Post insert failed: ${insertedPosts.error.message}`);
  for (const post of insertedPosts.data || []) {
    labels.push(engagementLabel('social_posts', post.id, post.id, post.user_id, { interaction_type: 'main_feed_post' }));
  }
  engagementCount += insertedPosts.data?.length || 0;

  const rootCommentRows = Array.from({ length: 45 }, (_, idx) => {
    const persona = personas[(idx + 45) % personas.length];
    const post = pick(insertedPosts.data, idx);
    return {
      post_id: post.id,
      user_id: persona.id,
      content: demoText(pick(commentTemplates, idx)({ county: persona.county }), idx + 40),
      created_at: makeTimestamp(idx + 45)
    };
  });
  const insertedRootComments = await serviceClient.from('social_comments').insert(rootCommentRows).select('id, post_id, user_id');
  if (insertedRootComments.error) throw new Error(`Root comment insert failed: ${insertedRootComments.error.message}`);

  const replyRows = Array.from({ length: 15 }, (_, idx) => {
    const persona = personas[(idx + 100) % personas.length];
    const parent = pick(insertedRootComments.data, idx);
    return {
      post_id: parent.post_id,
      parent_id: parent.id,
      user_id: persona.id,
      content: demoText(pick(commentTemplates, idx, 3)({ county: persona.county }), idx + 85),
      created_at: makeTimestamp(idx + 95)
    };
  });
  const insertedReplies = await serviceClient.from('social_comments').insert(replyRows).select('id, post_id, parent_id, user_id');
  if (insertedReplies.error) throw new Error(`Reply insert failed: ${insertedReplies.error.message}`);

  for (const comment of [...(insertedRootComments.data || []), ...(insertedReplies.data || [])]) {
    labels.push(engagementLabel('social_comments', comment.id, comment.id, comment.user_id, {
      interaction_type: comment.parent_id ? 'reply' : 'comment'
    }));
  }
  engagementCount += (insertedRootComments.data?.length || 0) + (insertedReplies.data?.length || 0);

  const likePairs = new Map();
  let likeIndex = 0;
  while (likePairs.size < 30) {
    const persona = personas[(likeIndex + 150) % personas.length];
    const post = pick(insertedPosts.data, likeIndex, 7);
    if (post.user_id !== persona.id) {
      likePairs.set(`${persona.id}:${post.id}`, {
        user_id: persona.id,
        post_id: post.id,
        created_at: makeTimestamp(likeIndex + 120)
      });
    }
    likeIndex += 1;
  }
  const likeRows = [...likePairs.values()];
  const insertedLikes = await serviceClient
    .from('social_likes')
    .upsert(likeRows, { onConflict: 'user_id,post_id', ignoreDuplicates: true })
    .select('user_id, post_id');
  if (insertedLikes.error) throw new Error(`Like insert failed: ${insertedLikes.error.message}`);
  for (const like of insertedLikes.data || likeRows) {
    labels.push(engagementLabel('social_likes', `${like.user_id}:${like.post_id}`, null, like.user_id, {
      interaction_type: 'reaction',
      reaction_type: 'like',
      post_id: like.post_id
    }));
  }
  engagementCount += likeRows.length;

  const pollCommentRows = Array.from({ length: 20 }, (_, idx) => {
    const persona = personas[(idx + 180) % personas.length];
    const poll = pick(targets.polls, idx);
    const questions = targets.pollQuestions.filter((q) => q.poll_id === poll.id);
    const question = questions.length ? pick(questions, idx) : null;
    return {
      poll_id: poll.id,
      question_id: question?.id || null,
      user_id: persona.id,
      content: demoText(pick(pollCommentTemplates, idx)({ county: persona.county }), idx + 120),
      created_at: makeTimestamp(idx + 150)
    };
  });
  const insertedPollComments = await serviceClient.from('poll_comments').insert(pollCommentRows).select('id, user_id, poll_id');
  if (insertedPollComments.error) throw new Error(`Poll comment insert failed: ${insertedPollComments.error.message}`);
  for (const comment of insertedPollComments.data || []) {
    labels.push(engagementLabel('poll_comments', comment.id, comment.id, comment.user_id, { interaction_type: 'policy_pulse_comment' }));
  }
  engagementCount += insertedPollComments.data?.length || 0;

  const fundCommentRows = Array.from({ length: 15 }, (_, idx) => {
    const persona = personas[(idx + 210) % personas.length];
    const fund = pick(targets.funds, idx);
    return {
      fund_id: fund.id,
      user_id: persona.id,
      content: demoText(pick(fundCommentTemplates, idx)({ county: persona.county }), idx + 140),
      comment_type: idx % 4 === 0 ? 'concern' : idx % 4 === 1 ? 'feedback' : 'comment',
      created_at: makeTimestamp(idx + 175)
    };
  });
  const insertedFundComments = await serviceClient.from('fund_comments').insert(fundCommentRows).select('id, user_id, fund_id');
  if (insertedFundComments.error) throw new Error(`Fund comment insert failed: ${insertedFundComments.error.message}`);
  for (const comment of insertedFundComments.data || []) {
    labels.push(engagementLabel('fund_comments', comment.id, comment.id, comment.user_id, { interaction_type: 'fund_tracker_comment' }));
  }
  engagementCount += insertedFundComments.data?.length || 0;

  const projectUpdateRows = Array.from({ length: 15 }, (_, idx) => {
    const persona = personas[(idx + 235) % personas.length];
    const project = pick(targets.projects, idx);
    const type = pick(['progress', 'concern', 'milestone'], idx);
    return {
      project_id: project.id,
      submitted_by: persona.id,
      content: demoText(pick(projectUpdateTemplates, idx)({ county: persona.county }), idx + 160),
      update_type: type,
      new_milestone: type === 'milestone' ? pick(['announced', 'funded', 'in_progress', 'stalled', 'completed'], idx) : null,
      created_at: makeTimestamp(idx + 195)
    };
  });
  const insertedProjectUpdates = await serviceClient.from('project_updates').insert(projectUpdateRows).select('id, submitted_by, project_id');
  if (insertedProjectUpdates.error) throw new Error(`Project update insert failed: ${insertedProjectUpdates.error.message}`);
  for (const update of insertedProjectUpdates.data || []) {
    labels.push(engagementLabel('project_updates', update.id, update.id, update.submitted_by, { interaction_type: 'project_monitor_update' }));
  }
  engagementCount += insertedProjectUpdates.data?.length || 0;

  const fundAccountabilityRows = Array.from({ length: 10 }, (_, idx) => {
    const persona = personas[(idx + 260) % personas.length];
    const fund = pick(targets.funds, idx, 2);
    const question = pick(targets.fundQuestions, idx);
    return {
      fund_id: fund.id,
      question_id: question.id,
      user_id: persona.id,
      county: persona.county,
      response_text: demoText(pick(fundResponseTemplates, idx)({ county: persona.county }), idx + 180),
      created_at: makeTimestamp(idx + 220)
    };
  });
  const insertedFundResponses = await serviceClient
    .from('fund_accountability_responses')
    .insert(fundAccountabilityRows)
    .select('id, user_id, fund_id');
  if (insertedFundResponses.error) throw new Error(`Fund accountability response insert failed: ${insertedFundResponses.error.message}`);
  for (const response of insertedFundResponses.data || []) {
    labels.push(engagementLabel('fund_accountability_responses', response.id, response.id, response.user_id, {
      interaction_type: 'fund_accountability_response'
    }));
  }
  engagementCount += insertedFundResponses.data?.length || 0;

  const programmeRows = Array.from({ length: 10 }, (_, idx) => {
    const persona = personas[(idx + 275) % personas.length];
    const programme = pick(targets.programmes, idx);
    const questions = targets.programmeQuestions.filter((q) => q.programme_id === programme.id);
    const question = pick(questions, idx);
    return {
      programme_id: programme.id,
      question_id: question.id,
      user_id: persona.id,
      county: persona.county,
      ward: pick(countyWards[persona.county] || ['Central'], idx),
      response_bool: question.response_type === 'yesno' ? idx % 3 !== 0 : null,
      response_text: demoText(pick(programmeResponseTemplates, idx)({ county: persona.county }), idx + 190),
      created_at: makeTimestamp(idx + 240)
    };
  });
  const insertedProgrammeResponses = await serviceClient
    .from('civic_programme_responses')
    .insert(programmeRows)
    .select('id, user_id, programme_id');
  if (insertedProgrammeResponses.error) throw new Error(`Programme response insert failed: ${insertedProgrammeResponses.error.message}`);
  for (const response of insertedProgrammeResponses.data || []) {
    labels.push(engagementLabel('civic_programme_responses', response.id, response.id, response.user_id, {
      interaction_type: 'civic_programme_monitoring_response'
    }));
  }
  engagementCount += insertedProgrammeResponses.data?.length || 0;

  await labelRecords(labels);
  return engagementCount;
}

async function main() {
  console.log(`Starting synthetic demo batch ${BATCH_ID}`);
  const personas = buildPersonas();
  const genderDistribution = personas.reduce((counts, persona) => {
    counts[persona.gender] = (counts[persona.gender] || 0) + 1;
    return counts;
  }, {});

  await serviceClient.from('synthetic_demo_batches').upsert({
    id: BATCH_ID,
    description: 'Synthetic Kenyan youth demo personas and community engagement',
    requested_user_count: USER_COUNT,
    requested_engagement_count: 200,
    status: 'running',
    metadata: {
      source: 'synthetic_demo',
      visibility: 'demo_only',
      created_for: 'platform_seed_data',
      gender_distribution: genderDistribution,
      note: 'Synthetic demo data for staging/demo. Do not present as real production engagement.'
    }
  }, { onConflict: 'id' });

  try {
    const authPersonas = await ensureAuthUsers(personas);
    await upsertProfiles(authPersonas);
    await labelRecords(authPersonas.map(profileLabel));

    const targets = await fetchTargets();
    const engagementCount = await seedEngagement(authPersonas, targets);

    const { error } = await serviceClient.from('synthetic_demo_batches').update({
      generated_user_count: authPersonas.length,
      generated_engagement_count: engagementCount,
      status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('id', BATCH_ID);
    if (error) throw error;

    console.log(`Completed ${BATCH_ID}: ${authPersonas.length} users, ${engagementCount} engagement records.`);
  } catch (error) {
    await serviceClient.from('synthetic_demo_batches').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      metadata: {
        source: 'synthetic_demo',
        visibility: 'demo_only',
        error: error.message
      }
    }).eq('id', BATCH_ID);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
