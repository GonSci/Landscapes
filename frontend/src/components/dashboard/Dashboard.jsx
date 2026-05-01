import React, { useState } from 'react';
import LiveView from './LiveView';
import CSRNet from './CSRNet';
import Redirection from './Redirection';
import { Activity, Map as MapIcon, Compass } from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('live');

  const tabs = [
    { id: 'live', label: 'Live Monitoring', icon: Activity, component: LiveView },
    { id: 'density', label: 'Density Mapping', icon: MapIcon, component: CSRNet },
    { id: 'redirection', label: 'Smart Redirection', icon: Compass, component: Redirection },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || LiveView;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white p-4 md:p-8">
      {/* Dashboard Header & Navigation */}
      <div className="max-w-[1600px] mx-auto mb-10">
        <div className="flex flex-col items-center text-center gap-6 animate-fadeIn">
          {/* Titles Section */}
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white animate-slideDown">
              Command Center
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] animate-slideDown delay-100">
              Baguio Smart Tourism Dashboard
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap justify-center gap-3 animate-slideUp delay-200">
            <div className="flex gap-2 p-1 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-500 ease-out border ${
                      isActive
                        ? 'bg-white/10 text-white border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-105'
                        : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'text-slate-600'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1600px] mx-auto">
        <div className="animate-fadeInUp delay-300">
          <ActiveComponent />
        </div>
      </div>

      {/* Dashboard Global Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out forwards; }
        .animate-fadeInUp { opacity: 0; animation: fadeInUp 0.8s ease-out forwards; }
        .animate-slideDown { opacity: 0; animation: slideDown 0.6s ease-out forwards; }
        .animate-slideUp { opacity: 0; animation: slideUp 0.6s ease-out forwards; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        
        /* Custom scrollbar for consistency */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
};

export default Dashboard;
