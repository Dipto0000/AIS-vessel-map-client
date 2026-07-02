import { useVessels } from '@/hooks/useVessels';

export default function App() {
  const { data: vessels, isLoading, isError, error, isConnected } = useVessels();

  return (
    <main className="app">
      <h1>AIS Vessel Map</h1>
      <p>Socket: {isConnected ? 'connected' : 'disconnected'}</p>
      {isLoading && <p>Loading vessels…</p>}
      {isError && <p>Error: {error?.message}</p>}
      {vessels && <p>Vessels in view: {vessels.length}</p>}
    </main>
  );
}
