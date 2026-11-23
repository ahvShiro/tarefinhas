package br.com.shiroshima.backend.models;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/** MainTask colors. Keep in sync with PALETTE in frontend/src/models/colors.ts. */
public final class ColorPalette {

    public static final List<String> COLORS = List.of(
            "#ef4444",
            "#f97316",
            "#f59e0b",
            "#eab308",
            "#84cc16",
            "#22c55e",
            "#10b981",
            "#14b8a6",
            "#06b6d4",
            "#0ea5e9",
            "#3b82f6",
            "#6366f1",
            "#8b5cf6",
            "#a855f7",
            "#d946ef",
            "#ec4899");

    private ColorPalette() {}

    public static String pickRandomColor() {
        return COLORS.get(ThreadLocalRandom.current().nextInt(COLORS.size()));
    }
}
