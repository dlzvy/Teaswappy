import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './SwapInterface.css';

const OKX_WALLET_LINK = "https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge";

const EXPLORER_URL = "https://sepolia.tea.xyz/tx/";

const TOKENS = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'TEA',
    name: 'TEA Native',
    decimals: 18,
    logoURI: 'https://2rulzuatlal2cmmjw3cvmqbnbsx3cdszzo2b3ar5kjc6idnnvrza.arweave.net/1Gi80BNYF6ExibbFVkAtDK-xDlnLtB2CPVJF5A2trHI'
  },
  {
    address: '0x3f448B168F43261e9e95720485C6BA9886E55482',
    symbol: 'SCID',
    name: 'SCAVENGER ID',
    decimals: 18,
    logoURI: 'https://tpfgm3rwfktmy2oj6js6zwtud2xpbj7jry7xdqenu54agnrvsijq.arweave.net/m8pmbjYqpsxpyfJl7Np0Hq7wp-mOP3HAjad4AzY1khM'
  }
];

const ERC20_ABI = [
  "function approve(address,uint256) external returns (bool)",
  "function balanceOf(address) view returns (uint256)",
];

const SWAP_ABI = [
  "function swapSCIDtoTEA(uint256) external",
];

const SWAP_CONTRACT = "0x390C68e433EDeFc6532BA9096A17fA2c7dA7Df71";
const SCID_PER_TEA = 100;

const SwapInterface = ({ 
  account, 
  isConnected, 
  chainId, 
  networkSwitching, 
  connectWallet 
}) => {
  const [tokenFrom, setTokenFrom] = useState(TOKENS[0]);
  const [tokenTo, setTokenTo] = useState(TOKENS[1]);
  const [amountFrom, setAmountFrom] = useState('');
  const [amountTo, setAmountTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [balanceFrom, setBalanceFrom] = useState('0');
  const [balanceTo, setBalanceTo] = useState('0');
  const [showFromTokens, setShowFromTokens] = useState(false);
  const [showToTokens, setShowToTokens] = useState(false);
  const [isOkxInstalled, setIsOkxInstalled] = useState(false);
  
  const [txHash, setTxHash] = useState('');
  const [showTxSuccess, setShowTxSuccess] = useState(false);

  const isTeaNetwork = chainId !== null && 
    (chainId === BigInt(10218) || chainId === 10218 || chainId === '0x27EA');

  useEffect(() => {
    setIsOkxInstalled(!!window.okxwallet);
  }, []);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!window.okxwallet || !account || !isTeaNetwork) return;

      try {
        const web3Provider = new ethers.BrowserProvider(window.okxwallet);

        const getBalance = async (token) => {
          try {
            if (token.address === ethers.ZeroAddress) {
              const balance = await web3Provider.getBalance(account);
              return ethers.formatEther(balance);
            } else {
              const tokenContract = new ethers.Contract(token.address, ERC20_ABI, web3Provider);
              const balance = await tokenContract.balanceOf(account);
              return ethers.formatUnits(balance, token.decimals);
            }
          } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
            return '0';
          }
        };

        setBalanceFrom(await getBalance(tokenFrom));
        setBalanceTo(await getBalance(tokenTo));
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      }
    };

    fetchBalances();
  }, [account, tokenFrom, tokenTo, isTeaNetwork, chainId]);

  const calculateSwapAmount = (value) => {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      setAmountTo('');
    } else {
      const result = tokenFrom.symbol === 'TEA'
        ? parsed * SCID_PER_TEA
        : parsed / SCID_PER_TEA;
      setAmountTo(result.toFixed(6));
    }
  };

  const handleAmountFromChange = (value) => {
    setAmountFrom(value);
    calculateSwapAmount(value);
  };

  const handleSwapTokens = () => {
    const temp = tokenFrom;
    setTokenFrom(tokenTo);
    setTokenTo(temp);

    const tempAmount = amountFrom;
    setAmountFrom(amountTo);
    setAmountTo(tempAmount);
  };

  const handleInstallOkxWallet = () => {
    window.open(OKX_WALLET_LINK, '_blank');
  };

  const handleCloseTxMessage = () => {
    setShowTxSuccess(false);
    setTxHash('');
  };

  const openTxExplorer = () => {
    window.open(`${EXPLORER_URL}${txHash}`, '_blank');
  };

  const handleSwap = async () => {
    if (!isOkxInstalled) {
      alert('Please install OKX Wallet to use this application');
      handleInstallOkxWallet();
      return;
    }

    if (!isConnected) {
      await connectWallet();
      return;
    }

    if (!amountFrom || !isTeaNetwork || networkSwitching) {
      return;
    }

    try {
      setLoading(true);
      setShowTxSuccess(false);
      setTxHash('');
      
      const web3Provider = new ethers.BrowserProvider(window.okxwallet);
      const signer = await web3Provider.getSigner();
      const parsedAmount = ethers.parseUnits(amountFrom, 18);

      if (tokenFrom.symbol === 'TEA') {
        const tx = await signer.sendTransaction({
          to: SWAP_CONTRACT,
          value: parsedAmount
        });
        await tx.wait();
        
        setTxHash(tx.hash);
        setShowTxSuccess(true);
      } else {
        const tokenContract = new ethers.Contract(tokenFrom.address, ERC20_ABI, signer);
        const swapContract = new ethers.Contract(SWAP_CONTRACT, SWAP_ABI, signer);

        const approveTx = await tokenContract.approve(SWAP_CONTRACT, parsedAmount);
        await approveTx.wait();

        const swapTx = await swapContract.swapSCIDtoTEA(parsedAmount);
        await swapTx.wait();
        
        setTxHash(swapTx.hash);
        setShowTxSuccess(true);
      }

      setAmountFrom('');
      setAmountTo('');
    } catch (error) {
      console.error("Swap failed:", error);
      alert("Swap failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="swap-container">
      {!isOkxInstalled && (
        <div className="okx-wallet-warning">
          <p>This application requires OKX Wallet to operate</p>
          <button onClick={handleInstallOkxWallet}>
            Install OKX Wallet
          </button>
        </div>
      )}

      {showTxSuccess && txHash && (
        <div className="tx-success-message">
          <div className="tx-success-header">
            <h3>Transaction Successful</h3>
            <button className="tx-close-button" onClick={handleCloseTxMessage}>×</button>
          </div>
          <p>Your swap from {tokenFrom.symbol} to {tokenTo.symbol} has been successful!</p>
          <div className="tx-hash-container">
            <p className="tx-hash-label">Transaction Hash:</p>
            <p className="tx-hash-value">{txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}</p>
          </div>
          <button className="view-on-explorer-button" onClick={openTxExplorer}>
            View on TEA Explorer
          </button>
        </div>
      )}

      <div className="swap-card">
        <div className="swap-header">
          <h2>Swap Tokens</h2>
          <div className="settings-icon">⚙️</div>
        </div>

        {networkSwitching && (
          <div className="network-switching-message">
            <p>Switching to TEA Sepolia network...</p>
          </div>
        )}

        {showFromTokens && (
          <div className="token-dropdown">
            {TOKENS.filter(token => token !== tokenTo).map((token) => (
              <div 
                key={token.address} 
                className="token-item" 
                onClick={() => {
                  setTokenFrom(token);
                  setShowFromTokens(false);
                }}
              >
                <img src={token.logoURI} alt={token.symbol} />
                <div className="token-info">
                  <div className="token-symbol">{token.symbol}</div>
                  <div className="token-name">{token.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="token-input-container">
          <label>From</label>
          <div className="token-input">
            <input
              type="number"
              value={amountFrom}
              onChange={(e) => handleAmountFromChange(e.target.value)}
              placeholder="0.0"
              disabled={loading || networkSwitching}
            />
            <div 
              className="token-selector" 
              onClick={() => !loading && !networkSwitching && setShowFromTokens(!showFromTokens)}
            >
              <img src={tokenFrom.logoURI} alt={tokenFrom.symbol} />
              <span>{tokenFrom.symbol}</span>
              <span>▼</span>
            </div>
          </div>
          <div className="balance-display">
            Balance: {parseFloat(balanceFrom).toFixed(4)} {tokenFrom.symbol}
          </div>
        </div>

        <div className="swap-divider">
          <button 
            className="swap-button" 
            onClick={handleSwapTokens}
            disabled={loading || networkSwitching}
          >↓↑</button>
        </div>

        {showToTokens && (
          <div className="token-dropdown">
            {TOKENS.filter(token => token !== tokenFrom).map((token) => (
              <div 
                key={token.address} 
                className="token-item" 
                onClick={() => {
                  setTokenTo(token);
                  setShowToTokens(false);
                }}
              >
                <img src={token.logoURI} alt={token.symbol} />
                <div className="token-info">
                  <div className="token-symbol">{token.symbol}</div>
                  <div className="token-name">{token.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="token-input-container">
          <label>To</label>
          <div className="token-input">
            <input
              type="number"
              value={amountTo}
              placeholder="0.0"
              disabled
            />
            <div 
              className="token-selector" 
              onClick={() => !loading && !networkSwitching && setShowToTokens(!showToTokens)}
            >
              <img src={tokenTo.logoURI} alt={tokenTo.symbol} />
              <span>{tokenTo.symbol}</span>
              <span>▼</span>
            </div>
          </div>
          <div className="balance-display">
            Balance: {parseFloat(balanceTo).toFixed(4)} {tokenTo.symbol}
          </div>
        </div>

        <button
          className="swap-action-button"
          onClick={handleSwap}
          disabled={loading || networkSwitching || (!isConnected ? false : !amountFrom)}
        >
          {!isOkxInstalled 
            ? 'Install OKX Wallet' 
            : !isConnected 
              ? 'Connect with OKX Wallet' 
              : networkSwitching
                ? 'Switching to TEA Sepolia...'
                : loading 
                  ? 'Processing...' 
                  : `Swap ${tokenFrom.symbol} to ${tokenTo.symbol}`}
        </button>
      </div>
    </div>
  );
};

export default SwapInterface;