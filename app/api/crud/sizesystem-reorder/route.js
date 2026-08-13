import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { enqueueChartRegenerationForCategories } from "@/lib/size-guide-chart";

function triggerChartRegeneration(orderedIds) {
  setImmediate(async () => {
    try {
      const systemIds = orderedIds.map((id) => Number(id)).filter(Number.isFinite);
      if (systemIds.length === 0) return;

      const categories = await prisma.category.findMany({
        where: {
          OR: [
            { sizingSystems: { some: { id: { in: systemIds } } } },
            { originSystemId: { in: systemIds } },
          ],
        },
        select: { id: true },
      });
      enqueueChartRegenerationForCategories(categories.map((category) => category.id));
    } catch (error) {
      console.error("[sizesystem-reorder] Error regenerando guías:", error.message);
    }
  });
}

/**
 * PUT /api/crud/sizesystem-reorder
 * Body: { orderedIds: [3, 1, 5, 2, ...] }
 * Persists displayOrder for each SizeSystem based on array position.
 */
export async function PUT(request) {
  try {
    const { orderedIds } = await request.json();

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: "orderedIds debe ser un array no vacío de IDs" },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.sizeSystem.update({
          where: { id: Number(id) },
          data: { displayOrder: index },
        })
      )
    );

    triggerChartRegeneration(orderedIds);

    return NextResponse.json({ success: true, count: orderedIds.length });
  } catch (error) {
    console.error("[sizesystem-reorder] Error:", error.message);
    return NextResponse.json(
      { error: "Error al reordenar sistemas de tallas", details: error.message },
      { status: 500 }
    );
  }
}
