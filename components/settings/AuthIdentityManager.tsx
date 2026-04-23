"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { UserIdentity } from '@supabase/supabase-js';
import { createClient } from '@/app/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    AlertCircle,
    CheckCircle2,
    KeyRound,
    Link2,
    Loader2,
    Mail,
    ShieldCheck,
    Unlink2
} from 'lucide-react';

type ConnectionState = {
    identity: UserIdentity | null;
    connected: boolean;
    label: string;
    detail: string;
};

function isSafeNext(next: string | null) {
    return Boolean(next && next.startsWith('/') && !next.startsWith('//'));
}

function getIdentityEmail(identity: UserIdentity | null) {
    const value = identity?.identity_data?.email;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function formatIdentityError(message: string) {
    const normalized = message.toLowerCase();

    if (normalized.includes('manual linking') && normalized.includes('disabled')) {
        return 'Google account linking is disabled in Supabase Auth settings. Enable manual linking in the Supabase dashboard to use this feature.';
    }

    if (normalized.includes('already linked') || normalized.includes('identity is already linked')) {
        return 'That Google account is already connected to a different Kiongozi account. Sign in with that account instead, or contact support if you need help merging access.';
    }

    if (normalized.includes('last identity') || normalized.includes('only identity')) {
        return 'You need at least one working sign-in method on the account. Add another method before disconnecting this one.';
    }

    return message;
}

export function AuthIdentityManager({
    email,
    className = '',
}: {
    email?: string | null;
    className?: string;
}) {
    const pathname = usePathname();
    const supabase = useMemo(() => createClient(), []);
    const { toast } = useToast();

    const [identities, setIdentities] = useState<UserIdentity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyProvider, setBusyProvider] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordFormOpen, setPasswordFormOpen] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);

    const loadIdentities = useCallback(async () => {
        setLoading(true);
        setError(null);

        const { data, error: identitiesError } = await supabase.auth.getUserIdentities();

        if (identitiesError) {
            setError(formatIdentityError(identitiesError.message));
            setIdentities([]);
            setLoading(false);
            return;
        }

        setIdentities(data.identities ?? []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        void loadIdentities();
    }, [loadIdentities]);

    const emailIdentity = identities.find((identity) => identity.provider === 'email') ?? null;
    const googleIdentity = identities.find((identity) => identity.provider === 'google') ?? null;
    const connectedCount = identities.length;
    const canDisconnect = connectedCount > 1;
    const hasPassword = Boolean(emailIdentity);

    const passwordState: ConnectionState = {
        identity: emailIdentity,
        connected: hasPassword,
        label: 'Password login',
        detail: hasPassword
            ? `Enabled for ${getIdentityEmail(emailIdentity) ?? email ?? 'this account'}`
            : 'No password backup is configured yet.',
    };

    const googleState: ConnectionState = {
        identity: googleIdentity,
        connected: Boolean(googleIdentity),
        label: 'Google',
        detail: googleIdentity
            ? `Connected to ${getIdentityEmail(googleIdentity) ?? 'your Google account'}`
            : 'Not connected yet.',
    };

    const handleLinkGoogle = async () => {
        setBusyProvider('google-link');
        setError(null);

        const redirectTo = new URL('/auth/callback', window.location.origin);
        if (isSafeNext(pathname)) {
            redirectTo.searchParams.set('next', pathname);
        }

        const { error: linkError } = await supabase.auth.linkIdentity({
            provider: 'google',
            options: {
                redirectTo: redirectTo.toString(),
            },
        });

        if (linkError) {
            setBusyProvider(null);
            setError(formatIdentityError(linkError.message));
        }
    };

    const handleUnlink = async (identity: UserIdentity | null, providerLabel: string) => {
        if (!identity) {
            return;
        }

        setBusyProvider(`unlink-${identity.provider}`);
        setError(null);

        const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity);

        if (unlinkError) {
            setBusyProvider(null);
            setError(formatIdentityError(unlinkError.message));
            return;
        }

        toast({
            title: `${providerLabel} disconnected`,
            description: `You can no longer use ${providerLabel} to sign in until you reconnect it.`,
        });
        await loadIdentities();
        setBusyProvider(null);
    };

    const handlePasswordSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError('Use at least 8 characters for your password.');
            return;
        }

        if (password !== confirmPassword) {
            setError('The password confirmation does not match.');
            return;
        }

        setPasswordSaving(true);

        const { error: passwordError } = await supabase.auth.updateUser({ password });

        if (passwordError) {
            setPasswordSaving(false);
            setError(formatIdentityError(passwordError.message));
            return;
        }

        toast({
            title: hasPassword ? 'Password updated' : 'Password login added',
            description: hasPassword
                ? 'Your password has been changed successfully.'
                : 'You can now sign in with your email and password as a backup method.',
        });

        setPassword('');
        setConfirmPassword('');
        setPasswordFormOpen(false);
        await loadIdentities();
        setPasswordSaving(false);
    };

    const renderConnectionRow = (state: ConnectionState, providerKey: 'password' | 'google') => {
        const isUnlinking = busyProvider === `unlink-${state.identity?.provider}`;
        const isLinking = providerKey === 'google' && busyProvider === 'google-link';

        return (
            <div
                key={providerKey}
                className="rounded-[1.5rem] border border-gray-100 bg-gray-50/80 p-5"
            >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            {providerKey === 'password' ? (
                                <KeyRound className="h-4 w-4 text-orange-500" />
                            ) : (
                                <Mail className="h-4 w-4 text-blue-500" />
                            )}
                            <span className="text-sm font-black text-gray-900">{state.label}</span>
                            <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                                    state.connected
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-200 text-gray-500'
                                }`}
                            >
                                {state.connected ? 'Connected' : 'Not Linked'}
                            </span>
                        </div>
                        <p className="text-sm font-medium text-gray-500">{state.detail}</p>
                        {state.connected && !canDisconnect && (
                            <p className="text-xs font-semibold text-gray-400">
                                Add another sign-in method before disconnecting this one.
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {providerKey === 'google' ? (
                            state.connected ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!canDisconnect || isUnlinking}
                                    onClick={() => void handleUnlink(state.identity, 'Google')}
                                >
                                    {isUnlinking ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Unlink2 className="mr-2 h-4 w-4" />
                                    )}
                                    Disconnect Google
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={() => void handleLinkGoogle()}
                                    disabled={isLinking}
                                    className="bg-orange-600 hover:bg-orange-700"
                                >
                                    {isLinking ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Link2 className="mr-2 h-4 w-4" />
                                    )}
                                    Connect Google
                                </Button>
                            )
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant={state.connected ? 'outline' : 'default'}
                                    onClick={() => setPasswordFormOpen((open) => !open)}
                                    className={!state.connected ? 'bg-orange-600 hover:bg-orange-700' : ''}
                                >
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    {state.connected ? 'Change Password' : 'Add Password'}
                                </Button>
                                {state.connected && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={!canDisconnect || isUnlinking}
                                        onClick={() => void handleUnlink(state.identity, 'Password login')}
                                    >
                                        {isUnlinking ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Unlink2 className="mr-2 h-4 w-4" />
                                        )}
                                        Remove Password
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`space-y-5 ${className}`}>
            <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Sign-in Methods</h3>
                <p className="text-sm font-medium text-gray-500">
                    Add a backup sign-in method so you never get locked out, and disconnect methods you no longer use.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center gap-3 rounded-[1.5rem] border border-gray-100 bg-gray-50 p-5 text-sm font-medium text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                    Checking your linked sign-in methods...
                </div>
            ) : (
                <div className="space-y-4">
                    {renderConnectionRow(passwordState, 'password')}
                    {passwordFormOpen && (
                        <form
                            onSubmit={handlePasswordSave}
                            className="rounded-[1.5rem] border border-orange-100 bg-orange-50/70 p-5 space-y-4"
                        >
                            <div>
                                <p className="text-sm font-black text-orange-900">
                                    {hasPassword ? 'Update your password' : 'Add a backup password'}
                                </p>
                                <p className="text-xs font-medium text-orange-800/80 mt-1">
                                    {hasPassword
                                        ? 'Choose a new password with at least 8 characters.'
                                        : 'This lets you sign in with email and password if Google is unavailable.'}
                                </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2 text-sm font-bold text-gray-700">
                                    <span>New Password</span>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="new-password"
                                        className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-gray-900 outline-none transition-all focus:ring-2 focus:ring-orange-500"
                                        placeholder="At least 8 characters"
                                        required
                                        minLength={8}
                                    />
                                </label>
                                <label className="space-y-2 text-sm font-bold text-gray-700">
                                    <span>Confirm Password</span>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        autoComplete="new-password"
                                        className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-gray-900 outline-none transition-all focus:ring-2 focus:ring-orange-500"
                                        placeholder="Repeat your password"
                                        required
                                        minLength={8}
                                    />
                                </label>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="submit"
                                    disabled={passwordSaving}
                                    className="bg-orange-600 hover:bg-orange-700"
                                >
                                    {passwordSaving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                    )}
                                    {hasPassword ? 'Update Password' : 'Save Password'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setPasswordFormOpen(false);
                                        setPassword('');
                                        setConfirmPassword('');
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}
                    {renderConnectionRow(googleState, 'google')}
                </div>
            )}

            {error && (
                <div className="flex items-start gap-3 rounded-[1.5rem] border border-red-100 bg-red-50 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                    <div className="space-y-1">
                        <p className="text-sm font-black text-red-900">We couldn&apos;t update your sign-in methods</p>
                        <p className="text-sm font-medium text-red-700">{error}</p>
                    </div>
                </div>
            )}

            <div className="rounded-[1.5rem] border border-gray-100 bg-white p-4">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                    <div className="space-y-1">
                        <p className="text-sm font-black text-gray-900">Recommended setup</p>
                        <p className="text-sm font-medium text-gray-500">
                            Keep both Google and password enabled so you can still access your account if one provider is unavailable.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
