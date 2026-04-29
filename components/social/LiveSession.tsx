'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Users, ShieldCheck, AlertCircle } from 'lucide-react';

interface LiveSessionProps {
    roomName: string;
    userName: string;
    userEmail?: string;
    isHost?: boolean;
}

declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

const HOST_TOOLBAR = [
    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
    'hangup', 'profile', 'chat', 'recording', 'raisehand',
    'videoquality', 'filmstrip', 'tileview', 'mute-everyone',
    'videomuteeveryone', 'security', 'settings', 'stats',
];

const PARTICIPANT_TOOLBAR = [
    'microphone', 'camera', 'closedcaptions', 'fullscreen',
    'hangup', 'profile', 'chat', 'raisehand',
    'videoquality', 'filmstrip', 'tileview', 'settings',
];

export default function LiveSession({ roomName, userName, userEmail, isHost = false }: LiveSessionProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    // Use a ref for the API so the cleanup closure always has the latest value
    const apiRef = useRef<any>(null);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [participantCount, setParticipantCount] = useState(0);
    const [inLobby, setInLobby] = useState(false); // participant is waiting in lobby

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => initJitsi();
        script.onerror = () => {
            setLoading(false);
            setLoadError(true);
        };
        document.body.appendChild(script);

        return () => {
            if (apiRef.current) {
                apiRef.current.dispose();
                apiRef.current = null;
            }
            if (script.parentNode) {
                document.body.removeChild(script);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initJitsi = () => {
        if (!window.JitsiMeetExternalAPI || !containerRef.current) return;

        const options = {
            roomName: `kiongozi-social-${roomName}`,
            width: '100%',
            height: '100%',
            parentNode: containerRef.current,
            userInfo: {
                displayName: userName,
                email: userEmail,
            },
            configOverwrite: {
                startWithAudioMuted: true,
                startWithVideoMuted: true,
                // Host skips the pre-join screen — they created the event and are already confirmed.
                // Participants see the pre-join screen to confirm their display name.
                prejoinPageEnabled: !isHost,
                requireDisplayName: true,
                disableSettings: false,
                // Disable features irrelevant to civic events
                disableInviteFunctions: false,
                enableLobbyChat: true,
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: isHost ? HOST_TOOLBAR : PARTICIPANT_TOOLBAR,
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
            },
        };

        const newApi = new window.JitsiMeetExternalAPI('meet.jit.si', options);
        apiRef.current = newApi;
        setLoading(false);

        // Once host joins, enable lobby so all future participants must be admitted
        newApi.addEventListener('videoConferenceJoined', () => {
            setParticipantCount(1);
            if (isHost) {
                // Small delay so the room is fully initialised before the command
                setTimeout(() => {
                    try {
                        newApi.executeCommand('toggleLobby', true);
                    } catch {
                        // meet.jit.si may ignore this if the user isn't a moderator yet
                    }
                }, 1500);
            }
        });

        // Participant is sitting in the lobby waiting for host to admit
        newApi.addEventListener('dataChannelOpened', () => {
            if (!isHost) setInLobby(false);
        });

        newApi.addEventListener('participantJoined', () => {
            setParticipantCount(c => c + 1);
        });

        newApi.addEventListener('participantLeft', () => {
            setParticipantCount(c => Math.max(1, c - 1));
        });

        newApi.addEventListener('videoConferenceLeft', () => {
            setParticipantCount(0);
        });
    };

    if (loadError) {
        return (
            <div className="w-full h-[80vh] bg-slate-950 rounded-xl flex flex-col items-center justify-center gap-4 text-white">
                <AlertCircle className="h-10 w-10 text-red-400" />
                <p className="font-semibold text-lg">Could not load the live stage</p>
                <p className="text-sm text-slate-400">Check your internet connection and reload the page.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 h-full">
            {/* Status bar */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    {isHost ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            You are the host — you control this room
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-xs text-slate-400">
                            {inLobby
                                ? 'Waiting in lobby — the host will admit you shortly'
                                : 'You are attending this session'}
                        </span>
                    )}
                </div>

                {participantCount > 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Users className="h-3.5 w-3.5" />
                        {participantCount} in room
                    </span>
                )}
            </div>

            {/* Jitsi frame */}
            <div className="flex-1 bg-slate-950 rounded-xl overflow-hidden relative shadow-2xl border border-border/20">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900 z-10 gap-3">
                        <Loader2 className="h-10 w-10 animate-spin text-civic-green" />
                        <span className="font-medium">
                            {isHost ? 'Opening your stage…' : 'Connecting to session…'}
                        </span>
                        {!isHost && (
                            <p className="text-xs text-slate-400 max-w-xs text-center">
                                The host controls who enters. You may be placed in a lobby until they admit you.
                            </p>
                        )}
                    </div>
                )}
                <div ref={containerRef} className="w-full h-full" />
            </div>

            {/* Host hint */}
            {isHost && !loading && (
                <p className="text-xs text-slate-400 text-center px-4">
                    As host you can mute participants, manage the lobby, and end the session for everyone.
                    Use the <strong>Security</strong> button in the toolbar to manage lobby settings.
                </p>
            )}
        </div>
    );
}
