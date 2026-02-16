import { Material, RecipeItem, CalculationResult, TreeNode } from "@/lib/types";

function isBaseMaterial(material: Material): boolean {
  return !material.recipe || material.recipe.length === 0;
}

function addTotal(
  target: Record<string, { name: string; quantity: number }>,
  material: Material,
  quantity: number,
): void {
  if (!target[material.id]) {
    target[material.id] = { name: material.name, quantity: 0 };
  }
  target[material.id].quantity += quantity;
}

function expandNode(
  materialId: string,
  quantity: number,
  materialsById: Map<string, Material>,
  baseTotals: Record<string, { name: string; quantity: number }>,
  allTotals: Record<string, { name: string; quantity: number }>,
  fixedMaterialIds: Set<string>,
  stack: string[],
): TreeNode {
  const material = materialsById.get(materialId);
  if (!material) {
    throw new Error(`Unknown material id: ${materialId}`);
  }

  if (stack.includes(materialId)) {
    const chain = [...stack, materialId].join(" -> ");
    throw new Error(`Circular recipe detected: ${chain}`);
  }

  const fixed = fixedMaterialIds.has(material.id);

  const node: TreeNode = {
    id: material.id,
    name: material.name,
    quantity,
    fixed,
    children: [],
  };

  if (fixed) {
    // Fixed materials are treated as directly required items.
    addTotal(allTotals, material, quantity);
    addTotal(baseTotals, material, quantity);
    return node;
  }

  addTotal(allTotals, material, quantity);

  if (isBaseMaterial(material)) {
    addTotal(baseTotals, material, quantity);
    return node;
  }

  const nextStack = [...stack, materialId];
  for (const ingredient of material.recipe as RecipeItem[]) {
    const childQty = ingredient.quantity * quantity;
    node.children.push(
      expandNode(
        ingredient.material_id,
        childQty,
        materialsById,
        baseTotals,
        allTotals,
        fixedMaterialIds,
        nextStack,
      ),
    );
  }

  return node;
}

export function calculateQuestMaterials(
  requirements: RecipeItem[],
  materials: Material[],
  fixedMaterialIds: Set<string> = new Set<string>(),
): CalculationResult {
  const materialsById = new Map<string, Material>(materials.map((m) => [m.id, m]));
  const baseTotals: Record<string, { name: string; quantity: number }> = {};
  const allTotals: Record<string, { name: string; quantity: number }> = {};

  const tree = requirements.map((requirement) =>
    expandNode(
      requirement.material_id,
      requirement.quantity,
      materialsById,
      baseTotals,
      allTotals,
      fixedMaterialIds,
      [],
    ),
  );

  return { tree, baseTotals, allTotals };
}
