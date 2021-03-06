var view;
var view2;
var fmt = d3.format(",d");

function renderWorld(spec) {
    var runtime = vega.parse(spec);
    var handler = new vegaTooltip.Handler({
        'theme': 'dark'
    });
    view = new vega.View(runtime, {
            renderer: 'svg',
            container: '#view',
            hover: true
        })
        .tooltip(handler.call)
        .initialize(document.getElementById("view"))
        .run();
    return view.runAsync();
}

function renderUSA(spec) {
    var runtime = vega.parse(spec);
    var handler = new vegaTooltip.Handler({
        'theme': 'dark'
    });
    view2 = new vega.View(runtime, {
            renderer: 'svg',
            container: '#view2',
            hover: true
        })
        .tooltip(handler.call)
        .initialize(document.getElementById("view2"))
        .run();
    return view2.runAsync();
}

var worldspec;
var usaspec;
var circleRange = [4, 2500];
var size = [975, 610];
var spec = {
    "$schema": "https://vega.github.io/schema/vega/v5.json",
    "width": size[0],
    "height": size[1],
    "padding": {
        "top": 0,
        "left": 0,
        "right": 0,
        "bottom": 0
    },
    "autosize": "none",
    "signals": [{
            "name": "scale",
            "value": 150,
            "on": [{
                "events": {
                    "type": "wheel",
                    "consume": true
                },
                "update": "clamp(scale * pow(1.0005, -event.deltaY * pow(16, event.deltaMode)), 150, 3000)"
            }]
        },
        {
            "name": "scaleFactor",
            "value": 1,
            "on": [{
                "events": {
                    "signal": "scale"
                },
                "update": "scale/150"
            }]
        },
        {
            "name": "angles",
            "value": [0, 0],
            "on": [{
                "events": "mousedown",
                "update": "[rotateX, centerY]"
            }]
        },
        {
            "name": "cloned",
            "value": null,
            "on": [{
                "events": "mousedown",
                "update": "copy('projection')"
            }]
        },
        {
            "name": "start",
            "value": null,
            "on": [{
                "events": "mousedown",
                "update": "invert(cloned, xy())"
            }]
        },
        {
            "name": "drag",
            "value": null,
            "on": [{
                "events": "[mousedown, window:mouseup] > window:mousemove",
                "update": "invert(cloned, xy())"
            }]
        },
        {
            "name": "delta",
            "value": null,
            "on": [{
                "events": {
                    "signal": "drag"
                },
                "update": "[drag[0] - start[0], start[1] - drag[1]]"
            }]
        },
        {
            "name": "rotateX",
            "value": 0,
            "on": [{
                "events": {
                    "signal": "delta"
                },
                "update": "angles[0] + delta[0]"
            }]
        },
        {
            "name": "centerY",
            "value": 0,
            "on": [{
                "events": {
                    "signal": "delta"
                },
                "update": "clamp(angles[1] + delta[1], -60, 60)"
            }]
        }
    ],
    "marks": [{
        "type": "path",
        "from": {
            "data": "map"
        },
        "encode": {
            "enter": {
                "fill": {
                    "value": "dimgray"
                },
                "stroke": {
                    "value": "lavender"
                }
            },
            "update": {
                "path": {
                    "field": "path"
                },
                "fill": {
                    "value": "dimgray"
                }
            },
            "hover": {
                "fill": {
                    "value": "silver"
                },
            },
        }
    }, {
        "type": "symbol",
        "from": {
            "data": "map"
        },
        "encode": {
            "enter": {},
            "update": {
                "size": {
                    "scale": {
                        "signal": "Variable"
                    },
                    "field": {
                        "signal": "Variable"
                    },
                    "mult": {
                        "signal": "scaleFactor"
                    }
                },
                "fill": {
                    "value": "red"
                },
                "fillOpacity": {
                    "value": 0.8
                },
                "strokeWidth": {
                    "value": 0
                },
                "x": {
                    "field": "center[0]"
                },
                "y": {
                    "field": "center[1]"
                }
            }
        }
    }]
};

function setupWorldMap(countriesdata) {
    worldspec = JSON.parse(JSON.stringify(spec));
    // extract 2-digit code and use as id, use id to extract relevant fields from country covid data
    worldspec.data = [{
        "name": "covid-country",
        "values": countriesdata
    }, {
        "name": "centroids-country",
        "url": "./centroids_country.csv",
        "format": {
            "type": "csv",
            "parse": "auto"
        }
    }, {
        "name": "map",
        "url": "./world-countries.json",
        "format": {
            "type": "topojson",
            "feature": "countries"
        },
        "transform": [{
                "type": "geopath",
                "projection": "projection"
            },
            {
                "type": "formula",
                "as": "id",
                "expr": "datum.properties['Alpha-2']"
            },
            {
                "type": "lookup",
                "from": "covid-country",
                "key": "CountryCode",
                "fields": ["id"],
                "values": ["TotalConfirmed", "TotalDeaths", "TotalRecovered"]
            },
            // use centers from separate file
            {
                "type": "lookup",
                "from": "centroids-country",
                "key": "country",
                "fields": ["id"],
                "values": ["longitude", "latitude"]
            },
            {
                "type": "geopoint",
                "projection": "projection",
                "fields": ["longitude", "latitude"]
            },
            {
                "type": "formula",
                "as": "center",
                "expr": "[datum.x, datum.y]"
            }
        ]
    }];
    worldspec.scales = [{
            "name": "TotalDeaths",
            "type": "linear",
            "domain": {
                "data": "covid-country",
                "field": "TotalDeaths"
            },
            "range": circleRange
        },
        {
            "name": "TotalConfirmed",
            "type": "linear",
            "domain": {
                "data": "covid-country",
                "field": "TotalConfirmed"
            },
            "range": circleRange
        }
    ]
    worldspec.projections = [{
        "name": "projection",
        "type": "equirectangular",
        "scale": {
            "signal": "scale"
        },
        "rotate": [{
            "signal": "rotateX"
        }, 0, 0],
        "center": [0, {
            "signal": "centerY"
        }],
        "translate": [{
            "signal": "tx"
        }, {
            "signal": "ty"
        }]
    }];
    worldspec.signals.unshift({
        "name": "tx",
        "update": "width / 2"
    });
    worldspec.signals.unshift({
        "name": "ty",
        "update": "height / 2"
    });
    worldspec.signals.push({
        "name": "Variable",
        "value": "TotalDeaths",
        "bind": {
            "input": "select",
            "options": [
                "TotalDeaths",
                "TotalConfirmed"
            ],
            "element": "#viewControl"
        },
    });
    worldspec.marks[0].encode.enter.tooltip = {
        "signal": "{ 'Country': datum.properties.name, 'Deaths': format(datum.TotalDeaths, ',d'), 'Cases': format(datum.TotalConfirmed, ',d'), 'Recovered': format(datum.TotalRecovered, ',d') }"
    }
    worldspec.marks[1].encode.enter.tooltip = {
        "signal": "{ 'Country': datum.properties.name, 'Deaths': format(datum.TotalDeaths, ',d'), 'Cases': format(datum.TotalConfirmed, ',d'), 'Recovered': format(datum.TotalRecovered, ',d') }"
    }
    renderWorld(worldspec);
}

function setupUSMap(statesdata) {
    usaspec = JSON.parse(JSON.stringify(spec));
    usaspec.data = [{
        "name": "covid-states",
        "values": statesdata
    }, {
        "name": "map",
        "url": "./states-albers-10m.json",
        "format": {
            "type": "topojson",
            "feature": "states"
        },
        "transform": [{
                "type": "geopath",
                "projection": "projection"
            },
            {
                "type": "formula",
                "as": "id",
                "expr": "datum.properties.name"
            },
            // use centroid as center
            {
                "type": "formula",
                "as": "center",
                "expr": "geoCentroid('projection', datum.geometry)"
            },
            {
                "type": "lookup",
                "from": "covid-states",
                "key": "state_name",
                "fields": ["id"],
                "as": ["TotalConfirmed", "TotalDeaths"],
                "values": ["total_cases", "total_deaths"]
            }
        ]
    }];
    usaspec.scales = [{
            "name": "TotalDeaths",
            "type": "linear",
            "domain": {
                "data": "covid-states",
                "field": "total_deaths"
            },
            "range": circleRange
        },
        {
            "name": "TotalConfirmed",
            "type": "linear",
            "domain": {
                "data": "covid-states",
                "field": "total_cases"
            },
            "range": circleRange
        }
    ]
    usaspec.projections = [{
        "name": "projection",
        "type": "identity",
        "rotate": [{
            "signal": "rotateX"
        }, 0, 0],
        "center": [0, {
            "signal": "centerY"
        }],
        "translate": [{
            "signal": "tx"
        }, {
            "signal": "ty"
        }]
    }];
    usaspec.signals.unshift({
        "name": "tx",
        "update": "0"
    });
    usaspec.signals.unshift({
        "name": "ty",
        "update": "0"
    });
    usaspec.signals.push({
        "name": "Variable",
        "value": "TotalDeaths",
        "bind": {
            "input": "select",
            "options": [
                "TotalDeaths",
                "TotalConfirmed"
            ],
            "element": "#view2Control"
        },
    });
    usaspec.marks[0].encode.enter.tooltip = {
        "signal": "{ 'State': datum.properties.name, 'Deaths': format(datum.TotalDeaths, ',d'), 'Cases': format(datum.TotalConfirmed, ',d')}"
    }
    usaspec.marks[1].encode.enter.tooltip = {
        "signal": "{ 'State': datum.properties.name, 'Deaths': format(datum.TotalDeaths, ',d'), 'Cases': format(datum.TotalConfirmed, ',d')}"
    }
    renderUSA(usaspec);
}

var view1Selector = d3.select("#view");
var view2Selector = d3.select("#view2");

var view1Control = d3.select("#viewControl");
var view2Control = d3.select("#view2Control");

var viewUSBtn = d3.select("#viewUS");
var viewWorldBtn = d3.select("#viewWorld");

view1Selector.style("width", `${size[0]}px`);
view2Selector.style("width", `${size[0]}px`);

var current = "";

function viewUSA() {
    if (current !== "USA") {
        view1Selector.attr("hidden", true);
        view2Selector.attr("hidden", null);
        view1Control.attr("hidden", true);
        view2Control.attr("hidden", null);
        viewUSBtn.classed("active", true);
        viewWorldBtn.classed("active", false);
        current = "USA";
    }
}

function viewWorld() {
    if (current !== "World") {
        view2Selector.attr("hidden", true);
        view1Selector.attr("hidden", null);
        view2Control.attr("hidden", true);
        view1Control.attr("hidden", null);
        viewUSBtn.classed("active", false);
        viewWorldBtn.classed("active", true);
        current = "World"
    }
}

Promise.all([
        d3.json("https://api.covid19api.com/summary"),
        d3.json("https://data.covidapi.com/states")
    ])
    .then((data) => {
        // extract country data to render world map
        // we can do this directly in vega but since we also want the global data it saves an API call
        var worlddata = data[0];
        var globaldata = worlddata.Global;
        var countriesdata = worlddata.Countries;
        setupWorldMap(countriesdata);

        var statesdata = data[1].body;
        var usdata = statesdata.filter(s => s.country_name === "US");
        setupUSMap(usdata);

        //global data
        var global = d3.select("#global");
        global.append("tr").append("th").attr("colspan", 2).append("h3").html("GLOBAL DATA");
        var fields = ["Total Confirmed", "Total Deaths", "Total Recovered"];
        var colors = ["yellow", "red", "green"];
        fields.forEach((d, i) => {
            var row = global.append("tr");
            row.append("th").append("div").attr("class", colors[i]).html(d);
            row.append("th").append("div").html(`${fmt(globaldata[d.replace(' ', '')])}`);
        })

        //recovered data
        var recovered = d3.select("#recovered");
        recovered.append("tr").append("th").attr("colspan", 2).append("h3")
            .attr("class", "green").html("RECOVERED");
        countriesdata.sort((a, b) => b.TotalRecovered - a.TotalRecovered);
        countriesdata.forEach(d => {
            var row = recovered.append("tr");
            row.append("th").append("div").html(d.Country);
            row.append("th").append("div").html(`${fmt(d.TotalRecovered)}`);
        });

        //cases data
        var cases = d3.select("#cases");
        cases.append("tr").append("th").attr("colspan", 2).append("h3")
            .attr("class", "yellow").html("CONFIRMED CASES");
        countriesdata.sort((a, b) => b.TotalConfirmed - a.TotalConfirmed);
        countriesdata.forEach(d => {
            var row = cases.append("tr");
            row.append("th").append("div").html(d.Country);
            row.append("th").append("div").html(`${fmt(d.TotalConfirmed)}`);
        });

        //deaths data
        var deaths = d3.select("#deaths");
        deaths.append("tr").append("th").attr("colspan", 2).append("h3")
            .attr("class", "red").html("DEATHS");
        countriesdata.sort((a, b) => b.TotalDeaths - a.TotalDeaths);
        countriesdata.forEach(d => {
            var row = deaths.append("tr");
            row.append("th").append("div").html(d.Country);
            row.append("th").append("div").html(`${fmt(d.TotalDeaths)}`);
        });

        // USA map is initially hidden
        viewWorld();
        viewUSBtn.on("click", () => viewUSA());
        viewWorldBtn.on("click", () => viewWorld());
    });