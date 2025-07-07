import { Header } from '@/components/header';
import { Swap } from './trade/swap/swap';
import { Settings } from './trade/settings';


export function App() {
  return (
    <>
      <Header />
      <div className="flex justify-center h-full py-32">
        <div className="max-w-lg w-full px-4">
            <Settings />

          <Swap />
        </div>
      </div>
    </>
  );
}
