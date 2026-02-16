export type RecipeItem = {
  material_id: string;
  quantity: number;
  reserve_required?: boolean;
};

export type Material = {
  id: string;
  name: string;
  recipe: RecipeItem[] | null;
};

export type Quest = {
  id: string;
  name: string;
  requirements: RecipeItem[];
};

export type TreeNode = {
  id: string;
  name: string;
  quantity: number;
  fixed: boolean;
  reserveRequired: boolean;
  children: TreeNode[];
};

export type CalculationResult = {
  tree: TreeNode[];
  baseTotals: Record<string, { name: string; quantity: number }>;
  allTotals: Record<string, { name: string; quantity: number }>;
};
