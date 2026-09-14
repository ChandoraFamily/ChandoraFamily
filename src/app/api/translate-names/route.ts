import { NextRequest, NextResponse } from "next/server";
import { listPersons, bulkUpdateHindiNames, updatePerson } from "@/lib/db";
import { translateNameToHindi } from "@/lib/hindiTranslator";
import { fullName } from "@/lib/formatName";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // 1. Single name transliteration / translation
    const singleName =
      (typeof body.name === "string" && body.name.trim()) ||
      [body.firstName, body.middleName, body.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    if (singleName) {
      const translated = await translateNameToHindi(singleName);
      return NextResponse.json({
        success: true,
        original: singleName,
        hindiName: translated,
        translated,
      });
    }

    // 2. Specific person translation / update
    if (body.personId && typeof body.personId === "string") {
      let hindiName = body.hindiName;
      if (!hindiName && body.englishName) {
        hindiName = await translateNameToHindi(body.englishName);
      }
      if (hindiName) {
        const updated = await updatePerson(body.personId, { hindiName });
        return NextResponse.json({ success: true, person: updated });
      }
      return NextResponse.json(
        { error: "No Hindi name or English name provided for translation." },
        { status: 400 },
      );
    }

    // 3. Bulk backfill / translation for all persons in the database
    if (body.action === "backfill-all" || body.batch === true) {
      const force = Boolean(body.force || body.forceAll);
      const allPersons = await listPersons({ limit: 2000 });
      const updates: Array<{ id: string; hindiName: string }> = [];

      // Filter persons that need translation
      const toTranslate = allPersons.filter(
        (p) => force || !p.hindiName || !p.hindiName.trim(),
      );

      // Process in small parallel chunks to prevent rate limiting
      const CHUNK_SIZE = 10;
      for (let i = 0; i < toTranslate.length; i += CHUNK_SIZE) {
        const chunk = toTranslate.slice(i, i + CHUNK_SIZE);
        const results = await Promise.all(
          chunk.map(async (p) => {
            const eng = fullName(p, "en");
            if (!eng.trim()) return null;
            try {
              const hindi = await translateNameToHindi(eng);
              if (hindi && hindi.trim()) {
                return { id: p.id, hindiName: hindi.trim() };
              }
            } catch (err) {
              console.warn(`Translation failed for ${eng}:`, err);
            }
            return null;
          }),
        );

        for (const res of results) {
          if (res) updates.push(res);
        }
      }

      const updatedCount = await bulkUpdateHindiNames(updates);

      return NextResponse.json({
        success: true,
        totalPersons: allPersons.length,
        processed: toTranslate.length,
        updated: updatedCount,
        sample: updates.slice(0, 5),
      });
    }

    return NextResponse.json(
      { error: "Invalid request. Provide 'name' or { action: 'backfill-all' }" },
      { status: 400 },
    );
  } catch (err: unknown) {
    console.error("Error in /api/translate-names:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
