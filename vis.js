function render(spec) {
    view = new vega.View(vega.parse(spec), {
        renderer: 'svg', // renderer (canvas or svg)
        container: '#view', // parent DOM container
        hover: true // enable hover processing
    });
    return view.runAsync();
}

var view;
var spec = {
    "$schema": "https://vega.github.io/schema/vega/v5.json",
    "width": 900,
    "height": 560,
    "padding": {
        "top": 0,
        "left": 0,
        "right": 0,
        "bottom": 0
    },
    "data": [],
    "scales": [{
        "name": "deathscale",
        "type": "quantize",
        "domain": {
            "data": "covid-country",
            "field": "TotalDeaths"
        },
        "range": {
            "scheme": "blues",
            "count": 6
        }
    }],
    "projections": [{
        "name": "projection",
        "type": "mercator",
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
    }],
    "legends": [{
        "fill": "deathscale",
        "orient": "bottom-right",
        "title": "Total Deaths",
        "fillColor": "white",
        "direction": "horizontal",
        "padding": 10,
        "titleFontSize": 15
    }],
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
                    "scale": "deathscale",
                    "field": "TotalDeaths"
                }
            },
            "hover": {
                "fill": {
                    "value": "red"
                },
            },
        }
    }],
    "autosize": "none",
    "signals": [{
            "name": "tx",
            "update": "width / 2"
        },
        {
            "name": "ty",
            "update": "height / 2"
        },
        {
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
    ]
};

Promise.all([d3.json("https://api.covid19api.com/summary"),
        // add promises to load additional data sources here
    ])
    .then((data) => {
        // extract country data to render world map
        // we can do this directly in vega but since we also want the global data it saves an API call
        var apidata = data[0];
        var globaldata = apidata.Global;
        var countriesdata = apidata.Countries;
        spec.data.push({
            "name": "covid-country",
            "values": countriesdata
        });
        // extract 2-digit code and use as id, use id to extract relevant fields from country covid data
        spec.data.push({
            "name": "map",
            "url": "./world-countries.json",
            "format": {
                "type": "topojson",
                "feature": "countries1"
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
                }
            ]
        });

        //global data
        var global = d3.select("#global");
        var fmt = d3.format(",d");
        global.append("tr").append("th").attr("colspan", 2).append("h3").html("GLOBAL DATA");
        var fields = ["Total Confirmed", "Total Deaths", "Total Recovered"];
        fields.forEach(d => {
            var row = global.append("tr");
            row.append("th").append("div").html(d);
            row.append("th").append("div").html(`${fmt(globaldata[d.replace(' ', '')])}`);
        })

        //recovered data
        var recovered = d3.select("#recovered");
        recovered.append("tr").append("th").attr("colspan", 2).append("h3").html("RECOVERED");
        countriesdata.sort((a, b) => b.TotalRecovered - a.TotalRecovered);
        countriesdata.forEach(d => {
            var row = recovered.append("tr");
            row.append("th").append("div").html(d.Country);
            row.append("th").append("div").html(`${fmt(d.TotalRecovered)}`);
        });

        //cases data
        var cases = d3.select("#cases");
        cases.append("tr").append("th").attr("colspan", 2).append("h3").html("CONFIRMED CASES");
        countriesdata.sort((a, b) => b.TotalConfirmed - a.TotalConfirmed);
        countriesdata.forEach(d => {
            var row = cases.append("tr");
            row.append("th").append("div").html(d.Country);
            row.append("th").append("div").html(`${fmt(d.TotalConfirmed)}`);
        });

        //deaths data
        var deaths = d3.select("#deaths");
        deaths.append("tr").append("th").attr("colspan", 2).append("h3").html("DEATHS");
        countriesdata.sort((a, b) => b.TotalDeaths - a.TotalDeaths);
        countriesdata.forEach(d => {
            var row = deaths.append("tr");
            row.append("th").append("div").html(d.Country);
            row.append("th").append("div").html(`${fmt(d.TotalDeaths)}`);
        });

        render(spec);
    });