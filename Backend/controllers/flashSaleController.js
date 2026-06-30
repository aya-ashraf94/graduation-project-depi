const db = require("../db");
const { flashSales, products, categories, notifications, users } = require("../db/schema");
const { eq, and, gte, lte, or, desc, count, isNull, inArray } = require("drizzle-orm");

// ── Admin: Get all flash sales ─────────────────────────────────────────────
const getAllFlashSales = async (req, res) => {
  try {
    const result = await db.select()
      .from(flashSales)
      .orderBy(desc(flashSales.createdAt));
    res.json(result);
  } catch (error) {
    console.error("Error fetching flash sales:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── Admin: Create flash sale ───────────────────────────────────────────────
const createFlashSale = async (req, res) => {
  try {
    let { name, discountPercent, scopeType, scopeId, startDate, endDate, notifyBeforeMinutes } = req.body;

    if (!name || !discountPercent || !startDate || !endDate) {
      return res.status(400).json({ message: "Name, discount, start date, and end date are required" });
    }

    if (discountPercent < 1 || discountPercent > 100) {
      return res.status(400).json({ message: "Discount must be between 1 and 100" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    const validScopes = ["all", "category", "product"];
    if (scopeType && !validScopes.includes(scopeType)) {
      return res.status(400).json({ message: "Invalid scope type" });
    }

    if ((scopeType === "category" || scopeType === "product") && !scopeId) {
      return res.status(400).json({ message: `Scope ID required for ${scopeType} scope` });
    }

    const [sale] = await db.insert(flashSales).values({
      name,
      discountPercent: parseFloat(discountPercent),
      scopeType: scopeType || "all",
      scopeId: scopeType && scopeType !== "all" ? scopeId : null,
      startDate: start,
      endDate: end,
      notifyBeforeMinutes: notifyBeforeMinutes || 30,
      isActive: true,
      notificationSent: false,
    }).returning();

    res.json(sale);
  } catch (error) {
    console.error("Error creating flash sale:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── Admin: Update flash sale ───────────────────────────────────────────────
const updateFlashSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, discountPercent, scopeType, scopeId, startDate, endDate, notifyBeforeMinutes, isActive } = req.body;

    const updateData = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (discountPercent !== undefined) updateData.discountPercent = parseFloat(discountPercent);
    if (scopeType !== undefined) updateData.scopeType = scopeType;
    if (scopeId !== undefined) updateData.scopeId = scopeId || null;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (notifyBeforeMinutes !== undefined) updateData.notifyBeforeMinutes = notifyBeforeMinutes;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isActive === true) updateData.notificationSent = false;

    const [sale] = await db.update(flashSales)
      .set(updateData)
      .where(eq(flashSales.id, id))
      .returning();

    if (!sale) {
      return res.status(404).json({ message: "Flash sale not found" });
    }

    res.json(sale);
  } catch (error) {
    console.error("Error updating flash sale:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── Admin: Delete flash sale ───────────────────────────────────────────────
const deleteFlashSale = async (req, res) => {
  try {
    const { id } = req.params;
    const [sale] = await db.delete(flashSales).where(eq(flashSales.id, id)).returning({ id: flashSales.id });
    if (!sale) {
      return res.status(404).json({ message: "Flash sale not found" });
    }
    res.json({ message: "Flash sale deleted successfully" });
  } catch (error) {
    console.error("Error deleting flash sale:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── Public: Get active flash sales ─────────────────────────────────────────
const getActiveFlashSales = async (req, res) => {
  try {
    const now = new Date();
    const result = await db.select()
      .from(flashSales)
      .where(and(
        eq(flashSales.isActive, true),
        lte(flashSales.startDate, now),
        gte(flashSales.endDate, now)
      ))
      .orderBy(desc(flashSales.createdAt));

    // Attach scope names for display
    const enriched = await Promise.all(result.map(async (sale) => {
      let scopeName = null;
      if (sale.scopeType === "category" && sale.scopeId) {
        const [cat] = await db.select({ name: categories.name })
          .from(categories).where(eq(categories.id, sale.scopeId)).limit(1);
        scopeName = cat?.name || null;
      } else if (sale.scopeType === "product" && sale.scopeId) {
        const [prod] = await db.select({ title: products.title })
          .from(products).where(eq(products.id, sale.scopeId)).limit(1);
        scopeName = prod?.title || null;
      }
      return { ...sale, scopeName };
    }));

    res.json(enriched);
  } catch (error) {
    console.error("Error fetching active flash sales:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── Internal: Check and send notifications for ending flash sales ──────────
const checkAndNotifyFlashSales = async (io) => {
  try {
    const now = new Date();

    // ── Handle expired flash sales ─────────────────────────────────
    const expiredSales = await db.select()
      .from(flashSales)
      .where(and(
        eq(flashSales.isActive, true),
        lte(flashSales.endDate, now)
      ));

    for (const sale of expiredSales) {
      await db.update(flashSales)
        .set({ isActive: false, updatedAt: now })
        .where(eq(flashSales.id, sale.id));

      if (io) {
        io.emit("flash_sale_ended", {
          saleId: sale.id,
          name: sale.name,
        });
      }
    }

    // ── Send ending-soon notifications for active sales ────────────
    const sales = await db.select()
      .from(flashSales)
      .where(and(
        eq(flashSales.isActive, true),
        eq(flashSales.notificationSent, false),
        lte(flashSales.startDate, now),
        gte(flashSales.endDate, now)
      ));

    for (const sale of sales) {
      const timeUntilEnd = sale.endDate.getTime() - now.getTime();
      const notifyMs = (sale.notifyBeforeMinutes || 30) * 60 * 1000;

      if (timeUntilEnd <= notifyMs && timeUntilEnd > 0) {
        await db.update(flashSales)
          .set({ notificationSent: true, updatedAt: now })
          .where(eq(flashSales.id, sale.id));

        if (io) {
          io.emit("flash_sale_ending", {
            saleId: sale.id,
            name: sale.name,
            discountPercent: sale.discountPercent,
            endsInMinutes: Math.ceil(timeUntilEnd / 60000),
            title: `🔥 Flash Sale Ending Soon!`,
            body: `"${sale.name}" - ${sale.discountPercent}% OFF ends in ${Math.ceil(timeUntilEnd / 60000)} minutes!`,
          });
        }
      }
    }
  } catch (error) {
    console.error("[FlashSale] Notification check error:", error);
  }
};

module.exports = {
  getAllFlashSales,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
  getActiveFlashSales,
  checkAndNotifyFlashSales,
};
