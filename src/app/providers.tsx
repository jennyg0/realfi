"use client";

import { PropsWithChildren, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig, http } from "wagmi";
import { celo, fuse, base } from "wagmi/chains";

const privyAppId =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID ??
  (() => {
    console.error("NEXT_PUBLIC_PRIVY_APP_ID is not set");
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not set");
  })();

console.log("Privy App ID:", privyAppId);

export function AppProviders({ children }: PropsWithChildren) {
  // Create stable instances that won't change on re-render
  const queryClient = useMemo(() => new QueryClient(), []);

  const wagmiConfig = useMemo(() => createConfig({
    chains: [celo, fuse, base],
    transports: {
      [celo.id]: http(),
      [fuse.id]: http(),
      [base.id]: http(),
    },
  }), []);

  if (!privyAppId) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>Configuration Error</h1>
        <p>NEXT_PUBLIC_PRIVY_APP_ID is missing from environment variables</p>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "light",
        },
        supportedChains: [base, celo, fuse],
        defaultChain: celo,
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}
