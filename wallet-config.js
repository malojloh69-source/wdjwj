// Public TON Connect configuration. No private keys or seed phrases belong here.
window.OTS_WALLET_CONFIG = {
  manifestUrl: new URL('./tonconnect-manifest.json', window.location.href).href,
  network: '-239', // TON mainnet. Use '-3' only for testnet.

  // Paste the public TON address that receives TON and USDT deposits.
  // Example format: EQ... or UQ...
  recipientAddress: '',

  // Official USDT jetton master on TON mainnet.
  usdtJettonMaster: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
};
