import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy - Kiongozi',
    description: 'Privacy Policy for Kiongozi - AI-powered learning and social platform for Kenya\'s Green & Digital Transition',
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Privacy Policy
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        Last Updated: May 30, 2026
                    </p>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">

                    {/* Introduction */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            1. Introduction
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            Welcome to Kiongozi ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and web platform (collectively, the "Service"), which includes AI-powered learning, social networking features, direct messaging, and course management.
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            By using Kiongozi, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our Service.
                        </p>
                    </section>

                    {/* Information We Collect */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            2. Information We Collect
                        </h2>

                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                            2.1 Account Information
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            When you create an account, we collect:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li>Email address</li>
                            <li>First name and last name</li>
                            <li>Username (public handle used on the platform)</li>
                            <li>Profile photo (optional)</li>
                            <li>Bio and profile information you choose to provide</li>
                            <li>Authentication credentials (securely encrypted)</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                            2.2 User-Generated Content
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            When you use Kiongozi's social features, we collect and store:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li>Posts, replies, and comments you create</li>
                            <li>Images and videos you upload or share</li>
                            <li>Reposts and quotes of other users' content</li>
                            <li>Bookmarks and content you save</li>
                            <li>Likes and other reactions to content</li>
                            <li>Hashtags and mentions you use</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
                            Content you post publicly is visible to other users of the platform. You can set your account to private, in which case your posts are only visible to approved followers.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                            2.3 Direct Messages
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            When you use Direct Messages (DMs), the content of your messages and any media shared within conversations is stored on our servers to enable message delivery and history. Direct messages are private between participants and are not used for advertising. We may access message content only when required by law or to investigate reports of policy violations.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                            2.4 Social Graph Data
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            To enable social features, we collect:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li>Accounts you follow and accounts that follow you</li>
                            <li>Follow requests sent and received</li>
                            <li>Accounts you have blocked or muted</li>
                            <li>Content reports you have submitted</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                            2.5 Learning Data
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            To personalize your learning experience, we collect:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li>Chat messages and conversations with Kiongozi AI</li>
                            <li>Learning module progress and completion status</li>
                            <li>Course enrollments and activity</li>
                            <li>Bookmarks and saved content</li>
                            <li>Learning preferences and interests</li>
                            <li>Time spent on modules and overall platform usage</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                            2.6 Device and Technical Information
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            We automatically collect certain technical information:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li>Device type and operating system</li>
                            <li>IP address and general location (country/city level)</li>
                            <li>App version and usage statistics</li>
                            <li>Push notification tokens (for sending notifications)</li>
                            <li>Error logs and crash reports</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                            2.7 Camera and Photo Library Access
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            When you choose to share photos or videos in posts, DMs, or your profile, we request access to your device camera and photo library. This access is only used when you actively choose to upload or capture media. We do not access your camera or photo library in the background.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                            2.8 Voice Data (Optional)
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            If you choose to use voice input features, we temporarily process your voice recordings to convert them to text. Voice recordings are not stored permanently and are deleted immediately after transcription.
                        </p>
                    </section>

                    {/* How We Use Your Information */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            3. How We Use Your Information
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            We use the collected information for the following purposes:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li><strong>Social Features:</strong> To enable posts, DMs, follows, notifications, and other social interactions between users</li>
                            <li><strong>Personalized Learning:</strong> To provide AI-powered recommendations and personalized learning paths</li>
                            <li><strong>Content Delivery:</strong> To display your content to your followers and the wider community</li>
                            <li><strong>Notifications:</strong> To send push notifications about interactions, new followers, direct messages, and platform updates</li>
                            <li><strong>Content Moderation:</strong> To review reported content and enforce our community guidelines</li>
                            <li><strong>Service Delivery:</strong> To operate, maintain, and improve the Kiongozi platform</li>
                            <li><strong>Safety and Security:</strong> To detect, prevent, and address abuse, spam, harassment, and fraudulent activity</li>
                            <li><strong>Analytics:</strong> To understand how users interact with our platform and improve user experience</li>
                            <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                        </ul>
                    </section>

                    {/* Content Moderation */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            4. Content Moderation
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            Kiongozi is a community platform and we take the safety of our users seriously. We moderate user-generated content to enforce our Community Guidelines. Our moderation approach includes:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li><strong>User Reporting:</strong> Any user can report content or accounts that violate our guidelines using the in-app report feature</li>
                            <li><strong>Human Review:</strong> Reported content is reviewed by our moderation team</li>
                            <li><strong>Automated Filtering:</strong> We use automated systems to detect spam and obvious policy violations</li>
                            <li><strong>Account Actions:</strong> We may remove content, restrict accounts, or permanently ban users who repeatedly violate our guidelines</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
                            Content that violates our guidelines — including but not limited to harassment, hate speech, illegal content, and spam — will be removed. We maintain records of moderation actions to improve our systems and comply with legal obligations.
                        </p>
                    </section>

                    {/* Information Sharing */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            5. How We Share Your Information
                        </h2>

                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
                            5.1 Public Content
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            If your account is public, your posts, profile information, username, and follower/following counts are visible to all users of the platform. If your account is set to private, this content is only visible to your approved followers.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                            5.2 Third-Party Service Providers
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                            We use the following trusted third-party services:
                        </p>

                        <div className="space-y-4">
                            <div className="border-l-4 border-green-500 pl-4">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">OpenAI</h4>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    Powers our AI chat assistant. Your chat messages are sent to OpenAI's API to generate responses. Privacy policy: <a href="https://openai.com/privacy" className="text-green-600 hover:underline" target="_blank" rel="noopener noreferrer">openai.com/privacy</a>
                                </p>
                            </div>

                            <div className="border-l-4 border-blue-500 pl-4">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Supabase</h4>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    Provides authentication, database, and file storage services. Your data including posts, DMs, and media files are stored in Supabase's infrastructure. Privacy policy: <a href="https://supabase.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">supabase.com/privacy</a>
                                </p>
                            </div>

                            <div className="border-l-4 border-purple-500 pl-4">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Expo</h4>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    Provides mobile app infrastructure, over-the-air updates, and push notification delivery. Privacy policy: <a href="https://expo.dev/privacy" className="text-purple-600 hover:underline" target="_blank" rel="noopener noreferrer">expo.dev/privacy</a>
                                </p>
                            </div>
                        </div>

                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            We do not sell your personal information to third parties. We only share data with service providers to the extent necessary to operate our Service.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                            5.3 Legal Requirements
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            We may disclose your information if required by law, court order, or governmental authority, or when we believe disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, or respond to a government request.
                        </p>
                    </section>

                    {/* Data Security */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            6. Data Security
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            We implement industry-standard security measures to protect your information:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li>End-to-end encryption for data transmission (HTTPS/TLS)</li>
                            <li>Secure authentication with encrypted credential storage</li>
                            <li>Row-level security on our database to ensure users can only access their own data</li>
                            <li>Regular security audits and updates</li>
                            <li>Rate limiting to prevent abuse</li>
                            <li>Secure cloud infrastructure with automatic backups</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
                        </p>
                    </section>

                    {/* Data Retention */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            7. Data Retention
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            We retain your personal information for as long as your account is active or as needed to provide you services. If you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal or regulatory purposes.
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            Posts, DMs, and social content are deleted when you delete them or when your account is deleted. Deleted content may remain in backups for up to 30 days before being permanently removed.
                        </p>
                    </section>

                    {/* Your Rights */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            8. Your Rights and Choices
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            You have the following rights regarding your personal information:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                            <li><strong>Correction:</strong> Update or correct your personal information through your profile settings</li>
                            <li><strong>Deletion:</strong> Request deletion of your account and all associated data via Settings → Delete Account</li>
                            <li><strong>Export:</strong> Download your data including posts, DMs, and learning history through the app</li>
                            <li><strong>Privacy Controls:</strong> Set your account to private to control who sees your content</li>
                            <li><strong>Block and Mute:</strong> Block or mute other users to control your experience</li>
                            <li><strong>Notification Controls:</strong> Manage push notification preferences in your device settings</li>
                            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            To exercise these rights, use the in-app settings or contact us at <a href="mailto:info@afosi.org" className="text-green-600 hover:underline">info@afosi.org</a>.
                        </p>
                    </section>

                    {/* Push Notifications */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            9. Push Notifications
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            We send push notifications to inform you about new followers, likes, comments, direct messages, follow requests, and platform updates. You can disable push notifications at any time through your device's notification settings. Disabling push notifications does not affect your ability to use the app; you will still be able to see notifications within the app itself.
                        </p>
                    </section>

                    {/* Children's Privacy */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            10. Children's Privacy
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            Kiongozi is designed for users aged 13 and above. Our social features, including direct messaging and public posting, require users to be at least 13 years old. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at <a href="mailto:info@afosi.org" className="text-green-600 hover:underline">info@afosi.org</a> and we will delete such information promptly.
                        </p>
                    </section>

                    {/* International Users */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            11. International Data Transfers
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            Kiongozi is based in Kenya, but our service providers (OpenAI, Supabase, Expo) may store and process data in servers located in different countries including the United States and the European Union. By using our Service, you consent to the transfer of your information to countries outside Kenya. We ensure that all such transfers comply with applicable data protection laws including the Kenya Data Protection Act, 2019.
                        </p>
                    </section>

                    {/* Cookies and Tracking */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            12. Cookies and Tracking Technologies
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            On our web platform, we use cookies and similar tracking technologies to:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li>Keep you logged in to your account</li>
                            <li>Remember your preferences</li>
                            <li>Analyze platform usage and performance</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            On our mobile app, we use device storage (AsyncStorage and SecureStore) to maintain your session and preferences. We do not use third-party advertising trackers.
                        </p>
                    </section>

                    {/* Changes to Privacy Policy */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            13. Changes to This Privacy Policy
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new Privacy Policy on this page, updating the "Last Updated" date, and sending a notification through the app for material changes. We encourage you to review this Privacy Policy periodically.
                        </p>
                    </section>

                    {/* Contact Information */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            14. Contact Us
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                        </p>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                            <p className="text-gray-800 dark:text-gray-200 font-semibold mb-2">Kiongozi Platform</p>
                            <p className="text-gray-700 dark:text-gray-300">Organization: Action for Sustainability Initiative (AFOSI)</p>
                            <p className="text-gray-700 dark:text-gray-300">Email: <a href="mailto:info@afosi.org" className="text-green-600 hover:underline">info@afosi.org</a></p>
                            <p className="text-gray-700 dark:text-gray-300 mt-2">Location: Eldoret, Kenya</p>
                        </div>
                    </section>

                    {/* Legal Compliance */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            15. Legal Compliance
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            This Privacy Policy complies with:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4 mt-3">
                            <li>Kenya Data Protection Act, 2019</li>
                            <li>General Data Protection Regulation (GDPR) — for EU users</li>
                            <li>California Consumer Privacy Act (CCPA) — for California users</li>
                            <li>Apple App Store Guidelines</li>
                            <li>Google Play Store Requirements</li>
                        </ul>
                    </section>

                    {/* Footer Note */}
                    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                            This Privacy Policy is effective as of May 30, 2026. Previous versions are available upon request.
                        </p>
                    </div>
                </div>

                {/* Back to Home Link */}
                <div className="text-center mt-8">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium"
                    >
                        ← Back to Kiongozi
                    </a>
                </div>
            </div>
        </div>
    );
}
