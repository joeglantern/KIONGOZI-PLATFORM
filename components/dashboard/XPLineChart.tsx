"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import { motion } from 'framer-motion';

interface XPLineChartProps {
    data?: { date: string; xp: number }[];
    loading?: boolean;
}

export function XPLineChart({ data, loading }: XPLineChartProps) {
    const chartData = data ?? [];
    const isEmpty = !loading && chartData.length === 0;

    if (loading) {
        return (
            <div className="h-[300px] w-full bg-white rounded-3xl animate-pulse flex items-center justify-center border border-gray-100">
                <div className="text-gray-300 font-bold uppercase tracking-widest text-xs">Loading Activity...</div>
            </div>
        );
    }

    if (isEmpty) {
        return (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm h-[350px] flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-6">Learning Activity</h3>
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                    <p className="text-sm font-semibold text-gray-500">No activity yet</p>
                    <p className="text-xs text-gray-400 max-w-[220px]">Earn XP by completing lessons to see your activity here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm h-[350px] flex flex-col">
            <div className="flex actions-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Learning Activity</h3>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                color: '#111827',
                                fontSize: '12px',
                                fontWeight: '600',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            itemStyle={{ color: '#f97316' }}
                            cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="xp"
                            stroke="#f97316"
                            strokeWidth={3}
                            fillOpacity={0.1}
                            fill="#f97316"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
