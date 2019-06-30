function main() {
    // Set values of true positives vs. false positives.
    var tprValue = 300;
    var fprValue = -700;
  
    var distributionExample0 = new GroupModel(makeNormalItems(0, 1, 150, 70, 7)
        .concat(makeNormalItems(0, 0, 150, 30, 7)), tprValue, fprValue);
    createHistogram('plain-histogram0', distributionExample0, true);

}
  var Item = function(category, value, score) {
    this.category = category;
    this.value = value;
    this.predicted = value;
    this.score = score;
  };
  var GroupModel = function(items, tprValue, fprValue) {
    // Data defining the model.
    this.items = items;
    this.tprValue = tprValue;
    this.fprValue = fprValue;
    // Observers of the model; needed for interactive diagrams.
    this.listeners = [];
  };

  function makeNormalItems(category, value, n, mean, std) {
    var items = [];
    var error = 0;
    for (var score = 0; score < 100; score++) {
      var e = error + n * Math.exp(-(score - mean) * (score - mean) / (2 * std * std)) /
              (std * Math.sqrt(2 * Math.PI));
      var m = Math.floor(e);
      error = e - m;
      for (var j = 0; j < m; j++) {
        items.push(new Item(category, value, score));
      }
    }
    return items;
  }


  // Side of grid in histograms and correctness matrices.
  var SIDE = 7;
  
  // Component dimensions.
  var HEIGHT = 250;
  var HISTOGRAM_WIDTH = 370;
  var HISTOGRAM_LEGEND_HEIGHT = 60;
  
  // Histogram bucket width
  var HISTOGRAM_BUCKET_SIZE = 2;
  
  // Padding on left; needed within SVG so annotations show up.
  var LEFT_PAD = 10;
  
  // Palette constants and functions.
  
  // Colors of categories of items.
  var CATEGORY_COLORS = ['#039', '#c70'];
  
  // Colors for pie slices; set by hand because of various tradeoffs.
  // Order:  false negative, true negative, true positive, false positive.
  var PIE_COLORS = [['#686868', '#ccc','#039', '#92a5ce'],
                    ['#686868', '#ccc','#c70',  '#f0d6b3']];
  
  function itemColor(category, predicted) {
    return predicted == 0 ? '#555' : CATEGORY_COLORS[category];
  }
  
  function itemOpacity(value) {
    return .3 + .7 * value;
  }
  
  function iconColor(d) {
    return d.predicted == 0 && !d.colored ? '#555' : CATEGORY_COLORS[d.category];
  }
  
  function iconOpacity(d) {
    return itemOpacity(d.value);
  }
  
  // Icon for a person in histogram or correctness matrix.
  function defineIcon(selection) {
    selection
      .attr('class', 'icon')
      .attr('stroke', iconColor)
      .attr('fill', iconColor)
      .attr('fill-opacity', iconOpacity)
      .attr('stroke-opacity', function(d) {return .4 + .6 * d.value;})
      .attr('cx', function(d) {return d.x + d.side / 2;})
      .attr('cy', function(d) {return d.y + d.side / 2;})
      .attr('r', function(d) {return d.side * .4});
  }
  
  function createIcons(id, items, width, height, pad) {
    var svg = d3.select('#' + id).append('svg')
      .attr('width', width)
      .attr('height', height);
    if (pad) {
      svg = svg.append('g').attr('transform', 'translate(' + pad + ',0)');
    }
    var icon = svg.selectAll('.icon')
      .data(items)
    .enter().append('circle')
      .call(defineIcon);
    return svg;
  }
  
  function gridLayout(items, x, y) {
    items = items.reverse();
    var n = items.length;
    var cols = 15;
    var rows = Math.ceil(n / cols);
    items.forEach(function(item, i) {
      item.x = x + SIDE * (i % cols);
      item.y = y + SIDE * Math.floor(i / cols);
      item.side = SIDE;
    });
  }
  
  // Shallow copy of item array.
  function copyItems(items) {
    return items.map(function(item) {
      var copy = new Item(item.category, item.value, item.score);
      copy.predicted = item.predicted;
      return copy;
    });
  }
  
  // Create histogram for scores of items in a model.
  function createHistogram(id, model, noThreshold, includeAnnotation) {
    var width = HISTOGRAM_WIDTH;
    var height = HEIGHT;
    var bottom = height - 16;
  
    // Create an internal copy.
    var items = copyItems(model.items);
  
    // Icons
    var numBuckets = 100 / HISTOGRAM_BUCKET_SIZE;
    var pedestalWidth = numBuckets * SIDE;
    var hx = (width - pedestalWidth) / 2;
      var scale = d3.scaleLinear().range([hx, hx + pedestalWidth]).
        domain([0, 100]);
  
    function histogramLayout(items, x, y, side, low, high, bucketSize) {
      var buckets = [];
      var maxNum = Math.floor((high - low) / bucketSize);
      items.forEach(function(item) {
        var bn = Math.floor((item.score - low) / bucketSize);
        bn = Math.max(0, Math.min(maxNum, bn));
        buckets[bn] = 1 + (buckets[bn] || 0);
        item.x = x + side * bn;
        item.y = y - side * buckets[bn];
        item.side = side;
      });
    }
  
    histogramLayout(items, hx, bottom, SIDE, 0, 100, HISTOGRAM_BUCKET_SIZE);
    var svg = createIcons(id, items, width, height);
  
    var tx = width / 2;
    var topY = 60;
    var axis = d3.axisBottom(scale);
    svg.append('g').attr('class', 'histogram-axis')
      .attr('transform', 'translate(0,-8)')
      .call(axis);
    d3.select('.domain').attr('stroke-width', 1);
  
    if (noThreshold) {
      return;
    }
}
  