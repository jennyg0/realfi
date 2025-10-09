type SensitivePayload = Record<string, unknown>;

type StoredRecord = {
  id: string;
  userId: string;
  payload: SensitivePayload;
  updatedAt: number;
};

const inMemoryNilDb = new Map<string, StoredRecord>();

function makeRecordId(userId: string) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${userId}-${Date.now().toString(36)}-${random}`;
}

/**
 * Persist sensitive payloads to Nillion.
 * For now, this is backed by an in-memory map so local development works without credentials.
 * Swap the internals with the official Nillion SDK once credentials are available.
 */
export async function saveSensitive(userId: string, payload: SensitivePayload) {
  const id = makeRecordId(userId);
  inMemoryNilDb.set(id, {
    id,
    userId,
    payload,
    updatedAt: Date.now(),
  });
  return id;
}

export async function loadSensitive(id: string) {
  return inMemoryNilDb.get(id)?.payload;
}

export async function updateSensitive(id: string, payload: SensitivePayload) {
  const record = inMemoryNilDb.get(id);
  if (!record) {
    throw new Error(`Nillion record ${id} not found`);
  }
  inMemoryNilDb.set(id, {
    ...record,
    payload,
    updatedAt: Date.now(),
  });
}
