import React, { useState, useEffect } from 'react';
import './Navbar.css';

const OKX_WALLET_LINK = "https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge";

const LOGO_URL = "https://a4x3zqzfsxbb7ejdge3pyxegmjlny6o7w5xtzscignhjgnxeihca.arweave.net/By-8wyWVwh-RIzE2_FyGYlbced-3bzzISDNOkzbkQcQ";

const Navbar = ({ account, isConnected, disconnectWallet, connectWallet }) => {
  const [formattedAddress, setFormattedAddress] = useState('');

  useEffect(() => {
    if (account) {
      setFormattedAddress(`${account.slice(0, 6)}...${account.slice(-4)}`);
    } else {
      setFormattedAddress('');
    }
  }, [account]);

  const handleWalletAction = async () => {
    if (!isConnected) {
      if (!window.okxwallet) {
        alert('Please install OKX Wallet to use this application');
        window.open(OKX_WALLET_LINK, '_blank');
        return;
      }
      
      try {
        await connectWallet();
      } catch (error) {
        console.error('Connection failed', error);
        alert('Failed to connect wallet. Please try again.');
      }
    } else {
      disconnectWallet();
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img 
          src={LOGO_URL} 
          alt="TEA Protocol" 
          className="logo" 
        />
      </div>
      <div className="navbar-menu">
        <div className="wallet-info">
          {isConnected && (
            <span className="wallet-address">{formattedAddress}</span>
          )}
          <button className="connect-button" onClick={handleWalletAction}>
            {isConnected ? 'Disconnect Wallet' : 'Connect with OKX Wallet'}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;