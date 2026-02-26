"use client";

import React from 'react';
import { useCookieConsent } from '@/app/contexts/CookieConsentContext';
import { Settings } from 'lucide-react';

export default function CookieNoticePage() {
    const { setShowPreferences } = useCookieConsent();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <main className="max-w-4xl mx-auto px-4 md:px-8 py-20 pb-32 pt-32">
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-10 md:p-16 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">Cookie Notice</h1>
                    <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-orange-600 prose-p:text-gray-600 dark:prose-p:text-gray-300">
                        <p className="lead font-medium text-xl text-gray-500 mb-8">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>

                        {/* Manage Preferences CTA */}
                        <div className="not-prose mb-10 p-6 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-2xl">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Manage Your Cookie Preferences</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Choose which cookies you&apos;d like to allow. You can change your preferences at any time.</p>
                                </div>
                                <button
                                    onClick={() => setShowPreferences(true)}
                                    className="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:shadow-lg active:scale-[0.98] text-sm whitespace-nowrap flex-shrink-0"
                                >
                                    <Settings className="w-4 h-4" />
                                    <span>Cookie Settings</span>
                                </button>
                            </div>
                        </div>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">1. What Are Cookies?</h2>
                        <p>Cookies are small text files that are placed on your computer or mobile device when you browse websites. They are widely used to make websites work, or work more efficiently, as well as to provide information to the owners of the site.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">2. How We Use Cookies</h2>
                        <p>The Kiongozi Platform (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) uses cookies and similar tracking technologies to track the activity on our Service and hold certain information. We use these technologies for the following purposes:</p>
                        <ul>
                            <li><strong>Essential Cookies:</strong> These cookies are strictly necessary to provide you with services available through our website and to use some of its features, such as logging into secure areas (e.g., authentication cookies). These cookies cannot be disabled.</li>
                            <li><strong>Performance and Analytics Cookies:</strong> These cookies collect information about how you use our website, which pages you visited and which links you clicked on. None of this information can be used to identify you. It is all aggregated and, therefore, anonymized. These cookies are disabled by default and only activated with your explicit consent.</li>
                            <li><strong>Functional Cookies:</strong> These cookies allow our website to remember choices you make when you use our website, such as remembering your login details or language preference. These cookies are disabled by default and only activated with your explicit consent.</li>
                            <li><strong>Marketing Cookies:</strong> These cookies are used to deliver relevant advertisements and track the effectiveness of marketing campaigns across platforms. These cookies are disabled by default and only activated with your explicit consent.</li>
                        </ul>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">3. Third-Party Cookies</h2>
                        <p>In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the Service and deliver advertisements on and through the Service. For instance, when you authenticate using Google OAuth, authentication domains may set cookies to maintain your login session across our subdomains (e.g., single sign-on across our platforms).</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">4. Your Choices Regarding Cookies</h2>
                        <p>You can manage your cookie preferences at any time by clicking the &quot;Cookie Settings&quot; button above or the cookie icon in the bottom-left corner of any page. You can also disable cookies through your browser settings.</p>
                        <p>Please note that if you delete cookies or refuse to accept them, you might not be able to use all of the features we offer, you may not be able to store your preferences, and some of our pages might not display properly.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">5. Consent Logging</h2>
                        <p>In compliance with GDPR and applicable data protection regulations, we log your cookie consent decisions including the timestamp and your specific preferences. This record helps us demonstrate compliance and respect your choices.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">6. Contact Us</h2>
                        <p>If you have any questions about our Cookie Notice, please contact us at <a href="mailto:user.support@kiongozi.org" className="text-orange-600 hover:text-orange-700 underline font-semibold">user.support@kiongozi.org</a>.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
