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
    const unknownId = materialId || "(empty)";
    const unknownName = `未定義素材(${unknownId})`;
    const unknownNode: TreeNode = {
      id: unknownId,
      name: unknownName,
      quantity,
      fixed: false,
      children: [],
    };
    if (!allTotals[unknownId]) {
      allTotals[unknownId] = { name: unknownName, quantity: 0 };
    }
    if (!baseTotals[unknownId]) {
      baseTotals[unknownId] = { name: unknownName, quantity: 0 };
    }
    allTotals[unknownId].quantity += quantity;
    baseTotals[unknownId].quantity += quantity;
    return unknownNode;
  }

  if (stack.includes(materialId)) {
    const cycleName = `${material.name}(循環参照)`;
    const cycleNode: TreeNode = {
      id: material.id,
      name: cycleName,
      quantity,
      fixed: false,
      children: [],
    };
    addTotal(allTotals, material, quantity);
    addTotal(baseTotals, material, quantity);
    return cycleNode;
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
