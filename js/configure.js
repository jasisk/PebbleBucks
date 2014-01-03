BWIPJS.debug = BWIPJS.load = BWIPJS.print = $.noop;
$(function() {
	function Bitmap() {
		var clr  = 1;
		var pts  = [];
		var minx = Infinity;
		var miny = Infinity;
		var maxx = 0;
		var maxy = 0;

		function forEachPoint(callback) {
			for (var i = 0; i < pts.length; i++) {
				var pt = pts[i];
				var x = pt.x - minx;
				var y = maxy - pt.y; // PostScript builds bottom-up, we build top-down.
				var color = pt.color;
				callback(x, y, color);
			}
		}

		this.color = function(r, g, b) {
			clr = +(r + g + b < 3 * 255 / 2);
		}

		this.pebble_data = function() {
			var w = maxx - minx + 1;
			var h = maxy - miny + 1;

			var bytesCount = Math.ceil(w * h / 8);

			var data = [];
			for (var i = 0; i < bytesCount; i++) data.push(0);

			forEachPoint(function(x, y, color) {
				var pixelIndex = y * w + x;
				var byteIndex = Math.floor(pixelIndex / 8);
				var bitIndex = pixelIndex % 8;
				var bit = 1 << bitIndex;

				if (color) {
					data[byteIndex] |= bit;
				} else {
					data[byteIndex] &= ~bit;
				}
			});

			return [ w, h ].concat(data);
		}

		this.set = function(x,y) {
			x = Math.floor(x);
			y = Math.floor(y);
			pts.push({
				x: x,
				y: y,
				color: clr
			});
			if (minx > x) minx = x;
			if (miny > y) miny = y;
			if (maxx < x) maxx = x;
			if (maxy < y) maxy = y;
		}

		this.show = function(cvsid) {
			var cvs = document.getElementById(cvsid);

			var w = 2 * (maxx - minx + 1);
			var h = 6 * (maxy - miny + 1);
			cvs.width  = w;
			cvs.height = h;

			var ctx = cvs.getContext('2d');
			ctx.fillStyle = '#fff';
			ctx.fillRect(0, 0, w, h);

			ctx.fillStyle = '#000';
			forEachPoint(function(x, y, color) {
				ctx.fillRect(2 * x, 6 * y, 2, 6);
			});
		}
	}

	var payload = {};
	var cpkEvents = 'change paste keyup';

	// http://stackoverflow.com/a/901144/205895
	function getParameterByName(name) {
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
			results = regex.exec(location.search);
		return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	}

	var validNumberRegEx = /[0-9]{16}/;
	var $generateBarcode = $('#generate-barcode');
	var $cardNumber = $('#card-number').on(cpkEvents, function(event) {
		var text = $(this).val().split(/[^0-9]/).join('');
		$(this).val(text);
		$generateBarcode.prop('disabled', !validNumberRegEx.test(text));

		var left = 16 - text.length;
		$('#card-number-hint').text(left == 0 ? '' : 'There should be ' + left + ' more digit' + (left == 1 ? '' : 's') + '.');
	});

	var cardNumber = getParameterByName('card_number');
	if (validNumberRegEx.test(cardNumber)) {
		$cardNumber.val(getParameterByName('card_number')).keyup();
		payload.card_number = cardNumber;
	}

	$('#barcode-form').submit(function(event) {
		event.preventDefault();
		if ($generateBarcode.prop('disabled')) return false;

		var text = $cardNumber.val();
		var bw = new BWIPJS;
		var bitmap = new Bitmap;
		bw.bitmap(bitmap);
		bw.push(text);
		bw.push({ rowmult: 1, compact: true });
		bw.call('pdf417');
		bitmap.show('barcode');

		payload.barcode_data = bitmap.pebble_data();
		payload.card_number = text;
		
		$('#barcode-container').show();
	});

	var $username = $('#username').on(cpkEvents, function(event) {
		payload.username = $(this).val();
	});

	var username = getParameterByName('username');
	if (username) {
		$username.val(username).keyup();
	}

	$('#password').on(cpkEvents, function(event) {
		payload.password = $(this).val();
	});

	$('#save-and-close').click(function(event) {
		event.preventDefault();
		$(':active').blur();
		window.location = 'pebblejs://close#' + encodeURIComponent(JSON.stringify(payload));
	});
});