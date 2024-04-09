var dataObject = [];
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
				if (saveLocal(json)) {
					var json = JSON.parse(content);
					self.scans.unshift({ data: json, date: +(Date.now()), content: (json.lastname + ', ' + json.firstname) });
				} else {
					alert('Invalid QR Code!');
				}
			} catch (error) {
				console.log(error);
				alert('Invalid QR Code!');
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

localStorage.clear();

document.getElementById('to-csv').addEventListener('click', function (e) {
	var jsonString = localStorage.getItem('dataObject');
	let d = new Date();
	downloadCSV(jsonString, (d.toISOString().split('T')[0])+'_logged-in-data.csv');
});

function saveLocal(json) {
	var jsonData = new JSONQuery(dataObject);
	var query = {
		select: { fields: '*' },
		where: { condition: { field: 'id', operator: '=', value: json.id } }
	};
	var result = jsonData.execute(query);
	// console.log(result, query);
	if (result.length == 0) {
		dataObject.push(json);
		localStorage.setItem('dataObject', JSON.stringify(dataObject));
		return true;
	} else {
		return false;
	}
}

function generateQRCode(e) {
	e.preventDefault();
	var id = document.getElementById('id').value;
	var firstname = document.getElementById('firstname').value;
	var lastname = document.getElementById('lastname').value;
	var json = { id: id, firstname: firstname, lastname: lastname };
	saveLocal(json);

	var qrInput = JSON.stringify(json);
	// console.log(qrInput);
	var qrCodeContainer = document.getElementById("qr-code");
	var img = document.getElementById("qr-code-img");
	img.style.display = 'none';

	QRCode.toCanvas(qrCodeContainer, qrInput, function (error) {
		if (error) console.error(error)
		console.log('success!');
		var pngData = qrCodeContainer.toDataURL("image/png");
		img.src = pngData;
		qrCodeContainer.style.display = 'none';
		img.style.display = 'block';
	});
}

function downloadCSV(jsonData, filename) {
	// Parse JSON string to JavaScript object
	var data = JSON.parse(jsonData);

	// Convert JSON to CSV
	var csv = convertJSONToCSV(data);

	// Create Blob object
	var blob = new Blob([csv], { type: 'text/csv' });

	// Create URL for Blob object
	var url = URL.createObjectURL(blob);

	// Create anchor element
	var a = document.createElement('a');

	// Set href and download attributes
	a.href = url;
	a.download = filename;

	// Simulate click on anchor element
	a.click();

	// Clean up
	URL.revokeObjectURL(url);
}

function convertJSONToCSV(jsonData) {
	var csv = '';

	// Extract column headers
	var headers = Object.keys(jsonData[0]);
	csv += headers.join(',') + '\n';

	// Extract data rows
	jsonData.forEach(function (item) {
		var row = [];
		headers.forEach(function (header) {
			row.push(item[header]);
		});
		csv += row.join(',') + '\n';
	});

	return csv;
}

