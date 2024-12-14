import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet, // ledgerWallet,
  metaMaskWallet, // rainbowWallet,
  // safeWallet,
  // walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { rainbowkitBurnerWallet } from "burner-connector";
import * as chains from "viem/chains";
import scaffoldConfig from "~~/scaffold.config";

const { onlyLocalBurnerWallet, targetNetworks } = scaffoldConfig;
coinbaseWallet.preference = "smartWalletOnly";

const wallets = [
  metaMaskWallet,
  // walletConnectWallet,
  // ledgerWallet,
  coinbaseWallet,
  // rainbowWallet,
  // safeWallet,
  ...(!targetNetworks.some(network => network.id !== (chains.hardhat as chains.Chain).id) || !onlyLocalBurnerWallet
    ? [rainbowkitBurnerWallet]
    : []),
];

/**
 * wagmi connectors for the wagmi context
 */
export const wagmiConnectors = connectorsForWallets(
  [
    {
      groupName: "Supported Wallets",
      wallets,
    },
  ],
  {
    appName: "ARLib.me",
    projectId: scaffoldConfig.walletConnectProjectId,
  },
);

// export const wagmiConnectors = connectorsForWallets(
//   [
//     {
//       groupName: 'Supported Wallets',
//       wallets: [
//         {
//           connector: new CoinbaseWalletConnector({
//             chains: [base], // Specify Base as the supported chain
//             options: {
//               appName: 'ARLib.me',
//             },
//           }),
//         },
//         // Add other wallets here if needed
//       ],
//     },
//   ],
//   {
//     appName: 'ARLib.me',
//     projectId: scaffoldConfig.walletConnectProjectId, // Ensure this is properly set up
//   }
// );
