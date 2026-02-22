import React from 'react';

export default function CookieNoticePage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <main className="max-w-4xl mx-auto px-4 md:px-8 py-20 pb-32 pt-32">
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-10 md:p-16 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">Cookie Notice</h1>
                    <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-orange-600 prose-p:text-gray-600 dark:prose-p:text-gray-300">
                        <p className="lead font-medium text-xl text-gray-500 mb-8">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">1. What Are Cookies?</h2>
                        <p>Cookies are small text files that are placed on your computer or mobile device when you browse websites. They are widely used to make websites work, or work more efficiently, as well as to provide information to the owners of the site.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">2. How We Use Cookies</h2>
                        <p>The Kiongozi Platform ("we", "us", "our") uses cookies and similar tracking technologies to track the activity on our Service and hold certain information. We use these technologies for the following purposes:</p>
                        <ul>
                            <li><strong>Essential Cookies:</strong> These cookies are strictly necessary to provide you with services available through our website and to use some of its features, such as logging into secure areas (e.g., authentication cookies).</li>
                            <li><strong>Performance and Analytics Cookies:</strong> These cookies collect information about how you use our website, which pages you visited and which links you clicked on. None of this information can be used to identify you. It is all aggregated and, therefore, anonymized.</li>
                            <li><strong>Functionality Cookies:</strong> These cookies allow our website to remember choices you make when you use our website, such as remembering your login details or language preference. The purpose of these cookies is to provide you with a more personal experience and to avoid you having to re-enter your preferences every time you visit our website.</li>
                        </ul>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">3. Third-Party Cookies</h2>
                        <p>In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the Service and deliver advertisements on and through the Service. For instance, when you authenticate using Google OAuth, authentication domains may set cookies to maintain your login session across our subdomains (e.g., single sign-on across our platforms).</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">4. Your Choices Regarding Cookies</h2>
                        <p>If you prefer to avoid the use of cookies on the website, you must first disable the use of cookies in your browser and then delete the cookies saved in your browser associated with this website. You may use this option for preventing the use of cookies at any time.</p>
                        <p>Please note that if you delete cookies or refuse to accept them, you might not be able to use all of the features we offer, you may not be able to store your preferences, and some of our pages might not display properly.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">5. Contact Us</h2>
                        <p>If you have any questions about our Cookie Notice, please contact our support team.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
