"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
import { useUser } from '@/app/contexts/UserContext';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Award, Loader2, Download, Eye, ShieldCheck, FileText, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const generateCertificateHTML = (cert: any, userName: string) => {
    const courseTitle = cert.course?.title || 'Course';
    const issuedDate = new Date(cert.issued_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    return `<!DOCTYPE html>
<html>
<head>
    <title>Certificate - ${courseTitle}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@400;600;700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }
        .certificate {
            width: 1056px; height: 816px; background: white; position: relative;
            border: 3px solid #c9975b; padding: 60px; font-family: 'Inter', sans-serif;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        .certificate::before {
            content: ''; position: absolute; top: 12px; left: 12px; right: 12px; bottom: 12px;
            border: 1.5px solid #e8d5b8; pointer-events: none;
        }
        .header { text-align: center; margin-bottom: 30px; }
        .logo-text { font-family: 'Inter', sans-serif; font-weight: 900; font-size: 28px; color: #ea580c; letter-spacing: 8px; text-transform: uppercase; }
        .title { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 900; color: #1a1a1a; text-align: center; margin: 20px 0 10px; letter-spacing: 2px; }
        .subtitle { text-align: center; font-size: 13px; color: #999; font-weight: 700; text-transform: uppercase; letter-spacing: 6px; margin-bottom: 40px; }
        .presented { text-align: center; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 4px; font-weight: 600; }
        .recipient { font-family: 'Playfair Display', serif; font-size: 42px; font-weight: 700; text-align: center; color: #ea580c; margin: 15px 0; border-bottom: 2px solid #e8d5b8; display: inline-block; padding-bottom: 8px; }
        .recipient-wrap { text-align: center; }
        .course-label { text-align: center; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 4px; font-weight: 600; margin-top: 30px; }
        .course-name { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 700; text-align: center; color: #1a1a1a; margin: 10px 0 40px; }
        .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; position: absolute; bottom: 60px; left: 60px; right: 60px; }
        .footer-item { text-align: center; }
        .footer-label { font-size: 9px; color: #aaa; text-transform: uppercase; letter-spacing: 3px; font-weight: 700; margin-top: 8px; }
        .footer-value { font-size: 12px; color: #333; font-weight: 700; }
        .seal { width: 80px; height: 80px; border-radius: 50%; border: 2px solid #c9975b; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #fef3c7, #fde68a); }
        .seal-text { font-size: 9px; font-weight: 900; color: #92400e; text-transform: uppercase; letter-spacing: 1px; text-align: center; line-height: 1.3; }
        @media print {
            body { background: white; }
            .certificate { box-shadow: none; border: 3px solid #c9975b; }
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <div class="logo-text">Kiongozi</div>
        </div>
        <div class="title">Certificate of Completion</div>
        <div class="subtitle">This is to certify that</div>
        <div class="presented">is proudly awarded to</div>
        <div class="recipient-wrap"><span class="recipient">${userName}</span></div>
        <div class="course-label">for successfully completing</div>
        <div class="course-name">${courseTitle}</div>
        <div class="footer">
            <div class="footer-item">
                <div class="footer-value">${issuedDate}</div>
                <div class="footer-label">Date Issued</div>
            </div>
            <div class="seal">
                <div class="seal-text">Verified<br/>✓</div>
            </div>
            <div class="footer-item">
                <div class="footer-value">${cert.certificate_number}</div>
                <div class="footer-label">Certificate ID</div>
            </div>
        </div>
    </div>
    <script>window.onload = () => window.print();</script>
</body>
</html>`;
};

export default function CertificatesPage() {
    const { user, profile } = useUser();
    const supabase = createClient();

    const [certificates, setCertificates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const handleDownload = (cert: any) => {
        const userName = profile?.full_name || 'Learner';
        const html = generateCertificateHTML(cert, userName);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificate-${cert.certificate_number || 'Kiongozi'}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handlePreview = (cert: any) => {
        const userName = profile?.full_name || 'Learner';
        const html = generateCertificateHTML(cert, userName);
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
        }
    };

    const fetchCertificates = async () => {
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
                        .select('title, thumbnail_url')
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
    };

    useEffect(() => {
        fetchCertificates();
    }, [user]);

    const filteredCertificates = certificates.filter(cert =>
        cert.course?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.certificate_number.toLowerCase().includes(searchQuery.toLowerCase())
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
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Authenticating credentials...</p>
                            </div>
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
                                                        <img src={cert.course.thumbnail_url} alt={cert.course.title} className="w-full h-full object-cover" />
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
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="rounded-2xl border-gray-100 text-xs font-black uppercase tracking-widest h-12 flex items-center justify-center gap-2"
                                                    onClick={() => handleDownload(cert)}
                                                >
                                                    <Download className="w-4 h-4" /> Download
                                                </Button>
                                                <Button
                                                    className="rounded-2xl bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest h-12 flex items-center justify-center gap-2"
                                                    onClick={() => handlePreview(cert)}
                                                >
                                                    <Eye className="w-4 h-4" /> Preview
                                                </Button>
                                            </div>
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
                                <Button className="bg-orange-600 hover:bg-orange-700 text-white font-black px-8 py-6 rounded-2xl shadow-lg shadow-orange-600/20">
                                    Explore Courses
                                </Button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
