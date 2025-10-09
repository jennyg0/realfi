"use client";

import { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";

const privyAppId =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID ??
  (() => {
    console.error("NEXT_PUBLIC_PRIVY_APP_ID is not set");
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not set");
  })();

console.log("Privy App ID:", privyAppId);

const queryClient = new QueryClient();

function QueryProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
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
      }}
    >
      <QueryProvider>{children}</QueryProvider>
    </PrivyProvider>
  );
}
