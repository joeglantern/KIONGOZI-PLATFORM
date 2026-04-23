"use client";

import { WifiOff, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OfflinePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                <WifiOff className="w-10 h-10 text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">You're Offline</h1>
            <p className="text-gray-600 mb-8 max-w-md">
                It looks like you don't have an active internet connection. Please check your network and try again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
                <Button
                    onClick={() => window.location.reload()}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-8"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                </Button>
                <Button asChild variant="outline" className="px-8 border-orange-200 text-orange-700 hover:bg-orange-50">
                    <Link href="/">
                        <Home className="w-4 h-4 mr-2" />
                        Go Home
                    </Link>
                </Button>
            </div>
        </div>
    );
}
