'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

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

export default function LiveSession({ roomName, userName, userEmail, isHost }: LiveSessionProps) {
    const jitsiContainerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [api, setApi] = useState<any>(null);

    useEffect(() => {
        // Load Jitsi script
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => initJitsi();
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
            if (api) api.dispose();
        };
    }, []);

    const initJitsi = () => {
        if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) return;

        const domain = 'meet.jit.si';
        const options = {
            roomName: `kiongozi-social-${roomName}`,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            userInfo: {
                displayName: userName,
                email: userEmail
            },
            configOverwrite: {
                startWithAudioMuted: true,
                startWithVideoMuted: true,
                prejoinPageEnabled: false,
                enableLobby: false, // Try to bypass lobby if possible
                requireDisplayName: true,
                disableSettings: false,
                theme: {
                    default: 'dark'
                }
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'hangup', 'profile', 'chat', 'recording', 'raisehand',
                    'videoquality', 'filmstrip', 'tileview', 'settings'
                ],
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
            }
        };

        const newApi = new window.JitsiMeetExternalAPI(domain, options);
        setApi(newApi);
        setLoading(false);

        // Event listeners can be added here
        newApi.addEventListener('videoConferenceJoined', () => {
            console.log('Local User Joined');
        });
    };

    return (
        <div className="w-full h-[80vh] bg-slate-950 rounded-xl overflow-hidden relative shadow-2xl border border-border/20">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center text-white bg-slate-900 z-10">
                    <Loader2 className="h-10 w-10 animate-spin text-civic-green" />
                    <span className="ml-3 font-medium">Connecting to Secure Stage...</span>
                </div>
            )}
            <div ref={jitsiContainerRef} className="w-full h-full" />
        </div>
    );
}
