export type RecipeItem = {
  material_id: string;
  quantity: number;
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
  children: TreeNode[];
};

export type CalculationResult = {
  tree: TreeNode[];
  baseTotals: Record<string, { name: string; quantity: number }>;
  allTotals: Record<string, { name: string; quantity: number }>;
};
