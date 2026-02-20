import React from 'react';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <main className="max-w-4xl mx-auto px-4 md:px-8 py-20 pb-32 pt-32">
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-10 md:p-16 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">Privacy Policy</h1>
                    <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-orange-600 prose-p:text-gray-600 dark:prose-p:text-gray-300">
                        <p className="lead font-medium text-xl text-gray-500 mb-8">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">1. Introduction</h2>
                        <p>Welcome to The Kiongozi Platform. We respect your privacy and are committed to protecting your personal data.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">2. Data We Collect</h2>
                        <p>We may collect, use, store and transfer different kinds of personal data about you, including Identity Data (first name, last name, username), Contact Data (email address), and Profile Data.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">3. How We Use Your Data</h2>
                        <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data to provide our services, manage your account, and improve our platform.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">4. Data Security</h2>
                        <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">5. Contact Us</h2>
                        <p>If you have any questions about this Privacy Policy, please contact us at our support email.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
