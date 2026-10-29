import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { DataSource, GeographicMatchStatus } from '../../types';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  targetCity?: string;
  source?: DataSource;
  geographicMatchStatus?: GeographicMatchStatus;
  generatedAt?: string;
  currentSection?: string;
  onSelectSection?: (sectionId: string) => void;
  onPrint?: () => void;
  onExport?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  title,
  targetCity,
  source,
  geographicMatchStatus,
  generatedAt,
  currentSection,
  onSelectSection,
  onPrint,
  onExport,
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={onSelectSection}
        analysisTitle={targetCity ? `${targetCity} Expansion` : undefined}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <TopBar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          title={title}
          targetCity={targetCity}
          source={source}
          geographicMatchStatus={geographicMatchStatus}
          generatedAt={generatedAt}
          onPrint={onPrint}
          onExport={onExport}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
};
