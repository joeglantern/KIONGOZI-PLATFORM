"use client";

import { ImpactMap } from "@/components/map/ImpactMap";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, TreePine, Users } from "lucide-react";
import { AddImpactDialog } from "@/components/map/AddImpactDialog";
import { useState } from "react";
import { Zola } from "@/components/landing/Characters";

export default function ImpactMapPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Geographic Impact Map</h1>
                    <p className="text-xl text-gray-600">Visualizing civic and climate action across Kenya</p>
                </div>
                <Button
                    className="bg-orange-600 hover:bg-orange-700 text-white px-6"
                    onClick={() => setIsDialogOpen(true)}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Report New Impact
                </Button>
            </div>

            <AddImpactDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={() => setRefreshKey(prev => prev + 1)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
                <div className="lg:col-span-3">
                    <ImpactMap key={refreshKey} />
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-orange-600" />
                            Impact Statistics
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 flex items-center">
                                    <TreePine className="w-4 h-4 mr-2 text-green-600" />
                                    Tree Planting
                                </span>
                                <span className="font-bold">128</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 flex items-center">
                                    <Users className="w-4 h-4 mr-2 text-orange-600" />
                                    Town Halls
                                </span>
                                <span className="font-bold">42</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border-2 border-brand-primary p-6 shadow-soft flex flex-col items-center gap-4 text-center">
                        <div className="bg-brand-cream border-2 border-brand-primary rounded-2xl p-1.5">
                            <Zola action="cheer" className="w-20 h-20" />
                        </div>
                        <div className="relative bg-brand-cream border-2 border-brand-primary p-3.5 rounded-2xl shadow-sm text-xs font-bold text-left text-brand-primary">
                            <div className="absolute left-[50%] translate-x-[-50%] top-[-10px] w-0 h-0 border-r-[10px] border-r-transparent border-b-[10px] border-b-brand-primary border-l-[10px] border-l-transparent"></div>
                            "Hello! I'm Zola, your Impact Map guide. Every point on this map represents a leader taking action for a greener, more civic Kenya. Tap 'Report New Impact' to share your project with the community! 🌿"
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
