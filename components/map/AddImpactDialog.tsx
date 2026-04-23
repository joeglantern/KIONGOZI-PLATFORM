"use client";

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import { useUser } from '@/app/contexts/UserContext';
import { toast } from '@/components/ui/use-toast';

interface AddImpactDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AddImpactDialog({ open, onOpenChange, onSuccess }: AddImpactDialogProps) {
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const { user } = useUser();
    const supabase = useMemo(() => createClient(), []);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        latitude: 0,
        longitude: 0
    });

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            toast({ title: "Error", description: "Geolocation is not supported by your browser.", variant: "destructive" });
            return;
        }

        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
                setLocating(false);
                toast({ title: "Location Captured", description: "Your coordinates have been automatically filled." });
            },
            (error) => {
                setLocating(false);
                toast({ title: "Error", description: "Could not get your location. Please check permissions.", variant: "destructive" });
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.category || !formData.latitude || !formData.longitude) {
            toast({ title: "Missing Information", description: "Please fill in all required fields and capture your location.", variant: "destructive" });
            return;
        }

        setLoading(true);
        const { error } = await supabase
            .from('impact_points')
            .insert({
                ...formData,
                user_id: user?.id
            });

        setLoading(false);
        if (error) {
            toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Impact Reported!", description: "Thank you for your contribution to the community." });
            onSuccess();
            onOpenChange(false);
            setFormData({ title: '', description: '', category: '', latitude: 0, longitude: 0 });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Report Impact</DialogTitle>
                    <DialogDescription>
                        Share a civic or climate action you've taken to inspire others across Kenya.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Action Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Community Tree Planting"
                            value={formData.title}
                            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                            value={formData.category}
                            onValueChange={val => setFormData(prev => ({ ...prev, category: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Tree Planting">Tree Planting</SelectItem>
                                <SelectItem value="Town Hall">Town Hall</SelectItem>
                                <SelectItem value="Clean Up">Clean Up</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Tell us more about the impact..."
                            value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Latitude</Label>
                            <Input value={formData.latitude || ''} readOnly className="bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                            <Label>Longitude</Label>
                            <Input value={formData.longitude || ''} readOnly className="bg-gray-50" />
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
                        onClick={handleGetLocation}
                        disabled={locating}
                    >
                        {locating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                        {formData.latitude ? 'Location Captured' : 'Get Current Location'}
                    </Button>
                    <DialogFooter>
                        <Button
                            type="submit"
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                            disabled={loading}
                        >
                            {loading ? 'Submitting...' : 'Submit Impact'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
