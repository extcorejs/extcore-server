export const groupByKey = <T extends Record<any, any> = Record<any, any>>(
  collection: T[],
  key: keyof T,
): Record<string, T[]> => {
  const groupedItems: Record<string, T[]> = {};

  for (const item of collection) {
    const groupKey = String(item[key]);

    if (groupedItems[groupKey] === undefined) {
      groupedItems[groupKey] = [item];
    } else {
      groupedItems[groupKey] = [...groupedItems[groupKey], item];
    }
  }

  return groupedItems;
};
