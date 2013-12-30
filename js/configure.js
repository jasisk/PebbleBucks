PDF417.QUIETV = PDF417.QUIETH = 0;
PDF417.ROWHEIGHT = 1;
jQuery(function($) {
	// http://stackoverflow.com/a/901144/205895
	function getParameterByName(name) {
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
			results = regex.exec(location.search);
		return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	}

	var validNumberRegEx = /[0-9]{16}/;
	var $cardNumber = $('#card-number').keyup(function(event) {
		var text = $(this).val().split(/[^0-9]/).join('');
		$(this).val(text);
		$('#generate-barcode').prop('disabled', !validNumberRegEx.test(text));

		var left = 16 - text.length;
		$('#card-number-hint').text(left == 0 ? '' : 'There should be ' + left + ' more digit' + (left == 1 ? '' : 's') + '.');
	});

	var cardNumber = getParameterByName('card_number');
	if (validNumberRegEx.test(cardNumber)) {
		$cardNumber.val(getParameterByName('card_number')).trigger('keyup');
	}

	$('form').submit(function(event) {
		event.preventDefault();

		var text = $cardNumber.val();
		PDF417.init(text);

		var barcode = PDF417.getBarcodeArray();

		var xScale = 2;
		var yScale = 4;

		var width = barcode.num_cols;
		var height = barcode.num_rows;

		var canvas = document.getElementById('barcode');
		canvas.width = xScale * width;
		canvas.height = yScale * height;

		var ctx = canvas.getContext('2d');
		var data = [ width, height ], bit = 0, byte = 0;

		for (var row = 0; row < height; row++) {
			var y = yScale * row;
			for (var col = 0; col < width; col++) {
				if (parseInt(barcode.bcode[row][col], 10)) {
					var x = xScale * col;
					ctx.fillRect(x, y, xScale, yScale);
					byte |= 1 << bit;
				}

				if (++bit == 8) {
					data.push(byte);
					bit = byte = 0;
				}
			}
		}
		if (bit) data.push(byte);
		
		var payload = {
			barcode_data: data,
			card_number: text
		};
		$('#save-and-close').attr('href', 'pebblejs://close#' + encodeURIComponent(JSON.stringify(payload)));
		$('#barcode-container').show();
	});
	$('a.done').click(function(event) {
		event.preventDefault();
	});
});