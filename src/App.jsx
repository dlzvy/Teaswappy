import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import './App.css';
import SwapInterface from './components/SwapInterface';
import Navbar from './components/Navbar';

const OKX_WALLET_LINK = "https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge";

const teaSepoliaChain = {
  chainId: '0x27EA',
  chainName: 'TEA Sepolia',
  nativeCurrency: {
    name: 'TEA',
    symbol: 'TEA',
    decimals: 18
  },
  rpcUrls: ['https://tea-sepolia.g.alchemy.com/public'],
  blockExplorerUrls: ['https://sepolia.tea.xyz/']
};

const SHOULD_CONNECT_KEY = 'tea_swap_should_connect';

function App() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [networkSwitching, setNetworkSwitching] = useState(false);
  const [isOkxInstalled, setIsOkxInstalled] = useState(false);

  useEffect(() => {
    setIsOkxInstalled(!!window.okxwallet);
  }, []);

  const isTeaNetwork = chainId !== null && 
    (chainId === BigInt(10218) || chainId === 10218 || chainId === '0x27EA');

  const switchToTeaNetwork = useCallback(async () => {
    if (!window.okxwallet) return false;
    
    setNetworkSwitching(true);
    try {
      try {
        await window.okxwallet.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x27EA' }],
        });
        return true;
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            await window.okxwallet.request({
              method: 'wallet_addEthereumChain',
              params: [teaSepoliaChain]
            });
            return true;
          } catch (addError) {
            console.error('Failed to add TEA Sepolia network', addError);
            return false;
          }
        } else {
          console.error('Failed to switch to TEA Sepolia network', switchError);
          return false;
        }
      }
    } catch (error) {
      console.error('Error during network switching', error);
      return false;
    } finally {
      setNetworkSwitching(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    console.log('Disconnecting wallet (clearing local state)');
    localStorage.removeItem(SHOULD_CONNECT_KEY);
    
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
  }, []);

  const handleInstallOkxWallet = useCallback(() => {
    window.open(OKX_WALLET_LINK, '_blank');
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.okxwallet) {
      alert('Please install OKX Wallet to use this application');
      handleInstallOkxWallet();
      return false;
    }
    
    try {
      const accounts = await window.okxwallet.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length > 0) {
        const web3Provider = new ethers.BrowserProvider(window.okxwallet);
        const network = await web3Provider.getNetwork();
        const web3Signer = await web3Provider.getSigner();
        const address = await web3Signer.getAddress();

        setAccount(address);
        setChainId(network.chainId);
        setIsConnected(true);
        
        localStorage.setItem(SHOULD_CONNECT_KEY, 'true');
        
        if (network.chainId !== BigInt(10218)) {
          console.log('Not on TEA Sepolia, attempting to switch...');
          await switchToTeaNetwork();
        }
        
        return true;
      }
    } catch (error) {
      console.error('Connection failed', error);
      setIsConnected(false);
      return false;
    }
  }, [switchToTeaNetwork, handleInstallOkxWallet]);

  useEffect(() => {
    if (isConnected && !isTeaNetwork && !networkSwitching) {
      console.log('Network mismatch detected, switching to TEA Sepolia...');
      switchToTeaNetwork();
    }
  }, [isConnected, chainId, isTeaNetwork, networkSwitching, switchToTeaNetwork]);

  useEffect(() => {
    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        if (localStorage.getItem(SHOULD_CONNECT_KEY)) {
          connectWallet();
        }
      } else {
        disconnectWallet();
      }
    };

    const handleChainChanged = async (newChainId) => {
      console.log('Chain changed to:', newChainId);
      const chainIdBigInt = BigInt(newChainId);
      setChainId(chainIdBigInt);
      
      if (localStorage.getItem(SHOULD_CONNECT_KEY) && chainIdBigInt !== BigInt(10218)) {
        console.log('Network changed to non-TEA network, switching back...');
        await switchToTeaNetwork();
      }
    };

    if (window.okxwallet) {
      window.okxwallet.on('accountsChanged', handleAccountsChanged);
      window.okxwallet.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.okxwallet) {
        window.okxwallet.removeListener('accountsChanged', handleAccountsChanged);
        window.okxwallet.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [connectWallet, disconnectWallet, switchToTeaNetwork]);

  useEffect(() => {
    const checkConnection = async () => {
      if (localStorage.getItem(SHOULD_CONNECT_KEY) === 'true' && window.okxwallet) {
        try {
          const accounts = await window.okxwallet.request({ 
            method: 'eth_accounts'
          });
          
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.error('Initial connection check failed', error);
        }
      }
    };
    
    checkConnection();
  }, [connectWallet]);

  return (
    <div className="app">
      <Navbar 
        account={account} 
        isConnected={isConnected} 
        disconnectWallet={disconnectWallet}
        connectWallet={connectWallet}
        isOkxInstalled={isOkxInstalled}
      />
      <main className="main-content">
        <SwapInterface 
          account={account}
          isConnected={isConnected}
          chainId={chainId}
          networkSwitching={networkSwitching}
          connectWallet={connectWallet}
          isOkxInstalled={isOkxInstalled}
        />
      </main>
      <footer className="footer">
        <p>
          Built by <a href="https://x.com/xberryao" target="_blank" rel="noopener noreferrer">Xberry</a> • 
          Powered by <a href="https://tea.xyz" target="_blank" rel="noopener noreferrer">TEA Protocol</a>
        </p>
      </footer>
    </div>
  );
}

export default App;