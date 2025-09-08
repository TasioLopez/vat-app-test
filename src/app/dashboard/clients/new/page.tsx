'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { FaBriefcase } from 'react-icons/fa';

export default function AddClientPage() {
    const router = useRouter();

    const industryOptions = [
        'Gezondheidszorg', 'Onderwijs', 'Financiën', 'Technologie', 'Detailhandel',
        'Productie', 'Bouw', 'Horeca', 'Transport', 'Overig'
    ];

    const [form, setForm] = useState({
        name: '',
        industry: '',
        contact_email: '',
        referent_first_name: '',
        referent_last_name: '',
        referent_phone: '',
        referent_email: '',
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error } = await supabase.from('clients').insert([
            {
                name: form.name,
                industry: form.industry || null,
                contact_email: form.contact_email || null,
                referent_first_name: form.referent_first_name || null,
                referent_last_name: form.referent_last_name || null,
                referent_phone: form.referent_phone || null,
                referent_email: form.referent_email || null,
            },
        ]);

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push('/dashboard/clients');
        }
    };

    return (
        <div className="p-6 max-w-xl mx-auto">
            <div className='flex gap-4 items-center mb-6'>
                <FaBriefcase size={24}></FaBriefcase>
                <h1 className="text-2xl font-semibold">Nieuwe werkgever toevoegen</h1>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 w-xl">
                <div className='flex gap-10 mb-4'>
                    <div className="flex flex-col gap-4">
                        <h2 className="text-lg font-medium">Werkgeversinformatie</h2>
                        <div>
                            <label className="block mb-1 font-medium">Naam *</label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                                className="w-full p-2 border border-gray-300 rounded"
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Branche</label>
                            <select
                                name="industry"
                                value={form.industry}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded"
                            >
                                <option value="">Selecteer een branche</option>
                                {industryOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Email</label>
                            <input
                                type="email"
                                name="contact_email"
                                value={form.contact_email}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded"
                            />
                        </div>
                    </div>

                    <div className="border border-1px border-gray-300/60 h-auto"></div>

                    <div className="flex flex-col gap-4">
                        <h2 className="text-lg font-medium">Referentinformatie</h2>

                        <div>
                            <label className="block mb-1 font-medium">Voornaam</label>
                            <input
                                type="text"
                                name="referent_first_name"
                                value={form.referent_first_name}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded"
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Achternaam</label>
                            <input
                                type="text"
                                name="referent_last_name"
                                value={form.referent_last_name}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded"
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Telefoon</label>
                            <input
                                type="tel"
                                name="referent_phone"
                                value={form.referent_phone}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded"
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Email</label>
                            <input
                                type="email"
                                name="referent_email"
                                value={form.referent_email}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded"
                            />
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 mt-4"
                >
                    {loading ? 'Opslaan...' : 'Opslaan werkgever'}
                </button>
            </form>
        </div>
    );
}
