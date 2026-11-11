export function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

export function matchesSearch(name: string, query: string) {
  return normalizeSearch(name).includes(normalizeSearch(query));
}
