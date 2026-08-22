import type { WlaDataMatrix, WlaParameter } from "./data_loader";

/**
 * Build a per-column weight vector aligned with `dataColumns`.
 *
 * For each data column, finds the matching parameter and returns its weight
 * when the parameter is checked; otherwise 0. Parameters without variants
 * match a column whose name equals `descriptor.id`. Parameters with variants
 * match `${descriptor.id}_${variant}`, where `variant` falls back to
 * `descriptor.defaultVariant` when the user hasn't picked one yet — so
 * unrelated variant columns for the same parameter contribute 0.
 */
export function constructWeightVectorFromParamaters(parameters : WlaParameter[], dataColumns: string[]) : number[] {
    return dataColumns.map((col) => {
        for (const p of parameters) {
            if (!p.checked) continue;
            const id = p.descriptor.id;
            if (p.descriptor.variants) {
                const variant = p.variant ?? p.descriptor.defaultVariant;
                if (variant && col === `${id}_${variant}`) return p.weight;
            } else if (col === id) {
                return p.weight;
            }
        }
        return 0;
    });
}

/**
 * Compute the per-row weighted score, matching Python's `weighted_score` in
 * `notebooks/world-livable-atlas/common.py`.
 *
 * At each row, weights are redistributed over only the columns that have a value
 * there: a NaN column contributes neither to numerator nor to denominator, so a
 * missing layer neither penalises the row nor discards it. A row is NaN only when
 * every non-zero-weighted column is NaN.
 *
 * Global weight normalisation (Python's `normalize_weights`) is skipped because it
 * scales numerator and denominator by the same constant and cancels in the ratio.
 *
 * `matrix.data` is row-major (`numRows * numCols`, element (i, j) at
 * `data[i * numCols + j]`). `weights` must have length `matrix.numCols`.
 */
export function computeWeightedScore(matrix: WlaDataMatrix, weights: number[]): Float32Array {
    const { data, numRows, numCols } = matrix;
    const out = new Float32Array(numRows);
    for (let i = 0; i < numRows; i++) {
        const base = i * numCols;
        let num = 0;
        let den = 0;
        for (let j = 0; j < numCols; j++) {
            const w = weights[j];
            if (w === 0) continue;
            const v = data[base + j];
            if (!Number.isNaN(v)) {
                num += w * v;
                den += w;
            }
        }
        out[i] = den > 0 ? num / den : NaN;
    }
    return out;
}