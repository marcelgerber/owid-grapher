owid.dataflow = function() {
	var model = ReactiveModel.apply(this, arguments);

	model.inputs = function(inputs) {
		_.each(inputs, function(v,k) {
			model(k);
			if (v !== undefined)
				model[k](v);
		});
	};

	model.flow = function(flowspec, callback) {
		var args = flowspec.split(/\s*=>\s*/);
		if (args.length > 1) {
			if (_.isEmpty(args[0]))
				model(args[1], callback);
			else
				model(args[1], callback, args[0]);
		} else {
			model(callback, args[0]);
		}
	};

	model.update = function(changes) {
		_.each(changes, function(v,k) {
			//console.log(k, v, model[k](), !_.isEqual(model[k](), v) ? 'change' : null);
			if (model[k] === undefined)
				throw("No such input: " + k);
			if (!_.isEqual(model[k](), v))
				model[k](v);
		});
		model.digest();
	};

	return model;
}

;(function(d3) {
	"use strict";
	owid.namespace("owid.view.scatter");

	owid.view.scatter = function() {
		var scatter = owid.dataflow();

		scatter.inputs({
			svg: undefined,
			data: [],
			bounds: { left: 0, top: 0, width: 100, height: 100 },
			axisConfig: undefined
		});

		var axisBoxInit = owid.view.axisBox();
		scatter.flow("svg, data, bounds, axisConfig => axisBox", function(svg, data, bounds, axisConfig) {
			var xScale = d3.scaleLinear();

  		    xScale.domain([
		        d3.min(data, function(series) { return d3.min(series.values, function(d) { return d.x; }); }),
		        d3.max(data, function(series) { return d3.max(series.values, function(d) { return d.x; }); })
		    ]);			

			var yScale = d3.scaleLinear();

  		    yScale.domain([
		        d3.min(data, function(series) { return d3.min(series.values, function(d) { return d.y; }); }),
		        d3.max(data, function(series) { return d3.max(series.values, function(d) { return d.y; }); })
		    ]);			

			axisBoxInit.update({
				svg: d3.select(svg.node()),
				bounds: bounds,
				xScale: xScale,
				yScale: yScale,
				axisConfig: axisConfig
			});

			return axisBoxInit;
		});

		scatter.flow("axisBox => innerBounds", function(axisBox) { return axisBox.innerBounds(); });
		scatter.flow("axisBox, innerBounds => xScale", function(axisBox, innerBounds) {
			return axisBox.xScale();
		});
		scatter.flow("axisBox, innerBounds => yScale", function(axisBox, innerBounds) {
			return axisBox.yScale();
		});
		scatter.flow("axisBox => g", function(axisBox) {
			return axisBox.g();
		});

		var _sizeScale = d3.scaleLinear();
		scatter.flow("data => sizeScale", function(data) {
			_sizeScale.range([3, 6])
				.domain([
		        	d3.min(data, function(series) { return d3.min(series.values, function(d) { return d.size||1; }); }),
		       	    d3.max(data, function(series) { return d3.max(series.values, function(d) { return d.size||1; }); })
		        ]);

		    return _sizeScale;
		});

		scatter.flow("xScale, yScale => line", function(xScale, yScale) {
		    return d3.line()
			    .curve(d3.curveLinear)
			    .x(function(d) { return xScale(d.x); })
			    .y(function(d) { return yScale(d.y); });
		});

		scatter.flow("g, data, xScale, yScale, sizeScale", function(g, data, xScale, yScale, sizeScale) {			
			var update = g.selectAll(".entity").data(data, function(d) { return d.key; }),
				exit = update.exit().remove(),
				enter = update.enter().append("g").attr("class", "entity"),
				entities = enter.merge(update);

		    var dotUpdate = entities.selectAll(".dot").data(function(d) { return [d]; });

		    dotUpdate.enter().append("circle")
				.attr("class", "dot")
			  .merge(dotUpdate)
			  	.transition()
			      .attr("r", function(d) { return sizeScale(d.values[0].size||1); })
			      .attr("cx", function(d) { return xScale(d.values[0].x); })
			      .attr("cy", function(d) { return yScale(d.values[0].y); })
			      .style("fill", function(d) { return d.color; });

			update.exit().remove();

		});

		scatter.flow("svg, xScale, yScale, data", function mousebind(svg, xScale, yScale, data) {
			svg = d3.select(svg.node());
			svg.on("mousemove.scatter", function() {
				var mouse = d3.mouse(svg.node()),
					mouseX = mouse[0], mouseY = mouse[1];
					
				var d = _.sortBy(data, function(d) {
					var value = d.values[0],
						dx = xScale(value.x) - mouseX,
						dy = yScale(value.y) - mouseY,
						dist = dx*dx + dy*dy;
					return dist;
				})[0];
			});
		});

		window.scatter = scatter;

		return scatter;
	};

	owid.view.scatterold = function() {
		var scatter = {};

		var state = {
			data: [],
			bounds: { left: 0, top: 0, right: 100, bottom: 100 },
			focus: null
		};

		scatter.state = state;
		var changes = owid.changes();
		changes.track(state);

		var margin, width, height, svg, x, y, sizeScale, fontScale, xAxis, yAxis, entities;

		function initialize() {
			if (svg) svg.remove();

			margin = {top: state.bounds.top + 50, right: 50, bottom: 100, left: state.bounds.left + 50};
		    width = state.bounds.width - margin.right - 50;
		    height = state.bounds.height - margin.bottom - 50;


/*			xAxis = d3.svg.axis()
			    .scale(x)
			    .orient("bottom");

			yAxis = d3.svg.axis()
			    .scale(y)
			    .orient("left");*/

			svg = d3.select("svg")
			  .append("g")
			    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			/*svg.append("g")
			  .attr("class", "x axis")
			  .attr("transform", "translate(0," + height + ")")
			  .call(xAxis)
			.append("text")
			  .attr("class", "label")
			  .attr("x", width)
			  .attr("y", -6)
			  .style("text-anchor", "end");
			  //.text("Sepal Width (cm)");

			svg.append("g")
			  .attr("class", "y axis")
			  .call(yAxis)
			.append("text")
			  .attr("class", "label")
			  .attr("transform", "rotate(-90)")
			  .attr("y", 6)
			  .attr("dy", ".71em")
			  .style("text-anchor", "end");*/
			  //.text("Sepal Length (cm)");

		}

		function renderData() {
			if (!changes.any('data')) return;

			x = d3.scaleLinear().range([0, width]);
			y = d3.scaleLinear().range([height, 0]);
			sizeScale = d3.scaleLinear().range([1, 3]);
			fontScale = d3.scaleLinear().range([8, 14]);

  		    x.domain([
		        d3.min(state.data, function(series) { return d3.min(series.values, function(d) { return d.x; }); }),
		        d3.max(state.data, function(series) { return d3.max(series.values, function(d) { return d.x; }); })
		    ]);

  		    y.domain([
		        d3.min(state.data, function(series) { return d3.min(series.values, function(d) { return d.y; }); }),
		        d3.max(state.data, function(series) { return d3.max(series.values, function(d) { return d.y; }); })
		    ]);

		    sizeScale.domain([
		        d3.min(state.data, function(series) { return d3.min(series.values, function(d) { return d.size; }); }),
		        d3.max(state.data, function(series) { return d3.max(series.values, function(d) { return d.size; }); })
		    ]);

		    fontScale.domain([
		        d3.min(state.data, function(series) { return d3.min(series.values, function(d) { return d.size; }); }),
		        d3.max(state.data, function(series) { return d3.max(series.values, function(d) { return d.size; }); })
		    ]);			

		    var line = d3.line()
			    .curve(d3.curveLinear)
			    .x(function(d) { return x(d.x); })
			    .y(function(d) { return y(d.y); });

			var update = svg.selectAll(".entity").data(state.data, function(d) { return d.key; }),
				exit = update.exit().remove(),
				enter = update.enter().append("g").attr("class", "entity");
			entities = enter.merge(update);

			var markers = enter.append("svg:marker")
		        .attr("stroke", "rgba(0,0,0,0)")
		        .attr("viewBox", "0 -5 10 10")
		        .attr("refX", 5)
		        .attr("refY", 0)
		        .attr("markerWidth", 4)
		        .attr("markerHeight", 4)
		        .attr("orient", "auto");

		    markers.append("svg:path")
		        .attr("d", "M0,-5L10,0L0,5");

		   	markers.merge(update)
		   	  	.attr("id", function(d) { return d.id; })
		        .attr("fill", function(d) { return d.color; });

		    var lineUpdate = entities.selectAll(".line").data(function(d) { return [d]; });

		    lineUpdate.enter().append("path")
				.attr("class", "line")
				.style("fill-opacity", 0)
			  .merge(lineUpdate)
			  	.transition()
				.attr("d", function(d) { return line([d.values[0], _.last(d.values)]); })				
			    .attr("marker-end", function(d) { return "url(#" + d.id + ")"; })			    
				.style("stroke", function(d) { return d.color; })
				.style("stroke-width", function(d) { return sizeScale(_.last(d.values).size); });

			update.exit().remove();
		}

		function renderLabels() {
			if (!changes.any('data')) return;

			var labelUpdate = entities.selectAll(".label").data(function(d) { 
				var firstValue = _.first(d.values),
					lastValue = _.last(d.values),
					xPos = x((lastValue.x+firstValue.x)/2),
					yPos = y((lastValue.y+firstValue.y)/2),
					angle = Math.atan2(y(lastValue.y) - y(firstValue.y), x(lastValue.x) - x(firstValue.x)) * 180 / Math.PI;

				// Ensure label stays the right way up when going negative
				if (lastValue.x < firstValue.x)
					angle += 180;

				return [{
					x: xPos,
					y: yPos,
					angle: angle,
					name: d.entityName,
					key: d.key,
					fontSize: fontScale(lastValue.size)
				}];
			});

			var labels = labelUpdate.enter()
	            .append("text")
	            .attr("class", "label")
	            .attr('text-anchor', 'middle')
	          .merge(labelUpdate)
	            .text(function(d) { return d.name; })
	            .style("font-size", function(d) { return d.fontSize; })   
	            .style("fill", function(d) { return d.color; })
	            .attr("x", function(d) { return (d.x); })
	            .attr("y", function(d) { return (d.y); })	            
	            .attr("transform", function(d) { return "rotate(" + d.angle + "," + d.x + "," + d.y + ") translate(0, -2)"; });

	        // Size of each label
	        var label_array = [];
	        labels.each(function(d) {
	            d.width = chart.getBounds(this).width;
	            d.height = chart.getBounds(this).height;
	        	label_array.push(d);
	        });

	        function collide(l1, l2) {
	        	var r1 = { left: l1.x, top: l1.y, right: l1.x+l1.width, bottom: l1.y+l1.height };
	        	var r2 = { left: l2.x, top: l2.y, right: l2.x+l2.width, bottom: l2.y+l2.height };
  			    
  			    return !(r2.left > r1.right || 
			             r2.right < r1.left || 
			             r2.top > r1.bottom ||
			             r2.bottom < r1.top);
	        }

	        while (true) {
	        	var overlaps = false;
		        for (var i = 0; i < label_array.length; i++) {
		        	var l1 = label_array[i];
		        	if (l1.hidden) continue;

		        	for (var j = 0; j < label_array.length; j++) {
		        		var l2 = label_array[j];
		        		if (l1 == l2 || l2.hidden) continue;

		        		if (collide(l1, l2)) {
		        			if (l1.fontSize > l2.fontSize)
		        				l2.hidden = true;
		        			else
		        				l1.hidden = true;
		        			overlaps = true;
		        		}
		        	}
		        }	        	

		        if (!overlaps) break;
	        }
			
	        labels
		        .transition()
		        .duration(0)
		        .attr("x", function(d) { return (d.x); })
		        .attr("y", function(d) { return (d.y); })
		        .style("opacity", function(d) { return d.hidden ? 0 : 1; })
		        .style('cursor', 'pointer');
		}


		function renderFocus() {
			if (!changes.any('focus')) return;

			d3.select('svg').on("mousemove.scatter", function() {
				var mouse = d3.mouse(svg.node()),
					mouseX = mouse[0], mouseY = mouse[1];
					
				var d = _.sortBy(state.data, function(d) {
					var value = d.values[0],
						dx = x(value.x) - mouseX,
						dy = y(value.y) - mouseY,
						dist = dx*dx + dy*dy;
					return dist;
				})[0];

				state.focus = d.key;
				scatter.render();
			});

			entities.style('opacity', function(d) {
				return (state.focus === null || d.key == state.focus) ? 1 : 0.2;
			});

			entities.selectAll('.label').style('opacity', function(d) {
				if (state.focus !== null && d.key == state.focus)
					return 1;
				else
					return (d.hidden ? 0 : 1);
			});
		}


		scatter.render = function() {
			if (!changes.start()) return;

			if (changes.any('bounds')) initialize();

			renderData();
			renderLabels();
			renderFocus();

			var axis = owid.view.xAxis();
			axis.offsetTop(state.bounds.height - 100)
				.offsetLeft(state.bounds.left)
				.width(state.bounds.width - state.bounds.left - 100)
				.height(50)
				.scale(x)
				.svg(svg);

			changes.done();

			chart.dispatch.renderEnd();
		};

		return scatter;
	};

})(d3v4);