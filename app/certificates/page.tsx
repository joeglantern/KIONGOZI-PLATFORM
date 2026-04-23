"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
import { useUser } from '@/app/contexts/UserContext';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Award, Download, Eye, ShieldCheck, FileText, Search, Linkedin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CertificatesSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import Image from 'next/image';

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const createCertificateDocument = (cert: any, userName: string, autoPrint = false) => {
    const courseTitle = escapeHtml(cert.course?.title || 'Course');
    const recipientName = escapeHtml(userName || 'Learner');
    const certificateNumber = escapeHtml(cert.certificate_number || 'Kiongozi');
    const issuedDate = new Date(cert.issued_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const currentYear = new Date().getFullYear();
    const safeIssuedDate = escapeHtml(issuedDate);
    const printScript = autoPrint ? '<script>window.onload = () => window.print();</script>' : '';

    return `<!DOCTYPE html>
<html>
<head>
    <title>Certificate - ${courseTitle}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Inter:wght@400;600;700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4 landscape; margin: 0; }
        body { 
            display: flex; justify-content: center; align-items: center; 
            min-height: 100vh; background: #f3f4f6; font-family: 'Inter', sans-serif;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;
        }
        .certificate-wrapper {
            width: 297mm; height: 210mm; /* A4 Landscape */
            background: #ffffff;
            position: relative;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            display: flex;
        }
        /* Background decorative elements */
        .bg-shape-1 {
            position: absolute; top: -150px; left: -150px;
            width: 600px; height: 600px;
            background: radial-gradient(circle, rgba(234, 88, 12, 0.04) 0%, rgba(255,255,255,0) 70%);
            border-radius: 50%; z-index: 1;
        }
        .bg-shape-2 {
            position: absolute; bottom: -200px; right: -100px;
            width: 800px; height: 800px;
            background: radial-gradient(circle, rgba(234, 88, 12, 0.08) 0%, rgba(255,255,255,0) 70%);
            border-radius: 50%; z-index: 1;
        }
        .bg-pattern {
            position: absolute; inset: 0;
            background-image: radial-gradient(rgba(234, 88, 12, 0.03) 1px, transparent 1px);
            background-size: 24px 24px; z-index: 1;
        }
        .side-accent {
            width: 16px; height: 100%;
            background: linear-gradient(180deg, #ea580c 0%, #fb923c 100%);
            z-index: 2;
        }
        .content {
            flex: 1; padding: 60px 80px; position: relative; z-index: 10;
            display: flex; flex-direction: column; justify-content: space-between;
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; }
        .logo-group { display: flex; flex-direction: column; }
        .logo-text { font-family: 'Inter', sans-serif; font-weight: 900; font-size: 28px; color: #111827; letter-spacing: -1px; }
        .logo-text span { color: #ea580c; }
        .logo-sub { font-size: 10px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; margin-top: 2px; }
        .cert-id { text-align: right; }
        .cert-id-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; margin-bottom: 4px; }
        .cert-id-value { font-family: monospace; font-size: 12px; color: #4b5563; font-weight: 600; background: #f3f4f6; padding: 6px 12px; border-radius: 6px; }

        .main-body { text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .award-title { font-family: 'Playfair Display', serif; font-size: 64px; font-weight: 900; color: #111827; margin-bottom: 15px; letter-spacing: -1px; }
        .award-subtitle { font-size: 14px; color: #ea580c; font-weight: 800; text-transform: uppercase; letter-spacing: 6px; margin-bottom: 40px; }
        .presented-to { font-size: 16px; color: #6b7280; margin-bottom: 20px; font-style: italic; }
        .recipient-name { 
            font-family: 'Playfair Display', serif; font-size: 72px; font-weight: 700; color: #ea580c; 
            line-height: 1.1; margin-bottom: 30px; padding: 0 40px;
        }
        .reason { font-size: 16px; color: #6b7280; margin-bottom: 10px; }
        .course-name { font-family: 'Inter', sans-serif; font-size: 32px; font-weight: 900; color: #111827; max-width: 800px; line-height: 1.2; letter-spacing: -0.5px; }

        .footer { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; }
        .signature-block { display: flex; flex-direction: column; align-items: center; width: 200px; }
        .date-text { font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 800; color: #111827; margin-bottom: 8px; }
        .signature-line { width: 100%; height: 2px; background: #e5e7eb; margin-bottom: 12px; }
        .signature-name { font-size: 14px; color: #111827; font-weight: 800; }
        .signature-title { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; font-weight: 600; }

        .seal-container { position: relative; width: 140px; height: 140px; display: flex; justify-content: center; align-items: center; }
        .seal-outer { position: absolute; inset: 0; background: #ea580c; border-radius: 50%; opacity: 0.05; transform: scale(1.1); }
        .seal-inner { width: 110px; height: 110px; background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; box-shadow: 0 10px 30px -5px rgba(234, 88, 12, 0.5); position: relative; z-index: 2; }
        .seal-icon { font-size: 32px; margin-bottom: 4px; font-family: 'Playfair Display', serif; font-weight: 700; font-style: italic; }
        .seal-text { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
        .seal-year { font-size: 9px; opacity: 0.9; margin-top: 4px; font-weight: 600; letter-spacing: 1px; }

        @media print {
            body { background: white; margin: 0; padding: 0; min-height: auto; }
            .certificate-wrapper { box-shadow: none; border: none; width: 100%; height: 99vh; }
        }
    </style>
</head>
<body>
    <div class="certificate-wrapper">
        <div class="bg-shape-1"></div>
        <div class="bg-shape-2"></div>
        <div class="bg-pattern"></div>
        <div class="side-accent"></div>
        
        <div class="content">
            <div class="header">
                <div class="logo-group">
                    <div class="logo-text">Kiongozi<span>.</span></div>
                    <div class="logo-sub">Learning Platform</div>
                </div>
                <div class="cert-id">
                    <div class="cert-id-label">Verify ID</div>
                    <div class="cert-id-value">${certificateNumber}</div>
                </div>
            </div>

            <div class="main-body">
                <div class="award-title">Certificate of Completion</div>
                <div class="award-subtitle">Verified Achievement</div>
                <div class="presented-to">This is proudly presented to</div>
                <div class="recipient-name">${recipientName}</div>
                <div class="reason">For successfully completing the program</div>
                <div class="course-name">${courseTitle}</div>
            </div>

            <div class="footer">
                <div class="signature-block">
                    <div class="date-text">${safeIssuedDate}</div>
                    <div class="signature-line"></div>
                    <div class="signature-name">Date of Issue</div>
                    <div class="signature-title">Official Record</div>
                </div>

                <div class="seal-container">
                    <div class="seal-outer"></div>
                    <div class="seal-inner">
                        <div class="seal-icon">K</div>
                        <div class="seal-text">Verified</div>
                        <div class="seal-year">EST. ${currentYear}</div>
                    </div>
                </div>

                <div class="signature-block">
                    <!-- Signature representation -->
                    <div style="font-family: 'Playfair Display', serif; font-size: 28px; font-style: italic; color: #111827; margin-bottom: 4px; line-height: 1;">A. Kiongozi</div>
                    <div class="signature-line"></div>
                    <div class="signature-name">Program Director</div>
                    <div class="signature-title">Kiongozi Platform</div>
                </div>
            </div>
        </div>
    </div>
    ${printScript}
</body>
</html>`;
};

const openCertificateDocument = (html: string) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export default function CertificatesPage() {
    const { user, profile } = useUser();
    const supabase = useMemo(() => createClient(), []);

    const [certificates, setCertificates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const handleDownload = (cert: any) => {
        const userName = profile?.full_name || 'Learner';
        const html = createCertificateDocument(cert, userName, true);
        openCertificateDocument(html);
    };

    const handlePreview = (cert: any) => {
        const userName = profile?.full_name || 'Learner';
        const html = createCertificateDocument(cert, userName, false);
        openCertificateDocument(html);
    };

    const handleShareToLinkedIn = (cert: any) => {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://learn.kiongozi.org';
        const verificationUrl = `${baseUrl}/verify/${cert.verification_code}`;
        const courseTitle = cert.course?.title || 'Kiongozi Professional Course';

        const linkedinUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(courseTitle)}&organizationName=${encodeURIComponent('The Kiongozi Platform')}&issueYear=${new Date(cert.issued_at).getFullYear()}&issueMonth=${new Date(cert.issued_at).getMonth() + 1}&certId=${encodeURIComponent(cert.certificate_number)}&certUrl=${encodeURIComponent(verificationUrl)}`;

        window.open(linkedinUrl, '_blank');
    };

    const fetchCertificates = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);

            // First, try a simple query to check if the table exists
            const { data, error } = await supabase
                .from('user_certificates')
                .select('*')
                .eq('user_id', user.id)
                .order('issued_at', { ascending: false });

            if (error) {
                // Log ALL error properties individually since Supabase errors don't JSON.stringify well
                console.error('Certificate fetch failed:',
                    'message:', error.message,
                    '| code:', error.code,
                    '| details:', error.details,
                    '| hint:', error.hint
                );
                // If table doesn't exist, just show empty state instead of crashing
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    setCertificates([]);
                    return;
                }
                return; // Don't throw, just show empty state
            }

            // If we got certificates, enrich them with course data
            if (data && data.length > 0) {
                const enriched = await Promise.all(data.map(async (cert) => {
                    const { data: courseData } = await supabase
                        .from('courses')
                        .select('title, module_categories(name)')
                        .eq('id', cert.course_id)
                        .single();
                    return { ...cert, course: courseData };
                }));
                setCertificates(enriched);
            } else {
                setCertificates([]);
            }
        } catch (error: any) {
            console.error('Unexpected certificate error:', error?.message || error);
            setCertificates([]);
        } finally {
            setLoading(false);
        }
    }, [supabase, user]);

    useEffect(() => {
        fetchCertificates();
    }, [fetchCertificates]);

    const filteredCertificates = certificates.filter(cert =>
        cert.course?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cert.certificate_number || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
            <div className="flex min-h-screen bg-gray-50/50">
                <div className="hidden lg:block">
                    <DashboardSidebar />
                </div>

                <main className="flex-1 p-4 lg:p-8">
                    <div className="max-w-6xl mx-auto">
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div>
                                <div className="flex items-center space-x-2 mb-2">
                                    <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-black text-orange-600 uppercase tracking-widest">Credential Gallery</span>
                                </div>
                                <h1 className="text-4xl font-black text-gray-900 tracking-tight">My Certificates</h1>
                                <p className="text-gray-500 mt-1 font-medium italic">Your verified proof of expertise, mastered on Kiongozi.</p>
                            </div>

                            <div className="relative group min-w-[300px]">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search by course or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-5 py-3.5 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/30 transition-all font-bold text-gray-900 shadow-sm"
                                />
                            </div>
                        </div>

                        <Breadcrumb items={[
                            { label: 'Achievements', href: '#' },
                            { label: 'Certificates' }
                        ]} />

                        {loading ? (
                            <CertificatesSkeleton />
                        ) : filteredCertificates.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredCertificates.map((cert) => (
                                    <motion.div
                                        key={cert.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 overflow-hidden group border-b-4 border-b-orange-500/20"
                                    >
                                        <div className="p-6">
                                            {/* Course Preview */}
                                            <div className="flex items-center space-x-4 mb-6">
                                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                                                    {cert.course?.thumbnail_url ? (
                                                        <Image
                                                            src={cert.course.thumbnail_url}
                                                            alt={cert.course.title}
                                                            width={64}
                                                            height={64}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-500">
                                                            <FileText className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">{cert.course?.module_categories?.name || 'Professional'}</div>
                                                    <h3 className="text-sm font-black text-gray-900 leading-tight line-clamp-2">{cert.course?.title}</h3>
                                                </div>
                                            </div>

                                            {/* Cert Info */}
                                            <div className="space-y-4 mb-6">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-gray-400">Issued On</span>
                                                    <span className="font-black text-gray-900">{new Date(cert.issued_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-gray-400">ID Number</span>
                                                    <span className="font-black text-gray-500 tracking-tighter">{cert.certificate_number}</span>
                                                </div>
                                                <div className="flex items-center space-x-1.5 text-xs text-green-600 font-black uppercase tracking-tighter bg-green-50 px-3 py-1.5 rounded-xl w-fit border border-green-100">
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    Verified Permanent
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <Button
                                                    variant="outline"
                                                    className="rounded-2xl border-gray-100 text-xs font-black uppercase tracking-widest h-12 flex items-center justify-center gap-2"
                                                    onClick={() => handleDownload(cert)}
                                                >
                                                    <Download className="w-4 h-4" /> Save PDF
                                                </Button>
                                                <Button
                                                    className="rounded-2xl bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest h-12 flex items-center justify-center gap-2"
                                                    onClick={() => handlePreview(cert)}
                                                >
                                                    <Eye className="w-4 h-4" /> Preview
                                                </Button>
                                            </div>
                                            <Button
                                                className="w-full rounded-2xl bg-[#0077b5] hover:bg-[#00669c] text-white text-xs font-black uppercase tracking-widest h-12 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/10"
                                                onClick={() => handleShareToLinkedIn(cert)}
                                            >
                                                <Linkedin className="w-4 h-4" /> Add to LinkedIn
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-[3rem] p-16 border border-gray-100 text-center shadow-sm">
                                <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Award className="w-10 h-10 text-orange-200" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">No Certificates Yet</h3>
                                <p className="text-gray-500 max-w-sm mx-auto font-medium mb-8">
                                    Complete courses to earn official certificates and showcase your expertise to the world.
                                </p>
                                <Button asChild className="bg-orange-600 hover:bg-orange-700 text-white font-black px-8 py-6 rounded-2xl shadow-lg shadow-orange-600/20">
                                    <Link href="/courses">
                                        Explore Courses
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
