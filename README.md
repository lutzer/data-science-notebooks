# World Livable Atlas

*This project explores our planet in respect of the most livable places. It divides the planet in cells of 0.5 ° latitude and longitude. At the equator a cell spans roughly 56km x 56km. The grid gets denser to the poles: at 60° latitude its size is 56 km x 28 km. Each grid cell is scored by a number of different metrices, that are weighted by the sliders below. Some of the parameters require you to pick a personal preference, such as temperature. At the end of this survey you might find the perfect place for you to live.*

See the atlas here: [World Livable Atlas](https://lutzer.github.io/world-livable-atlas/)

## Project Documentation:

* Analysis Notebooks: [World Livable atlas](notebooks/world-livable-atlas/README.md) 
* Dashboard App [WLA Dashboard](dashboards/wla-react-dashboard/README.md)

## Development

### Prerequisites

Install one of the following (either works):

- [Miniconda](https://docs.conda.io/en/latest/miniconda.html) — recommended, lightweight
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

### 1. Create the environment


**macOS / Linux:**

```sh
conda env create -n data_science -f environment.yml
```

**Windows (PowerShell / cmd):**

```powershell
conda env create -n data_science -f environment.yml
```

This installs Python 3.12.10, JupyterLab, and the libraries listed in `environment.yml`.

### 2. Activate the environment

**macOS / Linux:**

```sh
conda activate data_science
```

**Windows:**

```powershell
conda activate data_science
```

Your shell prompt should now show the env path.

### 3. Launch Jupyter

```sh
jupyter lab
```

A browser tab opens at `http://localhost:8888/lab`. Open `notebooks/getting-started.ipynb` and run the cells to confirm everything works.

Prefer the classic notebook UI? Use `jupyter notebook` instead.

## Adding or updating dependencies

Edit `environment.yml`, then sync the environment:

```sh
conda env update -n data_science -f environment.yml --prune
```

The `--prune` flag removes packages that are no longer listed in the file.

## Deactivating / removing the environment

Deactivate the current session:

```sh
conda deactivate
```

Remove the environment entirely:

```sh
conda env remove -n data_science
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
