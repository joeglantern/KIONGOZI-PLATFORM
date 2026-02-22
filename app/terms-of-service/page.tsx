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

                        <p>
                            These Term of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and <strong>The Kiongozi Platform</strong> ("we," "us" or "our"), concerning your access to and use of our website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the "Site").
                        </p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">1. Agreement to Terms</h2>
                        <p>You agree that by accessing the Site, you have read, understood, and agree to be bound by all of these Terms of Service. If you do not agree with all of these Terms of Service, then you are expressly prohibited from using the Site and you must discontinue use immediately.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">2. User Registration & Single Sign-On</h2>
                        <p>You may be required to register with the Site, which includes options to register using third-party social media providers (such as Google OAuth). You agree to keep your password confidential and will be responsible for all use of your account and password. We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate, obscene, or otherwise objectionable.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">3. User Representations</h2>
                        <p>By using the Site, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary; (3) you have the legal capacity and you agree to comply with these Terms of Service; (4) you are not a minor in the jurisdiction in which you reside, or if a minor, you have received parental permission to use the Site; and (5) your use of the Site will not violate any applicable law or regulation.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">4. Prohibited Activities</h2>
                        <p>You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us. Prohibited activities include, but are not limited to:</p>
                        <ul>
                            <li>Systematically retrieving data or other content from the Site to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</li>
                            <li>Tricking, defrauding, or misleading us and other users, especially in any attempt to learn sensitive account information such as user passwords.</li>
                            <li>Circumventing, disabling, or otherwise interfering with security-related features of the Site.</li>
                            <li>Uploading or transmitting (or attempting to upload or to transmit) viruses, Trojan horses, or other material that interferes with any party's uninterrupted use and enjoyment of the Site.</li>
                            <li>Engaging in any automated use of the system, such as using scripts to send comments or messages, or using any data mining, robots, or similar data gathering and extraction tools.</li>
                        </ul>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">5. Intellectual Property Rights</h2>
                        <p>Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">6. Third-Party Websites and Content</h2>
                        <p>The Site may contain (or you may be sent via the Site) links to other websites ("Third-Party Websites") as well as articles, photographs, text, graphics, pictures, designs, music, sound, video, information, applications, software, and other content or items belonging to or originating from third parties ("Third-Party Content"). Such Third-Party Websites and Third-Party Content are not investigated, monitored, or checked for accuracy, appropriateness, or completeness by us, and we are not responsible for any Third-Party Websites accessed through the Site or any Third-Party Content posted on, available through, or installed from the Site.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">7. Term and Termination</h2>
                        <p>These Terms of Service shall remain in full force and effect while you use the Site. WITHOUT LIMITING ANY OTHER PROVISION OF THESE TERMS OF SERVICE, WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SITE (INCLUDING BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR FOR NO REASON.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">8. Disclaimer</h2>
                        <p>THE SITE IS PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SITE AND OUR SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SITE AND YOUR USE THEREOF.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">9. Limitations of Liability</h2>
                        <p>IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SITE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">10. Contact Us</h2>
                        <p>In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, please contact us via our official support channels.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
