// Scenario checkpoint questions for lesson modules.
//
// NOTE: this is currently a hardcoded fallback bank keyed off the course/module
// title. It is a stepping stone toward admin/DB-managed checkpoints, keeping it
// isolated here makes that migration a drop-in replacement of this one function.

export interface ScenarioQuestion {
    id: string;
    question: string;
    description: string;
    options: {
        text: string;
        isCorrect: boolean;
        feedback: string;
    }[];
}

export function getQuestionsForModule(moduleId: string, courseTitle: string, moduleTitle: string): ScenarioQuestion[] {
    const text = `${courseTitle} ${moduleTitle}`.toLowerCase();

    if (text.includes('budget') || text.includes('civic') || text.includes('leadership') || text.includes('evidence')) {
        return [
            {
                id: `q_civic_1_${moduleId}`,
                question: "You notice the county budget has set aside 50M KES for 'Youth Centre renovations' but the local youth center is completely abandoned and decaying. What is your first, most effective step as an active civic youth?",
                description: "Choose the action that creates the most legitimate public accountability.",
                options: [
                    { text: "Post a rant on social media tagging the governor without any photos or data.", isCorrect: false, feedback: "Spicy, but doesn't create accountability. Hard evidence gets results!" },
                    { text: "File a formal request for information under the Access to Information Act (ATI) and submit a request to the County Assembly Clerk.", isCorrect: true, feedback: "Spot on! Official requests create a legal trail that officials cannot ignore." },
                    { text: "Organize an immediate protest outside the county office without informing the police.", isCorrect: false, feedback: "High risk, low immediate leverage. Gather the budget documents first." }
                ]
            }
        ];
    }

    if (text.includes('green') || text.includes('climate') || text.includes('environment') || text.includes('energy')) {
        return [
            {
                id: `q_green_1_${moduleId}`,
                question: "A local group wants to start an agricultural project in an area vulnerable to soil erosion. They have a small budget. What practice should they prioritize to build long-term sustainability?",
                description: "Select the method that protects both soil integrity and crop yield.",
                options: [
                    { text: "Buy chemical fertilizers to boost yield quickly.", isCorrect: false, feedback: "This only gives a temporary boost and harms the soil structure long-term." },
                    { text: "Implement agroforestry and plant cover crops to stabilize the topsoil.", isCorrect: true, feedback: "Awesome! Sustainable practices protect the soil, retain moisture, and guarantee yield!" },
                    { text: "Clear the remaining trees to maximize planting space.", isCorrect: false, feedback: "Clearing trees worsens erosion and exposes crops to wind damage." }
                ]
            }
        ];
    }

    if (text.includes('digital') || text.includes('tech') || text.includes('code') || text.includes('internet') || text.includes('web')) {
        return [
            {
                id: `q_digital_1_${moduleId}`,
                question: "You are setting up a digital service portal for local community artisans. You want to make sure their login details and customer information are secure. Which security step is essential?",
                description: "Select the most secure authentication setup.",
                options: [
                    { text: "Tell them to write down their passwords on a shared Google Doc.", isCorrect: false, feedback: "A shared doc is a massive security hazard. Never share passwords!" },
                    { text: "Enable HTTPS, hash all passwords, and implement Multi-Factor Authentication (MFA).", isCorrect: true, feedback: "Spot on! Secure transport and storage protect your community's identity." },
                    { text: "Only protect the admin pages and leave user logins unencrypted.", isCorrect: false, feedback: "All user logins need to be encrypted to prevent credential hijacking." }
                ]
            }
        ];
    }

    if (text.includes('entrepreneur') || text.includes('venture') || text.includes('business') || text.includes('pitch') || text.includes('marketing')) {
        return [
            {
                id: `q_entre_1_${moduleId}`,
                question: "You want to launch a local recycling business. Before investing your savings to buy a plastic shredding machine, what should you do first?",
                description: "Select the step that validates user demand with minimum waste.",
                options: [
                    { text: "Build a fancy website with mock pictures of your operations.", isCorrect: false, feedback: "A website is nice, but it doesn't validate if people will actually pay you." },
                    { text: "Interview 20 potential customers (businesses, households) to see if they would pay for trash collection or recycled items.", isCorrect: true, feedback: "Perfect! Validating demand first prevents wasting money on machines nobody needs." },
                    { text: "Register the company and hire a branding consultant.", isCorrect: false, feedback: "Avoid legal and branding overhead until you've proven people want the product." }
                ]
            }
        ];
    }

    return [
        {
            id: `q_fallback_1_${moduleId}`,
            question: "You are leading a group of young leaders in your ward. A developer starts building on a public playground without a visible environmental assessment license. What should you do?",
            description: "Choose the action that leverages legal and administrative tools.",
            options: [
                { text: "Ignore it, assuming someone else will take care of it.", isCorrect: false, feedback: "Civic passivity leads to the loss of public spaces. You are the leaders we've been waiting for!" },
                { text: "Coordinate with the Ward Administrator to check the developer's NEMA permit and report to the County Lands Office.", isCorrect: true, feedback: "Superb! Fact-checking permits and raising official flags is how you protect community assets." },
                { text: "Tear down the developer's fence under the cover of night.", isCorrect: false, feedback: "Destruction of property can get you arrested. Start with legal and administrative audit first." }
            ]
        }
    ];
}
