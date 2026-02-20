import React from 'react';

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <main className="max-w-4xl mx-auto px-4 md:px-8 py-20 pb-32 pt-32">
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-10 md:p-16 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">Terms of Service</h1>
                    <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-orange-600 prose-p:text-gray-600 dark:prose-p:text-gray-300">
                        <p className="lead font-medium text-xl text-gray-500 mb-8">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">1. Agreement to Terms</h2>
                        <p>By accessing or using The Kiongozi Platform, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">2. Use License</h2>
                        <p>Permission is granted to temporarily download one copy of the materials on The Kiongozi Platform for personal, non-commercial transitory viewing only.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">3. User Accounts</h2>
                        <p>When you create an account with us, you must provide accurate, complete, and current information. You are responsible for safeguarding the password that you use to access the service.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">4. Disclaimer</h2>
                        <p>The materials on The Kiongozi Platform are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">5. Limitations</h2>
                        <p>In no event shall The Kiongozi Platform or its suppliers be liable for any damages arising out of the use or inability to use the materials on our platform.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
