import { createContext, useContext, useEffect, useState } from 'react';

import { getUsers } from '../api/client.js';

const ActingUserContext = createContext(null);

export function ActingUserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [actingUser, setActingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const fetchedUsers = await getUsers();
        if (cancelled) {
          return;
        }

        setUsers(fetchedUsers);
        if (fetchedUsers.length > 0) {
          setActingUser(fetchedUsers[0]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = {
    users,
    actingUser,
    actingUserId: actingUser?.id ?? null,
    setActingUser,
    loading,
    error,
  };

  return (
    <ActingUserContext.Provider value={value}>
      {children}
    </ActingUserContext.Provider>
  );
}

export function useActingUser() {
  const context = useContext(ActingUserContext);

  if (!context) {
    throw new Error('useActingUser must be used within ActingUserProvider');
  }

  return context;
}
