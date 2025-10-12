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
        <div className="flex h-full">
            {/* Settings Sidebar */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">Instellingen</h1>
                    
                    <nav className="space-y-1">
                        {settingsTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <span className="text-lg">{tab.icon}</span>
                                <span className="font-medium">{tab.name}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6">
                <div className="max-w-2xl">
                    {settingsTabs.find(tab => tab.id === activeTab)?.component}
                </div>
            </div>
        </div>
    );
}
