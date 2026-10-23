import { useState } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import CreateOffer from '@/pages/CreateOffer';
import BrowseOffers from '@/pages/BrowseOffers';
import LoanDetail from '@/pages/LoanDetail';
import HowItWorks from '@/pages/HowItWorks';

type Page = 'dashboard' | 'create' | 'browse' | 'loan' | 'how-it-works';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [pageParams, setPageParams] = useState<Record<string, string>>({});

  function navigate(page: string, params: Record<string, string> = {}) {
    setCurrentPage(page as Page);
    setPageParams(params);
  }

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'create':
        return <CreateOffer onNavigate={navigate} />;
      case 'browse':
        return <BrowseOffers onNavigate={navigate} />;
      case 'loan':
        return pageParams.id ? (
          <LoanDetail loanId={pageParams.id} onNavigate={navigate} />
        ) : (
          <Dashboard onNavigate={navigate} />
        );
      case 'how-it-works':
        return <HowItWorks />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={navigate}>
      {renderPage()}
    </Layout>
  );
}
