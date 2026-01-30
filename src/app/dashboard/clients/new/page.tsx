'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { 
    FaBriefcase, 
    FaBuilding, 
    FaIndustry, 
    FaEnvelope,
    FaUser,
    FaPhone,
    FaSpinner,
    FaCheckCircle,
    FaExclamationCircle,
    FaUserCircle
} from 'react-icons/fa';

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
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50/30 p-6 animate-in fade-in duration-500">
            <div className="max-w-5xl mx-auto">
                {/* Header Section */}
                <div className="mb-8 animate-in slide-in-from-top-4 duration-700">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                            <FaBriefcase className="text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Nieuwe werkgever toevoegen</h1>
                            <p className="text-gray-600 mt-1">Voeg een nieuwe werkgever toe aan het systeem</p>
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-purple-500/10 border border-purple-200/50 p-8 animate-in slide-in-from-bottom-4 duration-700">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Two Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
                            {/* Werkgeversinformatie Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                        <FaBuilding className="text-purple-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">Werkgeversinformatie</h2>
                                </div>

                                {/* Name Field */}
                                <div className="group">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaBuilding className="text-purple-600 text-sm" />
                                        Naam
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            onFocus={() => setFocusedField('name')}
                                            onBlur={() => setFocusedField(null)}
                                            placeholder="Voer bedrijfsnaam in"
                                            required
                                            className={`w-full px-4 py-3 pl-12 rounded-xl border-2 transition-all duration-300 ${
                                                focusedField === 'name'
                                                    ? 'border-purple-500 bg-purple-50/50 shadow-lg shadow-purple-500/20'
                                                    : 'border-gray-200 bg-gray-50/50 hover:border-purple-300 hover:bg-white'
                                            } focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-gray-900 placeholder:text-gray-400`}
                                        />
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                                            focusedField === 'name' ? 'text-purple-600 scale-110' : 'text-gray-400'
                                        }`}>
                                            <FaBuilding />
                                        </div>
                                    </div>
                                </div>

                                {/* Industry Field */}
                                <div className="group">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaIndustry className="text-purple-600 text-sm" />
                                        Branche
                                    </label>
                                    <div className="relative">
                                        <select
                                            name="industry"
                                            value={form.industry}
                                            onChange={handleChange}
                                            onFocus={() => setFocusedField('industry')}
                                            onBlur={() => setFocusedField(null)}
                                            className={`w-full px-4 py-3 pl-12 rounded-xl border-2 transition-all duration-300 appearance-none cursor-pointer ${
                                                focusedField === 'industry'
                                                    ? 'border-purple-500 bg-purple-50/50 shadow-lg shadow-purple-500/20'
                                                    : 'border-gray-200 bg-gray-50/50 hover:border-purple-300 hover:bg-white'
                                            } focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-gray-900`}
                                        >
                                            <option value="">Selecteer een branche</option>
                                            {industryOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none ${
                                            focusedField === 'industry' ? 'text-purple-600 scale-110' : 'text-gray-400'
                                        }`}>
                                            <FaIndustry />
                                        </div>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Email Field */}
                                <div className="group">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaEnvelope className="text-purple-600 text-sm" />
                                        Email
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            name="contact_email"
                                            value={form.contact_email}
                                            onChange={handleChange}
                                            onFocus={() => setFocusedField('contact_email')}
                                            onBlur={() => setFocusedField(null)}
                                            placeholder="contact@bedrijf.nl"
                                            className={`w-full px-4 py-3 pl-12 rounded-xl border-2 transition-all duration-300 ${
                                                focusedField === 'contact_email'
                                                    ? 'border-purple-500 bg-purple-50/50 shadow-lg shadow-purple-500/20'
                                                    : 'border-gray-200 bg-gray-50/50 hover:border-purple-300 hover:bg-white'
                                            } focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-gray-900 placeholder:text-gray-400`}
                                        />
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                                            focusedField === 'contact_email' ? 'text-purple-600 scale-110' : 'text-gray-400'
                                        }`}>
                                            <FaEnvelope />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-purple-200 to-transparent transform -translate-x-1/2"></div>

                            {/* Referentinformatie Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                        <FaUserCircle className="text-purple-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">Referentinformatie</h2>
                                </div>

                                {/* Referent First Name */}
                                <div className="group">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaUser className="text-purple-600 text-sm" />
                                        Voornaam
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            name="referent_first_name"
                                            value={form.referent_first_name}
                                            onChange={handleChange}
                                            onFocus={() => setFocusedField('referent_first_name')}
                                            onBlur={() => setFocusedField(null)}
                                            placeholder="Voer voornaam in"
                                            className={`w-full px-4 py-3 pl-12 rounded-xl border-2 transition-all duration-300 ${
                                                focusedField === 'referent_first_name'
                                                    ? 'border-purple-500 bg-purple-50/50 shadow-lg shadow-purple-500/20'
                                                    : 'border-gray-200 bg-gray-50/50 hover:border-purple-300 hover:bg-white'
                                            } focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-gray-900 placeholder:text-gray-400`}
                                        />
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                                            focusedField === 'referent_first_name' ? 'text-purple-600 scale-110' : 'text-gray-400'
                                        }`}>
                                            <FaUser />
                                        </div>
                                    </div>
                                </div>

                                {/* Referent Last Name */}
                                <div className="group">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaUser className="text-purple-600 text-sm" />
                                        Achternaam
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            name="referent_last_name"
                                            value={form.referent_last_name}
                                            onChange={handleChange}
                                            onFocus={() => setFocusedField('referent_last_name')}
                                            onBlur={() => setFocusedField(null)}
                                            placeholder="Voer achternaam in"
                                            className={`w-full px-4 py-3 pl-12 rounded-xl border-2 transition-all duration-300 ${
                                                focusedField === 'referent_last_name'
                                                    ? 'border-purple-500 bg-purple-50/50 shadow-lg shadow-purple-500/20'
                                                    : 'border-gray-200 bg-gray-50/50 hover:border-purple-300 hover:bg-white'
                                            } focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-gray-900 placeholder:text-gray-400`}
                                        />
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                                            focusedField === 'referent_last_name' ? 'text-purple-600 scale-110' : 'text-gray-400'
                                        }`}>
                                            <FaUser />
                                        </div>
                                    </div>
                                </div>

                                {/* Referent Phone */}
                                <div className="group">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaPhone className="text-purple-600 text-sm" />
                                        Telefoon
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            name="referent_phone"
                                            value={form.referent_phone}
                                            onChange={handleChange}
                                            onFocus={() => setFocusedField('referent_phone')}
                                            onBlur={() => setFocusedField(null)}
                                            placeholder="+31 6 12345678"
                                            className={`w-full px-4 py-3 pl-12 rounded-xl border-2 transition-all duration-300 ${
                                                focusedField === 'referent_phone'
                                                    ? 'border-purple-500 bg-purple-50/50 shadow-lg shadow-purple-500/20'
                                                    : 'border-gray-200 bg-gray-50/50 hover:border-purple-300 hover:bg-white'
                                            } focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-gray-900 placeholder:text-gray-400`}
                                        />
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                                            focusedField === 'referent_phone' ? 'text-purple-600 scale-110' : 'text-gray-400'
                                        }`}>
                                            <FaPhone />
                                        </div>
                                    </div>
                                </div>

                                {/* Referent Email */}
                                <div className="group">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaEnvelope className="text-purple-600 text-sm" />
                                        Email
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            name="referent_email"
                                            value={form.referent_email}
                                            onChange={handleChange}
                                            onFocus={() => setFocusedField('referent_email')}
                                            onBlur={() => setFocusedField(null)}
                                            placeholder="referent@email.com"
                                            className={`w-full px-4 py-3 pl-12 rounded-xl border-2 transition-all duration-300 ${
                                                focusedField === 'referent_email'
                                                    ? 'border-purple-500 bg-purple-50/50 shadow-lg shadow-purple-500/20'
                                                    : 'border-gray-200 bg-gray-50/50 hover:border-purple-300 hover:bg-white'
                                            } focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-gray-900 placeholder:text-gray-400`}
                                        />
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                                            focusedField === 'referent_email' ? 'text-purple-600 scale-110' : 'text-gray-400'
                                        }`}>
                                            <FaEnvelope />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                                <FaExclamationCircle className="text-red-600 flex-shrink-0" />
                                <p className="text-red-700 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-4 border-t border-purple-200/50">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 px-6 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                                    loading
                                        ? 'bg-purple-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <FaSpinner className="animate-spin" />
                                        <span>Opslaan...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaCheckCircle />
                                        <span>Opslaan werkgever</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
