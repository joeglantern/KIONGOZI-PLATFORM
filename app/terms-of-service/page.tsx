import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service - Kiongozi',
    description: 'Terms of Service for Kiongozi - AI-powered learning platform for Kenya\'s Green & Digital Transition',
};

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Terms of Service
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
                            1. Acceptance of Terms
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            Welcome to Kiongozi! By accessing or using our mobile application and web platform (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            These Terms constitute a legally binding agreement between you and Kiongozi. We reserve the right to update these Terms at any time, and your continued use of the Service constitutes acceptance of any changes.
                        </p>
                    </section>

                    {/* Service Description */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            2. Service Description
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            Kiongozi is an AI-powered learning platform focused on Kenya's Green & Digital Transition. We provide:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4 mt-3">
                            <li>Interactive AI chat assistant for learning support</li>
                            <li>Curated learning modules on green economy and digital skills</li>
                            <li>Progress tracking and personalized recommendations</li>
                            <li>Educational content tailored for the Kenyan context</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            The Service is provided "as is" and we reserve the right to modify, suspend, or discontinue any part of the Service at any time.
                        </p>
                    </section>

                    {/* User Accounts */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            3. User Accounts and Eligibility
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            To use Kiongozi, you must:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li>Be at least 13 years of age</li>
                            <li>Provide accurate and complete registration information</li>
                            <li>Maintain the security of your account credentials</li>
                            <li>Notify us immediately of any unauthorized access</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            You are responsible for all activities that occur under your account. We reserve the right to suspend or terminate accounts that violate these Terms.
                        </p>
                    </section>

                    {/* Acceptable Use */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            4. Acceptable Use Policy
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            You agree NOT to use the Service to:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                            <li>Violate any laws or regulations</li>
                            <li>Harass, abuse, or harm others</li>
                            <li>Share inappropriate, offensive, or illegal content</li>
                            <li>Attempt to hack, disrupt, or compromise the Service</li>
                            <li>Use automated systems (bots) without permission</li>
                            <li>Impersonate others or misrepresent your identity</li>
                            <li>Collect user data without consent</li>
                            <li>Use the Service for commercial purposes without authorization</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            Violation of this policy may result in immediate account termination.
                        </p>
                    </section>

                    {/* Intellectual Property */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            5. Intellectual Property Rights
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            All content on Kiongozi, including text, graphics, logos, software, and learning materials, is owned by Kiongozi or our licensors and is protected by copyright, trademark, and other intellectual property laws.
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            You may not copy, modify, distribute, sell, or create derivative works from our content without explicit written permission. You retain ownership of any content you create (such as chat messages), but grant us a license to use it to provide and improve the Service.
                        </p>
                    </section>

                    {/* AI-Generated Content */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            6. AI-Generated Content Disclaimer
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            Kiongozi uses artificial intelligence (powered by OpenAI) to provide learning assistance. While we strive for accuracy, AI-generated responses:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4 mt-3">
                            <li>May contain errors or inaccuracies</li>
                            <li>Should not be considered professional advice</li>
                            <li>Are for educational purposes only</li>
                            <li>Should be verified through additional sources</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            We are not responsible for decisions made based on AI-generated content. Always consult qualified professionals for important decisions.
                        </p>
                    </section>

                    {/* Payment and Subscriptions */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            7. Payment and Subscriptions
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            Kiongozi currently offers free access to its core features. If we introduce paid features or subscriptions in the future:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4 mt-3">
                            <li>Pricing will be clearly displayed before purchase</li>
                            <li>Payments are processed through secure third-party providers</li>
                            <li>Subscriptions auto-renew unless cancelled</li>
                            <li>Refunds will be handled according to our refund policy</li>
                        </ul>
                    </section>

                    {/* Limitation of Liability */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            8. Limitation of Liability
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            To the maximum extent permitted by law, Kiongozi and its creators shall not be liable for:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4 mt-3">
                            <li>Indirect, incidental, or consequential damages</li>
                            <li>Loss of data, profits, or business opportunities</li>
                            <li>Service interruptions or technical issues</li>
                            <li>Actions taken based on information from the Service</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            Our total liability shall not exceed the amount you paid to use the Service in the past 12 months (currently $0 for free users).
                        </p>
                    </section>

                    {/* Privacy */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            9. Privacy and Data Protection
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            Your privacy is important to us. Please review our <a href="/privacy-policy" className="text-green-600 hover:underline font-medium">Privacy Policy</a> to understand how we collect, use, and protect your personal information.
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            By using Kiongozi, you consent to our data practices as described in the Privacy Policy.
                        </p>
                    </section>

                    {/* Termination */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            10. Account Termination
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            You may delete your account at any time through the app settings. We may suspend or terminate your account if:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4 mt-3">
                            <li>You violate these Terms of Service</li>
                            <li>You engage in fraudulent or illegal activity</li>
                            <li>Your account has been inactive for an extended period</li>
                            <li>We are required to do so by law</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            Upon termination, your access to the Service will cease, and we may delete your data in accordance with our Privacy Policy.
                        </p>
                    </section>

                    {/* Governing Law */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            11. Governing Law and Dispute Resolution
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            These Terms are governed by the laws of Kenya. Any disputes arising from these Terms or your use of the Service shall be resolved through:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4 mt-3">
                            <li>Good faith negotiation between the parties</li>
                            <li>Mediation, if negotiation fails</li>
                            <li>Arbitration or courts in Kenya, as a last resort</li>
                        </ol>
                    </section>

                    {/* Changes to Terms */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            12. Changes to These Terms
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            We may update these Terms from time to time. Significant changes will be communicated through:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4 mt-3">
                            <li>In-app notifications</li>
                            <li>Email to your registered address</li>
                            <li>Prominent notice on our website</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                            Your continued use of the Service after changes take effect constitutes acceptance of the new Terms.
                        </p>
                    </section>

                    {/* Contact */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            13. Contact Information
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                            If you have questions about these Terms, please contact us:
                        </p>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                            <p className="text-gray-800 dark:text-gray-200 font-semibold mb-2">Kiongozi Platform</p>
                            <p className="text-gray-700 dark:text-gray-300">Organization: Action for Sustainability Initiative (AFOSI)</p>
                            <p className="text-gray-700 dark:text-gray-300">Email: <a href="mailto:info@afosi.org" className="text-blue-600 hover:underline">info@afosi.org</a></p>
                            <p className="text-gray-700 dark:text-gray-300 mt-2">Location: Eldoret, Kenya</p>
                        </div>
                    </section>

                    {/* Acknowledgment */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            14. Acknowledgment
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            By using Kiongozi, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
                        </p>
                    </section>

                    {/* Footer Note */}
                    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                            These Terms of Service are effective as of February 3, 2026. Thank you for being part of the Kiongozi learning community!
                        </p>
                    </div>
                </div>

                {/* Navigation Links */}
                <div className="flex justify-center gap-6 mt-8">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                        ← Back to Kiongozi
                    </a>
                    <span className="text-gray-400">|</span>
                    <a
                        href="/privacy-policy"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                        Privacy Policy →
                    </a>
                </div>
            </div>
        </div>
    );
}
