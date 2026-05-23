export interface MenuProductDto {
  id: string;
  name: string;
  description: string | null;
  salePrice: number;
  preparationTime: number;
  isActive: boolean;
}

export interface MenuCategoryDto {
  category: string;
  products: MenuProductDto[];
}
