import { createClient } from "@/app/utils/supabase/server";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Award, ShieldCheck, Calendar, User, BookOpen, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

interface VerifyPageProps {
    params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
    const { code } = await params;
    const supabase = await createClient();

    const { data: cert } = await supabase
        .from("user_certificates")
        .select("*, courses(title)")
        .eq("verification_code", code)
        .single();

    if (!cert) return { title: "Certificate Not Found | Kiongozi" };

    const courseTitle = cert.courses?.title || "Professional Course";

    return {
        title: `Certificate Verification: ${courseTitle} | Kiongozi`,
        description: `Official Kiongozi Platform certificate verification for ${courseTitle}.`,
        openGraph: {
            title: `Verified Achievement: ${courseTitle}`,
            description: `Kiongozi Platform official record of completion. Verification Code: ${code}`,
            type: "website",
            images: ["/opengraph-image.png"],
        },
    };
}

export default async function VerifyPage({ params }: VerifyPageProps) {
    const { code } = await params;
    const supabase = await createClient();

    // Fetch certificate details with recipient profile and course info
    const { data: cert, error } = await supabase
        .from("user_certificates")
        .select(`
      *,
      profiles:user_id (full_name),
      courses:course_id (title, description, thumbnail_url)
    `)
        .eq("verification_code", code)
        .single();

    if (error || !cert) {
        notFound();
    }

    const issuedDate = new Date(cert.issued_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
            <div className="max-w-3xl w-full">
                {/* Verification Card */}
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-orange-500/10 border border-gray-100 overflow-hidden">
                    {/* Status Header */}
                    <div className="bg-orange-600 p-8 text-center text-white">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-md">
                            <ShieldCheck className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-black uppercase tracking-tight">Verified Credential</h1>
                        <p className="text-orange-100 font-medium opacity-90 mt-2">
                            This certificate is authentic and recorded in the Kiongozi database.
                        </p>
                    </div>

                    <div className="p-8 lg:p-12 space-y-10">
                        {/* Main Info Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Recipient</label>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 font-bold">
                                            {cert.profiles?.full_name?.[0] || <User className="w-6 h-6" />}
                                        </div>
                                        <span className="text-xl font-black text-gray-900">{cert.profiles?.full_name || 'Learner'}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Course Completed</label>
                                    <div className="flex items-start space-x-3">
                                        <BookOpen className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                                        <span className="text-lg font-bold text-gray-900 leading-tight">{cert.courses?.title}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 font-bold flex items-center">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Issued On
                                    </span>
                                    <span className="font-black text-gray-900">{issuedDate}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 font-bold flex items-center">
                                        <Globe className="w-4 h-4 mr-2" />
                                        Credential ID
                                    </span>
                                    <span className="font-mono text-xs font-black text-gray-700">{cert.certificate_number}</span>
                                </div>
                                <div className="pt-4 border-t border-gray-200">
                                    <div className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center">
                                        <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                        Blockchain Verified Permanent
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="bg-orange-50/50 p-8 rounded-3xl border border-orange-100/50">
                            <h3 className="text-sm font-black text-orange-900 uppercase tracking-widest mb-3">About Kiongozi Certification</h3>
                            <p className="text-gray-700 text-sm leading-relaxed font-medium">
                                This credential recognizes that the recipient has successfully mastered the required modules and demonstrated leadership excellence through the Kiongozi Platform's civic education and green transition curriculum.
                            </p>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-gray-100">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Issuer</span>
                                <span className="text-sm font-black text-gray-900">The Kiongozi Platform</span>
                            </div>
                            <Link href="/">
                                <Button className="bg-gray-900 text-white hover:bg-black px-8 py-6 rounded-2xl shadow-lg transition-all font-black uppercase text-xs tracking-widest">
                                    Explore Higher Learning
                                    <ExternalLink className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Branding Footer */}
                <div className="text-center mt-8 space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Kiongozi Platform Security Verification System v2.0
                    </p>
                    <div className="flex items-center justify-center space-x-1">
                        <Image src="/logo.png" alt="Logo" width={16} height={16} className="opacity-40" />
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Digital Trust Foundation</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
