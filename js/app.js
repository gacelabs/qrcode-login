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
		self.scanner = new Instascan.Scanner({ video: document.getElementById('preview'), scanPeriod: 1, refractoryPeriod: 2000 });
		self.scanner.addListener('scan', function (content, image) {
			try {
				var json = JSON.parse(content);
				json['date'] = getDateNow();
				if (saveLocal(json)) {
					// self.scans.unshift({ data: json, date: +(Date.now()), content: (json.lastname + ', ' + json.firstname) });
					appendData(self, json);
					alert('"' + json.lastname + ', ' + json.firstname +'" was Successfully logged in!');
				} else {
					alert('"' + json.lastname + ', ' + json.firstname +'" Already Exist!');
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
			if (this.activeCameraId !== camera.id) {
				this.activeCameraId = camera.id;
				if (this.scanner) {
					this.scanner.stop(); // Stop the current scanner
					// Refresh the camera state by restarting the scanner with the same camera
					this.scanner.start(camera).then(() => {
						// Scanner started successfully
						console.log('Scanner started with camera:', camera);
					}).catch(error => {
						// Failed to start the scanner
						console.error('Error starting scanner:', error);
						alert('Failed to start scanner. Please try again.');
						window.location.reload(true);
					});
				}
			}
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

	var qrInput = JSON.stringify(json);
	// console.log(qrInput);
	var qrCodeCanvas = document.getElementById("qr-code");
	var img = document.getElementById("qr-code-img");
	img.style.display = 'none';
	var shareBtn = document.getElementsByClassName('share-appended');
	if (shareBtn.length) {
		shareBtn[0].remove();
	}

	QRCode.toCanvas(qrCodeCanvas, qrInput, function (error) {
		if (error) console.error(error)
		// console.log('success!');
		var pngData = qrCodeCanvas.toDataURL("image/png");
		img.src = pngData;
		qrCodeCanvas.style.display = 'none';
		img.style.display = 'block';
		
		var shareBtn = document.createElement('img');
		shareBtn.style = 'cursor: pointer; max-width: 20px; float: right; padding-right: 40px; margin-bottom: 10px;';
		shareBtn.src = './share.png';
		shareBtn.classList.add('share-appended');
		shareBtn.addEventListener('click', async (e) => {
			try {
				// Check if the Web Share API is supported by the browser
				if (navigator.share) {
					var ctx = qrCodeCanvas.getContext('2d');
					qrCodeCanvas.width = e.target.width;
					qrCodeCanvas.height = e.target.height;
					ctx.drawImage(e.target, 0, 0);
					// Get the image data from the canvas
					var imageData = ctx.getImageData(0, 0, qrCodeCanvas.width, qrCodeCanvas.height);
					// Decode the QR code from the image data
					var code = jsQR(imageData.data, imageData.width, imageData.height);

					if (code) {
						var json = JSON.parse(code.data);
						// Fetch the image URL (replace 'image.jpg' with the actual path to your image)
						var imageUrl = e.target.src;
						// Fetch the image blob
						var response = await fetch(imageUrl);
						var blob = await response.blob();
						var name = (json.lastname.trim() + '-' + json.firstname.trim());
						// Create a file object from the image blob
						var file = new File([blob], name + '_QRCode.jpg', { type: blob.type });
						// Share the image using the Web Share API
						await navigator.share({
							files: [file],
							title: 'Share QR Code',
							text: name + '_QRCode.jpg'
						});
	
						console.log('Image shared successfully.');
					} else {
						alert('Invalid QR Code!');
					}
				} else {
					// Web Share API is not supported
					console.error('Web Share API is not supported.');
					alert('Web Share API is not supported in this browser.');
				}
			} catch (error) {
				// Error occurred while sharing the image
				console.error('Error sharing QR Code:', error);
				alert('Error sharing QR Code. Please try again.');
			}
		});
		img.parentNode.insertBefore(shareBtn, img.nextSibling);

		json['date'] = getDateNow();
		// console.log(json);
		if (saveLocal(json)) {
			appendData(app, json);
			alert('"' + json.lastname + ', ' + json.firstname + '" was Successfully logged in!');
		}
	});
}

function downloadCSV(jsonData, filename) {
	// Parse JSON string to JavaScript object
	var data = JSON.parse(jsonData);

	// Convert JSON to CSV
	var csv = convertJSONToCSV(data);

	if (csv != false) {
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
}

function convertJSONToCSV(jsonData) {
	if (jsonData) {
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
	} else {
		return false;
	}
}

// Get references to the drop zone and the preview image
var dropZone = document.getElementById('dropZone');
var previewImage = document.getElementById('qr-code-img');

function runDragnDrop() {
	// Prevent default drag behaviors
	['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
		dropZone.addEventListener(eventName, preventDefaults, false);
	});
	
	// Highlight drop area when dragging over it
	['dragenter', 'dragover'].forEach(eventName => {
		dropZone.addEventListener(eventName, highlight, false);
	});
	
	// Unhighlight drop area when not dragging over it
	['dragleave', 'drop'].forEach(eventName => {
		dropZone.addEventListener(eventName, unhighlight, false);
	});
	
	// Handle dropped files
	dropZone.addEventListener('drop', function (event) {
		var files = event.dataTransfer.files;
		if (files.length > 0) {
			var file = files[0];
			if (file.type.startsWith('image/')) {
				var reader = new FileReader();
				reader.onload = function (event) {
					previewImage.src = event.target.result;
					previewImage.style.display = 'block';
	
					var qrCodeCanvas = document.getElementById("qr-code");
	
					setTimeout(() => {
						// Create a canvas element to draw the image
						var ctx = qrCodeCanvas.getContext('2d');
						qrCodeCanvas.width = previewImage.width;
						qrCodeCanvas.height = previewImage.height;
						ctx.drawImage(previewImage, 0, 0);
						// Get the image data from the canvas
						var imageData = ctx.getImageData(0, 0, qrCodeCanvas.width, qrCodeCanvas.height);
						// Decode the QR code from the image data
						var code = jsQR(imageData.data, imageData.width, imageData.height);
	
						if (code) {
							var json = JSON.parse(code.data);
							json['date'] = getDateNow();
							// console.log(json);
							if (saveLocal(json)) {
								appendData(app, json);
								alert('"' + json.lastname + ', ' + json.firstname + '" was Successfully logged in!');
							} else {
								alert('"' + json.lastname + ', ' + json.firstname + '" Already Exist!');
							}
						} else {
							alert('Invalid QR Code!');
						}
	
						previewImage.style.display = 'none';
						var shareBtn = document.getElementsByClassName('share-appended');
						if (shareBtn.length) {
							shareBtn[0].remove();
						}
					}, 1000);
	
					qrCodeCanvas.style.display = 'none';
				};
				reader.readAsDataURL(file);
			} else {
				alert('Please drop an image file.');
			}
		}
	}, false);
}

function preventDefaults(event) {
	event.preventDefault();
	event.stopPropagation();
}

function highlight() {
	dropZone.classList.add('highlight');
}

function unhighlight() {
	dropZone.classList.remove('highlight');
}

runDragnDrop();

function getDateNow(timestamp) {
	// Create a new Date object
	if (timestamp != undefined) {
		var currentDate = new Date(timestamp);
	} else {
		var currentDate = new Date();
	}

	// Get the individual date and time components
	var year = currentDate.getFullYear();
	var month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
	var day = String(currentDate.getDate()).padStart(2, '0');
	var hours = String(currentDate.getHours()).padStart(2, '0');
	var minutes = String(currentDate.getMinutes()).padStart(2, '0');
	var seconds = String(currentDate.getSeconds()).padStart(2, '0');

	// Combine the components into a single string
	var dateTimeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

	// console.log(dateTimeString); // Output the formatted date and time
	return dateTimeString;
}

function appendData(app, json) {
	var qrCodeCanvas = document.createElement('canvas');
	QRCode.toCanvas(qrCodeCanvas, JSON.stringify(json), function (error) {
		if (error) console.error(error)
		var pngData = qrCodeCanvas.toDataURL("image/png");
		var title = (json.lastname + ', ' + json.firstname);
		json['img_url'] = pngData;
		app.scans.unshift({ data: json, date: +(Date.now()), title: title, content: '<b>' + title + '</b><img src="' + pngData + '" style="max-width: 28px; float: right;" />' });
	});
}

async function shareQR(params) {
	// console.log(params.data);
	if (navigator.share) {
		var imageUrl = params.data.img_url;
		var response = await fetch(imageUrl);
		var blob = await response.blob();
		var file = new File([blob], params.title + '_QRCode.jpg', { type: blob.type });
		// Share the image using the Web Share API
		await navigator.share({
			files: [file],
			title: 'Share QR Code',
			text: params.title + '_QRCode.jpg'
		});
	} else {
		// Web Share API is not supported
		console.error('Web Share API is not supported.');
		alert('Web Share API is not supported in this browser.');
	}
}