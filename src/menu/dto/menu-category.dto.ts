export interface MenuItemDto {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string;
  salePrice: number;
  preparationTime: number;
  isActive: boolean;
}

export interface MenuCategoryDto {
  category: string;
  products: MenuItemDto[];
}
