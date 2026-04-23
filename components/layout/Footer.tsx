import Image from 'next/image';
import Link from 'next/link';
import { Mail, Github, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-900 text-gray-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center space-x-2 mb-4">
                            <Image
                                src="/logo.png"
                                alt="Kiongozi Logo"
                                width={40}
                                height={40}
                                className="w-10 h-10 object-contain drop-shadow-sm"
                            />
                            <span className="text-xl font-bold text-white">Kiongozi</span>
                        </div>
                        <p className="text-gray-400 mb-4 max-w-md">
                            Empowering Kenya's youth with skills for the green economy and digital future.
                            Learn, grow, and lead with purpose.
                        </p>
                        <a
                            href="mailto:user.support@kiongozi.org"
                            className="inline-flex items-center space-x-2 text-gray-400 hover:text-orange-400 transition-colors mb-4"
                        >
                            <Mail className="w-4 h-4" />
                            <span className="text-sm">user.support@kiongozi.org</span>
                        </a>
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
                                    Community
                                </Link>
                            </li>
                            <li>
                                <Link href="/impact-map" className="hover:text-orange-400 transition-colors">
                                    Impact Map
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Support</h3>
                        <ul className="space-y-2">
                            <li>
                                <a href="mailto:user.support@kiongozi.org" className="hover:text-orange-400 transition-colors">
                                    Contact Us
                                </a>
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
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-gray-400 text-sm">
                            © {currentYear} Kiongozi LMS. All rights reserved.
                        </p>
                        <div className="flex items-center space-x-6">
                            <Link href="/privacy-policy" className="text-gray-400 hover:text-orange-400 text-sm transition-colors">
                                Privacy Policy
                            </Link>
                            <Link href="/terms-of-service" className="text-gray-400 hover:text-orange-400 text-sm transition-colors">
                                Terms of Service
                            </Link>
                            <Link href="/cookie-notice" className="text-gray-400 hover:text-orange-400 text-sm transition-colors">
                                Cookie Notice
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
