"use client";

import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface CategoryBarChartProps {
    data?: { category: string; progress: number }[];
    loading?: boolean;
}

const COLORS = ['#3b82f6', '#6366f1', '#f97316', '#10b981', '#f59e0b'];

export function CategoryBarChart({ data, loading }: CategoryBarChartProps) {
    // Generate mock data if none provided
    const chartData = useMemo(() => {
        if (data && data.length > 0) return data;

        const categories = ['Leadership', 'Strategy', 'Communication', 'Ops', 'Tech'];
        return categories.map((cat, i) => ({
            category: cat,
            progress: Math.floor(Math.random() * 60) + 20,
        }));
    }, [data]);

    if (loading) {
        return (
            <div className="h-[300px] w-full bg-white rounded-3xl animate-pulse flex items-center justify-center border border-gray-100">
                <div className="text-gray-300 font-bold uppercase tracking-widest text-xs">Loading Progress...</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-none h-[350px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Category Breakdown</h3>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis
                            dataKey="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }}
                            domain={[0, 100]}
                        />
                        <Tooltip
                            cursor={{ fill: '#f9fafb' }}
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                color: '#111827',
                                fontSize: '12px',
                                fontWeight: '600',
                            }}
                            formatter={(value: any) => [`${value}%`, 'Progress']}
                        />
                        <Bar
                            dataKey="progress"
                            radius={[4, 4, 0, 0]}
                            animationDuration={1500}
                            fill="#fdba74" // Light orange/amber
                        >
                            {/* Optional: Highlight high progress with darker shade */}
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.progress > 75 ? '#f97316' : '#fdba74'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
