  function draw() {
      var getcolor = $('#color').val();
      console.log(getcolor);
      var csvFile = document.getElementById("ddlViewBy");
      var strUser = "DataCji.csv";
      strUser = csvFile.options[csvFile.selectedIndex].text;

      var margin = {
              top: 30,
              right: 10,
              bottom: 10,
              left: 10
          },
          width = 900 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

      var x = d3.scale.ordinal().rangePoints([0, width], 1),
          y = {},
          dragging = {};

      var line = d3.svg.line(),
          axis = d3.svg.axis().orient("left"),
          background,
          foreground;

      var div = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("opacity", 0);

      var selected = false;

      $('#canvas').find("svg").remove();
      var svg = d3.select("#canvas").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");



      d3.csv(strUser, function(error, inputdata) {

          // Extract the list of dimensions and create a scale for each.
          x.domain(dimensions = d3.keys(inputdata[0]).filter(function(d) {
              return d != "name" && (y[d] = d3.scale.linear()
                  .domain(d3.extent(inputdata, function(p) {
                      return +p[d];
                  }))
                  .range([height, 0]));
          }));


          // Add grey background lines for context.
          background = svg.append("g")
              .attr("class", "background")
              .selectAll("path")
              .data(inputdata)
              .enter().append("path")
              .attr("d", path);

          // Add blue foreground lines for focus.
          foreground = svg.append("g")
              .style("stroke", getcolor)
              .style("fill", "none")
              .selectAll("path")
              .data(inputdata)
              .enter().append("path")
              .attr("d", path)
              .on("click", function(p) {
                  //foreground
                  var dataLine = d3.select(this);
                  if (!selected) {
                      dataLine.transition()
                          .style("stroke-width", 5).ease("elastic")
                          .style("stroke", "red")
                      selected = true;
                  } else {
                      selected = false;
                      dataLine.transition()
                          .style("stroke-width", 1)
                          .style("stroke", getcolor)
                      selected = true;
                  }

                  return this;
              })
              .on("mouseover", function(d) {
                  div.transition()
                      .duration(200)
                      .style("opacity", .9);
                  div.html(d.name)
                      .style("left", (d3.event.pageX) + "px")
                      .style("top", (d3.event.pageY - 28) + "px");
              })
              .on("mouseout", function(d) {
                  div.transition()
                      .duration(500)
                      .style("opacity", 0);
              })

          // Add a group element for each dimension.
          var g = svg.selectAll(".dimension")
              .data(dimensions)
              .enter().append("g")
              .attr("class", "dimension")
              .attr("transform", function(d) {
                  return "translate(" + x(d) + ")";
              })
              .call(d3.behavior.drag()
                  .origin(function(d) {
                      return {
                          x: x(d)
                      };
                  })
                  .on("dragstart", function(d) {
                      dragging[d] = x(d);
                      background.attr("visibility", "hidden");

                  })
                  .on("drag", function(d) {
                      dragging[d] = Math.min(width, Math.max(0, d3.event.x));
                      foreground.attr("d", path);
                      dimensions.sort(function(a, b) {
                          return position(a) - position(b);
                      });
                      x.domain(dimensions);
                      g.attr("transform", function(d) {
                          return "translate(" + position(d) + ")";
                      })


                  })
                  .on("dragend", function(d) {
                      delete dragging[d];
                      transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
                      transition(foreground).attr("d", path);
                      background
                          .attr("d", path)
                          .transition()
                          .delay(500)
                          .duration(0)
                          .attr("visibility", null);
                  }))
              .on("dblclick", function(d) {
                  if (dimensions.includes(d)) {
                      var index = dimensions.indexOf(d);
                      if (index > -1) {
                          dimensions.splice(index, 1);
                      }
                      transition(foreground).attr("d", path);
                  } else {
                      dimensionStatic = d3.keys(inputdata[0]);
                      var index = dimensionStatic.indexOf(d) - 1;
                      dimensions.splice(index, 0, d);
                      transition(foreground).attr("d", path);
                  }

              })
              /*.on("click", function (d) {
                if (dimensions.includes(d) == false) {
                  dimensionStatic = d3.keys(inputdata[0]);
                  var index = dimensionStatic.indexOf(d) -1;
                  dimensions.splice(index,0,d);
                  //dimensions.push(d);
                  transition(foreground).attr("d", path);
                }
              })*/

          // Add an axis and title.
          g.append("g")
              .attr("class", "axis")
              .each(function(d) {
                  d3.select(this).call(axis.scale(y[d]));
              })
              .append("text")
              .style("text-anchor", "middle")
              .attr("y", -9)
              .text(function(d) {
                  return d;
              });

          // Add and store a brush for each axis.
          g.append("g")
              .attr("class", "brush")
              .each(function(d) {
                  d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brushstart", brushstart).on("brush", brush));
              })
              .selectAll("rect")
              .attr("x", -8)
              .attr("width", 16);
      });

      function position(d) {
          var v = dragging[d];
          return v == null ? x(d) : v;
      }

      function transition(g) {
          return g.transition().duration(500);
      }

      // Returns the path for a given data point.
      function path(d) {
          return line(dimensions.map(function(p) {
              return [position(p), y[p](d[p])];
          }));
      }

      function brushstart() {
          d3.event.sourceEvent.stopPropagation();
      }

      // Handles a brush event, toggling the display of foreground lines.
      function brush() {
          var actives = dimensions.filter(function(p) {
                  return !y[p].brush.empty();
              }),
              extents = actives.map(function(p) {
                  return y[p].brush.extent();
              });
          foreground
              .style("stroke", "red")
              .style("display", function(d) {
                  return actives.every(function(p, i) {
                      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
                  }) ? null : "none";
              })
      }
  }