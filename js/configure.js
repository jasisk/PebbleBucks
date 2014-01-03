(function(window) {
  BWIPJS.debug = BWIPJS.load = BWIPJS.print = function() {};
  
  function $(selector, el) {
    el = el || document;
    return el.querySelector(selector);
  }

  function Bitmap() {
    var draw = true;
    var pts  = [];
    var minx = Infinity;
    var miny = Infinity;
    var maxx = 0;
    var maxy = 0;

    this.width = function() {
      return maxx - minx + 1;
    };

    this.height = function() {
      return maxy - miny + 1;
    };

    function adjustPoint(pt) {
      return {
        x: pt.x - minx,
        y: maxy - pt.y
      };
    }

    function forEach(callback) {
      pts.map(adjustPoint).forEach(callback);
    }

    this.color = function(r, g, b) {
      draw = !!(r + g + b < 3 * 255 / 2);
    }

    this.pebble_data = function() {
      var w = this.width();
      var h = this.height();

      var bytesCount = Math.ceil(w * h / 8);

      var data = [];
      while (data.length < bytesCount) data.push(0);

      forEach(function(pt) {
        var x = pt.x;
        var y = pt.y;

        var pixelIndex = y * w + x;
        var byteIndex = Math.floor(pixelIndex / 8);
        var bitIndex = pixelIndex % 8;
        var bit = 1 << bitIndex;
        data[byteIndex] |= bit;
      });

      return [ w, h ].concat(data);
    }

    this.set = function(x,y) {
      if (!draw) return;

      x = Math.floor(x);
      y = Math.floor(y);
      pts.push({ x: x, y: y });
      if (minx > x) minx = x;
      if (miny > y) miny = y;
      if (maxx < x) maxx = x;
      if (maxy < y) maxy = y;
    }

    this.show = function(cvs) {
      var xScale = Bitmap.scaleX;
      var yScale = Bitmap.scaleY;

      var w = xScale * this.width();
      var h = yScale * this.height();
      cvs.width  = w;
      cvs.height = h;

      var ctx = cvs.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#000';
      forEach(function(pt) {
        ctx.fillRect(xScale * pt.x, yScale * pt.y, xScale, yScale);
      });
    }
  };

  Bitmap.scaleX = 2;
  Bitmap.scaleY = 6;

  var validCardNumberLength = 16;

  // http://stackoverflow.com/a/901144/205895
  function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  window.addEventListener('load', function() {
    var payload = {};

    var validNumberRegEx = /[0-9]{16}/;
    var $generateBarcode = $('#generate-barcode');
    var $cardNumber = $('#card-number');

    var cardNumberInputCallback = function() {
      var left = validCardNumberLength - $cardNumber.value.length;

      var hint = '';
      if (left == 0) {
        $generateBarcode.removeAttribute('disabled');
      } else {
        $generateBarcode.disabled = 'disabled';
        hint = 'There should be ' + left + ' more digit' + (left == 1 ? '' : 's') + '.';
      }

      $('#card-number-hint').innerHTML = hint;
    };
    $cardNumber.addEventListener('input', cardNumberInputCallback);

    var cardNumber = getParameterByName('card_number');
    if (cardNumber.length == validCardNumberLength) {
      $cardNumber.value = payload.card_number = cardNumber;
      cardNumberInputCallback();
    }

    $('#barcode-form').addEventListener('submit', function(event) {
      event.preventDefault();
      if ($generateBarcode.disabled) return;

      var text = $cardNumber.value;
      var bw = new BWIPJS;
      var bitmap = new Bitmap;
      bw.bitmap(bitmap);
      bw.push(text);
      bw.push({
        rowmult: 1,
        cols: 3,
        rows: 8,
        compact: true
      });
      bw.call('pdf417');
      bitmap.show($('#barcode'));

      payload.barcode_data = bitmap.pebble_data();
      payload.card_number = text;
      
      $('#barcode-container').style.display = 'inherit';
    });

    var $username = $('#username');
    $username.addEventListener('input', function() {
      payload.username = $username.value;
    });

    var username = getParameterByName('username');
    if (username) {
      $username.value = payload.username = username;
    }

    var $password = $('#password');
    $password.addEventListener('input', function(event) {
      payload.password = $password.value;
    });

    $('#save-and-close').addEventListener('click', function(event) {
      event.preventDefault();
      window.location = 'pebblejs://close#' + encodeURIComponent(JSON.stringify(payload));
    });
  });
})(window);