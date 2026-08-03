# Conda + Jupyter Notebook Boilerplate

A minimal starter for Jupyter notebook projects using **conda** for dependency management, pinned to **Python 3.12.10**.

## Prerequisites

Install one of the following (either works):

- [Miniconda](https://docs.conda.io/en/latest/miniconda.html) — recommended, lightweight
- [Anaconda](https://www.anaconda.com/download) — full distribution
- [Miniforge](https://github.com/conda-forge/miniforge) — conda-forge by default
- or on osx via homebrew:
    ```
    brew install --cask miniconda
    # register ijn zsh:
    conda init zsh 
    ```

Verify the install:

```sh
conda --version
```

## 1. Create the environment

The environment is installed **inside the project folder** (`./.env/`) rather than in your global conda envs, so each project is self-contained.

**macOS / Linux:**

```sh
conda env create -p ./.env -f environment.yml
```

**Windows (PowerShell / cmd):**

```powershell
conda env create -p .\.env -f environment.yml
```

This installs Python 3.12.10, JupyterLab, and the libraries listed in `environment.yml`.

## 2. Activate the environment

**macOS / Linux:**

```sh
conda activate ./.env
```

**Windows:**

```powershell
conda activate .\.env
```

Your shell prompt should now show the env path.

## 3. Launch Jupyter

```sh
jupyter lab
```

A browser tab opens at `http://localhost:8888/lab`. Open `notebooks/getting-started.ipynb` and run the cells to confirm everything works.

Prefer the classic notebook UI? Use `jupyter notebook` instead.

## Adding or updating dependencies

Edit `environment.yml`, then sync the environment:

```sh
conda env update -p ./.env -f environment.yml --prune
```

The `--prune` flag removes packages that are no longer listed in the file.

## Deactivating / removing the environment

Deactivate the current session:

```sh
conda deactivate
```

Remove the environment entirely:

```sh
conda env remove -p ./.env
```

## Project layout

```
.
├── .env/                       # Conda environment (git-ignored)
├── data/                       # Local data files (contents git-ignored)
├── notebooks/
│   └── getting-started.ipynb   # Sample notebook — start here
├── environment.yml             # Conda dependency spec
├── .gitignore
└── README.md
```
