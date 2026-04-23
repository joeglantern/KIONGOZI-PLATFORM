"use client";

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/app/utils/supabaseClient';
import { useUser } from '@/app/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle2, User as UserIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

function splitFullName(fullName?: string | null) {
    if (!fullName) {
        return { firstName: '', lastName: '' };
    }

    const parts = fullName
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean);

    return {
        firstName: parts[0] ?? '',
        lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
    };
}

function getSafeNext(next: string | null) {
    if (!next || !next.startsWith('/') || next.startsWith('//')) {
        return null;
    }

    return next;
}

export default function CompleteProfilePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
            <CompleteProfileContent />
        </Suspense>
    );
}

function CompleteProfileContent() {
    const { user, profile, refreshProfile, loading: authLoading } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');

    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const next = getSafeNext(searchParams.get('next'));

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
                return;
            }
            if (profile) {
                const parsedName = splitFullName(profile.full_name);
                if (profile.first_name || parsedName.firstName) {
                    setFirstName(profile.first_name ?? parsedName.firstName);
                }
                if (profile.last_name) setLastName(profile.last_name);
                else if (parsedName.lastName) setLastName(parsedName.lastName);
                if (profile.username) setUsername(profile.username);

                const hasDisplayName = Boolean(profile.first_name?.trim() || profile.full_name?.trim());

                if (profile.username && hasDisplayName) {
                    router.replace(next ?? '/dashboard');
                }
            }
        }
    }, [user, profile, authLoading, next, router]);

    // Check username availability with debouncing
    useEffect(() => {
        const checkUsername = async () => {
            if (!username || username.trim().length < 3) {
                setUsernameAvailable(null);
                return;
            }

            // Client-side regex check first (alphanumeric and underscores)
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                setUsernameAvailable(false);
                return;
            }

            setIsCheckingUsername(true);
            try {
                // Check if username exists, ignoring the current user's own profile id
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', username.trim().toLowerCase())
                    .neq('id', user?.id)
                    .single();

                // If data is returned, username is taken. If no data (PGRST116), it's available.
                if (data) {
                    setUsernameAvailable(false);
                } else if (error && error.code === 'PGRST116') {
                    setUsernameAvailable(true);
                } else if (error) {
                    throw error;
                }
            } catch (err) {
                console.error("Error checking username:", err);
                setUsernameAvailable(null);
            } finally {
                setIsCheckingUsername(false);
            }
        };

        const timer = setTimeout(() => {
            checkUsername();
        }, 500);

        return () => clearTimeout(timer);
    }, [username, user?.id, supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!firstName.trim() || !username.trim()) {
            setError('First name and username are required.');
            return;
        }

        if (usernameAvailable === false) {
            setError('This username is already taken or invalid.');
            return;
        }

        setIsSubmitting(true);

        try {
            const finalUsername = username.trim().toLowerCase();
            const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    first_name: firstName.trim(),
                    last_name: lastName.trim() || null,
                    full_name: fullName,
                    username: finalUsername
                })
                .eq('id', user?.id);

            if (updateError) {
                if (updateError.code === '23505') { // Unique constraint violation
                    setError('This username is already taken. Please choose another.');
                    setUsernameAvailable(false);
                } else {
                    throw updateError;
                }
                return;
            }

            toast({
                title: 'Profile Completed',
                description: 'Welcome aboard! Your profile is now set up.',
            });

            await refreshProfile();
            router.replace(next ?? '/dashboard');

        } catch (err: any) {
            console.error('Submission error:', err);
            setError(err.message || 'Failed to update profile.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="bg-orange-600 p-6 text-center">
                    <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                        <UserIcon className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Complete Your Profile</h1>
                    <p className="text-orange-100 text-sm">
                        Just a few details needed before you can join the community!
                    </p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="Jane"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Unique Username <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">@</span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                    className={`w-full pl-8 pr-12 py-2 border ${usernameAvailable === false ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-orange-500'} rounded-lg focus:ring-2 focus:border-transparent transition-all`}
                                    placeholder="jane_doe"
                                    required
                                    minLength={3}
                                    maxLength={20}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {isCheckingUsername && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                                    {!isCheckingUsername && usernameAvailable === true && username.length >= 3 && (
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    )}
                                    {!isCheckingUsername && usernameAvailable === false && username.length > 0 && (
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                    )}
                                </div>
                            </div>
                            <p className="mt-1.5 text-xs text-gray-500">
                                Only letters, numbers, and underscores (min. 3 characters).
                            </p>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting || usernameAvailable === false || username.length < 3 || !firstName.trim()}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold shadow-md transition-all"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Saving Profile...
                                </span>
                            ) : (
                                "Complete Profile"
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
