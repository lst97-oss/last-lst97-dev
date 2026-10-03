# Loading and refreshing 16 million G-NAF addresses

- **Category:** Data Engineering
- **Source ID:** gnaf-data-ingestion
- **URL:** https://www.lst97.dev/projects/gnaf-address-autocomplete
- **Visibility:** Public

The ingestion pipeline loads the Geoscape G-NAF pipe-separated-value files into PostgreSQL staging tables, denormalises them into the materialized search view that every search query ultimately reads, then creates and warms the indexes. The stage order is fixed: G-NAF PSV files, pre-processing, nine parallel state/territory workers, `COPY FROM STDIN`, PostgreSQL staging tables, denormalisation into the materialized search view, parallel index creation, index warm-up.

Two choices do the heavy lifting. First, I run one worker per Australian state or territory — nine of them — so ingestion of the separate state datasets happens concurrently rather than sequentially. Second, instead of constructing huge JavaScript arrays in application memory and issuing bulk `INSERT` statements, the loader streams rows straight into PostgreSQL using `COPY FROM STDIN`. That is the reason application memory consumption stays predictable across a ~16 million address load; the working set is a bounded stream rather than a resident copy of the whole dataset.

Staging tables come first because G-NAF is relational and split across files. Loading raw rows into staging tables keeps the source data intact and separate, so the denormalisation step is a transform I can re-run and rebuild the materialized search representation from without re-reading the original PSV files.

On my development hardware the complete dataset loads and is prepared in roughly **9–10 minutes**. That is a development-hardware measurement from a MacBook Pro with an M5 Pro and PostgreSQL running through Docker, not a universal guarantee — I would expect the figure to move with disk, CPU and container limits.

G-NAF is also not static. Geoscape publishes refreshed datasets throughout the year, so a one-time load was not sufficient for a maintainable service. I built the tooling to make the refresh repeatable rather than a bespoke operation: download the new G-NAF release, run the loader, refresh staging data, rebuild the materialized search data, rebuild and warm the indexes, then return the service to production. Because the ingestion path is fully automated and parameterised by release, the quarterly dataset refresh is the same code path as the initial load.

Keeping the search representation as a materialized view rather than a live join across the staging tables is what makes this refresh cycle tractable: rebuilding indexes on a prepared denormalised view is fast and predictable, whereas re-joining normalised source tables on every keystroke would not be.