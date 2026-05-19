import { getWoundImageViewUrl } from "./api";

/**
 * Thumbnail list fires one presign POST per row; doing them all at once can overload
 * API Gateway / device networking and every row ends up on the placeholder. Detail
 * uses a single call, so it still works. Cap parallel presigns for list rows.
 */
const MAX_CONCURRENT = 4;
let active = 0;
const waiters: (() => void)[] = [];

function release(): void {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) next();
}

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      active += 1;
      resolve();
    });
  });
}

/** Same as {@link getWoundImageViewUrl} but bounded concurrency for FlatList thumbnails. */
export async function getWoundImageViewUrlQueued(imageId: string): Promise<{ url: string }> {
  await acquire();
  try {
    return await getWoundImageViewUrl(imageId);
  } finally {
    release();
  }
}
