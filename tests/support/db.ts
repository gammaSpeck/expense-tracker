import type { Page } from "@playwright/test";

export type SeedExpense = {
  value: number;
  categoryName: string; // resolved to the seeded category's random uuid
  description?: string;
  tags?: string[];
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  isAdhoc?: boolean;
  attachment?: string; // base64 data-URL, for the >10MB-snapshot restore test
};

type CategoryRow = { id: string; name: string };

/**
 * Writes expenses straight into IndexedDB (bypassing Dexie's observability layer), then
 * reloads the page so `useLiveQuery` picks the new rows up. Must be called AFTER `gotoApp`
 * (boot must have already seeded the 7 default categories) — never before.
 *
 * Also increments `tagMetadata` counts for every tag used — `useTags()` (TagTab) reads that
 * denormalized table, not the expenses' `tags` arrays directly, so skipping it would leave
 * seeded tags invisible on the Tags tab.
 */
export async function seedExpenses(page: Page, items: SeedExpense[]): Promise<void> {
  await page.evaluate((seedItems) => {
    return new Promise<void>((resolve, reject) => {
      const openReq = indexedDB.open("ExpenseTrackerDB");
      openReq.onerror = () => reject(openReq.error);
      openReq.onsuccess = () => {
        const db = openReq.result;

        const readTx = db.transaction("categories", "readonly");
        const getAllReq = readTx.objectStore("categories").getAll();
        getAllReq.onerror = () => {
          db.close();
          reject(getAllReq.error);
        };
        getAllReq.onsuccess = () => {
          const categories = getAllReq.result as CategoryRow[];
          const nameToId = new Map(categories.map((c) => [c.name, c.id]));

          const writeTx = db.transaction(["expenses", "tagMetadata"], "readwrite");
          writeTx.onerror = () => {
            db.close();
            reject(writeTx.error);
          };
          writeTx.oncomplete = () => {
            db.close();
            resolve();
          };

          const expenseStore = writeTx.objectStore("expenses");
          const tagStore = writeTx.objectStore("tagMetadata");
          const now = new Date().toISOString();
          const tagIncrements = new Map<string, number>();

          for (const item of seedItems) {
            const categoryId = nameToId.get(item.categoryName);
            if (!categoryId) {
              writeTx.abort();
              reject(new Error(`seedExpenses: no category named "${item.categoryName}"`));
              return;
            }
            expenseStore.add({
              id: crypto.randomUUID(),
              value: item.value,
              category: categoryId,
              description: item.description,
              tags: item.tags ?? [],
              date: item.date,
              time: item.time,
              isAdhoc: item.isAdhoc ?? false,
              attachment: item.attachment,
              createdAt: now,
              updatedAt: now,
            });
            for (const tag of item.tags ?? []) {
              tagIncrements.set(tag, (tagIncrements.get(tag) ?? 0) + 1);
            }
          }

          for (const [tag, increment] of tagIncrements) {
            const getTagReq = tagStore.get(tag);
            getTagReq.onsuccess = () => {
              const existing = getTagReq.result as { count?: number } | undefined;
              tagStore.put({ tag, count: (existing?.count ?? 0) + increment, lastUsed: now });
            };
          }
        };
      };
    });
  }, items);

  await page.reload();
}

export type ReadExpense = {
  value: number;
  categoryName: string;
  description?: string;
  tags: string[];
  date: string;
  time: string;
  isAdhoc: boolean;
};

/** Reads `expenses` out of IndexedDB with each row's category id resolved to its name. */
export async function readExpenses(page: Page): Promise<ReadExpense[]> {
  return page.evaluate(() => {
    const { promise, resolve, reject } = Promise.withResolvers<ReadExpense[]>();
    const openReq = indexedDB.open("ExpenseTrackerDB");
    openReq.onerror = () => reject(openReq.error);
    openReq.onsuccess = () => {
      const db = openReq.result;
      const fail = (error: unknown) => {
        db.close();
        reject(error);
      };
      try {
        const tx = db.transaction(["expenses", "categories"], "readonly");
        const catReq = tx.objectStore("categories").getAll();
        catReq.onerror = () => fail(catReq.error);
        catReq.onsuccess = () => {
          const idToName = new Map((catReq.result as CategoryRow[]).map((c) => [c.id, c.name]));
          const expReq = tx.objectStore("expenses").getAll();
          expReq.onerror = () => fail(expReq.error);
          expReq.onsuccess = () => {
            db.close();
            resolve(
              expReq.result.map((e) => ({
                value: e.value,
                categoryName: idToName.get(e.category) ?? "",
                description: e.description,
                tags: e.tags,
                date: e.date,
                time: e.time,
                isAdhoc: e.isAdhoc,
              })),
            );
          };
        };
      } catch (error) {
        fail(error);
      }
    };
    return promise;
  });
}
