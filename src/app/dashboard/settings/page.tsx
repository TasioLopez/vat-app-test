"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { FaUser, FaLock, FaMicrophone } from "react-icons/fa";
import ProfileInformation from "./components/ProfileInformation";
import PasswordChange from "./components/PasswordChange";
import MijnStem from "./components/MijnStem";

type SettingsTab = 'profile' | 'password' | 'mijn-stem';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    const settingsTabs = [
        {
            id: 'profile' as SettingsTab,
            name: 'Profiel Informatie',
            icon: <FaUser />,
            component: <ProfileInformation />
        },
        {
            id: 'password' as SettingsTab,
            name: 'Wachtwoord Wijzigen',
            icon: <FaLock />,
            component: <PasswordChange />
        },
        {
            id: 'mijn-stem' as SettingsTab,
            name: 'Mijn Stem',
            icon: <FaMicrophone />,
            component: <MijnStem />
        }
    ];

    return (
        <div className="flex h-full bg-gradient-to-br from-gray-50 to-purple-50/30">
            {/* Settings Sidebar */}
            <div className="w-72 bg-white/80 backdrop-blur-sm border-r-2 border-purple-200/50 flex-shrink-0 shadow-lg">
                <div className="p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">Instellingen</h1>
                    
                    <nav className="space-y-2">
                        {settingsTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-4 px-4 py-3 text-left rounded-xl transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/30'
                                        : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                                }`}
                            >
                                <span className="text-xl">{tab.icon}</span>
                                <span className="font-semibold">{tab.name}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-3xl">
                    {settingsTabs.find(tab => tab.id === activeTab)?.component}
                </div>
            </div>
        </div>
    );
}
