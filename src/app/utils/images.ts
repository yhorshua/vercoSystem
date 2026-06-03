export const getProductImage = (file?: string) => {
  if (!file) return '/img/no-image.png';
  return `https://verco.store/img/products/${file}`;
};