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

                        <p>
                            Welcome to <strong>The Kiongozi Platform</strong> ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice or our practices with regard to your personal information, please contact us.
                        </p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">1. Information We Collect</h2>
                        <p>We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.</p>
                        <ul>
                            <li><strong>Personal Information Provided by You:</strong> We may collect names, phone numbers, email addresses, usernames, passwords, contact preferences, contact or authentication data, and other similar information.</li>
                            <li><strong>Social Media Login Data:</strong> We provide you with the option to register with us using your existing social media account details, like your Google account. If you choose to register in this way, we will collect the information described in the section called "How We Handle Your Social Logins" below.</li>
                            <li><strong>Automatically Collected Information:</strong> We automatically collect certain information when you visit, use, or navigate the Services. This information does not reveal your specific identity (like your name or contact information) but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our Services, and other technical information.</li>
                        </ul>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">2. How We Handle Your Social Logins</h2>
                        <p>Our Services offer you the ability to register and log in using your third-party social media account details (specifically, Google OAuth). Where you choose to do this, we will receive certain profile information about you from your social media provider. The profile information we receive will vary depending on the social media provider, but will often include your name, email address, profile picture, as well as other information you choose to make public on such a social media platform.</p>
                        <p>We will use the information we receive only for the purposes that are described in this privacy notice or that are otherwise made clear to you on the relevant Services. Please note that we do not control, and are not responsible for, other uses of your personal information by your third-party social media provider.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">3. How We Use Your Information</h2>
                        <p>We use personal information collected via our Services for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations:</p>
                        <ul>
                            <li>To facilitate account creation and logon process.</li>
                            <li>To post testimonials.</li>
                            <li>Request feedback.</li>
                            <li>To enable user-to-user communications.</li>
                            <li>To manage user accounts.</li>
                            <li>To send administrative information to you.</li>
                            <li>To protect our Services.</li>
                        </ul>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">4. Will Your Information Be Shared With Anyone?</h2>
                        <p>We only share and disclose your information in the following situations:</p>
                        <ul>
                            <li><strong>Compliance with Laws:</strong> We may disclose your information where we are legally required to do so in order to comply with applicable law, governmental requests, a judicial proceeding, court order, or legal process.</li>
                            <li><strong>Vital Interests and Legal Rights:</strong> We may disclose your information where we believe it is necessary to investigate, prevent, or take action regarding potential violations of our policies, suspected fraud, situations involving potential threats to the safety of any person and illegal activities.</li>
                            <li><strong>Vendors, Consultants, and Other Third-Party Service Providers:</strong> We may share your data with third-party vendors, service providers, contractors, or agents who perform services for us or on our behalf and require access to such information to do that work.</li>
                        </ul>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">5. Cookies and Similar Tracking Technologies</h2>
                        <p>We may use cookies and similar tracking technologies (like web beacons and pixels) to access or store information. Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">6. How Long Do We Keep Your Information?</h2>
                        <p>We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements). When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">7. How Do We Keep Your Information Safe?</h2>
                        <p>We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">8. What Are Your Privacy Rights?</h2>
                        <p>In some regions (like the EEA, UK, and California), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; and (iv) if applicable, to data portability. To make such a request, please use the contact details provided below.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">9. Controls for Do-Not-Track Features</h2>
                        <p>Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage no uniform technology standard for recognizing and implementing DNT signals has been finalized.</p>

                        <h2 className="text-2xl mt-10 mb-4 text-gray-900 dark:text-white">10. Contact Us</h2>
                        <p>If you have questions or comments about this notice, you may email us at our designated support email address.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
