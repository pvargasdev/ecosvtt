import { createContext, useContext } from 'react';

export const NetworkContext = createContext(null);

export const useNetwork = () => useContext(NetworkContext);
