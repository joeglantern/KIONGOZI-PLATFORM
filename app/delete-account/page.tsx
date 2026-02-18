"use client";

import { useState } from 'react';
import type { Metadata } from 'next';

export default function DeleteAccountPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Delete Your Account
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        Kiongozi - AI-Powered Learning Platform
                    </p>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">

                    {/* Overview */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            How to Delete Your Account
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                            We respect your right to control your data. You can request the deletion of your Kiongozi account and all associated data by following the steps below.
                        </p>
                    </section>

                    {/* Steps */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            Steps to Request Account Deletion
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                    <span className="text-green-700 dark:text-green-300 font-bold text-sm">1</span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-1">
                                    Send an email to <a href="mailto:support@kiongozi.org" className="text-green-600 hover:underline font-medium">support@kiongozi.org</a> with the subject line <strong>&quot;Delete My Account&quot;</strong>.
                                </p>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                    <span className="text-green-700 dark:text-green-300 font-bold text-sm">2</span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-1">
                                    Include the <strong>email address</strong> associated with your Kiongozi account in the body of the email.
                                </p>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                    <span className="text-green-700 dark:text-green-300 font-bold text-sm">3</span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-1">
                                    We will verify your identity and process your deletion request within <strong>30 days</strong>.
                                </p>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                    <span className="text-green-700 dark:text-green-300 font-bold text-sm">4</span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-1">
                                    You will receive a confirmation email once your account and data have been permanently deleted.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* What Gets Deleted */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            Data That Will Be Deleted
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                            When your account is deleted, the following data will be <strong>permanently removed</strong>:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-2">
                            <li>Your account profile (name, email address)</li>
                            <li>Your chat history and conversations with the AI tutor</li>
                            <li>Your learning progress and preferences</li>
                            <li>Authentication credentials</li>
                            <li>Any other personal data stored in our systems</li>
                        </ul>
                    </section>

                    {/* What May Be Retained */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            Data That May Be Retained
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                            Certain data may be retained for a limited period after account deletion for the following purposes:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-2">
                            <li><strong>Server logs:</strong> Anonymous, aggregated usage logs may be retained for up to 90 days for security and abuse prevention purposes.</li>
                            <li><strong>Legal obligations:</strong> Data required to comply with legal obligations, resolve disputes, or enforce our agreements may be retained as required by law.</li>
                        </ul>
                    </section>

                    {/* Retention Period */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            Deletion Timeline
                        </h2>
                        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-6">
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                Account deletion requests are processed within <strong>30 days</strong> of receiving a verified request. All personal data is permanently deleted from our active systems within this period. Backup systems are purged within <strong>90 days</strong>.
                            </p>
                        </div>
                    </section>

                    {/* Contact */}
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            Contact Us
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            If you have any questions about the account deletion process, please contact us at{' '}
                            <a href="mailto:support@kiongozi.org" className="text-green-600 hover:underline font-medium">
                                support@kiongozi.org
                            </a>.
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
                    <p>© 2026 Kiongozi. Action for Sustainability Initiative (AFOSI).</p>
                    <div className="mt-2 space-x-4">
                        <a href="/privacy-policy" className="hover:text-green-600">Privacy Policy</a>
                        <a href="/terms-of-service" className="hover:text-green-600">Terms of Service</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
