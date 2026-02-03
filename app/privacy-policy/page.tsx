import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy - Kiongozi',
    description: 'Privacy Policy for Kiongozi - AI-powered learning platform for Kenya\'s Green & Digital Transition',
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
                        Last Updated: February 3, 2026
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
                            Welcome to Kiongozi ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and web platform (collectively, the "Service").
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
                            2.1 Personal Information
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            When you create an account, we collect:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li>Email address</li>
                            <li>Name (optional)</li>
                            <li>Profile information you choose to provide</li>
                            <li>Authentication credentials (securely encrypted)</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                            2.2 Learning Data
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
                            <li>Quiz responses and assessment results</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                            2.3 Technical Information
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            We automatically collect certain technical information:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li>Device type and operating system</li>
                            <li>IP address and general location (country/city level)</li>
                            <li>Browser type and version</li>
                            <li>App version and usage statistics</li>
                            <li>Error logs and crash reports</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                            2.4 Voice Data (Optional)
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
                            <li><strong>Personalized Learning:</strong> To provide AI-powered recommendations and personalized learning paths based on your interests and skill level</li>
                            <li><strong>Service Delivery:</strong> To operate, maintain, and improve the Kiongozi platform</li>
                            <li><strong>Communication:</strong> To send you important updates, learning reminders, and educational content</li>
                            <li><strong>Analytics:</strong> To understand how users interact with our platform and improve user experience</li>
                            <li><strong>Security:</strong> To detect, prevent, and address technical issues and fraudulent activity</li>
                            <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                        </ul>
                    </section>

                    {/* Third-Party Services */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            4. Third-Party Services
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                            We use the following trusted third-party services to provide and improve our Service:
                        </p>

                        <div className="space-y-4">
                            <div className="border-l-4 border-green-500 pl-4">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">OpenAI</h4>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    Powers our AI chat assistant. Your chat messages are sent to OpenAI's API to generate responses. OpenAI's privacy policy: <a href="https://openai.com/privacy" className="text-green-600 hover:underline" target="_blank" rel="noopener noreferrer">openai.com/privacy</a>
                                </p>
                            </div>

                            <div className="border-l-4 border-blue-500 pl-4">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Supabase</h4>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    Provides authentication and database services. Your data is stored securely in Supabase's infrastructure. Supabase privacy policy: <a href="https://supabase.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">supabase.com/privacy</a>
                                </p>
                            </div>

                            <div className="border-l-4 border-purple-500 pl-4">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Expo (Mobile App)</h4>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    Provides mobile app infrastructure and over-the-air updates. Expo privacy policy: <a href="https://expo.dev/privacy" className="text-purple-600 hover:underline" target="_blank" rel="noopener noreferrer">expo.dev/privacy</a>
                                </p>
                            </div>
                        </div>

                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            We do not sell your personal information to third parties. We only share data with these service providers to the extent necessary to operate our Service.
                        </p>
                    </section>

                    {/* Data Security */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            5. Data Security
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            We implement industry-standard security measures to protect your information:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li>End-to-end encryption for data transmission (HTTPS/TLS)</li>
                            <li>Secure password hashing and authentication</li>
                            <li>Regular security audits and updates</li>
                            <li>Access controls and authentication requirements</li>
                            <li>Secure cloud infrastructure with automatic backups</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
                        </p>
                    </section>

                    {/* Data Retention */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            6. Data Retention
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            We retain your personal information for as long as your account is active or as needed to provide you services. If you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal or regulatory purposes.
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            Learning progress data and chat history are retained to improve your experience but can be deleted upon request.
                        </p>
                    </section>

                    {/* Your Rights */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            7. Your Rights and Choices
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            You have the following rights regarding your personal information:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                            <li><strong>Correction:</strong> Update or correct your personal information</li>
                            <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                            <li><strong>Export:</strong> Download your learning data and chat history</li>
                            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications (learning reminders will still be sent)</li>
                            <li><strong>Restrict Processing:</strong> Request limitation of how we use your data</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            To exercise these rights, please contact us at <a href="mailto:info@afosi.org" className="text-green-600 hover:underline">info@afosi.org</a> or use the settings within the app.
                        </p>
                    </section>

                    {/* Children's Privacy */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            8. Children's Privacy
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            Kiongozi is designed for users aged 13 and above. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately, and we will delete such information.
                        </p>
                    </section>

                    {/* International Users */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            9. International Data Transfers
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            Kiongozi is based in Kenya, but our service providers (OpenAI, Supabase) may store data in servers located in different countries. By using our Service, you consent to the transfer of your information to countries outside Kenya. We ensure that all such transfers comply with applicable data protection laws.
                        </p>
                    </section>

                    {/* Cookies and Tracking */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            10. Cookies and Tracking Technologies
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            We use cookies and similar tracking technologies to:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li>Keep you logged in to your account</li>
                            <li>Remember your preferences (dark mode, language)</li>
                            <li>Analyze platform usage and performance</li>
                            <li>Improve user experience</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            You can control cookies through your browser settings. However, disabling cookies may limit your ability to use certain features of our Service.
                        </p>
                    </section>

                    {/* Changes to Privacy Policy */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            11. Changes to This Privacy Policy
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically for any changes.
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            Your continued use of the Service after any modifications to the Privacy Policy will constitute your acknowledgment of the modifications and consent to abide by the updated Privacy Policy.
                        </p>
                    </section>

                    {/* Contact Information */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            12. Contact Us
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
                            13. Legal Compliance
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            This Privacy Policy complies with:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4 mt-3">
                            <li>Kenya Data Protection Act, 2019</li>
                            <li>General Data Protection Regulation (GDPR) - for EU users</li>
                            <li>California Consumer Privacy Act (CCPA) - for California users</li>
                            <li>Apple App Store Guidelines</li>
                            <li>Google Play Store Requirements</li>
                        </ul>
                    </section>

                    {/* Footer Note */}
                    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                            This Privacy Policy is effective as of February 3, 2026, and will remain in effect except with respect to any changes in its provisions in the future, which will be in effect immediately after being posted on this page.
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
