import { useEffect, useState } from 'react';

import ActingUserSelector from './components/ActingUserSelector.jsx';
import CreateTicketForm from './components/CreateTicketForm.jsx';
import TicketDetail from './components/TicketDetail.jsx';
import TicketList from './components/TicketList.jsx';
import { useActingUser } from './context/ActingUserContext.jsx';
import { canCreateTicket } from './utils/permissions.js';
import './App.css';

export default function App() {
  const { actingUser } = useActingUser();
  const [view, setView] = useState('list');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const allowCreate = canCreateTicket(actingUser);

  useEffect(() => {
    if (!allowCreate && view === 'create') {
      setView('list');
    }
  }, [allowCreate, view]);

  function handleCreateSuccess() {
    setListRefreshKey((key) => key + 1);
    setView('list');
  }

  function handleSelectTicket(ticketId) {
    setSelectedTicketId(ticketId);
    setView('detail');
  }

  function handleBackToList() {
    setView('list');
    setSelectedTicketId(null);
    setListRefreshKey((key) => key + 1);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Support Ticket Management</h1>
        <ActingUserSelector />
      </header>

      <main className="app-main">
        {view === 'list' && (
          <>
            {allowCreate && (
              <div className="app-toolbar">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => setView('create')}
                >
                  Create Ticket
                </button>
              </div>
            )}
            <TicketList key={listRefreshKey} onSelectTicket={handleSelectTicket} />
          </>
        )}

        {view === 'create' && (
          <CreateTicketForm
            onCancel={() => setView('list')}
            onSuccess={handleCreateSuccess}
          />
        )}

        {view === 'detail' && selectedTicketId && (
          <TicketDetail ticketId={selectedTicketId} onBack={handleBackToList} />
        )}
      </main>
    </div>
  );
}
