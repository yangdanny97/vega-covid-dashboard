# vega-covid-dashboard
Interactive dashboard for COVID-19 data, built using [Vega](https://vega.github.io) and D3. 

Features:
- interactive world map of cases/deaths/recoveries per country
- interactive US map of cases/deaths per state
- tables of cases/deaths/recoveries worldwide & for each country

View live version [HERE](https://yangdanny97.github.io/vega-covid-dashboard).

Note: this vis relies on several APIs for data, so it will break if those APIs stop working

APIs used:
- [covid19api.com](https://covid19api.com): global and country data
- [covidapi.com](https://covidapi.com): states data

To run locally:
- run a local http server in the root of this repository (`python -m http.server`)
- open localhost in your browser
