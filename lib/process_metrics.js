var process_metrics = function (metrics, flushInterval, ts, flushCallback) {
    var starttime = Date.now();
    var key;
    var counter_rates = {};
    var timer_data = {};
    var statsd_metrics = {};
    var counters = metrics.counters;
    var timers = metrics.timers;
    var pctThreshold = metrics.pctThreshold;

    for (key in counters) {
      var value = counters[key];

      // calculate "per second" rate
      var valuePerSecond = value / (flushInterval / 1000);
      counter_rates[key] = valuePerSecond;
    }

    for (key in timers) {
      if (timers[key].length > 0) {
        timer_data[key] = {};
        var current_timer_data = {};

        var values = timers[key].sort(function (a,b) { return a-b; });
        var count = values.length;
        var min = values[0];
        var max = values[count - 1];

        var cumulativeValues = [min];
        for (var i = 1; i < count; i++) {
            cumulativeValues.push(values[i] + cumulativeValues[i-1]);
        }

        var sum = min;
        var mean = min;
        var maxAtThreshold = max;

        var message = "";

        var key2;

        for (key2 in pctThreshold) {
          var pct = pctThreshold[key2];
          if (count > 1) {
            var numInThreshold = Math.round(pct / 100 * count);

            maxAtThreshold = values[numInThreshold - 1];
            sum = cumulativeValues[numInThreshold - 1];
            mean = sum / numInThreshold;
          }

          var clean_pct = '' + pct;
          clean_pct.replace('.', '_');

          // Changes: Get rid of sum and change names
          current_timer_data["avg_" + clean_pct] = mean;
          current_timer_data["max_" + clean_pct] = maxAtThreshold;

          // Original
          // current_timer_data["mean_" + clean_pct] = mean;
          // current_timer_data["upper_" + clean_pct] = maxAtThreshold;
          // current_timer_data["sum_" + clean_pct] = sum;

        }

        sum = cumulativeValues[count-1];
        mean = sum / count;

        var sumOfDiffs = 0;
        for (var i = 0; i < count; i++) {
           sumOfDiffs += (values[i] - mean) * (values[i] - mean);
        }
        var stddev = Math.sqrt(sumOfDiffs / count);

        // Changes:
        // 1. Standardize on 3-letter abbreviations
        // 2. Get rid of cnt and sum - no immediate value
        current_timer_data["std"] = stddev;
        current_timer_data["max"] = max;
        current_timer_data["min"] = min;
        current_timer_data["avg"] = mean;

        // Original
        // current_timer_data["std"] = stddev;
        // current_timer_data["upper"] = max;
        // current_timer_data["lower"] = min;
        // current_timer_data["count"] = count;
        // current_timer_data["sum"] = sum;
        // current_timer_data["mean"] = mean;

        timer_data[key] = current_timer_data;

      }
    }

    statsd_metrics["processing_time"] = (Date.now() - starttime);
    //add processed metrics to the metrics_hash
    metrics.counter_rates = counter_rates;
    metrics.timer_data = timer_data;
    metrics.statsd_metrics = statsd_metrics;

    flushCallback(metrics);
  }

exports.process_metrics = process_metrics
