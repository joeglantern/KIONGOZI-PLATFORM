import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://learn.kiongozi.org';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/auth/', // Prevent indexing auth routes
                '/instructor/', // Prevent indexing instructor dashboards
                '/admin/', // Prevent indexing admin dashboards
                '/settings/', // Prevent indexing user settings
                '/api/', // Prevent indexing backend APIs
            ],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
