var app = new Vue({
	el: '#app',
	data: {
		scanner: null,
		activeCameraId: null,
		cameras: [],
		scans: []
	},
	mounted: function () {
		var self = this;
		self.scanner = new Instascan.Scanner({ video: document.getElementById('preview'), scanPeriod: 5 });
		self.scanner.addListener('scan', function (content, image) {
			try {
				var json = JSON.parse(content);
				self.scans.unshift({ date: +(Date.now()), content: (json.lastname + ', ' + json.firstname) });
			} catch (error) {
				self.scans.unshift({ date: +(Date.now()), content: 'Invalid QR Code!' });
			}
		});
		Instascan.Camera.getCameras().then(function (cameras) {
			self.cameras = cameras;
			if (cameras.length > 0) {
				self.activeCameraId = cameras[0].id;
				self.scanner.start(cameras[0]);
			} else {
				console.error('No cameras found.');
			}
		}).catch(function (e) {
			console.error(e);
		});
	},
	methods: {
		formatName: function (name) {
			return name || '(unknown)';
		},
		selectCamera: function (camera) {
			this.activeCameraId = camera.id;
			this.scanner.start(camera);
		}
	}
});

function generateQRCode(e) {
	e.preventDefault();
	var id = document.getElementById('id').value;
	var firstname = document.getElementById('firstname').value;
	var lastname = document.getElementById('lastname').value;

	var qrInput = JSON.stringify({ id: id, firstname: firstname, lastname: lastname });
	console.log(qrInput);
	var qrCodeContainer = document.getElementById("qr-code");

	QRCode.toCanvas(qrCodeContainer, qrInput, function (error) {
		if (error) console.error(error)
		console.log('success!');
		/* var image = new Image();
		image.src = qrCodeContainer.toDataURL("image/png");
		var link = document.createElement('a');
		link.download = id+'-qrcode.png';
		link.href = image.src;
		link.click(); */
		
		var pngData = qrCodeContainer.toDataURL("image/png");
		var img = document.getElementById("qr-code-img");
		img.src = pngData;
		qrCodeContainer.style.display = 'none';
		img.style.display = 'block';
	});
}
