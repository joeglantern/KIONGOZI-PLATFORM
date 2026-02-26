import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables correctly
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables. Please ensure .env.local is correctly configured.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

// Helper for realistic random videos (open source test videos)
const videos = [
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
];

const getRandVideo = () => videos[Math.floor(Math.random() * videos.length)];

// Generate dummy courses (10 courses, 5 modules each)
const generatedCourses = [
    // --- ENTREPRENEURSHIP (3 Courses) ---
    {
        title: "Venture Creation: From Idea to Launch",
        description: "Learn how to validate startup ideas, create a business model, and launch a sustainable venture.",
        category_name: "Entrepreneurship",
        difficulty_level: "beginner",
        estimated_duration_hours: 12,
        modules: [
            {
                title: "1. Ideation & Market Research",
                description: "How to identify problems worth solving.",
                estimated_duration_minutes: 120,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## The Startup Journey\n\nEvery great venture begins with a profound problem. In this module, we explore techniques for mapping user pain points and validating them through customer interviews.\n\n![Ideation Workshop](https://picsum.photos/seed/1picsum/1200/600)\n\n### Key Steps\n1. **Empathize**: Understand human needs.\n2. **Define**: State your users' needs and problems.\n3. **Ideate**: Challenge assumptions and create ideas.",
                quiz: {
                    title: "Ideation Quiz",
                    questions: [
                        { text: "What is the first step in the Design Thinking process?", options: [{ text: "Empathize", is_correct: true }, { text: "Build", is_correct: false }, { text: "Fundraise", is_correct: false }] }
                    ]
                }
            },
            {
                title: "2. Business Model Canvas",
                description: "Map out your path to profitability.",
                estimated_duration_minutes: 180,
                media_type: "text",
                media_url: "",
                content: "## The Architecture of Value\n\nA business model describes the rationale of how an organization creates, delivers, and captures value.\n\n> \\\"A startup is a temporary organization designed to search for a repeatable and scalable business model.\\\" - Steve Blank\n\n![Business Model Canvas](https://picsum.photos/seed/2picsum/1200/600)\n\nWe use the 9 building blocks to map this clearly.",
                quiz: {
                    title: "Business Model Quiz",
                    questions: [
                        { text: "A startup's primary goal is to search for a repeatable scalable business model.", options: [{ text: "True", is_correct: true }, { text: "False", is_correct: false }] }
                    ]
                }
            },
            {
                title: "3. Minimum Viable Product (MVP)",
                description: "Build enough to learn.",
                estimated_duration_minutes: 150,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## The Build-Measure-Learn Loop\n\nAn MVP is that version of a new product which allows a team to collect the maximum amount of validated learning about customers with the least effort.\n\n![MVP Wireframing](https://picsum.photos/seed/3picsum/1200/600)\n\nDon't build everything. Build just enough.",
                quiz: {
                    title: "MVP Basics",
                    questions: [
                        { text: "What does MVP stand for?", options: [{ text: "Minimum Viable Product", is_correct: true }, { text: "Most Valuable Player", is_correct: false }, { text: "Market Validated Proposal", is_correct: false }] }
                    ]
                }
            },
            {
                title: "4. Go-To-Market Strategy",
                description: "How to acquire your first 100 customers.",
                estimated_duration_minutes: 140,
                media_type: "text",
                media_url: "",
                content: "## Reaching Your Audience\n\nA Go-To-Market (GTM) strategy is an action plan that specifies how a company will reach target customers and achieve competitive advantage.\n\n![Marketing Strategy](https://picsum.photos/seed/4picsum/1200/600)\n\nFocus on organic channels early on before turning to paid acquisition.",
                quiz: {
                    title: "GTM Quiz",
                    questions: [
                        { text: "Which channels are generally best for early stage startups with low budgets?", options: [{ text: "Organic channels", is_correct: true }, { text: "Super Bowl commercials", is_correct: false }] }
                    ]
                }
            },
            {
                title: "5. Financial Modeling & Metrics",
                description: "Understand CAC, LTV, and Cash Flow.",
                estimated_duration_minutes: 200,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## The Numbers That Matter\n\nWithout a clear understanding of your unit economics, your business cannot scale safely. Key metrics include Customer Acquisition Cost (CAC) and Lifetime Value (LTV).\n\n![Financial Charts](https://picsum.photos/seed/5picsum/1200/600)",
                quiz: {
                    title: "Unit Economics",
                    questions: [
                        { text: "What does CAC stand for?", options: [{ text: "Customer Acquisition Cost", is_correct: true }, { text: "Company Annual Capital", is_correct: false }] }
                    ]
                }
            }
        ]
    },
    {
        title: "Funding & Pitching Masters",
        description: "Connect with mentors, understand term sheets, and learn how to secure startup funding.",
        category_name: "Entrepreneurship",
        difficulty_level: "advanced",
        estimated_duration_hours: 10,
        modules: [
            {
                title: "1. The Bootstrapping Phase",
                description: "Funding your own venture.",
                estimated_duration_minutes: 90,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Self-Reliance\n\nBootstrapping means starting a business without outside investment. This forces you to focus on profitability from day one.\n\n![Bootstrapping](https://picsum.photos/seed/6picsum/1200/600)",
                quiz: {
                    title: "Bootstrapping",
                    questions: [{ text: "Bootstrapping involves raising venture capital.", options: [{ text: "False", is_correct: true }, { text: "True", is_correct: false }] }]
                }
            },
            {
                title: "2. The Perfect Pitch Deck",
                description: "Structure a narrative that investors love.",
                estimated_duration_minutes: 120,
                media_type: "text",
                media_url: "",
                content: "## Tell a Compelling Story\n\nInvestors look for a compelling narrative just as much as they look for solid metrics. Your pitch deck should be a maximum of 10-12 slides traversing the Problem, Solution, Market Size, Product, Traction, Team, and the Ask.\n\n![Pitching](https://picsum.photos/seed/7picsum/1200/600)",
                quiz: {
                    title: "Pitch Deck Basics",
                    questions: [
                        { text: "How long should a standard Seed pitch deck be?", options: [{ text: "10-12 slides", is_correct: true }, { text: "50 slides", is_correct: false }, { text: "Just 1 slide", is_correct: false }] }
                    ]
                }
            },
            {
                title: "3. Angel Investors vs. VCs",
                description: "Understanding your funding sources.",
                estimated_duration_minutes: 110,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Types of Capital\n\nAngel investors invest their own money, usually in earlier stages. Venture Capitalists (VCs) invest institutional money and expect massive returns.\n\n![Investors](https://picsum.photos/seed/8picsum/1200/600)",
                quiz: {
                    title: "Investors",
                    questions: [{ text: "Who generally invests their own personal capital?", options: [{ text: "Angel Investors", is_correct: true }, { text: "VC Funds", is_correct: false }] }]
                }
            },
            {
                title: "4. Understanding Term Sheets",
                description: "Decoding the legal jargon.",
                estimated_duration_minutes: 150,
                media_type: "text",
                media_url: "",
                content: "## The Fine Print\n\nA term sheet is a non-binding agreement setting forth the basic terms and conditions under which an investment will be made.\n\n![Term Sheet](https://picsum.photos/seed/9picsum/1200/600)",
                quiz: {
                    title: "Term Sheets",
                    questions: [{ text: "Is a term sheet legally binding?", options: [{ text: "Usually it is mostly non-binding (except for confidentiality/exclusivity)", is_correct: true }, { text: "Yes, fully binding", is_correct: false }] }]
                }
            },
            {
                title: "5. Negotiating Valuation",
                description: "How much is your company worth?",
                estimated_duration_minutes: 120,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## The Art of Valuation\n\nFor early-stage startups, valuation is more art than science. It's determined by the market, your team's strength, and your traction.\n\n![Negotiation](https://picsum.photos/seed/10picsum/1200/600)",
                quiz: {
                    title: "Valuation",
                    questions: [{ text: "Early stage startup valuation is based purely on discounted cash flow analysis.", options: [{ text: "False, it relies heavily on team, market, and traction.", is_correct: true }, { text: "True", is_correct: false }] }]
                }
            }
        ]
    },
    {
        title: "Sustainable Business Practices",
        description: "Build companies that generate profit without compromising the planet's future.",
        category_name: "Entrepreneurship",
        difficulty_level: "intermediate",
        estimated_duration_hours: 15,
        modules: [
            {
                title: "1. Triple Bottom Line",
                description: "People, Planet, Profit.",
                estimated_duration_minutes: 120,
                media_type: "text",
                media_url: "",
                content: "## Beyond Profit\n\nThe triple bottom line (TBL) is an accounting framework with three parts: social, environmental (or ecological) and financial.\n\n![Sustainable Business](https://picsum.photos/seed/11picsum/1200/600)\n\nBy implementing TBL, businesses commit to measuring their social and environmental impact.",
                quiz: {
                    title: "TBL Concept",
                    questions: [
                        { text: "What does the Triple Bottom Line stand for?", options: [{ text: "People, Planet, Profit", is_correct: true }, { text: "Profit, Price, Product", is_correct: false }] }
                    ]
                }
            },
            {
                title: "2. Circular Economy Principles",
                description: "Designing out waste.",
                estimated_duration_minutes: 140,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Closing the Loop\n\nA circular economy is an economic system aimed at eliminating waste and the continual use of resources.\n\n![Recycling](https://picsum.photos/seed/12picsum/1200/600)",
                quiz: {
                    title: "Circular Economy",
                    questions: [{ text: "A circular economy aims to eliminate what?", options: [{ text: "Waste", is_correct: true }, { text: "Profit", is_correct: false }] }]
                }
            },
            {
                title: "3. Ethical Supply Chains",
                description: "Sourcing materials responsibly.",
                estimated_duration_minutes: 130,
                media_type: "text",
                media_url: "",
                content: "## Knowing Your Sources\n\nAn ethical supply chain prioritizes the well-being of workers and the environment across the entire production process.\n\n![Supply Chain](https://picsum.photos/seed/13picsum/1200/600)",
                quiz: {
                    title: "Supply Chain",
                    questions: [{ text: "Ethical supply chains only care about the final manufacturer.", options: [{ text: "False, they care about the entire process.", is_correct: true }, { text: "True", is_correct: false }] }]
                }
            },
            {
                title: "4. Carbon Footprint Accounting",
                description: "Measuring your impact.",
                estimated_duration_minutes: 160,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Scope 1, 2, and 3 Emissions\n\nTo reduce emissions, a business must first measure them. This is categorized into three scopes by the GHG Protocol.\n\n![Carbon Map](https://picsum.photos/seed/14picsum/1200/600)",
                quiz: {
                    title: "Emissions Accounting",
                    questions: [{ text: "Which scope covers indirect emissions from the value chain?", options: [{ text: "Scope 3", is_correct: true }, { text: "Scope 1", is_correct: false }] }]
                }
            },
            {
                title: "5. B-Corp Certification",
                description: "Joining a global movement.",
                estimated_duration_minutes: 110,
                media_type: "text",
                media_url: "",
                content: "## Becoming a Force for Good\n\nB Corp Certification is a designation that a business is meeting high standards of verified performance, accountability, and transparency on factors from employee benefits and charitable giving to supply chain practices and input materials.\n\n![B Corp Sign](https://picsum.photos/seed/15picsum/1200/600)",
                quiz: {
                    title: "B-Corps",
                    questions: [{ text: "B-Corp certification verifies social and environmental performance.", options: [{ text: "True", is_correct: true }, { text: "False", is_correct: false }] }]
                }
            }
        ]
    },

    // --- CIVIC PARTICIPATION (3 Courses) ---
    {
        title: "Digital Government & Open Data",
        description: "Access public data and participate in transparent data-driven initiatives.",
        category_name: "Civic Participation",
        difficulty_level: "intermediate",
        estimated_duration_hours: 10,
        modules: [
            {
                title: "1. Understanding Open Data",
                description: "How to find and use government datasets.",
                estimated_duration_minutes: 120,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## The Power of Information\n\nOpen data is data that can be freely used, re-used and redistributed by anyone - subject only, at most, to the requirement to attribute and sharealike.\n\n![Data Analytics](https://picsum.photos/seed/16picsum/1200/600)\n\nGovernments across the world are releasing datasets on health, transport, and finance to stimulate civic innovation.",
                quiz: {
                    title: "Open Data Quiz",
                    questions: [{ text: "True or False: Open data means the data is copyrighted and must be purchased.", options: [{ text: "False", is_correct: true }, { text: "True", is_correct: false }] }]
                }
            },
            {
                title: "2. Freedom of Information Requests",
                description: "Navigating FOIA and similar acts.",
                estimated_duration_minutes: 110,
                media_type: "text",
                media_url: "",
                content: "## Your Right to Know\n\nFreedom of information laws allow access by the general public to data held by national governments.\n\n![Documents](https://picsum.photos/seed/17picsum/1200/600)",
                quiz: {
                    title: "FOIA",
                    questions: [{ text: "FOIA stands for Freedom Of Information Act.", options: [{ text: "True", is_correct: true }, { text: "False", is_correct: false }] }]
                }
            },
            {
                title: "3. Data Visualization for Advocacy",
                description: "Making data compelling.",
                estimated_duration_minutes: 150,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Seeing the Story\n\nRaw data is hard to digest. Data visualization turns numbers into stories that can move policymakers.\n\n![Chart](https://picsum.photos/seed/18picsum/1200/600)",
                quiz: {
                    title: "Data Vis",
                    questions: [{ text: "What is the main goal of data visualization in advocacy?", options: [{ text: "To make complex data easier to understand and more compelling", is_correct: true }, { text: "To hide the data", is_correct: false }] }]
                }
            },
            {
                title: "4. Digital Security for Activists",
                description: "Protecting your data.",
                estimated_duration_minutes: 130,
                media_type: "text",
                media_url: "",
                content: "## Staying Safe Online\n\nWhen working with sensitive civic data, practicing good operational security (OpSec) is critical. Use end-to-end encryption.\n\n![Cybersecurity](https://picsum.photos/seed/19picsum/1200/600)",
                quiz: {
                    title: "Cybersecurity",
                    questions: [{ text: "What type of encryption is recommended for activist communications?", options: [{ text: "End-to-End Encryption (E2EE)", is_correct: true }, { text: "No encryption", is_correct: false }] }]
                }
            },
            {
                title: "5. Civic Hackathons",
                description: "Collaborative problem solving.",
                estimated_duration_minutes: 100,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Building Solutions Together\n\nCivic hackathons bring together technologists, government officials, and citizens to rapidly prototype technological solutions to public problems.\n\n![Hackathon](https://picsum.photos/seed/20picsum/1200/600)",
                quiz: {
                    title: "Hackathons",
                    questions: [{ text: "Civic hackathons usually involve only software engineers.", options: [{ text: "False, they involve a diverse mix of citizens", is_correct: true }, { text: "True", is_correct: false }] }]
                }
            }
        ]
    },
    {
        title: "Community Organizing 101",
        description: "Engage in community processes and learn grassroots mobilization.",
        category_name: "Civic Participation",
        difficulty_level: "beginner",
        estimated_duration_hours: 12,
        modules: [
            {
                title: "1. The Foundations of Organizing",
                description: "What constitutes organizing?",
                estimated_duration_minutes: 120,
                media_type: "text",
                media_url: "",
                content: "## Power in Numbers\n\nCommunity organizing is the process of bringing people together to demand change. It builds power from the ground up.\n\n![Community Gathering](https://picsum.photos/seed/21picsum/1200/600)",
                quiz: {
                    title: "Organizing Basics",
                    questions: [{ text: "Community organizing builds power from...", options: [{ text: "The ground up (grassroots)", is_correct: true }, { text: "The top down", is_correct: false }] }]
                }
            },
            {
                title: "2. Building Coalitions",
                description: "Bringing diverse groups together.",
                estimated_duration_minutes: 150,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Combined Action\n\nA coalition is an alliance for combined action. When diverse groups unite under a shared goal, their collective voice amplifies significantly.\n\n![Handshake](https://picsum.photos/seed/22picsum/1200/600)",
                quiz: {
                    title: "Coalition Building",
                    questions: [{ text: "What is the primary benefit of a coalition?", options: [{ text: "Combined power and amplified voice", is_correct: true }, { text: "Higher taxes", is_correct: false }] }]
                }
            },
            {
                title: "3. Power Mapping",
                description: "Understanding who holds the keys.",
                estimated_duration_minutes: 110,
                media_type: "text",
                media_url: "",
                content: "## Identifying Decision Makers\n\nPower mapping is a visual tool used to identify who holds power regarding your specific issue, and who can influence those decision-makers.\n\n![Whiteboard Diagram](https://picsum.photos/seed/23picsum/1200/600)",
                quiz: {
                    title: "Power Mapping",
                    questions: [{ text: "Power mapping helps identify...", options: [{ text: "Decision makers and influencers", is_correct: true }, { text: "The best local restaurant", is_correct: false }] }]
                }
            },
            {
                title: "4. One-on-One Relational Meetings",
                description: "The core metric of organizing.",
                estimated_duration_minutes: 130,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## The Public Relationship\n\nOrganizing is built on relationships. The 1-on-1 meeting is designed to uncover mutual self-interest and build a foundation for action.\n\n![Meeting](https://picsum.photos/seed/24picsum/1200/600)",
                quiz: {
                    title: "1-on-1s",
                    questions: [{ text: "What is the purpose of a 1-on-1 relational meeting?", options: [{ text: "To uncover mutual self-interest", is_correct: true }, { text: "To sell a product", is_correct: false }] }]
                }
            },
            {
                title: "5. Escalating Tactics",
                description: "From petitions to direct action.",
                estimated_duration_minutes: 140,
                media_type: "text",
                media_url: "",
                content: "## Applying Pressure\n\nTactics must escalate. If a petition doesn't work, you move to a rally. If a rally doesn't work, you consider non-violent direct action.\n\n![Protest](https://picsum.photos/seed/25picsum/1200/600)",
                quiz: {
                    title: "Tactics",
                    questions: [{ text: "Should tactics generally de-escalate or escalate if demands aren't met?", options: [{ text: "Escalate", is_correct: true }, { text: "De-escalate", is_correct: false }] }]
                }
            }
        ]
    },
    {
        title: "AI-Powered Civic Tech",
        description: "How artificial intelligence is changing local governance and citizen reporting.",
        category_name: "Civic Participation",
        difficulty_level: "advanced",
        estimated_duration_hours: 14,
        modules: [
            {
                title: "1. Introduction to Civic Tech",
                description: "The intersection of tech and democracy.",
                estimated_duration_minutes: 100,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## The Architecture of Democracy\n\nCivic tech uses software to enhance the relationship between people and government.\n\n![Smart City](https://picsum.photos/seed/26picsum/1200/600)",
                quiz: {
                    title: "Civic Tech Overview",
                    questions: [{ text: "What is 'Civic Tech'?", options: [{ text: "Tech used to enhance government-citizen relationships", is_correct: true }, { text: "A new racing game", is_correct: false }] }]
                }
            },
            {
                title: "2. Smart Cities and Infrastructure",
                description: "Using algorithms for better municipal service delivery.",
                estimated_duration_minutes: 140,
                media_type: "text",
                media_url: "",
                content: "## IoT and Municipal Services\n\nSmart cities use IoT sensors and AI to manage traffic flows, energy grids, and waste management more efficiently.\n\n![Traffic Lights](https://picsum.photos/seed/27picsum/1200/600)",
                quiz: {
                    title: "Smart Cities",
                    questions: [{ text: "Smart cities utilize IoT sensors.", options: [{ text: "True", is_correct: true }, { text: "False", is_correct: false }] }]
                }
            },
            {
                title: "3. AI Chatbots in Public Services",
                description: "Automating 311.",
                estimated_duration_minutes: 120,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## 24/7 Citizen Support\n\nMany municipalities are deploying AI chatbots to handle routine citizen inquiries (like garbage collection schedules), freeing up human operators for complex issues.\n\n![Computer Screen](https://picsum.photos/seed/28picsum/1200/600)",
                quiz: {
                    title: "AI Chatbots",
                    questions: [{ text: "AI chatbots are useful for handling routine municipal inquiries.", options: [{ text: "True", is_correct: true }, { text: "False", is_correct: false }] }]
                }
            },
            {
                title: "4. Algorithmic Bias in Government",
                description: "The dangers of automated decision systems.",
                estimated_duration_minutes: 160,
                media_type: "text",
                media_url: "",
                content: "## Watch the Machine\n\nWhen AI is used for policing, sentencing, or welfare distribution, algorithmic bias can amplify historical discrimination.\n\n![Binary Code](https://picsum.photos/seed/29picsum/1200/600)",
                quiz: {
                    title: "Algorithmic Bias",
                    questions: [{ text: "Algorithmic bias is not a concern for government applications.", options: [{ text: "False, it is a major ethical concern", is_correct: true }, { text: "True", is_correct: false }] }]
                }
            },
            {
                title: "5. Participatory Budgeting Tech",
                description: "Digital democracy in action.",
                estimated_duration_minutes: 110,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Voting on Budgets\n\nDigital platforms now allow citizens to propose and vote directly on how a portion of the municipal budget is spent.\n\n![Voting App](https://picsum.photos/seed/30picsum/1200/600)",
                quiz: {
                    title: "Participatory Budgeting",
                    questions: [{ text: "Participatory budgeting allows citizens to decide how public money is spent.", options: [{ text: "True", is_correct: true }, { text: "False", is_correct: false }] }]
                }
            }
        ]
    },

    // --- CLIMATE ADVOCACY (4 Courses) ---
    {
        title: "Introduction to Climate Science",
        description: "Understand the fundamental science behind global warming and climate change.",
        category_name: "Climate Advocacy",
        difficulty_level: "beginner",
        estimated_duration_hours: 10,
        modules: [
            {
                title: "1. The Greenhouse Effect",
                description: "How Earth's atmosphere traps heat.",
                estimated_duration_minutes: 120,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## The Blanket Around the Earth\n\nThe greenhouse effect is a natural process that warms the Earth's surface. When the Sun's energy reaches the Earth's atmosphere, some of it is reflected back to space and the rest is absorbed and re-radiated by greenhouse gases.\n\n![Earth Atmosphere](https://picsum.photos/seed/31picsum/1200/600)",
                quiz: {
                    title: "Greenhouse Quiz",
                    questions: [{ text: "Is the greenhouse effect completely man-made?", options: [{ text: "No, it's a natural process that we are accelerating", is_correct: true }, { text: "Yes", is_correct: false }] }]
                }
            },
            {
                title: "2. Anthropogenic CO2 Emissions",
                description: "The human factor.",
                estimated_duration_minutes: 100,
                media_type: "text",
                media_url: "",
                content: "## The Hockey Stick Graph\n\nSince the industrial revolution, atmospheric CO2 levels have spiked dramatically, directly correlating with the burning of fossil fuels.\n\n![Smokestacks](https://picsum.photos/seed/32picsum/1200/600)",
                quiz: {
                    title: "Anthropogenic Emissions",
                    questions: [{ text: "What does 'anthropogenic' mean in the context of emissions?", options: [{ text: "Human-caused", is_correct: true }, { text: "Natural", is_correct: false }] }]
                }
            },
            {
                title: "3. Ocean Acidification",
                description: "The evil twin of global warming.",
                estimated_duration_minutes: 110,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Changing Chemistry\n\nThe ocean absorbs about 30% of the CO2 released in the atmosphere, causing it to become more acidic and threatening marine ecosystems.\n\n![Coral Reef](https://picsum.photos/seed/33picsum/1200/600)",
                quiz: {
                    title: "Ocean Acidification",
                    questions: [{ text: "The ocean absorbs roughly what percentage of emitted CO2?", options: [{ text: "30%", is_correct: true }, { text: "5%", is_correct: false }] }]
                }
            },
            {
                title: "4. Extreme Weather Attribution",
                description: "Connecting the dots.",
                estimated_duration_minutes: 130,
                media_type: "text",
                media_url: "",
                content: "## Not Just Weather\n\nScientists can now calculate how much more likely a specific extreme weather event (like a hurricane or heatwave) was made by climate change.\n\n![Storm](https://picsum.photos/seed/34picsum/1200/600)",
                quiz: {
                    title: "Extreme Weather",
                    questions: [{ text: "Climate change causes weather events to become more frequent and extreme.", options: [{ text: "True", is_correct: true }, { text: "False", is_correct: false }] }]
                }
            },
            {
                title: "5. Feedback Loops",
                description: "Tipping points in the climate system.",
                estimated_duration_minutes: 140,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Runaway Warming\n\nAs ice melts, less sunlight is reflected back to space (Albedo effect), leading to more warming and more melting—a positive feedback loop.\n\n![Melting Ice](https://picsum.photos/seed/35picsum/1200/600)",
                quiz: {
                    title: "Feedback Loops",
                    questions: [{ text: "The Albedo effect involves exactly what phenomenon?", options: [{ text: "Reflection of sunlight by light surfaces like ice", is_correct: true }, { text: "Carbon capture", is_correct: false }] }]
                }
            }
        ]
    },
    {
        title: "Grassroots Environmental Activism",
        description: "Lead environmental initiatives and drive climate action in your community.",
        category_name: "Climate Advocacy",
        difficulty_level: "intermediate",
        estimated_duration_hours: 14,
        modules: [
            {
                title: "1. Structuring a Campaign",
                description: "From demands to strategic action.",
                estimated_duration_minutes: 180,
                media_type: "text",
                media_url: "",
                content: "## Campaign Strategy 101\n\nAn effective climate campaign requires a clear target, a specific demand, and a timeline of escalating actions.\n\n![Climate Strike](https://picsum.photos/seed/36picsum/1200/600)",
                quiz: {
                    title: "Campaign Strategy",
                    questions: [{ text: "Which of these is crucial for an effective campaign?", options: [{ text: "A clear target and specific demand", is_correct: true }, { text: "Working in secret", is_correct: false }] }]
                }
            },
            {
                title: "2. Fossil Fuel Divestment",
                description: "Following the money.",
                estimated_duration_minutes: 130,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Financial Pressure\n\nDivestment campaigns pressure institutions (like universities) to pull their investment capital out of fossil fuel companies.\n\n![Stock Market](https://picsum.photos/seed/37picsum/1200/600)",
                quiz: {
                    title: "Divestment",
                    questions: [{ text: "What is the goal of a divestment campaign?", options: [{ text: "To remove financial investments from harmful industries", is_correct: true }, { text: "To invest more", is_correct: false }] }]
                }
            },
            {
                title: "3. Climate Communication",
                description: "Talking to skeptics.",
                estimated_duration_minutes: 110,
                media_type: "text",
                media_url: "",
                content: "## Finding Common Ground\n\nWhen communicating climate science, lead with shared values rather than bombarding people with terrifying data.\n\n![Conversation](https://picsum.photos/seed/38picsum/1200/600)",
                quiz: {
                    title: "Communication",
                    questions: [{ text: "When talking to climate skeptics, it's best to lead with...", options: [{ text: "Shared values", is_correct: true }, { text: "Scary charts", is_correct: false }] }]
                }
            },
            {
                title: "4. The Just Transition",
                description: "Leaving no worker behind.",
                estimated_duration_minutes: 140,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Equity in Green Jobs\n\nA Just Transition ensures that workers in fossil fuel industries are provided training and good union jobs in the new green economy.\n\n![Solar Installation](https://picsum.photos/seed/39picsum/1200/600)",
                quiz: {
                    title: "Just Transition",
                    questions: [{ text: "A 'Just Transition' focuses on...", options: [{ text: "Ensuring equity and jobs for displaced fossil fuel workers", is_correct: true }, { text: "Replacing workers with robots", is_correct: false }] }]
                }
            },
            {
                title: "5. Non-Violent Civil Disobedience",
                description: "The history of direct action.",
                estimated_duration_minutes: 160,
                media_type: "text",
                media_url: "",
                content: "## Disrupting the Status Quo\n\nWhen traditional political avenues fail, peaceful mass disruption has historically been necessary to force legislative change.\n\n![Protest Banner](https://picsum.photos/seed/40picsum/1200/600)",
                quiz: {
                    title: "Civil Disobedience",
                    questions: [{ text: "Civil disobedience involves violent acts of protest.", options: [{ text: "False, it emphasizes non-violent disruption", is_correct: true }, { text: "True", is_correct: false }] }]
                }
            }
        ]
    },
    {
        title: "Renewable Energy Transition",
        description: "The economics and engineering behind solar, wind, and geothermal energy.",
        category_name: "Climate Advocacy",
        difficulty_level: "advanced",
        estimated_duration_hours: 20,
        modules: [
            {
                title: "1. Solar Photovoltaics",
                description: "Capturing the sun's energy.",
                estimated_duration_minutes: 150,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Harnessing the Sun\n\nPhotovoltaics (PV) is the conversion of light into electricity using semiconducting materials.\n\n![Solar Panels](https://picsum.photos/seed/41picsum/1200/600)\n\nThe falling prices of solar panels have made decentralised energy generation accessible worldwide.",
                quiz: {
                    title: "Solar Quiz",
                    questions: [{ text: "What do Photovoltaics convert light into?", options: [{ text: "Electricity", is_correct: true }, { text: "Heat only", is_correct: false }] }]
                }
            },
            {
                title: "2. Wind Energy Dynamics",
                description: "Onshore vs Offshore.",
                estimated_duration_minutes: 140,
                media_type: "text",
                media_url: "",
                content: "## Turning Turbines\n\nWind turbines convert the kinetic energy of wind into electrical energy. Offshore wind farms utilize stronger, more consistent ocean winds.\n\n![Wind Turbines](https://picsum.photos/seed/42picsum/1200/600)",
                quiz: {
                    title: "Wind Energy",
                    questions: [{ text: "Why is offshore wind becoming popular?", options: [{ text: "Winds are generally stronger and more consistent", is_correct: true }, { text: "It looks prettier", is_correct: false }] }]
                }
            },
            {
                title: "3. Battery Storage Solutions",
                description: "Solving the intermittency problem.",
                estimated_duration_minutes: 160,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Storing Sunshine\n\nBecause the sun doesn't always shine and the wind doesn't always blow, grid-scale battery storage (like lithium-ion mega-packs) is required to balance the grid.\n\n![Batteries](https://picsum.photos/seed/43picsum/1200/600)",
                quiz: {
                    title: "Battery Storage",
                    questions: [{ text: "Why is battery storage crucial for renewables?", options: [{ text: "To solve the intermittency problem of sun and wind", is_correct: true }, { text: "To make energy heavier", is_correct: false }] }]
                }
            },
            {
                title: "4. Geothermal and Hydroelectric power",
                description: "Baseload renewables.",
                estimated_duration_minutes: 130,
                media_type: "text",
                media_url: "",
                content: "## Consistent Power\n\nGeothermal taps into the Earth's internal heat, while hydroelectric harnesses flowing water. Both provide excellent 'baseload' power.\n\n![Dam](https://picsum.photos/seed/44picsum/1200/600)",
                quiz: {
                    title: "Baseload",
                    questions: [{ text: "Geothermal and Hydroelectric can provide consistent baseload power.", options: [{ text: "True", is_correct: true }, { text: "False", is_correct: false }] }]
                }
            },
            {
                title: "5. The Smart Grid",
                description: "Modernizing transmission.",
                estimated_duration_minutes: 110,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## A Network of Energy\n\nA smart grid allows for two-way communication between the utility and its customers, essential for managing decentralized renewable inputs.\n\n![Grid Wires](https://picsum.photos/seed/45picsum/1200/600)",
                quiz: {
                    title: "Smart Grid",
                    questions: [{ text: "A smart grid allows for two-way communication.", options: [{ text: "True", is_correct: true }, { text: "False", is_correct: false }] }]
                }
            }
        ]
    },
    {
        title: "Climate Policy & International Law",
        description: "Analyze the Paris Agreement and international mechanisms for emissions reduction.",
        category_name: "Climate Advocacy",
        difficulty_level: "advanced",
        estimated_duration_hours: 16,
        modules: [
            {
                title: "1. The Paris Agreement",
                description: "Understand the landmark international treaty.",
                estimated_duration_minutes: 150,
                media_type: "text",
                media_url: "",
                content: "## A Global Pact\n\nThe Paris Agreement is a legally binding international treaty on climate change. It was adopted by 196 Parties at COP 21 in Paris.\n\n![UN Assembly](https://picsum.photos/seed/46picsum/1200/600)\n\nIts goal is to limit global warming to well below 2, preferably to 1.5 degrees Celsius, compared to pre-industrial levels.",
                quiz: {
                    title: "Paris Agreement Quiz",
                    questions: [{ text: "What is the aggressive goal of the Paris Agreement for temperature rise?", options: [{ text: "1.5 degrees Celsius", is_correct: true }, { text: "5 degrees Celsius", is_correct: false }] }]
                }
            },
            {
                title: "2. Carbon Pricing and Cap-and-Trade",
                description: "Economic mechanisms for reduction.",
                estimated_duration_minutes: 140,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Taxing Pollution\n\nCarbon pricing assigns a cost to emitting GHG emissions. A cap-and-trade system issues a limited number of emission permits that can be traded.\n\n![Factory](https://picsum.photos/seed/47picsum/1200/600)",
                quiz: {
                    title: "Carbon Pricing",
                    questions: [{ text: "Cap-and-trade places a limit on total emissions and allows companies to trade permits.", options: [{ text: "True", is_correct: true }, { text: "False", is_correct: false }] }]
                }
            },
            {
                title: "3. Nationally Determined Contributions (NDCs)",
                description: "How countries set targets.",
                estimated_duration_minutes: 130,
                media_type: "text",
                media_url: "",
                content: "## Country Pledges\n\nNDCs are at the heart of the Paris Agreement. They embody efforts by each country to reduce national emissions and adapt to the impacts of climate change.\n\n![Globe](https://picsum.photos/seed/48picsum/1200/600)",
                quiz: {
                    title: "NDCs",
                    questions: [{ text: "What does NDC stand for?", options: [{ text: "Nationally Determined Contributions", is_correct: true }, { text: "National Data Center", is_correct: false }] }]
                }
            },
            {
                title: "4. Loss and Damage Funding",
                description: "Reparations for vulnerable nations.",
                estimated_duration_minutes: 160,
                media_type: "video",
                media_url: getRandVideo(),
                content: "## Paying for the Damage\n\nLoss and damage refers to the negative impacts of climate change that occur despite adaptation and mitigation efforts, often disproportionately affecting the Global South.\n\n![Flooded Street](https://picsum.photos/seed/49picsum/1200/600)",
                quiz: {
                    title: "Loss and Damage",
                    questions: [{ text: "Loss and Damage funding aims to compensate countries that suffer disproportionate climate impacts.", options: [{ text: "True", is_correct: true }, { text: "False", is_correct: false }] }]
                }
            },
            {
                title: "5. The Role of the IPCC",
                description: "The scientific consensus.",
                estimated_duration_minutes: 120,
                media_type: "text",
                media_url: "",
                content: "## Synthesizing Science\n\nThe Intergovernmental Panel on Climate Change (IPCC) is the UN body for assessing the science related to climate change. Its reports dictate international policy.\n\n![Science Report](https://picsum.photos/seed/50picsum/1200/600)",
                quiz: {
                    title: "IPCC",
                    questions: [{ text: "Does the IPCC conduct its own original research?", options: [{ text: "No, it synthesizes existing peer-reviewed research", is_correct: true }, { text: "Yes, they have massive labs", is_correct: false }] }]
                }
            }
        ]
    }
];

// ... (Rest of the script remains identical for finding categories, authors, and inserting)

async function findOrCreateCategory(categoryName: string, icon: string, color: string): Promise<string> {
    const { data: categories, error } = await supabase
        .from('module_categories')
        .select('id')
        .ilike('name', `%${categoryName}%`)
        .limit(1);

    if (error) throw error;
    if (categories && categories.length > 0) return categories[0].id;

    const { data: newCategory, error: insertError } = await supabase
        .from('module_categories')
        .insert([{
            name: categoryName,
            description: `Dedicated category for ${categoryName}`,
            color: color,
            icon: icon,
            display_order: 10,
        }])
        .select('id')
        .single();

    if (insertError) throw insertError;
    return newCategory.id;
}

async function getAuthorId(): Promise<string> {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);
    if (error || !profiles || profiles.length === 0) throw new Error('Could not find admin author.');
    return profiles[0].id;
}

// Function to delete existing courses we just made to avoid massive duplication
async function cleanupOldCourses() {
    const { data: courses } = await supabase.from('courses').select('id, title').like('title', '%');
    // Because this is a test script on a dev db, clearing and remaking ensures clean state with 5 modules
    const coursesToDelete = [
        "Venture Creation: From Idea to Launch",
        "Funding & Pitching Masters",
        "Sustainable Business Practices",
        "Digital Government & Open Data",
        "Community Organizing 101",
        "AI-Powered Civic Tech",
        "Introduction to Climate Science",
        "Grassroots Environmental Activism",
        "Renewable Energy Transition",
        "Climate Policy & International Law"
    ];
    if (courses) {
        for (const c of courses) {
            if (coursesToDelete.includes(c.title)) {
                console.log("Cleaning up old version of course:", c.title)
                await supabase.from('courses').delete().eq('id', c.id);
                // Because of cascading deletes defined in the schema, this should wipe associated modules and quizzes
            }
        }
    }
}


async function seedData() {
    console.log('Starting seed process for 10 AI-generated courses (5 modules each)...');
    try {
        await cleanupOldCourses();

        const authorId = await getAuthorId();
        console.log(`Using Author ID: ${authorId}`);

        const categories = {
            "Entrepreneurship": await findOrCreateCategory("Entrepreneurship", "💼", "#f59e0b"),
            "Civic Participation": await findOrCreateCategory("Civic Participation", "🏛️", "#3b82f6"),
            "Climate Advocacy": await findOrCreateCategory("Climate Advocacy", "🌍", "#10b981")
        };

        for (const courseData of generatedCourses) {
            console.log(`\nProcessing Course: ${courseData.title}`);
            const categoryId = categories[courseData.category_name as keyof typeof categories];

            // 1. Insert Course
            const { data: course, error: courseError } = await supabase
                .from('courses')
                .insert([{
                    title: courseData.title,
                    description: courseData.description,
                    category_id: categoryId,
                    difficulty_level: courseData.difficulty_level,
                    estimated_duration_hours: courseData.estimated_duration_hours,
                    author_id: authorId,
                    status: 'published'
                }])
                .select('id')
                .single();

            if (courseError) throw new Error(`Course error: ${courseError.message}`);
            const courseId = course.id;

            // 2. Insert Modules
            let orderIndex = 0;
            for (const mod of courseData.modules) {
                console.log(`  -> Inserting Module: ${mod.title}`);
                const { data: moduleRecord, error: moduleError } = await supabase
                    .from('learning_modules')
                    .insert([{
                        title: mod.title,
                        description: mod.description,
                        content: mod.content,
                        category_id: categoryId,
                        difficulty_level: courseData.difficulty_level,
                        estimated_duration_minutes: mod.estimated_duration_minutes,
                        media_type: mod.media_type,
                        media_url: mod.media_url,
                        author_id: authorId,
                        status: 'published'
                    }])
                    .select('id')
                    .single();

                if (moduleError) throw new Error(`Module error: ${moduleError.message}`);
                const moduleId = moduleRecord.id;

                // 3. Link Module to Course
                await supabase.from('course_modules').insert([{
                    course_id: courseId,
                    module_id: moduleId,
                    order_index: orderIndex++,
                    is_required: true,
                }]);

                // 4. Insert Quiz if defined
                if (mod.quiz) {
                    // console.log(`    -> Inserting Quiz: ${mod.quiz.title}`);
                    const { data: quizRecord, error: quizError } = await supabase
                        .from('quizzes')
                        .insert([{
                            course_id: courseId,
                            module_id: moduleId,
                            title: mod.quiz.title,
                            description: `Test your knowledge on ${mod.title}`,
                            passing_score: 70
                        }])
                        .select('id')
                        .single();

                    if (quizError) throw new Error(`Quiz error: ${quizError.message}`);

                    // 5. Insert Questions and Options
                    let qIndex = 0;
                    for (const q of mod.quiz.questions) {
                        const { data: questionRecord, error: qError } = await supabase
                            .from('quiz_questions')
                            .insert([{
                                quiz_id: quizRecord.id,
                                question_text: q.text,
                                order_index: qIndex++
                            }])
                            .select('id')
                            .single();

                        if (qError) throw new Error(`Question error: ${qError.message}`);

                        const optionsToInsert = q.options.map((opt: any) => ({
                            question_id: questionRecord.id,
                            option_text: opt.text,
                            is_correct: opt.is_correct
                        }));

                        const { error: optError } = await supabase.from('quiz_options').insert(optionsToInsert);
                        if (optError) throw new Error(`Option error: ${optError.message}`);
                    }
                }
            }
        }
        console.log('\nSuccessfully seeded all 10 courses with 5 modules each, restoring media and quizzes!');
    } catch (err) {
        console.error('Seeding failed:', err);
    }
}

seedData();
