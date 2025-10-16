import { SecretVaultBuilderClient } from "@nillion/secretvaults";
import { Keypair } from "@nillion/nuc";
import { randomUUID } from "crypto";

type SensitivePayload = Record<string, unknown>;

// Collection ID for user financial data
const COLLECTION_NAME = process.env.NILLION_COLLECTION_NAME ?? "byob_user_data";

// Singleton NilDB client
let nilDbClientPromise: Promise<SecretVaultBuilderClient> | null = null;
let collectionId: string | null = null;
let collectionPromise: Promise<string> | null = null;
let lastRootTokenRefresh = 0;

type StoredRecord = {
  userId: string;
  payload: SensitivePayload;
  updatedAt: number;
};

const fallbackRecords = new Map<string, StoredRecord>();
let warnedAboutFallback = false;

function ensureFallbackWarning() {
  if (!warnedAboutFallback) {
    console.warn(
      "NilDB credentials missing; using in-memory fallback store. Data resets on restart."
    );
    warnedAboutFallback = true;
  }
}

const privateKeyEnv = process.env.NILLION_BUILDER_PRIVATE_KEY;
const chainUrlEnv = process.env.NILLION_CHAIN_URL;
const authUrlEnv = process.env.NILLION_AUTH_URL;
const dbUrlsEnv = process.env.NILLION_DB_URLS;

function isNilDbConfigured() {
  return Boolean(
    privateKeyEnv && chainUrlEnv && authUrlEnv && parseDbUrls(dbUrlsEnv).length
  );
}

function parseDbUrls(raw?: string) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

async function initNilDbClient() {
  if (!isNilDbConfigured()) {
    throw new Error(
      "NilDB is not configured. Provide builder private key and node URLs to enable persistence."
    );
  }

  const privateKey = privateKeyEnv!;
  if (!privateKey) {
    throw new Error("NILLION_BUILDER_PRIVATE_KEY not configured");
  }

  const chainUrl = chainUrlEnv!;
  const authUrl = authUrlEnv!;
  const dbUrls = parseDbUrls(dbUrlsEnv);

  if (!chainUrl) {
    throw new Error("NILLION_CHAIN_URL not configured");
  }
  if (!authUrl) {
    throw new Error("NILLION_AUTH_URL not configured");
  }
  if (!dbUrls.length) {
    throw new Error(
      "NILLION_DB_URLS must include at least one comma-separated URL"
    );
  }

  const keyPairHex = privateKey.startsWith("0x")
    ? privateKey
    : `0x${privateKey}`;
  const keypair = Keypair.from(keyPairHex);

  const client = await SecretVaultBuilderClient.from({
    keypair,
    urls: {
      chain: chainUrl,
      auth: authUrl,
      dbs: dbUrls,
    },
    blindfold: { operation: "store" },
  });

  // Force the initial token fetch so subsequent requests can mint invocations.
  await client.refreshRootToken();
  lastRootTokenRefresh = Date.now();
  return client;
}

async function getNilDbClient() {
  if (!isNilDbConfigured()) {
    throw new Error(
      "NilDB client requested but environment is not configured."
    );
  }

  if (!nilDbClientPromise) {
    nilDbClientPromise = initNilDbClient().catch((error) => {
      nilDbClientPromise = null;
      throw error;
    });
  }

  const client = await nilDbClientPromise;
  await ensureFreshRootToken(client);
  return client;
}

async function ensureFreshRootToken(client: SecretVaultBuilderClient) {
  const now = Date.now();
  const TTL_MS = 45_000;
  if (!lastRootTokenRefresh || now - lastRootTokenRefresh >= TTL_MS) {
    await client.refreshRootToken();
    lastRootTokenRefresh = Date.now();
  }
}

async function getOrCreateCollection() {
  if (collectionId) return collectionId;
  if (!collectionPromise) {
    collectionPromise = (async () => {
      if (!isNilDbConfigured()) {
        throw new Error(
          "NilDB collection requested but environment is not configured."
        );
      }

      const client = await getNilDbClient();

      // Try to find existing collection
      try {
        const collectionsResponse = await client.readCollections();
        const existing = collectionsResponse?.data?.find(
          (c: { name: string; id: string }) => c.name === COLLECTION_NAME
        );
        if (existing) {
          collectionId = existing.id;
          return collectionId;
        }
      } catch (error) {
        console.warn("Could not list collections, will create new:", error);
      }

      const newCollectionId = randomUUID();
      const schema = {
        userId: "string",
        payload: "string",
        updatedAt: "number",
      };

      try {
        const response = await client.createCollection({
          _id: newCollectionId,
          type: "standard",
          name: COLLECTION_NAME,
          schema,
        });
        const createdId = Object.values(response)[0] as string | undefined;
        collectionId = createdId ?? newCollectionId;
        console.log("Created NilDB collection:", collectionId);
      } catch (error) {
        console.error("Failed to create collection:", error);
        throw error;
      }

      return collectionId;
    })().finally(() => {
      collectionPromise = null;
    });
  }

  return collectionPromise;
}

/**
 * In-memory fallback persistence used when NilDB is not configured.
 */
function saveFallback(userId: string, payload: SensitivePayload) {
  ensureFallbackWarning();
  const id = randomUUID();
  fallbackRecords.set(id, {
    userId,
    payload,
    updatedAt: Date.now(),
  });
  return id;
}

function loadFallback(id: string) {
  ensureFallbackWarning();
  const record = fallbackRecords.get(id);
  return record?.payload;
}

function updateFallback(id: string, payload: SensitivePayload) {
  ensureFallbackWarning();
  const existing = fallbackRecords.get(id);
  if (!existing) {
    throw new Error(`Fallback record ${id} not found`);
  }
  fallbackRecords.set(id, {
    userId: existing.userId,
    payload,
    updatedAt: Date.now(),
  });
}

/**
 * Persist sensitive payloads to Nillion NilDB.
 */
export async function saveSensitive(userId: string, payload: SensitivePayload) {
  if (!isNilDbConfigured()) {
    return saveFallback(userId, payload);
  }

  try {
    const client = await getNilDbClient();
    const collection = await getOrCreateCollection();

    const record = {
      userId,
      payload: JSON.stringify(payload), // Stringify nested object
      updatedAt: Date.now(),
    };

    const response = await client.createStandardData({
      body: {
        collection,
        data: [record],
      },
    });

    const firstNodeResponse = Object.values(response)[0] as {
      data?: { created?: string[] };
    };
    const recordId = firstNodeResponse?.data?.created?.[0];

    return recordId || `${userId}-${Date.now()}`;
  } catch (error) {
    console.error("Failed to save to NilDB:", error);
    // Fallback to generating an ID
    return `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export async function loadSensitive(id: string) {
  if (!isNilDbConfigured()) {
    return loadFallback(id);
  }

  try {
    const client = await getNilDbClient();
    const collection = await getOrCreateCollection();

    const response = await client.findData({
      collection,
      filter: { _id: id },
    });

    const payloadString = response.data?.[0]?.payload;
    return payloadString ? JSON.parse(payloadString as string) : undefined;
  } catch (error) {
    console.error("Failed to load from NilDB:", error);
    return undefined;
  }
}

export async function updateSensitive(id: string, payload: SensitivePayload) {
  if (!isNilDbConfigured()) {
    updateFallback(id, payload);
    return;
  }

  try {
    const client = await getNilDbClient();
    const collection = await getOrCreateCollection();

    await client.updateData({
      collection,
      filter: { _id: id },
      update: {
        payload: JSON.stringify(payload),
        updatedAt: Date.now(),
      },
    });
  } catch (error) {
    console.error("Failed to update in NilDB:", error);
    throw error;
  }
}
