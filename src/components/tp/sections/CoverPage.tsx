'use client';

import { useEffect, useState } from 'react';
import { useTP } from '@/context/TPContext';
import { supabase } from '@/lib/supabase/client';
import { formatEmployeeName } from '@/lib/utils';
import Image from 'next/image';
import Cover from '@/assets/images/valentinez-cover.jpg';

export default function CoverPage({ employeeId }: { employeeId: string }) {
    const { tpData, updateField } = useTP();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function fetchCoverData() {
            setLoading(true);

            const { data: employee } = await supabase
                .from('employees')
                .select('first_name, last_name, client_id')
                .eq('id', employeeId)
                .single();

            const { data: employeeDetails } = await supabase
                .from('employee_details')
                .select('gender')
                .eq('employee_id', employeeId)
                .maybeSingle();

            if (employee) {
                const formattedName = formatEmployeeName(
                    employee.first_name,
                    employee.last_name,
                    employeeDetails?.gender
                );
                updateField('employee_name', formattedName);

                if (employee.client_id) {
                    const { data: client } = await supabase
                        .from('clients')
                        .select('name')
                        .eq('id', employee.client_id)
                        .single();

                    if (client) {
                        updateField('employer_name', client.name);
                    }
                }
            }

            const { data: meta } = await supabase
                .from('tp_meta')
                .select('tp_creation_date')
                .eq('employee_id', employeeId)
                .maybeSingle();

            if (meta?.tp_creation_date) {
                updateField('tp_creation_date', meta.tp_creation_date);
            }

            setLoading(false);
        }

        fetchCoverData();
    }, [employeeId]);

    const handleChange = (field: string, value: string) => {
        updateField(field, value);
    };

    const handleSave = async () => {
        setSaving(true);

        const { error } = await supabase.from('tp_meta').upsert(
            [
                {
                    employee_id: employeeId,
                    tp_creation_date: tpData.tp_creation_date || null
                }
            ] as any,
            {
                onConflict: 'employee_id'
            }
        );

        if (error) {
            console.error('Save failed:', error.message);
        }

        setSaving(false);
    };

    if (loading) return <p>Laden...</p>;

    return (
        <div className="flex gap-10 h-[65vh] items-center px-8 overflow-hidden">
            <div className="w-[50%] space-y-4">
                <div className="w-full p-2 border rounded bg-gray-100 text-gray-700">
                    {tpData.employee_name || '—'}
                </div>
                <input
                    type="date"
                    className="w-full p-2 border rounded"
                    value={tpData.tp_creation_date || ''}
                    onChange={(e) => handleChange('tp_creation_date', e.target.value)}
                />
                <div className="w-full p-2 border rounded bg-gray-100 text-gray-700">
                    {tpData.employer_name || '—'}
                </div>
                <div className="mt-4">
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 hover:cursor-pointer transition"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Opslaan...' : 'Opslaan'}
                    </button>
                </div>
            </div>


            {/* Right: A4-scaled Preview */}
            <div className="w-[50%] h-full flex justify-center items-center">
                <div className="relative aspect-[210/297] h-[100%] max-h-full bg-white shadow border border-gray-300 overflow-hidden">
                    {/* Top Banner */}
                    <div className="flex h-[20%] z-20">
                        <div className="w-[100%] bg-gray-700 flex items-center pl-6 z-20 mt-10">
                            <h1 className="text-white text-[12px] uppercase tracking-wider font-light">
                                TRAJECTPLAN 2e SPOOR
                            </h1>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        <p className="text-sm font-semibold">{tpData.employee_name}</p>
                        <p className="text-xs text-gray-700 mt-1">
                            Rapportage datum: {formatDutchDate(tpData.tp_creation_date)}
                        </p>
                    </div>

                    {/* Image */}
                    <div className="w-full justify-items-end z-50 absolute">
                        <Image
                            src={Cover}
                            alt="Valentinez Cover"
                            className="w-4/5 h-auto"
                            width={800}
                            height={600}
                        />
                    </div>

                    {/* Bottom-right employer block */}
                    <div className="absolute bottom-0 right-0 w-[33%] h-[100%] bg-[#660066ff] flex items-end justify-center z-0">
                        <p className="text-white font-semibold text-[10px] mb-10">{tpData.employer_name}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatDutchDate(dateStr: string) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}
