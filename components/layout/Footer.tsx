"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Mail, Github, Twitter, Linkedin, Heart } from 'lucide-react';

export function Footer() {
    const pathname = usePathname();
    const currentYear = new Date().getFullYear();

    // Hide footer on instructor pages (they have their own layout)
    if (pathname?.startsWith('/instructor')) return null;


    return (
        <footer className="bg-gray-900 text-gray-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-md">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">Kiongozi</span>
                        </div>
                        <p className="text-gray-400 mb-4 max-w-md">
                            Empowering Kenya's youth with skills for the green economy and digital future.
                            Learn, grow, and lead with purpose.
                        </p>
                        <div className="flex items-center space-x-4">
                            <a
                                href="https://twitter.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 bg-gray-800 hover:bg-orange-500 rounded-lg flex items-center justify-center transition-colors"
                            >
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a
                                href="https://linkedin.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 bg-gray-800 hover:bg-blue-500 rounded-lg flex items-center justify-center transition-colors"
                            >
                                <Linkedin className="w-5 h-5" />
                            </a>
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
                            >
                                <Github className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Platform Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Platform</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/courses" className="hover:text-orange-400 transition-colors">
                                    Browse Courses
                                </Link>
                            </li>
                            <li>
                                <Link href="/community" className="hover:text-orange-400 transition-colors">
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/community" className="hover:text-orange-400 transition-colors">
                                    Become an Instructor
                                </Link>
                            </li>
                            <li>
                                <Link href="/community" className="hover:text-orange-400 transition-colors">
                                    Pricing
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Support</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/community" className="hover:text-orange-400 transition-colors">
                                    Help Center
                                </Link>
                            </li>
                            <li>
                                <Link href="/community" className="hover:text-orange-400 transition-colors">
                                    Contact Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy-policy" className="hover:text-orange-400 transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms-of-service" className="hover:text-orange-400 transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/cookie-notice" className="hover:text-orange-400 transition-colors">
                                    Cookie Notice
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-12 pt-8 border-t border-gray-800">
                    <div className="flex flex-col md:flex-row items-center justify-between">
                        <p className="text-gray-400 text-sm">
                            © {currentYear} Kiongozi LMS. All rights reserved.
                        </p>

                    </div>
                </div>
            </div>
        </footer>
    );
}
