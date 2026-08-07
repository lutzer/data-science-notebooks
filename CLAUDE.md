# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment

Conda-managed workspace pinned to **Python 3.12.10**. The environment file names the env `data-science-notebooks`, but `README.md` (and existing convention) uses `-n data_science`, so activate with that name unless the user says otherwise.

```sh
# create / update / remove
conda env create -n data_science -f environment.yml
conda env update -n data_science -f environment.yml --prune   # --prune drops packages no longer in the file
conda env remove -n data_science

conda activate data_science
jupyter lab
```

When adding a dependency, edit `environment.yml` (channel: `conda-forge`) and run the `update --prune` command above — do not `pip install` into the env ad hoc.

## Layout

- `notebooks/` — the user's own working notebooks. This is the primary place to add or edit work. `getting-started.ipynb` is a smoke test that also documents the expected library versions.
- `course_material/` — **git-ignored** German-language reference material from an alfatraining course (NumPy, Pandas, Matplotlib, Seaborn, plotly.express, Dash, spaCy, EDA walkthroughs, Marketing analysis, Data Storytelling, MapReduce). Treat as read-only reference; do not modify unless explicitly asked. Because it is ignored, changes here will not show up in `git status`.
- `data/` — local datasets. Contents are git-ignored (`data/*` with a `!data/.` keep-directory rule); do not commit data files.
- `environment.yml` — the single source of truth for dependencies.

There is no test suite, linter, or build step — this is a notebook workspace, not an application. Verification means running the relevant notebook cells.

## Gotchas

* generate doc strings for all helper functions
