(function () {
  var data = [];
  var i = 0;

  while (i < 200) {
    var dateObj = new Date();
    dateObj.setHours(Math.random() * 24);
    dateObj.setMinutes(Math.random() * 59);

    if (!_.contains([2, 3, 4, 5, 6, 7, 10], dateObj.getHours())) {
      data.push({
        x: dateObj,
        y: Math.round(Math.random() * 255 + 43)
      });         
    } 
    i++;
  }

  var n = 400;
  var now = new Date();
  var transformDate = function (d) {
    for (var i = 0; i < d.length; i++ ) {
      var date = new Date(d[i]['x']);
      date.setFullYear(now.getFullYear());
      date.setMonth(now.getMonth());
      date.setDate(now.getDate());
    }
    return d;
  };

  data = transformDate(data);
  
  var glucose = d3.select('.glucose');
  var svg = glucose.append('svg')
    .attr('width', 800)
    .attr('height', 400);
  var margin = {top: 20, right: 60, bottom: 20, left: 60};
  var width = +svg.attr('width') - margin.left - margin.right;
  var height = +svg.attr('height') - margin.top - margin.bottom;
  var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  var x = d3.scaleTime()
    .domain([new Date, new Date])
    .nice(d3.timeDay)
    .range([0, width]);
  var y = d3.scaleLinear()
    .domain([0, n])
    .range([height, 0]);
  var y2 = d3.scaleLinear()
    .domain([0, 22.2])
    .range([height, 0]);
  var axisLeft = d3.axisLeft(y)
    .tickSize(-width);
  var axisBottom = d3.axisBottom(x)
    .tickFormat(d3.timeFormat("%I %p"))
    .ticks(d3.timeHour.every(2));
  var axisRight = d3.axisRight(y2)
    .tickSize(0)
    .tickFormat(d3.format(".1f"))
    .tickValues([0.0, 2.8, 5.6, 8.3, 11.1, 13.9, 16.7, 19.4, 22.2]);

  // defs
  g.append('defs').append('clipPath')
      .attr('id', 'clip')
    .append('rect')
      .attr('width', width)
      .attr('height', height);
  g.select('defs').append('pattern')
      .attr('id', 'pattern-stripe')
      .attr('width', 14)
      .attr('height', 4)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('patternTransform', 'rotate(45)')
    .append('rect')
      .attr('width', 9)
      .attr('height', 4)
      .attr('transform', 'translate(0,0)')
      .attr('fill', 'white');
  g.select('defs').append('mask')
      .attr('id', 'mask-stripe')
    .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'url(#pattern-stripe)');
  
  // axis
  g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', 'translate(0,' + y(0) + ')')
      .call(axisBottom);
  g.append('g')
      .attr('class', 'axis axis--y')
      .call(axisLeft)
    .append('text');
  g.append('g')
      .attr('class', 'axis axis--dy')
      .attr('transform', 'translate(' + width + ', 0)')
      .call(axisRight);
  
  // baseline
  g.append('g')
      .attr('class', 'baseline')
    .append('rect')
      .attr('width', width - 1)
      .attr('height', 100)
      .attr('fill', '#ddd')
      .attr('x', 1)
      .attr('y', 195);
  
  // data
  g.append('g')
      .attr('clip-path', 'url(#clip)')
      .selectAll('.dot')
      .data(data)
    .enter().append('rect')
      .attr('class', 'dot')
      .attr('width', 8)
      .attr('height', 8)
      .attr('transform', function (d) {
        return 'rotate(-45 ' + x(d.x) + ' ' + y(d.y) + ')';
      })
      .attr('x', function (d) {
        return x(d.x);
      })
      .attr('y', function (d) {
        return y(d.y);
      });

  // label
  g.append('text')
    .attr("transform", "rotate(-90)")
    .attr('x', -15)
    .attr('y', -30)
    .attr('font-size', '12px')
    .style('text-anchor', 'middle')
    .text('mg/dl');
  g.append('text')
    .attr("transform", "rotate(90)")
    .attr('x', 20)
    .attr('y', 30 - width - margin.right)
    .attr('font-size', '12px')
    .style('text-anchor', 'middle')
    .text('mmol/L');

  var sort = function (a, b) {
    return a - b;
  };
  
  // quantile
  var quantileData = function (models) {
    var data = [];
    _.each(models, function (model) {
      var h = model.x.getHours(),
          v = model.y;

      if (_.isUndefined(data[h])) {
        data[h] = []; 
      }
      data[h].push(v);
    });

    _.each(data, function (d) {
      if (!_.isUndefined(d)) {
        d.sort(sort);
      }
    });

    var res = [];
    
    _.each([0.1, 0.25, 0.5, 0.75, 0.9], function (quantile) {
      var values = [];
      
      _.each(data, function (d, k) {
        var date = new Date();

        date.setHours(k);
        date.setMinutes(30);
        
        // 갯수 제한 혹은 비어있는 시간대
        if (_.isUndefined(d) || d.length < 2) {
          return true;
        }

        values[k] = {
          date: date,
          glucose: d3.quantile(d, quantile)
        }
      });

      res.push({
        id: quantile,
        values: values
      });
    });

    return res;
  };
  
  var data2 = quantileData(data);
  var line = d3.line()
    // .curve(d3.curveBasis)
    .x(function (d) { return x(d.date); })
    .y(function (d) { return y(d.glucose); })
    .defined(function (d) {
      return d;
    });
  
  var z = d3.scaleOrdinal()
    .domain([0.1, 0.25, 0.5, 0.75, 0.9])
    .range(['rgb(143, 188, 143)', 'rgb(135,206,250)', 'rgb(255, 127, 14)', 'rgb(135,206,250)', 'rgb(143, 188, 143)']);

  var dashed = d3.scaleOrdinal()
    .domain([0.1, 0.25, 0.5, 0.75, 0.9])
    .range(['10, 5', '0, 0', '0, 0', '0, 0', '10, 5']);
  var fontSize = d3.scaleOrdinal()
    .domain([0.1, 0.25, 0.5, 0.75, 0.9])
    .range(['2px', '2px', '3px', '2px', '2px']);

  var quantile = g.selectAll('quantile')
    .data(data2)
    .enter().append('g')
    .attr('class', 'quantile');

  quantile.append('path')
    .attr('class', 'line')
    .attr('d', function (d) { return line(d.values); })
    .style('stroke', function(d) { return z(d.id); })
    .style('stroke-dasharray', function (d) { return dashed(d.id); })
    .style('stroke-width', function (d) { return fontSize(d.id); })
    .style('fill', 'none');
})();