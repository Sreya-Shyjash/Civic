import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { PitchModal } from './components/PitchModal';
import { LandingPage } from './pages/LandingPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { TrackIssuePage } from './pages/TrackIssuePage';
import { ExploreIssuesPage } from './pages/ExploreIssuesPage';
import { CivicMapPage } from './pages/CivicMapPage';
import { TransparencyPage } from './pages/TransparencyPage';
import { CitizenDashboardPage } from './pages/CitizenDashboardPage';
import { OfficialDashboardPage } from './pages/OfficialDashboardPage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [trackReference, setTrackReference] = useState<string>('CP-2026-001');
  const [isPitchOpen, setIsPitchOpen] = useState(false);

  // Navigate helper
  const handleNavigate = (tab: string, reference?: string) => {
    if (reference) {
      setTrackReference(reference);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-teal-500 selection:text-white">
        {/* Navigation Bar */}
        <Navbar
          currentTab={currentTab}
          setCurrentTab={(tab) => handleNavigate(tab)}
          onOpenPitch={() => setIsPitchOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {currentTab === 'landing' && (
            <LandingPage
              onNavigate={(tab, ref) => handleNavigate(tab, ref)}
              onOpenPitch={() => setIsPitchOpen(true)}
            />
          )}

          {currentTab === 'report' && (
            <ReportIssuePage
              onSuccessNavigate={(ref) => handleNavigate('track', ref)}
              onExploreNavigate={() => handleNavigate('explore')}
            />
          )}

          {currentTab === 'track' && (
            <TrackIssuePage
              initialReference={trackReference}
              onExploreNavigate={() => handleNavigate('explore')}
            />
          )}

          {currentTab === 'explore' && (
            <ExploreIssuesPage
              onSelectComplaint={(ref) => handleNavigate('track', ref)}
              onReportNavigate={() => handleNavigate('report')}
            />
          )}

          {currentTab === 'map' && (
            <CivicMapPage
              onSelectComplaint={(ref) => handleNavigate('track', ref)}
              onReportNavigate={() => handleNavigate('report')}
            />
          )}

          {currentTab === 'transparency' && <TransparencyPage />}

          {currentTab === 'citizen-dashboard' && (
            <CitizenDashboardPage
              onTrackNavigate={(ref) => handleNavigate('track', ref)}
              onReportNavigate={() => handleNavigate('report')}
            />
          )}

          {currentTab === 'official-dashboard' && <OfficialDashboardPage />}

          {currentTab === 'profile' && <ProfilePage />}
        </main>

        {/* Footer */}
        <Footer
          onOpenPitch={() => setIsPitchOpen(true)}
          onDataReset={() => {
            // Re-render current page
            handleNavigate(currentTab);
          }}
        />

        {/* Hackathon Pitch Modal Deck & Judge Guide */}
        <PitchModal isOpen={isPitchOpen} onClose={() => setIsPitchOpen(false)} />
      </div>
    </AuthProvider>
  );
}
