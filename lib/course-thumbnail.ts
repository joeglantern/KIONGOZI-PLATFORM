const LOCAL_THUMBNAILS = {
    ai: '/course-thumbnails/artificial-intelligence-essentials.webp',
    civicData: '/course-thumbnails/civic-data-open-government.webp',
    computer: '/course-thumbnails/computer-basic-skills.webp',
    productivity: '/course-thumbnails/productivity-packages.webp',
    businessAdvocacy: '/course-thumbnails/business-advocacy-strategy.webp',
    legalEntrepreneurship: '/course-thumbnails/youth-entrepreneurship-legal.webp',
    fundingPitching: '/course-thumbnails/funding-and-pitching.webp',
    sustainableBusiness: '/course-thumbnails/sustainable-business.webp',
    productDevelopment: '/course-thumbnails/product-development-essentials.webp',
    impact: '/course-thumbnails/impact-measurement.webp',
    leadership: '/course-thumbnails/youth-leadership.webp',
    renewableEnergy: '/course-thumbnails/renewable-energy-transition.webp',
    climateScience: '/course-thumbnails/introduction-to-climate-science.webp',
    climatePolicy: '/course-thumbnails/climate-policy.webp',
} as const;

/**
 * One cover per course category, used when a course has no thumbnail of its
 * own and its title doesn't match a more specific cover below. Keys are
 * lower-cased category names from module_categories.
 */
const CATEGORY_COVERS: Record<string, string> = {
    'business': LOCAL_THUMBNAILS.businessAdvocacy,
    'civic participation': LOCAL_THUMBNAILS.civicData,
    'climate adaptation': LOCAL_THUMBNAILS.climateScience,
    'climate advocacy': LOCAL_THUMBNAILS.climatePolicy,
    'data science': LOCAL_THUMBNAILS.ai,
    'database': LOCAL_THUMBNAILS.computer,
    'devops': LOCAL_THUMBNAILS.computer,
    'digital entrepreneurship': LOCAL_THUMBNAILS.productDevelopment,
    'digital skills': LOCAL_THUMBNAILS.computer,
    'green economy fundamentals': LOCAL_THUMBNAILS.sustainableBusiness,
    'green skills': LOCAL_THUMBNAILS.sustainableBusiness,
    'leadership': LOCAL_THUMBNAILS.leadership,
    'mobile development': LOCAL_THUMBNAILS.computer,
    'programming': LOCAL_THUMBNAILS.computer,
    'renewable energy': LOCAL_THUMBNAILS.renewableEnergy,
    'security': LOCAL_THUMBNAILS.computer,
    'sexual and reproductive health & rights': LOCAL_THUMBNAILS.leadership,
    'sustainable agriculture': LOCAL_THUMBNAILS.sustainableBusiness,
    'web development': LOCAL_THUMBNAILS.computer,
};

type CourseThumbnailInput = {
    title?: string | null;
    description?: string | null;
    categoryName?: string | null;
    thumbnailUrl?: string | null;
};

function matchTitleCover(haystack: string): string | null {
    if (haystack.includes('artificial intelligence') || haystack.includes('ai-powered') || haystack.includes('civic tech')) {
        return LOCAL_THUMBNAILS.ai;
    }
    if (haystack.includes('digital government') || haystack.includes('open data')) {
        return LOCAL_THUMBNAILS.civicData;
    }
    if (haystack.includes('computer basic')) {
        return LOCAL_THUMBNAILS.computer;
    }
    if (haystack.includes('productivity') || haystack.includes('office tools')) {
        return LOCAL_THUMBNAILS.productivity;
    }
    if (haystack.includes('business advocacy') || haystack.includes('advocacy impact')) {
        return LOCAL_THUMBNAILS.businessAdvocacy;
    }
    if (haystack.includes('funding') || haystack.includes('pitching')) {
        return LOCAL_THUMBNAILS.fundingPitching;
    }
    if (haystack.includes('sustainable business') || haystack.includes('entrepreneurship education')) {
        return LOCAL_THUMBNAILS.sustainableBusiness;
    }
    if (haystack.includes('sheria') || haystack.includes('legal')) {
        return LOCAL_THUMBNAILS.legalEntrepreneurship;
    }
    if (haystack.includes('product development') || haystack.includes('venture creation') || haystack.includes('builder blueprint')) {
        return LOCAL_THUMBNAILS.productDevelopment;
    }
    if (haystack.includes('diagnosing impact') || haystack.includes('impact engine')) {
        return LOCAL_THUMBNAILS.impact;
    }
    if (haystack.includes('community organizing') || haystack.includes('grassroots')) {
        return LOCAL_THUMBNAILS.leadership;
    }
    if (haystack.includes('renewable energy') || haystack.includes('green economy')) {
        return LOCAL_THUMBNAILS.renewableEnergy;
    }
    if (haystack.includes('climate policy') || haystack.includes('international law')) {
        return LOCAL_THUMBNAILS.climatePolicy;
    }
    return null;
}

/**
 * Resolve a course cover: the course's own thumbnail first, then a cover that
 * matches the course title, then its category's cover. This keeps a missing
 * thumbnail from becoming a random stock image while instructors are still
 * adding media, and keeps courses in a category visually consistent.
 */
export function getCourseThumbnail({
    title,
    description,
    categoryName,
    thumbnailUrl,
}: CourseThumbnailInput): string {
    if (thumbnailUrl) return thumbnailUrl;

    const titleMatch = matchTitleCover(`${title ?? ''} ${description ?? ''}`.toLowerCase());
    if (titleMatch) return titleMatch;

    const categoryCover = categoryName ? CATEGORY_COVERS[categoryName.trim().toLowerCase()] : undefined;
    if (categoryCover) return categoryCover;

    const loose = `${title ?? ''} ${categoryName ?? ''}`.toLowerCase();
    if (loose.includes('climate')) return LOCAL_THUMBNAILS.climateScience;
    if (loose.includes('leader') || loose.includes('civic') || loose.includes('youth')) return LOCAL_THUMBNAILS.leadership;
    if (loose.includes('digital') || loose.includes('tech')) return LOCAL_THUMBNAILS.computer;

    return LOCAL_THUMBNAILS.productDevelopment;
}

export { LOCAL_THUMBNAILS, CATEGORY_COVERS };
